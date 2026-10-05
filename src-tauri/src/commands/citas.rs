use rusqlite::Connection;
use tauri::State;
use uuid::Uuid;

use crate::audit::{self, Accion};
use crate::db::DbPool;
use crate::error::{ErrorApp, Resultado};
use crate::models::{Cita, CreateCitaPayload};
use crate::session::SessionState;

const SELECT_CITA: &str = "
    SELECT c.id, c.paciente_id, (p.nombres || ' ' || p.apellidos) as paciente_nombre,
           c.medico_id, c.fecha_hora, c.motivo, c.estado
    FROM cita c
    JOIN paciente p ON p.id = c.paciente_id
";

const ESTADOS_VALIDOS: [&str; 4] = ["solicitada", "agendada", "atendida", "cancelada"];

fn buscar_por_id(conn: &Connection, id: &str) -> Resultado<Cita> {
    let sql = format!("{SELECT_CITA} WHERE c.id = ?1 AND c.deleted_at IS NULL");
    conn.query_row(&sql, rusqlite::params![id], Cita::from_row)
        .map_err(|_| ErrorApp::NoEncontrado("Cita no encontrada".into()))
}

#[tauri::command]
pub fn listar_citas(pool: State<DbPool>, session_state: State<SessionState>) -> Resultado<Vec<Cita>> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;
    let sql = format!(
        "{SELECT_CITA} WHERE c.organizacion_id = ?1 AND c.deleted_at IS NULL ORDER BY c.fecha_hora DESC"
    );
    let mut stmt = conn.prepare(&sql)?;
    let citas = stmt
        .query_map(rusqlite::params![session.organizacion_id], Cita::from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(citas)
}

#[tauri::command]
pub fn crear_cita(pool: State<DbPool>, session_state: State<SessionState>, payload: CreateCitaPayload) -> Resultado<Cita> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;

    let cita_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO cita (id, organizacion_id, paciente_id, medico_id, fecha_hora, motivo, estado, created_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'agendada', ?4)",
        rusqlite::params![
            cita_id,
            session.organizacion_id,
            payload.paciente_id,
            session.usuario_id,
            payload.fecha_hora,
            payload.motivo,
        ],
    )?;

    audit::registrar(&conn, Some(&session.usuario_id), "cita", &cita_id, Accion::Insert, None::<&()>, Some(&payload))?;

    buscar_por_id(&conn, &cita_id)
}

#[tauri::command]
pub fn cambiar_estado_cita(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    id: String,
    estado: String,
) -> Resultado<Cita> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    if !ESTADOS_VALIDOS.contains(&estado.as_str()) {
        return Err(ErrorApp::Validacion(format!("Estado de cita inválido: {estado}")));
    }
    let conn = pool.get()?;

    let anterior = buscar_por_id(&conn, &id)?;

    let filas = conn.execute(
        "UPDATE cita SET estado = ?1, updated_at = datetime('now'), updated_by = ?2 WHERE id = ?3 AND deleted_at IS NULL",
        rusqlite::params![estado, session.usuario_id, id],
    )?;
    if filas == 0 {
        return Err(ErrorApp::NoEncontrado("Cita no encontrada".into()));
    }

    audit::registrar(
        &conn,
        Some(&session.usuario_id),
        "cita",
        &id,
        Accion::Update,
        Some(&anterior.estado),
        Some(&estado),
    )?;

    buscar_por_id(&conn, &id)
}
