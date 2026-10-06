use serde::{Deserialize, Serialize};

modelo!(Consulta {
    id: String,
    paciente_id: String,
    paciente_nombre: String,
    expediente_codigo: String,
    medico_id: String,
    medico_nombre: String,
    cita_id: Option<String>,
    fecha: String,
    tipo_cita_id: Option<String>,
    tipo_cita_nombre: Option<String>,
    motivo_consulta: String,
    enfermedad_actual: Option<String>,
    notas_medico: Option<String>,
    estado: String,
    cerrada_at: Option<String>,
    impresion_diagnostica: Option<String>,
    proximo_control: Option<String>,
    proximo_control_tipo_id: Option<String>,
    diagnostico_principal: Option<String>,
});

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IniciarConsultaPayload {
    pub paciente_id: String,
    pub cita_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GuardarConsultaPayload {
    pub tipo_cita_id: Option<String>,
    pub motivo_consulta: String,
    pub enfermedad_actual: Option<String>,
    pub notas_medico: Option<String>,
    pub impresion_diagnostica: Option<String>,
    pub proximo_control: Option<String>,
    pub proximo_control_tipo_id: Option<String>,
}
