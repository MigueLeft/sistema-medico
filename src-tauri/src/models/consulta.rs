use rusqlite::Row;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Consulta {
    pub id: String,
    pub paciente_id: String,
    pub medico_id: String,
    pub medico_nombre: String,
    pub cita_id: Option<String>,
    pub fecha: String,
    pub motivo_consulta: String,
    pub notas_medico: Option<String>,
}

impl Consulta {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            paciente_id: row.get("paciente_id")?,
            medico_id: row.get("medico_id")?,
            medico_nombre: row.get("medico_nombre")?,
            cita_id: row.get("cita_id")?,
            fecha: row.get("fecha")?,
            motivo_consulta: row.get("motivo_consulta")?,
            notas_medico: row.get("notas_medico")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateConsultaPayload {
    pub paciente_id: String,
    pub cita_id: Option<String>,
    pub motivo_consulta: String,
    pub notas_medico: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateNotasConsultaPayload {
    pub notas_medico: String,
}
