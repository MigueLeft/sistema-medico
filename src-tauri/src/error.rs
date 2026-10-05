use serde::Serialize;

/// Error unificado que devuelven todos los comandos de Tauri.
/// Se serializa como `{ "message": "..." }` para que el frontend
/// pueda leer `error.message` de forma consistente.
#[derive(Debug, thiserror::Error)]
pub enum ErrorApp {
    #[error("{0}")]
    NoEncontrado(String),

    #[error("{0}")]
    Validacion(String),

    #[error("Credenciales inválidas")]
    CredencialesInvalidas,

    #[error("No hay una sesión activa")]
    SinSesion,

    #[error("Error de base de datos: {0}")]
    Db(#[from] rusqlite::Error),

    #[error("Error de conexión a base de datos: {0}")]
    Pool(#[from] r2d2::Error),

    #[error("Error interno: {0}")]
    Interno(String),
}

impl Serialize for ErrorApp {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;
        let mut state = serializer.serialize_struct("ErrorApp", 1)?;
        state.serialize_field("message", &self.to_string())?;
        state.end()
    }
}

pub type Resultado<T> = Result<T, ErrorApp>;
