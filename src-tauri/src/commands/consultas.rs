use rusqlite::Connection;
use tauri::State;
use uuid::Uuid;

use crate::audit::{self, Accion};
use crate::db::DbPool;
use crate::error::{ErrorApp, Resultado};
use crate::models::{
    Consulta, ConsultaDiagnostico, ConsultaSintoma, CreateConsultaDiagnosticoPayload, CreateSintomaPayload, ExamenSistema,
    GuardarConsultaPayload, GuardarExamenSistemaPayload, IniciarConsultaPayload, UpdateConsultaDiagnosticoPayload,
};
use crate::session::SessionState;
use crate::util::{ahora_local, hoy_local, limpiar};

const SELECT_CONSULTA: &str = "
    SELECT c.id, c.paciente_id, (p.nombres || ' ' || p.apellidos) as paciente_nombre, e.codigo as expediente_codigo,
           c.medico_id, u.nombre_completo as medico_nombre, c.cita_id, c.fecha, c.tipo_cita_id,
           tc.nombre as tipo_cita_nombre, c.motivo_consulta, c.enfermedad_actual, c.notas_medico, c.estado,
           c.cerrada_at, c.impresion_diagnostica, c.proximo_control, c.proximo_control_tipo_id,
           (SELECT ec.nombre FROM consulta_diagnostico cd
              JOIN paciente_enfermedad pe ON pe.id = cd.paciente_enfermedad_id
              JOIN enfermedad_catalogo ec ON ec.id = pe.enfermedad_catalogo_id
             WHERE cd.consulta_id = c.id AND cd.deleted_at IS NULL
             ORDER BY (cd.rol = 'principal') DESC, cd.created_at LIMIT 1) as diagnostico_principal
    FROM consulta c
    JOIN paciente p ON p.id = c.paciente_id
    JOIN expediente e ON e.paciente_id = p.id
    JOIN usuario u ON u.id = c.medico_id
    LEFT JOIN tipo_cita tc ON tc.id = c.tipo_cita_id
";

const SELECT_DIAGNOSTICO: &str = "
    SELECT cd.id, cd.consulta_id, cd.paciente_enfermedad_id, pe.enfermedad_catalogo_id, ec.nombre, ec.codigo,
           ec.version_cie as sistema, cd.tipo, cd.rol, cd.certeza, cd.nota, pe.activa
    FROM consulta_diagnostico cd
    JOIN paciente_enfermedad pe ON pe.id = cd.paciente_enfermedad_id
    JOIN enfermedad_catalogo ec ON ec.id = pe.enfermedad_catalogo_id
";

fn buscar_por_id(conn: &Connection, id: &str) -> Resultado<Consulta> {
    let sql = format!("{SELECT_CONSULTA} WHERE c.id = ?1 AND c.deleted_at IS NULL");
    conn.query_row(&sql, rusqlite::params![id], Consulta::from_row)
        .map_err(|_| ErrorApp::NoEncontrado("Consulta no encontrada".into()))
}

