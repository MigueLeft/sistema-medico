export type RolNombre = 'medico' | 'asistente' | 'administrador';

export interface Session {
  usuarioId: string;
  organizacionId: string;
  nombreCompleto: string;
  email: string;
  roles: RolNombre[];
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface MedicoSetupPayload {
  nombreOrganizacion: string;
  nombreCompleto: string;
  email: string;
  password: string;
  colegiatura?: string;
  especialidad?: string;
}
