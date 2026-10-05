use tauri::State;
use uuid::Uuid;

use crate::audit::{self, Accion};
use crate::db::DbPool;
use crate::error::{ErrorApp, Resultado};
use crate::models::{Antecedente, CreateAntecedentePayload, CreateIntervencionQxPayload, IntervencionQx};
use crate::session::SessionState;

#[tauri::command]
pub fn listar_antecedentes(pool: State<DbPool>, paciente_id: String) -> Resultado<Vec<Antecedente>> {
    let conn = pool.get()?;
    let mut stmt = conn.prepare(
        "SELECT id, paciente_id, tipo, subcategoria, descripcion, fecha_registro
         FROM antecedente WHERE paciente_id = ?1 AND deleted_at IS NULL ORDER BY fecha_registro DESC",
    )?;
    let items = stmt
        .query_map(rusqlite::params![paciente_id], Antecedente::from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(items)
}

#[tauri::command]
pub fn crear_antecedente(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    payload: CreateAntecedentePayload,
) -> Resultado<Antecedente> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO antecedente (id, organizacion_id, paciente_id, tipo, subcategoria, descripcion, created_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![
            id,
            session.organizacion_id,
            payload.paciente_id,
            payload.tipo,
            payload.subcategoria,
            payload.descripcion,
            session.usuario_id,
        ],
    )?;

    audit::registrar(&conn, Some(&session.usuario_id), "antecedente", &id, Accion::Insert, None::<&()>, Some(&payload))?;

    conn.query_row(
        "SELECT id, paciente_id, tipo, subcategoria, descripcion, fecha_registro FROM antecedente WHERE id = ?1",
        rusqlite::params![id],
        Antecedente::from_row,
    )
    .map_err(ErrorApp::from)
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

#[tauri::command]
pub fn listar_intervenciones_qx(pool: State<DbPool>, paciente_id: String) -> Resultado<Vec<IntervencionQx>> {
    let conn = pool.get()?;
    let mut stmt = conn.prepare(
        "SELECT id, paciente_id, antecedente_id, consulta_id, nombre, fecha, notas
         FROM intervencion_qx WHERE paciente_id = ?1 AND deleted_at IS NULL ORDER BY fecha DESC",
    )?;
    let items = stmt
        .query_map(rusqlite::params![paciente_id], IntervencionQx::from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(items)
}

#[tauri::command]
pub fn crear_intervencion_qx(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    payload: CreateIntervencionQxPayload,
) -> Resultado<IntervencionQx> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO intervencion_qx (id, organizacion_id, paciente_id, antecedente_id, consulta_id, nombre, fecha, notas, created_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        rusqlite::params![
            id,
            session.organizacion_id,
            payload.paciente_id,
            payload.antecedente_id,
            payload.consulta_id,
            payload.nombre,
            payload.fecha,
            payload.notas,
            session.usuario_id,
        ],
    )?;

    audit::registrar(&conn, Some(&session.usuario_id), "intervencion_qx", &id, Accion::Insert, None::<&()>, Some(&payload))?;

    conn.query_row(
        "SELECT id, paciente_id, antecedente_id, consulta_id, nombre, fecha, notas FROM intervencion_qx WHERE id = ?1",
        rusqlite::params![id],
        IntervencionQx::from_row,
    )
    .map_err(ErrorApp::from)
}

#[tauri::command]
pub fn eliminar_intervencion_qx(pool: State<DbPool>, session_state: State<SessionState>, id: String) -> Resultado<()> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;

    let filas = conn.execute(
        "UPDATE intervencion_qx SET deleted_at = datetime('now'), deleted_by = ?1 WHERE id = ?2 AND deleted_at IS NULL",
        rusqlite::params![session.usuario_id, id],
    )?;
    if filas == 0 {
        return Err(ErrorApp::NoEncontrado("Intervención quirúrgica no encontrada".into()));
    }
    audit::registrar(&conn, Some(&session.usuario_id), "intervencion_qx", &id, Accion::Delete, None::<&()>, None::<&()>)?;
    Ok(())
}
