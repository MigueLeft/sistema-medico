import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { citasService } from '../services/citas.service';
import type { CreateCitaPayload, EstadoCita } from '../types';

export const CITAS_KEY = ['citas'] as const;

export function useCitas() {
  return useQuery({
    queryKey: CITAS_KEY,
    queryFn: () => citasService.getAll(),
  });
}

export function useCrearCita() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCitaPayload) => citasService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CITAS_KEY });
      toast.success('Cita agendada correctamente.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al agendar la cita');
    },
  });
}

export function useCambiarEstadoCita() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: EstadoCita }) => citasService.cambiarEstado(id, estado),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CITAS_KEY });
      toast.success('Estado de la cita actualizado.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al actualizar el estado de la cita');
    },
  });
}
