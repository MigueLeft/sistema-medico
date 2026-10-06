-- Migración v2 — soporte para las interfaces «Clínica» (agenda, consulta SOAP, historia clínica, catálogos).
-- Se ejecuta una sola vez cuando PRAGMA user_version < 2 (ver db/mod.rs). Mantiene las convenciones de schema.sql.

BEGIN;

-- ==================== PACIENTE ====================

ALTER TABLE paciente ADD COLUMN estado_civil TEXT;
ALTER TABLE paciente ADD COLUMN ocupacion TEXT;
ALTER TABLE paciente ADD COLUMN direccion TEXT;
ALTER TABLE paciente ADD COLUMN grupo_sanguineo TEXT;
ALTER TABLE paciente ADD COLUMN contacto_emergencia_nombre TEXT;
ALTER TABLE paciente ADD COLUMN contacto_emergencia_parentesco TEXT;
ALTER TABLE paciente ADD COLUMN contacto_emergencia_telefono TEXT;

-- ==================== AGENDA ====================

-- Una fila por organización; se crea con valores por defecto la primera vez que se consulta.
CREATE TABLE configuracion_agenda (
    id TEXT PRIMARY KEY,
    organizacion_id TEXT NOT NULL UNIQUE REFERENCES organizacion(id),
    dias_atencion TEXT NOT NULL DEFAULT '1,2,3,4,5,6', -- 1=lunes … 7=domingo
    hora_inicio TEXT NOT NULL DEFAULT '07:00',
    hora_cierre TEXT NOT NULL DEFAULT '17:00',
    pausa_inicio TEXT, -- NULL = sin pausa
    pausa_fin TEXT,
    duracion_defecto_min INTEGER NOT NULL DEFAULT 30,
    permitir_sobrecupos INTEGER NOT NULL DEFAULT 1,
    max_sobrecupos INTEGER NOT NULL DEFAULT 2,
    recordatorio_anticipacion_h INTEGER NOT NULL DEFAULT 24,
    recordatorio_canal TEXT NOT NULL DEFAULT 'whatsapp', -- whatsapp|sms|correo|ninguno
    si_no_confirma TEXT NOT NULL DEFAULT 'por_confirmar', -- por_confirmar|mantener|cancelar
    recordatorio_mensaje TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT,
    updated_by TEXT
);

CREATE TABLE tipo_cita (
    id TEXT PRIMARY KEY,
    organizacion_id TEXT NOT NULL REFERENCES organizacion(id),
    nombre TEXT NOT NULL,
    duracion_min INTEGER NOT NULL DEFAULT 30,
    agendable_por TEXT NOT NULL DEFAULT 'recepcion', -- recepcion|medico
    activo INTEGER NOT NULL DEFAULT 1,
    orden INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT,
    updated_at TEXT,
    updated_by TEXT,
    deleted_at TEXT,
    deleted_by TEXT
);
CREATE INDEX idx_tipo_cita_organizacion ON tipo_cita(organizacion_id);

CREATE TABLE dia_bloqueado (
    id TEXT PRIMARY KEY,
    organizacion_id TEXT NOT NULL REFERENCES organizacion(id),
    fecha TEXT NOT NULL, -- YYYY-MM-DD
    motivo TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT,
    deleted_at TEXT,
    deleted_by TEXT
);
CREATE INDEX idx_dia_bloqueado_fecha ON dia_bloqueado(organizacion_id, fecha);

-- estado: programada|confirmada|por_confirmar|en_sala|en_consulta|atendida|no_asistio|cancelada
ALTER TABLE cita ADD COLUMN duracion_min INTEGER NOT NULL DEFAULT 30;
ALTER TABLE cita ADD COLUMN tipo_cita_id TEXT REFERENCES tipo_cita(id);
ALTER TABLE cita ADD COLUMN enviar_recordatorio INTEGER NOT NULL DEFAULT 0;
UPDATE cita SET estado = 'programada' WHERE estado = 'agendada';
UPDATE cita SET estado = 'por_confirmar' WHERE estado = 'solicitada';

