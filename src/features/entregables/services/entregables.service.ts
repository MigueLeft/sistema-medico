import { invoke } from '@/lib/tauri';
import type { CreateEntregablePayload, Entregable, GuardarPlantillaEntregablePayload, PlantillaEntregable } from '../types';

export const entregablesService = {
  async obtenerPlantilla(): Promise<PlantillaEntregable> {
    return invoke<PlantillaEntregable>('obtener_plantilla_entregable');
  },
  async guardarPlantilla(payload: GuardarPlantillaEntregablePayload): Promise<PlantillaEntregable> {
    return invoke<PlantillaEntregable>('guardar_plantilla_entregable', { payload });
  },
  async getPorPaciente(pacienteId: string): Promise<Entregable[]> {
    return invoke<Entregable[]>('listar_entregables_paciente', { pacienteId });
  },
  async create(payload: CreateEntregablePayload): Promise<Entregable> {
    return invoke<Entregable>('crear_entregable', { payload });
  },
  async abrir(id: string): Promise<void> {
    return invoke<void>('abrir_entregable', { id });
  },
};
