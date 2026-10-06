use serde::{Deserialize, Serialize};

modelo!(Pendiente {
    id: String,
    paciente_id: String,
    consulta_origen_id: Option<String>,
    consulta_origen_fecha: Option<String>,
    examen_id: Option<String>,
    entregable_id: Option<String>,
    entregable_numero: Option<String>,
    tipo: String,
    nombre: String,
    codigo_loinc: Option<String>,
    estado: String,
    consulta_revision_id: Option<String>,
    entregado_at: Option<String>,
    archivo_nombre: Option<String>,
    archivo_bytes: Option<i64>,
    updated_at: Option<String>,
});

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePendientePayload {
    pub paciente_id: String,
    pub consulta_origen_id: Option<String>,
    pub tipo: String,
    pub nombre: String,
    pub codigo_loinc: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MarcarPendientePayload {
    /// pendiente|entregado|no_entregado
    pub estado: String,
    pub consulta_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdjuntarPendientePayload {
    pub consulta_id: Option<String>,
    pub nombre: String,
    pub mime: String,
    pub datos: Vec<u8>,
}