-- ==================== CONSULTA (SOAP) ====================

ALTER TABLE consulta ADD COLUMN tipo_cita_id TEXT REFERENCES tipo_cita(id);
ALTER TABLE consulta ADD COLUMN enfermedad_actual TEXT;
ALTER TABLE consulta ADD COLUMN estado TEXT NOT NULL DEFAULT 'borrador'; -- borrador|cerrada
ALTER TABLE consulta ADD COLUMN cerrada_at TEXT;
ALTER TABLE consulta ADD COLUMN impresion_diagnostica TEXT;
ALTER TABLE consulta ADD COLUMN proximo_control TEXT; -- p. ej. "En 2 semanas"
ALTER TABLE consulta ADD COLUMN proximo_control_tipo_id TEXT REFERENCES tipo_cita(id);
-- Las consultas anteriores a esta versión no tenían borrador: se consideran cerradas.
UPDATE consulta SET estado = 'cerrada', cerrada_at = fecha;

CREATE TABLE consulta_sintoma (
    id TEXT PRIMARY KEY,
    organizacion_id TEXT NOT NULL REFERENCES organizacion(id),
    consulta_id TEXT NOT NULL REFERENCES consulta(id),
    nombre TEXT NOT NULL,
    codigo_snomed TEXT,
    detalle TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT,
    deleted_at TEXT,
    deleted_by TEXT
);
CREATE INDEX idx_consulta_sintoma_consulta ON consulta_sintoma(consulta_id);

CREATE TABLE sistema_corporal_catalogo (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    orden INTEGER NOT NULL DEFAULT 0,
    texto_normal TEXT, -- descripción que se usa al marcar "Normal"
    activo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT
);

CREATE TABLE examen_sistema (
    id TEXT PRIMARY KEY,
    organizacion_id TEXT NOT NULL REFERENCES organizacion(id),
    consulta_id TEXT NOT NULL REFERENCES consulta(id),
    sistema_id TEXT NOT NULL REFERENCES sistema_corporal_catalogo(id),
    estado TEXT NOT NULL, -- normal|hallazgos
    descripcion TEXT,
    codigo_snomed TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT,
    updated_at TEXT,
    updated_by TEXT,
    UNIQUE (consulta_id, sistema_id)
);
CREATE INDEX idx_examen_sistema_consulta ON examen_sistema(consulta_id);

ALTER TABLE examen_fisico ADD COLUMN masa_magra_kg REAL; -- calculado = peso - grasa (kg)

ALTER TABLE consulta_diagnostico ADD COLUMN rol TEXT NOT NULL DEFAULT 'secundario'; -- principal|secundario
ALTER TABLE consulta_diagnostico ADD COLUMN certeza TEXT NOT NULL DEFAULT 'definitivo'; -- definitivo|presuntivo
ALTER TABLE consulta_diagnostico ADD COLUMN nota TEXT;

-- ==================== ANTECEDENTES ====================

-- `antecedente` pasa a cubrir los seis grupos de la historia:
-- tipo: personal|familiar|quirurgico|hospitalizacion|alergia|habito
ALTER TABLE antecedente ADD COLUMN codigo_snomed TEXT;
ALTER TABLE antecedente ADD COLUMN detalle TEXT;
ALTER TABLE antecedente ADD COLUMN fecha TEXT; -- año (YYYY), mes (YYYY-MM) o fecha completa
ALTER TABLE antecedente ADD COLUMN estado TEXT; -- activo|resuelto (personal, quirúrgico, hospitalización) · confirmada|referida (alergia)
ALTER TABLE antecedente ADD COLUMN parentesco TEXT; -- familiar
ALTER TABLE antecedente ADD COLUMN reaccion TEXT; -- alergia
ALTER TABLE antecedente ADD COLUMN severidad TEXT; -- alergia: leve|moderada|grave
ALTER TABLE antecedente ADD COLUMN dias_estancia INTEGER; -- hospitalización
ALTER TABLE antecedente ADD COLUMN centro_salud TEXT; -- hospitalización
ALTER TABLE antecedente ADD COLUMN servicio TEXT; -- hospitalización
ALTER TABLE antecedente ADD COLUMN consulta_id TEXT REFERENCES consulta(id); -- consulta donde se registró

