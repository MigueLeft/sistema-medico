use chrono::Local;

/// Fecha y hora local sin zona (`YYYY-MM-DDTHH:MM:SS`), el formato que usan citas y consultas.
pub fn ahora_local() -> String {
    Local::now().format("%Y-%m-%dT%H:%M:%S").to_string()
}

/// Fecha local de hoy (`YYYY-MM-DD`).
pub fn hoy_local() -> String {
    Local::now().format("%Y-%m-%d").to_string()
}

/// Convierte cadenas vacías o solo con espacios en `None`.
pub fn limpiar(valor: Option<String>) -> Option<String> {
    valor.map(|v| v.trim().to_string()).filter(|v| !v.is_empty())
}
