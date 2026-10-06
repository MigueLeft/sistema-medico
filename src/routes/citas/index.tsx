import { useMemo, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { addDays, addMonths, addWeeks, format, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { Cargando, Page } from '@/components/AppShell';
import { Button, Icon, Segmented } from '@/components/ui';
import { useConfiguracionAgenda, useDiasBloqueados } from '@/features/agenda';
import {
  NuevaCitaDialog,
  ReprogramarCitaDialog,
  VistaDia,
  VistaMes,
  VistaSemana,
  citaInicial,
  rangoDelMes,
  useCitas,
  type Cita,
} from '@/features/citas';
import { aFecha, fechaLarga, isoDia } from '@/lib/formato';

type Vista = 'dia' | 'semana' | 'mes';

interface BusquedaCitas {
  /** Abre el diálogo «Nueva cita» al entrar. */
  nueva?: boolean;
  /** Día a mostrar (yyyy-MM-dd). */
  fecha?: string;
  /** Paciente precargado en el diálogo. */
  pacienteId?: string;
  tipoCitaId?: string;
}

export const Route = createFileRoute('/citas/')({
  validateSearch: (s: Record<string, unknown>): BusquedaCitas => ({
    nueva: s.nueva === true || s.nueva === 'true' ? true : undefined,
    fecha: typeof s.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.fecha) ? s.fecha : undefined,
    pacienteId: typeof s.pacienteId === 'string' ? s.pacienteId : undefined,
    tipoCitaId: typeof s.tipoCitaId === 'string' ? s.tipoCitaId : undefined,
  }),
  component: CitasPage,
});

function tituloDe(vista: Vista, fecha: Date, lunes: Date, diasVisibles: number): string {
  if (vista === 'dia') return fechaLarga(fecha);
  if (vista === 'mes') return format(fecha, "MMMM 'de' yyyy", { locale: es }).replace(/^./, (l) => l.toUpperCase());
  const fin = addDays(lunes, Math.max(diasVisibles - 1, 0));
  return lunes.getMonth() === fin.getMonth()
    ? `${format(lunes, 'd')} – ${format(fin, "d 'de' MMMM 'de' yyyy", { locale: es })}`
    : `${format(lunes, "d 'de' MMM", { locale: es })} – ${format(fin, "d 'de' MMM 'de' yyyy", { locale: es })}`;
}

function CitasPage() {
  const busqueda = Route.useSearch();
  const navigate = useNavigate();
  const { data: cfg } = useConfiguracionAgenda();
  const { data: diasBloqueados = [] } = useDiasBloqueados();

  const [vista, setVista] = useState<Vista>('dia');
  const [fecha, setFecha] = useState<Date>(() => (busqueda.fecha ? aFecha(busqueda.fecha) : new Date()));
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [nueva, setNueva] = useState<{ inicio?: Date } | null>(busqueda.nueva ? {} : null);
  const [reprogramar, setReprogramar] = useState<Cita | null>(null);

  const lunes = useMemo(() => startOfWeek(fecha, { weekStartsOn: 1 }), [fecha]);
  const rango = useMemo(() => {
    if (vista === 'dia') return { desde: isoDia(fecha), hasta: isoDia(fecha) };
    if (vista === 'semana') return { desde: isoDia(lunes), hasta: isoDia(addDays(lunes, 6)) };
    return rangoDelMes(fecha);
  }, [vista, fecha, lunes]);
  const { data: citas = [], isLoading } = useCitas(rango.desde, rango.hasta);
  const bloqueados = useMemo(() => new Set(diasBloqueados.map((d) => d.fecha)), [diasBloqueados]);

  // En la vista día siempre hay una cita seleccionada si el día tiene alguna.
  const seleccionDia = useMemo(() => (citas.some((c) => c.id === seleccion) ? seleccion : citaInicial(citas, fecha)), [citas, seleccion, fecha]);

  const mover = (sentido: 1 | -1) =>
    setFecha((f) => (vista === 'dia' ? addDays(f, sentido) : vista === 'semana' ? addWeeks(f, sentido) : addMonths(f, sentido)));
  const abrirDia = (d: Date) => {
    setFecha(d);
    setVista('dia');
  };
  const cerrarNueva = () => {
    setNueva(null);
    // Limpia los parámetros para que el diálogo no se reabra al volver a esta pantalla.
    if (busqueda.nueva) navigate({ to: '/citas', search: {}, replace: true });
  };

  if (!cfg) {
    return (
      <Page title="Agenda">
        <Cargando />
      </Page>
    );
  }

  const diasVisibles = cfg.diasAtencion.split(',').length;
  return (
    <Page title="Agenda">
      <div className="ap-agenda-bar">
        <Button aria-label="Anterior" onClick={() => mover(-1)} style={{ padding: '0 10px' }}>
          <Icon name="chevron-left" />
        </Button>
        <Button onClick={() => setFecha(new Date())}>Hoy</Button>
        <Button aria-label="Siguiente" onClick={() => mover(1)} style={{ padding: '0 10px' }}>
          <Icon name="chevron-right" />
        </Button>
        <h2>{tituloDe(vista, fecha, lunes, diasVisibles)}</h2>
        <Segmented<Vista>
          value={vista}
          onChange={setVista}
          ariaLabel="Vista de la agenda"
          options={[
            { value: 'dia', label: 'Día' },
            { value: 'semana', label: 'Semana' },
            { value: 'mes', label: 'Mes' },
          ]}
        />
        <Button variant="primary" icon="plus" onClick={() => setNueva({ inicio: vista === 'dia' ? undefined : fecha })}>
          Nueva cita
        </Button>
      </div>

      {isLoading ? <Cargando /> : null}
      {vista === 'dia' ? (
        <VistaDia
          fecha={fecha}
          citas={citas}
          cfg={cfg}
          bloqueado={bloqueados.has(isoDia(fecha))}
          seleccion={seleccionDia}
          onSeleccionar={setSeleccion}
          onAgendar={(inicio) => setNueva({ inicio })}
          onReprogramar={setReprogramar}
        />
      ) : null}
      {vista === 'semana' ? (
        <VistaSemana
          lunes={lunes}
          citas={citas}
          cfg={cfg}
          bloqueados={bloqueados}
          seleccion={seleccion}
          onSeleccionar={setSeleccion}
          onAgendar={(inicio) => setNueva({ inicio })}
          onReprogramar={setReprogramar}
          onAbrirDia={abrirDia}
        />
      ) : null}
      {vista === 'mes' ? <VistaMes fecha={fecha} citas={citas} cfg={cfg} bloqueados={bloqueados} onSeleccionarDia={setFecha} onAbrirDia={abrirDia} /> : null}

      <NuevaCitaDialog
        open={!!nueva}
        onClose={cerrarNueva}
        inicio={nueva?.inicio ?? (vista === 'dia' ? fecha : undefined)}
        pacienteId={busqueda.pacienteId}
        tipoCitaId={busqueda.tipoCitaId}
      />
      <ReprogramarCitaDialog cita={reprogramar} onClose={() => setReprogramar(null)} />
    </Page>
  );
}
