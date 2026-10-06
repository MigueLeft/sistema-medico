import { differenceInYears, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

/** Número con coma decimal (es-VE). Devuelve cadena vacía si no hay valor. */
export function fmtNum(n: number | null | undefined, decimales = 0): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '';
  return Number(n).toLocaleString('es-VE', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}

/** Igual que fmtNum pero sin ceros de relleno: 72,5 · 162 · 0,6 */
export function fmtNumLibre(n: number | null | undefined, maxDecimales = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '';
  return Number(n).toLocaleString('es-VE', { maximumFractionDigits: maxDecimales });
}

/** Acepta coma o punto decimal. */
export function parseNum(valor: string | null | undefined): number | null {
  if (valor === null || valor === undefined || valor.trim() === '') return null;
  const n = parseFloat(valor.replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

/** Las fechas se guardan como texto local sin zona (`YYYY-MM-DDTHH:mm:ss`) o solo fecha. */
export function aFecha(valor: string): Date {
  return parseISO(valor.replace(' ', 'T'));
}

export function isoDia(fecha: Date): string {
  return format(fecha, 'yyyy-MM-dd');
}

export function isoLocal(fecha: Date): string {
  return format(fecha, "yyyy-MM-dd'T'HH:mm:ss");
}

export function hoyIso(): string {
  return isoDia(new Date());
}

/** 05/10/2026 */
export function fechaCorta(valor: string | null | undefined): string {
  if (!valor) return '—';
  return format(aFecha(valor), 'dd/MM/yyyy');
}

/** Lunes 5 de octubre de 2026 */
export function fechaLarga(fecha: Date): string {
  const texto = format(fecha, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** 8:30 (reloj de 12 h, sin sufijo) */
export function horaCorta(valor: string | Date): string {
  return format(typeof valor === 'string' ? aFecha(valor) : valor, 'h:mm');
}

/** 8:30 a. m. */
export function hora12(valor: string | Date): string {
  const fecha = typeof valor === 'string' ? aFecha(valor) : valor;
  return `${format(fecha, 'h:mm')} ${fecha.getHours() < 12 ? 'a. m.' : 'p. m.'}`;
}

/** "07:00" -> "7:00 a. m." */
export function hhmmA12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const fecha = new Date(2000, 0, 1, h, m);
  return hora12(fecha);
}

export function edad(fechaNacimiento: string): number {
  return differenceInYears(new Date(), aFecha(fechaNacimiento));
}

export function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

export function sexoLargo(sexo: string): string {
  if (sexo === 'femenino') return 'Femenino';
  if (sexo === 'masculino') return 'Masculino';
  return 'Otro';
}

export function sexoCorto(sexo: string): string {
  if (sexo === 'femenino') return 'F';
  if (sexo === 'masculino') return 'M';
  return 'O';
}

/** Tamaño de archivo en KB (mínimo 1). */
export function tamanoKb(bytes: number | null | undefined): string {
  if (!bytes) return '';
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