/// Las secciones de una consulta solo se pueden modificar mientras está en borrador.
/// Devuelve `(paciente_id, organizacion_id)` de la consulta.
pub fn exigir_borrador(conn: &Connection, consulta_id: &str) -> Resultado<(String, String)> {
    let (paciente_id, organizacion_id, estado): (String, String, String) = conn
        .query_row(
            "SELECT paciente_id, organizacion_id, estado FROM consulta WHERE id = ?1 AND deleted_at IS NULL",
            rusqlite::params![consulta_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .map_err(|_| ErrorApp::NoEncontrado("Consulta no encontrada".into()))?;
    if estado != "borrador" {
        return Err(ErrorApp::Validacion("La consulta ya está cerrada y no admite cambios.".into()));
    }
    Ok((paciente_id, organizacion_id))
}

#[tauri::command]
pub fn listar_consultas_por_paciente(pool: State<DbPool>, paciente_id: String) -> Resultado<Vec<Consulta>> {
    let conn = pool.get()?;
    let sql = format!("{SELECT_CONSULTA} WHERE c.paciente_id = ?1 AND c.deleted_at IS NULL ORDER BY c.fecha DESC");
    let mut stmt = conn.prepare(&sql)?;
    let consultas = stmt
        .query_map(rusqlite::params![paciente_id], Consulta::from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(consultas)
}

/// Consultas de la organización, las abiertas primero. `estado` filtra por `borrador` o `cerrada`.
#[tauri::command]
pub fn listar_consultas(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    estado: Option<String>,
) -> Resultado<Vec<Consulta>> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;
    let sql = format!(
        "{SELECT_CONSULTA} WHERE c.organizacion_id = ?1 AND c.deleted_at IS NULL AND (?2 IS NULL OR c.estado = ?2)
         ORDER BY (c.estado = 'borrador') DESC, c.fecha DESC LIMIT 300"
    );
    let mut stmt = conn.prepare(&sql)?;
    let consultas = stmt
        .query_map(rusqlite::params![session.organizacion_id, estado], Consulta::from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(consultas)
}

#[tauri::command]
pub fn obtener_consulta(pool: State<DbPool>, id: String) -> Resultado<Consulta> {
    let conn = pool.get()?;
    buscar_por_id(&conn, &id)
}

#[tauri::command]
pub fn obtener_consulta_por_cita(pool: State<DbPool>, cita_id: String) -> Resultado<Option<Consulta>> {
    let conn = pool.get()?;
    let sql = format!("{SELECT_CONSULTA} WHERE c.cita_id = ?1 AND c.deleted_at IS NULL ORDER BY c.fecha DESC LIMIT 1");
    let consulta = conn.query_row(&sql, rusqlite::params![cita_id], Consulta::from_row).ok();
    Ok(consulta)
}

/// Abre una consulta en borrador para el paciente. Si la cita ya tiene consulta, o el paciente
/// ya tiene un borrador abierto, devuelve esa en lugar de crear otra.
#[tauri::command]
pub fn iniciar_consulta(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    payload: IniciarConsultaPayload,
) -> Resultado<Consulta> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let mut conn = pool.get()?;

    let existente: Option<String> = match &payload.cita_id {
        Some(cita_id) => conn
            .query_row(
                "SELECT id FROM consulta WHERE cita_id = ?1 AND deleted_at IS NULL ORDER BY fecha DESC LIMIT 1",
                rusqlite::params![cita_id],
                |r| r.get(0),
            )
            .ok(),
        None => None,
    }
    .or_else(|| {
        conn.query_row(
            "SELECT id FROM consulta WHERE paciente_id = ?1 AND estado = 'borrador' AND deleted_at IS NULL
             ORDER BY fecha DESC LIMIT 1",
            rusqlite::params![payload.paciente_id],
            |r| r.get(0),
        )
        .ok()
    });
    if let Some(id) = existente {
        return buscar_por_id(&conn, &id);
    }

    // El motivo y el tipo de consulta arrancan con lo que se anotó al agendar la cita.
    let (motivo, tipo_cita_id): (String, Option<String>) = match &payload.cita_id {
        Some(cita_id) => conn
            .query_row(
                "SELECT motivo, tipo_cita_id FROM cita WHERE id = ?1 AND deleted_at IS NULL",
                rusqlite::params![cita_id],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .map_err(|_| ErrorApp::NoEncontrado("Cita no encontrada".into()))?,
        None => (String::new(), None),
    };

    let consulta_id = Uuid::new_v4().to_string();
    let tx = conn.transaction()?;

    tx.execute(
        "INSERT INTO consulta (id, organizacion_id, paciente_id, medico_id, cita_id, fecha, tipo_cita_id,
                               motivo_consulta, estado, created_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'borrador', ?4)",
        rusqlite::params![
            consulta_id,
            session.organizacion_id,
            payload.paciente_id,
            session.usuario_id,
            payload.cita_id,
            ahora_local(),
            tipo_cita_id,
            motivo,
        ],
    )?;

    if let Some(cita_id) = &payload.cita_id {
        tx.execute(
            "UPDATE cita SET estado = 'en_consulta', updated_at = datetime('now'), updated_by = ?1 WHERE id = ?2",
            rusqlite::params![session.usuario_id, cita_id],
        )?;
    }

    audit::registrar(
        &tx,
        Some(&session.usuario_id),
        "consulta",
        &consulta_id,
        Accion::Insert,
        None::<&()>,
        Some(&payload),
    )?;

    tx.commit()?;

    buscar_por_id(&conn, &consulta_id)
}

#[tauri::command]
pub fn guardar_consulta(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    id: String,
    payload: GuardarConsultaPayload,
) -> Resultado<Consulta> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;
    exigir_borrador(&conn, &id)?;

    let anterior = buscar_por_id(&conn, &id)?;

    conn.execute(
        "UPDATE consulta SET tipo_cita_id = ?1, motivo_consulta = ?2, enfermedad_actual = ?3, notas_medico = ?4,
             impresion_diagnostica = ?5, proximo_control = ?6, proximo_control_tipo_id = ?7,
             updated_at = datetime('now'), updated_by = ?8
         WHERE id = ?9 AND deleted_at IS NULL",
        rusqlite::params![
            payload.tipo_cita_id,
            payload.motivo_consulta.trim(),
            limpiar(payload.enfermedad_actual.clone()),
            limpiar(payload.notas_medico.clone()),
            limpiar(payload.impresion_diagnostica.clone()),
            limpiar(payload.proximo_control.clone()),
            payload.proximo_control_tipo_id,
            session.usuario_id,
            id,
        ],
    )?;

    audit::registrar(&conn, Some(&session.usuario_id), "consulta", &id, Accion::Update, Some(&anterior), Some(&payload))?;

    buscar_por_id(&conn, &id)
}

/// Cierra la consulta: exige motivo y al menos un diagnóstico, y marca la cita como atendida.
#[tauri::command]
pub fn cerrar_consulta(pool: State<DbPool>, session_state: State<SessionState>, id: String) -> Resultado<Consulta> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let mut conn = pool.get()?;
    exigir_borrador(&conn, &id)?;

    let consulta = buscar_por_id(&conn, &id)?;
    if consulta.motivo_consulta.trim().is_empty() {
        return Err(ErrorApp::Validacion("Falta el motivo de consulta.".into()));
    }
    let diagnosticos: i64 = conn.query_row(
        "SELECT COUNT(*) FROM consulta_diagnostico WHERE consulta_id = ?1 AND deleted_at IS NULL",
        rusqlite::params![id],
        |r| r.get(0),
    )?;
    if diagnosticos == 0 {
        return Err(ErrorApp::Validacion("Agregue al menos un diagnóstico antes de cerrar la consulta.".into()));
    }
    let borradores: i64 = conn.query_row(
        "SELECT COUNT(*) FROM entregable WHERE consulta_id = ?1 AND deleted_at IS NULL AND estado = 'borrador'",
        rusqlite::params![id],
        |r| r.get(0),
    )?;
    if borradores > 0 {
        return Err(ErrorApp::Validacion(format!(
            "Hay {borradores} entregable(s) en borrador: emítalos o descártelos antes de cerrar la consulta."
        )));
    }

    let tx = conn.transaction()?;
    tx.execute(
        "UPDATE consulta SET estado = 'cerrada', cerrada_at = ?1, updated_at = datetime('now'), updated_by = ?2 WHERE id = ?3",
        rusqlite::params![ahora_local(), session.usuario_id, id],
    )?;
    if let Some(cita_id) = &consulta.cita_id {
        tx.execute(
            "UPDATE cita SET estado = 'atendida', updated_at = datetime('now'), updated_by = ?1 WHERE id = ?2",
            rusqlite::params![session.usuario_id, cita_id],
        )?;
    }
    audit::registrar(&tx, Some(&session.usuario_id), "consulta", &id, Accion::Update, Some(&"borrador"), Some(&"cerrada"))?;
    tx.commit()?;

    buscar_por_id(&conn, &id)
}

