use rusqlite::Connection;
use tauri::State;
use uuid::Uuid;

use crate::audit::{self, Accion};
use crate::commands::agenda::obtener_o_crear_configuracion;
use crate::db::DbPool;
use crate::error::{ErrorApp, Resultado};
use crate::models::{Cita, CreateCitaPayload, ReprogramarCitaPayload};
use crate::session::SessionState;

const SELECT_CITA: &str = "
    SELECT c.id, c.paciente_id, (p.nombres || ' ' || p.apellidos) as paciente_nombre,
           -- Inicial del primer nombre + primer apellido, para las vistas compactas de la agenda.
           (substr(p.nombres, 1, 1) || '. ' || CASE WHEN instr(p.apellidos, ' ') > 0
                THEN substr(p.apellidos, 1, instr(p.apellidos, ' ') - 1) ELSE p.apellidos END) as paciente_nombre_corto,
           p.documento_identidad as paciente_documento, p.telefono as paciente_telefono,
           p.fecha_nacimiento as paciente_fecha_nacimiento, e.codigo as expediente_codigo,
           c.medico_id, u.nombre_completo as medico_nombre, c.fecha_hora, c.duracion_min,
           c.tipo_cita_id, tc.nombre as tipo_cita_nombre, c.motivo, c.estado, c.enviar_recordatorio,
           (SELECT co.id FROM consulta co WHERE co.cita_id = c.id AND co.deleted_at IS NULL
             ORDER BY co.fecha DESC LIMIT 1) as consulta_id,
           (SELECT MAX(co.fecha) FROM consulta co WHERE co.paciente_id = c.paciente_id AND co.deleted_at IS NULL
             AND co.estado = 'cerrada') as ultima_consulta,
           (SELECT COUNT(*) FROM pendiente pe WHERE pe.paciente_id = c.paciente_id AND pe.deleted_at IS NULL
             AND pe.estado != 'entregado') as pendientes_abiertos
    FROM cita c
    JOIN paciente p ON p.id = c.paciente_id
    JOIN expediente e ON e.paciente_id = p.id
    JOIN usuario u ON u.id = c.medico_id
    LEFT JOIN tipo_cita tc ON tc.id = c.tipo_cita_id
";

const ESTADOS_VALIDOS: [&str; 8] = [
    "programada",
    "confirmada",
    "por_confirmar",
    "en_sala",
    "en_consulta",
    "atendida",
    "no_asistio",
    "cancelada",
];

fn buscar_por_id(conn: &Connection, id: &str) -> Resultado<Cita> {
    let sql = format!("{SELECT_CITA} WHERE c.id = ?1 AND c.deleted_at IS NULL");
    conn.query_row(&sql, rusqlite::params![id], Cita::from_row)
        .map_err(|_| ErrorApp::NoEncontrado("Cita no encontrada".into()))
}

/// Valida que la fecha no esté bloqueada ni caiga en un día sin atención.
fn validar_fecha(conn: &Connection, organizacion_id: &str, fecha_hora: &str) -> Resultado<()> {
    let fecha = fecha_hora.get(..10).ok_or_else(|| ErrorApp::Validacion("Fecha de cita inválida.".into()))?;

    let bloqueado: i64 = conn.query_row(
        "SELECT COUNT(*) FROM dia_bloqueado WHERE organizacion_id = ?1 AND fecha = ?2 AND deleted_at IS NULL",
        rusqlite::params![organizacion_id, fecha],
        |r| r.get(0),
    )?;
    if bloqueado > 0 {
        return Err(ErrorApp::Validacion("Ese día está bloqueado en la agenda.".into()));
    }

    let cfg = obtener_o_crear_configuracion(conn, organizacion_id)?;
    // strftime('%w') devuelve 0=domingo … 6=sábado; la configuración usa 1=lunes … 7=domingo.
    let dia_semana: i64 = conn.query_row(
        "SELECT CASE CAST(strftime('%w', ?1) AS INTEGER) WHEN 0 THEN 7 ELSE CAST(strftime('%w', ?1) AS INTEGER) END",
        rusqlite::params![fecha],
        |r| r.get(0),
    )?;
    if !cfg.dias_atencion.split(',').any(|d| d.trim() == dia_semana.to_string()) {
        return Err(ErrorApp::Validacion("Ese día no hay consulta según el horario configurado.".into()));
    }
    Ok(())
}

