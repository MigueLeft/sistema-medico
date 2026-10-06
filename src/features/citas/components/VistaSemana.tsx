import { ButtonBase } from '@mui/material';
import { addDays, addMinutes, format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge, Button, ESTADOS_CITA, Panel } from '@/components/ui';
import type { ConfiguracionAgenda } from '@/features/agenda';
import { aFecha, hhmmA12, hora12, horaCorta, isoDia } from '@/lib/formato';
import type { Cita } from '../types';
import { diasDeAtencion, minutosDe, minutosDelDia } from './horario';

interface VistaSemanaProps {
  /** Lunes de la semana mostrada. */
  lunes: Date;
  citas: Cita[];
  cfg: ConfiguracionAgenda;
  bloqueados: Set<string>;
  seleccion: string | null;
  onSeleccionar: (citaId: string) => void;
  onAgendar: (inicio: Date) => void;
  onReprogramar: (cita: Cita) => void;
  onAbrirDia: (fecha: Date) => void;
}

const ALTO_HORA = 56;
const plural = (n: number) => `${n} ${n === 1 ? 'cita' : 'citas'}`;
const LEYENDA = ['programada', 'confirmada', 'por_confirmar', 'en_sala', 'en_consulta', 'atendida'];
const NOMBRE_DIA = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

/** Reparte en carriles las citas que se solapan para que ninguna tape a otra. */
function asignarCarriles(citas: Cita[]): Map<string, { carril: number; carriles: number }> {
  const ordenadas = [...citas].sort((a, b) => a.fechaHora.localeCompare(b.fechaHora));
  const resultado = new Map<string, { carril: number; carriles: number }>();
  let grupo: Array<{ id: string; fin: number; carril: number }> = [];
  const cerrarGrupo = () => {
    const carriles = Math.max(...grupo.map((g) => g.carril)) + 1;
    grupo.forEach((g) => resultado.set(g.id, { carril: g.carril, carriles }));
    grupo = [];
  };
  for (const c of ordenadas) {
    const inicio = minutosDelDia(aFecha(c.fechaHora));
    if (grupo.length > 0 && grupo.every((g) => g.fin <= inicio)) cerrarGrupo();
    const usados = new Set(grupo.filter((g) => g.fin > inicio).map((g) => g.carril));
    let carril = 0;
    while (usados.has(carril)) carril += 1;
    grupo.push({ id: c.id, fin: inicio + Math.max(c.duracionMin, 25), carril });
  }
  if (grupo.length > 0) cerrarGrupo();
  return resultado;
}

