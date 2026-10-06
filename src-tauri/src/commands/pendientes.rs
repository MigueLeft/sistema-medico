use std::fs;

use rusqlite::Connection;
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_opener::OpenerExt;
use uuid::Uuid;

use crate::audit::{self, Accion};
use crate::db::DbPool;
use crate::error::{ErrorApp, Resultado};
use crate::models::{AdjuntarPendientePayload, CreatePendientePayload, MarcarPendientePayload, Pendiente};
use crate::session::SessionState;
use crate::util::ahora_local;

const SELECT_PENDIENTE: &str = "
    SELECT pe.id, pe.paciente_id, pe.consulta_origen_id,
           (SELECT c.fecha FROM consulta c WHERE c.id = pe.consulta_origen_id) as consulta_origen_fecha,
           pe.examen_id, pe.entregable_id,
           (SELECT en.numero FROM entregable en WHERE en.id = pe.entregable_id) as entregable_numero, pe.tipo, pe.nombre, pe.codigo_loinc, pe.estado, pe.consulta_revision_id, pe.entregado_at,
           pe.archivo_nombre, pe.archivo_bytes, pe.updated_at
    FROM pendiente pe
";

const TIPOS_VALIDOS: [&str; 3] = ["paraclinico", "documento", "registro"];
const TAMANO_MAXIMO_BYTES: usize = 25 * 1024 * 1024;

fn buscar_por_id(conn: &Connection, id: &str) -> Resultado<Pendiente> {
    let sql = format!("{SELECT_PENDIENTE} WHERE pe.id = ?1 AND pe.deleted_at IS NULL");
    conn.query_row(&sql, rusqlite::params![id], Pendiente::from_row)
        .map_err(|_| ErrorApp::NoEncontrado("Pendiente no encontrado".into()))
}

/// Todos los pendientes del paciente (abiertos y entregados), los más recientes primero.
#[tauri::command]
pub fn listar_pendientes_paciente(pool: State<DbPool>, paciente_id: String) -> Resultado<Vec<Pendiente>> {
    let conn = pool.get()?;
    let sql = format!(
        "{SELECT_PENDIENTE} WHERE pe.paciente_id = ?1 AND pe.deleted_at IS NULL
         ORDER BY (pe.estado = 'entregado'), pe.created_at"
    );
    let mut stmt = conn.prepare(&sql)?;
    let items = stmt
        .query_map(rusqlite::params![paciente_id], Pendiente::from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(items)
}

#[tauri::command]
pub fn crear_pendiente(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    payload: CreatePendientePayload,
) -> Resultado<Pendiente> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    if !TIPOS_VALIDOS.contains(&payload.tipo.as_str()) {
        return Err(ErrorApp::Validacion(format!("Tipo de pendiente inválido: {}", payload.tipo)));
    }
    if payload.nombre.trim().is_empty() {
        return Err(ErrorApp::Validacion("Indique qué debe traer el paciente.".into()));
    }
    let conn = pool.get()?;
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO pendiente (id, organizacion_id, paciente_id, consulta_origen_id, tipo, nombre, codigo_loinc, created_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![
            id,
            session.organizacion_id,
            payload.paciente_id,
            payload.consulta_origen_id,
            payload.tipo,
            payload.nombre.trim(),
            payload.codigo_loinc,
            session.usuario_id,
        ],
    )?;

    audit::registrar(&conn, Some(&session.usuario_id), "pendiente", &id, Accion::Insert, None::<&()>, Some(&payload))?;

    buscar_por_id(&conn, &id)
}

/// Marca el pendiente como entregado, no entregado («no lo trajo», sigue abierto) o lo devuelve a pendiente.
#[tauri::command]
pub fn marcar_pendiente(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    id: String,
    payload: MarcarPendientePayload,
) -> Resultado<Pendiente> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;
    let anterior = buscar_por_id(&conn, &id)?;

    let (entregado_at, consulta_revision_id) = match payload.estado.as_str() {
        "entregado" => (Some(ahora_local()), payload.consulta_id.clone()),
        "no_entregado" => (None, payload.consulta_id.clone()),
        "pendiente" => (None, None),
        otro => return Err(ErrorApp::Validacion(format!("Estado de pendiente inválido: {otro}"))),
    };

    conn.execute(
        "UPDATE pendiente SET estado = ?1, entregado_at = ?2, consulta_revision_id = ?3,
             updated_at = datetime('now'), updated_by = ?4
         WHERE id = ?5 AND deleted_at IS NULL",
        rusqlite::params![payload.estado, entregado_at, consulta_revision_id, session.usuario_id, id],
    )?;

    audit::registrar(
        &conn,
        Some(&session.usuario_id),
        "pendiente",
        &id,
        Accion::Update,
        Some(&anterior.estado),
        Some(&payload),
    )?;

    buscar_por_id(&conn, &id)
}

