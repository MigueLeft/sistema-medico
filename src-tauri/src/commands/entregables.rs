use std::fs;
use std::path::PathBuf;

use rusqlite::Connection;
use serde_json::{json, Map, Value};
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_opener::OpenerExt;
use uuid::Uuid;

use crate::audit::{self, Accion};
use crate::commands::consultas::exigir_borrador;
use crate::db::DbPool;
use crate::error::{ErrorApp, Resultado};
use crate::models::{
    BloquePlantilla, CrearEntregablePayload, DatosItem, Entregable, EntregableItem, GuardarEntregablePayload,
    GuardarPlantillaDocumentoPayload, GuardarPlantillaEntregablePayload, PlantillaDocumento, PlantillaEntregable,
};
use crate::pdf::{self, ContextoDocumento};
use crate::session::SessionState;
use crate::util::{ahora_local, hoy_local};

// ==================== MEMBRETE ====================

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

// ==================== PLANTILLAS DE DOCUMENTO ====================

const SELECT_PLANTILLA: &str = "
    SELECT id, clave, nombre, prefijo, siguiente_numero, papel, bloques, genera_pendientes, pendiente_tipo,
           pendiente_cuantos, pendiente_texto, entrega_imprimir, entrega_whatsapp, entrega_correo, requiere_firma,
           activa, orden
    FROM plantilla_documento
";

fn bloque(clave: &str, titulo: &str, descripcion: &str, modo: &str) -> BloquePlantilla {
    BloquePlantilla { clave: clave.into(), titulo: titulo.into(), descripcion: Some(descripcion.into()), modo: modo.into() }
}

/// Bloques que el sistema sabe llenar solo. Cualquier otra clave es un bloque de texto de la plantilla.
fn bloque_automatico(clave: &str) -> BloquePlantilla {
    match clave {
        "membrete" => bloque(clave, "Membrete", "Configuración › Membrete e impresión", "automatico"),
        "datos_paciente" => bloque(clave, "Datos del paciente", "Nombre, C.I., edad, historia", "automatico"),
        "diagnostico" => bloque(clave, "Diagnóstico", "Diagnóstico principal de la consulta", "automatico"),
        "medicamentos" => bloque(clave, "Récipe", "Medicamentos del tratamiento y cantidad", "automatico"),
        "posologia" => bloque(clave, "Indicaciones", "Cómo tomar cada medicamento", "automatico"),
        "indicaciones_generales" => bloque(clave, "Generales", "Indicaciones generales del tratamiento", "automatico"),
        "pruebas" => bloque(clave, "Pruebas solicitadas", "Paraclínicos de la consulta", "automatico"),
        "preparacion" => bloque(clave, "Preparación", "Indicaciones de preparación", "automatico"),
        "resumen_clinico" => bloque(clave, "Resumen clínico", "Diagnósticos, tratamiento y signos vitales de la consulta", "automatico"),
        "firma" => bloque(clave, "Firma y sello", "Del médico que emite", "automatico"),
        _ => bloque("codigo_verificacion", "Código de verificación", "Número del documento", "automatico"),
    }
}

