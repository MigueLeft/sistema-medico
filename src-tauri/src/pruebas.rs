//! Prueba de extremo a extremo de los comandos sobre una base de datos temporal:
//! recorre el flujo agenda -> consulta -> cierre tal como lo usa el frontend.

use serde_json::{json, Map, Value};
use tauri::Manager;

use crate::commands::{agenda, antecedentes, catalogos, citas, consultas, dashboard, entregables, examen_fisico, examenes, patients, pendientes, setup, tratamientos};
use crate::db::{self, DbPool};
use crate::error::ErrorApp;
use crate::models::*;
use crate::session::{Session, SessionState};

/// Lunes: día de atención en la configuración por defecto.
const DIA: &str = "2030-01-07";

fn app_de_prueba() -> tauri::App<tauri::test::MockRuntime> {
    let dir = std::env::temp_dir().join(format!("sistema-medico-prueba-{}", uuid::Uuid::new_v4()));
    let pool = db::init_pool(&dir).expect("la BD temporal debe crearse y migrarse");
    let app = tauri::test::mock_app();
    app.manage(pool);
    app.manage(SessionState::default());
    app
}

fn objeto(valor: Value) -> Map<String, Value> {
    valor.as_object().cloned().expect("se esperaba un objeto JSON")
}

fn es_validacion<T>(resultado: Result<T, ErrorApp>) -> bool {
    matches!(resultado, Err(ErrorApp::Validacion(_)))
}