/// Guarda el documento que entregó el paciente en `<app_data_dir>/pendientes/` y marca el pendiente como entregado.
#[tauri::command]
pub fn adjuntar_archivo_pendiente(
    app: AppHandle,
    pool: State<DbPool>,
    session_state: State<SessionState>,
    id: String,
    payload: AdjuntarPendientePayload,
) -> Resultado<Pendiente> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    if payload.datos.is_empty() {
        return Err(ErrorApp::Validacion("El archivo está vacío.".into()));
    }
    if payload.datos.len() > TAMANO_MAXIMO_BYTES {
        return Err(ErrorApp::Validacion("El archivo supera el máximo de 25 MB.".into()));
    }
    let conn = pool.get()?;
    buscar_por_id(&conn, &id)?;

    // El nombre original solo se guarda en la BD; en disco se usa el id para evitar rutas arbitrarias.
    let extension: String = payload
        .nombre
        .rsplit_once('.')
        .map(|(_, ext)| ext.chars().filter(|c| c.is_ascii_alphanumeric()).take(8).collect::<String>().to_lowercase())
        .filter(|ext| !ext.is_empty())
        .unwrap_or_else(|| "bin".into());

    let mut hasher = Sha256::new();
    hasher.update(&payload.datos);
    let hash = format!("{:x}", hasher.finalize());

    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| ErrorApp::Interno(e.to_string()))?
        .join("pendientes");
    fs::create_dir_all(&dir).map_err(|e| ErrorApp::Interno(e.to_string()))?;
    let ruta = dir.join(format!("{id}.{extension}"));
    fs::write(&ruta, &payload.datos).map_err(|e| ErrorApp::Interno(e.to_string()))?;

    conn.execute(
        "UPDATE pendiente SET estado = 'entregado', entregado_at = ?1, consulta_revision_id = ?2, archivo_path = ?3,
             archivo_nombre = ?4, archivo_mime = ?5, archivo_bytes = ?6, hash_sha256 = ?7,
             updated_at = datetime('now'), updated_by = ?8
         WHERE id = ?9",
        rusqlite::params![
            ahora_local(),
            payload.consulta_id,
            ruta.to_string_lossy().to_string(),
            payload.nombre,
            payload.mime,
            payload.datos.len() as i64,
            hash,
            session.usuario_id,
            id,
        ],
    )?;

    audit::registrar(&conn, Some(&session.usuario_id), "pendiente", &id, Accion::Update, None::<&()>, Some(&payload.nombre))?;

    buscar_por_id(&conn, &id)
}

#[tauri::command]
pub fn abrir_archivo_pendiente(app: AppHandle, pool: State<DbPool>, id: String) -> Resultado<()> {
    let conn = pool.get()?;
    let ruta: Option<String> = conn
        .query_row(
            "SELECT archivo_path FROM pendiente WHERE id = ?1 AND deleted_at IS NULL",
            rusqlite::params![id],
            |r| r.get(0),
        )
        .map_err(|_| ErrorApp::NoEncontrado("Pendiente no encontrado".into()))?;

    let ruta = ruta.ok_or_else(|| ErrorApp::Interno("Este pendiente no tiene un documento cargado.".into()))?;
    app.opener()
        .open_path(ruta, None::<&str>)
        .map_err(|e| ErrorApp::Interno(e.to_string()))?;
    Ok(())
}

#[tauri::command]
pub fn eliminar_pendiente(pool: State<DbPool>, session_state: State<SessionState>, id: String) -> Resultado<()> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;
    let filas = conn.execute(
        "UPDATE pendiente SET deleted_at = datetime('now'), deleted_by = ?1 WHERE id = ?2 AND deleted_at IS NULL",
        rusqlite::params![session.usuario_id, id],
    )?;
    if filas == 0 {
        return Err(ErrorApp::NoEncontrado("Pendiente no encontrado".into()));
    }
    audit::registrar(&conn, Some(&session.usuario_id), "pendiente", &id, Accion::Delete, None::<&()>, None::<&()>)?;
    Ok(())
}