struct PlantillaInicial {
    clave: &'static str,
    nombre: &'static str,
    prefijo: &'static str,
    papel: &'static str,
    bloques: fn() -> Vec<BloquePlantilla>,
    /// (tipo, cuántos, texto) cuando el documento genera pendientes.
    pendientes: Option<(&'static str, &'static str, Option<&'static str>)>,
}

const PLANTILLAS_INICIALES: [PlantillaInicial; 7] = [
    PlantillaInicial {
        clave: "recipe",
        nombre: "Récipe",
        prefijo: "REC-",
        papel: "media_carta",
        bloques: || ["membrete", "datos_paciente", "medicamentos", "posologia", "indicaciones_generales", "firma"].map(bloque_automatico).to_vec(),
        pendientes: None,
    },
    PlantillaInicial {
        clave: "orden_lab",
        nombre: "Orden de laboratorio",
        prefijo: "LAB-",
        papel: "carta",
        bloques: || ["membrete", "datos_paciente", "diagnostico", "pruebas", "preparacion", "firma", "codigo_verificacion"].map(bloque_automatico).to_vec(),
        pendientes: Some(("paraclinico", "uno_por_item", None)),
    },
    PlantillaInicial {
        clave: "orden_imagen",
        nombre: "Orden de imagen",
        prefijo: "IMG-",
        papel: "carta",
        bloques: || {
            let mut b = ["membrete", "datos_paciente", "diagnostico", "pruebas"].map(bloque_automatico).to_vec();
            b.push(bloque("indicacion_clinica", "Indicación clínica", "Texto libre", "texto"));
            b.extend(["preparacion", "firma", "codigo_verificacion"].map(bloque_automatico));
            b
        },
        pendientes: Some(("paraclinico", "uno_por_item", None)),
    },
    PlantillaInicial {
        clave: "referencia",
        nombre: "Referencia a especialista",
        prefijo: "REF-",
        papel: "carta",
        bloques: || {
            let mut b = ["membrete", "datos_paciente"].map(bloque_automatico).to_vec();
            b.push(bloque("especialidad", "Especialidad destino", "Lista de especialidades", "texto"));
            b.push(bloque("motivo", "Motivo de referencia", "Texto libre", "texto"));
            b.extend(["resumen_clinico", "firma", "codigo_verificacion"].map(bloque_automatico));
            b
        },
        pendientes: Some(("documento", "uno_por_documento", Some("Informe de {especialidad}"))),
    },
    PlantillaInicial {
        clave: "indicaciones",
        nombre: "Indicaciones",
        prefijo: "IND-",
        papel: "media_carta",
        bloques: || {
            let mut b = ["membrete", "datos_paciente", "indicaciones_generales"].map(bloque_automatico).to_vec();
            b.push(bloque("cuidados", "Cuidados y recomendaciones", "Texto libre", "texto"));
            b.push(bloque_automatico("firma"));
            b
        },
        pendientes: None,
    },
    PlantillaInicial {
        clave: "informe",
        nombre: "Informe médico",
        prefijo: "INF-",
        papel: "carta",
        bloques: || {
            let mut b = ["membrete", "datos_paciente", "resumen_clinico"].map(bloque_automatico).to_vec();
            b.push(bloque("conclusiones", "Conclusiones y recomendaciones", "Texto libre", "texto"));
            b.push(bloque_automatico("firma"));
            b
        },
        pendientes: None,
    },
    PlantillaInicial {
        clave: "constancia",
        nombre: "Constancia o reposo",
        prefijo: "CON-",
        papel: "media_carta",
        bloques: || {
            let mut b = ["membrete", "datos_paciente"].map(bloque_automatico).to_vec();
            b.push(bloque("contenido", "Se hace constar", "Asistencia a consulta, reposo laboral…", "texto"));
            b.push(bloque_automatico("firma"));
            b
        },
        pendientes: None,
    },
];

/// Crea las plantillas iniciales la primera vez que la organización las consulta.
fn asegurar_plantillas(conn: &Connection, organizacion_id: &str) -> Resultado<()> {
    let total: i64 = conn.query_row(
        "SELECT COUNT(*) FROM plantilla_documento WHERE organizacion_id = ?1",
        rusqlite::params![organizacion_id],
        |r| r.get(0),
    )?;
    if total > 0 {
        return Ok(());
    }
    for (orden, p) in PLANTILLAS_INICIALES.iter().enumerate() {
        let (tipo, cuantos, texto) = p.pendientes.unwrap_or(("documento", "uno_por_documento", None));
        let bloques = serde_json::to_string(&(p.bloques)()).map_err(|e| ErrorApp::Interno(e.to_string()))?;
        conn.execute(
            "INSERT INTO plantilla_documento (id, organizacion_id, clave, nombre, prefijo, papel, bloques, genera_pendientes,
                                              pendiente_tipo, pendiente_cuantos, pendiente_texto, orden)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            rusqlite::params![
                Uuid::new_v4().to_string(),
                organizacion_id,
                p.clave,
                p.nombre,
                p.prefijo,
                p.papel,
                bloques,
                p.pendientes.is_some(),
                tipo,
                cuantos,
                texto,
                orden as i64,
            ],
        )?;
    }
    Ok(())
}

pub(crate) fn buscar_plantilla(conn: &Connection, id: &str) -> Resultado<PlantillaDocumento> {
    let sql = format!("{SELECT_PLANTILLA} WHERE id = ?1 AND deleted_at IS NULL");
    conn.query_row(&sql, rusqlite::params![id], PlantillaDocumento::from_row)
        .map_err(|_| ErrorApp::NoEncontrado("Plantilla no encontrada".into()))
}

#[tauri::command]
pub fn listar_plantillas_documento(pool: State<DbPool>, session_state: State<SessionState>) -> Resultado<Vec<PlantillaDocumento>> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;
    asegurar_plantillas(&conn, &session.organizacion_id)?;
    let sql = format!("{SELECT_PLANTILLA} WHERE organizacion_id = ?1 AND deleted_at IS NULL ORDER BY orden, nombre");
    let mut stmt = conn.prepare(&sql)?;
    let items = stmt
        .query_map(rusqlite::params![session.organizacion_id], PlantillaDocumento::from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(items)
}

