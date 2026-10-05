use std::fs;

use rusqlite::Connection;
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_opener::OpenerExt;
use uuid::Uuid;

use crate::audit::{self, Accion};
use crate::db::DbPool;
use crate::error::{ErrorApp, Resultado};
use crate::models::{
    CreateEntregablePayload, DatosItem, Entregable, EntregableItem, GuardarPlantillaEntregablePayload, PlantillaEntregable,
};
use crate::pdf;
use crate::session::SessionState;

fn cargar_items(conn: &Connection, entregable_id: &str) -> rusqlite::Result<Vec<EntregableItem>> {
    let mut stmt = conn.prepare("SELECT id, orden, tipo_item, datos FROM entregable_item WHERE entregable_id = ?1 ORDER BY orden")?;
    let items = stmt
        .query_map(rusqlite::params![entregable_id], EntregableItem::from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(items)
}

fn buscar_por_id(conn: &Connection, id: &str) -> Resultado<Entregable> {
    let mut entregable = conn
        .query_row(
            "SELECT id, paciente_id, consulta_id, tipo, titulo, fecha_emision, archivo_pdf_path, hash_sha256
             FROM entregable WHERE id = ?1 AND deleted_at IS NULL",
            rusqlite::params![id],
            Entregable::from_row_sin_items,
        )
        .map_err(|_| ErrorApp::NoEncontrado("Entregable no encontrado".into()))?;
    entregable.items = cargar_items(conn, id)?;
    Ok(entregable)
}

fn obtener_o_crear_plantilla(conn: &Connection, organizacion_id: &str) -> Resultado<PlantillaEntregable> {
    let existente = conn
        .query_row(
            "SELECT id, nombre_consultorio, encabezado, pie_pagina FROM plantilla_entregable WHERE organizacion_id = ?1",
            rusqlite::params![organizacion_id],
            PlantillaEntregable::from_row,
        )
        .ok();

    if let Some(p) = existente {
        return Ok(p);
    }

    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO plantilla_entregable (id, organizacion_id) VALUES (?1, ?2)",
        rusqlite::params![id, organizacion_id],
    )?;
    Ok(PlantillaEntregable { id, nombre_consultorio: None, encabezado: None, pie_pagina: None })
}

#[tauri::command]
pub fn obtener_plantilla_entregable(pool: State<DbPool>, session_state: State<SessionState>) -> Resultado<PlantillaEntregable> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;
    obtener_o_crear_plantilla(&conn, &session.organizacion_id)
}

#[tauri::command]
pub fn guardar_plantilla_entregable(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    payload: GuardarPlantillaEntregablePayload,
) -> Resultado<PlantillaEntregable> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;
    let actual = obtener_o_crear_plantilla(&conn, &session.organizacion_id)?;

    conn.execute(
        "UPDATE plantilla_entregable SET nombre_consultorio = ?1, encabezado = ?2, pie_pagina = ?3, updated_at = datetime('now') WHERE id = ?4",
        rusqlite::params![payload.nombre_consultorio, payload.encabezado, payload.pie_pagina, actual.id],
    )?;

    Ok(PlantillaEntregable {
        id: actual.id,
        nombre_consultorio: payload.nombre_consultorio,
        encabezado: payload.encabezado,
        pie_pagina: payload.pie_pagina,
    })
}

#[tauri::command]
pub fn listar_entregables_paciente(pool: State<DbPool>, paciente_id: String) -> Resultado<Vec<Entregable>> {
    let conn = pool.get()?;
    let mut stmt = conn.prepare(
        "SELECT id, paciente_id, consulta_id, tipo, titulo, fecha_emision, archivo_pdf_path, hash_sha256
         FROM entregable WHERE paciente_id = ?1 AND deleted_at IS NULL ORDER BY fecha_emision DESC",
    )?;
    let mut items = stmt
        .query_map(rusqlite::params![paciente_id], Entregable::from_row_sin_items)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    for item in &mut items {
        item.items = cargar_items(&conn, &item.id)?;
    }
    Ok(items)
}