UPDATE antecedente SET tipo = 'habito' WHERE tipo = 'psicobiologico';
UPDATE antecedente SET estado = 'activo' WHERE tipo = 'personal' AND estado IS NULL;

-- Las intervenciones quirúrgicas pasan a ser antecedentes de tipo `quirurgico`
-- (la tabla intervencion_qx se conserva sin uso para no perder el historial original).
INSERT INTO antecedente (id, organizacion_id, paciente_id, tipo, descripcion, detalle, fecha, estado, consulta_id,
                         fecha_registro, created_at, created_by, updated_at, updated_by, deleted_at, deleted_by)
SELECT id, organizacion_id, paciente_id, 'quirurgico', nombre, notas, fecha, 'resuelto', consulta_id,
       created_at, created_at, created_by, updated_at, updated_by, deleted_at, deleted_by
FROM intervencion_qx;

-- ==================== PARACLÍNICOS / PENDIENTES ====================

ALTER TABLE tipo_examen_catalogo ADD COLUMN nombre_mostrar TEXT;
ALTER TABLE tipo_examen_catalogo ADD COLUMN grupo TEXT; -- Hematología, Química, Lípidos, …
ALTER TABLE tipo_examen_catalogo ADD COLUMN unidad TEXT;
ALTER TABLE tipo_examen_catalogo ADD COLUMN ref_min_mujer REAL; -- NULL = sin límite
ALTER TABLE tipo_examen_catalogo ADD COLUMN ref_max_mujer REAL;
ALTER TABLE tipo_examen_catalogo ADD COLUMN ref_min_hombre REAL;
ALTER TABLE tipo_examen_catalogo ADD COLUMN ref_max_hombre REAL;
ALTER TABLE tipo_examen_catalogo ADD COLUMN favorito INTEGER NOT NULL DEFAULT 0;

ALTER TABLE examen ADD COLUMN indicacion TEXT; -- p. ej. "En ayunas"
ALTER TABLE examen ADD COLUMN valor REAL; -- resultado numérico principal
ALTER TABLE examen ADD COLUMN bandera TEXT; -- normal|alto|bajo (según rangos del catálogo)

-- Lo que el paciente debe traer a la próxima consulta (paraclínicos, documentos, registros).
CREATE TABLE pendiente (
    id TEXT PRIMARY KEY,
    organizacion_id TEXT NOT NULL REFERENCES organizacion(id),
    paciente_id TEXT NOT NULL REFERENCES paciente(id),
    consulta_origen_id TEXT REFERENCES consulta(id),
    examen_id TEXT REFERENCES examen(id), -- cuando viene de un paraclínico solicitado
    tipo TEXT NOT NULL, -- paraclinico|documento|registro
    nombre TEXT NOT NULL,
    codigo_loinc TEXT,
    estado TEXT NOT NULL DEFAULT 'pendiente', -- pendiente|entregado|no_entregado (no_entregado sigue abierto)
    consulta_revision_id TEXT REFERENCES consulta(id), -- consulta donde se marcó entregado / no lo trajo
    entregado_at TEXT,
    archivo_path TEXT,
    archivo_nombre TEXT,
    archivo_mime TEXT,
    archivo_bytes INTEGER,
    hash_sha256 TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT,
    updated_at TEXT,
    updated_by TEXT,
    deleted_at TEXT,
    deleted_by TEXT
);
CREATE INDEX idx_pendiente_paciente ON pendiente(paciente_id, estado);
CREATE INDEX idx_pendiente_consulta_origen ON pendiente(consulta_origen_id);

