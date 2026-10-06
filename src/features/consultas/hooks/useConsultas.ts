import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { consultasService } from '../services/consultas.service';
import type {
  CreateConsultaDiagnosticoPayload,
  CreateSintomaPayload,
  EstadoConsulta,
  GuardarConsultaPayload,
  GuardarExamenSistemaPayload,
  IniciarConsultaPayload,
  UpdateConsultaDiagnosticoPayload,
} from '../types';

export const CONSULTAS_KEY = ['consultas'] as const;
export const consultasPorPacienteKey = (pacienteId: string) => ['consultas', 'paciente', pacienteId] as const;
export const consultaKey = (id: string) => ['consultas', id] as const;
export const sintomasKey = (consultaId: string) => ['consultas', consultaId, 'sintomas'] as const;
export const examenSistemasKey = (consultaId: string) => ['consultas', consultaId, 'sistemas'] as const;
export const diagnosticosKey = (consultaId: string) => ['consultas', consultaId, 'diagnosticos'] as const;

/** Abrir o cerrar una consulta cambia también citas, contadores, panel de inicio y lista de pacientes. */
function invalidarConsultas(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: CONSULTAS_KEY });
  queryClient.invalidateQueries({ queryKey: ['citas'] });
  queryClient.invalidateQueries({ queryKey: ['nav'] });
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  queryClient.invalidateQueries({ queryKey: ['pacientes'] });
}

export function useConsultasPorPaciente(pacienteId: string | undefined) {
  return useQuery({
    queryKey: consultasPorPacienteKey(pacienteId ?? ''),
    queryFn: () => consultasService.getPorPaciente(pacienteId!),
    enabled: !!pacienteId,
  });
}

export function useConsultas(estado?: EstadoConsulta) {
  return useQuery({
    queryKey: ['consultas', 'lista', estado ?? 'todas'] as const,
    queryFn: () => consultasService.getTodas(estado),
  });
}

export function useConsulta(id: string | undefined) {
  return useQuery({
    queryKey: consultaKey(id ?? ''),
    queryFn: () => consultasService.getOne(id!),
    enabled: !!id,
  });
}

export function useIniciarConsulta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: IniciarConsultaPayload) => consultasService.iniciar(payload),
    onSuccess: () => invalidarConsultas(queryClient),
    onError: (error: Error) => {
      toast.error(error.message || 'Error al iniciar la consulta');
    },
  });
}

export function useGuardarConsulta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: GuardarConsultaPayload }) => consultasService.guardar(id, payload),
    onSuccess: (consulta) => {
      queryClient.setQueryData(consultaKey(consulta.id), consulta);
      queryClient.invalidateQueries({ queryKey: consultasPorPacienteKey(consulta.pacienteId) });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al guardar la consulta');
    },
  });
}

export function useCerrarConsulta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => consultasService.cerrar(id),
    onSuccess: () => {
      invalidarConsultas(queryClient);
      toast.success('Consulta cerrada.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al cerrar la consulta');
    },
  });
}

export function useSintomasConsulta(consultaId: string) {
  return useQuery({ queryKey: sintomasKey(consultaId), queryFn: () => consultasService.getSintomas(consultaId) });
}

export function useAgregarSintoma() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSintomaPayload) => consultasService.agregarSintoma(payload),
    onSuccess: (sintoma) => queryClient.invalidateQueries({ queryKey: sintomasKey(sintoma.consultaId) }),
    onError: (error: Error) => toast.error(error.message || 'Error al agregar el síntoma'),
  });
}

export function useEliminarSintoma(consultaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => consultasService.eliminarSintoma(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sintomasKey(consultaId) }),
    onError: (error: Error) => toast.error(error.message || 'Error al quitar el síntoma'),
  });
}

export function useExamenSistemas(consultaId: string) {
  return useQuery({ queryKey: examenSistemasKey(consultaId), queryFn: () => consultasService.getExamenSistemas(consultaId) });
}

export function useGuardarExamenSistema() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GuardarExamenSistemaPayload) => consultasService.guardarExamenSistema(payload),
    onSuccess: (_, payload) => queryClient.invalidateQueries({ queryKey: examenSistemasKey(payload.consultaId) }),
    onError: (error: Error) => toast.error(error.message || 'Error al guardar el examen por sistemas'),
  });
}

export function useDiagnosticosConsulta(consultaId: string) {
  return useQuery({ queryKey: diagnosticosKey(consultaId), queryFn: () => consultasService.getDiagnosticos(consultaId) });
}

function invalidarDiagnosticos(queryClient: QueryClient, consultaId: string) {
  queryClient.invalidateQueries({ queryKey: diagnosticosKey(consultaId) });
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
}

export function useAgregarDiagnostico() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateConsultaDiagnosticoPayload) => consultasService.agregarDiagnostico(payload),
    onSuccess: (dx) => invalidarDiagnosticos(queryClient, dx.consultaId),
    onError: (error: Error) => toast.error(error.message || 'Error al agregar el diagnóstico'),
  });
}

export function useActualizarDiagnostico() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateConsultaDiagnosticoPayload }) =>
      consultasService.actualizarDiagnostico(id, payload),
    onSuccess: (dx) => invalidarDiagnosticos(queryClient, dx.consultaId),
    onError: (error: Error) => toast.error(error.message || 'Error al actualizar el diagnóstico'),
  });
}

export function useEliminarDiagnostico(consultaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => consultasService.eliminarDiagnostico(id),
    onSuccess: () => invalidarDiagnosticos(queryClient, consultaId),
    onError: (error: Error) => toast.error(error.message || 'Error al quitar el diagnóstico'),
  });
}
