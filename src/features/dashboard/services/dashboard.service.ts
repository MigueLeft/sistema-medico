import { invoke } from '@/lib/tauri';
import type { ContadoresNav, Dashboard } from '../types';

export const dashboardService = {
  async obtener(): Promise<Dashboard> {
    return invoke<Dashboard>('obtener_dashboard');
  },
  async contadoresNav(): Promise<ContadoresNav> {
    return invoke<ContadoresNav>('obtener_contadores_nav');
  },
};