/// Crea la plantilla cuando `id` es `None` (queda con clave `otro`); si no, la actualiza.
#[tauri::command]
pub fn guardar_plantilla_documento(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    id: Option<String>,
    payload: GuardarPlantillaDocumentoPayload,
) -> Resultado<PlantillaDocumento> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let nombre = payload.nombre.trim();
    let prefijo = payload.prefijo.trim().to_uppercase();
    if nombre.is_empty() {
        return Err(ErrorApp::Validacion("La plantilla necesita un nombre.".into()));
    }
    if prefijo.is_empty() || prefijo.len() > 8 {
        return Err(ErrorApp::Validacion("El prefijo de numeración debe tener entre 1 y 8 caracteres.".into()));
    }
    if payload.bloques.is_empty() {
        return Err(ErrorApp::Validacion("La plantilla necesita al menos un bloque.".into()));
    }
    if !["carta", "media_carta"].contains(&payload.papel.as_str())
        || !["paraclinico", "documento", "registro"].contains(&payload.pendiente_tipo.as_str())
        || !["uno_por_documento", "uno_por_item"].contains(&payload.pendiente_cuantos.as_str())
    {
        return Err(ErrorApp::Validacion("La plantilla tiene un valor no permitido.".into()));
    }
    let conn = pool.get()?;
    asegurar_plantillas(&conn, &session.organizacion_id)?;

    let repetido: i64 = conn.query_row(
        "SELECT COUNT(*) FROM plantilla_documento
          WHERE organizacion_id = ?1 AND deleted_at IS NULL AND prefijo = ?2 AND (?3 IS NULL OR id != ?3)",
        rusqlite::params![session.organizacion_id, prefijo, id],
        |r| r.get(0),
    )?;
    if repetido > 0 {
        return Err(ErrorApp::Validacion(format!("Ya existe otra plantilla con el prefijo {prefijo}.")));
    }

    let bloques = serde_json::to_string(&payload.bloques).map_err(|e| ErrorApp::Interno(e.to_string()))?;
    let (plantilla_id, accion) = match id {
        Some(id) => {
            let filas = conn.execute(
                "UPDATE plantilla_documento SET nombre = ?1, prefijo = ?2, papel = ?3, bloques = ?4, genera_pendientes = ?5,
                     pendiente_tipo = ?6, pendiente_cuantos = ?7, pendiente_texto = ?8, entrega_imprimir = ?9,
                     entrega_whatsapp = ?10, entrega_correo = ?11, requiere_firma = ?12, activa = ?13,
                     updated_at = datetime('now'), updated_by = ?14
                 WHERE id = ?15 AND organizacion_id = ?16 AND deleted_at IS NULL",
                rusqlite::params![
                    nombre,
                    prefijo,
                    payload.papel,
                    bloques,
                    payload.genera_pendientes,
                    payload.pendiente_tipo,
                    payload.pendiente_cuantos,
                    payload.pendiente_texto,
                    payload.entrega_imprimir,
                    payload.entrega_whatsapp,
                    payload.entrega_correo,
                    payload.requiere_firma,
                    payload.activa,
                    session.usuario_id,
                    id,
                    session.organizacion_id,
                ],
            )?;
            if filas == 0 {
                return Err(ErrorApp::NoEncontrado("Plantilla no encontrada".into()));
            }
            (id, Accion::Update)
        }
        None => {
            let nuevo_id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO plantilla_documento (id, organizacion_id, clave, nombre, prefijo, papel, bloques, genera_pendientes,
                                                  pendiente_tipo, pendiente_cuantos, pendiente_texto, entrega_imprimir,
                                                  entrega_whatsapp, entrega_correo, requiere_firma, activa, orden, created_by)
                 VALUES (?1, ?2, 'otro', ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15,
                         (SELECT COALESCE(MAX(orden), 0) + 1 FROM plantilla_documento WHERE organizacion_id = ?2), ?16)",
                rusqlite::params![
                    nuevo_id,
                    session.organizacion_id,
                    nombre,
                    prefijo,
                    payload.papel,
                    bloques,
                    payload.genera_pendientes,
                    payload.pendiente_tipo,
                    payload.pendiente_cuantos,
                    payload.pendiente_texto,
                    payload.entrega_imprimir,
                    payload.entrega_whatsapp,
                    payload.entrega_correo,
                    payload.requiere_firma,
                    payload.activa,
                    session.usuario_id,
                ],
            )?;
            (nuevo_id, Accion::Insert)
        }
    };

    audit::registrar(&conn, Some(&session.usuario_id), "plantilla_documento", &plantilla_id, accion, None::<&()>, Some(&payload))?;

    buscar_plantilla(&conn, &plantilla_id)
}

// ==================== ENTREGABLES ====================

const SELECT_ENTREGABLE: &str = "
    SELECT e.id, e.paciente_id, e.consulta_id, e.plantilla_documento_id, e.tipo, pd.nombre as plantilla_nombre, pd.papel,
           e.numero, e.estado, e.titulo, e.fecha_emision, e.emitido_at, (e.archivo_pdf_path IS NOT NULL) as tiene_pdf,
           e.hash_sha256, e.datos,
           (SELECT COUNT(*) FROM pendiente pe WHERE pe.entregable_id = e.id AND pe.deleted_at IS NULL) as pendientes_generados
    FROM entregable e
    LEFT JOIN plantilla_documento pd ON pd.id = e.plantilla_documento_id
";