// ==================== SÍNTOMAS ====================

#[tauri::command]
pub fn listar_sintomas_consulta(pool: State<DbPool>, consulta_id: String) -> Resultado<Vec<ConsultaSintoma>> {
    let conn = pool.get()?;
    let mut stmt = conn.prepare(
        "SELECT id, consulta_id, nombre, codigo_snomed, detalle FROM consulta_sintoma
         WHERE consulta_id = ?1 AND deleted_at IS NULL ORDER BY created_at",
    )?;
    let items = stmt
        .query_map(rusqlite::params![consulta_id], ConsultaSintoma::from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(items)
}

#[tauri::command]
pub fn agregar_sintoma_consulta(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    payload: CreateSintomaPayload,
) -> Resultado<ConsultaSintoma> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;
    exigir_borrador(&conn, &payload.consulta_id)?;
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO consulta_sintoma (id, organizacion_id, consulta_id, nombre, codigo_snomed, detalle, created_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![
            id,
            session.organizacion_id,
            payload.consulta_id,
            payload.nombre.trim(),
            payload.codigo_snomed,
            limpiar(payload.detalle.clone()),
            session.usuario_id,
        ],
    )?;

    audit::registrar(&conn, Some(&session.usuario_id), "consulta_sintoma", &id, Accion::Insert, None::<&()>, Some(&payload))?;

    conn.query_row(
        "SELECT id, consulta_id, nombre, codigo_snomed, detalle FROM consulta_sintoma WHERE id = ?1",
        rusqlite::params![id],
        ConsultaSintoma::from_row,
    )
    .map_err(ErrorApp::from)
}

