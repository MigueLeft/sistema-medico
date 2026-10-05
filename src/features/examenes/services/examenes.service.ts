import { invoke } from '@/lib/tauri';
import type {
  ActualizarResultadoExamenPayload,
  CreateExamenPayload,
  CreateExamenValorPayload,
  CreateTipoExamenCatalogoPayload,
  Examen,
  ExamenValor,
  TipoExamenCatalogo,
} from '../types';

export const examenesService = {
  async buscarCatalogoTipos(query: string): Promise<TipoExamenCatalogo[]> {
    return invoke<TipoExamenCatalogo[]>('buscar_catalogo_tipos_examen', { query });
  },
  async crearTipoCatalogo(payload: CreateTipoExamenCatalogoPayload): Promise<TipoExamenCatalogo> {
    return invoke<TipoExamenCatalogo>('crear_tipo_examen_catalogo', { payload });
  },
  async getPorPaciente(pacienteId: string): Promise<Examen[]> {
    return invoke<Examen[]>('listar_examenes_paciente', { pacienteId });
  },
  async create(payload: CreateExamenPayload): Promise<Examen> {
    return invoke<Examen>('crear_examen', { payload });
  },
  async actualizarResultado(id: string, payload: ActualizarResultadoExamenPayload): Promise<Examen> {
    return invoke<Examen>('actualizar_resultado_examen', { id, payload });
  },
  async getValores(examenId: string): Promise<ExamenValor[]> {
    return invoke<ExamenValor[]>('listar_valores_examen', { examenId });
  },
  async agregarValor(payload: CreateExamenValorPayload): Promise<ExamenValor> {
    return invoke<ExamenValor>('agregar_valor_examen', { payload });
  },
};
