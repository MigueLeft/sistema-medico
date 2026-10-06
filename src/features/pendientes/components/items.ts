import type { EstadoPendienteUi, ItemPendiente } from '@/components/ui';
import { fechaCorta } from '@/lib/formato';
import type { EstadoPendiente, Pendiente, TipoPendiente } from '../types';

const TIPO: Record<TipoPendiente, string> = { paraclinico: 'Paraclínico', documento: 'Documento', registro: 'Registro' };

export const ETIQUETA_TIPO_PENDIENTE = TIPO;

/** Un pendiente sigue abierto hasta que se entrega; «no lo trajo» no lo cierra. */
export function estaAbierto(p: Pendiente): boolean {
  return p.estado !== 'entregado';
}

export function aEstadoBackend(estado: EstadoPendienteUi): EstadoPendiente {
  return estado === 'no-entregado' ? 'no_entregado' : estado;
}

interface OpcionesItem {
  /** Consulta desde la que se mira la lista: decide el texto de origen y si «no lo trajo» aplica a ella. */
  consultaId?: string | null;
}

/** Adapta un pendiente a la fila que muestra `PendingList`. */
export function aItemPendiente(p: Pendiente, { consultaId }: OpcionesItem = {}): ItemPendiente {
  let origen: string | undefined;
  if (p.estado === 'entregado' && p.entregadoAt) {
    origen = `Entregado el ${fechaCorta(p.entregadoAt)}`;
  } else if (p.entregableNumero) {
    const deOtraConsulta = p.consultaOrigenFecha && (!consultaId || p.consultaOrigenId !== consultaId);
    origen = `De ${p.entregableNumero}${deOtraConsulta ? ` (consulta del ${fechaCorta(p.consultaOrigenFecha)})` : ''}`;
  } else if (consultaId && p.consultaOrigenId === consultaId) {
    origen = 'Solicitado hoy';
  } else if (p.consultaOrigenFecha) {
    origen = `${consultaId ? 'Viene de' : 'Desde'} la consulta del ${fechaCorta(p.consultaOrigenFecha)}`;
  }

  let status: EstadoPendienteUi = 'pendiente';
  if (p.estado === 'entregado') status = 'entregado';
  // «No lo trajo» solo se muestra marcado en la consulta donde se registró; después vuelve a verse pendiente.
  else if (p.estado === 'no_entregado' && consultaId && p.consultaRevisionId === consultaId) status = 'no-entregado';

  return {
    id: p.id,
    label: p.nombre,
    code: p.codigoLoinc,
    kind: TIPO[p.tipo],
    origin: origen,
    status,
    file: p.archivoNombre ? { name: p.archivoNombre, size: p.archivoBytes } : null,
  };
}