fn cargar_items(conn: &Connection, entregable_id: &str) -> rusqlite::Result<Vec<EntregableItem>> {
    let mut stmt = conn.prepare("SELECT id, orden, tipo_item, datos FROM entregable_item WHERE entregable_id = ?1 ORDER BY orden")?;
    let items = stmt
        .query_map(rusqlite::params![entregable_id], EntregableItem::from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(items)
}

fn buscar_por_id(conn: &Connection, id: &str) -> Resultado<Entregable> {
    let sql = format!("{SELECT_ENTREGABLE} WHERE e.id = ?1 AND e.deleted_at IS NULL");
    let mut entregable = conn
        .query_row(&sql, rusqlite::params![id], Entregable::from_row_sin_items)
        .map_err(|_| ErrorApp::NoEncontrado("Entregable no encontrado".into()))?;
    entregable.items = cargar_items(conn, id)?;
    Ok(entregable)
}

fn listar(conn: &Connection, condicion: &str, valor: &str) -> Resultado<Vec<Entregable>> {
    let sql = format!("{SELECT_ENTREGABLE} WHERE {condicion} = ?1 AND e.deleted_at IS NULL ORDER BY e.created_at DESC");
    let mut stmt = conn.prepare(&sql)?;
    let mut items = stmt
        .query_map(rusqlite::params![valor], Entregable::from_row_sin_items)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    for item in &mut items {
        item.items = cargar_items(conn, &item.id)?;
    }
    Ok(items)
}

fn reemplazar_items(conn: &Connection, entregable_id: &str, items: &[(String, DatosItem)]) -> Resultado<()> {
    conn.execute("DELETE FROM entregable_item WHERE entregable_id = ?1", rusqlite::params![entregable_id])?;
    for (idx, (tipo_item, datos)) in items.iter().enumerate() {
        let datos_json = serde_json::to_string(datos).map_err(|e| ErrorApp::Interno(e.to_string()))?;
        conn.execute(
            "INSERT INTO entregable_item (id, entregable_id, orden, tipo_item, datos) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![Uuid::new_v4().to_string(), entregable_id, idx as i64, tipo_item, datos_json],
        )?;
    }
    Ok(())
}

#[tauri::command]
pub fn listar_entregables_paciente(pool: State<DbPool>, paciente_id: String) -> Resultado<Vec<Entregable>> {
    let conn = pool.get()?;
    listar(&conn, "e.paciente_id", &paciente_id)
}

#[tauri::command]
pub fn listar_entregables_consulta(pool: State<DbPool>, consulta_id: String) -> Resultado<Vec<Entregable>> {
    let conn = pool.get()?;
    listar(&conn, "e.consulta_id", &consulta_id)
}

#[tauri::command]
pub fn obtener_entregable(pool: State<DbPool>, id: String) -> Resultado<Entregable> {
    let conn = pool.get()?;
    buscar_por_id(&conn, &id)
}

/// Contenido con el que arranca un borrador, tomado de lo ya registrado en la consulta.
fn contenido_inicial(conn: &Connection, consulta_id: &str, plantilla: &PlantillaDocumento) -> Resultado<(Value, Vec<(String, DatosItem)>)> {
    let tiene = |clave: &str| plantilla.bloques.iter().any(|b| b.clave == clave);
    let mut datos = Map::new();
    datos.insert("textos".into(), json!({}));
    datos.insert("generarPendientes".into(), json!(plantilla.genera_pendientes));
    let mut items: Vec<(String, DatosItem)> = Vec::new();

    let (motivo, enfermedad_actual, impresion): (String, Option<String>, Option<String>) = conn.query_row(
        "SELECT motivo_consulta, enfermedad_actual, impresion_diagnostica FROM consulta WHERE id = ?1",
        rusqlite::params![consulta_id],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
    )?;

    let mut stmt = conn.prepare(
        "SELECT ec.nombre, ec.codigo, ec.version_cie FROM consulta_diagnostico cd
           JOIN paciente_enfermedad pe ON pe.id = cd.paciente_enfermedad_id
           JOIN enfermedad_catalogo ec ON ec.id = pe.enfermedad_catalogo_id
          WHERE cd.consulta_id = ?1 AND cd.deleted_at IS NULL ORDER BY (cd.rol = 'principal') DESC, cd.created_at",
    )?;
    let diagnosticos: Vec<String> = stmt
        .query_map(rusqlite::params![consulta_id], |r| {
            let (nombre, codigo, sistema): (String, String, String) = (r.get(0)?, r.get(1)?, r.get(2)?);
            Ok(if sistema == "SCT" { format!("{nombre} (SNOMED CT {codigo})") } else { nombre })
        })?
        .collect::<rusqlite::Result<_>>()?;

    let indicaciones_generales: Option<String> = conn
        .query_row(
            "SELECT indicaciones_generales FROM tratamiento WHERE consulta_id = ?1 AND deleted_at IS NULL",
            rusqlite::params![consulta_id],
            |r| r.get(0),
        )
        .ok()
        .flatten();

    let mut stmt = conn.prepare(
        "SELECT mc.id, mc.principio_activo, mc.presentacion, mc.concentracion, tm.dosis, tm.frecuencia, tm.duracion, tm.via, tm.indicaciones
           FROM tratamiento_medicamento tm
           JOIN tratamiento t ON t.id = tm.tratamiento_id AND t.deleted_at IS NULL
           JOIN medicamento_catalogo mc ON mc.id = tm.medicamento_id
          WHERE t.consulta_id = ?1 AND tm.deleted_at IS NULL ORDER BY tm.created_at, tm.rowid",
    )?;
    let medicamentos: Vec<DatosItem> = stmt
        .query_map(rusqlite::params![consulta_id], |r| {
            let partes: [Option<String>; 3] = [Some(r.get(1)?), r.get(2)?, r.get(3)?];
            Ok(DatosItem {
                nombre: Some(partes.into_iter().flatten().collect::<Vec<_>>().join(" ")),
                dosis: r.get(4)?,
                frecuencia: r.get(5)?,
                duracion: r.get(6)?,
                via: r.get(7)?,
                indicaciones: r.get(8)?,
                referencia_id: Some(r.get(0)?),
                incluido: Some(true),
                ..Default::default()
            })
        })?
        .collect::<rusqlite::Result<_>>()?;

    if tiene("diagnostico") {
        datos.insert("diagnostico".into(), json!(diagnosticos.first().cloned().unwrap_or_default()));
    }
    if tiene("indicaciones_generales") {
        datos.insert("indicacionesGenerales".into(), json!(indicaciones_generales.clone().unwrap_or_default()));
        datos.insert("incluirIndicaciones".into(), json!(true));
    }
    if tiene("medicamentos") || tiene("posologia") {
        datos.insert("vigenciaDias".into(), json!(30));
        items.extend(medicamentos.iter().cloned().map(|m| ("medicamento".to_string(), m)));
    }
    if tiene("pruebas") {
        // Las órdenes de imagen toman los estudios de imagenología; el resto, los de laboratorio.
        let es_imagen = plantilla.clave == "orden_imagen";
        let mut stmt = conn.prepare(
            "SELECT t.id, t.nombre, t.codigo_loinc, t.categoria, e.indicacion FROM examen e
               JOIN tipo_examen_catalogo t ON t.id = e.tipo_examen_id
              WHERE e.consulta_id = ?1 AND e.deleted_at IS NULL AND (t.categoria = 'imagenologia') = ?2
              ORDER BY e.created_at, e.rowid",
        )?;
        let mut preparaciones: Vec<String> = Vec::new();
        let pruebas: Vec<DatosItem> = stmt
            .query_map(rusqlite::params![consulta_id, es_imagen], |r| {
                Ok((
                    DatosItem { nombre: Some(r.get(1)?), codigo: r.get(2)?, categoria: Some(r.get(3)?), referencia_id: Some(r.get(0)?), incluido: Some(true), ..Default::default() },
                    r.get::<_, Option<String>>(4)?,
                ))
            })?
            .collect::<rusqlite::Result<Vec<_>>>()?
            .into_iter()
            .map(|(item, indicacion)| {
                if let Some(i) = indicacion.filter(|i| !preparaciones.contains(i)) {
                    preparaciones.push(i);
                }
                item
            })
            .collect();
        items.extend(pruebas.into_iter().map(|p| ("examen".to_string(), p)));
        datos.insert("prioridad".into(), json!("Rutina"));
        datos.insert("preparacion".into(), json!(preparaciones.join(". ")));
    }
    if tiene("resumen_clinico") {
        let mut lineas: Vec<String> = Vec::new();
        if !motivo.trim().is_empty() {
            lineas.push(format!("Motivo de consulta: {}", motivo.trim()));
        }
        if let Some(texto) = enfermedad_actual.filter(|t| !t.trim().is_empty()) {
            lineas.push(format!("Enfermedad actual: {}", texto.trim()));
        }
        if !diagnosticos.is_empty() {
            lineas.push(format!("Diagnósticos: {}.", diagnosticos.join("; ")));
        }
        if let Some(texto) = impresion.filter(|t| !t.trim().is_empty()) {
            lineas.push(format!("Impresión diagnóstica: {}", texto.trim()));
        }
        let signos: Option<(Option<i64>, Option<i64>, Option<i64>, Option<f64>, Option<f64>)> = conn
            .query_row(
                "SELECT ta_sistolica, ta_diastolica, fc, peso_kg, imc FROM examen_fisico
                  WHERE consulta_id = ?1 AND deleted_at IS NULL ORDER BY fecha DESC LIMIT 1",
                rusqlite::params![consulta_id],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?)),
            )
            .ok();
        if let Some((pas, pad, fc, peso, imc)) = signos {
            let partes: Vec<String> = [
                pas.zip(pad).map(|(s, d)| format!("PA {s}/{d} mmHg")),
                fc.map(|v| format!("FC {v} lpm")),
                peso.map(|v| format!("peso {v:.1} kg")),
                imc.map(|v| format!("IMC {v:.1}")),
            ]
            .into_iter()
            .flatten()
            .collect();
            if !partes.is_empty() {
                lineas.push(format!("Signos vitales: {}.", partes.join(", ")));
            }
        }
        if !medicamentos.is_empty() {
            let nombres: Vec<String> = medicamentos.iter().filter_map(|m| m.nombre.clone()).collect();
            lineas.push(format!("Tratamiento: {}.", nombres.join("; ")));
        }
        datos.insert("resumen".into(), json!(lineas.join("\n")));
    }

    Ok((Value::Object(datos), items))
}

