export type CanalRecordatorio = 'whatsapp' | 'sms' | 'correo' | 'ninguno';
export type SiNoConfirma = 'por_confirmar' | 'mantener' | 'cancelar';

export interface ConfiguracionAgenda {
  id: string;
  /** Días con consulta separados por coma: 1 = lunes … 7 = domingo. */
  diasAtencion: string;
  horaInicio: string; // HH:mm
  horaCierre: string;
  pausaInicio: string | null;
  pausaFin: string | null;
  duracionDefectoMin: number;
  permitirSobrecupos: boolean;
  maxSobrecupos: number;
  recordatorioAnticipacionH: number;
  recordatorioCanal: CanalRecordatorio;
  siNoConfirma: SiNoConfirma;
  recordatorioMensaje: string | null;
}

export type GuardarConfiguracionAgendaPayload = Omit<ConfiguracionAgenda, 'id'>;

export interface TipoCita {
  id: string;
  nombre: string;
  duracionMin: number;
  agendablePor: 'recepcion' | 'medico';
  activo: boolean;
  orden: number;
}

export type GuardarTipoCitaPayload = Pick<TipoCita, 'nombre' | 'duracionMin' | 'agendablePor' | 'activo'>;

export interface DiaBloqueado {
  id: string;
  fecha: string; // yyyy-MM-dd
  motivo: string | null;
}
