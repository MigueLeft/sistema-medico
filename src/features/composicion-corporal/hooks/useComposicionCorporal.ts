import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { composicionCorporalService } from '../services/composicionCorporal.service';
import type { CreateComposicionCorporalPayload } from '../types';

export const composicionCorporalKey = (pacienteId: string) => ['composicion-corporal', pacienteId] as const;

export function useComposicionCorporalPaciente(pacienteId: string) {
  return useQuery({
    queryKey: composicionCorporalKey(pacienteId),
    queryFn: () => composicionCorporalService.getPorPaciente(pacienteId),
    enabled: !!pacienteId,
  });
}

export function useCrearComposicionCorporal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateComposicionCorporalPayload) => composicionCorporalService.create(payload),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: composicionCorporalKey(item.pacienteId) });
      toast.success('Composición corporal registrada.');
    },
    onError: (error: Error) => toast.error(error.message || 'Error al registrar la composición corporal'),
  });
}