/// Crea un entregable en borrador a partir de una plantilla, con su número ya reservado
/// y el contenido precargado desde la consulta.
#[tauri::command]
pub fn crear_entregable(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    payload: CrearEntregablePayload,
) -> Resultado<Entregable> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let mut conn = pool.get()?;
    let (paciente_id, _) = exigir_borrador(&conn, &payload.consulta_id)?;
    let plantilla = buscar_plantilla(&conn, &payload.plantilla_documento_id)?;
    if !plantilla.activa {
        return Err(ErrorApp::Validacion("Esa plantilla está inactiva.".into()));
    }
    let (datos, items) = contenido_inicial(&conn, &payload.consulta_id, &plantilla)?;

    let id = Uuid::new_v4().to_string();
    let numero = format!("{}{:06}", plantilla.prefijo, plantilla.siguiente_numero);
    let membrete = obtener_o_crear_plantilla(&conn, &session.organizacion_id)?;

    let tx = conn.transaction()?;
    tx.execute(
        "UPDATE plantilla_documento SET siguiente_numero = siguiente_numero + 1 WHERE id = ?1",
        rusqlite::params![plantilla.id],
    )?;
    tx.execute(
        "INSERT INTO entregable (id, organizacion_id, paciente_id, consulta_id, plantilla_id, plantilla_documento_id, tipo,
                                 titulo, numero, estado, datos, fecha_emision, created_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'borrador', ?10, ?11, ?12)",
        rusqlite::params![
            id,
            session.organizacion_id,
            paciente_id,
            payload.consulta_id,
            membrete.id,
            plantilla.id,
            plantilla.clave,
            plantilla.nombre,
            numero,
            datos.to_string(),
            hoy_local(),
            session.usuario_id,
        ],
    )?;
    reemplazar_items(&tx, &id, &items)?;
    audit::registrar(&tx, Some(&session.usuario_id), "entregable", &id, Accion::Insert, None::<&()>, Some(&payload))?;
    tx.commit()?;

    buscar_por_id(&conn, &id)
}

