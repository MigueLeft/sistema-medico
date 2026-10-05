use rusqlite::Connection;
use tauri::State;
use uuid::Uuid;

use crate::audit::{self, Accion};
use crate::db::DbPool;
use crate::error::{ErrorApp, Resultado};
use crate::models::{ComposicionCorporal, ComposicionCorporalSegmento, CreateComposicionCorporalPayload, SEGMENTOS};
use crate::session::SessionState;

const SELECT_COMPOSICION: &str = "
    SELECT id, paciente_id, consulta_id, fecha, altura_cm, peso_kg, imc, mb_kcal, masa_grasa_pct, masa_grasa_kg,
           masa_magra_kg, agua_total_kg, peso_ideal_kg, masa_grasa_ideal_kg, grasa_a_perder_kg, notas
    FROM composicion_corporal
";

const SELECT_SEGMENTOS: &str = "
    SELECT id, segmento, masa_grasa_pct, masa_grasa_kg, masa_magra_kg, masa_muscular_prevista_kg,
           masa_musculo_esqueletica_pct, masa_musculo_esqueletica_kg
    FROM composicion_corporal_segmento WHERE composicion_corporal_id = ?1
";

fn cargar_segmentos(conn: &Connection, composicion_id: &str) -> rusqlite::Result<Vec<ComposicionCorporalSegmento>> {
    let mut stmt = conn.prepare(SELECT_SEGMENTOS)?;
    let filas = stmt
        .query_map(rusqlite::params![composicion_id], ComposicionCorporalSegmento::from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(filas)
}

fn buscar_por_id(conn: &Connection, id: &str) -> Resultado<ComposicionCorporal> {
    let sql = format!("{SELECT_COMPOSICION} WHERE id = ?1 AND deleted_at IS NULL");
    let mut item = conn
        .query_row(&sql, rusqlite::params![id], ComposicionCorporal::from_row_sin_segmentos)
        .map_err(|_| ErrorApp::NoEncontrado("Composición corporal no encontrada".into()))?;
    item.segmentos = cargar_segmentos(conn, id)?;
    Ok(item)
}

#[tauri::command]
pub fn listar_composicion_corporal(pool: State<DbPool>, paciente_id: String) -> Resultado<Vec<ComposicionCorporal>> {
    let conn = pool.get()?;
    let sql = format!("{SELECT_COMPOSICION} WHERE paciente_id = ?1 AND deleted_at IS NULL ORDER BY fecha DESC");
    let mut stmt = conn.prepare(&sql)?;
    let mut items = stmt
        .query_map(rusqlite::params![paciente_id], ComposicionCorporal::from_row_sin_segmentos)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    for item in &mut items {
        item.segmentos = cargar_segmentos(&conn, &item.id)?;
    }
    Ok(items)
}

#[tauri::command]
pub fn crear_composicion_corporal(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    payload: CreateComposicionCorporalPayload,
) -> Resultado<ComposicionCorporal> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let mut conn = pool.get()?;
    let id = Uuid::new_v4().to_string();

    let masa_grasa_kg = match (payload.peso_kg, payload.masa_grasa_pct) {
        (Some(peso), Some(pct)) => Some(peso * pct / 100.0),
        _ => None,
    };
    let masa_magra_kg = match (payload.peso_kg, masa_grasa_kg) {
        (Some(peso), Some(grasa_kg)) => Some((peso - grasa_kg).max(0.0)),
        _ => None,
    };
    let grasa_a_perder_kg = match (masa_grasa_kg, payload.masa_grasa_ideal_kg) {
        (Some(grasa_kg), Some(grasa_ideal_kg)) => Some((grasa_kg - grasa_ideal_kg).max(0.0)),
        _ => None,
    };

    for seg in &payload.segmentos {
        if !SEGMENTOS.contains(&seg.segmento.as_str()) {
            return Err(ErrorApp::Validacion(format!("Segmento corporal inválido: {}", seg.segmento)));
        }
    }

    let tx = conn.transaction()?;

    tx.execute(
        "INSERT INTO composicion_corporal (
            id, organizacion_id, paciente_id, consulta_id, altura_cm, peso_kg, imc, mb_kcal,
            masa_grasa_pct, masa_grasa_kg, masa_magra_kg, agua_total_kg, peso_ideal_kg, masa_grasa_ideal_kg,
            grasa_a_perder_kg, notas, created_by
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
        rusqlite::params![
            id,
            session.organizacion_id,
            payload.paciente_id,
            payload.consulta_id,
            payload.altura_cm,
            payload.peso_kg,
            payload.imc,
            payload.mb_kcal,
            payload.masa_grasa_pct,
            masa_grasa_kg,
            masa_magra_kg,
            payload.agua_total_kg,
            payload.peso_ideal_kg,
            payload.masa_grasa_ideal_kg,
            grasa_a_perder_kg,
            payload.notas,
            session.usuario_id,
        ],
    )?;

    for seg in &payload.segmentos {
        let seg_id = Uuid::new_v4().to_string();
        let masa_musculo_esqueletica_kg = seg.masa_magra_kg.map(|magra| 0.566 * magra);
        tx.execute(
            "INSERT INTO composicion_corporal_segmento (
                id, composicion_corporal_id, segmento, masa_grasa_pct, masa_grasa_kg, masa_magra_kg,
                masa_muscular_prevista_kg, masa_musculo_esqueletica_pct, masa_musculo_esqueletica_kg
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            rusqlite::params![
                seg_id,
                id,
                seg.segmento,
                seg.masa_grasa_pct,
                seg.masa_grasa_kg,
                seg.masa_magra_kg,
                seg.masa_muscular_prevista_kg,
                seg.masa_musculo_esqueletica_pct,
                masa_musculo_esqueletica_kg,
            ],
        )?;
    }

    audit::registrar(&tx, Some(&session.usuario_id), "composicion_corporal", &id, Accion::Insert, None::<&()>, Some(&payload))?;

    tx.commit()?;

    buscar_por_id(&conn, &id)
}
