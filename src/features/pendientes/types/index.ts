export type TipoPendiente = 'paraclinico' | 'documento' | 'registro';
/** `no_entregado` = «no lo trajo»: sigue abierto para la próxima consulta. */
export type EstadoPendiente = 'pendiente' | 'entregado' | 'no_entregado';

export interface Pendiente {
  id: string;
  pacienteId: string;
  consultaOrigenId: string | null;
  consultaOrigenFecha: string | null;
  examenId: string | null;
  /** Entregable que lo generó, con su número (p. ej. LAB-000124). */
  entregableId: string | null;
  entregableNumero: string | null;
  tipo: TipoPendiente;
  nombre: string;
  codigoLoinc: string | null;
  estado: EstadoPendiente;
  /** Consulta en la que se marcó entregado o «no lo trajo». */
  consultaRevisionId: string | null;
  entregadoAt: string | null;
  archivoNombre: string | null;
  archivoBytes: number | null;
  updatedAt: string | null;
}

export interface CreatePendientePayload {
  pacienteId: string;
  consultaOrigenId?: string | null;
  tipo: TipoPendiente;
  nombre: string;
  codigoLoinc?: string | null;
}