#[tauri::command]
pub fn eliminar_sintoma_consulta(pool: State<DbPool>, session_state: State<SessionState>, id: String) -> Resultado<()> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;
    let consulta_id: String = conn
        .query_row("SELECT consulta_id FROM consulta_sintoma WHERE id = ?1 AND deleted_at IS NULL", rusqlite::params![id], |r| r.get(0))
        .map_err(|_| ErrorApp::NoEncontrado("Síntoma no encontrado".into()))?;
    exigir_borrador(&conn, &consulta_id)?;

    conn.execute(
        "UPDATE consulta_sintoma SET deleted_at = datetime('now'), deleted_by = ?1 WHERE id = ?2",
        rusqlite::params![session.usuario_id, id],
    )?;
    audit::registrar(&conn, Some(&session.usuario_id), "consulta_sintoma", &id, Accion::Delete, None::<&()>, None::<&()>)?;
    Ok(())
}

// ==================== EXAMEN POR APARATOS Y SISTEMAS ====================

/// Devuelve todos los sistemas activos del catálogo con lo registrado en la consulta.
#[tauri::command]
pub fn listar_examen_sistemas(pool: State<DbPool>, consulta_id: String) -> Resultado<Vec<ExamenSistema>> {
    let conn = pool.get()?;
    let mut stmt = conn.prepare(
        "SELECT s.id as sistema_id, s.nombre as sistema_nombre, s.texto_normal, es.estado, es.descripcion, es.codigo_snomed
         FROM sistema_corporal_catalogo s
         LEFT JOIN examen_sistema es ON es.sistema_id = s.id AND es.consulta_id = ?1
         WHERE s.activo = 1 OR es.id IS NOT NULL
         ORDER BY s.orden, s.nombre",
    )?;
    let items = stmt
        .query_map(rusqlite::params![consulta_id], ExamenSistema::from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(items)
}

#[tauri::command]
pub fn guardar_examen_sistema(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    payload: GuardarExamenSistemaPayload,
) -> Resultado<()> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;
    exigir_borrador(&conn, &payload.consulta_id)?;

    let registro_id = format!("{}:{}", payload.consulta_id, payload.sistema_id);
    match payload.estado.as_deref() {
        None => {
            conn.execute(
                "DELETE FROM examen_sistema WHERE consulta_id = ?1 AND sistema_id = ?2",
                rusqlite::params![payload.consulta_id, payload.sistema_id],
            )?;
            audit::registrar(&conn, Some(&session.usuario_id), "examen_sistema", &registro_id, Accion::Delete, None::<&()>, None::<&()>)?;
        }
        Some(estado) => {
            if estado != "normal" && estado != "hallazgos" {
                return Err(ErrorApp::Validacion(format!("Estado de examen inválido: {estado}")));
            }
            conn.execute(
                "INSERT INTO examen_sistema (id, organizacion_id, consulta_id, sistema_id, estado, descripcion, codigo_snomed, created_by)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
                 ON CONFLICT (consulta_id, sistema_id) DO UPDATE SET
                     estado = excluded.estado, descripcion = excluded.descripcion, codigo_snomed = excluded.codigo_snomed,
                     updated_at = datetime('now'), updated_by = excluded.created_by",
                rusqlite::params![
                    Uuid::new_v4().to_string(),
                    session.organizacion_id,
                    payload.consulta_id,
                    payload.sistema_id,
                    estado,
                    limpiar(payload.descripcion.clone()),
                    payload.codigo_snomed,
                    session.usuario_id,
                ],
            )?;
            audit::registrar(&conn, Some(&session.usuario_id), "examen_sistema", &registro_id, Accion::Update, None::<&()>, Some(&payload))?;
        }
    }
    Ok(())
}