-- ==================== CATÁLOGOS ====================

-- enfermedad_catalogo.version_cie admite ahora 'SCT' para conceptos SNOMED CT (trastornos).
ALTER TABLE enfermedad_catalogo ADD COLUMN sinonimos TEXT;

-- Términos SNOMED CT que no son trastornos: sintoma|alergia|habito
CREATE TABLE termino_catalogo (
    id TEXT PRIMARY KEY,
    categoria TEXT NOT NULL,
    codigo TEXT,
    nombre TEXT NOT NULL,
    etiqueta TEXT, -- p. ej. "hallazgo", "Tabaquismo"
    sinonimos TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT
);
CREATE INDEX idx_termino_catalogo_categoria ON termino_catalogo(categoria);

CREATE TABLE procedimiento_catalogo (
    id TEXT PRIMARY KEY,
    codigo_snomed TEXT,
    nombre TEXT NOT NULL,
    nombre_mostrar TEXT,
    tipo TEXT NOT NULL DEFAULT 'quirurgico', -- diagnostico|quirurgico|terapeutico
    ambito TEXT NOT NULL DEFAULT 'hospitalario', -- consultorio|ambulatorio|hospitalario
    requiere_hospitalizacion INTEGER NOT NULL DEFAULT 0,
    estancia_tipica TEXT,
    sinonimos TEXT,
    favorito INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT
);

CREATE TABLE motivo_ingreso_catalogo (
    id TEXT PRIMARY KEY,
    codigo_snomed TEXT,
    nombre TEXT NOT NULL,
    nombre_mostrar TEXT,
    servicio_habitual TEXT,
    tipo_ingreso TEXT NOT NULL DEFAULT 'urgencia', -- urgencia|programado
    estancia_tipica TEXT,
    favorito INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT
);

CREATE TABLE servicio_hospitalario_catalogo (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT
);

CREATE TABLE centro_salud_catalogo (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    tipo TEXT, -- publico|privado
    ciudad TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT
);

-- Palabras clave separadas por coma para cruzar con las alergias del paciente (p. ej. "amoxicilina,penicilina").
ALTER TABLE medicamento_catalogo ADD COLUMN alergenos TEXT;

-- ==================== DATOS INICIALES ====================
-- Los ids se generan con forma de UUID v4 directamente en SQL.

INSERT INTO sistema_corporal_catalogo (id, nombre, orden, texto_normal)
SELECT lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-a' || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
       column1, column2, column3
FROM (VALUES
    ('Piel y faneras', 1, 'Hidratada, normocoloreada, sin lesiones.'),
    ('Cabeza y cuello', 2, 'Normocéfalo; cuello sin adenopatías ni ingurgitación yugular.'),
    ('Tórax y pulmones', 3, 'Murmullo vesicular conservado, sin agregados.'),
    ('Cardiovascular', 4, 'Ruidos cardíacos rítmicos, sin soplos.'),
    ('Abdomen', 5, 'Blando, depresible, no doloroso, sin visceromegalias.'),
    ('Extremidades', 6, 'Simétricas, sin edema, pulsos presentes.'),
    ('Neurológico', 7, 'Consciente, orientado, sin déficit motor ni sensitivo.')
);

INSERT INTO tipo_examen_catalogo (id, nombre, nombre_mostrar, categoria, codigo_loinc, grupo, unidad,
                                  ref_min_mujer, ref_max_mujer, ref_min_hombre, ref_max_hombre, favorito)
SELECT lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-a' || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
       column1, column2, 'laboratorio', column3, column4, column5, column6, column7, column8, column9, 1
