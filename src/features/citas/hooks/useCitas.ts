import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { citasService } from '../services/citas.service';
import type { CreateCitaPayload, EstadoCita, ReprogramarCitaPayload } from '../types';

export const CITAS_KEY = ['citas'] as const;
export const citasRangoKey = (desde: string, hasta: string) => ['citas', 'rango', desde, hasta] as const;
export const citasPacienteKey = (pacienteId: string) => ['citas', 'paciente', pacienteId] as const;

/** Las citas alimentan también el panel de inicio, la lista de pacientes y los contadores de la barra lateral. */
export function invalidarCitas(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: CITAS_KEY });
  queryClient.invalidateQueries({ queryKey: ['nav'] });
  queryClient.invalidateQueries({ queryKey: ['pacientes'] });
}

export function useCitas(desde: string, hasta: string) {
  return useQuery({
    queryKey: citasRangoKey(desde, hasta),
    queryFn: () => citasService.getRango(desde, hasta),
  });
}

export function useCitasPaciente(pacienteId: string | undefined) {
  return useQuery({
    queryKey: citasPacienteKey(pacienteId ?? ''),
    queryFn: () => citasService.getPorPaciente(pacienteId!),
    enabled: !!pacienteId,
  });
}

export function useCrearCita() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCitaPayload) => citasService.create(payload),
    onSuccess: () => {
      invalidarCitas(queryClient);
      toast.success('Cita agendada correctamente.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al agendar la cita');
    },
  });
}

export function useReprogramarCita() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReprogramarCitaPayload }) => citasService.reprogramar(id, payload),
    onSuccess: () => {
      invalidarCitas(queryClient);
      toast.success('Cita reprogramada.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al reprogramar la cita');
    },
  });
}

export function useCambiarEstadoCita() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: EstadoCita }) => citasService.cambiarEstado(id, estado),
    onSuccess: () => {
      invalidarCitas(queryClient);
      toast.success('Estado de la cita actualizado.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al actualizar el estado de la cita');
    },
  });
}
