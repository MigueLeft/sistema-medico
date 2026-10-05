export type EstadoCita = 'solicitada' | 'agendada' | 'atendida' | 'cancelada';

export interface Cita {
  id: string;
  pacienteId: string;
  pacienteNombre: string;
  medicoId: string;
  fechaHora: string; // ISO datetime
  motivo: string;
  estado: EstadoCita;
}

export interface CreateCitaPayload {
  pacienteId: string;
  fechaHora: string;
  motivo: string;
}
