use rusqlite::Connection;
use tauri::State;
use uuid::Uuid;

use crate::audit::{self, Accion};
use crate::db::DbPool;
use crate::error::{ErrorApp, Resultado};
use crate::models::{Consulta, CreateConsultaPayload, UpdateNotasConsultaPayload};
use crate::session::SessionState;

const SELECT_CONSULTA: &str = "
    SELECT c.id, c.paciente_id, c.medico_id, u.nombre_completo as medico_nombre,
           c.cita_id, c.fecha, c.motivo_consulta, c.notas_medico
    FROM consulta c
    JOIN usuario u ON u.id = c.medico_id
";

fn buscar_por_id(conn: &Connection, id: &str) -> Resultado<Consulta> {
    let sql = format!("{SELECT_CONSULTA} WHERE c.id = ?1 AND c.deleted_at IS NULL");
    conn.query_row(&sql, rusqlite::params![id], Consulta::from_row)
        .map_err(|_| ErrorApp::NoEncontrado("Consulta no encontrada".into()))
}

#[tauri::command]
pub fn listar_consultas_por_paciente(pool: State<DbPool>, paciente_id: String) -> Resultado<Vec<Consulta>> {
    let conn = pool.get()?;
    let sql = format!("{SELECT_CONSULTA} WHERE c.paciente_id = ?1 AND c.deleted_at IS NULL ORDER BY c.fecha DESC");
    let mut stmt = conn.prepare(&sql)?;
    let consultas = stmt
        .query_map(rusqlite::params![paciente_id], Consulta::from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(consultas)
}

#[tauri::command]
pub fn obtener_consulta(pool: State<DbPool>, id: String) -> Resultado<Consulta> {
    let conn = pool.get()?;
    buscar_por_id(&conn, &id)
}

#[tauri::command]
pub fn obtener_consulta_por_cita(pool: State<DbPool>, cita_id: String) -> Resultado<Option<Consulta>> {
    let conn = pool.get()?;
    let sql = format!("{SELECT_CONSULTA} WHERE c.cita_id = ?1 AND c.deleted_at IS NULL ORDER BY c.fecha DESC LIMIT 1");
    let consulta = conn.query_row(&sql, rusqlite::params![cita_id], Consulta::from_row).ok();
    Ok(consulta)
}

#[tauri::command]
pub fn crear_consulta(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    payload: CreateConsultaPayload,
) -> Resultado<Consulta> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let mut conn = pool.get()?;

    let consulta_id = Uuid::new_v4().to_string();
    let tx = conn.transaction()?;

    tx.execute(
        "INSERT INTO consulta (id, organizacion_id, paciente_id, medico_id, cita_id, motivo_consulta, notas_medico, created_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?4)",
        rusqlite::params![
            consulta_id,
            session.organizacion_id,
            payload.paciente_id,
            session.usuario_id,
            payload.cita_id,
            payload.motivo_consulta,
            payload.notas_medico,
        ],
    )?;

    if let Some(cita_id) = &payload.cita_id {
        tx.execute(
            "UPDATE cita SET estado = 'atendida', updated_at = datetime('now'), updated_by = ?1 WHERE id = ?2",
            rusqlite::params![session.usuario_id, cita_id],
        )?;
    }

    audit::registrar(
        &tx,
        Some(&session.usuario_id),
        "consulta",
        &consulta_id,
        Accion::Insert,
        None::<&()>,
        Some(&payload),
    )?;

    tx.commit()?;

    buscar_por_id(&conn, &consulta_id)
}

#[tauri::command]
pub fn actualizar_notas_consulta(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    id: String,
    payload: UpdateNotasConsultaPayload,
) -> Resultado<Consulta> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;

    let anterior = buscar_por_id(&conn, &id)?;

    let filas = conn.execute(
        "UPDATE consulta SET notas_medico = ?1, updated_at = datetime('now'), updated_by = ?2 WHERE id = ?3 AND deleted_at IS NULL",
        rusqlite::params![payload.notas_medico, session.usuario_id, id],
    )?;
    if filas == 0 {
        return Err(ErrorApp::NoEncontrado("Consulta no encontrada".into()));
    }

    audit::registrar(
        &conn,
        Some(&session.usuario_id),
        "consulta",
        &id,
        Accion::Update,
        Some(&anterior.notas_medico),
        Some(&payload.notas_medico),
    )?;

    buscar_por_id(&conn, &id)
}
