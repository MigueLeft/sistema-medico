export type EstadoCita =
  | 'programada'
  | 'confirmada'
  | 'por_confirmar'
  | 'en_sala'
  | 'en_consulta'
  | 'atendida'
  | 'no_asistio'
  | 'cancelada';

export interface Cita {
  id: string;
  pacienteId: string;
  pacienteNombre: string;
  /** «M. Rojas»: para las vistas compactas de la agenda. */
  pacienteNombreCorto: string;
  pacienteDocumento: string;
  pacienteTelefono: string | null;
  pacienteFechaNacimiento: string;
  expedienteCodigo: string;
  medicoId: string;
  medicoNombre: string;
  fechaHora: string; // local, yyyy-MM-ddTHH:mm:ss
  duracionMin: number;
  tipoCitaId: string | null;
  tipoCitaNombre: string | null;
  motivo: string;
  estado: EstadoCita;
  enviarRecordatorio: boolean;
  /** Consulta abierta o cerrada a partir de esta cita. */
  consultaId: string | null;
  ultimaConsulta: string | null;
  pendientesAbiertos: number;
}

export interface CreateCitaPayload {
  pacienteId: string;
  fechaHora: string;
  duracionMin?: number;
  tipoCitaId?: string | null;
  motivo: string;
  enviarRecordatorio?: boolean;
}

export interface ReprogramarCitaPayload {
  fechaHora: string;
  duracionMin?: number;
}
