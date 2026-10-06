import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboard.service';

export const DASHBOARD_KEY = ['dashboard'] as const;
export const CONTADORES_NAV_KEY = ['nav', 'contadores'] as const;

export function useDashboard() {
  return useQuery({ queryKey: DASHBOARD_KEY, queryFn: () => dashboardService.obtener() });
}

export function useContadoresNav() {
  return useQuery({ queryKey: CONTADORES_NAV_KEY, queryFn: () => dashboardService.contadoresNav() });
}
