import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { enfermedadesService } from '../services/enfermedades.service';
import type { CreateDiagnosticoPayload, CreateEnfermedadCatalogoPayload } from '../types';

export const enfermedadesPacienteKey = (pacienteId: string) => ['enfermedades', 'paciente', pacienteId] as const;

export function useCatalogoEnfermedades(query: string) {
  return useQuery({
    queryKey: ['catalogo-enfermedades', query],
    queryFn: () => enfermedadesService.buscarCatalogo(query),
    enabled: query.trim().length >= 2,
  });
}

export function useCrearEnfermedadCatalogo() {
  return useMutation({
    mutationFn: (payload: CreateEnfermedadCatalogoPayload) => enfermedadesService.crearCatalogo(payload),
    onError: (error: Error) => toast.error(error.message || 'Error al crear la enfermedad en el catálogo'),
  });
}

export function useEnfermedadesPaciente(pacienteId: string) {
  return useQuery({
    queryKey: enfermedadesPacienteKey(pacienteId),
    queryFn: () => enfermedadesService.getPorPaciente(pacienteId),
    enabled: !!pacienteId,
  });
}

export function useCrearDiagnostico() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDiagnosticoPayload) => enfermedadesService.crearDiagnostico(payload),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: enfermedadesPacienteKey(item.pacienteId) });
      toast.success('Diagnóstico registrado.');
    },
    onError: (error: Error) => toast.error(error.message || 'Error al registrar el diagnóstico'),
  });
}

export function useMarcarEnfermedadResuelta(pacienteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fechaResolucion }: { id: string; fechaResolucion: string }) =>
      enfermedadesService.marcarResuelta(id, fechaResolucion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: enfermedadesPacienteKey(pacienteId) });
      toast.success('Diagnóstico marcado como resuelto.');
    },
    onError: (error: Error) => toast.error(error.message || 'Error al actualizar el diagnóstico'),
  });
}
