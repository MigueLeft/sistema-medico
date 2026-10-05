import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { authService } from '../services/auth.service';
import type { LoginPayload, MedicoSetupPayload } from '../types';

export const SESION_KEY = ['sesion-actual'] as const;
export const HAY_USUARIOS_KEY = ['hay-usuarios'] as const;

export function useHaySistemaConfigurado() {
  return useQuery({
    queryKey: HAY_USUARIOS_KEY,
    queryFn: () => authService.haySistemaConfigurado(),
  });
}

export function useSesionActual() {
  return useQuery({
    queryKey: SESION_KEY,
    queryFn: () => authService.sesionActual(),
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: LoginPayload) => authService.login(payload),
    onSuccess: (session) => {
      queryClient.setQueryData(SESION_KEY, session);
      toast.success(`Bienvenido, ${session.nombreCompleto}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Credenciales inválidas');
    },
  });
}

export function useCrearOrganizacionInicial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: MedicoSetupPayload) => authService.crearOrganizacionInicial(payload),
    onSuccess: () => {
      toast.success('Cuenta creada correctamente. Ahora inicia sesión.');
      queryClient.invalidateQueries({ queryKey: HAY_USUARIOS_KEY });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'No se pudo crear la cuenta inicial');
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      queryClient.setQueryData(SESION_KEY, null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al cerrar sesión');
    },
  });
}
