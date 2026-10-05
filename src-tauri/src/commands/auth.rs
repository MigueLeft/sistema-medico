use argon2::password_hash::PasswordHash;
use argon2::{Argon2, PasswordVerifier};
use serde::Deserialize;
use tauri::State;

use crate::db::DbPool;
use crate::error::{ErrorApp, Resultado};
use crate::session::{Session, SessionState};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginPayload {
    pub email: String,
    pub password: String,
}

#[tauri::command]
pub fn login(pool: State<DbPool>, session_state: State<SessionState>, payload: LoginPayload) -> Resultado<Session> {
    let conn = pool.get()?;

    let usuario = conn
        .query_row(
            "SELECT id, organizacion_id, nombre_completo, email, password_hash
             FROM usuario
             WHERE email = ?1 AND activo = 1 AND deleted_at IS NULL",
            rusqlite::params![payload.email],
            |row| {
                Ok((
                    row.get::<_, String>("id")?,
                    row.get::<_, String>("organizacion_id")?,
                    row.get::<_, String>("nombre_completo")?,
                    row.get::<_, String>("email")?,
                    row.get::<_, String>("password_hash")?,
                ))
            },
        )
        .map_err(|_| ErrorApp::CredencialesInvalidas)?;

    let (usuario_id, organizacion_id, nombre_completo, email, password_hash) = usuario;

    let parsed_hash =
        PasswordHash::new(&password_hash).map_err(|e| ErrorApp::Interno(format!("Hash inválido: {e}")))?;
    Argon2::default()
        .verify_password(payload.password.as_bytes(), &parsed_hash)
        .map_err(|_| ErrorApp::CredencialesInvalidas)?;

    let mut roles_stmt = conn.prepare(
        "SELECT r.nombre FROM rol r JOIN usuario_rol ur ON ur.rol_id = r.id WHERE ur.usuario_id = ?1",
    )?;
    let roles: Vec<String> = roles_stmt
        .query_map(rusqlite::params![usuario_id], |row| row.get(0))?
        .collect::<rusqlite::Result<_>>()?;

    let session = Session {
        usuario_id,
        organizacion_id,
        nombre_completo,
        email,
        roles,
    };
    session_state.set(session.clone());

    Ok(session)
}

#[tauri::command]
pub fn logout(session_state: State<SessionState>) -> Resultado<()> {
    session_state.clear();
    Ok(())
}

#[tauri::command]
pub fn sesion_actual(session_state: State<SessionState>) -> Resultado<Option<Session>> {
    Ok(session_state.get())
}
