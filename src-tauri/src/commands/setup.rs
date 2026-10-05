use argon2::password_hash::{rand_core::OsRng, PasswordHasher, SaltString};
use argon2::Argon2;
use serde::Deserialize;
use tauri::State;
use uuid::Uuid;

use crate::audit::{self, Accion};
use crate::db::DbPool;
use crate::error::{ErrorApp, Resultado};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MedicoSetupPayload {
    pub nombre_organizacion: String,
    pub nombre_completo: String,
    pub email: String,
    pub password: String,
    pub colegiatura: Option<String>,
    pub especialidad: Option<String>,
}

#[tauri::command]
pub fn hay_usuarios(pool: State<DbPool>) -> Resultado<bool> {
    let conn = pool.get()?;
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM usuario WHERE deleted_at IS NULL", [], |r| r.get(0))?;
    Ok(count > 0)
}

#[tauri::command]
pub fn crear_organizacion_inicial(pool: State<DbPool>, payload: MedicoSetupPayload) -> Resultado<()> {
    let mut conn = pool.get()?;
    let ya_configurado: i64 = conn.query_row("SELECT COUNT(*) FROM usuario", [], |r| r.get(0))?;
    if ya_configurado > 0 {
        return Err(ErrorApp::Validacion("El sistema ya tiene una cuenta configurada.".into()));
    }

    let salt = SaltString::generate(&mut OsRng);
    let password_hash = Argon2::default()
        .hash_password(payload.password.as_bytes(), &salt)
        .map_err(|e| ErrorApp::Interno(format!("No se pudo generar el hash de la contraseña: {e}")))?
        .to_string();

    let organizacion_id = Uuid::new_v4().to_string();
    let usuario_id = Uuid::new_v4().to_string();
    let rol_id = Uuid::new_v4().to_string();
    let perfil_id = Uuid::new_v4().to_string();

    let tx = conn.transaction()?;

    tx.execute(
        "INSERT INTO organizacion (id, nombre) VALUES (?1, ?2)",
        rusqlite::params![organizacion_id, payload.nombre_organizacion],
    )?;

    tx.execute(
        "INSERT INTO usuario (id, organizacion_id, nombre_completo, email, password_hash, activo, created_by)
         VALUES (?1, ?2, ?3, ?4, ?5, 1, ?1)",
        rusqlite::params![usuario_id, organizacion_id, payload.nombre_completo, payload.email, password_hash],
    )?;

    tx.execute(
        "INSERT INTO rol (id, nombre, permisos) VALUES (?1, 'medico', '{}')",
        rusqlite::params![rol_id],
    )?;
    tx.execute(
        "INSERT INTO usuario_rol (usuario_id, rol_id) VALUES (?1, ?2)",
        rusqlite::params![usuario_id, rol_id],
    )?;

    tx.execute(
        "INSERT INTO perfil_medico (id, usuario_id, colegiatura, especialidad) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![perfil_id, usuario_id, payload.colegiatura, payload.especialidad],
    )?;

    audit::registrar(
        &tx,
        Some(&usuario_id),
        "usuario",
        &usuario_id,
        Accion::Insert,
        None::<&()>,
        Some(&payload.email),
    )?;

    tx.commit()?;

    Ok(())
}
