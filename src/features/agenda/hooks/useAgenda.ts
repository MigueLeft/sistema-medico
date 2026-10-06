import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { agendaService } from '../services/agenda.service';
import type { GuardarConfiguracionAgendaPayload, GuardarTipoCitaPayload } from '../types';

export const CONFIGURACION_AGENDA_KEY = ['agenda', 'configuracion'] as const;
export const TIPOS_CITA_KEY = ['agenda', 'tipos-cita'] as const;
export const DIAS_BLOQUEADOS_KEY = ['agenda', 'dias-bloqueados'] as const;

export function useConfiguracionAgenda() {
  return useQuery({ queryKey: CONFIGURACION_AGENDA_KEY, queryFn: () => agendaService.obtenerConfiguracion() });
}

export function useGuardarConfiguracionAgenda() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GuardarConfiguracionAgendaPayload) => agendaService.guardarConfiguracion(payload),
    onSuccess: (cfg) => {
      queryClient.setQueryData(CONFIGURACION_AGENDA_KEY, cfg);
      toast.success('Horario y agenda guardados.');
    },
    onError: (error: Error) => toast.error(error.message || 'Error al guardar la configuración'),
  });
}

export function useTiposCita() {
  return useQuery({ queryKey: TIPOS_CITA_KEY, queryFn: () => agendaService.listarTiposCita() });
}

export function useGuardarTipoCita() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | null; payload: GuardarTipoCitaPayload }) => agendaService.guardarTipoCita(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TIPOS_CITA_KEY });
      toast.success('Tipo de cita guardado.');
    },
    onError: (error: Error) => toast.error(error.message || 'Error al guardar el tipo de cita'),
  });
}

export function useDiasBloqueados() {
  return useQuery({ queryKey: DIAS_BLOQUEADOS_KEY, queryFn: () => agendaService.listarDiasBloqueados() });
}

export function useBloquearDia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fecha, bloquear }: { fecha: string; bloquear: boolean }) =>
      bloquear ? agendaService.bloquearDia(fecha).then(() => undefined) : agendaService.desbloquearDia(fecha),
    onSuccess: (_, { bloquear }) => {
      queryClient.invalidateQueries({ queryKey: DIAS_BLOQUEADOS_KEY });
      toast.success(bloquear ? 'Día bloqueado en la agenda.' : 'Día desbloqueado.');
    },
    onError: (error: Error) => toast.error(error.message || 'Error al actualizar el día'),
  });
}