fn exigir_entregable_borrador(conn: &Connection, id: &str) -> Resultado<Entregable> {
    let entregable = buscar_por_id(conn, id)?;
    if entregable.estado != "borrador" {
        return Err(ErrorApp::Validacion("El documento ya fue emitido y no admite cambios.".into()));
    }
    Ok(entregable)
}

#[tauri::command]
pub fn guardar_entregable(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    id: String,
    payload: GuardarEntregablePayload,
) -> Resultado<Entregable> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let mut conn = pool.get()?;
    exigir_entregable_borrador(&conn, &id)?;
    if !payload.datos.is_object() {
        return Err(ErrorApp::Validacion("Los datos del documento no tienen el formato esperado.".into()));
    }

    let items: Vec<(String, DatosItem)> = payload.items.iter().map(|i| (i.tipo_item.clone(), i.datos.clone())).collect();
    let tx = conn.transaction()?;
    tx.execute(
        "UPDATE entregable SET datos = ?1, updated_at = datetime('now'), updated_by = ?2 WHERE id = ?3",
        rusqlite::params![payload.datos.to_string(), session.usuario_id, id],
    )?;
    reemplazar_items(&tx, &id, &items)?;
    audit::registrar(&tx, Some(&session.usuario_id), "entregable", &id, Accion::Update, None::<&()>, Some(&payload))?;
    tx.commit()?;

    buscar_por_id(&conn, &id)
}

/// Descarta un borrador. Los documentos emitidos no se eliminan.
#[tauri::command]
pub fn eliminar_entregable(pool: State<DbPool>, session_state: State<SessionState>, id: String) -> Resultado<()> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;
    exigir_entregable_borrador(&conn, &id)?;
    conn.execute(
        "UPDATE entregable SET deleted_at = datetime('now'), deleted_by = ?1 WHERE id = ?2",
        rusqlite::params![session.usuario_id, id],
    )?;
    audit::registrar(&conn, Some(&session.usuario_id), "entregable", &id, Accion::Delete, None::<&()>, None::<&()>)?;
    Ok(())
}

