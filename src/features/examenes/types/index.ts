export type EstadoExamen = 'solicitado' | 'resultado';
export type BanderaExamen = 'normal' | 'alto' | 'bajo';

export interface Examen {
  id: string;
  pacienteId: string;
  consultaId: string;
  tipoExamenId: string;
  tipoExamenNombre: string;
  tipoExamenCategoria: string;
  codigoLoinc: string | null;
  grupo: string | null;
  unidad: string | null;
  fechaSolicitud: string;
  fechaResultado: string | null;
  estado: EstadoExamen;
  indicacion: string | null;
  valor: number | null;
  bandera: BanderaExamen | null;
  notas: string | null;
}

export interface CreateExamenPayload {
  pacienteId: string;
  consultaId: string;
  tipoExamenId: string;
  fechaSolicitud: string;
  indicacion?: string | null;
  notas?: string | null;
}

export interface RegistrarResultadoExamenPayload {
  valor: number | null;
  notas?: string | null;
}
