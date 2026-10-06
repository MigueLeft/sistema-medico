use rusqlite::Row;
use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Membrete común a todos los documentos (una fila por organización).
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

/// Bloque de una plantilla, en orden de impresión. Los `automatico` los llena el sistema;
/// los `texto` se escriben al preparar el documento y se guardan en `datos.textos[clave]`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BloquePlantilla {
    pub clave: String,
    pub titulo: String,
    #[serde(default)]
    pub descripcion: Option<String>,
    pub modo: String,
}

/// Tipo de documento configurable (récipe, orden de laboratorio, referencia…).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlantillaDocumento {
    pub id: String,
    pub clave: String,
    pub nombre: String,
    pub prefijo: String,
    pub siguiente_numero: i64,
    pub papel: String,
    pub bloques: Vec<BloquePlantilla>,
    pub genera_pendientes: bool,
    pub pendiente_tipo: String,
    pub pendiente_cuantos: String,
    pub pendiente_texto: Option<String>,
    pub entrega_imprimir: bool,
    pub entrega_whatsapp: bool,
    pub entrega_correo: bool,
    pub requiere_firma: bool,
    pub activa: bool,
    pub orden: i64,
}

impl PlantillaDocumento {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        let bloques_json: String = row.get("bloques")?;
        Ok(Self {
            id: row.get("id")?,
            clave: row.get("clave")?,
            nombre: row.get("nombre")?,
            prefijo: row.get("prefijo")?,
            siguiente_numero: row.get("siguiente_numero")?,
            papel: row.get("papel")?,
            bloques: serde_json::from_str(&bloques_json).unwrap_or_default(),
            genera_pendientes: row.get("genera_pendientes")?,
            pendiente_tipo: row.get("pendiente_tipo")?,
            pendiente_cuantos: row.get("pendiente_cuantos")?,
            pendiente_texto: row.get("pendiente_texto")?,
            entrega_imprimir: row.get("entrega_imprimir")?,
            entrega_whatsapp: row.get("entrega_whatsapp")?,
            entrega_correo: row.get("entrega_correo")?,
            requiere_firma: row.get("requiere_firma")?,
            activa: row.get("activa")?,
            orden: row.get("orden")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GuardarPlantillaDocumentoPayload {
    pub nombre: String,
    pub prefijo: String,
    pub papel: String,
    pub bloques: Vec<BloquePlantilla>,
    pub genera_pendientes: bool,
    pub pendiente_tipo: String,
    pub pendiente_cuantos: String,
    pub pendiente_texto: Option<String>,
    pub entrega_imprimir: bool,
    pub entrega_whatsapp: bool,
    pub entrega_correo: bool,
    pub requiere_firma: bool,
    pub activa: bool,
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
    /// Récipe: cantidad a dispensar, p. ej. "60 (sesenta)".
    #[serde(default)]
    pub cantidad: Option<String>,
    /// Código de terminología del item (LOINC en las pruebas).
    #[serde(default)]
    pub codigo: Option<String>,
    /// Id de la entrada de catálogo de la que salió (tipo de examen o medicamento).
    #[serde(default)]
    pub referencia_id: Option<String>,
    /// `false` deja el item en el borrador pero fuera del documento emitido.
    #[serde(default)]
    pub incluido: Option<bool>,
}

impl DatosItem {
    pub fn esta_incluido(&self) -> bool {
        self.incluido.unwrap_or(true)
    }
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
    pub plantilla_documento_id: Option<String>,
    /// Clave de la plantilla (o el tipo antiguo en documentos anteriores a las plantillas).
    pub tipo: String,
    pub plantilla_nombre: Option<String>,
    pub papel: Option<String>,
    pub numero: Option<String>,
    pub estado: String,
    pub titulo: Option<String>,
    pub fecha_emision: String,
    pub emitido_at: Option<String>,
    pub tiene_pdf: bool,
    pub hash_sha256: Option<String>,
    /// Campos del documento que no son items (prioridad, preparación, textos de bloques…).
    pub datos: Value,
    pub pendientes_generados: i64,
    pub items: Vec<EntregableItem>,
}

impl Entregable {
    pub fn from_row_sin_items(row: &Row) -> rusqlite::Result<Self> {
        let datos_json: String = row.get("datos")?;
        Ok(Self {
            id: row.get("id")?,
            paciente_id: row.get("paciente_id")?,
            consulta_id: row.get("consulta_id")?,
            plantilla_documento_id: row.get("plantilla_documento_id")?,
            tipo: row.get("tipo")?,
            plantilla_nombre: row.get("plantilla_nombre")?,
            papel: row.get("papel")?,
            numero: row.get("numero")?,
            estado: row.get("estado")?,
            titulo: row.get("titulo")?,
            fecha_emision: row.get("fecha_emision")?,
            emitido_at: row.get("emitido_at")?,
            tiene_pdf: row.get("tiene_pdf")?,
            hash_sha256: row.get("hash_sha256")?,
            datos: serde_json::from_str(&datos_json).unwrap_or(Value::Null),
            pendientes_generados: row.get("pendientes_generados")?,
            items: Vec::new(),
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CrearEntregablePayload {
    pub consulta_id: String,
    pub plantilla_documento_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GuardarEntregablePayload {
    pub datos: Value,
    pub items: Vec<ItemEntregablePayload>,
}