FROM (VALUES
    ('Hemoglobina en sangre', 'Hemoglobina', '718-7', 'Hematología', 'g/dL', 12.0, 15.5, 13.5, 17.5),
    ('Leucocitos en sangre (recuento automatizado)', 'Leucocitos', '6690-2', 'Hematología', '10³/µL', 4.5, 11.0, 4.5, 11.0),
    ('Glucosa en suero o plasma', 'Glucosa en ayunas', '2345-7', 'Química', 'mg/dL', 70, 99, 70, 99),
    ('Hemoglobina A1c/Hemoglobina total en sangre', 'Hemoglobina A1c', '4548-4', 'Química', '%', NULL, 5.6, NULL, 5.6),
    ('Creatinina en suero o plasma', 'Creatinina', '2160-0', 'Química', 'mg/dL', 0.6, 1.1, 0.7, 1.3),
    ('Colesterol total en suero o plasma', 'Colesterol total', '2093-3', 'Lípidos', 'mg/dL', NULL, 199, NULL, 199),
    ('Colesterol HDL en suero o plasma', 'Colesterol HDL', '2085-9', 'Lípidos', 'mg/dL', 50, NULL, 40, NULL),
    ('Triglicéridos en suero o plasma', 'Triglicéridos', '2571-8', 'Lípidos', 'mg/dL', NULL, 149, NULL, 149),
    ('Tirotropina (TSH) en suero o plasma', 'Tirotropina (TSH)', '3016-3', 'Endocrino', 'mUI/L', 0.4, 4.0, 0.4, 4.0)
);

INSERT INTO procedimiento_catalogo (id, codigo_snomed, nombre, tipo, ambito, requiere_hospitalizacion, estancia_tipica, sinonimos, favorito)
SELECT lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-a' || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
       column1, column2, column3, column4, column5, column6, column7, 1
FROM (VALUES
    ('29303009', 'Electrocardiograma', 'diagnostico', 'consultorio', 0, NULL, 'ECG, EKG'),
    ('73761001', 'Colonoscopia', 'diagnostico', 'ambulatorio', 0, NULL, NULL),
    ('45595009', 'Colecistectomía laparoscópica', 'quirurgico', 'hospitalario', 1, '1–2 días', 'Colecistectomía por laparoscopia'),
    ('38102005', 'Colecistectomía', 'quirurgico', 'hospitalario', 1, '2–4 días', NULL),
    ('80146002', 'Apendicectomía', 'quirurgico', 'hospitalario', 1, '1–3 días', NULL),
    ('11466000', 'Cesárea', 'quirurgico', 'hospitalario', 1, '2–3 días', NULL),
    ('236886002', 'Histerectomía', 'quirurgico', 'hospitalario', 1, '2–4 días', NULL),
    ('44558001', 'Herniorrafia inguinal', 'quirurgico', 'ambulatorio', 0, NULL, 'Reparación de hernia inguinal'),
    ('232717009', 'Bypass coronario', 'quirurgico', 'hospitalario', 1, '5–7 días', 'Revascularización coronaria'),
    ('30549001', 'Retiro de puntos de sutura', 'terapeutico', 'consultorio', 0, NULL, NULL)
);

INSERT INTO servicio_hospitalario_catalogo (id, nombre)
SELECT lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-a' || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))), column1
FROM (VALUES ('Medicina interna'), ('Unidad coronaria'), ('Neurología'), ('UCI'), ('Cirugía general'),
             ('Traumatología'), ('Obstetricia'), ('Pediatría'));

INSERT INTO motivo_ingreso_catalogo (id, codigo_snomed, nombre, servicio_habitual, tipo_ingreso, estancia_tipica, favorito)
SELECT lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-a' || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
       column1, column2, column3, 'urgencia', column4, 1
FROM (VALUES
    ('233604007', 'Neumonía', 'Medicina interna', '5–7 días'),
    ('57054005', 'Infarto agudo de miocardio', 'Unidad coronaria', '5–7 días'),
    ('230690007', 'Accidente cerebrovascular', 'Neurología', '7–10 días'),
    ('84114007', 'Insuficiencia cardíaca', 'Medicina interna', '4–6 días'),
    ('420422005', 'Cetoacidosis diabética', 'Medicina interna / UCI', '3–5 días'),
    ('85189001', 'Apendicitis aguda', 'Cirugía general', '1–3 días'),
    ('38362002', 'Dengue', 'Medicina interna', '3–5 días'),
    ('840539006', 'COVID-19', 'Medicina interna', '5–10 días'),
    ('5913000', 'Fractura de cadera', 'Traumatología', '5–8 días')
);

