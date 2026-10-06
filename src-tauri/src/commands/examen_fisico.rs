use tauri::State;
use uuid::Uuid;

use crate::audit::{self, Accion};
use crate::db::DbPool;
use crate::error::{ErrorApp, Resultado};
use crate::models::{CreateExamenFisicoPayload, ExamenFisico};
use crate::commands::consultas::exigir_borrador;
use crate::session::SessionState;

const SELECT_EXAMEN_FISICO: &str = "
    SELECT id, paciente_id, consulta_id, fecha, ta_sistolica, ta_diastolica, peso_kg, talla_cm, imc,
           grasa_corporal_pct, grasa_corporal_kg, masa_magra_kg, masa_muscular_pct, masa_muscular_kg,
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
pub fn obtener_examen_fisico_consulta(pool: State<DbPool>, consulta_id: String) -> Resultado<Option<ExamenFisico>> {
    let conn = pool.get()?;
    let sql = format!("{SELECT_EXAMEN_FISICO} WHERE consulta_id = ?1 AND deleted_at IS NULL ORDER BY fecha DESC LIMIT 1");
    Ok(conn.query_row(&sql, rusqlite::params![consulta_id], ExamenFisico::from_row).ok())
}

/// Guarda las mediciones de la consulta: crea el examen físico la primera vez y lo actualiza después
/// (una consulta tiene un solo registro de mediciones). Los valores derivados se calculan aquí.
#[tauri::command]
pub fn guardar_examen_fisico(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    payload: CreateExamenFisicoPayload,
) -> Resultado<ExamenFisico> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;
    exigir_borrador(&conn, &payload.consulta_id)?;

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
    let masa_magra_kg = match (payload.peso_kg, grasa_corporal_kg) {
        (Some(peso), Some(grasa)) => Some(peso - grasa),
        _ => None,
    };
    // La masa muscular se registra directamente en kg; el porcentaje se deriva del peso.
    let masa_muscular_pct = match (payload.peso_kg, payload.masa_muscular_kg) {
        (Some(peso), Some(kg)) if peso > 0.0 => Some(kg / peso * 100.0),
        _ => payload.masa_muscular_pct,
    };
    let indice_cintura_cadera = match (payload.circunferencia_abdominal_cm, payload.circunferencia_cadera_cm) {
        (Some(abdominal), Some(cadera)) if cadera > 0.0 => Some(abdominal / cadera),
        _ => None,
    };

    let existente: Option<String> = conn
        .query_row(
            "SELECT id FROM examen_fisico WHERE consulta_id = ?1 AND deleted_at IS NULL ORDER BY fecha DESC LIMIT 1",
            rusqlite::params![payload.consulta_id],
            |r| r.get(0),
        )
        .ok();

    let (id, accion) = match existente {
        Some(id) => {
            conn.execute(
                "UPDATE examen_fisico SET ta_sistolica = ?1, ta_diastolica = ?2, peso_kg = ?3, talla_cm = ?4, imc = ?5,
                     grasa_corporal_pct = ?6, grasa_corporal_kg = ?7, masa_magra_kg = ?8, masa_muscular_pct = ?9,
                     masa_muscular_kg = ?10, circunferencia_abdominal_cm = ?11, circunferencia_cadera_cm = ?12,
                     indice_cintura_cadera = ?13, circunferencia_cuello_cm = ?14, fuerza_mano_derecha_kg = ?15,
                     fuerza_mano_izquierda_kg = ?16, fc = ?17, temperatura = ?18, frecuencia_respiratoria = ?19,
                     saturacion_oxigeno_pct = ?20, notas = ?21, updated_at = datetime('now'), updated_by = ?22
                 WHERE id = ?23",
                rusqlite::params![
                    payload.ta_sistolica,
                    payload.ta_diastolica,
                    payload.peso_kg,
                    payload.talla_cm,
                    imc,
                    payload.grasa_corporal_pct,
                    grasa_corporal_kg,
                    masa_magra_kg,
                    masa_muscular_pct,
                    payload.masa_muscular_kg,
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
                    id,
                ],
            )?;
            (id, Accion::Update)
        }
        None => {
            let id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO examen_fisico (
                    id, organizacion_id, paciente_id, consulta_id, ta_sistolica, ta_diastolica, peso_kg, talla_cm, imc,
                    grasa_corporal_pct, grasa_corporal_kg, masa_magra_kg, masa_muscular_pct, masa_muscular_kg,
                    circunferencia_abdominal_cm, circunferencia_cadera_cm, indice_cintura_cadera, circunferencia_cuello_cm,
                    fuerza_mano_derecha_kg, fuerza_mano_izquierda_kg, fc, temperatura, frecuencia_respiratoria,
                    saturacion_oxigeno_pct, notas, created_by
                ) VALUES (
                    ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23,
                    ?24, ?25, ?26
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
                    masa_magra_kg,
                    masa_muscular_pct,
                    payload.masa_muscular_kg,
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
            (id, Accion::Insert)
        }
    };

    audit::registrar(&conn, Some(&session.usuario_id), "examen_fisico", &id, accion, None::<&()>, Some(&payload))?;

    let sql = format!("{SELECT_EXAMEN_FISICO} WHERE id = ?1");
    conn.query_row(&sql, rusqlite::params![id], ExamenFisico::from_row).map_err(ErrorApp::from)
}
