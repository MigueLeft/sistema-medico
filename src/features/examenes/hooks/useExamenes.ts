import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { examenesService } from '../services/examenes.service';
import type { CreateExamenPayload, RegistrarResultadoExamenPayload } from '../types';

export const examenesKey = (pacienteId: string) => ['examenes', pacienteId] as const;

/** Solicitar o recibir un paraclínico también mueve los pendientes del paciente y el panel de inicio. */
function invalidar(queryClient: QueryClient, pacienteId: string) {
  queryClient.invalidateQueries({ queryKey: examenesKey(pacienteId) });
  queryClient.invalidateQueries({ queryKey: ['pendientes', pacienteId] });
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
}

export function useExamenesPaciente(pacienteId: string | undefined) {
  return useQuery({
    queryKey: examenesKey(pacienteId ?? ''),
    queryFn: () => examenesService.getPorPaciente(pacienteId!),
    enabled: !!pacienteId,
  });
}

export function useCrearExamen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateExamenPayload) => examenesService.create(payload),
    onSuccess: (examen) => invalidar(queryClient, examen.pacienteId),
    onError: (error: Error) => toast.error(error.message || 'Error al solicitar el paraclínico'),
  });
}

export function useEliminarExamen(pacienteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => examenesService.remove(id),
    onSuccess: () => invalidar(queryClient, pacienteId),
    onError: (error: Error) => toast.error(error.message || 'Error al retirar el paraclínico'),
  });
}

export function useRegistrarResultadoExamen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RegistrarResultadoExamenPayload }) => examenesService.registrarResultado(id, payload),
    onSuccess: (examen) => {
      invalidar(queryClient, examen.pacienteId);
      toast.success('Resultado registrado.');
    },
    onError: (error: Error) => toast.error(error.message || 'Error al registrar el resultado'),
  });
}
