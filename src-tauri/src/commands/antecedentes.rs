use rusqlite::Connection;
use tauri::State;
use uuid::Uuid;

use crate::audit::{self, Accion};
use crate::db::DbPool;
use crate::error::{ErrorApp, Resultado};
use crate::models::{Antecedente, GuardarAntecedentePayload};
use crate::session::SessionState;
use crate::util::limpiar;

const SELECT_ANTECEDENTE: &str = "
    SELECT id, paciente_id, tipo, subcategoria, descripcion, codigo_snomed, detalle, fecha, estado, parentesco,
           reaccion, severidad, dias_estancia, centro_salud, servicio, consulta_id, fecha_registro
    FROM antecedente
";

const TIPOS_VALIDOS: [&str; 6] = ["personal", "familiar", "quirurgico", "hospitalizacion", "alergia", "habito"];

fn buscar_por_id(conn: &Connection, id: &str) -> Resultado<Antecedente> {
    let sql = format!("{SELECT_ANTECEDENTE} WHERE id = ?1 AND deleted_at IS NULL");
    conn.query_row(&sql, rusqlite::params![id], Antecedente::from_row)
        .map_err(|_| ErrorApp::NoEncontrado("Antecedente no encontrado".into()))
}

fn validar(payload: &GuardarAntecedentePayload) -> Resultado<()> {
    if !TIPOS_VALIDOS.contains(&payload.tipo.as_str()) {
        return Err(ErrorApp::Validacion(format!("Tipo de antecedente inválido: {}", payload.tipo)));
    }
    if payload.descripcion.trim().is_empty() {
        return Err(ErrorApp::Validacion("El antecedente necesita una descripción.".into()));
    }
    Ok(())
}

#[tauri::command]
pub fn listar_antecedentes(pool: State<DbPool>, paciente_id: String) -> Resultado<Vec<Antecedente>> {
    let conn = pool.get()?;
    let sql = format!("{SELECT_ANTECEDENTE} WHERE paciente_id = ?1 AND deleted_at IS NULL ORDER BY tipo, fecha_registro");
    let mut stmt = conn.prepare(&sql)?;
    let items = stmt
        .query_map(rusqlite::params![paciente_id], Antecedente::from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(items)
}

#[tauri::command]
pub fn crear_antecedente(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    payload: GuardarAntecedentePayload,
) -> Resultado<Antecedente> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    validar(&payload)?;
    let conn = pool.get()?;
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO antecedente (id, organizacion_id, paciente_id, tipo, subcategoria, descripcion, codigo_snomed, detalle,
                                  fecha, estado, parentesco, reaccion, severidad, dias_estancia, centro_salud, servicio,
                                  consulta_id, created_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)",
        rusqlite::params![
            id,
            session.organizacion_id,
            payload.paciente_id,
            payload.tipo,
            limpiar(payload.subcategoria.clone()),
            payload.descripcion.trim(),
            limpiar(payload.codigo_snomed.clone()),
            limpiar(payload.detalle.clone()),
            limpiar(payload.fecha.clone()),
            limpiar(payload.estado.clone()),
            limpiar(payload.parentesco.clone()),
            limpiar(payload.reaccion.clone()),
            limpiar(payload.severidad.clone()),
            payload.dias_estancia,
            limpiar(payload.centro_salud.clone()),
            limpiar(payload.servicio.clone()),
            payload.consulta_id,
            session.usuario_id,
        ],
    )?;

    audit::registrar(&conn, Some(&session.usuario_id), "antecedente", &id, Accion::Insert, None::<&()>, Some(&payload))?;

    buscar_por_id(&conn, &id)
}

#[tauri::command]
pub fn actualizar_antecedente(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    id: String,
    payload: GuardarAntecedentePayload,
) -> Resultado<Antecedente> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    validar(&payload)?;
    let conn = pool.get()?;
    let anterior = buscar_por_id(&conn, &id)?;

    conn.execute(
        "UPDATE antecedente SET subcategoria = ?1, descripcion = ?2, codigo_snomed = ?3, detalle = ?4, fecha = ?5,
             estado = ?6, parentesco = ?7, reaccion = ?8, severidad = ?9, dias_estancia = ?10, centro_salud = ?11,
             servicio = ?12, updated_at = datetime('now'), updated_by = ?13
         WHERE id = ?14 AND deleted_at IS NULL",
        rusqlite::params![
            limpiar(payload.subcategoria.clone()),
            payload.descripcion.trim(),
            limpiar(payload.codigo_snomed.clone()),
            limpiar(payload.detalle.clone()),
            limpiar(payload.fecha.clone()),
            limpiar(payload.estado.clone()),
            limpiar(payload.parentesco.clone()),
            limpiar(payload.reaccion.clone()),
            limpiar(payload.severidad.clone()),
            payload.dias_estancia,
            limpiar(payload.centro_salud.clone()),
            limpiar(payload.servicio.clone()),
            session.usuario_id,
            id,
        ],
    )?;

    audit::registrar(&conn, Some(&session.usuario_id), "antecedente", &id, Accion::Update, Some(&anterior), Some(&payload))?;

    buscar_por_id(&conn, &id)
}

#[tauri::command]
pub fn eliminar_antecedente(pool: State<DbPool>, session_state: State<SessionState>, id: String) -> Resultado<()> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;

    let filas = conn.execute(
        "UPDATE antecedente SET deleted_at = datetime('now'), deleted_by = ?1 WHERE id = ?2 AND deleted_at IS NULL",
        rusqlite::params![session.usuario_id, id],
    )?;
    if filas == 0 {
        return Err(ErrorApp::NoEncontrado("Antecedente no encontrado".into()));
    }
    audit::registrar(&conn, Some(&session.usuario_id), "antecedente", &id, Accion::Delete, None::<&()>, None::<&()>)?;
    Ok(())
}
