use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    #[serde(rename = "usuarioId")]
    pub usuario_id: String,
    #[serde(rename = "organizacionId")]
    pub organizacion_id: String,
    #[serde(rename = "nombreCompleto")]
    pub nombre_completo: String,
    pub email: String,
    pub roles: Vec<String>,
}

/// Estado de sesión en memoria del proceso Rust. Se pierde al cerrar la app
/// (no hay "recordar sesión" persistente todavía — ver notas del plan).
#[derive(Default)]
pub struct SessionState(pub Mutex<Option<Session>>);

impl SessionState {
    pub fn get(&self) -> Option<Session> {
        self.0.lock().unwrap().clone()
    }

    pub fn set(&self, session: Session) {
        *self.0.lock().unwrap() = Some(session);
    }

    pub fn clear(&self) {
        *self.0.lock().unwrap() = None;
    }
}
