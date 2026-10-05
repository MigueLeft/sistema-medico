use rusqlite::Row;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlantillaEntregable {
    pub id: String,
    pub nombre_consultorio: Option<String>,
    pub encabezado: Option<String>,
    pub pie_pagina: Option<String>,
}

impl PlantillaEntregable {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            nombre_consultorio: row.get("nombre_consultorio")?,
            encabezado: row.get("encabezado")?,
            pie_pagina: row.get("pie_pagina")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GuardarPlantillaEntregablePayload {
    pub nombre_consultorio: Option<String>,
    pub encabezado: Option<String>,
    pub pie_pagina: Option<String>,
}

/// Campos posibles de un item de entregable. Según `tipoItem` ("medicamento" | "examen" | "texto")
/// solo aplica un subconjunto; el resto queda en `None`.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatosItem {
    pub nombre: Option<String>,
    pub dosis: Option<String>,
    pub frecuencia: Option<String>,
    pub duracion: Option<String>,
    pub via: Option<String>,
    pub categoria: Option<String>,
    pub indicaciones: Option<String>,
    pub texto: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EntregableItem {
    pub id: String,
    pub orden: i64,
    pub tipo_item: String,
    #[serde(flatten)]
    pub datos: DatosItem,
}

impl EntregableItem {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        let datos_json: String = row.get("datos")?;
        let datos: DatosItem = serde_json::from_str(&datos_json).unwrap_or_default();
        Ok(Self {
            id: row.get("id")?,
            orden: row.get("orden")?,
            tipo_item: row.get("tipo_item")?,
            datos,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemEntregablePayload {
    pub tipo_item: String,
    #[serde(flatten)]
    pub datos: DatosItem,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Entregable {
    pub id: String,
    pub paciente_id: String,
    pub consulta_id: String,
    pub tipo: String,
    pub titulo: Option<String>,
    pub fecha_emision: String,
    pub archivo_pdf_path: Option<String>,
    pub hash_sha256: Option<String>,
    pub items: Vec<EntregableItem>,
}

impl Entregable {
    pub fn from_row_sin_items(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            paciente_id: row.get("paciente_id")?,
            consulta_id: row.get("consulta_id")?,
            tipo: row.get("tipo")?,
            titulo: row.get("titulo")?,
            fecha_emision: row.get("fecha_emision")?,
            archivo_pdf_path: row.get("archivo_pdf_path")?,
            hash_sha256: row.get("hash_sha256")?,
            items: Vec::new(),
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateEntregablePayload {
    pub paciente_id: String,
    pub consulta_id: String,
    pub tipo: String,
    pub titulo: Option<String>,
    pub items: Vec<ItemEntregablePayload>,
}
