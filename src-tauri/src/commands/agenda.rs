use rusqlite::Connection;
use tauri::State;
use uuid::Uuid;

use crate::audit::{self, Accion};
use crate::db::DbPool;
use crate::error::{ErrorApp, Resultado};
use crate::models::{ConfiguracionAgenda, DiaBloqueado, GuardarConfiguracionAgendaPayload, GuardarTipoCitaPayload, TipoCita};
use crate::session::SessionState;

const MENSAJE_RECORDATORIO: &str = "Hola, [paciente]. Le recordamos su cita del [fecha] a las [hora] con [médico]. Responda 1 para confirmar o 2 para reprogramar.";

/// (nombre, duración en minutos, agendable por, activo)
const TIPOS_CITA_INICIALES: [(&str, i64, &str, bool); 5] = [
    ("Primera vez", 45, "recepcion", true),
    ("Control", 30, "recepcion", true),
    ("Resultados", 15, "recepcion", true),
    ("Procedimiento", 60, "medico", true),
    ("Teleconsulta", 30, "recepcion", false),
];

const SELECT_CONFIGURACION: &str = "
    SELECT id, dias_atencion, hora_inicio, hora_cierre, pausa_inicio, pausa_fin, duracion_defecto_min,
           permitir_sobrecupos, max_sobrecupos, recordatorio_anticipacion_h, recordatorio_canal,
           si_no_confirma, recordatorio_mensaje
    FROM configuracion_agenda WHERE organizacion_id = ?1
";

/// La configuración de agenda y los tipos de cita se crean con valores por defecto
/// la primera vez que la organización los consulta.
pub fn obtener_o_crear_configuracion(conn: &Connection, organizacion_id: &str) -> Resultado<ConfiguracionAgenda> {
    if let Ok(cfg) = conn.query_row(SELECT_CONFIGURACION, rusqlite::params![organizacion_id], ConfiguracionAgenda::from_row) {
        return Ok(cfg);
    }
    conn.execute(
        "INSERT INTO configuracion_agenda (id, organizacion_id, pausa_inicio, pausa_fin, recordatorio_mensaje)
         VALUES (?1, ?2, '12:00', '13:00', ?3)",
        rusqlite::params![Uuid::new_v4().to_string(), organizacion_id, MENSAJE_RECORDATORIO],
    )?;
    conn.query_row(SELECT_CONFIGURACION, rusqlite::params![organizacion_id], ConfiguracionAgenda::from_row)
        .map_err(ErrorApp::from)
}

pub fn asegurar_tipos_cita(conn: &Connection, organizacion_id: &str) -> Resultado<()> {
    let total: i64 = conn.query_row(
        "SELECT COUNT(*) FROM tipo_cita WHERE organizacion_id = ?1",
        rusqlite::params![organizacion_id],
        |r| r.get(0),
    )?;
    if total > 0 {
        return Ok(());
    }
    for (orden, (nombre, duracion, agendable_por, activo)) in TIPOS_CITA_INICIALES.iter().enumerate() {
        conn.execute(
            "INSERT INTO tipo_cita (id, organizacion_id, nombre, duracion_min, agendable_por, activo, orden)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![Uuid::new_v4().to_string(), organizacion_id, nombre, duracion, agendable_por, activo, orden as i64],
        )?;
    }
    Ok(())
}

#[tauri::command]
pub fn obtener_configuracion_agenda(pool: State<DbPool>, session_state: State<SessionState>) -> Resultado<ConfiguracionAgenda> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;
    obtener_o_crear_configuracion(&conn, &session.organizacion_id)
}

#[tauri::command]
pub fn guardar_configuracion_agenda(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    payload: GuardarConfiguracionAgendaPayload,
) -> Resultado<ConfiguracionAgenda> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    if payload.hora_inicio >= payload.hora_cierre {
        return Err(ErrorApp::Validacion("La hora de cierre debe ser posterior a la hora de inicio.".into()));
    }
    if payload.dias_atencion.trim().is_empty() {
        return Err(ErrorApp::Validacion("Seleccione al menos un día de atención.".into()));
    }
    let conn = pool.get()?;
    let anterior = obtener_o_crear_configuracion(&conn, &session.organizacion_id)?;

    conn.execute(
        "UPDATE configuracion_agenda SET dias_atencion = ?1, hora_inicio = ?2, hora_cierre = ?3, pausa_inicio = ?4,
             pausa_fin = ?5, duracion_defecto_min = ?6, permitir_sobrecupos = ?7, max_sobrecupos = ?8,
             recordatorio_anticipacion_h = ?9, recordatorio_canal = ?10, si_no_confirma = ?11, recordatorio_mensaje = ?12,
             updated_at = datetime('now'), updated_by = ?13
         WHERE organizacion_id = ?14",
        rusqlite::params![
            payload.dias_atencion,
            payload.hora_inicio,
            payload.hora_cierre,
            payload.pausa_inicio,
            payload.pausa_fin,
            payload.duracion_defecto_min,
            payload.permitir_sobrecupos,
            payload.max_sobrecupos,
            payload.recordatorio_anticipacion_h,
            payload.recordatorio_canal,
            payload.si_no_confirma,
            payload.recordatorio_mensaje,
            session.usuario_id,
            session.organizacion_id,
        ],
    )?;

    audit::registrar(
        &conn,
        Some(&session.usuario_id),
        "configuracion_agenda",
        &anterior.id,
        Accion::Update,
        Some(&anterior),
        Some(&payload),
    )?;

    obtener_o_crear_configuracion(&conn, &session.organizacion_id)
}