// ==================== DIAGNÓSTICOS ====================

#[tauri::command]
pub fn listar_diagnosticos_consulta(pool: State<DbPool>, consulta_id: String) -> Resultado<Vec<ConsultaDiagnostico>> {
    let conn = pool.get()?;
    let sql = format!(
        "{SELECT_DIAGNOSTICO} WHERE cd.consulta_id = ?1 AND cd.deleted_at IS NULL ORDER BY (cd.rol = 'principal') DESC, cd.created_at"
    );
    let mut stmt = conn.prepare(&sql)?;
    let items = stmt
        .query_map(rusqlite::params![consulta_id], ConsultaDiagnostico::from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(items)
}

/// Agrega un diagnóstico a la consulta. Si el paciente ya tiene esa enfermedad activa se registra
/// como seguimiento; si no, se crea en su lista de enfermedades como diagnóstico nuevo.
#[tauri::command]
pub fn agregar_diagnostico_consulta(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    payload: CreateConsultaDiagnosticoPayload,
) -> Resultado<ConsultaDiagnostico> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let mut conn = pool.get()?;
    let (paciente_id, _) = exigir_borrador(&conn, &payload.consulta_id)?;

    let repetido: i64 = conn.query_row(
        "SELECT COUNT(*) FROM consulta_diagnostico cd
           JOIN paciente_enfermedad pe ON pe.id = cd.paciente_enfermedad_id
          WHERE cd.consulta_id = ?1 AND cd.deleted_at IS NULL AND pe.enfermedad_catalogo_id = ?2",
        rusqlite::params![payload.consulta_id, payload.enfermedad_catalogo_id],
        |r| r.get(0),
    )?;
    if repetido > 0 {
        return Err(ErrorApp::Validacion("Ese diagnóstico ya está en la consulta.".into()));
    }

    let tx = conn.transaction()?;

    let existente: Option<String> = tx
        .query_row(
            "SELECT id FROM paciente_enfermedad
              WHERE paciente_id = ?1 AND enfermedad_catalogo_id = ?2 AND activa = 1 AND deleted_at IS NULL LIMIT 1",
            rusqlite::params![paciente_id, payload.enfermedad_catalogo_id],
            |r| r.get(0),
        )
        .ok();
    let (paciente_enfermedad_id, tipo) = match existente {
        Some(id) => (id, "seguimiento"),
        None => {
            let id = Uuid::new_v4().to_string();
            tx.execute(
                "INSERT INTO paciente_enfermedad (id, organizacion_id, paciente_id, enfermedad_catalogo_id, activa, fecha_diagnostico, created_by)
                 VALUES (?1, ?2, ?3, ?4, 1, ?5, ?6)",
                rusqlite::params![id, session.organizacion_id, paciente_id, payload.enfermedad_catalogo_id, hoy_local(), session.usuario_id],
            )?;
            (id, "nuevo")
        }
    };

    // El primer diagnóstico de la consulta es el principal salvo que se indique otra cosa.
    let hay_principal: i64 = tx.query_row(
        "SELECT COUNT(*) FROM consulta_diagnostico WHERE consulta_id = ?1 AND deleted_at IS NULL AND rol = 'principal'",
        rusqlite::params![payload.consulta_id],
        |r| r.get(0),
    )?;
    let rol = payload.rol.clone().unwrap_or_else(|| if hay_principal == 0 { "principal".into() } else { "secundario".into() });
    if rol == "principal" {
        tx.execute(
            "UPDATE consulta_diagnostico SET rol = 'secundario' WHERE consulta_id = ?1 AND deleted_at IS NULL",
            rusqlite::params![payload.consulta_id],
        )?;
    }

    let id = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO consulta_diagnostico (id, consulta_id, paciente_enfermedad_id, tipo, rol, certeza, nota, created_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![
            id,
            payload.consulta_id,
            paciente_enfermedad_id,
            tipo,
            rol,
            payload.certeza.clone().unwrap_or_else(|| "definitivo".into()),
            limpiar(payload.nota.clone()),
            session.usuario_id,
        ],
    )?;

    audit::registrar(&tx, Some(&session.usuario_id), "consulta_diagnostico", &id, Accion::Insert, None::<&()>, Some(&payload))?;
    tx.commit()?;

    let sql = format!("{SELECT_DIAGNOSTICO} WHERE cd.id = ?1");
    conn.query_row(&sql, rusqlite::params![id], ConsultaDiagnostico::from_row).map_err(ErrorApp::from)
}

