import type { NombreIcono } from '@/components/ui';
import type { BloquePlantilla, ClavePlantilla, Papel, PlantillaDocumento } from '../types';

/** Bloques que el sistema llena solo (mismas claves que `bloque_automatico` en Rust). */
export const BLOQUES_AUTOMATICOS: BloquePlantilla[] = [
  { clave: 'membrete', titulo: 'Membrete', descripcion: 'Configuración › Membrete e impresión', modo: 'automatico' },
  { clave: 'datos_paciente', titulo: 'Datos del paciente', descripcion: 'Nombre, C.I., edad, historia', modo: 'automatico' },
  { clave: 'diagnostico', titulo: 'Diagnóstico', descripcion: 'Diagnóstico principal de la consulta', modo: 'automatico' },
  { clave: 'medicamentos', titulo: 'Récipe', descripcion: 'Medicamentos del tratamiento y cantidad', modo: 'automatico' },
  { clave: 'posologia', titulo: 'Indicaciones', descripcion: 'Cómo tomar cada medicamento', modo: 'automatico' },
  { clave: 'indicaciones_generales', titulo: 'Generales', descripcion: 'Indicaciones generales del tratamiento', modo: 'automatico' },
  { clave: 'pruebas', titulo: 'Pruebas solicitadas', descripcion: 'Paraclínicos de la consulta', modo: 'automatico' },
  { clave: 'preparacion', titulo: 'Preparación', descripcion: 'Indicaciones de preparación', modo: 'automatico' },
  { clave: 'resumen_clinico', titulo: 'Resumen clínico', descripcion: 'Diagnósticos, tratamiento y signos vitales de la consulta', modo: 'automatico' },
  { clave: 'firma', titulo: 'Firma y sello', descripcion: 'Del médico que emite', modo: 'automatico' },
  { clave: 'codigo_verificacion', titulo: 'Código de verificación', descripcion: 'Número del documento', modo: 'automatico' },
];

export const PAPELES: Record<Papel, string> = { carta: 'Carta', media_carta: 'Media carta' };

export const ICONO_PLANTILLA: Record<ClavePlantilla, NombreIcono> = {
  recipe: 'pill',
  orden_lab: 'flask',
  orden_imagen: 'body',
  referencia: 'users',
  indicaciones: 'book',
  informe: 'file',
  constancia: 'calendar',
  otro: 'plus',
};

export function iconoDe(clave: string): NombreIcono {
  return ICONO_PLANTILLA[clave as ClavePlantilla] ?? 'file';
}

export function tieneBloque(plantilla: Pick<PlantillaDocumento, 'bloques'>, ...claves: string[]): boolean {
  return plantilla.bloques.some((b) => claves.includes(b.clave));
}

/** «REC- · Media carta · genera pendientes» */
export function resumenPlantilla(p: PlantillaDocumento): string {
  return [p.prefijo, PAPELES[p.papel], p.generaPendientes ? 'genera pendientes' : null, p.activa ? null : 'inactiva'].filter(Boolean).join(' · ');
}

/** Línea descriptiva de la tarjeta «Nuevo entregable». */
export function descripcionPlantilla(p: PlantillaDocumento): string {
  const base: Partial<Record<ClavePlantilla, string>> = {
    recipe: 'Desde el tratamiento',
    orden_lab: 'Pruebas LOINC',
    orden_imagen: 'Rayos X, eco, TAC',
    referencia: 'A especialista',
    indicaciones: 'Dieta, actividad, cuidados',
    informe: 'Resumen de la consulta',
    constancia: 'Asistencia, reposo laboral',
    otro: 'Plantilla propia',
  };
  return [base[p.clave], p.generaPendientes ? (p.pendienteCuantos === 'uno_por_item' ? 'genera pendientes' : 'genera pendiente') : null].filter(Boolean).join(' · ');
}

/** «Motivo de referencia» -> «motivo_de_referencia»: clave de un bloque de texto nuevo. */
export function claveDeTitulo(titulo: string, existentes: string[]): string {
  const base =
    titulo
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'bloque';
  let clave = base;
  for (let n = 2; existentes.includes(clave) || BLOQUES_AUTOMATICOS.some((b) => b.clave === clave); n += 1) clave = `${base}_${n}`;
  return clave;
}
