use rusqlite::Row;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnfermedadCatalogo {
    pub id: String,
    pub codigo: String,
    pub version_cie: String,
    pub nombre: String,
}

impl EnfermedadCatalogo {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            codigo: row.get("codigo")?,
            version_cie: row.get("version_cie")?,
            nombre: row.get("nombre")?,
        })
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateEnfermedadCatalogoPayload {
    pub codigo: String,
    pub version_cie: String,
    pub nombre: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PacienteEnfermedad {
    pub id: String,
    pub paciente_id: String,
    pub enfermedad_catalogo_id: String,
    pub enfermedad_nombre: String,
    pub enfermedad_codigo: String,
    pub activa: bool,
    pub fecha_diagnostico: String,
    pub fecha_resolucion: Option<String>,
    pub notas: Option<String>,
}

impl PacienteEnfermedad {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            paciente_id: row.get("paciente_id")?,
            enfermedad_catalogo_id: row.get("enfermedad_catalogo_id")?,
            enfermedad_nombre: row.get("enfermedad_nombre")?,
            enfermedad_codigo: row.get("enfermedad_codigo")?,
            activa: row.get::<_, i64>("activa")? != 0,
            fecha_diagnostico: row.get("fecha_diagnostico")?,
            fecha_resolucion: row.get("fecha_resolucion")?,
            notas: row.get("notas")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateDiagnosticoPayload {
    pub paciente_id: String,
    pub enfermedad_catalogo_id: String,
    pub fecha_diagnostico: String,
    pub notas: Option<String>,
}