/// Condición SQL: la cita `c` ocupa espacio en la agenda (no está cancelada ni marcada como inasistencia).
const CITA_ACTIVA: &str = "c.deleted_at IS NULL AND c.estado NOT IN ('cancelada', 'no_asistio')";

/// Un sobrecupo es una cita que se solapa con otra del mismo día. Se rechaza si la agenda no los permite
/// o si el día ya alcanzó el máximo configurado. `excluir_id` es la cita que se está reprogramando.
fn validar_sobrecupo(
    conn: &Connection,
    organizacion_id: &str,
    fecha_hora: &str,
    duracion_min: i64,
    excluir_id: Option<&str>,
) -> Resultado<()> {
    let fecha = &fecha_hora[..10];
    // Minutos desde medianoche, para comparar intervalos [inicio, inicio + duración).
    let solapadas: i64 = conn.query_row(
        &format!(
            "SELECT COUNT(*) FROM cita c
              WHERE c.organizacion_id = ?1 AND substr(c.fecha_hora, 1, 10) = ?2 AND {CITA_ACTIVA}
                AND (?5 IS NULL OR c.id != ?5)
                AND (strftime('%s', c.fecha_hora) - strftime('%s', ?2)) / 60 < (strftime('%s', ?3) - strftime('%s', ?2)) / 60 + ?4
                AND (strftime('%s', c.fecha_hora) - strftime('%s', ?2)) / 60 + c.duracion_min > (strftime('%s', ?3) - strftime('%s', ?2)) / 60"
        ),
        rusqlite::params![organizacion_id, fecha, fecha_hora, duracion_min, excluir_id],
        |r| r.get(0),
    )?;
    if solapadas == 0 {
        return Ok(());
    }

    let cfg = obtener_o_crear_configuracion(conn, organizacion_id)?;
    if !cfg.permitir_sobrecupos {
        return Err(ErrorApp::Validacion("Ya hay una cita en ese horario y la agenda no permite sobrecupos.".into()));
    }
    // Sobrecupos ya existentes en el día: citas que se agendaron encima de otra creada antes.
    let sobrecupos: i64 = conn.query_row(
        &format!(
            "SELECT COUNT(*) FROM cita c
              WHERE c.organizacion_id = ?1 AND substr(c.fecha_hora, 1, 10) = ?2 AND {CITA_ACTIVA}
                AND (?3 IS NULL OR c.id != ?3)
                AND EXISTS (
                    SELECT 1 FROM cita o
                     WHERE o.organizacion_id = c.organizacion_id AND substr(o.fecha_hora, 1, 10) = ?2
                       AND o.deleted_at IS NULL AND o.estado NOT IN ('cancelada', 'no_asistio')
                       AND o.rowid < c.rowid AND (?3 IS NULL OR o.id != ?3)
                       AND CAST(strftime('%s', o.fecha_hora) AS INTEGER) < CAST(strftime('%s', c.fecha_hora) AS INTEGER) + c.duracion_min * 60
                       AND CAST(strftime('%s', o.fecha_hora) AS INTEGER) + o.duracion_min * 60 > CAST(strftime('%s', c.fecha_hora) AS INTEGER)
                )"
        ),
        rusqlite::params![organizacion_id, fecha, excluir_id],
        |r| r.get(0),
    )?;
    if sobrecupos >= cfg.max_sobrecupos {
        return Err(ErrorApp::Validacion(format!(
            "Ese horario ya está ocupado y el día alcanzó el máximo de {} sobrecupos.",
            cfg.max_sobrecupos
        )));
    }
    Ok(())
}

/// Lista las citas cuya fecha cae entre `desde` y `hasta` (`YYYY-MM-DD`, ambos inclusive).
#[tauri::command]
pub fn listar_citas(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    desde: String,
    hasta: String,
) -> Resultado<Vec<Cita>> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;
    let sql = format!(
        "{SELECT_CITA} WHERE c.organizacion_id = ?1 AND c.deleted_at IS NULL
         AND substr(c.fecha_hora, 1, 10) BETWEEN ?2 AND ?3 ORDER BY c.fecha_hora"
    );
    let mut stmt = conn.prepare(&sql)?;
    let citas = stmt
        .query_map(rusqlite::params![session.organizacion_id, desde, hasta], Cita::from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(citas)
}

