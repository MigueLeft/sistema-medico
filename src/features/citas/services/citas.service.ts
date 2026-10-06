import { invoke } from '@/lib/tauri';
import type { Cita, CreateCitaPayload, EstadoCita, ReprogramarCitaPayload } from '../types';

export const citasService = {
  /** `desde` y `hasta` en yyyy-MM-dd, ambos inclusive. */
  async getRango(desde: string, hasta: string): Promise<Cita[]> {
    return invoke<Cita[]>('listar_citas', { desde, hasta });
  },

  async getPorPaciente(pacienteId: string): Promise<Cita[]> {
    return invoke<Cita[]>('listar_citas_paciente', { pacienteId });
  },

  async create(payload: CreateCitaPayload): Promise<Cita> {
    return invoke<Cita>('crear_cita', { payload });
  },

  async reprogramar(id: string, payload: ReprogramarCitaPayload): Promise<Cita> {
    return invoke<Cita>('reprogramar_cita', { id, payload });
  },

  async cambiarEstado(id: string, estado: EstadoCita): Promise<Cita> {
    return invoke<Cita>('cambiar_estado_cita', { id, estado });
  },
};
