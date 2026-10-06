import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { pendientesService } from '../services/pendientes.service';
import type { CreatePendientePayload, EstadoPendiente } from '../types';

export const pendientesKey = (pacienteId: string) => ['pendientes', pacienteId] as const;

function invalidar(queryClient: QueryClient, pacienteId: string) {
  queryClient.invalidateQueries({ queryKey: pendientesKey(pacienteId) });
  queryClient.invalidateQueries({ queryKey: ['citas'] });
}

export function usePendientesPaciente(pacienteId: string | undefined) {
  return useQuery({
    queryKey: pendientesKey(pacienteId ?? ''),
    queryFn: () => pendientesService.getPorPaciente(pacienteId!),
    enabled: !!pacienteId,
  });
}

export function useCrearPendiente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePendientePayload) => pendientesService.create(payload),
    onSuccess: (p) => invalidar(queryClient, p.pacienteId),
    onError: (error: Error) => toast.error(error.message || 'Error al agregar el pendiente'),
  });
}

export function useMarcarPendiente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estado, consultaId }: { id: string; estado: EstadoPendiente; consultaId?: string | null }) =>
      pendientesService.marcar(id, estado, consultaId),
    onSuccess: (p) => invalidar(queryClient, p.pacienteId),
    onError: (error: Error) => toast.error(error.message || 'Error al actualizar el pendiente'),
  });
}

export function useAdjuntarPendiente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, archivo, consultaId }: { id: string; archivo: File; consultaId?: string | null }) =>
      pendientesService.adjuntar(id, archivo, consultaId),
    onSuccess: (p) => {
      invalidar(queryClient, p.pacienteId);
      toast.success('Documento cargado.');
    },
    onError: (error: Error) => toast.error(error.message || 'Error al cargar el documento'),
  });
}

export function useAbrirArchivoPendiente() {
  return useMutation({
    mutationFn: (id: string) => pendientesService.abrirArchivo(id),
    onError: (error: Error) => toast.error(error.message || 'Error al abrir el documento'),
  });
}

export function useEliminarPendiente(pacienteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pendientesService.remove(id),
    onSuccess: () => invalidar(queryClient, pacienteId),
    onError: (error: Error) => toast.error(error.message || 'Error al quitar el pendiente'),
  });
}
