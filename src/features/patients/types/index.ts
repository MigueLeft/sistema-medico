export type Sexo = 'masculino' | 'femenino' | 'otro';

export interface Paciente {
  id: string;
  organizacionId: string;
  documentoIdentidad: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento: string; // ISO date (yyyy-MM-dd)
  sexo: Sexo;
  telefono: string | null;
  email: string | null;
  estadoCivil: string | null;
  ocupacion: string | null;
  direccion: string | null;
  grupoSanguineo: string | null;
  contactoEmergenciaNombre: string | null;
  contactoEmergenciaParentesco: string | null;
  contactoEmergenciaTelefono: string | null;
  createdAt: string;
  /** Fecha de la consulta más reciente. */
  ultimaConsulta: string | null;
  /** Estado de la cita de hoy cuando el paciente está en sala o en consulta. */
  estadoCitaHoy: 'en_sala' | 'en_consulta' | null;
}

export interface Expediente {
  id: string;
  pacienteId: string;
  codigo: string;
  fechaApertura: string;
}

export interface PacienteConExpediente extends Paciente {
  expediente: Expediente;
}

export interface CreatePacientePayload {
  documentoIdentidad: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento: string;
  sexo: Sexo;
  telefono?: string | null;
  email?: string | null;
  estadoCivil?: string | null;
  ocupacion?: string | null;
  direccion?: string | null;
  grupoSanguineo?: string | null;
  contactoEmergenciaNombre?: string | null;
  contactoEmergenciaParentesco?: string | null;
  contactoEmergenciaTelefono?: string | null;
}

export type UpdatePacientePayload = CreatePacientePayload;
