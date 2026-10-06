import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { examenFisicoService } from '../services/examenFisico.service';
import type { GuardarExamenFisicoPayload } from '../types';

export const examenFisicoKey = (pacienteId: string) => ['examen-fisico', pacienteId] as const;
export const examenFisicoConsultaKey = (consultaId: string) => ['examen-fisico', 'consulta', consultaId] as const;

export function useExamenFisicoPaciente(pacienteId: string | undefined) {
  return useQuery({
    queryKey: examenFisicoKey(pacienteId ?? ''),
    queryFn: () => examenFisicoService.getPorPaciente(pacienteId!),
    enabled: !!pacienteId,
  });
}

export function useExamenFisicoConsulta(consultaId: string) {
  return useQuery({
    queryKey: examenFisicoConsultaKey(consultaId),
    queryFn: () => examenFisicoService.getPorConsulta(consultaId),
  });
}

export function useGuardarExamenFisico() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GuardarExamenFisicoPayload) => examenFisicoService.guardar(payload),
    onSuccess: (item) => {
      queryClient.setQueryData(examenFisicoConsultaKey(item.consultaId), item);
      queryClient.invalidateQueries({ queryKey: examenFisicoKey(item.pacienteId) });
    },
    onError: (error: Error) => toast.error(error.message || 'Error al guardar las mediciones'),
  });
}
