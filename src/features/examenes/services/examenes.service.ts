import { invoke } from '@/lib/tauri';
import type { CreateExamenPayload, Examen, RegistrarResultadoExamenPayload } from '../types';

export const examenesService = {
  async getPorPaciente(pacienteId: string): Promise<Examen[]> {
    return invoke<Examen[]>('listar_examenes_paciente', { pacienteId });
  },
  async create(payload: CreateExamenPayload): Promise<Examen> {
    return invoke<Examen>('crear_examen', { payload });
  },
  async remove(id: string): Promise<void> {
    return invoke<void>('eliminar_examen', { id });
  },
  async registrarResultado(id: string, payload: RegistrarResultadoExamenPayload): Promise<Examen> {
    return invoke<Examen>('registrar_resultado_examen', { id, payload });
  },
};