/// Genera el PDF del entregable con su plantilla.
pub(crate) fn renderizar(conn: &Connection, organizacion_id: &str, entregable: &Entregable, plantilla: &PlantillaDocumento) -> Resultado<Vec<u8>> {
    let membrete = obtener_o_crear_plantilla(conn, organizacion_id)?;
    let (nombre, documento, sexo, edad, historia): (String, String, String, i64, String) = conn
        .query_row(
            "SELECT (p.nombres || ' ' || p.apellidos), p.documento_identidad, p.sexo,
                    CAST((julianday('now', 'localtime') - julianday(p.fecha_nacimiento)) / 365.25 AS INTEGER), e.codigo
               FROM paciente p JOIN expediente e ON e.paciente_id = p.id WHERE p.id = ?1",
            rusqlite::params![entregable.paciente_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?)),
        )
        .map_err(|_| ErrorApp::NoEncontrado("Paciente no encontrado".into()))?;
    let (medico, especialidad, colegiatura): (String, Option<String>, Option<String>) = conn.query_row(
        "SELECT u.nombre_completo, pm.especialidad, pm.colegiatura
           FROM consulta c JOIN usuario u ON u.id = c.medico_id LEFT JOIN perfil_medico pm ON pm.usuario_id = u.id
          WHERE c.id = ?1",
        rusqlite::params![entregable.consulta_id],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
    )?;
    let detalle = [especialidad, colegiatura.map(|c| format!("Colegiatura {c}"))]
        .into_iter()
        .flatten()
        .filter(|t| !t.trim().is_empty())
        .collect::<Vec<_>>()
        .join(" · ");
    // fecha_emision se guarda como aaaa-mm-dd.
    let fecha = match entregable.fecha_emision.get(..10).map(|f| f.split('-').collect::<Vec<_>>()) {
        Some(p) if p.len() == 3 => format!("{}/{}/{}", p[2], p[1], p[0]),
        _ => entregable.fecha_emision.clone(),
    };
    let items: Vec<DatosItem> = entregable.items.iter().map(|i| i.datos.clone()).filter(DatosItem::esta_incluido).collect();

    let html = pdf::generar_html_documento(&ContextoDocumento {
        membrete: &membrete,
        titulo: &plantilla.nombre,
        clave: &plantilla.clave,
        bloques: &plantilla.bloques,
        numero: entregable.numero.as_deref().unwrap_or(""),
        fecha: &fecha,
        paciente_nombre: &nombre,
        paciente_documento: &documento,
        paciente_edad: edad,
        paciente_sexo: if sexo == "femenino" { "Femenino" } else if sexo == "masculino" { "Masculino" } else { "Otro" },
        paciente_historia: &historia,
        medico_nombre: &medico,
        medico_detalle: &detalle,
        datos: &entregable.datos,
        items: &items,
    });
    pdf::generar_pdf(&html, &plantilla.papel).map_err(ErrorApp::Interno)
}

fn directorio_entregables(app: &AppHandle) -> Resultado<PathBuf> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| ErrorApp::Interno(e.to_string()))?
        .join("entregables");
    fs::create_dir_all(&dir).map_err(|e| ErrorApp::Interno(e.to_string()))?;
    Ok(dir)
}

/// Texto del pendiente de un documento: sustituye `{clave}` por el texto del bloque con esa clave.
fn texto_pendiente(plantilla: &PlantillaDocumento, datos: &Value) -> String {
    let mut texto = plantilla.pendiente_texto.clone().filter(|t| !t.trim().is_empty()).unwrap_or_else(|| plantilla.nombre.clone());
    if let Some(textos) = datos.get("textos").and_then(Value::as_object) {
        for (clave, valor) in textos {
            texto = texto.replace(&format!("{{{clave}}}"), valor.as_str().unwrap_or("").trim());
        }
    }
    // Marcadores sin valor: se quitan junto con la preposición que los precede («Informe de {x}» -> «Informe»).
    while let (Some(i), Some(j)) = (texto.find('{'), texto.find('}')) {
        if j < i {
            break;
        }
        let antes = texto[..i].trim_end().trim_end_matches(" de").trim_end_matches(" del").to_string();
        texto = format!("{antes}{}", &texto[j + 1..]);
    }
    texto.trim().to_string()
}

/// Crea los pendientes que el documento deja al paciente, según la plantilla. Devuelve cuántos creó.
/// En las órdenes, cada prueba queda además como paraclínico solicitado de la consulta para registrar su resultado.
pub fn generar_pendientes(conn: &Connection, usuario_id: &str, organizacion_id: &str, entregable: &Entregable, plantilla: &PlantillaDocumento) -> Resultado<usize> {
    let activado = entregable.datos.get("generarPendientes").and_then(Value::as_bool).unwrap_or(plantilla.genera_pendientes);
    if !plantilla.genera_pendientes || !activado {
        return Ok(0);
    }
    let insertar = |nombre: &str, codigo: Option<&str>, examen_id: Option<&str>| -> Resultado<()> {
        conn.execute(
            "INSERT INTO pendiente (id, organizacion_id, paciente_id, consulta_origen_id, examen_id, entregable_id, tipo, nombre, codigo_loinc, created_by)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            rusqlite::params![
                Uuid::new_v4().to_string(),
                organizacion_id,
                entregable.paciente_id,
                entregable.consulta_id,
                examen_id,
                entregable.id,
                plantilla.pendiente_tipo,
                nombre,
                codigo,
                usuario_id,
            ],
        )?;
        Ok(())
    };

    if plantilla.pendiente_cuantos != "uno_por_item" {
        insertar(&texto_pendiente(plantilla, &entregable.datos), None, None)?;
        return Ok(1);
    }

    let mut creados = 0;
    for item in entregable.items.iter().filter(|i| i.datos.esta_incluido()) {
        let Some(nombre) = item.datos.nombre.as_deref().map(str::trim).filter(|n| !n.is_empty()) else { continue };
        let mut nombre_pendiente = nombre.to_string();
        let mut examen_id: Option<String> = None;
        if let (true, Some(tipo_examen_id)) = (item.tipo_item == "examen", item.datos.referencia_id.as_deref()) {
            if let Ok(mostrar) = conn.query_row(
                "SELECT COALESCE(nombre_mostrar, nombre) FROM tipo_examen_catalogo WHERE id = ?1",
                rusqlite::params![tipo_examen_id],
                |r| r.get::<_, String>(0),
            ) {
                nombre_pendiente = mostrar;
                examen_id = conn
                    .query_row(
                        "SELECT id FROM examen WHERE consulta_id = ?1 AND tipo_examen_id = ?2 AND deleted_at IS NULL LIMIT 1",
                        rusqlite::params![entregable.consulta_id, tipo_examen_id],
                        |r| r.get(0),
                    )
                    .ok();
                if examen_id.is_none() {
                    let nuevo = Uuid::new_v4().to_string();
                    conn.execute(
                        "INSERT INTO examen (id, organizacion_id, paciente_id, consulta_id, tipo_examen_id, fecha_solicitud, estado, created_by)
                         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'solicitado', ?7)",
                        rusqlite::params![nuevo, organizacion_id, entregable.paciente_id, entregable.consulta_id, tipo_examen_id, hoy_local(), usuario_id],
                    )?;
                    examen_id = Some(nuevo);
                }
            }
        }
        insertar(&nombre_pendiente, item.datos.codigo.as_deref(), examen_id.as_deref())?;
        creados += 1;
    }
    Ok(creados)
}

