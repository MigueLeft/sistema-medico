import { invoke } from '@/lib/tauri';
import type { Consulta, CreateConsultaPayload, UpdateNotasConsultaPayload } from '../types';

export const consultasService = {
  async getPorPaciente(pacienteId: string): Promise<Consulta[]> {
    return invoke<Consulta[]>('listar_consultas_por_paciente', { pacienteId });
  },

  async getOne(id: string): Promise<Consulta> {
    return invoke<Consulta>('obtener_consulta', { id });
  },

  async getPorCita(citaId: string): Promise<Consulta | null> {
    return invoke<Consulta | null>('obtener_consulta_por_cita', { citaId });
  },

  async create(payload: CreateConsultaPayload): Promise<Consulta> {
    return invoke<Consulta>('crear_consulta', { payload });
  },

  async actualizarNotas(id: string, payload: UpdateNotasConsultaPayload): Promise<Consulta> {
    return invoke<Consulta>('actualizar_notas_consulta', { id, payload });
  },
};
