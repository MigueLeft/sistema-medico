import { isSameDay } from 'date-fns';
import { AppointmentSlot, Badge, ESTADOS_CITA, Panel, Vacio } from '@/components/ui';
import type { ConfiguracionAgenda } from '@/features/agenda';
import { aFecha, horaCorta } from '@/lib/formato';
import type { Cita } from '../types';
import { DetalleCita } from './DetalleCita';
import { esDiaDeAtencion, espaciosLibres, ocupaAgenda } from './horario';

interface VistaDiaProps {
  fecha: Date;
  citas: Cita[];
  cfg: ConfiguracionAgenda;
  bloqueado: boolean;
  seleccion: string | null;
  onSeleccionar: (citaId: string) => void;
  onAgendar: (inicio: Date) => void;
  onReprogramar: (cita: Cita) => void;
}

const ORDEN_RESUMEN = ['atendida', 'en_consulta', 'en_sala', 'confirmada', 'por_confirmar', 'programada', 'no_asistio', 'cancelada'];

export function VistaDia({ fecha, citas, cfg, bloqueado, seleccion, onSeleccionar, onAgendar, onReprogramar }: VistaDiaProps) {
  const libres = bloqueado ? [] : espaciosLibres(cfg, citas, fecha);
  type Fila = { inicio: Date; cita?: Cita };
  const filas: Fila[] = [
    ...citas.filter((c) => c.estado !== 'cancelada').map((cita) => ({ inicio: aFecha(cita.fechaHora), cita })),
    ...libres.map((inicio) => ({ inicio })),
  ].sort((a, b) => a.inicio.getTime() - b.inicio.getTime());

  const ahora = new Date();
  const esHoy = isSameDay(fecha, ahora);
  // La línea «ahora» va antes de la primera fila que aún no ha comenzado.
  const indiceAhora = esHoy ? filas.findIndex((f) => f.inicio.getTime() > ahora.getTime()) : -1;
  const seleccionada = citas.find((c) => c.id === seleccion) ?? null;

  return (
    <div className="ap-split" style={{ gridTemplateColumns: 'minmax(0, 1fr) 348px' }}>
      <div className="ap-dia" role="listbox" aria-label="Citas del día">
        {bloqueado ? <Vacio>Este día está bloqueado en la agenda.</Vacio> : null}
        {!bloqueado && !esDiaDeAtencion(cfg, fecha) ? <Vacio>No hay consulta este día según el horario configurado.</Vacio> : null}
        {filas.map((f, i) => (
          <div key={f.cita?.id ?? f.inicio.toISOString()}>
            {i === indiceAhora && i > 0 ? <div className="cl-now" /> : null}
            {f.cita ? (
              <AppointmentSlot
                time={horaCorta(f.inicio)}
                duration={f.cita.duracionMin}
                status={f.cita.estado}
                patient={f.cita.pacienteNombre}
                type={f.cita.tipoCitaNombre}
                reason={f.cita.motivo}
                pending={f.cita.estado === 'atendida' ? 0 : f.cita.pendientesAbiertos}
                selected={f.cita.id === seleccion}
                onClick={() => onSeleccionar(f.cita!.id)}
              />
            ) : (
              <AppointmentSlot time={horaCorta(f.inicio)} duration={cfg.duracionDefectoMin} status="libre" onClick={() => onAgendar(f.inicio)} />
            )}
          </div>
        ))}
      </div>

      <div className="ap-stack">
        {seleccionada ? (
          <DetalleCita cita={seleccionada} onReprogramar={() => onReprogramar(seleccionada)} />
        ) : (
          <Panel className="ap-card">
            <Vacio>Seleccione una cita para ver su detalle.</Vacio>
          </Panel>
        )}
        <Panel className="ap-card">
          <div className="ap-card-body" style={{ gap: 'var(--space-2)' }}>
            <h2 className="ap-card-title">Resumen del día</h2>
            {ORDEN_RESUMEN.map((estado) => {
              const total = citas.filter((c) => c.estado === estado).length;
              if (total === 0) return null;
              return (
                <div key={estado} className="ap-resumen">
                  <Badge tone={ESTADOS_CITA[estado].tone} dot>
                    {ESTADOS_CITA[estado].label}
                  </Badge>
                  {total}
                </div>
              );
            })}
            <div className="ap-resumen">
              <Badge dot>Libre</Badge>
              {libres.length}
            </div>
            {citas.filter(ocupaAgenda).length === 0 && libres.length === 0 ? <span className="cl-hint">Sin citas ni espacios disponibles.</span> : null}
          </div>
        </Panel>
      </div>
    </div>
  );
}
