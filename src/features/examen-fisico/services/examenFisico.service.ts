import { invoke } from '@/lib/tauri';
import type { ExamenFisico, GuardarExamenFisicoPayload } from '../types';

export const examenFisicoService = {
  async getPorPaciente(pacienteId: string): Promise<ExamenFisico[]> {
    return invoke<ExamenFisico[]>('listar_examen_fisico', { pacienteId });
  },
  async getPorConsulta(consultaId: string): Promise<ExamenFisico | null> {
    return invoke<ExamenFisico | null>('obtener_examen_fisico_consulta', { consultaId });
  },
  /** Crea las mediciones de la consulta la primera vez y las actualiza después. */
  async guardar(payload: GuardarExamenFisicoPayload): Promise<ExamenFisico> {
    return invoke<ExamenFisico>('guardar_examen_fisico', { payload });
  },
};
