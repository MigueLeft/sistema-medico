use rusqlite::Row;
use serde::{Deserialize, Serialize};

pub const SEGMENTOS: [&str; 5] = ["brazo_izquierdo", "brazo_derecho", "pierna_izquierda", "pierna_derecha", "tronco"];

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ComposicionCorporalSegmento {
    pub id: String,
    pub segmento: String,
    pub masa_grasa_pct: Option<f64>,
    pub masa_grasa_kg: Option<f64>,
    pub masa_magra_kg: Option<f64>,
    pub masa_muscular_prevista_kg: Option<f64>,
    pub masa_musculo_esqueletica_pct: Option<f64>,
    pub masa_musculo_esqueletica_kg: Option<f64>,
}

impl ComposicionCorporalSegmento {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            segmento: row.get("segmento")?,
            masa_grasa_pct: row.get("masa_grasa_pct")?,
            masa_grasa_kg: row.get("masa_grasa_kg")?,
            masa_magra_kg: row.get("masa_magra_kg")?,
            masa_muscular_prevista_kg: row.get("masa_muscular_prevista_kg")?,
            masa_musculo_esqueletica_pct: row.get("masa_musculo_esqueletica_pct")?,
            masa_musculo_esqueletica_kg: row.get("masa_musculo_esqueletica_kg")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemSegmentoPayload {
    pub segmento: String,
    pub masa_grasa_pct: Option<f64>,
    pub masa_grasa_kg: Option<f64>,
    pub masa_magra_kg: Option<f64>,
    pub masa_muscular_prevista_kg: Option<f64>,
    pub masa_musculo_esqueletica_pct: Option<f64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ComposicionCorporal {
    pub id: String,
    pub paciente_id: String,
    pub consulta_id: String,
    pub fecha: String,
    pub altura_cm: Option<f64>,
    pub peso_kg: Option<f64>,
    pub imc: Option<f64>,
    pub mb_kcal: Option<f64>,
    pub masa_grasa_pct: Option<f64>,
    pub masa_grasa_kg: Option<f64>,
    pub masa_magra_kg: Option<f64>,
    pub agua_total_kg: Option<f64>,
    pub peso_ideal_kg: Option<f64>,
    pub masa_grasa_ideal_kg: Option<f64>,
    pub grasa_a_perder_kg: Option<f64>,
    pub notas: Option<String>,
    pub segmentos: Vec<ComposicionCorporalSegmento>,
}

impl ComposicionCorporal {
    pub fn from_row_sin_segmentos(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            paciente_id: row.get("paciente_id")?,
            consulta_id: row.get("consulta_id")?,
            fecha: row.get("fecha")?,
            altura_cm: row.get("altura_cm")?,
            peso_kg: row.get("peso_kg")?,
            imc: row.get("imc")?,
            mb_kcal: row.get("mb_kcal")?,
            masa_grasa_pct: row.get("masa_grasa_pct")?,
            masa_grasa_kg: row.get("masa_grasa_kg")?,
            masa_magra_kg: row.get("masa_magra_kg")?,
            agua_total_kg: row.get("agua_total_kg")?,
            peso_ideal_kg: row.get("peso_ideal_kg")?,
            masa_grasa_ideal_kg: row.get("masa_grasa_ideal_kg")?,
            grasa_a_perder_kg: row.get("grasa_a_perder_kg")?,
            notas: row.get("notas")?,
            segmentos: Vec::new(),
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateComposicionCorporalPayload {
    pub paciente_id: String,
    pub consulta_id: String,
    pub altura_cm: Option<f64>,
    pub peso_kg: Option<f64>,
    pub imc: Option<f64>,
    pub mb_kcal: Option<f64>,
    pub masa_grasa_pct: Option<f64>,
    pub agua_total_kg: Option<f64>,
    pub peso_ideal_kg: Option<f64>,
    pub masa_grasa_ideal_kg: Option<f64>,
    pub notas: Option<String>,
    pub segmentos: Vec<ItemSegmentoPayload>,
}
