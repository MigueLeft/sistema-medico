import { invoke } from '@/lib/tauri';
import type {
  Entregable,
  GuardarEntregablePayload,
  GuardarPlantillaDocumentoPayload,
  GuardarPlantillaEntregablePayload,
  PlantillaDocumento,
  PlantillaEntregable,
} from '../types';

export const entregablesService = {
  async obtenerPlantilla(): Promise<PlantillaEntregable> {
    return invoke<PlantillaEntregable>('obtener_plantilla_entregable');
  },
  async guardarPlantilla(payload: GuardarPlantillaEntregablePayload): Promise<PlantillaEntregable> {
    return invoke<PlantillaEntregable>('guardar_plantilla_entregable', { payload });
  },
  async listarPlantillasDocumento(): Promise<PlantillaDocumento[]> {
    return invoke<PlantillaDocumento[]>('listar_plantillas_documento');
  },
  /** `id` nulo crea una plantilla nueva. */
  async guardarPlantillaDocumento(id: string | null, payload: GuardarPlantillaDocumentoPayload): Promise<PlantillaDocumento> {
    return invoke<PlantillaDocumento>('guardar_plantilla_documento', { id, payload });
  },
  async getPorPaciente(pacienteId: string): Promise<Entregable[]> {
    return invoke<Entregable[]>('listar_entregables_paciente', { pacienteId });
  },
  async getPorConsulta(consultaId: string): Promise<Entregable[]> {
    return invoke<Entregable[]>('listar_entregables_consulta', { consultaId });
  },
  async getOne(id: string): Promise<Entregable> {
    return invoke<Entregable>('obtener_entregable', { id });
  },
  /** Crea un borrador numerado, precargado con lo registrado en la consulta. */
  async create(consultaId: string, plantillaDocumentoId: string): Promise<Entregable> {
    return invoke<Entregable>('crear_entregable', { payload: { consultaId, plantillaDocumentoId } });
  },
  async guardar(id: string, payload: GuardarEntregablePayload): Promise<Entregable> {
    return invoke<Entregable>('guardar_entregable', { id, payload });
  },
  /** Genera el PDF definitivo y crea los pendientes de la plantilla. */
  async emitir(id: string): Promise<Entregable> {
    return invoke<Entregable>('emitir_entregable', { id });
  },
  /** Descarta un borrador. */
  async remove(id: string): Promise<void> {
    return invoke<void>('eliminar_entregable', { id });
  },
  /** Abre el PDF en el visor del sistema; de un borrador genera una vista previa. */
  async abrir(id: string): Promise<void> {
    return invoke<void>('abrir_entregable', { id });
  },
};
