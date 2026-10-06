import type { ReactNode } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { addDays, format, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { Page } from '@/components/AppShell';
import { AppointmentSlot, Badge, Button, Card, Vacio, type Tono } from '@/components/ui';
import { useSesionActual } from '@/features/auth';
import { useCitas } from '@/features/citas';
import { useIniciarConsulta } from '@/features/consultas';
import { useDashboard } from '@/features/dashboard';
import { fechaCorta, fechaLarga, fmtNumLibre, hora12, horaCorta, hoyIso, isoDia } from '@/lib/formato';

export const Route = createFileRoute('/')({
  component: HomePage,
});

const SEMANAS = 8;

function saludo(hora: number): string {
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function FilaPendiente({ titulo, detalle, insignia, tono, accion }: { titulo: string; detalle: string; insignia: string; tono: Tono; accion: ReactNode }) {
  return (
    <div className="ap-pendiente-fila">
      <b>{titulo}</b>
      <span style={{ justifySelf: 'end' }}>
        <Badge tone={tono} dot>
          {insignia}
        </Badge>
      </span>
      <span className="cl-hint">{detalle}</span>
      <span style={{ justifySelf: 'end' }}>{accion}</span>
    </div>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const { data: sesion } = useSesionActual();
  const hoy = hoyIso();
  const { data: citas = [] } = useCitas(hoy, hoy);
  const { data: panel } = useDashboard();
  const iniciar = useIniciarConsulta();
  const ahora = new Date();

  const activas = citas.filter((c) => c.estado !== 'cancelada');
  const atendidas = activas.filter((c) => c.estado === 'atendida').length;
  const porAtender = activas.filter((c) => !['atendida', 'no_asistio'].includes(c.estado));
  const enSala = activas.filter((c) => c.estado === 'en_sala');
  const proximas = porAtender.slice(0, 4);
  // La consulta en curso tiene prioridad; si no, la primera persona que espera en sala.
  const siguiente = porAtender.find((c) => c.estado === 'en_consulta') ?? enSala[0];

  const sinCerrar = panel?.consultasSinCerrar ?? [];
  const resultados = panel?.resultadosRecientes ?? [];
  const sinControl = panel?.pacientesSinControl ?? [];
  const fueraDeRango = resultados.filter((r) => r.bandera === 'alto' || r.bandera === 'bajo').length;
  const porConfirmar = porAtender.filter((c) => c.estado === 'por_confirmar');

  // Ocho semanas terminando en la actual; las que no traen datos cuentan cero.
  const lunesActual = startOfWeek(ahora, { weekStartsOn: 1 });
  const semanas = Array.from({ length: SEMANAS }, (_, i) => {
    const inicio = addDays(lunesActual, (i - (SEMANAS - 1)) * 7);
    const total = panel?.consultasPorSemana.find((s) => s.semanaInicio === isoDia(inicio))?.total ?? 0;
    return { inicio, total };
  });
  const maxSemana = Math.max(...semanas.map((s) => s.total), 1);
  const frecuentes = panel?.diagnosticosFrecuentes ?? [];
  const maxFrecuente = Math.max(...frecuentes.map((d) => d.total), 1);

  const abrirConsulta = (cita: (typeof citas)[number]) => {
    if (cita.consultaId) {
      navigate({ to: '/consultas/$consultaId', params: { consultaId: cita.consultaId } });
      return;
    }
    iniciar.mutate(
      { pacienteId: cita.pacienteId, citaId: cita.id },
      { onSuccess: (consulta) => navigate({ to: '/consultas/$consultaId', params: { consultaId: consulta.id } }) },
    );
  };

  return (
    <Page title="Inicio">
      <div className="cl-row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h2 className="ap-h">
            {saludo(ahora.getHours())}, {sesion?.nombreCompleto ?? ''}
          </h2>
          <div className="ap-sub">
            {fechaLarga(ahora)} · {hora12(ahora)}
          </div>
        </div>
        <div className="cl-row" style={{ gap: 'var(--space-2)' }}>
          <Button onClick={() => navigate({ to: '/pacientes', search: { nuevo: true } })}>Nuevo paciente</Button>
          <Button variant="primary" icon="plus" onClick={() => navigate({ to: '/citas', search: { nueva: true } })}>
            Nueva cita
          </Button>
        </div>
      </div>

      <div className="ap-kpis">
        <Link to="/citas" className="cl-card ap-kpi">
          <span className="ap-kpi-label">Citas de hoy</span>
          <span className="ap-kpi-valor">{activas.length}</span>
          <span className="ap-kpi-nota">
            {atendidas} {atendidas === 1 ? 'atendida' : 'atendidas'} · {porAtender.length} por atender
          </span>
        </Link>
        <Link to="/citas" className="cl-card ap-kpi">
          <span className="ap-kpi-label">En sala de espera</span>
          <span className="ap-kpi-valor">{enSala.length}</span>
          <span className="ap-kpi-nota">{enSala.length > 0 ? enSala.map((c) => c.pacienteNombre).join(', ') : 'Nadie en sala'}</span>
        </Link>
        <Link to="/consultas" className="cl-card ap-kpi">
          <span className="ap-kpi-label">Consultas sin cerrar</span>
          <span className="ap-kpi-valor">{sinCerrar.length}</span>
          <span className="ap-kpi-nota">{sinCerrar.length > 0 ? `La más antigua: ${fechaCorta(sinCerrar[0].fecha)}` : 'Todo al día'}</span>
        </Link>
        <div className="cl-card ap-kpi">
          <span className="ap-kpi-label">Resultados nuevos</span>
          <span className="ap-kpi-valor">{resultados.length}</span>
          <span className="ap-kpi-nota">{resultados.length > 0 ? `${fueraDeRango} fuera de rango · últimos 7 días` : 'Sin resultados en los últimos 7 días'}</span>
        </div>
      </div>

      <div className="ap-inicio">
        <Card
          title="Próximos pacientes"
          flush
          actions={
            <Link to="/citas" className="ap-link">
              Ver agenda
            </Link>
          }
        >
          <div className="ap-card-body" style={{ gap: 'var(--space-2)' }}>
            {proximas.length === 0 ? <Vacio>No quedan pacientes por atender hoy.</Vacio> : null}
            {proximas.map((c) => (
              <AppointmentSlot
                key={c.id}
                time={horaCorta(c.fechaHora)}
                duration={c.duracionMin}
                status={c.estado}
                patient={c.pacienteNombre}
                type={c.tipoCitaNombre}
                reason={c.motivo}
                onClick={() => navigate({ to: '/citas' })}
              />
            ))}
            {siguiente ? (
              <div>
                <Button variant="primary" disabled={iniciar.isPending} onClick={() => abrirConsulta(siguiente)}>
                  {siguiente.consultaId ? 'Continuar' : 'Iniciar'} consulta con {siguiente.pacienteNombre}
                </Button>
              </div>
            ) : null}
          </div>
        </Card>

        <Card title="Pendientes" flush>
          {sinCerrar.length + resultados.length + porConfirmar.length + sinControl.length === 0 ? <Vacio>No hay pendientes por ahora.</Vacio> : null}
          {sinCerrar.slice(0, 3).map((c) => (
            <FilaPendiente
              key={c.id}
              titulo={c.diagnosticos === 0 ? 'Consulta sin diagnóstico' : 'Consulta sin cerrar'}
              detalle={`${c.pacienteNombre} · ${fechaCorta(c.fecha)}`}
              insignia="Requerido"
              tono="warning"
              accion={
                <Link to="/consultas/$consultaId" params={{ consultaId: c.id }} className="ap-link">
                  Completar
                </Link>
              }
            />
          ))}
          {resultados.slice(0, 3).map((r) => (
            <FilaPendiente
              key={r.examenId}
              titulo={`${r.nombre}${r.valor !== null ? ` ${fmtNumLibre(r.valor)}${r.unidad ? ` ${r.unidad}` : ''}` : ''}`}
              detalle={`${r.pacienteNombre} · recibido ${fechaCorta(r.fechaResultado)}`}
              insignia={r.bandera === 'alto' ? 'Alto' : r.bandera === 'bajo' ? 'Bajo' : 'Normal'}
              tono={r.bandera === 'alto' || r.bandera === 'bajo' ? 'warning' : 'neutral'}
              accion={
                <Link to="/pacientes/$pacienteId" params={{ pacienteId: r.pacienteId }} className="ap-link">
                  Revisar
                </Link>
              }
            />
          ))}
          {porConfirmar.slice(0, 2).map((c) => (
            <FilaPendiente
              key={c.id}
              titulo="Cita por confirmar"
              detalle={`${c.pacienteNombre}${c.pacienteTelefono ? ` · ${c.pacienteTelefono}` : ''}`}
              insignia={`Hoy ${horaCorta(c.fechaHora)}`}
              tono="warning"
              accion={
                <Link to="/citas" className="ap-link">
                  Ver cita
                </Link>
              }
            />
          ))}
          {sinControl.length > 0 ? (
            <FilaPendiente
              titulo="Pacientes sin control > 1 año"
              detalle="Su última consulta fue hace más de un año"
              insignia={String(sinControl.length)}
              tono="neutral"
              accion={
                <Link to="/pacientes" search={{ estado: 'sin_control' }} className="ap-link">
                  Ver lista
                </Link>
              }
            />
          ) : null}
        </Card>
      </div>

      <div className="ap-two">
        <Card title="Consultas por semana" subtitle="Últimas 8 semanas · la actual va en curso">
          <div>
            <div className="ap-barras">
              {semanas.map((s, i) => (
                <div key={isoDia(s.inicio)} className={`ap-barra${i === SEMANAS - 1 ? ' ap-barra-actual' : ''}`} title={`Semana del ${fechaCorta(isoDia(s.inicio))}`}>
                  {s.total}
                  <span style={{ height: `${(s.total / maxSemana) * 80}%` }} />
                </div>
              ))}
            </div>
            <div className="ap-barras-eje">
              {semanas.map((s) => (
                <span key={isoDia(s.inicio)}>{format(s.inicio, 'd MMM', { locale: es })}</span>
              ))}
            </div>
          </div>
        </Card>
        <Card
          title="Diagnósticos más frecuentes"
          subtitle={`${format(ahora, "MMMM 'de' yyyy", { locale: es }).replace(/^./, (l) => l.toUpperCase())} · consultas con ese diagnóstico`}
        >
          {frecuentes.length === 0 ? <Vacio>Aún no hay diagnósticos este mes.</Vacio> : null}
          {frecuentes.map((d) => (
            <div key={d.nombre} className="ap-frec">
              <span>{d.nombre}</span>
              <span>
                <span className="ap-frec-barra" style={{ display: 'block', width: `${(d.total / maxFrecuente) * 100}%` }} />
              </span>
              <b className="cl-r cl-num" style={{ textAlign: 'right' }}>
                {d.total}
              </b>
            </div>
          ))}
        </Card>
      </div>
    </Page>
  );
}
