import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { tratamientosService } from '../services/tratamientos.service';
import type { CreateMedicamentoCatalogoPayload, GuardarTratamientoPayload } from '../types';

export const tratamientoPorConsultaKey = (consultaId: string) => ['tratamiento', 'consulta', consultaId] as const;

export function useCatalogoMedicamentos(query: string) {
  return useQuery({
    queryKey: ['catalogo-medicamentos', query],
    queryFn: () => tratamientosService.buscarCatalogoMedicamentos(query),
    enabled: query.trim().length >= 2,
  });
}

export function useCrearMedicamentoCatalogo() {
  return useMutation({
    mutationFn: (payload: CreateMedicamentoCatalogoPayload) => tratamientosService.crearMedicamentoCatalogo(payload),
    onError: (error: Error) => toast.error(error.message || 'Error al crear el medicamento'),
  });
}

export function useTratamientoPorConsulta(consultaId: string | undefined) {
  return useQuery({
    queryKey: tratamientoPorConsultaKey(consultaId ?? ''),
    queryFn: () => tratamientosService.getPorConsulta(consultaId!),
    enabled: !!consultaId,
  });
}

export function useGuardarTratamiento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GuardarTratamientoPayload) => tratamientosService.guardar(payload),
    onSuccess: (tratamiento) => {
      queryClient.invalidateQueries({ queryKey: tratamientoPorConsultaKey(tratamiento.consultaId) });
      toast.success('Tratamiento guardado.');
    },
    onError: (error: Error) => toast.error(error.message || 'Error al guardar el tratamiento'),
  });
}