#[tauri::command]
pub fn listar_citas_paciente(pool: State<DbPool>, paciente_id: String) -> Resultado<Vec<Cita>> {
    let conn = pool.get()?;
    let sql = format!("{SELECT_CITA} WHERE c.paciente_id = ?1 AND c.deleted_at IS NULL ORDER BY c.fecha_hora DESC");
    let mut stmt = conn.prepare(&sql)?;
    let citas = stmt
        .query_map(rusqlite::params![paciente_id], Cita::from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(citas)
}

#[tauri::command]
pub fn crear_cita(pool: State<DbPool>, session_state: State<SessionState>, payload: CreateCitaPayload) -> Resultado<Cita> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;
    validar_fecha(&conn, &session.organizacion_id, &payload.fecha_hora)?;

    let cfg = obtener_o_crear_configuracion(&conn, &session.organizacion_id)?;
    // La duración sale, en orden: del payload, del tipo de cita o del valor por defecto de la agenda.
    let duracion_tipo: Option<i64> = match &payload.tipo_cita_id {
        Some(tipo_id) => conn
            .query_row("SELECT duracion_min FROM tipo_cita WHERE id = ?1", rusqlite::params![tipo_id], |r| r.get(0))
            .ok(),
        None => None,
    };
    let duracion = payload.duracion_min.or(duracion_tipo).unwrap_or(cfg.duracion_defecto_min);
    validar_sobrecupo(&conn, &session.organizacion_id, &payload.fecha_hora, duracion, None)?;

    let cita_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO cita (id, organizacion_id, paciente_id, medico_id, fecha_hora, duracion_min, tipo_cita_id, motivo,
                           estado, enviar_recordatorio, created_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'programada', ?9, ?4)",
        rusqlite::params![
            cita_id,
            session.organizacion_id,
            payload.paciente_id,
            session.usuario_id,
            payload.fecha_hora,
            duracion,
            payload.tipo_cita_id,
            payload.motivo,
            payload.enviar_recordatorio,
        ],
    )?;

    audit::registrar(&conn, Some(&session.usuario_id), "cita", &cita_id, Accion::Insert, None::<&()>, Some(&payload))?;

    buscar_por_id(&conn, &cita_id)
}

#[tauri::command]
pub fn reprogramar_cita(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    id: String,
    payload: ReprogramarCitaPayload,
) -> Resultado<Cita> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;
    validar_fecha(&conn, &session.organizacion_id, &payload.fecha_hora)?;

    let anterior = buscar_por_id(&conn, &id)?;
    if anterior.estado == "atendida" || anterior.estado == "en_consulta" {
        return Err(ErrorApp::Validacion("No se puede reprogramar una cita que ya se está atendiendo o fue atendida.".into()));
    }
    let duracion = payload.duracion_min.unwrap_or(anterior.duracion_min);
    validar_sobrecupo(&conn, &session.organizacion_id, &payload.fecha_hora, duracion, Some(&id))?;

    conn.execute(
        "UPDATE cita SET fecha_hora = ?1, duracion_min = ?2, estado = 'programada',
             updated_at = datetime('now'), updated_by = ?3
         WHERE id = ?4 AND deleted_at IS NULL",
        rusqlite::params![payload.fecha_hora, duracion, session.usuario_id, id],
    )?;

    audit::registrar(
        &conn,
        Some(&session.usuario_id),
        "cita",
        &id,
        Accion::Update,
        Some(&anterior.fecha_hora),
        Some(&payload),
    )?;

    buscar_por_id(&conn, &id)
}

#[tauri::command]
pub fn cambiar_estado_cita(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    id: String,
    estado: String,
) -> Resultado<Cita> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    if !ESTADOS_VALIDOS.contains(&estado.as_str()) {
        return Err(ErrorApp::Validacion(format!("Estado de cita inválido: {estado}")));
    }
    let conn = pool.get()?;

    let anterior = buscar_por_id(&conn, &id)?;

    let filas = conn.execute(
        "UPDATE cita SET estado = ?1, updated_at = datetime('now'), updated_by = ?2 WHERE id = ?3 AND deleted_at IS NULL",
        rusqlite::params![estado, session.usuario_id, id],
    )?;
    if filas == 0 {
        return Err(ErrorApp::NoEncontrado("Cita no encontrada".into()));
    }

    audit::registrar(
        &conn,
        Some(&session.usuario_id),
        "cita",
        &id,
        Accion::Update,
        Some(&anterior.estado),
        Some(&estado),
    )?;

    buscar_por_id(&conn, &id)
}
