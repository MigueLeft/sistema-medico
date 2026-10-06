use rusqlite::Row;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MedicamentoCatalogo {
    pub id: String,
    pub nombre_comercial: String,
    pub principio_activo: String,
    pub presentacion: Option<String>,
    pub concentracion: Option<String>,
    pub alergenos: Option<String>,
}

impl MedicamentoCatalogo {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            nombre_comercial: row.get("nombre_comercial")?,
            principio_activo: row.get("principio_activo")?,
            presentacion: row.get("presentacion")?,
            concentracion: row.get("concentracion")?,
            alergenos: row.get("alergenos")?,
        })
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateMedicamentoCatalogoPayload {
    pub nombre_comercial: String,
    pub principio_activo: String,
    pub presentacion: Option<String>,
    pub concentracion: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TratamientoMedicamento {
    pub id: String,
    pub medicamento_id: String,
    pub medicamento_nombre: String,
    pub presentacion: Option<String>,
    pub concentracion: Option<String>,
    pub alergenos: Option<String>,
    pub dosis: String,
    pub frecuencia: String,
    pub duracion: Option<String>,
    pub via: Option<String>,
    pub indicaciones: Option<String>,
}

impl TratamientoMedicamento {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            medicamento_id: row.get("medicamento_id")?,
            medicamento_nombre: row.get("medicamento_nombre")?,
            presentacion: row.get("presentacion")?,
            concentracion: row.get("concentracion")?,
            alergenos: row.get("alergenos")?,
            dosis: row.get("dosis")?,
            frecuencia: row.get("frecuencia")?,
            duracion: row.get("duracion")?,
            via: row.get("via")?,
            indicaciones: row.get("indicaciones")?,
        })
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Tratamiento {
    pub id: String,
    pub consulta_id: String,
    pub indicaciones_generales: Option<String>,
    pub medicamentos: Vec<TratamientoMedicamento>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemMedicamentoPayload {
    pub medicamento_id: String,
    pub dosis: String,
    pub frecuencia: String,
    pub duracion: Option<String>,
    pub via: Option<String>,
    pub indicaciones: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GuardarTratamientoPayload {
    pub consulta_id: String,
    pub indicaciones_generales: Option<String>,
    pub medicamentos: Vec<ItemMedicamentoPayload>,
}
