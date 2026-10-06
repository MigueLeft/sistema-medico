import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { antecedentesService } from '../services/antecedentes.service';
import type { GuardarAntecedentePayload } from '../types';

export const antecedentesKey = (pacienteId: string) => ['antecedentes', pacienteId] as const;

export function useAntecedentes(pacienteId: string | undefined) {
  return useQuery({
    queryKey: antecedentesKey(pacienteId ?? ''),
    queryFn: () => antecedentesService.getPorPaciente(pacienteId!),
    enabled: !!pacienteId,
  });
}

export function useGuardarAntecedente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | null; payload: GuardarAntecedentePayload }) =>
      id ? antecedentesService.update(id, payload) : antecedentesService.create(payload),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: antecedentesKey(item.pacienteId) });
      toast.success('Antecedente guardado en la historia.');
    },
    onError: (error: Error) => toast.error(error.message || 'Error al guardar el antecedente'),
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