INSERT OR IGNORE INTO enfermedad_catalogo (id, codigo, version_cie, nombre, sinonimos)
SELECT lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-a' || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
       column1, 'SCT', column2, column3
FROM (VALUES
    ('38341003', 'Hipertensión arterial', 'HTA'),
    ('59621000', 'Hipertensión esencial', NULL),
    ('70272006', 'Hipertensión maligna', NULL),
    ('44054006', 'Diabetes mellitus tipo 2', 'DM2'),
    ('46635009', 'Diabetes mellitus tipo 1', 'DM1'),
    ('40930008', 'Hipotiroidismo', NULL),
    ('238131007', 'Sobrepeso', NULL),
    ('414916001', 'Obesidad', NULL),
    ('370992007', 'Dislipidemia', NULL),
    ('13644009', 'Hipercolesterolemia', NULL),
    ('22298006', 'Infarto de miocardio', 'IAM'),
    ('84114007', 'Insuficiencia cardíaca', 'ICC'),
    ('233604007', 'Neumonía', NULL),
    ('195967001', 'Asma', NULL),
    ('13645005', 'Enfermedad pulmonar obstructiva crónica', 'EPOC'),
    ('709044004', 'Enfermedad renal crónica', 'ERC'),
    ('68566005', 'Infección del tracto urinario', 'ITU, infección urinaria'),
    ('4556007', 'Gastritis', NULL),
    ('271737000', 'Anemia', NULL),
    ('37796009', 'Migraña', 'Jaqueca'),
    ('35489007', 'Trastorno depresivo', 'Depresión'),
    ('48694002', 'Ansiedad', NULL),
    ('396275006', 'Artrosis', 'Osteoartritis'),
    ('61582004', 'Rinitis alérgica', NULL)
);

INSERT INTO termino_catalogo (id, categoria, codigo, nombre, etiqueta, sinonimos)
SELECT lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-a' || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
       column1, column2, column3, column4, column5
