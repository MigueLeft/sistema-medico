import { invoke } from '@/lib/tauri';
import type { GuardarTratamientoPayload, Tratamiento } from '../types';

export const tratamientosService = {
  async getPorConsulta(consultaId: string): Promise<Tratamiento | null> {
    return invoke<Tratamiento | null>('obtener_tratamiento_por_consulta', { consultaId });
  },
  async guardar(payload: GuardarTratamientoPayload): Promise<Tratamiento> {
    return invoke<Tratamiento>('guardar_tratamiento', { payload });
  },
};
