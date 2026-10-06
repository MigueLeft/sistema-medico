import { invoke } from '@/lib/tauri';
import type { Antecedente, GuardarAntecedentePayload } from '../types';

export const antecedentesService = {
  async getPorPaciente(pacienteId: string): Promise<Antecedente[]> {
    return invoke<Antecedente[]>('listar_antecedentes', { pacienteId });
  },
  async create(payload: GuardarAntecedentePayload): Promise<Antecedente> {
    return invoke<Antecedente>('crear_antecedente', { payload });
  },
  async update(id: string, payload: GuardarAntecedentePayload): Promise<Antecedente> {
    return invoke<Antecedente>('actualizar_antecedente', { id, payload });
  },
  async remove(id: string): Promise<void> {
    return invoke<void>('eliminar_antecedente', { id });
  },
};
