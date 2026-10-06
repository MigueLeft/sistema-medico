use serde::Serialize;

modelo!(ConteoSemana { semana_inicio: String, total: i64 });
modelo!(ConteoDiagnostico { nombre: String, total: i64 });

modelo!(ResultadoReciente {
    examen_id: String,
    paciente_id: String,
    paciente_nombre: String,
    nombre: String,
    valor: Option<f64>,
    unidad: Option<String>,
    bandera: Option<String>,
    fecha_resultado: Option<String>,
});

modelo!(ConsultaAbierta {
    id: String,
    paciente_id: String,
    paciente_nombre: String,
    fecha: String,
    diagnosticos: i64,
});

modelo!(PacienteSinControl {
    id: String,
    nombre: String,
    ultima_consulta: Option<String>,
});

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Dashboard {
    pub consultas_sin_cerrar: Vec<ConsultaAbierta>,
    pub resultados_recientes: Vec<ResultadoReciente>,
    pub pacientes_sin_control: Vec<PacienteSinControl>,
    pub consultas_por_semana: Vec<ConteoSemana>,
    pub diagnosticos_frecuentes: Vec<ConteoDiagnostico>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContadoresNav {
    pub citas_hoy: i64,
    pub consultas_sin_cerrar: i64,
}
