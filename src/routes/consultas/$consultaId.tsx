import { useCallback, useEffect, useRef, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Cargando, Page } from '@/components/AppShell';
import { AlertBanner, Badge, Button, type EstadoSeccion, type GrupoSeccion, Panel, PatientHeader, SectionNav } from '@/components/ui';
import { AntecedentesGrid, GRUPOS_ANTECEDENTES, alergiaQueChoca, sustanciaAlergia, useAntecedentes } from '@/features/antecedentes';
import { useCitasPaciente } from '@/features/citas';
import {
  PasoDiagnostico,
  PasoEntregables,
  PasoExamen,
  PasoPlan,
  PasoSubjetivo,
  useCerrarConsulta,
  useConsulta,
  useDiagnosticosConsulta,
  useExamenSistemas,
  useGuardarConsulta,
  useSintomasConsulta,
  type Consulta,
  type GuardarConsultaPayload,
} from '@/features/consultas';
import { useEntregablesConsulta } from '@/features/entregables';
import { useExamenFisicoConsulta } from '@/features/examen-fisico';
import { useExamenesPaciente } from '@/features/examenes';
import { usePaciente } from '@/features/patients';
import { estaAbierto, usePendientesPaciente } from '@/features/pendientes';
import { useTratamientoPorConsulta } from '@/features/tratamientos';
import { aFecha, edad, fechaCorta, hora12, sexoLargo } from '@/lib/formato';

type Paso = 'subjetivo' | 'antecedentes' | 'examen' | 'diagnostico' | 'plan' | 'entregables';
const PASOS: Paso[] = ['subjetivo', 'antecedentes', 'examen', 'diagnostico', 'plan', 'entregables'];

export const Route = createFileRoute('/consultas/$consultaId')({
  // `paso` permite volver a un paso concreto (p. ej. a Entregables al salir del editor de un documento).
  validateSearch: (s: Record<string, unknown>): { paso?: Paso } => ({
    paso: PASOS.includes(s.paso as Paso) ? (s.paso as Paso) : undefined,
  }),
  component: ConsultaPage,
});

const TITULO_PASO: Record<Paso, string> = {
  subjetivo: 'Motivo y síntomas',
  antecedentes: 'Antecedentes',
  examen: 'Examen físico',
  diagnostico: 'Diagnóstico',
  plan: 'Tratamiento',
  entregables: 'Entregables',
};

/** Cada sección del índice lateral vive en un paso y tiene un ancla dentro de él. */
const SECCION: Record<string, { paso: Paso; ancla: string }> = {
  'pendientes-anteriores': { paso: 'subjetivo', ancla: 'sec-pendientes-anteriores' },
  motivo: { paso: 'subjetivo', ancla: 'sec-motivo' },
  sintomas: { paso: 'subjetivo', ancla: 'sec-sintomas' },
  ...Object.fromEntries(GRUPOS_ANTECEDENTES.map((g) => [g.ancla, { paso: 'antecedentes' as Paso, ancla: g.ancla }])),
  signos: { paso: 'examen', ancla: 'sec-signos' },
  sistemas: { paso: 'examen', ancla: 'sec-sistemas' },
  paraclinicos: { paso: 'examen', ancla: 'sec-paraclinicos' },
  diagnostico: { paso: 'diagnostico', ancla: 'sec-diagnostico' },
  tratamiento: { paso: 'plan', ancla: 'sec-tratamiento' },
  indicaciones: { paso: 'plan', ancla: 'sec-indicaciones' },
  entregables: { paso: 'entregables', ancla: 'sec-entregables' },
  'pendientes-proxima': { paso: 'entregables', ancla: 'sec-pendientes-proxima' },
};
const PRIMERA_SECCION: Record<Paso, string> = {
  subjetivo: 'motivo',
  antecedentes: GRUPOS_ANTECEDENTES[0].ancla,
  examen: 'signos',
  diagnostico: 'diagnostico',
  plan: 'tratamiento',
  entregables: 'entregables',
};

function aBorrador(c: Consulta): GuardarConsultaPayload {
  return {
    tipoCitaId: c.tipoCitaId,
    motivoConsulta: c.motivoConsulta,
    enfermedadActual: c.enfermedadActual,
    notasMedico: c.notasMedico,
    impresionDiagnostica: c.impresionDiagnostica,
    proximoControl: c.proximoControl,
    proximoControlTipoId: c.proximoControlTipoId,
  };
}

