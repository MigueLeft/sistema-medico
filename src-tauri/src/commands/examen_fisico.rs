use tauri::State;
use uuid::Uuid;

use crate::audit::{self, Accion};
use crate::db::DbPool;
use crate::error::{ErrorApp, Resultado};
use crate::models::{CreateExamenFisicoPayload, ExamenFisico};
use crate::session::SessionState;

const SELECT_EXAMEN_FISICO: &str = "
    SELECT id, paciente_id, consulta_id, fecha, ta_sistolica, ta_diastolica, peso_kg, talla_cm, imc,
           grasa_corporal_pct, grasa_corporal_kg, masa_muscular_pct, masa_muscular_kg,
           circunferencia_abdominal_cm, circunferencia_cadera_cm, indice_cintura_cadera, circunferencia_cuello_cm,
           fuerza_mano_derecha_kg, fuerza_mano_izquierda_kg, fc, temperatura, frecuencia_respiratoria,
           saturacion_oxigeno_pct, notas
    FROM examen_fisico
";

#[tauri::command]
pub fn listar_examen_fisico(pool: State<DbPool>, paciente_id: String) -> Resultado<Vec<ExamenFisico>> {
    let conn = pool.get()?;
    let sql = format!("{SELECT_EXAMEN_FISICO} WHERE paciente_id = ?1 AND deleted_at IS NULL ORDER BY fecha DESC");
    let mut stmt = conn.prepare(&sql)?;
    let items = stmt
        .query_map(rusqlite::params![paciente_id], ExamenFisico::from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(items)
}

#[tauri::command]
pub fn crear_examen_fisico(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    payload: CreateExamenFisicoPayload,
) -> Resultado<ExamenFisico> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;
    let id = Uuid::new_v4().to_string();

    let imc = match (payload.peso_kg, payload.talla_cm) {
        (Some(peso), Some(talla)) if talla > 0.0 => {
            let talla_m = talla / 100.0;
            Some(peso / (talla_m * talla_m))
        }
        _ => None,
    };

    let grasa_corporal_kg = match (payload.peso_kg, payload.grasa_corporal_pct) {
        (Some(peso), Some(pct)) => Some(peso * pct / 100.0),
        _ => None,
    };

    let masa_muscular_kg = match (payload.peso_kg, payload.masa_muscular_pct) {
        (Some(peso), Some(pct)) => Some(peso * pct / 100.0),
        _ => None,
    };

    let indice_cintura_cadera = match (payload.circunferencia_abdominal_cm, payload.circunferencia_cadera_cm) {
        (Some(abdominal), Some(cadera)) if cadera > 0.0 => Some(abdominal / cadera),
        _ => None,
    };

    conn.execute(
        "INSERT INTO examen_fisico (
            id, organizacion_id, paciente_id, consulta_id, ta_sistolica, ta_diastolica, peso_kg, talla_cm, imc,
            grasa_corporal_pct, grasa_corporal_kg, masa_muscular_pct, masa_muscular_kg,
            circunferencia_abdominal_cm, circunferencia_cadera_cm, indice_cintura_cadera, circunferencia_cuello_cm,
            fuerza_mano_derecha_kg, fuerza_mano_izquierda_kg, fc, temperatura, frecuencia_respiratoria,
            saturacion_oxigeno_pct, notas, created_by
        ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25
        )",
        rusqlite::params![
            id,
            session.organizacion_id,
            payload.paciente_id,
            payload.consulta_id,
            payload.ta_sistolica,
            payload.ta_diastolica,
            payload.peso_kg,
            payload.talla_cm,
            imc,
            payload.grasa_corporal_pct,
            grasa_corporal_kg,
            payload.masa_muscular_pct,
            masa_muscular_kg,
            payload.circunferencia_abdominal_cm,
            payload.circunferencia_cadera_cm,
            indice_cintura_cadera,
            payload.circunferencia_cuello_cm,
            payload.fuerza_mano_derecha_kg,
            payload.fuerza_mano_izquierda_kg,
            payload.fc,
            payload.temperatura,
            payload.frecuencia_respiratoria,
            payload.saturacion_oxigeno_pct,
            payload.notas,
            session.usuario_id,
        ],
    )?;

    audit::registrar(&conn, Some(&session.usuario_id), "examen_fisico", &id, Accion::Insert, None::<&()>, Some(&payload))?;

    let sql = format!("{SELECT_EXAMEN_FISICO} WHERE id = ?1");
    conn.query_row(&sql, rusqlite::params![id], ExamenFisico::from_row).map_err(ErrorApp::from)
}
