use tauri::State;

use crate::db::DbPool;
use crate::error::{ErrorApp, Resultado};
use crate::models::{
    ConsultaAbierta, ContadoresNav, ConteoDiagnostico, ConteoSemana, Dashboard, PacienteSinControl, ResultadoReciente,
};
use crate::session::SessionState;
use crate::util::hoy_local;

/// Datos del panel de inicio que no salen de la agenda del día (esa la pide el frontend con `listar_citas`).
#[tauri::command]
pub fn obtener_dashboard(pool: State<DbPool>, session_state: State<SessionState>) -> Resultado<Dashboard> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;
    let org = &session.organizacion_id;
    let hoy = hoy_local();

    let mut stmt = conn.prepare(
        "SELECT c.id, c.paciente_id, (p.nombres || ' ' || p.apellidos) as paciente_nombre, c.fecha,
                (SELECT COUNT(*) FROM consulta_diagnostico cd WHERE cd.consulta_id = c.id AND cd.deleted_at IS NULL) as diagnosticos
         FROM consulta c JOIN paciente p ON p.id = c.paciente_id
         WHERE c.organizacion_id = ?1 AND c.deleted_at IS NULL AND c.estado = 'borrador'
         ORDER BY c.fecha",
    )?;
    let consultas_sin_cerrar = stmt
        .query_map(rusqlite::params![org], ConsultaAbierta::from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    let mut stmt = conn.prepare(
        "SELECT e.id as examen_id, e.paciente_id, (p.nombres || ' ' || p.apellidos) as paciente_nombre,
                COALESCE(t.nombre_mostrar, t.nombre) as nombre, e.valor, t.unidad, e.bandera, e.fecha_resultado
         FROM examen e
         JOIN paciente p ON p.id = e.paciente_id
         JOIN tipo_examen_catalogo t ON t.id = e.tipo_examen_id
         WHERE e.organizacion_id = ?1 AND e.deleted_at IS NULL AND e.fecha_resultado IS NOT NULL
           AND substr(e.fecha_resultado, 1, 10) >= date(?2, '-7 day')
         ORDER BY (e.bandera IN ('alto', 'bajo')) DESC, e.fecha_resultado DESC LIMIT 20",
    )?;
    let resultados_recientes = stmt
        .query_map(rusqlite::params![org, hoy], ResultadoReciente::from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    let mut stmt = conn.prepare(
        "SELECT p.id, (p.nombres || ' ' || p.apellidos) as nombre, MAX(c.fecha) as ultima_consulta
         FROM paciente p JOIN consulta c ON c.paciente_id = p.id AND c.deleted_at IS NULL
         WHERE p.organizacion_id = ?1 AND p.deleted_at IS NULL
         GROUP BY p.id HAVING substr(MAX(c.fecha), 1, 10) < date(?2, '-1 year')
         ORDER BY ultima_consulta LIMIT 50",
    )?;
    let pacientes_sin_control = stmt
        .query_map(rusqlite::params![org, hoy], PacienteSinControl::from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    // Semana = lunes a domingo; `semana_inicio` es el lunes.
    let mut stmt = conn.prepare(
        "SELECT date(substr(fecha, 1, 10), 'weekday 0', '-6 days') as semana_inicio, COUNT(*) as total
         FROM consulta
         WHERE organizacion_id = ?1 AND deleted_at IS NULL
           AND substr(fecha, 1, 10) >= date(?2, 'weekday 0', '-6 days', '-49 days')
         GROUP BY semana_inicio ORDER BY semana_inicio",
    )?;
    let consultas_por_semana = stmt
        .query_map(rusqlite::params![org, hoy], ConteoSemana::from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    let mut stmt = conn.prepare(
        "SELECT ec.nombre, COUNT(DISTINCT c.id) as total
         FROM consulta_diagnostico cd
         JOIN consulta c ON c.id = cd.consulta_id AND c.deleted_at IS NULL
         JOIN paciente_enfermedad pe ON pe.id = cd.paciente_enfermedad_id
         JOIN enfermedad_catalogo ec ON ec.id = pe.enfermedad_catalogo_id
         WHERE c.organizacion_id = ?1 AND cd.deleted_at IS NULL AND substr(c.fecha, 1, 7) = substr(?2, 1, 7)
         GROUP BY ec.id ORDER BY total DESC, ec.nombre LIMIT 5",
    )?;
    let diagnosticos_frecuentes = stmt
        .query_map(rusqlite::params![org, hoy], ConteoDiagnostico::from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    Ok(Dashboard {
        consultas_sin_cerrar,
        resultados_recientes,
        pacientes_sin_control,
        consultas_por_semana,
        diagnosticos_frecuentes,
    })
}

/// Contadores que se muestran junto a «Citas» y «Consultas» en la barra lateral.
#[tauri::command]
pub fn obtener_contadores_nav(pool: State<DbPool>, session_state: State<SessionState>) -> Resultado<ContadoresNav> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;
    let citas_hoy: i64 = conn.query_row(
        "SELECT COUNT(*) FROM cita WHERE organizacion_id = ?1 AND deleted_at IS NULL
           AND substr(fecha_hora, 1, 10) = ?2 AND estado != 'cancelada'",
        rusqlite::params![session.organizacion_id, hoy_local()],
        |r| r.get(0),
    )?;
    let consultas_sin_cerrar: i64 = conn.query_row(
        "SELECT COUNT(*) FROM consulta WHERE organizacion_id = ?1 AND deleted_at IS NULL AND estado = 'borrador'",
        rusqlite::params![session.organizacion_id],
        |r| r.get(0),
    )?;
    Ok(ContadoresNav { citas_hoy, consultas_sin_cerrar })
}
