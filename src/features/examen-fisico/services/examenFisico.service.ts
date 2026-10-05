import { invoke } from '@/lib/tauri';
import type { CreateExamenFisicoPayload, ExamenFisico } from '../types';

export const examenFisicoService = {
  async getPorPaciente(pacienteId: string): Promise<ExamenFisico[]> {
    return invoke<ExamenFisico[]>('listar_examen_fisico', { pacienteId });
  },
  async create(payload: CreateExamenFisicoPayload): Promise<ExamenFisico> {
    return invoke<ExamenFisico>('crear_examen_fisico', { payload });
  },
};