export function VistaSemana({ lunes, citas, cfg, bloqueados, seleccion, onSeleccionar, onAgendar, onReprogramar, onAbrirDia }: VistaSemanaProps) {
  const dias = diasDeAtencion(cfg).map((d) => addDays(lunes, d - 1));
  const horaDesde = Math.floor(minutosDe(cfg.horaInicio) / 60);
  const horaHasta = Math.ceil(minutosDe(cfg.horaCierre) / 60);
  const horas = Array.from({ length: horaHasta - horaDesde }, (_, i) => horaDesde + i);
  const columnas = `64px repeat(${dias.length}, minmax(0, 1fr))`;
  const visibles = citas.filter((c) => c.estado !== 'cancelada');
  const seleccionada = visibles.find((c) => c.id === seleccion) ?? null;
  const ahora = new Date();
  const sinConsulta = [1, 2, 3, 4, 5, 6, 7].filter((d) => !diasDeAtencion(cfg).includes(d)).map((d) => NOMBRE_DIA[d]);

  return (
    <>
      {seleccionada ? (
        <Panel className="ap-foot">
          <b>
            {format(aFecha(seleccionada.fechaHora), 'EEEE d', { locale: es }).replace(/^./, (l) => l.toUpperCase())} · {hora12(seleccionada.fechaHora)} –{' '}
            {hora12(addMinutes(aFecha(seleccionada.fechaHora), seleccionada.duracionMin))}
          </b>
          <b style={{ marginLeft: 'var(--space-2)' }}>{seleccionada.pacienteNombre}</b>
          <span className="cl-muted" style={{ flex: 1 }}>
            {[seleccionada.tipoCitaNombre, seleccionada.motivo].filter(Boolean).join(' · ')}
          </span>
          <Badge tone={ESTADOS_CITA[seleccionada.estado].tone} dot>
            {ESTADOS_CITA[seleccionada.estado].label}
          </Badge>
          {seleccionada.estado === 'atendida' || seleccionada.estado === 'en_consulta' ? null : (
            <Button size="sm" onClick={() => onReprogramar(seleccionada)}>
              Reprogramar
            </Button>
          )}
          <Button size="sm" variant="quiet" onClick={() => onAbrirDia(aFecha(seleccionada.fechaHora))}>
            Abrir en vista día
          </Button>
        </Panel>
      ) : null}

      <div className="ap-semana">
        <div className="ap-semana-head" style={{ gridTemplateColumns: columnas }}>
          <div />
          {dias.map((d) => (
            <div key={d.toISOString()} className={isSameDay(d, ahora) ? 'ap-hoy' : undefined}>
              <span>{format(d, 'EEE', { locale: es }).replace(/^./, (l) => l.toUpperCase())}</span>
              <b>{format(d, 'd')}</b>
              <span>{plural(visibles.filter((c) => c.fechaHora.startsWith(isoDia(d))).length)}</span>
            </div>
          ))}
        </div>
        <div className="ap-semana-body" style={{ gridTemplateColumns: columnas, height: horas.length * ALTO_HORA }}>
          <div className="ap-semana-horas">
            {horas.map((h, i) => (
              <span key={h} style={{ top: i * ALTO_HORA + 6 }}>
                {hhmmA12(`${h}:00`).replace(':00', '')}
              </span>
            ))}
          </div>
          {dias.map((d) => {
            const delDia = visibles.filter((c) => c.fechaHora.startsWith(isoDia(d)));
            const carriles = asignarCarriles(delDia);
            const cerrado = bloqueados.has(isoDia(d));
            const esHoy = isSameDay(d, ahora);
            const minutosAhora = minutosDelDia(ahora) - horaDesde * 60;
            return (
              <div
                key={d.toISOString()}
                className={`ap-semana-col${esHoy ? ' ap-hoy' : ''}${cerrado ? ' ap-cerrado' : ''}`}
                title={cerrado ? 'Día bloqueado' : undefined}
                onClick={(e) => {
                  if (cerrado || e.target !== e.currentTarget) return;
                  // Clic en un hueco: propone agendar a esa hora, redondeada a 15 minutos.
                  const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
                  const minutos = horaDesde * 60 + Math.floor(((y / ALTO_HORA) * 60) / 15) * 15;
                  onAgendar(addMinutes(aFecha(`${isoDia(d)}T00:00:00`), minutos));
                }}
              >
                {esHoy && minutosAhora >= 0 && minutosAhora <= horas.length * 60 ? <div className="ap-ahora" style={{ top: (minutosAhora / 60) * ALTO_HORA }} /> : null}
                {delDia.map((c) => {
                  const inicio = minutosDelDia(aFecha(c.fechaHora)) - horaDesde * 60;
                  const { carril, carriles: total } = carriles.get(c.id) ?? { carril: 0, carriles: 1 };
                  return (
                    <ButtonBase
                      key={c.id}
                      focusRipple
                      className={c.duracionMin <= 30 ? 'ap-evento ap-evento-corto' : 'ap-evento'}
                      data-estado={c.estado}
                      aria-pressed={c.id === seleccion}
                      title={`${c.pacienteNombre} · ${ESTADOS_CITA[c.estado].label}`}
                      style={{
                        top: (inicio / 60) * ALTO_HORA + 1,
                        height: Math.max((c.duracionMin / 60) * ALTO_HORA - 2, 24),
                        left: `calc(${(carril / total) * 100}% + 3px)`,
                        right: `calc(${((total - carril - 1) / total) * 100}% + 3px)`,
                      }}
                      onClick={() => onSeleccionar(c.id)}
                    >
                      <b>{horaCorta(c.fechaHora)}</b>
                      {c.pacienteNombreCorto}
                    </ButtonBase>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="cl-row" style={{ gap: 'var(--space-2)' }}>
        <span className="cl-hint">Estados:</span>
        {LEYENDA.map((e) => (
          <Badge key={e} tone={ESTADOS_CITA[e].tone} dot>
            {ESTADOS_CITA[e].label}
          </Badge>
        ))}
        <span className="cl-hint" style={{ marginLeft: 'auto' }}>
          Horario de consulta {hhmmA12(cfg.horaInicio)} – {hhmmA12(cfg.horaCierre)}
          {sinConsulta.length > 0 ? ` · ${sinConsulta.join(', ')} sin consulta` : ''}
        </span>
      </div>
    </>
  );
}