#[tauri::command]
pub fn actualizar_diagnostico_consulta(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    id: String,
    payload: UpdateConsultaDiagnosticoPayload,
) -> Resultado<ConsultaDiagnostico> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let mut conn = pool.get()?;
    let consulta_id: String = conn
        .query_row("SELECT consulta_id FROM consulta_diagnostico WHERE id = ?1 AND deleted_at IS NULL", rusqlite::params![id], |r| r.get(0))
        .map_err(|_| ErrorApp::NoEncontrado("Diagnóstico no encontrado".into()))?;
    exigir_borrador(&conn, &consulta_id)?;

    let tx = conn.transaction()?;
    if payload.rol == "principal" {
        tx.execute(
            "UPDATE consulta_diagnostico SET rol = 'secundario' WHERE consulta_id = ?1 AND deleted_at IS NULL",
            rusqlite::params![consulta_id],
        )?;
    }
    tx.execute(
        "UPDATE consulta_diagnostico SET rol = ?1, certeza = ?2, nota = ?3, updated_at = datetime('now'), updated_by = ?4 WHERE id = ?5",
        rusqlite::params![payload.rol, payload.certeza, limpiar(payload.nota.clone()), session.usuario_id, id],
    )?;
    audit::registrar(&tx, Some(&session.usuario_id), "consulta_diagnostico", &id, Accion::Update, None::<&()>, Some(&payload))?;
    tx.commit()?;

    let sql = format!("{SELECT_DIAGNOSTICO} WHERE cd.id = ?1");
    conn.query_row(&sql, rusqlite::params![id], ConsultaDiagnostico::from_row).map_err(ErrorApp::from)
}

#[tauri::command]
pub fn eliminar_diagnostico_consulta(pool: State<DbPool>, session_state: State<SessionState>, id: String) -> Resultado<()> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let mut conn = pool.get()?;
    let (consulta_id, paciente_enfermedad_id, tipo): (String, String, String) = conn
        .query_row(
            "SELECT consulta_id, paciente_enfermedad_id, tipo FROM consulta_diagnostico WHERE id = ?1 AND deleted_at IS NULL",
            rusqlite::params![id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .map_err(|_| ErrorApp::NoEncontrado("Diagnóstico no encontrado".into()))?;
    exigir_borrador(&conn, &consulta_id)?;

    let tx = conn.transaction()?;
    tx.execute(
        "UPDATE consulta_diagnostico SET deleted_at = datetime('now'), deleted_by = ?1 WHERE id = ?2",
        rusqlite::params![session.usuario_id, id],
    )?;
    // Si la enfermedad se creó con este diagnóstico, se retira también de la lista del paciente.
    if tipo == "nuevo" {
        tx.execute(
            "UPDATE paciente_enfermedad SET deleted_at = datetime('now'), deleted_by = ?1 WHERE id = ?2",
            rusqlite::params![session.usuario_id, paciente_enfermedad_id],
        )?;
    }
    audit::registrar(&tx, Some(&session.usuario_id), "consulta_diagnostico", &id, Accion::Delete, None::<&()>, None::<&()>)?;
    tx.commit()?;
    Ok(())
}
