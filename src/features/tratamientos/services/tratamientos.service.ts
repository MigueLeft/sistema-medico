import { invoke } from '@/lib/tauri';
import type { CreateMedicamentoCatalogoPayload, GuardarTratamientoPayload, MedicamentoCatalogo, Tratamiento } from '../types';

export const tratamientosService = {
  async buscarCatalogoMedicamentos(query: string): Promise<MedicamentoCatalogo[]> {
    return invoke<MedicamentoCatalogo[]>('buscar_catalogo_medicamentos', { query });
  },
  async crearMedicamentoCatalogo(payload: CreateMedicamentoCatalogoPayload): Promise<MedicamentoCatalogo> {
    return invoke<MedicamentoCatalogo>('crear_medicamento_catalogo', { payload });
  },
  async getPorConsulta(consultaId: string): Promise<Tratamiento | null> {
    return invoke<Tratamiento | null>('obtener_tratamiento_por_consulta', { consultaId });
  },
  async guardar(payload: GuardarTratamientoPayload): Promise<Tratamiento> {
    return invoke<Tratamiento>('guardar_tratamiento', { payload });
  },
};
