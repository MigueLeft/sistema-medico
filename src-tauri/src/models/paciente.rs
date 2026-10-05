use rusqlite::Row;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Paciente {
    pub id: String,
    pub organizacion_id: String,
    pub documento_identidad: String,
    pub nombres: String,
    pub apellidos: String,
    pub fecha_nacimiento: String,
    pub sexo: String,
    pub telefono: Option<String>,
    pub email: Option<String>,
    pub created_at: String,
}

impl Paciente {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            organizacion_id: row.get("organizacion_id")?,
            documento_identidad: row.get("documento_identidad")?,
            nombres: row.get("nombres")?,
            apellidos: row.get("apellidos")?,
            fecha_nacimiento: row.get("fecha_nacimiento")?,
            sexo: row.get("sexo")?,
            telefono: row.get("telefono")?,
            email: row.get("email")?,
            created_at: row.get("created_at")?,
        })
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Expediente {
    pub id: String,
    pub paciente_id: String,
    pub codigo: String,
    pub fecha_apertura: String,
}

impl Expediente {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("expediente_id")?,
            paciente_id: row.get("id")?,
            codigo: row.get("expediente_codigo")?,
            fecha_apertura: row.get("expediente_fecha_apertura")?,
        })
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PacienteConExpediente {
    #[serde(flatten)]
    pub paciente: Paciente,
    pub expediente: Expediente,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePacientePayload {
    pub documento_identidad: String,
    pub nombres: String,
    pub apellidos: String,
    pub fecha_nacimiento: String,
    pub sexo: String,
    pub telefono: Option<String>,
    pub email: Option<String>,
}

pub type UpdatePacientePayload = CreatePacientePayload;
