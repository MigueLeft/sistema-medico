-- Sistema Médico — schema completo (ver docs/arquitectura del ERD).
-- Convenciones (sección 6 del doc):
--  * PK TEXT (uuid v4 generado en Rust).
--  * Tablas clínicas: organizacion_id, created_at/by, updated_at/by, deleted_at/by (soft-delete).
--  * NOTA_EVOLUCION es append-only (sin updated_at/by).
--  * AUDITORIA es un log append-only (sin soft-delete).
-- Fechas/horas se guardan como TEXT ISO-8601. Booleanos como INTEGER 0/1.

PRAGMA foreign_keys = ON;

-- ==================== MULTI-TENANT / SEGURIDAD ====================

CREATE TABLE organizacion (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    identificacion_fiscal TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE usuario (
    id TEXT PRIMARY KEY,
    organizacion_id TEXT NOT NULL REFERENCES organizacion(id),
    nombre_completo TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    activo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT,
    updated_at TEXT,
    updated_by TEXT,
    deleted_at TEXT,
    deleted_by TEXT
);
CREATE INDEX idx_usuario_organizacion ON usuario(organizacion_id);

CREATE TABLE rol (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE, -- medico|asistente|administrador
    permisos TEXT NOT NULL DEFAULT '{}' -- JSON
);

CREATE TABLE usuario_rol (
    usuario_id TEXT NOT NULL REFERENCES usuario(id),
    rol_id TEXT NOT NULL REFERENCES rol(id),
    PRIMARY KEY (usuario_id, rol_id)
);

CREATE TABLE perfil_medico (
    id TEXT PRIMARY KEY,
    usuario_id TEXT NOT NULL UNIQUE REFERENCES usuario(id),
    colegiatura TEXT,
    especialidad TEXT,
    firma_path TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT
);

CREATE TABLE auditoria (
    id TEXT PRIMARY KEY,
    usuario_id TEXT REFERENCES usuario(id),
    tabla TEXT NOT NULL,
    registro_id TEXT NOT NULL,
    accion TEXT NOT NULL, -- insert|update|delete
    valores_anteriores TEXT, -- JSON
    valores_nuevos TEXT, -- JSON
    timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_auditoria_tabla_registro ON auditoria(tabla, registro_id);
CREATE INDEX idx_auditoria_usuario ON auditoria(usuario_id);

-- ==================== PACIENTE / EXPEDIENTE ====================

CREATE TABLE paciente (
    id TEXT PRIMARY KEY,
    organizacion_id TEXT NOT NULL REFERENCES organizacion(id),
    documento_identidad TEXT NOT NULL,
    nombres TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    fecha_nacimiento TEXT NOT NULL,
    sexo TEXT NOT NULL,
    telefono TEXT,
    email TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT,
    updated_at TEXT,
    updated_by TEXT,
    deleted_at TEXT,
    deleted_by TEXT,
    UNIQUE (organizacion_id, documento_identidad)
);
CREATE INDEX idx_paciente_organizacion ON paciente(organizacion_id);
CREATE INDEX idx_paciente_documento ON paciente(documento_identidad);

CREATE TABLE expediente (
    id TEXT PRIMARY KEY,
    paciente_id TEXT NOT NULL UNIQUE REFERENCES paciente(id),
    codigo TEXT NOT NULL UNIQUE,
    fecha_apertura TEXT NOT NULL DEFAULT (datetime('now')),
    organizacion_id TEXT NOT NULL REFERENCES organizacion(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT,
    updated_at TEXT,
    updated_by TEXT,
    deleted_at TEXT,
    deleted_by TEXT
);

-- ==================== CITA -> CONSULTA ====================

CREATE TABLE cita (
    id TEXT PRIMARY KEY,
    organizacion_id TEXT NOT NULL REFERENCES organizacion(id),
    paciente_id TEXT NOT NULL REFERENCES paciente(id),
    medico_id TEXT NOT NULL REFERENCES usuario(id),
    fecha_hora TEXT NOT NULL,
    motivo TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'agendada', -- solicitada|agendada|atendida|cancelada
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT,
    updated_at TEXT,
    updated_by TEXT,
    deleted_at TEXT,
    deleted_by TEXT
);
CREATE INDEX idx_cita_paciente ON cita(paciente_id);
CREATE INDEX idx_cita_medico ON cita(medico_id);
CREATE INDEX idx_cita_fecha_hora ON cita(fecha_hora);

CREATE TABLE consulta (
    id TEXT PRIMARY KEY,
    organizacion_id TEXT NOT NULL REFERENCES organizacion(id),
    paciente_id TEXT NOT NULL REFERENCES paciente(id),
    medico_id TEXT NOT NULL REFERENCES usuario(id),
    cita_id TEXT REFERENCES cita(id),
    fecha TEXT NOT NULL DEFAULT (datetime('now')),
    motivo_consulta TEXT NOT NULL,
    notas_medico TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT,
    updated_at TEXT,
    updated_by TEXT,
    deleted_at TEXT,
    deleted_by TEXT
);
CREATE INDEX idx_consulta_paciente ON consulta(paciente_id);
CREATE INDEX idx_consulta_medico ON consulta(medico_id);
CREATE INDEX idx_consulta_cita ON consulta(cita_id);

-- ==================== ANTECEDENTES / QX ====================

CREATE TABLE antecedente (
    id TEXT PRIMARY KEY,
    organizacion_id TEXT NOT NULL REFERENCES organizacion(id),
    paciente_id TEXT NOT NULL REFERENCES paciente(id),
    tipo TEXT NOT NULL, -- personal|psicobiologico|familiar
    subcategoria TEXT,
    descripcion TEXT NOT NULL,
    fecha_registro TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT,
    updated_at TEXT,
    updated_by TEXT,
    deleted_at TEXT,
    deleted_by TEXT
);
CREATE INDEX idx_antecedente_paciente ON antecedente(paciente_id);

CREATE TABLE intervencion_qx (
    id TEXT PRIMARY KEY,
    organizacion_id TEXT NOT NULL REFERENCES organizacion(id),
    paciente_id TEXT NOT NULL REFERENCES paciente(id),
    antecedente_id TEXT REFERENCES antecedente(id),
    consulta_id TEXT REFERENCES consulta(id),
    nombre TEXT NOT NULL,
    fecha TEXT NOT NULL,
    notas TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT,
    updated_at TEXT,
    updated_by TEXT,
    deleted_at TEXT,
    deleted_by TEXT
);
CREATE INDEX idx_intervencion_qx_paciente ON intervencion_qx(paciente_id);

-- ==================== ENFERMEDADES / DIAGNOSTICOS ====================

CREATE TABLE enfermedad_catalogo (
    id TEXT PRIMARY KEY,
    codigo TEXT NOT NULL,
    version_cie TEXT NOT NULL, -- 10|11
    nombre TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (codigo, version_cie)
);

CREATE TABLE paciente_enfermedad (
    id TEXT PRIMARY KEY,
    organizacion_id TEXT NOT NULL REFERENCES organizacion(id),
    paciente_id TEXT NOT NULL REFERENCES paciente(id),
    enfermedad_catalogo_id TEXT NOT NULL REFERENCES enfermedad_catalogo(id),
    activa INTEGER NOT NULL DEFAULT 1,
    fecha_diagnostico TEXT NOT NULL,
    fecha_resolucion TEXT,
    notas TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT,
    updated_at TEXT,
    updated_by TEXT,
    deleted_at TEXT,
    deleted_by TEXT
);
CREATE INDEX idx_paciente_enfermedad_paciente ON paciente_enfermedad(paciente_id);
CREATE INDEX idx_paciente_enfermedad_activa ON paciente_enfermedad(paciente_id, activa);

CREATE TABLE consulta_diagnostico (
    id TEXT PRIMARY KEY,
    consulta_id TEXT NOT NULL REFERENCES consulta(id),
    paciente_enfermedad_id TEXT NOT NULL REFERENCES paciente_enfermedad(id),
    tipo TEXT NOT NULL, -- nuevo|seguimiento|resuelto
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT,
    updated_at TEXT,
    updated_by TEXT,
    deleted_at TEXT,
    deleted_by TEXT
);
CREATE INDEX idx_consulta_diagnostico_consulta ON consulta_diagnostico(consulta_id);

-- ==================== EXAMEN FISICO / COMPOSICION ====================

CREATE TABLE examen_fisico (
    id TEXT PRIMARY KEY,
    organizacion_id TEXT NOT NULL REFERENCES organizacion(id),
    paciente_id TEXT NOT NULL REFERENCES paciente(id),
    consulta_id TEXT NOT NULL REFERENCES consulta(id),
    fecha TEXT NOT NULL DEFAULT (datetime('now')),
    ta_sistolica INTEGER,
    ta_diastolica INTEGER,
    peso_kg REAL,
    talla_cm REAL, -- Altura
    imc REAL, -- calculado
    grasa_corporal_pct REAL,
    grasa_corporal_kg REAL, -- calculado
    masa_muscular_pct REAL,
    masa_muscular_kg REAL, -- calculado (Masa Magra/Muscular)
    circunferencia_abdominal_cm REAL,
    circunferencia_cadera_cm REAL,
    indice_cintura_cadera REAL, -- calculado
    circunferencia_cuello_cm REAL,
    fuerza_mano_derecha_kg REAL,
    fuerza_mano_izquierda_kg REAL,
    fc INTEGER, -- Frecuencia cardiaca
    temperatura REAL,
    frecuencia_respiratoria INTEGER,
    saturacion_oxigeno_pct REAL,
    notas TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT,
    updated_at TEXT,
    updated_by TEXT,
    deleted_at TEXT,
    deleted_by TEXT
);
CREATE INDEX idx_examen_fisico_paciente ON examen_fisico(paciente_id);
CREATE INDEX idx_examen_fisico_consulta ON examen_fisico(consulta_id);

CREATE TABLE composicion_corporal (
    id TEXT PRIMARY KEY,
    organizacion_id TEXT NOT NULL REFERENCES organizacion(id),
    paciente_id TEXT NOT NULL REFERENCES paciente(id),
    consulta_id TEXT NOT NULL REFERENCES consulta(id),
    fecha TEXT NOT NULL DEFAULT (datetime('now')),
    altura_cm REAL,
    peso_kg REAL,
    imc REAL, -- manual
    mb_kcal REAL, -- metabolismo basal
    masa_grasa_pct REAL,
    masa_grasa_kg REAL, -- calculado
    masa_magra_kg REAL, -- calculado
    agua_total_kg REAL,
    peso_ideal_kg REAL, -- manual
    masa_grasa_ideal_kg REAL, -- manual
    grasa_a_perder_kg REAL, -- calculado
    notas TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT,
    updated_at TEXT,
    updated_by TEXT,
    deleted_at TEXT,
    deleted_by TEXT
);
CREATE INDEX idx_composicion_corporal_paciente ON composicion_corporal(paciente_id);
CREATE INDEX idx_composicion_corporal_consulta ON composicion_corporal(consulta_id);

CREATE TABLE composicion_corporal_segmento (
    id TEXT PRIMARY KEY,
    composicion_corporal_id TEXT NOT NULL REFERENCES composicion_corporal(id),
    segmento TEXT NOT NULL, -- brazo_izquierdo|brazo_derecho|pierna_izquierda|pierna_derecha|tronco
    masa_grasa_pct REAL,
    masa_grasa_kg REAL,
    masa_magra_kg REAL,
    masa_muscular_prevista_kg REAL,
    masa_musculo_esqueletica_pct REAL,
    masa_musculo_esqueletica_kg REAL, -- calculado = 0.566 * masa_magra_kg
    UNIQUE (composicion_corporal_id, segmento)
);
CREATE INDEX idx_composicion_corporal_segmento_padre ON composicion_corporal_segmento(composicion_corporal_id);

-- ==================== EXAMENES (LAB / IMAGEN) ====================

CREATE TABLE tipo_examen_catalogo (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    categoria TEXT NOT NULL, -- laboratorio|imagenologia|otro
    codigo_loinc TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE examen (
    id TEXT PRIMARY KEY,
    organizacion_id TEXT NOT NULL REFERENCES organizacion(id),
    paciente_id TEXT NOT NULL REFERENCES paciente(id),
    consulta_id TEXT NOT NULL REFERENCES consulta(id),
    tipo_examen_id TEXT NOT NULL REFERENCES tipo_examen_catalogo(id),
    fecha_solicitud TEXT NOT NULL,
    fecha_resultado TEXT,
    estado TEXT NOT NULL DEFAULT 'solicitado',
    notas TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT,
    updated_at TEXT,
    updated_by TEXT,
    deleted_at TEXT,
    deleted_by TEXT
);
CREATE INDEX idx_examen_paciente ON examen(paciente_id);
CREATE INDEX idx_examen_consulta ON examen(consulta_id);

CREATE TABLE examen_archivo (
    id TEXT PRIMARY KEY,
    examen_id TEXT NOT NULL REFERENCES examen(id),
    archivo_path TEXT NOT NULL, -- cifrado en disco
    hash_sha256 TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    notas TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT,
    deleted_at TEXT,
    deleted_by TEXT
);
CREATE INDEX idx_examen_archivo_examen ON examen_archivo(examen_id);

CREATE TABLE examen_valor (
    id TEXT PRIMARY KEY,
    examen_id TEXT NOT NULL REFERENCES examen(id),
    analito TEXT NOT NULL,
    valor TEXT NOT NULL,
    unidad TEXT,
    rango_referencia TEXT,
    fuera_rango INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);
CREATE INDEX idx_examen_valor_examen ON examen_valor(examen_id);

-- ==================== TRATAMIENTO / MEDICAMENTOS ====================

CREATE TABLE medicamento_catalogo (
    id TEXT PRIMARY KEY,
    organizacion_id TEXT, -- NULL = catálogo global
    nombre_comercial TEXT NOT NULL,
    principio_activo TEXT NOT NULL,
    presentacion TEXT,
    concentracion TEXT,
    activo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT
);
CREATE INDEX idx_medicamento_catalogo_organizacion ON medicamento_catalogo(organizacion_id);

CREATE TABLE tratamiento (
    id TEXT PRIMARY KEY,
    organizacion_id TEXT NOT NULL REFERENCES organizacion(id),
    consulta_id TEXT NOT NULL UNIQUE REFERENCES consulta(id),
    indicaciones_generales TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT,
    updated_at TEXT,
    updated_by TEXT,
    deleted_at TEXT,
    deleted_by TEXT
);

CREATE TABLE tratamiento_medicamento (
    id TEXT PRIMARY KEY,
    tratamiento_id TEXT NOT NULL REFERENCES tratamiento(id),
    medicamento_id TEXT NOT NULL REFERENCES medicamento_catalogo(id),
    dosis TEXT NOT NULL,
    frecuencia TEXT NOT NULL,
    duracion TEXT,
    via TEXT,
    indicaciones TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);
CREATE INDEX idx_tratamiento_medicamento_tratamiento ON tratamiento_medicamento(tratamiento_id);

-- ==================== ENTREGABLES ====================

-- Plantilla general del consultorio (membrete/pie de página), una fila por organización.
CREATE TABLE plantilla_entregable (
    id TEXT PRIMARY KEY,
    organizacion_id TEXT NOT NULL UNIQUE REFERENCES organizacion(id),
    nombre_consultorio TEXT,
    encabezado TEXT, -- datos del médico, colegiatura, dirección, etc.
    pie_pagina TEXT, -- texto legal / contacto
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT
);

CREATE TABLE entregable (
    id TEXT PRIMARY KEY,
    organizacion_id TEXT NOT NULL REFERENCES organizacion(id),
    paciente_id TEXT NOT NULL REFERENCES paciente(id),
    consulta_id TEXT NOT NULL REFERENCES consulta(id),
    plantilla_id TEXT REFERENCES plantilla_entregable(id),
    tipo TEXT NOT NULL, -- receta|orden_lab|informe|constancia
    titulo TEXT,
    fecha_emision TEXT NOT NULL DEFAULT (datetime('now')),
    archivo_pdf_path TEXT,
    hash_sha256 TEXT,
    firmado INTEGER NOT NULL DEFAULT 0,
    firma_fecha TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT,
    updated_at TEXT,
    updated_by TEXT,
    deleted_at TEXT,
    deleted_by TEXT
);
CREATE INDEX idx_entregable_paciente ON entregable(paciente_id);
CREATE INDEX idx_entregable_consulta ON entregable(consulta_id);

-- Items estructurados del entregable (medicamentos de una receta, exámenes de una orden, párrafos de texto libre).
CREATE TABLE entregable_item (
    id TEXT PRIMARY KEY,
    entregable_id TEXT NOT NULL REFERENCES entregable(id),
    orden INTEGER NOT NULL,
    tipo_item TEXT NOT NULL, -- medicamento|examen|texto
    datos TEXT NOT NULL -- JSON con los campos según tipo_item
);
CREATE INDEX idx_entregable_item_entregable ON entregable_item(entregable_id);

-- ==================== EVOLUCION ====================

CREATE TABLE nota_evolucion (
    id TEXT PRIMARY KEY,
    organizacion_id TEXT NOT NULL REFERENCES organizacion(id),
    consulta_id TEXT NOT NULL REFERENCES consulta(id),
    subjetivo TEXT,
    objetivo TEXT,
    analisis TEXT,
    plan TEXT,
    autor_id TEXT NOT NULL REFERENCES usuario(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_nota_evolucion_consulta ON nota_evolucion(consulta_id);

CREATE TABLE evolucion_evento (
    id TEXT PRIMARY KEY,
    organizacion_id TEXT NOT NULL REFERENCES organizacion(id),
    expediente_id TEXT NOT NULL REFERENCES expediente(id),
    consulta_id TEXT REFERENCES consulta(id),
    tipo_cambio TEXT NOT NULL, -- peso|enfermedad|examen|...
    signo TEXT NOT NULL, -- positivo|negativo|neutro
    valor_anterior TEXT,
    valor_nuevo TEXT,
    descripcion TEXT,
    fecha TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);
CREATE INDEX idx_evolucion_evento_expediente ON evolucion_evento(expediente_id);