function ConsultaPage() {
  const { consultaId } = Route.useParams();
  const { paso } = Route.useSearch();
  const { data: consulta, isLoading } = useConsulta(consultaId);

  if (isLoading || !consulta) {
    return (
      <Page title="Consulta">
        <Cargando texto={isLoading ? 'Cargando…' : 'Consulta no encontrada.'} />
      </Page>
    );
  }
  // `key` reinicia el borrador local al cambiar de consulta.
  return <ConsultaEditor key={consulta.id} consulta={consulta} pasoInicial={paso ?? 'subjetivo'} />;
}

function ConsultaEditor({ consulta, pasoInicial }: { consulta: Consulta; pasoInicial: Paso }) {
  const navigate = useNavigate();
  const { data: paciente } = usePaciente(consulta.pacienteId);
  const { data: antecedentes = [] } = useAntecedentes(consulta.pacienteId);
  const { data: pendientes = [] } = usePendientesPaciente(consulta.pacienteId);
  const { data: examenes = [] } = useExamenesPaciente(consulta.pacienteId);
  const { data: sintomas = [] } = useSintomasConsulta(consulta.id);
  const { data: sistemas = [] } = useExamenSistemas(consulta.id);
  const { data: diagnosticos = [] } = useDiagnosticosConsulta(consulta.id);
  const { data: examenFisico } = useExamenFisicoConsulta(consulta.id);
  const { data: tratamiento } = useTratamientoPorConsulta(consulta.id);
  const guardar = useGuardarConsulta();
  const cerrar = useCerrarConsulta();
  const { data: entregables = [] } = useEntregablesConsulta(consulta.id);
  const { data: citas = [] } = useCitasPaciente(consulta.pacienteId);
  const [ahora] = useState(() => Date.now());

  const soloLectura = consulta.estado === 'cerrada';
  const [paso, setPaso] = useState<Paso>(pasoInicial);
  const [seccion, setSeccion] = useState(PRIMERA_SECCION[pasoInicial]);
  const [borrador, setBorrador] = useState<GuardarConsultaPayload>(() => aBorrador(consulta));
  const [guardadoA, setGuardadoA] = useState<Date | null>(null);
  // Última versión enviada: evita guardar de nuevo cuando nada cambió.
  const enviado = useRef(JSON.stringify(aBorrador(consulta)));
  const anclaPendiente = useRef<string | null>(null);

  // Copia síncrona del borrador: permite guardar justo después de un cambio sin esperar al render.
  const borradorRef = useRef(borrador);
  const cambiarBorrador = useCallback((cambios: Partial<GuardarConsultaPayload>) => {
    borradorRef.current = { ...borradorRef.current, ...cambios };
    setBorrador(borradorRef.current);
  }, []);

  const guardarBorrador = useCallback(
    (cambios?: Partial<GuardarConsultaPayload>, forzar = false) => {
      if (soloLectura) return;
      if (cambios) cambiarBorrador(cambios);
      const serializado = JSON.stringify(borradorRef.current);
      if (!forzar && serializado === enviado.current) return;
      enviado.current = serializado;
      guardar.mutate({ id: consulta.id, payload: borradorRef.current }, { onSuccess: () => setGuardadoA(new Date()) });
    },
    [soloLectura, cambiarBorrador, guardar, consulta.id],
  );

  // Al cambiar de paso, lleva el scroll a la sección elegida (o al inicio del paso).
  useEffect(() => {
    const destino = anclaPendiente.current;
    anclaPendiente.current = null;
    const elemento = destino ? document.getElementById(destino) : null;
    if (elemento) elemento.scrollIntoView({ block: 'start' });
    else document.querySelector('.cl-content')?.scrollTo({ top: 0 });
  }, [paso, seccion]);

  const irASeccion = (id: string) => {
    const destino = SECCION[id];
    if (!destino) return;
    guardarBorrador();
    anclaPendiente.current = destino.ancla;
    setSeccion(id);
    setPaso(destino.paso);
  };
  const irAPaso = (p: Paso) => {
    guardarBorrador();
    setSeccion(PRIMERA_SECCION[p]);
    setPaso(p);
  };

  const alergias = antecedentes.filter((a) => a.tipo === 'alergia');
  const pendientesAnteriores = pendientes.filter((p) => p.consultaOrigenId !== consulta.id && (estaAbierto(p) || p.consultaRevisionId === consulta.id));
  const pendientesAbiertos = pendientes.filter(estaAbierto);
  const medicamentos = tratamiento?.medicamentos ?? [];
  const hayAlertaAlergia = medicamentos.some((m) => alergiaQueChoca(m.alergenos, alergias));
  const sistemasExaminados = sistemas.filter((s) => s.estado !== null);
  const resultadosPorRevisar = examenes.filter((e) => e.consultaId !== consulta.id && e.fechaResultado === null).length;
  const tieneSignos = !!examenFisico && [examenFisico.taSistolica, examenFisico.fc, examenFisico.pesoKg, examenFisico.saturacionOxigenoPct].some((v) => v !== null);

  const borradores = entregables.filter((e) => e.estado === 'borrador').length;
  // La cita futura más cercana: es cuando el paciente debe traer lo pendiente.
  const proximaCita = citas.filter((c) => c.estado !== 'cancelada' && aFecha(c.fechaHora).getTime() > ahora).map((c) => c.fechaHora).sort()[0] ?? null;

  const hecho = (ok: boolean, sinHacer: EstadoSeccion = 'optional'): EstadoSeccion => (ok ? 'done' : sinHacer);
  const grupos: GrupoSeccion[] = [
    {
      label: 'Subjetivo',
      items: [
        {
          id: 'pendientes-anteriores',
          label: 'Pendientes anteriores',
          count: pendientesAnteriores.length || null,
          status: hecho(pendientesAnteriores.length > 0 && pendientesAnteriores.every((p) => p.estado === 'entregado' || p.consultaRevisionId === consulta.id)),
        },
        { id: 'motivo', label: 'Motivo y enfermedad actual', required: true, status: hecho(borrador.motivoConsulta.trim() !== '', 'required') },
        { id: 'sintomas', label: 'Síntomas', count: sintomas.length || null, status: hecho(sintomas.length > 0) },
        ...GRUPOS_ANTECEDENTES.map((g) => {
          const total = antecedentes.filter((a) => a.tipo === g.tipo).length;
          return {
            id: g.ancla,
            label: g.titulo,
            count: total || null,
            status: (g.tipo === 'alergia' && total > 0 ? 'alert' : hecho(total > 0)) as EstadoSeccion,
          };
        }),
      ],
    },
    {
      label: 'Objetivo',
      items: [
        { id: 'signos', label: 'Signos vitales y medidas', required: true, status: hecho(tieneSignos, 'required') },
        { id: 'sistemas', label: 'Examen por sistemas', count: sistemasExaminados.length || null, status: hecho(sistemas.length > 0 && sistemasExaminados.length === sistemas.length) },
        { id: 'paraclinicos', label: 'Paraclínicos', count: resultadosPorRevisar || null },
      ],
    },
    {
      label: 'Evaluación',
      items: [{ id: 'diagnostico', label: 'Diagnóstico', required: true, count: diagnosticos.length || null, status: hecho(diagnosticos.length > 0, 'required') }],
    },
    {
      label: 'Plan',
      items: [
        { id: 'tratamiento', label: 'Tratamiento', count: medicamentos.length || null, status: hayAlertaAlergia ? 'alert' : hecho(medicamentos.length > 0) },
        { id: 'indicaciones', label: 'Indicaciones y control', status: hecho(!!tratamiento?.indicacionesGenerales || !!borrador.proximoControl) },
        { id: 'entregables', label: 'Entregables', count: entregables.length || null, status: borradores > 0 ? 'required' : hecho(entregables.length > 0) },
        { id: 'pendientes-proxima', label: 'Pendientes próxima consulta', count: pendientesAbiertos.length || null, status: hecho(pendientesAbiertos.length > 0) },
      ],
    },
  ];

  const cerrarConsulta = () => {
    // Guarda primero el borrador para que el cierre valide lo que está en pantalla.
    guardar.mutate(
      { id: consulta.id, payload: borradorRef.current },
      {
        onSuccess: () =>
          cerrar.mutate(consulta.id, {
            onSuccess: () => navigate({ to: '/pacientes/$pacienteId', params: { pacienteId: consulta.pacienteId } }),
          }),
      },
    );
  };

  const indice = PASOS.indexOf(paso);
  const anterior = indice > 0 ? PASOS[indice - 1] : null;
  const siguiente = indice < PASOS.length - 1 ? PASOS[indice + 1] : null;
  const notaPie: Record<Paso, string> = {
    subjetivo: guardadoA ? `Borrador guardado a las ${hora12(guardadoA)}` : 'Los cambios se guardan al salir de cada campo.',
    antecedentes: 'Los antecedentes se guardan directamente en la historia clínica.',
    examen: 'Las mediciones se guardan al salir de cada campo.',
    diagnostico: diagnosticos.length === 0 ? 'Falta al menos un diagnóstico para cerrar la consulta.' : `${diagnosticos.length} diagnósticos en esta consulta.`,
    plan: hayAlertaAlergia ? 'El récipe deja fuera los medicamentos con alerta de alergia.' : 'El récipe y las indicaciones se preparan en el siguiente paso.',
    entregables: borradores > 0 ? `Hay ${borradores} entregable(s) en borrador: emítalos o descártelos para poder cerrar.` : 'Al cerrar la consulta no pueden quedar entregables en borrador.',
  };

  return (
    <Page
      title={`Consulta · ${fechaCorta(consulta.fecha)} · ${hora12(consulta.fecha)}`}
      actions={
        <Badge tone={soloLectura ? 'slate' : 'warning'} dot>
          {soloLectura ? 'Cerrada' : 'Borrador'}
        </Badge>
      }
    >
      {paciente ? (
        <PatientHeader
          name={`${paciente.nombres} ${paciente.apellidos}`}
          age={`${edad(paciente.fechaNacimiento)} años`}
          sex={sexoLargo(paciente.sexo)}
          birthDate={fechaCorta(paciente.fechaNacimiento)}
          documentId={paciente.documentoIdentidad}
          recordNo={paciente.expediente.codigo}
          bloodType={paciente.grupoSanguineo}
          allergies={alergias.map(sustanciaAlergia)}
          actions={
            <Button size="sm" variant="quiet" onClick={() => navigate({ to: '/pacientes/$pacienteId', params: { pacienteId: paciente.id } })}>
              Ver historia clínica
            </Button>
          }
        />
      ) : null}

      <div className="ap-with-nav">
        <Panel>
          <SectionNav title="Consulta" groups={grupos} active={seccion} onSelect={irASeccion} />
        </Panel>

        <div className="ap-stack">
          {soloLectura ? (
            <AlertBanner title="Consulta cerrada">Se cerró el {fechaCorta(consulta.cerradaAt)}. Se muestra en modo de solo lectura.</AlertBanner>
          ) : null}

          {paso === 'subjetivo' ? (
            <PasoSubjetivo
              consulta={consulta}
              borrador={borrador}
              onCambiar={cambiarBorrador}
              onGuardar={() => guardarBorrador()}
              pendientesAnteriores={pendientesAnteriores}
              soloLectura={soloLectura}
            />
          ) : null}
          {paso === 'antecedentes' ? (
            <>
              <AlertBanner title="Antecedentes de la historia">
                Lo que agregue o corrija aquí se guarda en la historia clínica del paciente y queda disponible en futuras consultas.
              </AlertBanner>
              <AntecedentesGrid pacienteId={consulta.pacienteId} consultaId={consulta.id} />
            </>
          ) : null}
          {paso === 'examen' && paciente ? <PasoExamen consulta={consulta} sexo={paciente.sexo} soloLectura={soloLectura} /> : null}
          {paso === 'diagnostico' ? (
            <PasoDiagnostico consulta={consulta} borrador={borrador} onCambiar={cambiarBorrador} onGuardar={() => guardarBorrador()} soloLectura={soloLectura} />
          ) : null}
          {paso === 'plan' ? (
            <PasoPlan
              consulta={consulta}
              borrador={borrador}
              onGuardar={(c) => guardarBorrador(c)}
              alergias={alergias}
              soloLectura={soloLectura}
            />
          ) : null}
          {paso === 'entregables' ? <PasoEntregables consulta={consulta} pendientes={pendientes} proximaCita={proximaCita} soloLectura={soloLectura} /> : null}

          <Panel className="ap-foot">
            <span className="cl-hint">{notaPie[paso]}</span>
            {anterior ? <Button onClick={() => irAPaso(anterior)}>Anterior</Button> : null}
            {paso === 'subjetivo' && !soloLectura ? <Button onClick={() => guardarBorrador(undefined, true)}>Guardar borrador</Button> : null}
            {siguiente ? <Button onClick={() => irAPaso(siguiente)}>Siguiente: {TITULO_PASO[siguiente]}</Button> : null}
            {soloLectura ? null : (
              <Button variant="primary" disabled={cerrar.isPending || guardar.isPending} onClick={cerrarConsulta}>
                Cerrar consulta
              </Button>
            )}
          </Panel>
        </div>
      </div>
    </Page>
  );
}
