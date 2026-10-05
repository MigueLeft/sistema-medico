import { invoke } from '@/lib/tauri';
import type { LoginPayload, MedicoSetupPayload, Session } from '../types';

export const authService = {
  async haySistemaConfigurado(): Promise<boolean> {
    return invoke<boolean>('hay_usuarios');
  },

  async crearOrganizacionInicial(payload: MedicoSetupPayload): Promise<void> {
    return invoke<void>('crear_organizacion_inicial', { payload });
  },

  async login(payload: LoginPayload): Promise<Session> {
    return invoke<Session>('login', { payload });
  },

  async logout(): Promise<void> {
    return invoke<void>('logout');
  },

  async sesionActual(): Promise<Session | null> {
    return invoke<Session | null>('sesion_actual');
  },
};