#[tauri::command]
pub fn listar_tipos_cita(pool: State<DbPool>, session_state: State<SessionState>) -> Resultado<Vec<TipoCita>> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;
    asegurar_tipos_cita(&conn, &session.organizacion_id)?;
    let mut stmt = conn.prepare(
        "SELECT id, nombre, duracion_min, agendable_por, activo, orden FROM tipo_cita
         WHERE organizacion_id = ?1 AND deleted_at IS NULL ORDER BY orden, nombre",
    )?;
    let items = stmt
        .query_map(rusqlite::params![session.organizacion_id], TipoCita::from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(items)
}

/// Crea el tipo de cita cuando `id` es `None`; si no, lo actualiza.
#[tauri::command]
pub fn guardar_tipo_cita(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    id: Option<String>,
    payload: GuardarTipoCitaPayload,
) -> Resultado<TipoCita> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    if payload.nombre.trim().is_empty() {
        return Err(ErrorApp::Validacion("El tipo de cita necesita un nombre.".into()));
    }
    if payload.duracion_min <= 0 {
        return Err(ErrorApp::Validacion("La duración debe ser mayor que cero.".into()));
    }
    let conn = pool.get()?;

    let (tipo_id, accion) = match id {
        Some(id) => {
            let filas = conn.execute(
                "UPDATE tipo_cita SET nombre = ?1, duracion_min = ?2, agendable_por = ?3, activo = ?4,
                     updated_at = datetime('now'), updated_by = ?5
                 WHERE id = ?6 AND organizacion_id = ?7 AND deleted_at IS NULL",
                rusqlite::params![
                    payload.nombre.trim(),
                    payload.duracion_min,
                    payload.agendable_por,
                    payload.activo,
                    session.usuario_id,
                    id,
                    session.organizacion_id,
                ],
            )?;
            if filas == 0 {
                return Err(ErrorApp::NoEncontrado("Tipo de cita no encontrado".into()));
            }
            (id, Accion::Update)
        }
        None => {
            let nuevo_id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO tipo_cita (id, organizacion_id, nombre, duracion_min, agendable_por, activo, orden, created_by)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6,
                         (SELECT COALESCE(MAX(orden), 0) + 1 FROM tipo_cita WHERE organizacion_id = ?2), ?7)",
                rusqlite::params![
                    nuevo_id,
                    session.organizacion_id,
                    payload.nombre.trim(),
                    payload.duracion_min,
                    payload.agendable_por,
                    payload.activo,
                    session.usuario_id,
                ],
            )?;
            (nuevo_id, Accion::Insert)
        }
    };

    audit::registrar(&conn, Some(&session.usuario_id), "tipo_cita", &tipo_id, accion, None::<&()>, Some(&payload))?;

    conn.query_row(
        "SELECT id, nombre, duracion_min, agendable_por, activo, orden FROM tipo_cita WHERE id = ?1",
        rusqlite::params![tipo_id],
        TipoCita::from_row,
    )
    .map_err(ErrorApp::from)
}

#[tauri::command]
pub fn listar_dias_bloqueados(pool: State<DbPool>, session_state: State<SessionState>) -> Resultado<Vec<DiaBloqueado>> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;
    let mut stmt = conn.prepare(
        "SELECT id, fecha, motivo FROM dia_bloqueado WHERE organizacion_id = ?1 AND deleted_at IS NULL ORDER BY fecha",
    )?;
    let items = stmt
        .query_map(rusqlite::params![session.organizacion_id], DiaBloqueado::from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(items)
}

#[tauri::command]
pub fn bloquear_dia(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    fecha: String,
    motivo: Option<String>,
) -> Resultado<DiaBloqueado> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;

    let existente: Option<String> = conn
        .query_row(
            "SELECT id FROM dia_bloqueado WHERE organizacion_id = ?1 AND fecha = ?2 AND deleted_at IS NULL",
            rusqlite::params![session.organizacion_id, fecha],
            |r| r.get(0),
        )
        .ok();
    let id = match existente {
        Some(id) => id,
        None => {
            let id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO dia_bloqueado (id, organizacion_id, fecha, motivo, created_by) VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![id, session.organizacion_id, fecha, motivo, session.usuario_id],
            )?;
            audit::registrar(&conn, Some(&session.usuario_id), "dia_bloqueado", &id, Accion::Insert, None::<&()>, Some(&fecha))?;
            id
        }
    };

    conn.query_row("SELECT id, fecha, motivo FROM dia_bloqueado WHERE id = ?1", rusqlite::params![id], DiaBloqueado::from_row)
        .map_err(ErrorApp::from)
}

#[tauri::command]
pub fn desbloquear_dia(pool: State<DbPool>, session_state: State<SessionState>, fecha: String) -> Resultado<()> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;
    conn.execute(
        "UPDATE dia_bloqueado SET deleted_at = datetime('now'), deleted_by = ?1
         WHERE organizacion_id = ?2 AND fecha = ?3 AND deleted_at IS NULL",
        rusqlite::params![session.usuario_id, session.organizacion_id, fecha],
    )?;
    audit::registrar(&conn, Some(&session.usuario_id), "dia_bloqueado", &fecha, Accion::Delete, None::<&()>, None::<&()>)?;
    Ok(())
}
