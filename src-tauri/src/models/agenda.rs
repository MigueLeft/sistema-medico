use serde::{Deserialize, Serialize};

modelo!(ConfiguracionAgenda {
    id: String,
    dias_atencion: String,
    hora_inicio: String,
    hora_cierre: String,
    pausa_inicio: Option<String>,
    pausa_fin: Option<String>,
    duracion_defecto_min: i64,
    permitir_sobrecupos: bool,
    max_sobrecupos: i64,
    recordatorio_anticipacion_h: i64,
    recordatorio_canal: String,
    si_no_confirma: String,
    recordatorio_mensaje: Option<String>,
});

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GuardarConfiguracionAgendaPayload {
    pub dias_atencion: String,
    pub hora_inicio: String,
    pub hora_cierre: String,
    pub pausa_inicio: Option<String>,
    pub pausa_fin: Option<String>,
    pub duracion_defecto_min: i64,
    pub permitir_sobrecupos: bool,
    pub max_sobrecupos: i64,
    pub recordatorio_anticipacion_h: i64,
    pub recordatorio_canal: String,
    pub si_no_confirma: String,
    pub recordatorio_mensaje: Option<String>,
}

modelo!(TipoCita {
    id: String,
    nombre: String,
    duracion_min: i64,
    agendable_por: String,
    activo: bool,
    orden: i64,
});

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GuardarTipoCitaPayload {
    pub nombre: String,
    pub duracion_min: i64,
    pub agendable_por: String,
    pub activo: bool,
}

modelo!(DiaBloqueado {
    id: String,
    fecha: String,
    motivo: Option<String>,
});
