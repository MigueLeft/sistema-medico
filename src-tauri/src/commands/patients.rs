use rusqlite::Connection;
use tauri::State;
use uuid::Uuid;

use crate::audit::{self, Accion};
use crate::db::DbPool;
use crate::error::{ErrorApp, Resultado};
use crate::models::{CreatePacientePayload, Expediente, Paciente, PacienteConExpediente, UpdatePacientePayload};
use crate::session::SessionState;

const SELECT_PACIENTE_CON_EXPEDIENTE: &str = "
    SELECT p.id, p.organizacion_id, p.documento_identidad, p.nombres, p.apellidos, p.fecha_nacimiento,
           p.sexo, p.telefono, p.email, p.created_at,
           e.id as expediente_id, e.codigo as expediente_codigo, e.fecha_apertura as expediente_fecha_apertura
    FROM paciente p
    JOIN expediente e ON e.paciente_id = p.id
";

fn map_paciente_con_expediente(row: &rusqlite::Row) -> rusqlite::Result<PacienteConExpediente> {
    Ok(PacienteConExpediente {
        paciente: Paciente::from_row(row)?,
        expediente: Expediente::from_row(row)?,
    })
}

fn buscar_por_id(conn: &Connection, id: &str) -> Resultado<PacienteConExpediente> {
    let sql = format!("{SELECT_PACIENTE_CON_EXPEDIENTE} WHERE p.id = ?1 AND p.deleted_at IS NULL");
    conn.query_row(&sql, rusqlite::params![id], map_paciente_con_expediente)
        .map_err(|_| ErrorApp::NoEncontrado("Paciente no encontrado".into()))
}

#[tauri::command]
pub fn listar_pacientes(pool: State<DbPool>, session_state: State<SessionState>) -> Resultado<Vec<PacienteConExpediente>> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;
    let sql = format!(
        "{SELECT_PACIENTE_CON_EXPEDIENTE} WHERE p.organizacion_id = ?1 AND p.deleted_at IS NULL ORDER BY p.nombres, p.apellidos"
    );
    let mut stmt = conn.prepare(&sql)?;
    let pacientes = stmt
        .query_map(rusqlite::params![session.organizacion_id], map_paciente_con_expediente)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(pacientes)
}

#[tauri::command]
pub fn obtener_paciente(pool: State<DbPool>, id: String) -> Resultado<PacienteConExpediente> {
    let conn = pool.get()?;
    buscar_por_id(&conn, &id)
}

#[tauri::command]
pub fn crear_paciente(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    payload: CreatePacientePayload,
) -> Resultado<PacienteConExpediente> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let mut conn = pool.get()?;

    let paciente_id = Uuid::new_v4().to_string();
    let expediente_id = Uuid::new_v4().to_string();
    let codigo = format!("HC-{}", &paciente_id[..8].to_uppercase());

    let tx = conn.transaction()?;

    tx.execute(
        "INSERT INTO paciente (id, organizacion_id, documento_identidad, nombres, apellidos, fecha_nacimiento, sexo, telefono, email, created_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![
            paciente_id,
            session.organizacion_id,
            payload.documento_identidad,
            payload.nombres,
            payload.apellidos,
            payload.fecha_nacimiento,
            payload.sexo,
            payload.telefono,
            payload.email,
            session.usuario_id,
        ],
    ).map_err(|e| match e {
        rusqlite::Error::SqliteFailure(err, _) if err.code == rusqlite::ErrorCode::ConstraintViolation => {
            ErrorApp::Validacion("Ya existe un paciente con ese documento de identidad.".into())
        }
        other => ErrorApp::Db(other),
    })?;

    tx.execute(
        "INSERT INTO expediente (id, paciente_id, codigo, organizacion_id, created_by) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![expediente_id, paciente_id, codigo, session.organizacion_id, session.usuario_id],
    )?;

    audit::registrar(
        &tx,
        Some(&session.usuario_id),
        "paciente",
        &paciente_id,
        Accion::Insert,
        None::<&()>,
        Some(&payload),
    )?;

    tx.commit()?;

    buscar_por_id(&conn, &paciente_id)
}

#[tauri::command]
pub fn actualizar_paciente(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    id: String,
    payload: UpdatePacientePayload,
) -> Resultado<PacienteConExpediente> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;

    let anterior = buscar_por_id(&conn, &id)?;

    let filas = conn.execute(
        "UPDATE paciente SET documento_identidad = ?1, nombres = ?2, apellidos = ?3, fecha_nacimiento = ?4,
             sexo = ?5, telefono = ?6, email = ?7, updated_at = datetime('now'), updated_by = ?8
         WHERE id = ?9 AND deleted_at IS NULL",
        rusqlite::params![
            payload.documento_identidad,
            payload.nombres,
            payload.apellidos,
            payload.fecha_nacimiento,
            payload.sexo,
            payload.telefono,
            payload.email,
            session.usuario_id,
            id,
        ],
    )?;
    if filas == 0 {
        return Err(ErrorApp::NoEncontrado("Paciente no encontrado".into()));
    }

    audit::registrar(
        &conn,
        Some(&session.usuario_id),
        "paciente",
        &id,
        Accion::Update,
        Some(&anterior.paciente),
        Some(&payload),
    )?;

    buscar_por_id(&conn, &id)
}

#[tauri::command]
pub fn eliminar_paciente(pool: State<DbPool>, session_state: State<SessionState>, id: String) -> Resultado<()> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;

    let filas = conn.execute(
        "UPDATE paciente SET deleted_at = datetime('now'), deleted_by = ?1 WHERE id = ?2 AND deleted_at IS NULL",
        rusqlite::params![session.usuario_id, id],
    )?;
    if filas == 0 {
        return Err(ErrorApp::NoEncontrado("Paciente no encontrado".into()));
    }

    audit::registrar(
        &conn,
        Some(&session.usuario_id),
        "paciente",
        &id,
        Accion::Delete,
        None::<&()>,
        None::<&()>,
    )?;

    Ok(())
}
