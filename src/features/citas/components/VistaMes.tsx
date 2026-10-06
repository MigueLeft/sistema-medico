import { ButtonBase } from '@mui/material';
import { addDays, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { Button, Panel } from '@/components/ui';
import { type ConfiguracionAgenda, useBloquearDia } from '@/features/agenda';
import { aFecha, fechaLarga, hhmmA12, horaCorta, isoDia } from '@/lib/formato';
import type { Cita } from '../types';
import { esDiaDeAtencion, espaciosLibres } from './horario';

interface VistaMesProps {
  /** Cualquier día del mes mostrado; también es el día seleccionado. */
  fecha: Date;
  citas: Cita[];
  cfg: ConfiguracionAgenda;
  bloqueados: Set<string>;
  onSeleccionarDia: (fecha: Date) => void;
  onAbrirDia: (fecha: Date) => void;
}

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MAX_POR_DIA = 3;
const plural = (n: number) => `${n} ${n === 1 ? 'cita' : 'citas'}`;

export function VistaMes({ fecha, citas, cfg, bloqueados, onSeleccionarDia, onAbrirDia }: VistaMesProps) {
  const bloquear = useBloquearDia();
  const inicio = startOfWeek(startOfMonth(fecha), { weekStartsOn: 1 });
  const celdas = Array.from({ length: 42 }, (_, i) => addDays(inicio, i));
  // La sexta semana solo se dibuja si todavía pertenece al mes.
  const dias = isSameMonth(celdas[35], fecha) ? celdas : celdas.slice(0, 35);
  const hoy = new Date();
  const visibles = citas.filter((c) => c.estado !== 'cancelada');
  const delDia = (d: Date) => visibles.filter((c) => c.fechaHora.startsWith(isoDia(d)));

  const seleccionadas = delDia(fecha);
  const diaBloqueado = bloqueados.has(isoDia(fecha));
  const libres = diaBloqueado ? 0 : espaciosLibres(cfg, seleccionadas, fecha).length;

  return (
    <>
      <div className="ap-mes">
        {DIAS.map((d) => (
          <div key={d} className="ap-mes-dow">
            {d}
          </div>
        ))}
        {dias.map((d) => {
          const lista = delDia(d);
          const cerrado = bloqueados.has(isoDia(d)) || !esDiaDeAtencion(cfg, d);
          const clases = ['ap-mes-dia', !isSameMonth(d, fecha) && 'ap-fuera', cerrado && 'ap-cerrado'].filter(Boolean).join(' ');
          return (
            <ButtonBase key={d.toISOString()} focusRipple className={clases} aria-pressed={isSameDay(d, fecha)} onClick={() => onSeleccionarDia(d)} onDoubleClick={() => onAbrirDia(d)}>
              <span className="ap-mes-num">
                <span className={isSameDay(d, hoy) ? 'ap-hoy-num' : undefined}>{format(d, 'd')}</span>
                {lista.length > 0 ? <small>{plural(lista.length)}</small> : bloqueados.has(isoDia(d)) ? <small>Bloqueado</small> : null}
              </span>
              {lista.slice(0, MAX_POR_DIA).map((c) => (
                <span key={c.id} className="ap-mes-cita" data-estado={c.estado}>
                  <b>{horaCorta(c.fechaHora)}</b> {c.pacienteNombreCorto}
                </span>
              ))}
              {lista.length > MAX_POR_DIA ? <span className="ap-mes-mas">+{lista.length - MAX_POR_DIA} más</span> : null}
            </ButtonBase>
          );
        })}
      </div>

      <Panel className="ap-foot">
        <b>{fechaLarga(fecha).replace(/ de \d{4}$/, '')}</b>
        <span className="cl-muted" style={{ flex: 1, marginLeft: 'var(--space-2)' }}>
          {diaBloqueado
            ? 'Día bloqueado'
            : esDiaDeAtencion(cfg, fecha)
              ? `${plural(seleccionadas.length)} · horario ${hhmmA12(cfg.horaInicio)} – ${hhmmA12(cfg.horaCierre)} · ${libres} espacios libres de ${cfg.duracionDefectoMin} min`
              : 'Sin consulta este día'}
        </span>
        {esDiaDeAtencion(cfg, fecha) ? (
          <Button
            size="sm"
            disabled={bloquear.isPending || (!diaBloqueado && seleccionadas.length > 0)}
            title={!diaBloqueado && seleccionadas.length > 0 ? 'Reprograme o cancele las citas del día antes de bloquearlo' : undefined}
            onClick={() => bloquear.mutate({ fecha: isoDia(fecha), bloquear: !diaBloqueado })}
          >
            {diaBloqueado ? 'Desbloquear día' : 'Bloquear día'}
          </Button>
        ) : null}
        <Button size="sm" onClick={() => onAbrirDia(fecha)}>
          Abrir vista día
        </Button>
      </Panel>
    </>
  );
}

/** Rango de fechas (yyyy-MM-dd) que cubre la rejilla del mes de `fecha`. */
export function rangoDelMes(fecha: Date): { desde: string; hasta: string } {
  const inicio = startOfWeek(startOfMonth(fecha), { weekStartsOn: 1 });
  return { desde: isoDia(inicio), hasta: isoDia(addDays(inicio, 41)) };
}

/** Cita más próxima del día para dejarla seleccionada al cambiar de fecha. */
export function citaInicial(citas: Cita[], fecha: Date): string | null {
  const delDia = citas.filter((c) => c.fechaHora.startsWith(isoDia(fecha)) && c.estado !== 'cancelada');
  const activa = delDia.find((c) => c.estado === 'en_consulta') ?? delDia.find((c) => c.estado === 'en_sala');
  const siguiente = delDia.find((c) => aFecha(c.fechaHora).getTime() >= Date.now());
  return (activa ?? siguiente ?? delDia[0])?.id ?? null;
}
