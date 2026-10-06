import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { entregablesService } from '../services/entregables.service';
import type { Entregable, GuardarEntregablePayload, GuardarPlantillaDocumentoPayload, GuardarPlantillaEntregablePayload } from '../types';

export const PLANTILLA_ENTREGABLE_KEY = ['plantilla-entregable'] as const;
export const PLANTILLAS_DOCUMENTO_KEY = ['plantillas-documento'] as const;
export const ENTREGABLES_KEY = ['entregables'] as const;
export const entregablesPorPacienteKey = (pacienteId: string) => ['entregables', 'paciente', pacienteId] as const;
export const entregablesPorConsultaKey = (consultaId: string) => ['entregables', 'consulta', consultaId] as const;
export const entregableKey = (id: string) => ['entregables', 'uno', id] as const;

/** Emitir un documento puede crear pendientes y paraclínicos, además de cambiar las listas de entregables. */
function invalidar(queryClient: QueryClient, entregable?: Entregable) {
  queryClient.invalidateQueries({ queryKey: ENTREGABLES_KEY });
  queryClient.invalidateQueries({ queryKey: PLANTILLAS_DOCUMENTO_KEY });
  if (entregable) {
    queryClient.invalidateQueries({ queryKey: ['pendientes', entregable.pacienteId] });
    queryClient.invalidateQueries({ queryKey: ['examenes', entregable.pacienteId] });
    queryClient.invalidateQueries({ queryKey: ['citas'] });
  }
}

export function usePlantillaEntregable() {
  return useQuery({
    queryKey: PLANTILLA_ENTREGABLE_KEY,
    queryFn: () => entregablesService.obtenerPlantilla(),
  });
}

export function useGuardarPlantillaEntregable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GuardarPlantillaEntregablePayload) => entregablesService.guardarPlantilla(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLANTILLA_ENTREGABLE_KEY });
      toast.success('Membrete guardado correctamente.');
    },
    onError: (error: Error) => toast.error(error.message || 'Error al guardar el membrete'),
  });
}

export function usePlantillasDocumento() {
  return useQuery({
    queryKey: PLANTILLAS_DOCUMENTO_KEY,
    queryFn: () => entregablesService.listarPlantillasDocumento(),
  });
}

export function useGuardarPlantillaDocumento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | null; payload: GuardarPlantillaDocumentoPayload }) =>
      entregablesService.guardarPlantillaDocumento(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLANTILLAS_DOCUMENTO_KEY });
      toast.success('Plantilla guardada.');
    },
    onError: (error: Error) => toast.error(error.message || 'Error al guardar la plantilla'),
  });
}

export function useEntregablesPaciente(pacienteId: string) {
  return useQuery({
    queryKey: entregablesPorPacienteKey(pacienteId),
    queryFn: () => entregablesService.getPorPaciente(pacienteId),
    enabled: !!pacienteId,
  });
}

export function useEntregablesConsulta(consultaId: string) {
  return useQuery({
    queryKey: entregablesPorConsultaKey(consultaId),
    queryFn: () => entregablesService.getPorConsulta(consultaId),
  });
}

export function useEntregable(id: string) {
  return useQuery({
    queryKey: entregableKey(id),
    queryFn: () => entregablesService.getOne(id),
  });
}

export function useCrearEntregable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ consultaId, plantillaDocumentoId }: { consultaId: string; plantillaDocumentoId: string }) =>
      entregablesService.create(consultaId, plantillaDocumentoId),
    onSuccess: () => invalidar(queryClient),
    onError: (error: Error) => toast.error(error.message || 'Error al crear el documento'),
  });
}

export function useGuardarEntregable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: GuardarEntregablePayload }) => entregablesService.guardar(id, payload),
    onSuccess: (entregable) => {
      queryClient.setQueryData(entregableKey(entregable.id), entregable);
      queryClient.invalidateQueries({ queryKey: entregablesPorConsultaKey(entregable.consultaId) });
    },
    onError: (error: Error) => toast.error(error.message || 'Error al guardar el documento'),
  });
}

export function useEmitirEntregable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => entregablesService.emitir(id),
    onSuccess: (entregable) => {
      invalidar(queryClient, entregable);
      const n = entregable.pendientesGenerados;
      toast.success(`${entregable.numero ?? 'Documento'} emitido${n > 0 ? ` · genera ${n} ${n === 1 ? 'pendiente' : 'pendientes'}` : ''}.`);
    },
    onError: (error: Error) => toast.error(error.message || 'Error al emitir el documento'),
  });
}

export function useEliminarEntregable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => entregablesService.remove(id),
    onSuccess: () => {
      invalidar(queryClient);
      toast.success('Borrador descartado.');
    },
    onError: (error: Error) => toast.error(error.message || 'Error al descartar el borrador'),
  });
}

export function useAbrirEntregable() {
  return useMutation({
    mutationFn: (id: string) => entregablesService.abrir(id),
    onError: (error: Error) => toast.error(error.message || 'Error al abrir el PDF'),
  });
}
