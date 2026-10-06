import type { Concepto, Tono } from '@/components/ui';
import { buscarConceptos } from '@/features/catalogos';
import type { Antecedente, TipoAntecedente } from '../types';

export interface DefGrupoAntecedente {
  tipo: TipoAntecedente;
  /** Ancla de la sección: la usan la historia clínica y la consulta para navegar. */
  ancla: string;
  titulo: string;
  singular: string;
  buscar: (query: string) => Promise<Concepto[]>;
  placeholder: string;
  estados?: Array<{ value: string; label: string }>;
  estadoInicial?: string;
}

export const GRUPOS_ANTECEDENTES: DefGrupoAntecedente[] = [
  {
    tipo: 'personal',
    ancla: 'ant-personales',
    titulo: 'Antecedentes personales',
    singular: 'antecedente personal',
    buscar: buscarConceptos.trastornos,
    placeholder: 'Ej.: hipertensión, diabetes, 59621000',
    estados: [
      { value: 'activo', label: 'Activo' },
      { value: 'resuelto', label: 'Resuelto' },
    ],
    estadoInicial: 'activo',
  },
  {
    tipo: 'familiar',
    ancla: 'ant-familiares',
    titulo: 'Antecedentes familiares',
    singular: 'antecedente familiar',
    buscar: buscarConceptos.trastornos,
    placeholder: 'Ej.: diabetes, infarto de miocardio',
  },
  {
    tipo: 'quirurgico',
    ancla: 'ant-quirurgicos',
    titulo: 'Cirugías y procedimientos',
    singular: 'cirugía o procedimiento',
    buscar: buscarConceptos.procedimientos,
    placeholder: 'Ej.: colecistectomía, cesárea',
    estados: [
      { value: 'resuelto', label: 'Resuelto' },
      { value: 'activo', label: 'En seguimiento' },
    ],
    estadoInicial: 'resuelto',
  },
  {
    tipo: 'hospitalizacion',
    ancla: 'ant-hospitalizaciones',
    titulo: 'Hospitalizaciones',
    singular: 'hospitalización',
    buscar: buscarConceptos.motivosIngreso,
    placeholder: 'Motivo de ingreso. Ej.: neumonía',
    estados: [
      { value: 'resuelto', label: 'Resuelto' },
      { value: 'activo', label: 'En seguimiento' },
    ],
    estadoInicial: 'resuelto',
  },
  {
    tipo: 'alergia',
    ancla: 'ant-alergias',
    titulo: 'Alergias',
    singular: 'alergia',
    buscar: buscarConceptos.terminos('alergia'),
    placeholder: 'Ej.: penicilina, látex, mariscos',
    estados: [
      { value: 'confirmada', label: 'Confirmada' },
      { value: 'referida', label: 'Referida' },
    ],
    estadoInicial: 'referida',
  },
  {
    tipo: 'habito',
    ancla: 'ant-habitos',
    titulo: 'Hábitos',
    singular: 'hábito',
    buscar: buscarConceptos.terminos('habito'),
    placeholder: 'Ej.: tabaquismo, alcohol, actividad física',
  },
];

const ETIQUETA_ESTADO: Record<string, { label: string; tone: Tono }> = {
  activo: { label: 'Activo', tone: 'slate' },
  resuelto: { label: 'Resuelto', tone: 'neutral' },
  confirmada: { label: 'Confirmada', tone: 'danger' },
  referida: { label: 'Referida', tone: 'warning' },
};

export function estadoAntecedente(a: Antecedente): { label: string; tone: Tono } | null {
  return a.estado ? (ETIQUETA_ESTADO[a.estado] ?? { label: a.estado, tone: 'neutral' }) : null;
}

/** Línea de detalle bajo el término, según el tipo de antecedente. */
export function detalleAntecedente(a: Antecedente): string {
  const partes: Array<string | null> = [];
  if (a.tipo === 'familiar') partes.push(a.parentesco);
  if (a.tipo === 'alergia') {
    partes.push(a.reaccion ? `Reacción: ${a.reaccion}` : null);
    partes.push(a.severidad ? `Severidad ${a.severidad}` : null);
  }
  if (a.tipo === 'hospitalizacion') {
    partes.push(a.diasEstancia ? `${a.diasEstancia} ${a.diasEstancia === 1 ? 'día' : 'días'}` : null);
    partes.push(a.centroSalud);
    partes.push(a.servicio);
  }
  if (a.tipo === 'habito') partes.push(a.subcategoria);
  partes.push(a.detalle);
  return partes.filter(Boolean).join(' · ');
}

/** "2021-03" -> "03/2021"; "2019" -> "2019"; fecha completa -> dd/MM/yyyy. */
export function fechaAntecedente(fecha: string | null): string | null {
  if (!fecha) return null;
  const [anio, mes, dia] = fecha.split('-');
  if (dia) return `${dia}/${mes}/${anio}`;
  if (mes) return `${mes}/${anio}`;
  return anio;
}

/** Nombre corto de la alergia para la franja del encabezado: «Alergia a penicilina» -> «Penicilina». */
export function sustanciaAlergia(a: Antecedente): string {
  const sustancia = a.descripcion.replace(/^alergia\s+(a\s+la\s+|a\s+los\s+|a\s+las\s+|al\s+|a\s+)/i, '').trim();
  return sustancia.charAt(0).toUpperCase() + sustancia.slice(1);
}

const sinAcentos = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Devuelve la alergia registrada que choca con el medicamento, comparando sus palabras clave con el texto de la alergia. */
export function alergiaQueChoca(alergenos: string | null, alergias: Antecedente[]): Antecedente | null {
  const claves = (alergenos ?? '')
    .split(',')
    .map((c) => sinAcentos(c.trim()))
    .filter((c) => c.length >= 3);
  if (claves.length === 0) return null;
  return alergias.find((a) => claves.some((c) => sinAcentos(a.descripcion).includes(c))) ?? null;
}
