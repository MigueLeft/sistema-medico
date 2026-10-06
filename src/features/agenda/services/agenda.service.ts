import { invoke } from '@/lib/tauri';
import type { ConfiguracionAgenda, DiaBloqueado, GuardarConfiguracionAgendaPayload, GuardarTipoCitaPayload, TipoCita } from '../types';

export const agendaService = {
  async obtenerConfiguracion(): Promise<ConfiguracionAgenda> {
    return invoke<ConfiguracionAgenda>('obtener_configuracion_agenda');
  },
  async guardarConfiguracion(payload: GuardarConfiguracionAgendaPayload): Promise<ConfiguracionAgenda> {
    return invoke<ConfiguracionAgenda>('guardar_configuracion_agenda', { payload });
  },
  async listarTiposCita(): Promise<TipoCita[]> {
    return invoke<TipoCita[]>('listar_tipos_cita');
  },
  async guardarTipoCita(id: string | null, payload: GuardarTipoCitaPayload): Promise<TipoCita> {
    return invoke<TipoCita>('guardar_tipo_cita', { id, payload });
  },
  async listarDiasBloqueados(): Promise<DiaBloqueado[]> {
    return invoke<DiaBloqueado[]>('listar_dias_bloqueados');
  },
  async bloquearDia(fecha: string, motivo?: string): Promise<DiaBloqueado> {
    return invoke<DiaBloqueado>('bloquear_dia', { fecha, motivo });
  },
  async desbloquearDia(fecha: string): Promise<void> {
    return invoke<void>('desbloquear_dia', { fecha });
  },
};