#[test]
fn flujo_completo_de_consulta() {
    let app = app_de_prueba();
    let pool = || app.state::<DbPool>();
    let sesion = || app.state::<SessionState>();

    // ---- Alta inicial y sesión ----
    setup::crear_organizacion_inicial(
        pool(),
        serde_json::from_value(json!({
            "nombreOrganizacion": "Consultorio de prueba",
            "nombreCompleto": "Dra. Prueba",
            "email": "prueba@example.com",
            "password": "secreto-123",
        }))
        .unwrap(),
    )
    .unwrap();
    let (usuario_id, organizacion_id): (String, String) = pool()
        .get()
        .unwrap()
        .query_row("SELECT id, organizacion_id FROM usuario", [], |r| Ok((r.get(0)?, r.get(1)?)))
        .unwrap();
    sesion().set(Session {
        usuario_id,
        organizacion_id,
        nombre_completo: "Dra. Prueba".into(),
        email: "prueba@example.com".into(),
        roles: vec!["medico".into()],
    });

    // ---- Paciente ----
    let paciente = patients::crear_paciente(
        pool(),
        sesion(),
        serde_json::from_value(json!({
            "documentoIdentidad": "V-12.345.678",
            "nombres": "María Fernanda",
            "apellidos": "Rojas Briceño",
            "fechaNacimiento": "1979-03-14",
            "sexo": "femenino",
            "telefono": null,
            "email": null,
            "estadoCivil": "Casado/a",
            "ocupacion": null,
            "direccion": null,
            "grupoSanguineo": "O+",
            "contactoEmergenciaNombre": null,
            "contactoEmergenciaParentesco": null,
            "contactoEmergenciaTelefono": null,
        }))
        .unwrap(),
    )
    .unwrap();
    let paciente_id = paciente.paciente.id.clone();
    assert_eq!(paciente.paciente.grupo_sanguineo.as_deref(), Some("O+"));
    assert_eq!(patients::listar_pacientes(pool(), sesion()).unwrap().len(), 1);

    // ---- Agenda ----
    let cfg = agenda::obtener_configuracion_agenda(pool(), sesion()).unwrap();
    assert_eq!(cfg.dias_atencion, "1,2,3,4,5,6");
    let tipos = agenda::listar_tipos_cita(pool(), sesion()).unwrap();
    assert_eq!(tipos.len(), 5);
    let control = tipos.iter().find(|t| t.nombre == "Control").unwrap();

    let nueva_cita = |hora: &str| -> CreateCitaPayload {
        serde_json::from_value(json!({
            "pacienteId": paciente_id,
            "fechaHora": format!("{DIA}T{hora}:00"),
            "tipoCitaId": control.id,
            "motivo": "Control de hipertensión",
            "enviarRecordatorio": true,
        }))
        .unwrap()
    };
    let cita = citas::crear_cita(pool(), sesion(), nueva_cita("08:00")).unwrap();
    assert_eq!(cita.duracion_min, 30, "la duración sale del tipo de cita");
    assert_eq!(cita.estado, "programada");

    // Domingo sin consulta y día bloqueado.
    let mut domingo = nueva_cita("08:00");
    domingo.fecha_hora = "2030-01-06T08:00:00".into();
    assert!(es_validacion(citas::crear_cita(pool(), sesion(), domingo)));
    agenda::bloquear_dia(pool(), sesion(), "2030-01-08".into(), None).unwrap();
    let mut bloqueado = nueva_cita("08:00");
    bloqueado.fecha_hora = "2030-01-08T08:00:00".into();
    assert!(es_validacion(citas::crear_cita(pool(), sesion(), bloqueado)));

    // Sobrecupos: se permiten 2 por día; el tercero se rechaza. Una cita contigua no es sobrecupo.
    citas::crear_cita(pool(), sesion(), nueva_cita("08:30")).unwrap();
    citas::crear_cita(pool(), sesion(), nueva_cita("08:15")).unwrap();
    citas::crear_cita(pool(), sesion(), nueva_cita("08:00")).unwrap();
    assert!(es_validacion(citas::crear_cita(pool(), sesion(), nueva_cita("08:10"))));
    let del_dia = citas::listar_citas(pool(), sesion(), DIA.into(), DIA.into()).unwrap();
    assert_eq!(del_dia.len(), 4);

    let reprogramada = citas::reprogramar_cita(
        pool(),
        sesion(),
        del_dia[3].id.clone(),
        ReprogramarCitaPayload { fecha_hora: format!("{DIA}T10:00:00"), duracion_min: None },
    )
    .unwrap();
    assert!(reprogramada.fecha_hora.ends_with("T10:00:00"));
    assert_eq!(citas::cambiar_estado_cita(pool(), sesion(), cita.id.clone(), "en_sala".into()).unwrap().estado, "en_sala");
    assert!(es_validacion(citas::cambiar_estado_cita(pool(), sesion(), cita.id.clone(), "inventado".into())));

    // ---- Consulta ----
    let iniciar = || IniciarConsultaPayload { paciente_id: paciente_id.clone(), cita_id: Some(cita.id.clone()) };
    let consulta = consultas::iniciar_consulta(pool(), sesion(), iniciar()).unwrap();
    assert_eq!(consulta.estado, "borrador");
    assert_eq!(consulta.motivo_consulta, "Control de hipertensión", "el motivo arranca con el de la cita");
    assert_eq!(consultas::iniciar_consulta(pool(), sesion(), iniciar()).unwrap().id, consulta.id, "no duplica la consulta de la cita");
    let consulta_id = consulta.id.clone();

    consultas::guardar_consulta(
        pool(),
        sesion(),
        consulta_id.clone(),
        serde_json::from_value(json!({
            "tipoCitaId": control.id,
            "motivoConsulta": "Control de hipertensión. Refiere cefalea.",
            "enfermedadActual": "Cefalea occipital de 3 días.",
            "notasMedico": null,
            "impresionDiagnostica": "HTA no controlada.",
            "proximoControl": "En 2 semanas",
            "proximoControlTipoId": null,
        }))
        .unwrap(),
    )
    .unwrap();

    // Sin diagnóstico no se puede cerrar.
    assert!(es_validacion(consultas::cerrar_consulta(pool(), sesion(), consulta_id.clone())));

    consultas::agregar_sintoma_consulta(
        pool(),
        sesion(),
        CreateSintomaPayload { consulta_id: consulta_id.clone(), nombre: "Cefalea".into(), codigo_snomed: Some("25064002".into()), detalle: Some("Occipital".into()) },
    )
    .unwrap();
    assert_eq!(consultas::listar_sintomas_consulta(pool(), consulta_id.clone()).unwrap().len(), 1);

    // Examen físico: crear y luego actualizar el mismo registro; los derivados se calculan.
    let mediciones = |peso: f64| -> CreateExamenFisicoPayload {
        serde_json::from_value(json!({
            "pacienteId": paciente_id, "consultaId": consulta_id,
            "taSistolica": 148, "taDiastolica": 94, "pesoKg": peso, "tallaCm": 162.0,
            "grasaCorporalPct": 34.2, "masaMuscularPct": null, "masaMuscularKg": 25.1,
            "circunferenciaAbdominalCm": 94.0, "circunferenciaCaderaCm": null, "circunferenciaCuelloCm": 34.0,
            "fuerzaManoDerechaKg": 24.0, "fuerzaManoIzquierdaKg": 22.0, "fc": 82, "temperatura": null,
            "frecuenciaRespiratoria": null, "saturacionOxigenoPct": 97.0, "notas": null,
        }))
        .unwrap()
    };
    let primero = examen_fisico::guardar_examen_fisico(pool(), sesion(), mediciones(72.5)).unwrap();
    assert!((primero.imc.unwrap() - 27.6).abs() < 0.05);
    assert!((primero.grasa_corporal_kg.unwrap() - 24.8).abs() < 0.05);
    assert!((primero.masa_magra_kg.unwrap() - 47.7).abs() < 0.05);
    let segundo = examen_fisico::guardar_examen_fisico(pool(), sesion(), mediciones(73.0)).unwrap();
    assert_eq!(segundo.id, primero.id, "una consulta tiene un solo registro de mediciones");
    assert_eq!(examen_fisico::obtener_examen_fisico_consulta(pool(), consulta_id.clone()).unwrap().unwrap().peso_kg, Some(73.0));

    // Examen por sistemas.
    let sistemas = consultas::listar_examen_sistemas(pool(), consulta_id.clone()).unwrap();
    assert_eq!(sistemas.len(), 7);
    let guardar_sistema = |estado: Option<&str>| {
        consultas::guardar_examen_sistema(
            pool(),
            sesion(),
            GuardarExamenSistemaPayload {
                consulta_id: consulta_id.clone(),
                sistema_id: sistemas[3].sistema_id.clone(),
                estado: estado.map(String::from),
                descripcion: Some("Soplo sistólico".into()),
                codigo_snomed: None,
            },
        )
    };
    guardar_sistema(Some("normal")).unwrap();
    guardar_sistema(Some("hallazgos")).unwrap();
    let cardio = &consultas::listar_examen_sistemas(pool(), consulta_id.clone()).unwrap()[3];
    assert_eq!(cardio.estado.as_deref(), Some("hallazgos"));
    guardar_sistema(None).unwrap();
    assert!(consultas::listar_examen_sistemas(pool(), consulta_id.clone()).unwrap()[3].estado.is_none());

    // Diagnósticos desde el catálogo (incluye uno local sin código).
    let buscar = |catalogo: &str, query: &str| catalogos::listar_catalogo(pool(), sesion(), catalogo.into(), Some(query.into()), None, None).unwrap();
    let hta = buscar("enfermedades", "hipertensión esencial");
    assert_eq!(hta[0]["codigo"], "59621000");
    let dx = |catalogo_id: &Value| CreateConsultaDiagnosticoPayload {
        consulta_id: consulta_id.clone(),
        enfermedad_catalogo_id: catalogo_id.as_str().unwrap().into(),
        rol: None,
        certeza: None,
        nota: None,
    };
    let principal = consultas::agregar_diagnostico_consulta(pool(), sesion(), dx(&hta[0]["id"])).unwrap();
    assert_eq!((principal.rol.as_str(), principal.tipo.as_str()), ("principal", "nuevo"));
    assert!(es_validacion(consultas::agregar_diagnostico_consulta(pool(), sesion(), dx(&hta[0]["id"]))), "no admite repetidos");
    let local = catalogos::guardar_catalogo(pool(), sesion(), "enfermedades".into(), None, objeto(json!({ "nombre": "Síndrome de prueba" }))).unwrap();
    assert_eq!(local["versionCie"], "LOCAL");
    let secundario = consultas::agregar_diagnostico_consulta(pool(), sesion(), dx(&local["id"])).unwrap();
    assert_eq!(secundario.rol, "secundario");
    consultas::actualizar_diagnostico_consulta(
        pool(),
        sesion(),
        secundario.id.clone(),
        UpdateConsultaDiagnosticoPayload { rol: "principal".into(), certeza: "presuntivo".into(), nota: None },
    )
    .unwrap();
    let lista = consultas::listar_diagnosticos_consulta(pool(), consulta_id.clone()).unwrap();
    assert_eq!(lista.iter().filter(|d| d.rol == "principal").count(), 1, "solo un diagnóstico principal");
    consultas::eliminar_diagnostico_consulta(pool(), sesion(), secundario.id).unwrap();
    assert_eq!(consultas::listar_diagnosticos_consulta(pool(), consulta_id.clone()).unwrap().len(), 1);

    // Paraclínico solicitado: por sí solo no deja pendiente; lo genera la orden al emitirse.
    let hba1c = buscar("paraclinicos", "4548-4");
    let examen = examenes::crear_examen(
        pool(),
        sesion(),
        serde_json::from_value(json!({
            "pacienteId": paciente_id, "consultaId": consulta_id, "tipoExamenId": hba1c[0]["id"],
            "fechaSolicitud": DIA, "indicacion": "En ayunas", "notas": null,
        }))
        .unwrap(),
    )
    .unwrap();
    assert_eq!(examen.codigo_loinc.as_deref(), Some("4548-4"));
    assert!(pendientes::listar_pendientes_paciente(pool(), paciente_id.clone()).unwrap().is_empty());

    // ---- Entregables por plantilla ----
    let plantillas = entregables::listar_plantillas_documento(pool(), sesion()).unwrap();
    assert_eq!(plantillas.iter().map(|p| p.prefijo.as_str()).collect::<Vec<_>>(), ["REC-", "LAB-", "IMG-", "REF-", "IND-", "INF-", "CON-"]);
    let plantilla = |clave: &str| plantillas.iter().find(|p| p.clave == clave).unwrap().clone();
    let crear = |clave: &str| {
        entregables::crear_entregable(pool(), sesion(), CrearEntregablePayload { consulta_id: consulta_id.clone(), plantilla_documento_id: plantilla(clave).id })
    };

    // Orden de laboratorio: se precarga con lo solicitado en la consulta y su diagnóstico principal.
    let orden = crear("orden_lab").unwrap();
    assert_eq!((orden.numero.as_deref(), orden.estado.as_str()), (Some("LAB-000001"), "borrador"));
    assert_eq!(orden.items.len(), 1);
    assert_eq!(orden.items[0].datos.codigo.as_deref(), Some("4548-4"));
    assert!(orden.datos["diagnostico"].as_str().unwrap().starts_with("Hipertensión esencial"));
    assert_eq!(orden.datos["preparacion"], "En ayunas");
    assert!(es_validacion(consultas::cerrar_consulta(pool(), sesion(), consulta_id.clone())), "con borradores no se cierra");

    let creatinina = buscar("paraclinicos", "2160-0");
    let mut datos_orden = orden.datos.clone();
    datos_orden["preparacion"] = json!("Ayuno de 12 horas.");
    let orden = entregables::guardar_entregable(
        pool(),
        sesion(),
        orden.id.clone(),
        serde_json::from_value(json!({
            "datos": datos_orden,
            "items": [
                { "tipoItem": "examen", "nombre": orden.items[0].datos.nombre, "codigo": "4548-4", "referenciaId": hba1c[0]["id"] },
                { "tipoItem": "examen", "nombre": creatinina[0]["nombre"], "codigo": "2160-0", "referenciaId": creatinina[0]["id"] },
                { "tipoItem": "examen", "nombre": "Prueba descartada", "incluido": false },
            ],
        }))
        .unwrap(),
    )
    .unwrap();
    assert_eq!(orden.items.len(), 3);

    // Emisión (sin la parte que escribe el PDF en disco, que necesita la app real).
    let emitir = |documento: &Entregable| {
        let conn = pool().get().unwrap();
        let p = entregables::buscar_plantilla(&conn, documento.plantilla_documento_id.as_deref().unwrap()).unwrap();
        let s = sesion().get().unwrap();
        let pdf = entregables::renderizar(&conn, &s.organizacion_id, documento, &p).unwrap();
        assert!(pdf.starts_with(b"%PDF"), "el documento se renderiza a PDF");
        let creados = entregables::generar_pendientes(&conn, &s.usuario_id, &s.organizacion_id, documento, &p).unwrap();
        conn.execute("UPDATE entregable SET estado = 'emitido' WHERE id = ?1", rusqlite::params![documento.id]).unwrap();
        creados
    };
    assert_eq!(emitir(&orden), 2, "un pendiente por prueba incluida");
    let lista_pendientes = pendientes::listar_pendientes_paciente(pool(), paciente_id.clone()).unwrap();
    assert_eq!(lista_pendientes.iter().map(|p| p.nombre.as_str()).collect::<Vec<_>>(), ["Hemoglobina A1c", "Creatinina"]);
    assert!(lista_pendientes.iter().all(|p| p.entregable_numero.as_deref() == Some("LAB-000001") && p.tipo == "paraclinico"));
    assert_eq!(lista_pendientes[0].examen_id.as_deref(), Some(examen.id.as_str()), "reutiliza el paraclínico ya solicitado");
    assert_eq!(examenes::listar_examenes_paciente(pool(), paciente_id.clone()).unwrap().len(), 2, "la prueba nueva queda como paraclínico de la consulta");
    assert!(es_validacion(entregables::guardar_entregable(pool(), sesion(), orden.id.clone(), GuardarEntregablePayload { datos: json!({}), items: vec![] })), "emitido = solo lectura");
    assert_eq!(entregables::obtener_entregable(pool(), orden.id.clone()).unwrap().pendientes_generados, 2);

    // Referencia: un pendiente por documento, con el texto de la plantilla.
    let referencia = crear("referencia").unwrap();
    assert_eq!(referencia.numero.as_deref(), Some("REF-000001"));
    assert!(referencia.datos["resumen"].as_str().unwrap().contains("Motivo de consulta"));
    let mut datos_ref = referencia.datos.clone();
    datos_ref["textos"] = json!({ "especialidad": "Cardiología", "motivo": "HTA no controlada" });
    let referencia = entregables::guardar_entregable(pool(), sesion(), referencia.id.clone(), GuardarEntregablePayload { datos: datos_ref, items: vec![] }).unwrap();
    assert_eq!(emitir(&referencia), 1);
    assert!(pendientes::listar_pendientes_paciente(pool(), paciente_id.clone()).unwrap().iter().any(|p| p.nombre == "Informe de Cardiología" && p.tipo == "documento"));

    // Un borrador se puede descartar y la numeración no se reutiliza.
    let descartado = crear("orden_lab").unwrap();
    assert_eq!(descartado.numero.as_deref(), Some("LAB-000002"));
    entregables::eliminar_entregable(pool(), sesion(), descartado.id).unwrap();
    assert!(es_validacion(entregables::eliminar_entregable(pool(), sesion(), orden.id.clone())), "un emitido no se elimina");
    assert_eq!(entregables::listar_entregables_consulta(pool(), consulta_id.clone()).unwrap().len(), 2);

    // Plantillas: prefijo único y alta de una plantilla propia.
    let mut propia: GuardarPlantillaDocumentoPayload = serde_json::from_value(json!({
        "nombre": "Justificativo", "prefijo": "lab-", "papel": "media_carta",
        "bloques": [{ "clave": "membrete", "titulo": "Membrete", "modo": "automatico" }, { "clave": "contenido", "titulo": "Contenido", "modo": "texto" }],
        "generaPendientes": false, "pendienteTipo": "documento", "pendienteCuantos": "uno_por_documento", "pendienteTexto": null,
        "entregaImprimir": true, "entregaWhatsapp": false, "entregaCorreo": false, "requiereFirma": true, "activa": true,
    }))
    .unwrap();
    assert!(es_validacion(entregables::guardar_plantilla_documento(pool(), sesion(), None, propia.clone())), "prefijo repetido");
    propia.prefijo = "jus-".into();
    let creada = entregables::guardar_plantilla_documento(pool(), sesion(), None, propia).unwrap();
    assert_eq!((creada.clave.as_str(), creada.prefijo.as_str(), creada.bloques.len()), ("otro", "JUS-", 2));

    // Resultado del paraclínico: bandera según rangos y pendiente entregado.
    let con_resultado = examenes::registrar_resultado_examen(pool(), sesion(), examen.id.clone(), RegistrarResultadoExamenPayload { valor: Some(8.1), notas: None }).unwrap();
    assert_eq!(con_resultado.bandera.as_deref(), Some("alto"));
    assert_eq!(pendientes::listar_pendientes_paciente(pool(), paciente_id.clone()).unwrap().iter().find(|p| p.nombre == "Hemoglobina A1c").unwrap().estado, "entregado");
    assert!(es_validacion(examenes::eliminar_examen(pool(), sesion(), examen.id)), "con resultado ya no se retira");

    // Pendiente manual: «no lo trajo» sigue abierto.
    let manual = pendientes::crear_pendiente(
        pool(),
        sesion(),
        CreatePendientePayload { paciente_id: paciente_id.clone(), consulta_origen_id: Some(consulta_id.clone()), tipo: "documento".into(), nombre: "Informe de cardiología".into(), codigo_loinc: None },
    )
    .unwrap();
    let marcado = pendientes::marcar_pendiente(pool(), sesion(), manual.id.clone(), MarcarPendientePayload { estado: "no_entregado".into(), consulta_id: Some(consulta_id.clone()) }).unwrap();
    assert_eq!(marcado.consulta_revision_id.as_deref(), Some(consulta_id.as_str()));

    // Antecedentes: alta, edición y baja.
    let alergia = |descripcion: &str| -> GuardarAntecedentePayload {
        serde_json::from_value(json!({
            "pacienteId": paciente_id, "tipo": "alergia", "subcategoria": null, "descripcion": descripcion,
            "codigoSnomed": "91936005", "detalle": null, "fecha": null, "estado": "confirmada", "parentesco": null,
            "reaccion": "Urticaria", "severidad": "moderada", "diasEstancia": null, "centroSalud": null,
            "servicio": null, "consultaId": consulta_id,
        }))
        .unwrap()
    };
    let creada = antecedentes::crear_antecedente(pool(), sesion(), alergia("Alergia a penicilina")).unwrap();
    let editada = antecedentes::actualizar_antecedente(pool(), sesion(), creada.id.clone(), alergia("Alergia a la penicilina")).unwrap();
    assert_eq!(editada.descripcion, "Alergia a la penicilina");
    assert_eq!(antecedentes::listar_antecedentes(pool(), paciente_id.clone()).unwrap().len(), 1);
    let mut invalido = alergia("x");
    invalido.tipo = "inventado".into();
    assert!(es_validacion(antecedentes::crear_antecedente(pool(), sesion(), invalido)));

    // Tratamiento: el medicamento vuelve con sus palabras clave de alergia.
    let amoxicilina = buscar("medicamentos", "amoxi");
    let tratamiento = tratamientos::guardar_tratamiento(
        pool(),
        sesion(),
        serde_json::from_value(json!({
            "consultaId": consulta_id,
            "indicacionesGenerales": "Dieta hiposódica.",
            "medicamentos": [{ "medicamentoId": amoxicilina[0]["id"], "dosis": "1 cápsula", "frecuencia": "Cada 8 h", "duracion": "7 días", "via": "Oral", "indicaciones": null }],
        }))
        .unwrap(),
    )
    .unwrap();
    assert!(tratamiento.medicamentos[0].alergenos.as_deref().unwrap().contains("penicilina"));

    // Catálogo: filtros, edición parcial y columna desconocida.
    let filtros = [("categoria".to_string(), "sintoma".to_string())].into_iter().collect();
    let sintomas = catalogos::listar_catalogo(pool(), sesion(), "terminos".into(), Some("cefa".into()), Some(filtros), Some(5)).unwrap();
    assert_eq!(sintomas[0]["nombre"], "Cefalea");
    let editado = catalogos::guardar_catalogo(
        pool(),
        sesion(),
        "paraclinicos".into(),
        Some(hba1c[0]["id"].as_str().unwrap().into()),
        objeto(json!({ "refMaxMujer": 5.7, "favorito": false })),
    )
    .unwrap();
    assert_eq!((editado["refMaxMujer"].as_f64(), editado["favorito"].as_bool()), (Some(5.7), Some(false)));
    assert_eq!(editado["nombreMostrar"], "Hemoglobina A1c", "las claves ausentes no se tocan");
    assert!(es_validacion(catalogos::listar_catalogo(pool(), sesion(), "inexistente".into(), None, None, None)));
    assert!(es_validacion(catalogos::guardar_catalogo(pool(), sesion(), "servicios".into(), None, objeto(json!({ "nombre": "UCI" })))), "nombre duplicado");

    // ---- Panel de inicio antes de cerrar ----
    let contadores = dashboard::obtener_contadores_nav(pool(), sesion()).unwrap();
    assert_eq!(contadores.consultas_sin_cerrar, 1);
    let panel = dashboard::obtener_dashboard(pool(), sesion()).unwrap();
    assert_eq!(panel.consultas_sin_cerrar.len(), 1);
    assert_eq!(panel.consultas_sin_cerrar[0].diagnosticos, 1);
    assert_eq!(panel.resultados_recientes.len(), 1);
    assert_eq!(panel.consultas_por_semana.iter().map(|s| s.total).sum::<i64>(), 1);
    assert_eq!(panel.diagnosticos_frecuentes[0].nombre, "Hipertensión esencial");

    // ---- Cierre ----
    let cerrada = consultas::cerrar_consulta(pool(), sesion(), consulta_id.clone()).unwrap();
    assert_eq!(cerrada.estado, "cerrada");
    assert_eq!(cerrada.diagnostico_principal.as_deref(), Some("Hipertensión esencial"));
    let cita_final = citas::listar_citas_paciente(pool(), paciente_id.clone()).unwrap().into_iter().find(|c| c.id == cita.id).unwrap();
    assert_eq!(cita_final.estado, "atendida");
    assert_eq!(cita_final.consulta_id.as_deref(), Some(consulta_id.as_str()));
    assert_eq!(cita_final.pendientes_abiertos, 3, "creatinina, informe de la referencia y el documento que no trajo");

    // Una consulta cerrada no admite cambios en ninguna de sus secciones.
    assert!(es_validacion(examen_fisico::guardar_examen_fisico(pool(), sesion(), mediciones(74.0))));
    assert!(es_validacion(consultas::agregar_diagnostico_consulta(pool(), sesion(), dx(&local["id"]))));
    assert!(es_validacion(consultas::agregar_sintoma_consulta(
        pool(),
        sesion(),
        CreateSintomaPayload { consulta_id: consulta_id.clone(), nombre: "Mareo".into(), codigo_snomed: None, detalle: None },
    )));

    assert_eq!(consultas::listar_consultas(pool(), sesion(), Some("borrador".into())).unwrap().len(), 0);
    assert_eq!(consultas::listar_consultas_por_paciente(pool(), paciente_id.clone()).unwrap().len(), 1);
    assert_eq!(dashboard::obtener_contadores_nav(pool(), sesion()).unwrap().consultas_sin_cerrar, 0);
    let listado = patients::listar_pacientes(pool(), sesion()).unwrap();
    assert!(listado[0].paciente.ultima_consulta.is_some());
}

