use serde::{Deserialize, Serialize};

modelo!(Antecedente {
    id: String,
    paciente_id: String,
    tipo: String,
    subcategoria: Option<String>,
    descripcion: String,
    codigo_snomed: Option<String>,
    detalle: Option<String>,
    fecha: Option<String>,
    estado: Option<String>,
    parentesco: Option<String>,
    reaccion: Option<String>,
    severidad: Option<String>,
    dias_estancia: Option<i64>,
    centro_salud: Option<String>,
    servicio: Option<String>,
    consulta_id: Option<String>,
    fecha_registro: String,
});

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GuardarAntecedentePayload {
    pub paciente_id: String,
    pub tipo: String,
    pub subcategoria: Option<String>,
    pub descripcion: String,
    pub codigo_snomed: Option<String>,
    pub detalle: Option<String>,
    pub fecha: Option<String>,
    pub estado: Option<String>,
    pub parentesco: Option<String>,
    pub reaccion: Option<String>,
    pub severidad: Option<String>,
    pub dias_estancia: Option<i64>,
    pub centro_salud: Option<String>,
    pub servicio: Option<String>,
    pub consulta_id: Option<String>,
}
