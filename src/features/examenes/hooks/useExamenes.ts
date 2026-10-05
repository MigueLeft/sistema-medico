import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { examenesService } from '../services/examenes.service';
import type { ActualizarResultadoExamenPayload, CreateExamenPayload, CreateExamenValorPayload, CreateTipoExamenCatalogoPayload } from '../types';

export const examenesPacienteKey = (pacienteId: string) => ['examenes', 'paciente', pacienteId] as const;
export const valoresExamenKey = (examenId: string) => ['examenes', 'valores', examenId] as const;

export function useCatalogoTiposExamen(query: string) {
  return useQuery({
    queryKey: ['catalogo-tipos-examen', query],
    queryFn: () => examenesService.buscarCatalogoTipos(query),
    enabled: query.trim().length >= 2,
  });
}

export function useCrearTipoExamenCatalogo() {
  return useMutation({
    mutationFn: (payload: CreateTipoExamenCatalogoPayload) => examenesService.crearTipoCatalogo(payload),
    onError: (error: Error) => toast.error(error.message || 'Error al crear el tipo de examen'),
  });
}

export function useExamenesPaciente(pacienteId: string) {
  return useQuery({
    queryKey: examenesPacienteKey(pacienteId),
    queryFn: () => examenesService.getPorPaciente(pacienteId),
    enabled: !!pacienteId,
  });
}

export function useCrearExamen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateExamenPayload) => examenesService.create(payload),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: examenesPacienteKey(item.pacienteId) });
      toast.success('Examen solicitado.');
    },
    onError: (error: Error) => toast.error(error.message || 'Error al solicitar el examen'),
  });
}

export function useActualizarResultadoExamen(pacienteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ActualizarResultadoExamenPayload }) =>
      examenesService.actualizarResultado(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examenesPacienteKey(pacienteId) });
      toast.success('Resultado del examen actualizado.');
    },
    onError: (error: Error) => toast.error(error.message || 'Error al actualizar el resultado'),
  });
}

export function useValoresExamen(examenId: string | undefined) {
  return useQuery({
    queryKey: valoresExamenKey(examenId ?? ''),
    queryFn: () => examenesService.getValores(examenId!),
    enabled: !!examenId,
  });
}

export function useAgregarValorExamen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateExamenValorPayload) => examenesService.agregarValor(payload),
    onSuccess: (valor) => {
      queryClient.invalidateQueries({ queryKey: valoresExamenKey(valor.examenId) });
    },
    onError: (error: Error) => toast.error(error.message || 'Error al agregar el valor'),
  });
}
