mod audit;
mod commands;
mod db;
mod error;
mod models;
mod pdf;
mod session;
mod util;

#[cfg(test)]
mod pruebas;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            let pool = db::init_pool(&app_data_dir)?;
            app.manage(pool);
            app.manage(session::SessionState::default());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::setup::hay_usuarios,
            commands::setup::crear_organizacion_inicial,
            commands::auth::login,
            commands::auth::logout,
            commands::auth::sesion_actual,
            commands::patients::listar_pacientes,
            commands::patients::obtener_paciente,
            commands::patients::crear_paciente,
            commands::patients::actualizar_paciente,
            commands::patients::eliminar_paciente,
            commands::agenda::obtener_configuracion_agenda,
            commands::agenda::guardar_configuracion_agenda,
            commands::agenda::listar_tipos_cita,
            commands::agenda::guardar_tipo_cita,
            commands::agenda::listar_dias_bloqueados,
            commands::agenda::bloquear_dia,
            commands::agenda::desbloquear_dia,
            commands::citas::listar_citas,
            commands::citas::listar_citas_paciente,
            commands::citas::crear_cita,
            commands::citas::reprogramar_cita,
            commands::citas::cambiar_estado_cita,
            commands::consultas::listar_consultas_por_paciente,
            commands::consultas::listar_consultas,
            commands::consultas::obtener_consulta,
            commands::consultas::obtener_consulta_por_cita,
            commands::consultas::iniciar_consulta,
            commands::consultas::guardar_consulta,
            commands::consultas::cerrar_consulta,
            commands::consultas::listar_sintomas_consulta,
            commands::consultas::agregar_sintoma_consulta,
            commands::consultas::eliminar_sintoma_consulta,
            commands::consultas::listar_examen_sistemas,
            commands::consultas::guardar_examen_sistema,
            commands::consultas::listar_diagnosticos_consulta,
            commands::consultas::agregar_diagnostico_consulta,
            commands::consultas::actualizar_diagnostico_consulta,
            commands::consultas::eliminar_diagnostico_consulta,
            commands::antecedentes::listar_antecedentes,
            commands::antecedentes::crear_antecedente,
            commands::antecedentes::actualizar_antecedente,
            commands::antecedentes::eliminar_antecedente,
            commands::pendientes::listar_pendientes_paciente,
            commands::pendientes::crear_pendiente,
            commands::pendientes::marcar_pendiente,
            commands::pendientes::adjuntar_archivo_pendiente,
            commands::pendientes::abrir_archivo_pendiente,
            commands::pendientes::eliminar_pendiente,
            commands::catalogos::listar_catalogo,
            commands::catalogos::guardar_catalogo,
            commands::dashboard::obtener_dashboard,
            commands::dashboard::obtener_contadores_nav,
            commands::enfermedades::buscar_catalogo_enfermedades,
            commands::enfermedades::crear_enfermedad_catalogo,
            commands::enfermedades::listar_enfermedades_paciente,
            commands::enfermedades::crear_diagnostico_paciente,
            commands::enfermedades::marcar_enfermedad_resuelta,
            commands::examen_fisico::listar_examen_fisico,
            commands::examen_fisico::obtener_examen_fisico_consulta,
            commands::examen_fisico::guardar_examen_fisico,
            commands::composicion_corporal::listar_composicion_corporal,
            commands::composicion_corporal::crear_composicion_corporal,
            commands::examenes::buscar_catalogo_tipos_examen,
            commands::examenes::crear_tipo_examen_catalogo,
            commands::examenes::listar_examenes_paciente,
            commands::examenes::crear_examen,
            commands::examenes::eliminar_examen,
            commands::examenes::registrar_resultado_examen,
            commands::examenes::actualizar_resultado_examen,
            commands::examenes::listar_valores_examen,
            commands::examenes::agregar_valor_examen,
            commands::tratamientos::buscar_catalogo_medicamentos,
            commands::tratamientos::crear_medicamento_catalogo,
            commands::tratamientos::obtener_tratamiento_por_consulta,
            commands::tratamientos::guardar_tratamiento,
            commands::entregables::obtener_plantilla_entregable,
            commands::entregables::guardar_plantilla_entregable,
            commands::entregables::listar_plantillas_documento,
            commands::entregables::guardar_plantilla_documento,
            commands::entregables::listar_entregables_paciente,
            commands::entregables::listar_entregables_consulta,
            commands::entregables::obtener_entregable,
            commands::entregables::crear_entregable,
            commands::entregables::guardar_entregable,
            commands::entregables::eliminar_entregable,
            commands::entregables::emitir_entregable,
            commands::entregables::abrir_entregable,
        ])
        .run(tauri::generate_context!())
        .expect("error al iniciar la aplicación de Tauri");
}