/// Emite el documento: genera el PDF definitivo, lo deja de solo lectura y crea los pendientes de su plantilla.
#[tauri::command]
pub fn emitir_entregable(app: AppHandle, pool: State<DbPool>, session_state: State<SessionState>, id: String) -> Resultado<Entregable> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let mut conn = pool.get()?;
    let entregable = exigir_entregable_borrador(&conn, &id)?;
    let plantilla_id = entregable.plantilla_documento_id.clone().ok_or_else(|| ErrorApp::Interno("El documento no tiene plantilla.".into()))?;
    let plantilla = buscar_plantilla(&conn, &plantilla_id)?;

    let con_items = plantilla.bloques.iter().any(|b| ["medicamentos", "posologia", "pruebas"].contains(&b.clave.as_str()));
    if con_items && !entregable.items.iter().any(|i| i.datos.esta_incluido()) {
        return Err(ErrorApp::Validacion("El documento no tiene ningún elemento incluido.".into()));
    }

    let pdf_bytes = renderizar(&conn, &session.organizacion_id, &entregable, &plantilla)?;
    let mut hasher = Sha256::new();
    hasher.update(&pdf_bytes);
    let hash = format!("{:x}", hasher.finalize());
    let ruta = directorio_entregables(&app)?.join(format!("{id}.pdf"));
    fs::write(&ruta, &pdf_bytes).map_err(|e| ErrorApp::Interno(e.to_string()))?;

    let tx = conn.transaction()?;
    tx.execute(
        "UPDATE entregable SET estado = 'emitido', emitido_at = ?1, archivo_pdf_path = ?2, hash_sha256 = ?3,
             updated_at = datetime('now'), updated_by = ?4
         WHERE id = ?5",
        rusqlite::params![ahora_local(), ruta.to_string_lossy().to_string(), hash, session.usuario_id, id],
    )?;
    generar_pendientes(&tx, &session.usuario_id, &session.organizacion_id, &entregable, &plantilla)?;
    audit::registrar(&tx, Some(&session.usuario_id), "entregable", &id, Accion::Update, Some(&"borrador"), Some(&"emitido"))?;
    tx.commit()?;

    buscar_por_id(&conn, &id)
}

/// Abre el PDF del documento en el visor del sistema (para leerlo o imprimirlo).
/// De un borrador genera una vista previa que no queda registrada como emitida.
#[tauri::command]
pub fn abrir_entregable(app: AppHandle, pool: State<DbPool>, session_state: State<SessionState>, id: String) -> Resultado<()> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let conn = pool.get()?;
    let entregable = buscar_por_id(&conn, &id)?;

    let ruta = if entregable.estado == "borrador" {
        let plantilla_id = entregable.plantilla_documento_id.clone().ok_or_else(|| ErrorApp::Interno("El documento no tiene plantilla.".into()))?;
        let plantilla = buscar_plantilla(&conn, &plantilla_id)?;
        let pdf_bytes = renderizar(&conn, &session.organizacion_id, &entregable, &plantilla)?;
        let ruta = directorio_entregables(&app)?.join(format!("{id}-borrador.pdf"));
        fs::write(&ruta, &pdf_bytes).map_err(|e| ErrorApp::Interno(e.to_string()))?;
        ruta.to_string_lossy().to_string()
    } else {
        conn.query_row("SELECT archivo_pdf_path FROM entregable WHERE id = ?1", rusqlite::params![id], |r| r.get::<_, Option<String>>(0))?
            .ok_or_else(|| ErrorApp::Interno("Este entregable no tiene un archivo PDF asociado.".into()))?
    };

    app.opener()
        .open_path(ruta, None::<&str>)
        .map_err(|e| ErrorApp::Interno(e.to_string()))?;
    Ok(())
}
