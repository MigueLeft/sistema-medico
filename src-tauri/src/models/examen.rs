use rusqlite::Row;
use serde::{Deserialize, Serialize};

modelo!(TipoExamenCatalogo {
    id: String,
    nombre: String,
    categoria: String,
    codigo_loinc: Option<String>,
});

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTipoExamenCatalogoPayload {
    pub nombre: String,
    pub categoria: String,
    pub codigo_loinc: Option<String>,
}

modelo!(Examen {
    id: String,
    paciente_id: String,
    consulta_id: String,
    tipo_examen_id: String,
    tipo_examen_nombre: String,
    tipo_examen_categoria: String,
    codigo_loinc: Option<String>,
    grupo: Option<String>,
    unidad: Option<String>,
    fecha_solicitud: String,
    fecha_resultado: Option<String>,
    estado: String,
    indicacion: Option<String>,
    valor: Option<f64>,
    bandera: Option<String>,
    notas: Option<String>,
});

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateExamenPayload {
    pub paciente_id: String,
    pub consulta_id: String,
    pub tipo_examen_id: String,
    pub fecha_solicitud: String,
    pub indicacion: Option<String>,
    pub notas: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegistrarResultadoExamenPayload {
    pub valor: Option<f64>,
    pub notas: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActualizarResultadoExamenPayload {
    pub fecha_resultado: String,
    pub estado: String,
    pub notas: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExamenValor {
    pub id: String,
    pub examen_id: String,
    pub analito: String,
    pub valor: String,
    pub unidad: Option<String>,
    pub rango_referencia: Option<String>,
    pub fuera_rango: bool,
}

impl ExamenValor {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            examen_id: row.get("examen_id")?,
            analito: row.get("analito")?,
            valor: row.get("valor")?,
            unidad: row.get("unidad")?,
            rango_referencia: row.get("rango_referencia")?,
            fuera_rango: row.get::<_, i64>("fuera_rango")? != 0,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateExamenValorPayload {
    pub examen_id: String,
    pub analito: String,
    pub valor: String,
    pub unidad: Option<String>,
    pub rango_referencia: Option<String>,
    pub fuera_rango: bool,
}
