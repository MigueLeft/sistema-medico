import { invoke } from '@/lib/tauri';
import type { CreatePacientePayload, PacienteConExpediente, UpdatePacientePayload } from '../types';

export const patientsService = {
  async getAll(): Promise<PacienteConExpediente[]> {
    return invoke<PacienteConExpediente[]>('listar_pacientes');
  },

  async getOne(id: string): Promise<PacienteConExpediente> {
    return invoke<PacienteConExpediente>('obtener_paciente', { id });
  },

  async create(payload: CreatePacientePayload): Promise<PacienteConExpediente> {
    return invoke<PacienteConExpediente>('crear_paciente', { payload });
  },

  async update(id: string, payload: UpdatePacientePayload): Promise<PacienteConExpediente> {
    return invoke<PacienteConExpediente>('actualizar_paciente', { id, payload });
  },

  async remove(id: string): Promise<void> {
    return invoke<void>('eliminar_paciente', { id });
  },
};
