use tauri::State;
use uuid::Uuid;

use crate::audit::{self, Accion};
use crate::db::DbPool;
use crate::error::{ErrorApp, Resultado};
use crate::models::{CreateDiagnosticoPayload, CreateEnfermedadCatalogoPayload, EnfermedadCatalogo, PacienteEnfermedad};
use crate::session::SessionState;

const SELECT_PACIENTE_ENFERMEDAD: &str = "
    SELECT pe.id, pe.paciente_id, pe.enfermedad_catalogo_id, ec.nombre as enfermedad_nombre,
           ec.codigo as enfermedad_codigo, pe.activa, pe.fecha_diagnostico, pe.fecha_resolucion, pe.notas
    FROM paciente_enfermedad pe
    JOIN enfermedad_catalogo ec ON ec.id = pe.enfermedad_catalogo_id
";

#[tauri::command]
pub fn buscar_catalogo_enfermedades(pool: State<DbPool>, query: String) -> Resultado<Vec<EnfermedadCatalogo>> {
    let conn = pool.get()?;
    let patron = format!("%{}%", query);
    let mut stmt = conn.prepare(
        "SELECT id, codigo, version_cie, nombre FROM enfermedad_catalogo
         WHERE nombre LIKE ?1 OR codigo LIKE ?1 ORDER BY nombre LIMIT 30",
    )?;
    let items = stmt
        .query_map(rusqlite::params![patron], EnfermedadCatalogo::from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(items)
}

#[tauri::command]
pub fn crear_enfermedad_catalogo(pool: State<DbPool>, payload: CreateEnfermedadCatalogoPayload) -> Resultado<EnfermedadCatalogo> {
    let conn = pool.get()?;
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO enfermedad_catalogo (id, codigo, version_cie, nombre) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![id, payload.codigo, payload.version_cie, payload.nombre],
    ).map_err(|e| match e {
        rusqlite::Error::SqliteFailure(err, _) if err.code == rusqlite::ErrorCode::ConstraintViolation => {
            ErrorApp::Validacion("Ya existe una enfermedad con ese código CIE.".into())
        }
        other => ErrorApp::Db(other),
    })?;

    conn.query_row(
        "SELECT id, codigo, version_cie, nombre FROM enfermedad_catalogo WHERE id = ?1",
        rusqlite::params![id],
        EnfermedadCatalogo::from_row,
    )
    .map_err(ErrorApp::from)
}

#[tauri::command]
pub fn listar_enfermedades_paciente(pool: State<DbPool>, paciente_id: String) -> Resultado<Vec<PacienteEnfermedad>> {
    let conn = pool.get()?;
    let sql = format!(
        "{SELECT_PACIENTE_ENFERMEDAD} WHERE pe.paciente_id = ?1 AND pe.deleted_at IS NULL ORDER BY pe.activa DESC, pe.fecha_diagnostico DESC"
    );
    let mut stmt = conn.prepare(&sql)?;
    let items = stmt
        .query_map(rusqlite::params![paciente_id], PacienteEnfermedad::from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(items)
}

#[tauri::command]
pub fn crear_diagnostico_paciente(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    payload: CreateDiagnosticoPayload,
) -> Resultado<PacienteEnfermedad> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO paciente_enfermedad (id, organizacion_id, paciente_id, enfermedad_catalogo_id, activa, fecha_diagnostico, notas, created_by)
         VALUES (?1, ?2, ?3, ?4, 1, ?5, ?6, ?7)",
        rusqlite::params![
            id,
            session.organizacion_id,
            payload.paciente_id,
            payload.enfermedad_catalogo_id,
            payload.fecha_diagnostico,
            payload.notas,
            session.usuario_id,
        ],
    )?;

    audit::registrar(&conn, Some(&session.usuario_id), "paciente_enfermedad", &id, Accion::Insert, None::<&()>, Some(&payload))?;

    let sql = format!("{SELECT_PACIENTE_ENFERMEDAD} WHERE pe.id = ?1");
    conn.query_row(&sql, rusqlite::params![id], PacienteEnfermedad::from_row).map_err(ErrorApp::from)
}

#[tauri::command]
pub fn marcar_enfermedad_resuelta(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    id: String,
    fecha_resolucion: String,
) -> Resultado<PacienteEnfermedad> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;

    let filas = conn.execute(
        "UPDATE paciente_enfermedad SET activa = 0, fecha_resolucion = ?1, updated_at = datetime('now'), updated_by = ?2
         WHERE id = ?3 AND deleted_at IS NULL",
        rusqlite::params![fecha_resolucion, session.usuario_id, id],
    )?;
    if filas == 0 {
        return Err(ErrorApp::NoEncontrado("Diagnóstico no encontrado".into()));
    }

    audit::registrar(
        &conn,
        Some(&session.usuario_id),
        "paciente_enfermedad",
        &id,
        Accion::Update,
        None::<&()>,
        Some(&fecha_resolucion),
    )?;

    let sql = format!("{SELECT_PACIENTE_ENFERMEDAD} WHERE pe.id = ?1");
    conn.query_row(&sql, rusqlite::params![id], PacienteEnfermedad::from_row).map_err(ErrorApp::from)
}
