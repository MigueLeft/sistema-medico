import { addMinutes, getISODay } from 'date-fns';
import type { ConfiguracionAgenda } from '@/features/agenda';
import { aFecha, isoDia } from '@/lib/formato';
import type { Cita } from '../types';

/** "07:30" -> 450 */
export function minutosDe(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** 450 -> "07:30" */
export function hhmmDe(minutos: number): string {
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
}

export function minutosDelDia(fecha: Date): number {
  return fecha.getHours() * 60 + fecha.getMinutes();
}

/** Días con consulta de la configuración, como números ISO (1 = lunes … 7 = domingo). */
export function diasDeAtencion(cfg: ConfiguracionAgenda): number[] {
  return cfg.diasAtencion
    .split(',')
    .map((d) => Number(d.trim()))
    .filter((d) => d >= 1 && d <= 7)
    .sort((a, b) => a - b);
}

export function esDiaDeAtencion(cfg: ConfiguracionAgenda, fecha: Date): boolean {
  return diasDeAtencion(cfg).includes(getISODay(fecha));
}

function enPausa(cfg: ConfiguracionAgenda, inicio: number, fin: number): boolean {
  if (!cfg.pausaInicio || !cfg.pausaFin) return false;
  return inicio < minutosDe(cfg.pausaFin) && fin > minutosDe(cfg.pausaInicio);
}

/** Horas que se pueden elegir al agendar: cada 15 minutos dentro del horario y fuera de la pausa. */
export function opcionesDeHora(cfg: ConfiguracionAgenda): string[] {
  const opciones: string[] = [];
  for (let m = minutosDe(cfg.horaInicio); m < minutosDe(cfg.horaCierre); m += 15) {
    if (!enPausa(cfg, m, m + 15)) opciones.push(hhmmDe(m));
  }
  return opciones;
}

/** Las citas canceladas o sin asistencia no ocupan espacio en la agenda. */
export function ocupaAgenda(cita: Cita): boolean {
  return cita.estado !== 'cancelada' && cita.estado !== 'no_asistio';
}

/** Espacios libres del día, del tamaño de la duración por defecto, que no chocan con citas ni con la pausa. */
export function espaciosLibres(cfg: ConfiguracionAgenda, citasDelDia: Cita[], fecha: Date): Date[] {
  if (!esDiaDeAtencion(cfg, fecha)) return [];
  const paso = Math.max(cfg.duracionDefectoMin, 5);
  const ocupados = citasDelDia.filter(ocupaAgenda).map((c) => {
    const inicio = minutosDelDia(aFecha(c.fechaHora));
    return [inicio, inicio + c.duracionMin] as const;
  });
  const base = aFecha(`${isoDia(fecha)}T00:00:00`);
  const libres: Date[] = [];
  for (let m = minutosDe(cfg.horaInicio); m + paso <= minutosDe(cfg.horaCierre); m += paso) {
    const choca = ocupados.some(([ini, fin]) => m < fin && m + paso > ini);
    if (!choca && !enPausa(cfg, m, m + paso)) libres.push(addMinutes(base, m));
  }
  return libres;
}
