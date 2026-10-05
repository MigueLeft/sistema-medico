use rusqlite::Row;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Cita {
    pub id: String,
    pub paciente_id: String,
    pub paciente_nombre: String,
    pub medico_id: String,
    pub fecha_hora: String,
    pub motivo: String,
    pub estado: String,
}

impl Cita {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            paciente_id: row.get("paciente_id")?,
            paciente_nombre: row.get("paciente_nombre")?,
            medico_id: row.get("medico_id")?,
            fecha_hora: row.get("fecha_hora")?,
            motivo: row.get("motivo")?,
            estado: row.get("estado")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCitaPayload {
    pub paciente_id: String,
    pub fecha_hora: String,
    pub motivo: String,
}
