import { invoke } from '@/lib/tauri';
import type { ComposicionCorporal, CreateComposicionCorporalPayload } from '../types';

export const composicionCorporalService = {
  async getPorPaciente(pacienteId: string): Promise<ComposicionCorporal[]> {
    return invoke<ComposicionCorporal[]>('listar_composicion_corporal', { pacienteId });
  },
  async create(payload: CreateComposicionCorporalPayload): Promise<ComposicionCorporal> {
    return invoke<ComposicionCorporal>('crear_composicion_corporal', { payload });
  },
};
