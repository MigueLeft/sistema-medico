import { invoke } from '@/lib/tauri';
import type { Antecedente, CreateAntecedentePayload, CreateIntervencionQxPayload, IntervencionQx } from '../types';

export const antecedentesService = {
  async getPorPaciente(pacienteId: string): Promise<Antecedente[]> {
    return invoke<Antecedente[]>('listar_antecedentes', { pacienteId });
  },
  async create(payload: CreateAntecedentePayload): Promise<Antecedente> {
    return invoke<Antecedente>('crear_antecedente', { payload });
  },
  async remove(id: string): Promise<void> {
    return invoke<void>('eliminar_antecedente', { id });
  },
  async getIntervencionesQxPorPaciente(pacienteId: string): Promise<IntervencionQx[]> {
    return invoke<IntervencionQx[]>('listar_intervenciones_qx', { pacienteId });
  },
  async createIntervencionQx(payload: CreateIntervencionQxPayload): Promise<IntervencionQx> {
    return invoke<IntervencionQx>('crear_intervencion_qx', { payload });
  },
  async removeIntervencionQx(id: string): Promise<void> {
    return invoke<void>('eliminar_intervencion_qx', { id });
  },
};
