use rusqlite::Connection;
use tauri::State;
use uuid::Uuid;

use crate::audit::{self, Accion};
use crate::db::DbPool;
use crate::error::{ErrorApp, Resultado};
use crate::models::{CreateMedicamentoCatalogoPayload, GuardarTratamientoPayload, MedicamentoCatalogo, Tratamiento, TratamientoMedicamento};
use crate::commands::consultas::exigir_borrador;
use crate::session::SessionState;

fn cargar_tratamiento(conn: &Connection, consulta_id: &str) -> Resultado<Option<Tratamiento>> {
    let tratamiento_id: Option<String> = conn
        .query_row(
            "SELECT id FROM tratamiento WHERE consulta_id = ?1 AND deleted_at IS NULL",
            rusqlite::params![consulta_id],
            |row| row.get(0),
        )
        .ok();

    let Some(tratamiento_id) = tratamiento_id else {
        return Ok(None);
    };

    let indicaciones_generales: Option<String> = conn.query_row(
        "SELECT indicaciones_generales FROM tratamiento WHERE id = ?1",
        rusqlite::params![tratamiento_id],
        |row| row.get(0),
    )?;

    let mut stmt = conn.prepare(
        "SELECT tm.id, tm.medicamento_id, mc.nombre_comercial as medicamento_nombre, mc.presentacion, mc.concentracion,
                mc.alergenos, tm.dosis, tm.frecuencia, tm.duracion, tm.via, tm.indicaciones
         FROM tratamiento_medicamento tm
         JOIN medicamento_catalogo mc ON mc.id = tm.medicamento_id
         WHERE tm.tratamiento_id = ?1 AND tm.deleted_at IS NULL",
    )?;
    let medicamentos = stmt
        .query_map(rusqlite::params![tratamiento_id], TratamientoMedicamento::from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    Ok(Some(Tratamiento {
        id: tratamiento_id,
        consulta_id: consulta_id.to_string(),
        indicaciones_generales,
        medicamentos,
    }))
}

#[tauri::command]
pub fn buscar_catalogo_medicamentos(pool: State<DbPool>, query: String) -> Resultado<Vec<MedicamentoCatalogo>> {
    let conn = pool.get()?;
    let patron = format!("%{}%", query);
    let mut stmt = conn.prepare(
        "SELECT id, nombre_comercial, principio_activo, presentacion, concentracion, alergenos FROM medicamento_catalogo
         WHERE activo = 1 AND (nombre_comercial LIKE ?1 OR principio_activo LIKE ?1) ORDER BY nombre_comercial LIMIT 30",
    )?;
    let items = stmt
        .query_map(rusqlite::params![patron], MedicamentoCatalogo::from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(items)
}

#[tauri::command]
pub fn crear_medicamento_catalogo(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    payload: CreateMedicamentoCatalogoPayload,
) -> Resultado<MedicamentoCatalogo> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO medicamento_catalogo (id, organizacion_id, nombre_comercial, principio_activo, presentacion, concentracion, activo)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1)",
        rusqlite::params![
            id,
            session.organizacion_id,
            payload.nombre_comercial,
            payload.principio_activo,
            payload.presentacion,
            payload.concentracion,
        ],
    )?;

    conn.query_row(
        "SELECT id, nombre_comercial, principio_activo, presentacion, concentracion, alergenos FROM medicamento_catalogo WHERE id = ?1",
        rusqlite::params![id],
        MedicamentoCatalogo::from_row,
    )
    .map_err(ErrorApp::from)
}

#[tauri::command]
pub fn obtener_tratamiento_por_consulta(pool: State<DbPool>, consulta_id: String) -> Resultado<Option<Tratamiento>> {
    let conn = pool.get()?;
    cargar_tratamiento(&conn, &consulta_id)
}

#[tauri::command]
pub fn guardar_tratamiento(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    payload: GuardarTratamientoPayload,
) -> Resultado<Tratamiento> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let mut conn = pool.get()?;
    exigir_borrador(&conn, &payload.consulta_id)?;
    let tx = conn.transaction()?;

    let tratamiento_id: Option<String> = tx
        .query_row(
            "SELECT id FROM tratamiento WHERE consulta_id = ?1 AND deleted_at IS NULL",
            rusqlite::params![payload.consulta_id],
            |row| row.get(0),
        )
        .ok();

    let tratamiento_id = match tratamiento_id {
        Some(id) => {
            tx.execute(
                "UPDATE tratamiento SET indicaciones_generales = ?1, updated_at = datetime('now'), updated_by = ?2 WHERE id = ?3",
                rusqlite::params![payload.indicaciones_generales, session.usuario_id, id],
            )?;
            id
        }
        None => {
            let id = Uuid::new_v4().to_string();
            tx.execute(
                "INSERT INTO tratamiento (id, organizacion_id, consulta_id, indicaciones_generales, created_by)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![id, session.organizacion_id, payload.consulta_id, payload.indicaciones_generales, session.usuario_id],
            )?;
            id
        }
    };

    tx.execute(
        "UPDATE tratamiento_medicamento SET deleted_at = datetime('now') WHERE tratamiento_id = ?1 AND deleted_at IS NULL",
        rusqlite::params![tratamiento_id],
    )?;

    for item in &payload.medicamentos {
        let item_id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO tratamiento_medicamento (id, tratamiento_id, medicamento_id, dosis, frecuencia, duracion, via, indicaciones)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![
                item_id,
                tratamiento_id,
                item.medicamento_id,
                item.dosis,
                item.frecuencia,
                item.duracion,
                item.via,
                item.indicaciones,
            ],
        )?;
    }

    audit::registrar(
        &tx,
        Some(&session.usuario_id),
        "tratamiento",
        &tratamiento_id,
        Accion::Update,
        None::<&()>,
        Some(&payload),
    )?;

    tx.commit()?;

    cargar_tratamiento(&conn, &payload.consulta_id)?.ok_or(ErrorApp::Interno("No se pudo cargar el tratamiento recién guardado".into()))
}
