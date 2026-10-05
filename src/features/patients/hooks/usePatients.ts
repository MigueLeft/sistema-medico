import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { patientsService } from '../services/patients.service';
import type { CreatePacientePayload, UpdatePacientePayload } from '../types';

export const PACIENTES_KEY = ['pacientes'] as const;
export const pacienteKey = (id: string) => ['pacientes', id] as const;

export function usePacientes() {
  return useQuery({
    queryKey: PACIENTES_KEY,
    queryFn: () => patientsService.getAll(),
  });
}

export function usePaciente(id: string | undefined) {
  return useQuery({
    queryKey: pacienteKey(id ?? ''),
    queryFn: () => patientsService.getOne(id!),
    enabled: !!id,
  });
}

export function useCrearPaciente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePacientePayload) => patientsService.create(payload),
    onSuccess: (paciente) => {
      queryClient.invalidateQueries({ queryKey: PACIENTES_KEY });
      toast.success(`Paciente "${paciente.nombres} ${paciente.apellidos}" registrado correctamente.`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al registrar el paciente');
    },
  });
}

export function useActualizarPaciente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePacientePayload }) =>
      patientsService.update(id, payload),
    onSuccess: (paciente) => {
      queryClient.invalidateQueries({ queryKey: PACIENTES_KEY });
      queryClient.invalidateQueries({ queryKey: pacienteKey(paciente.id) });
      toast.success('Paciente actualizado correctamente.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al actualizar el paciente');
    },
  });
}

export function useEliminarPaciente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => patientsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PACIENTES_KEY });
      toast.success('Paciente eliminado correctamente.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al eliminar el paciente');
    },
  });
}
