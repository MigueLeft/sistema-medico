import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { consultasService } from '../services/consultas.service';
import type { CreateConsultaPayload, UpdateNotasConsultaPayload } from '../types';

export const consultasPorPacienteKey = (pacienteId: string) => ['consultas', 'paciente', pacienteId] as const;
export const consultaKey = (id: string) => ['consultas', id] as const;

export function useConsultasPorPaciente(pacienteId: string | undefined) {
  return useQuery({
    queryKey: consultasPorPacienteKey(pacienteId ?? ''),
    queryFn: () => consultasService.getPorPaciente(pacienteId!),
    enabled: !!pacienteId,
  });
}

export function useConsulta(id: string | undefined) {
  return useQuery({
    queryKey: consultaKey(id ?? ''),
    queryFn: () => consultasService.getOne(id!),
    enabled: !!id,
  });
}

export function useCrearConsulta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateConsultaPayload) => consultasService.create(payload),
    onSuccess: (consulta) => {
      queryClient.invalidateQueries({ queryKey: consultasPorPacienteKey(consulta.pacienteId) });
      queryClient.invalidateQueries({ queryKey: ['citas'] });
      toast.success('Consulta registrada correctamente.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al registrar la consulta');
    },
  });
}

export function useActualizarNotasConsulta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateNotasConsultaPayload }) =>
      consultasService.actualizarNotas(id, payload),
    onSuccess: (consulta) => {
      queryClient.invalidateQueries({ queryKey: consultasPorPacienteKey(consulta.pacienteId) });
      queryClient.invalidateQueries({ queryKey: consultaKey(consulta.id) });
      toast.success('Notas de la consulta actualizadas.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al actualizar las notas');
    },
  });
}
