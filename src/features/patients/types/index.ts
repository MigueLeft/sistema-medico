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
  createdAt: string;
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
  telefono?: string;
  email?: string;
}

export type UpdatePacientePayload = CreatePacientePayload;
