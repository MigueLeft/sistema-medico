use rusqlite::Row;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExamenFisico {
    pub id: String,
    pub paciente_id: String,
    pub consulta_id: String,
    pub fecha: String,
    pub ta_sistolica: Option<i64>,
    pub ta_diastolica: Option<i64>,
    pub peso_kg: Option<f64>,
    pub talla_cm: Option<f64>,
    pub imc: Option<f64>,
    pub grasa_corporal_pct: Option<f64>,
    pub grasa_corporal_kg: Option<f64>,
    pub masa_magra_kg: Option<f64>,
    pub masa_muscular_pct: Option<f64>,
    pub masa_muscular_kg: Option<f64>,
    pub circunferencia_abdominal_cm: Option<f64>,
    pub circunferencia_cadera_cm: Option<f64>,
    pub indice_cintura_cadera: Option<f64>,
    pub circunferencia_cuello_cm: Option<f64>,
    pub fuerza_mano_derecha_kg: Option<f64>,
    pub fuerza_mano_izquierda_kg: Option<f64>,
    pub fc: Option<i64>,
    pub temperatura: Option<f64>,
    pub frecuencia_respiratoria: Option<i64>,
    pub saturacion_oxigeno_pct: Option<f64>,
    pub notas: Option<String>,
}

impl ExamenFisico {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            paciente_id: row.get("paciente_id")?,
            consulta_id: row.get("consulta_id")?,
            fecha: row.get("fecha")?,
            ta_sistolica: row.get("ta_sistolica")?,
            ta_diastolica: row.get("ta_diastolica")?,
            peso_kg: row.get("peso_kg")?,
            talla_cm: row.get("talla_cm")?,
            imc: row.get("imc")?,
            grasa_corporal_pct: row.get("grasa_corporal_pct")?,
            grasa_corporal_kg: row.get("grasa_corporal_kg")?,
            masa_magra_kg: row.get("masa_magra_kg")?,
            masa_muscular_pct: row.get("masa_muscular_pct")?,
            masa_muscular_kg: row.get("masa_muscular_kg")?,
            circunferencia_abdominal_cm: row.get("circunferencia_abdominal_cm")?,
            circunferencia_cadera_cm: row.get("circunferencia_cadera_cm")?,
            indice_cintura_cadera: row.get("indice_cintura_cadera")?,
            circunferencia_cuello_cm: row.get("circunferencia_cuello_cm")?,
            fuerza_mano_derecha_kg: row.get("fuerza_mano_derecha_kg")?,
            fuerza_mano_izquierda_kg: row.get("fuerza_mano_izquierda_kg")?,
            fc: row.get("fc")?,
            temperatura: row.get("temperatura")?,
            frecuencia_respiratoria: row.get("frecuencia_respiratoria")?,
            saturacion_oxigeno_pct: row.get("saturacion_oxigeno_pct")?,
            notas: row.get("notas")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateExamenFisicoPayload {
    pub paciente_id: String,
    pub consulta_id: String,
    pub ta_sistolica: Option<i64>,
    pub ta_diastolica: Option<i64>,
    pub peso_kg: Option<f64>,
    pub talla_cm: Option<f64>,
    pub grasa_corporal_pct: Option<f64>,
    pub masa_muscular_pct: Option<f64>,
    pub masa_muscular_kg: Option<f64>,
    pub circunferencia_abdominal_cm: Option<f64>,
    pub circunferencia_cadera_cm: Option<f64>,
    pub circunferencia_cuello_cm: Option<f64>,
    pub fuerza_mano_derecha_kg: Option<f64>,
    pub fuerza_mano_izquierda_kg: Option<f64>,
    pub fc: Option<i64>,
    pub temperatura: Option<f64>,
    pub frecuencia_respiratoria: Option<i64>,
    pub saturacion_oxigeno_pct: Option<f64>,
    pub notas: Option<String>,
}
