import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { examenFisicoService } from '../services/examenFisico.service';
import type { CreateExamenFisicoPayload } from '../types';

export const examenFisicoKey = (pacienteId: string) => ['examen-fisico', pacienteId] as const;

export function useExamenFisicoPaciente(pacienteId: string) {
  return useQuery({
    queryKey: examenFisicoKey(pacienteId),
    queryFn: () => examenFisicoService.getPorPaciente(pacienteId),
    enabled: !!pacienteId,
  });
}

export function useCrearExamenFisico() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateExamenFisicoPayload) => examenFisicoService.create(payload),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: examenFisicoKey(item.pacienteId) });
      toast.success('Examen físico registrado.');
    },
    onError: (error: Error) => toast.error(error.message || 'Error al registrar el examen físico'),
  });
}
