import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { entregablesService } from '../services/entregables.service';
import type { CreateEntregablePayload, GuardarPlantillaEntregablePayload } from '../types';

export const PLANTILLA_ENTREGABLE_KEY = ['plantilla-entregable'] as const;
export const entregablesPorPacienteKey = (pacienteId: string) => ['entregables', 'paciente', pacienteId] as const;

export function usePlantillaEntregable() {
  return useQuery({
    queryKey: PLANTILLA_ENTREGABLE_KEY,
    queryFn: () => entregablesService.obtenerPlantilla(),
  });
}

export function useGuardarPlantillaEntregable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GuardarPlantillaEntregablePayload) => entregablesService.guardarPlantilla(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLANTILLA_ENTREGABLE_KEY });
      toast.success('Plantilla guardada correctamente.');
    },
    onError: (error: Error) => toast.error(error.message || 'Error al guardar la plantilla'),
  });
}

export function useEntregablesPaciente(pacienteId: string) {
  return useQuery({
    queryKey: entregablesPorPacienteKey(pacienteId),
    queryFn: () => entregablesService.getPorPaciente(pacienteId),
    enabled: !!pacienteId,
  });
}

export function useCrearEntregable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEntregablePayload) => entregablesService.create(payload),
    onSuccess: (entregable) => {
      queryClient.invalidateQueries({ queryKey: entregablesPorPacienteKey(entregable.pacienteId) });
      toast.success('Documento generado correctamente.');
    },
    onError: (error: Error) => toast.error(error.message || 'Error al generar el documento'),
  });
}

export function useAbrirEntregable() {
  return useMutation({
    mutationFn: (id: string) => entregablesService.abrir(id),
    onError: (error: Error) => toast.error(error.message || 'Error al abrir el PDF'),
  });
}
