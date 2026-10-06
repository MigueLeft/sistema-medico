use serde::{Deserialize, Serialize};

modelo!(ConsultaSintoma {
    id: String,
    consulta_id: String,
    nombre: String,
    codigo_snomed: Option<String>,
    detalle: Option<String>,
});

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSintomaPayload {
    pub consulta_id: String,
    pub nombre: String,
    pub codigo_snomed: Option<String>,
    pub detalle: Option<String>,
}

modelo!(
    /// Un aparato o sistema del catálogo con lo registrado en la consulta (si ya se examinó).
    ExamenSistema {
        sistema_id: String,
        sistema_nombre: String,
        texto_normal: Option<String>,
        estado: Option<String>,
        descripcion: Option<String>,
        codigo_snomed: Option<String>,
    }
);

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GuardarExamenSistemaPayload {
    pub consulta_id: String,
    pub sistema_id: String,
    /// `None` borra lo registrado para ese sistema.
    pub estado: Option<String>,
    pub descripcion: Option<String>,
    pub codigo_snomed: Option<String>,
}

modelo!(ConsultaDiagnostico {
    id: String,
    consulta_id: String,
    paciente_enfermedad_id: String,
    enfermedad_catalogo_id: String,
    nombre: String,
    codigo: String,
    sistema: String,
    tipo: String,
    rol: String,
    certeza: String,
    nota: Option<String>,
    activa: bool,
});

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateConsultaDiagnosticoPayload {
    pub consulta_id: String,
    pub enfermedad_catalogo_id: String,
    pub rol: Option<String>,
    pub certeza: Option<String>,
    pub nota: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateConsultaDiagnosticoPayload {
    pub rol: String,
    pub certeza: String,
    pub nota: Option<String>,
}
