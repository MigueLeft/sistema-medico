use rusqlite::Connection;
use serde::Serialize;
use serde_json::Value;
use uuid::Uuid;

pub enum Accion {
    Insert,
    Update,
    Delete,
}

impl Accion {
    fn as_str(&self) -> &'static str {
        match self {
            Accion::Insert => "insert",
            Accion::Update => "update",
            Accion::Delete => "delete",
        }
    }
}

/// Inserta una fila en `auditoria`. Se llama desde cada comando que
/// crea, edita o elimina (soft-delete) un registro clínico.
pub fn registrar<A: Serialize, B: Serialize>(
    conn: &Connection,
    actor_id: Option<&str>,
    tabla: &str,
    registro_id: &str,
    accion: Accion,
    valores_anteriores: Option<&A>,
    valores_nuevos: Option<&B>,
) -> rusqlite::Result<()> {
    let anteriores: Option<Value> = valores_anteriores.map(|v| serde_json::to_value(v).unwrap_or(Value::Null));
    let nuevos: Option<Value> = valores_nuevos.map(|v| serde_json::to_value(v).unwrap_or(Value::Null));

    conn.execute(
        "INSERT INTO auditoria (id, usuario_id, tabla, registro_id, accion, valores_anteriores, valores_nuevos, timestamp)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now'))",
        rusqlite::params![
            Uuid::new_v4().to_string(),
            actor_id,
            tabla,
            registro_id,
            accion.as_str(),
            anteriores.map(|v| v.to_string()),
            nuevos.map(|v| v.to_string()),
        ],
    )?;
    Ok(())
}
