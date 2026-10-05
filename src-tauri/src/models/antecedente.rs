use rusqlite::Row;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Antecedente {
    pub id: String,
    pub paciente_id: String,
    pub tipo: String,
    pub subcategoria: Option<String>,
    pub descripcion: String,
    pub fecha_registro: String,
}

impl Antecedente {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            paciente_id: row.get("paciente_id")?,
            tipo: row.get("tipo")?,
            subcategoria: row.get("subcategoria")?,
            descripcion: row.get("descripcion")?,
            fecha_registro: row.get("fecha_registro")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateAntecedentePayload {
    pub paciente_id: String,
    pub tipo: String,
    pub subcategoria: Option<String>,
    pub descripcion: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IntervencionQx {
    pub id: String,
    pub paciente_id: String,
    pub antecedente_id: Option<String>,
    pub consulta_id: Option<String>,
    pub nombre: String,
    pub fecha: String,
    pub notas: Option<String>,
}

impl IntervencionQx {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            paciente_id: row.get("paciente_id")?,
            antecedente_id: row.get("antecedente_id")?,
            consulta_id: row.get("consulta_id")?,
            nombre: row.get("nombre")?,
            fecha: row.get("fecha")?,
            notas: row.get("notas")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateIntervencionQxPayload {
    pub paciente_id: String,
    pub antecedente_id: Option<String>,
    pub consulta_id: Option<String>,
    pub nombre: String,
    pub fecha: String,
    pub notas: Option<String>,
}
