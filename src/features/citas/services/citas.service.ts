import { invoke } from '@/lib/tauri';
import type { Cita, CreateCitaPayload, EstadoCita } from '../types';

export const citasService = {
  async getAll(): Promise<Cita[]> {
    return invoke<Cita[]>('listar_citas');
  },

  async create(payload: CreateCitaPayload): Promise<Cita> {
    return invoke<Cita>('crear_cita', { payload });
  },

  async cambiarEstado(id: string, estado: EstadoCita): Promise<Cita> {
    return invoke<Cita>('cambiar_estado_cita', { id, estado });
  },
};
