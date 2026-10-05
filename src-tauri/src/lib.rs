mod audit;
mod commands;
mod db;
mod error;
mod models;
mod pdf;
mod session;

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
            commands::citas::listar_citas,
            commands::citas::crear_cita,
            commands::citas::cambiar_estado_cita,
            commands::consultas::listar_consultas_por_paciente,
            commands::consultas::obtener_consulta,
            commands::consultas::obtener_consulta_por_cita,
            commands::consultas::crear_consulta,
            commands::consultas::actualizar_notas_consulta,
            commands::antecedentes::listar_antecedentes,
            commands::antecedentes::crear_antecedente,
            commands::antecedentes::eliminar_antecedente,
            commands::antecedentes::listar_intervenciones_qx,
            commands::antecedentes::crear_intervencion_qx,
            commands::antecedentes::eliminar_intervencion_qx,
            commands::enfermedades::buscar_catalogo_enfermedades,
            commands::enfermedades::crear_enfermedad_catalogo,
            commands::enfermedades::listar_enfermedades_paciente,
            commands::enfermedades::crear_diagnostico_paciente,
            commands::enfermedades::marcar_enfermedad_resuelta,
            commands::examen_fisico::listar_examen_fisico,
            commands::examen_fisico::crear_examen_fisico,
            commands::composicion_corporal::listar_composicion_corporal,
            commands::composicion_corporal::crear_composicion_corporal,
            commands::examenes::buscar_catalogo_tipos_examen,
            commands::examenes::crear_tipo_examen_catalogo,
            commands::examenes::listar_examenes_paciente,
            commands::examenes::crear_examen,
            commands::examenes::actualizar_resultado_examen,
            commands::examenes::listar_valores_examen,
            commands::examenes::agregar_valor_examen,
            commands::tratamientos::buscar_catalogo_medicamentos,
            commands::tratamientos::crear_medicamento_catalogo,
            commands::tratamientos::obtener_tratamiento_por_consulta,
            commands::tratamientos::guardar_tratamiento,
            commands::entregables::obtener_plantilla_entregable,
            commands::entregables::guardar_plantilla_entregable,
            commands::entregables::listar_entregables_paciente,
            commands::entregables::crear_entregable,
            commands::entregables::abrir_entregable,
        ])
        .run(tauri::generate_context!())
        .expect("error al iniciar la aplicación de Tauri");
}
