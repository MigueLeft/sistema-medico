import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { antecedentesService } from '../services/antecedentes.service';
import type { CreateAntecedentePayload, CreateIntervencionQxPayload } from '../types';

export const antecedentesKey = (pacienteId: string) => ['antecedentes', pacienteId] as const;
export const intervencionesQxKey = (pacienteId: string) => ['intervenciones-qx', pacienteId] as const;

export function useAntecedentes(pacienteId: string) {
  return useQuery({
    queryKey: antecedentesKey(pacienteId),
    queryFn: () => antecedentesService.getPorPaciente(pacienteId),
    enabled: !!pacienteId,
  });
}

export function useCrearAntecedente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAntecedentePayload) => antecedentesService.create(payload),
    onSuccess: (antecedente) => {
      queryClient.invalidateQueries({ queryKey: antecedentesKey(antecedente.pacienteId) });
      toast.success('Antecedente registrado.');
    },
    onError: (error: Error) => toast.error(error.message || 'Error al registrar el antecedente'),
  });
}

export function useEliminarAntecedente(pacienteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => antecedentesService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: antecedentesKey(pacienteId) });
      toast.success('Antecedente eliminado.');
    },
    onError: (error: Error) => toast.error(error.message || 'Error al eliminar el antecedente'),
  });
}

export function useIntervencionesQx(pacienteId: string) {
  return useQuery({
    queryKey: intervencionesQxKey(pacienteId),
    queryFn: () => antecedentesService.getIntervencionesQxPorPaciente(pacienteId),
    enabled: !!pacienteId,
  });
}

export function useCrearIntervencionQx() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateIntervencionQxPayload) => antecedentesService.createIntervencionQx(payload),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: intervencionesQxKey(item.pacienteId) });
      toast.success('Intervención quirúrgica registrada.');
    },
    onError: (error: Error) => toast.error(error.message || 'Error al registrar la intervención'),
  });
}

export function useEliminarIntervencionQx(pacienteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => antecedentesService.removeIntervencionQx(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: intervencionesQxKey(pacienteId) });
      toast.success('Intervención eliminada.');
    },
    onError: (error: Error) => toast.error(error.message || 'Error al eliminar la intervención'),
  });
}