#[tauri::command]
pub fn crear_entregable(
    app: AppHandle,
    pool: State<DbPool>,
    session_state: State<SessionState>,
    payload: CreateEntregablePayload,
) -> Resultado<Entregable> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let mut conn = pool.get()?;

    let (paciente_nombres, paciente_apellidos, paciente_documento): (String, String, String) = conn
        .query_row(
            "SELECT nombres, apellidos, documento_identidad FROM paciente WHERE id = ?1",
            rusqlite::params![payload.paciente_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .map_err(|_| ErrorApp::NoEncontrado("Paciente no encontrado".into()))?;

    let plantilla = obtener_o_crear_plantilla(&conn, &session.organizacion_id)?;

    let id = Uuid::new_v4().to_string();
    let fecha = chrono::Local::now().format("%Y-%m-%d").to_string();

    let datos_items: Vec<DatosItem> = payload.items.iter().map(|i| i.datos.clone()).collect();
    let html = pdf::generar_html_entregable(
        &plantilla,
        &format!("{paciente_nombres} {paciente_apellidos}"),
        &paciente_documento,
        &fecha,
        &payload.tipo,
        &payload.titulo,
        &datos_items,
    );
    let pdf_bytes = pdf::generar_pdf(&html).map_err(ErrorApp::Interno)?;

    let mut hasher = Sha256::new();
    hasher.update(&pdf_bytes);
    let hash = format!("{:x}", hasher.finalize());

    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| ErrorApp::Interno(e.to_string()))?
        .join("entregables");
    fs::create_dir_all(&dir).map_err(|e| ErrorApp::Interno(e.to_string()))?;
    let ruta = dir.join(format!("{id}.pdf"));
    fs::write(&ruta, &pdf_bytes).map_err(|e| ErrorApp::Interno(e.to_string()))?;
    let ruta_str = ruta.to_string_lossy().to_string();

    let tx = conn.transaction()?;

    tx.execute(
        "INSERT INTO entregable (id, organizacion_id, paciente_id, consulta_id, plantilla_id, tipo, titulo, archivo_pdf_path, hash_sha256, created_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![
            id,
            session.organizacion_id,
            payload.paciente_id,
            payload.consulta_id,
            plantilla.id,
            payload.tipo,
            payload.titulo,
            ruta_str,
            hash,
            session.usuario_id,
        ],
    )?;

    for (idx, item) in payload.items.iter().enumerate() {
        let item_id = Uuid::new_v4().to_string();
        let datos_json = serde_json::to_string(&item.datos).map_err(|e| ErrorApp::Interno(e.to_string()))?;
        tx.execute(
            "INSERT INTO entregable_item (id, entregable_id, orden, tipo_item, datos) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![item_id, id, idx as i64, item.tipo_item, datos_json],
        )?;
    }

    audit::registrar(&tx, Some(&session.usuario_id), "entregable", &id, Accion::Insert, None::<&()>, Some(&payload))?;

    tx.commit()?;

    buscar_por_id(&conn, &id)
}

#[tauri::command]
pub fn abrir_entregable(app: AppHandle, pool: State<DbPool>, id: String) -> Resultado<()> {
    let conn = pool.get()?;
    let ruta: Option<String> = conn
        .query_row(
            "SELECT archivo_pdf_path FROM entregable WHERE id = ?1 AND deleted_at IS NULL",
            rusqlite::params![id],
            |r| r.get(0),
        )
        .map_err(|_| ErrorApp::NoEncontrado("Entregable no encontrado".into()))?;

    let ruta = ruta.ok_or_else(|| ErrorApp::Interno("Este entregable no tiene un archivo PDF asociado.".into()))?;
    app.opener()
        .open_path(ruta, None::<&str>)
        .map_err(|e| ErrorApp::Interno(e.to_string()))?;
    Ok(())
}
