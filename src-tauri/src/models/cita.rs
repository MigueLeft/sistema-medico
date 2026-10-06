use serde::{Deserialize, Serialize};

modelo!(Cita {
    id: String,
    paciente_id: String,
    paciente_nombre: String,
    paciente_nombre_corto: String,
    paciente_documento: String,
    paciente_telefono: Option<String>,
    paciente_fecha_nacimiento: String,
    expediente_codigo: String,
    medico_id: String,
    medico_nombre: String,
    fecha_hora: String,
    duracion_min: i64,
    tipo_cita_id: Option<String>,
    tipo_cita_nombre: Option<String>,
    motivo: String,
    estado: String,
    enviar_recordatorio: bool,
    consulta_id: Option<String>,
    ultima_consulta: Option<String>,
    pendientes_abiertos: i64,
});

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCitaPayload {
    pub paciente_id: String,
    pub fecha_hora: String,
    pub duracion_min: Option<i64>,
    pub tipo_cita_id: Option<String>,
    pub motivo: String,
    #[serde(default)]
    pub enviar_recordatorio: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReprogramarCitaPayload {
    pub fecha_hora: String,
    pub duracion_min: Option<i64>,
}