FROM (VALUES
    ('sintoma', '25064002', 'Cefalea', 'hallazgo', 'Dolor de cabeza'),
    ('sintoma', '404640003', 'Mareo', 'hallazgo', NULL),
    ('sintoma', '246636008', 'Visión borrosa', 'hallazgo', NULL),
    ('sintoma', '29857009', 'Dolor torácico', 'hallazgo', 'Dolor de pecho'),
    ('sintoma', '267036007', 'Disnea', 'hallazgo', 'Dificultad para respirar'),
    ('sintoma', '386661006', 'Fiebre', 'hallazgo', NULL),
    ('sintoma', '49727002', 'Tos', 'hallazgo', NULL),
    ('sintoma', '422587007', 'Náuseas', 'hallazgo', NULL),
    ('sintoma', '422400008', 'Vómito', 'hallazgo', NULL),
    ('sintoma', '21522001', 'Dolor abdominal', 'hallazgo', NULL),
    ('sintoma', '84229001', 'Fatiga', 'hallazgo', 'Cansancio'),
    ('sintoma', '80313002', 'Palpitaciones', 'hallazgo', NULL),
    ('sintoma', '267038008', 'Edema', 'hallazgo', 'Hinchazón'),
    ('sintoma', '62315008', 'Diarrea', 'hallazgo', NULL),
    ('sintoma', '14760008', 'Estreñimiento', 'hallazgo', NULL),
    ('sintoma', '279039007', 'Dolor lumbar', 'hallazgo', 'Lumbalgia'),
    ('sintoma', '193462001', 'Insomnio', 'hallazgo', NULL),
    ('sintoma', '28442001', 'Poliuria', 'hallazgo', NULL),
    ('sintoma', '17173007', 'Polidipsia', 'hallazgo', NULL),
    ('sintoma', '89362005', 'Pérdida de peso', 'hallazgo', NULL),
    ('alergia', '91936005', 'Alergia a penicilina', 'Medicamento', NULL),
    ('alergia', '293586001', 'Alergia a aspirina', 'Medicamento', 'Ácido acetilsalicílico'),
    ('alergia', NULL, 'Alergia a ibuprofeno', 'Medicamento', 'AINE'),
    ('alergia', NULL, 'Alergia a sulfas', 'Medicamento', 'Sulfonamidas'),
    ('alergia', '300916003', 'Alergia al látex', 'Ambiental', NULL),
    ('alergia', '300913006', 'Alergia a mariscos', 'Alimento', NULL),
    ('alergia', '91935009', 'Alergia al maní', 'Alimento', NULL),
    ('alergia', NULL, 'Alergia al medio de contraste yodado', 'Medicamento', NULL),
    ('habito', '8392000', 'No fumador', 'Tabaquismo', 'No fumadora'),
    ('habito', '77176002', 'Fumador', 'Tabaquismo', 'Fumadora'),
    ('habito', '8517006', 'Exfumador', 'Tabaquismo', 'Exfumadora'),
    ('habito', '219006', 'Consumo de alcohol', 'Alcohol', NULL),
    ('habito', '105542008', 'No consume alcohol', 'Alcohol', NULL),
    ('habito', '415510005', 'Sedentarismo', 'Actividad física', NULL),
    ('habito', NULL, 'Actividad física', 'Actividad física', 'Ejercicio')
);

INSERT INTO medicamento_catalogo (id, organizacion_id, nombre_comercial, principio_activo, presentacion, concentracion, alergenos)
SELECT lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-a' || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
       NULL, column1, column1, column2, column3, column4
FROM (VALUES
    ('Losartán potásico', 'Tableta', '50 mg', 'losartán'),
    ('Hidroclorotiazida', 'Tableta', '12,5 mg', 'hidroclorotiazida,sulfa'),
    ('Levotiroxina sódica', 'Tableta', '50 mcg', 'levotiroxina'),
    ('Amoxicilina', 'Cápsula', '500 mg', 'amoxicilina,penicilina'),
    ('Cefalexina', 'Cápsula', '500 mg', 'cefalexina,cefalosporina,penicilina'),
    ('Azitromicina', 'Tableta', '500 mg', 'azitromicina,macrólido'),
    ('Ciprofloxacina', 'Tableta', '500 mg', 'ciprofloxacina,quinolona'),
    ('Metformina', 'Tableta', '850 mg', 'metformina'),
    ('Glibenclamida', 'Tableta', '5 mg', 'glibenclamida,sulfa'),
    ('Atorvastatina', 'Tableta', '20 mg', 'atorvastatina'),
    ('Amlodipino', 'Tableta', '5 mg', 'amlodipino'),
    ('Enalapril', 'Tableta', '10 mg', 'enalapril'),
    ('Omeprazol', 'Cápsula', '20 mg', 'omeprazol'),
    ('Ibuprofeno', 'Tableta', '400 mg', 'ibuprofeno,aine'),
    ('Diclofenac sódico', 'Tableta', '50 mg', 'diclofenac,aine'),
    ('Ácido acetilsalicílico', 'Tableta', '81 mg', 'aspirina,acetilsalicílico,aine'),
    ('Acetaminofén', 'Tableta', '500 mg', 'acetaminofén,paracetamol'),
    ('Loratadina', 'Tableta', '10 mg', 'loratadina'),
    ('Salbutamol', 'Inhalador', '100 mcg/dosis', 'salbutamol'),
    ('Prednisona', 'Tableta', '5 mg', 'prednisona')
);

COMMIT;