/// Una base de datos creada con el esquema v1 conserva sus datos al pasar a v2.
#[test]
fn migracion_desde_v1_conserva_datos() {
    let dir = std::env::temp_dir().join(format!("sistema-medico-prueba-{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&dir).unwrap();
    {
        let conn = rusqlite::Connection::open(dir.join("sistema_medico.sqlite")).unwrap();
        conn.execute_batch(include_str!("db/schema.sql")).unwrap();
        conn.execute_batch(
            "PRAGMA user_version = 1;
             INSERT INTO organizacion (id, nombre) VALUES ('o1', 'Org');
             INSERT INTO usuario (id, organizacion_id, nombre_completo, email, password_hash) VALUES ('u1', 'o1', 'Dr', 'a@b.c', 'x');
             INSERT INTO paciente (id, organizacion_id, documento_identidad, nombres, apellidos, fecha_nacimiento, sexo)
                  VALUES ('p1', 'o1', '1', 'Ana', 'Pérez', '1990-01-01', 'femenino');
             INSERT INTO cita (id, organizacion_id, paciente_id, medico_id, fecha_hora, motivo, estado)
                  VALUES ('c1', 'o1', 'p1', 'u1', '2026-01-05T08:00:00', 'Control', 'agendada');
             INSERT INTO consulta (id, organizacion_id, paciente_id, medico_id, motivo_consulta) VALUES ('k1', 'o1', 'p1', 'u1', 'Control');
             INSERT INTO antecedente (id, organizacion_id, paciente_id, tipo, descripcion) VALUES ('a1', 'o1', 'p1', 'psicobiologico', 'Fuma');
             INSERT INTO intervencion_qx (id, organizacion_id, paciente_id, nombre, fecha, notas) VALUES ('q1', 'o1', 'p1', 'Cesárea', '2009', 'Sin complicaciones');",
        )
        .unwrap();
    }

    let pool = db::init_pool(&dir).unwrap();
    let conn = pool.get().unwrap();
    let texto = |sql: &str| conn.query_row(sql, [], |r| r.get::<_, String>(0)).unwrap();
    assert_eq!(conn.query_row("PRAGMA user_version", [], |r| r.get::<_, i64>(0)).unwrap(), 3);
    assert_eq!(texto("SELECT estado FROM cita WHERE id = 'c1'"), "programada");
    assert_eq!(texto("SELECT estado FROM consulta WHERE id = 'k1'"), "cerrada");
    assert_eq!(texto("SELECT tipo FROM antecedente WHERE id = 'a1'"), "habito");
    assert_eq!(texto("SELECT tipo || ':' || descripcion || ':' || fecha || ':' || detalle FROM antecedente WHERE id = 'q1'"), "quirurgico:Cesárea:2009:Sin complicaciones");
}
