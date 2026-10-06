-- Migración v3 — entregables por plantilla: cada tipo de documento (récipe, orden de laboratorio, referencia…)
-- es una plantilla configurable; los entregables se numeran, pasan por borrador -> emitido y generan pendientes.

BEGIN;

-- Tipo de documento que el consultorio emite. Las plantillas iniciales se crean por organización la primera
-- vez que se consultan. (`plantilla_entregable` sigue siendo el membrete común a todos los documentos.)
CREATE TABLE plantilla_documento (
    id TEXT PRIMARY KEY,
    organizacion_id TEXT NOT NULL REFERENCES organizacion(id),
    clave TEXT NOT NULL, -- recipe|orden_lab|orden_imagen|referencia|indicaciones|informe|constancia|otro (decide el editor)
    nombre TEXT NOT NULL,
    prefijo TEXT NOT NULL, -- numeración: REC-, LAB-, …
    siguiente_numero INTEGER NOT NULL DEFAULT 1,
    papel TEXT NOT NULL DEFAULT 'carta', -- carta|media_carta
    bloques TEXT NOT NULL DEFAULT '[]', -- JSON: [{clave, titulo, descripcion, modo: automatico|texto}] en orden de impresión
    genera_pendientes INTEGER NOT NULL DEFAULT 0,
    pendiente_tipo TEXT NOT NULL DEFAULT 'documento', -- paraclinico|documento|registro
    pendiente_cuantos TEXT NOT NULL DEFAULT 'uno_por_documento', -- uno_por_documento|uno_por_item
    pendiente_texto TEXT, -- admite {clave_de_bloque}, p. ej. "Informe de {especialidad}"
    entrega_imprimir INTEGER NOT NULL DEFAULT 1,
    entrega_whatsapp INTEGER NOT NULL DEFAULT 0,
    entrega_correo INTEGER NOT NULL DEFAULT 0,
    requiere_firma INTEGER NOT NULL DEFAULT 1,
    activa INTEGER NOT NULL DEFAULT 1,
    orden INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT,
    updated_at TEXT,
    updated_by TEXT,
    deleted_at TEXT,
    deleted_by TEXT
);
CREATE INDEX idx_plantilla_documento_organizacion ON plantilla_documento(organizacion_id);

-- `entregable.tipo` guarda ahora la clave de la plantilla.
ALTER TABLE entregable ADD COLUMN plantilla_documento_id TEXT REFERENCES plantilla_documento(id);
ALTER TABLE entregable ADD COLUMN numero TEXT; -- prefijo + correlativo, p. ej. LAB-000124
ALTER TABLE entregable ADD COLUMN estado TEXT NOT NULL DEFAULT 'emitido'; -- borrador|emitido
ALTER TABLE entregable ADD COLUMN datos TEXT NOT NULL DEFAULT '{}'; -- JSON con los campos del documento que no son items
ALTER TABLE entregable ADD COLUMN emitido_at TEXT;
-- Los documentos anteriores a esta versión se generaban ya emitidos.
UPDATE entregable SET emitido_at = fecha_emision;

ALTER TABLE pendiente ADD COLUMN entregable_id TEXT REFERENCES entregable(id); -- documento que lo generó
CREATE INDEX idx_pendiente_entregable ON pendiente(entregable_id);

COMMIT;
