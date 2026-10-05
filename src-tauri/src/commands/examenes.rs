use rusqlite::Connection;
use tauri::State;
use uuid::Uuid;

use crate::audit::{self, Accion};
use crate::db::DbPool;
use crate::error::{ErrorApp, Resultado};
use crate::models::{
    ActualizarResultadoExamenPayload, CreateExamenPayload, CreateExamenValorPayload, CreateTipoExamenCatalogoPayload,
    Examen, ExamenValor, TipoExamenCatalogo,
};
use crate::session::SessionState;

const SELECT_EXAMEN: &str = "
    SELECT e.id, e.paciente_id, e.consulta_id, e.tipo_examen_id, t.nombre as tipo_examen_nombre,
           t.categoria as tipo_examen_categoria, e.fecha_solicitud, e.fecha_resultado, e.estado, e.notas
    FROM examen e
    JOIN tipo_examen_catalogo t ON t.id = e.tipo_examen_id
";

fn buscar_examen_por_id(conn: &Connection, id: &str) -> Resultado<Examen> {
    let sql = format!("{SELECT_EXAMEN} WHERE e.id = ?1 AND e.deleted_at IS NULL");
    conn.query_row(&sql, rusqlite::params![id], Examen::from_row)
        .map_err(|_| ErrorApp::NoEncontrado("Examen no encontrado".into()))
}

#[tauri::command]
pub fn buscar_catalogo_tipos_examen(pool: State<DbPool>, query: String) -> Resultado<Vec<TipoExamenCatalogo>> {
    let conn = pool.get()?;
    let patron = format!("%{}%", query);
    let mut stmt = conn.prepare("SELECT id, nombre, categoria, codigo_loinc FROM tipo_examen_catalogo WHERE nombre LIKE ?1 ORDER BY nombre LIMIT 30")?;
    let items = stmt
        .query_map(rusqlite::params![patron], TipoExamenCatalogo::from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(items)
}

#[tauri::command]
pub fn crear_tipo_examen_catalogo(pool: State<DbPool>, payload: CreateTipoExamenCatalogoPayload) -> Resultado<TipoExamenCatalogo> {
    let conn = pool.get()?;
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO tipo_examen_catalogo (id, nombre, categoria, codigo_loinc) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![id, payload.nombre, payload.categoria, payload.codigo_loinc],
    )?;
    conn.query_row(
        "SELECT id, nombre, categoria, codigo_loinc FROM tipo_examen_catalogo WHERE id = ?1",
        rusqlite::params![id],
        TipoExamenCatalogo::from_row,
    )
    .map_err(ErrorApp::from)
}

#[tauri::command]
pub fn listar_examenes_paciente(pool: State<DbPool>, paciente_id: String) -> Resultado<Vec<Examen>> {
    let conn = pool.get()?;
    let sql = format!("{SELECT_EXAMEN} WHERE e.paciente_id = ?1 AND e.deleted_at IS NULL ORDER BY e.fecha_solicitud DESC");
    let mut stmt = conn.prepare(&sql)?;
    let items = stmt
        .query_map(rusqlite::params![paciente_id], Examen::from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(items)
}

#[tauri::command]
pub fn crear_examen(pool: State<DbPool>, session_state: State<SessionState>, payload: CreateExamenPayload) -> Resultado<Examen> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO examen (id, organizacion_id, paciente_id, consulta_id, tipo_examen_id, fecha_solicitud, estado, notas, created_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'solicitado', ?7, ?8)",
        rusqlite::params![
            id,
            session.organizacion_id,
            payload.paciente_id,
            payload.consulta_id,
            payload.tipo_examen_id,
            payload.fecha_solicitud,
            payload.notas,
            session.usuario_id,
        ],
    )?;

    audit::registrar(&conn, Some(&session.usuario_id), "examen", &id, Accion::Insert, None::<&()>, Some(&payload))?;

    buscar_examen_por_id(&conn, &id)
}

#[tauri::command]
pub fn actualizar_resultado_examen(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    id: String,
    payload: ActualizarResultadoExamenPayload,
) -> Resultado<Examen> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;

    let filas = conn.execute(
        "UPDATE examen SET fecha_resultado = ?1, estado = ?2, notas = ?3, updated_at = datetime('now'), updated_by = ?4
         WHERE id = ?5 AND deleted_at IS NULL",
        rusqlite::params![payload.fecha_resultado, payload.estado, payload.notas, session.usuario_id, id],
    )?;
    if filas == 0 {
        return Err(ErrorApp::NoEncontrado("Examen no encontrado".into()));
    }

    audit::registrar(&conn, Some(&session.usuario_id), "examen", &id, Accion::Update, None::<&()>, Some(&payload))?;

    buscar_examen_por_id(&conn, &id)
}

#[tauri::command]
pub fn listar_valores_examen(pool: State<DbPool>, examen_id: String) -> Resultado<Vec<ExamenValor>> {
    let conn = pool.get()?;
    let mut stmt = conn.prepare(
        "SELECT id, examen_id, analito, valor, unidad, rango_referencia, fuera_rango
         FROM examen_valor WHERE examen_id = ?1 AND deleted_at IS NULL ORDER BY analito",
    )?;
    let items = stmt
        .query_map(rusqlite::params![examen_id], ExamenValor::from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(items)
}

#[tauri::command]
pub fn agregar_valor_examen(pool: State<DbPool>, payload: CreateExamenValorPayload) -> Resultado<ExamenValor> {
    let conn = pool.get()?;
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO examen_valor (id, examen_id, analito, valor, unidad, rango_referencia, fuera_rango)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![
            id,
            payload.examen_id,
            payload.analito,
            payload.valor,
            payload.unidad,
            payload.rango_referencia,
            payload.fuera_rango,
        ],
    )?;

    conn.query_row(
        "SELECT id, examen_id, analito, valor, unidad, rango_referencia, fuera_rango FROM examen_valor WHERE id = ?1",
        rusqlite::params![id],
        ExamenValor::from_row,
    )
    .map_err(ErrorApp::from)
}
