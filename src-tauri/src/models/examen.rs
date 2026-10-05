use rusqlite::Row;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TipoExamenCatalogo {
    pub id: String,
    pub nombre: String,
    pub categoria: String,
    pub codigo_loinc: Option<String>,
}

impl TipoExamenCatalogo {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            nombre: row.get("nombre")?,
            categoria: row.get("categoria")?,
            codigo_loinc: row.get("codigo_loinc")?,
        })
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTipoExamenCatalogoPayload {
    pub nombre: String,
    pub categoria: String,
    pub codigo_loinc: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Examen {
    pub id: String,
    pub paciente_id: String,
    pub consulta_id: String,
    pub tipo_examen_id: String,
    pub tipo_examen_nombre: String,
    pub tipo_examen_categoria: String,
    pub fecha_solicitud: String,
    pub fecha_resultado: Option<String>,
    pub estado: String,
    pub notas: Option<String>,
}

impl Examen {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            paciente_id: row.get("paciente_id")?,
            consulta_id: row.get("consulta_id")?,
            tipo_examen_id: row.get("tipo_examen_id")?,
            tipo_examen_nombre: row.get("tipo_examen_nombre")?,
            tipo_examen_categoria: row.get("tipo_examen_categoria")?,
            fecha_solicitud: row.get("fecha_solicitud")?,
            fecha_resultado: row.get("fecha_resultado")?,
            estado: row.get("estado")?,
            notas: row.get("notas")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateExamenPayload {
    pub paciente_id: String,
    pub consulta_id: String,
    pub tipo_examen_id: String,
    pub fecha_solicitud: String,
    pub notas: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActualizarResultadoExamenPayload {
    pub fecha_resultado: String,
    pub estado: String,
    pub notas: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExamenValor {
    pub id: String,
    pub examen_id: String,
    pub analito: String,
    pub valor: String,
    pub unidad: Option<String>,
    pub rango_referencia: Option<String>,
    pub fuera_rango: bool,
}

impl ExamenValor {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            examen_id: row.get("examen_id")?,
            analito: row.get("analito")?,
            valor: row.get("valor")?,
            unidad: row.get("unidad")?,
            rango_referencia: row.get("rango_referencia")?,
            fuera_rango: row.get::<_, i64>("fuera_rango")? != 0,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateExamenValorPayload {
    pub examen_id: String,
    pub analito: String,
    pub valor: String,
    pub unidad: Option<String>,
    pub rango_referencia: Option<String>,
    pub fuera_rango: bool,
}
