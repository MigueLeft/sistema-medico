import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Cargando, Page } from '@/components/AppShell';
import { Badge, Button, Card, CodedEntry, Dato, ESTADOS_CITA, type GrupoSeccion, Icon, Panel, PatientHeader, PendingList, SectionNav, Select, Vacio } from '@/components/ui';
import { AntecedentesGrid, GRUPOS_ANTECEDENTES, sustanciaAlergia, useAntecedentes } from '@/features/antecedentes';
import { useCitasPaciente } from '@/features/citas';
import { ComposicionCorporalPanel } from '@/features/composicion-corporal';
import { useConsultasPorPaciente, useIniciarConsulta } from '@/features/consultas';
import { iconoDe, useAbrirEntregable, useEntregablesPaciente } from '@/features/entregables';
import { useExamenesPaciente } from '@/features/examenes';
import { PatientFormDialog, usePaciente } from '@/features/patients';
import { aItemPendiente, estaAbierto, useAbrirArchivoPendiente, useAdjuntarPendiente, usePendientesPaciente } from '@/features/pendientes';
import { aFecha, edad, fechaCorta, fmtNumLibre, hora12, sexoLargo } from '@/lib/formato';

export const Route = createFileRoute('/pacientes/$pacienteId')({
  component: HistoriaClinicaPage,
});

type FiltroPendientes = 'abiertos' | 'entregados' | 'todos';

function HistoriaClinicaPage() {
  const { pacienteId } = Route.useParams();
  const navigate = useNavigate();
  const { data: paciente, isLoading } = usePaciente(pacienteId);
  const { data: antecedentes = [] } = useAntecedentes(pacienteId);
  const { data: pendientes = [] } = usePendientesPaciente(pacienteId);
  const { data: consultas = [] } = useConsultasPorPaciente(pacienteId);
  const { data: examenes = [] } = useExamenesPaciente(pacienteId);
  const { data: citas = [] } = useCitasPaciente(pacienteId);
  const iniciar = useIniciarConsulta();
  const abrirArchivo = useAbrirArchivoPendiente();
  const adjuntar = useAdjuntarPendiente();
  const { data: entregables = [] } = useEntregablesPaciente(pacienteId);
  const abrirEntregable = useAbrirEntregable();

  const [seccion, setSeccion] = useState('datos');
  const [editando, setEditando] = useState(false);
  const [filtro, setFiltro] = useState<FiltroPendientes>('abiertos');
  const [ahora] = useState(() => Date.now());

  if (isLoading || !paciente) {
    return (
      <Page title="Historia clínica">
        <Cargando texto={isLoading ? 'Cargando…' : 'Paciente no encontrado.'} />
      </Page>
    );
  }

  const alergias = antecedentes.filter((a) => a.tipo === 'alergia');
  const abiertos = pendientes.filter(estaAbierto);
  const pendientesVisibles = filtro === 'todos' ? pendientes : filtro === 'abiertos' ? abiertos : pendientes.filter((p) => !estaAbierto(p));
  const proximaCita = [...citas].reverse().find((c) => aFecha(c.fechaHora).getTime() >= ahora && c.estado !== 'cancelada');
  const borrador = consultas.find((c) => c.estado === 'borrador');
  const contacto = [paciente.contactoEmergenciaNombre, paciente.contactoEmergenciaParentesco, paciente.contactoEmergenciaTelefono].filter(Boolean).join(' · ');

  const grupos: GrupoSeccion[] = [
    {
      label: 'Identificación',
      items: [
        { id: 'datos', label: 'Datos personales', status: 'done' },
        { id: 'contacto', label: 'Contacto y emergencia', status: paciente.telefono || contacto ? 'done' : 'optional' },
      ],
    },
    {
      label: 'Antecedentes',
      items: GRUPOS_ANTECEDENTES.map((g) => {
        const total = antecedentes.filter((a) => a.tipo === g.tipo).length;
        return { id: g.ancla, label: g.titulo.replace('Antecedentes p', 'P').replace('Antecedentes f', 'F'), count: total || null, status: g.tipo === 'alergia' && total > 0 ? 'alert' : total > 0 ? 'done' : 'optional' };
      }),
    },
    {
      label: 'Registros',
      items: [
        { id: 'pendientes', label: 'Pendientes', count: abiertos.length || null, status: abiertos.length > 0 ? 'required' : 'optional' },
        { id: 'consultas', label: 'Consultas', count: consultas.length || null },
        { id: 'paraclinicos', label: 'Paraclínicos', count: examenes.length || null },
        { id: 'citas', label: 'Citas', count: citas.length || null },
        { id: 'composicion', label: 'Composición corporal' },
        { id: 'documentos', label: 'Documentos' },
      ],
    },
  ];

  const irA = (id: string) => {
    setSeccion(id);
    document.getElementById(id === 'contacto' ? 'datos' : id)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };
  const abrirConsulta = () => {
    if (borrador) {
      navigate({ to: '/consultas/$consultaId', params: { consultaId: borrador.id } });
      return;
    }
    iniciar.mutate({ pacienteId }, { onSuccess: (c) => navigate({ to: '/consultas/$consultaId', params: { consultaId: c.id } }) });
  };

  return (
    <Page title="Historia clínica">
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
          <div className="cl-row" style={{ gap: 'var(--space-2)' }}>
            <Button onClick={() => navigate({ to: '/citas', search: { nueva: true, pacienteId } })}>Nueva cita</Button>
            <Button variant="primary" disabled={iniciar.isPending} onClick={abrirConsulta}>
              {borrador ? 'Continuar consulta' : 'Iniciar consulta'}
            </Button>
          </div>
        }
      />

      <div className="ap-with-nav">
        <Panel>
          <SectionNav title="Historia clínica" groups={grupos} active={seccion} onSelect={irA} />
        </Panel>

        <div className="ap-stack">
          <Card id="datos" title="Datos personales y contacto" actions={<Button size="sm" onClick={() => setEditando(true)}>Editar</Button>}>
            <div className="ap-grid ap-grid-3">
              <Dato label="Estado civil">{paciente.estadoCivil}</Dato>
              <Dato label="Ocupación">{paciente.ocupacion}</Dato>
              <Dato label="Teléfono">{paciente.telefono}</Dato>
              <Dato label="Correo">{paciente.email}</Dato>
              <Dato label="Dirección">{paciente.direccion}</Dato>
              <Dato label="Contacto de emergencia">{contacto}</Dato>
            </div>
          </Card>

          <Card
            id="pendientes"
            title="Pendientes"
            subtitle={`Lo que el paciente debe traer, de todas sus consultas.${proximaCita ? ` Próxima cita: ${fechaCorta(proximaCita.fechaHora)} · ${hora12(proximaCita.fechaHora)}` : ''}`}
            flush
            actions={
              <Select
                value={filtro}
                onChange={(v) => setFiltro(v as FiltroPendientes)}
                style={{ width: 150 }}
                options={[
                  { value: 'abiertos', label: 'Abiertos' },
                  { value: 'entregados', label: 'Entregados' },
                  { value: 'todos', label: 'Todos' },
                ]}
              />
            }
          >
            <PendingList
              items={pendientesVisibles.map((p) => aItemPendiente(p))}
              uploadable
              emptyText={filtro === 'abiertos' ? 'No tiene pendientes por entregar.' : 'Sin pendientes.'}
              onUpload={(id, archivo) => adjuntar.mutate({ id, archivo })}
              onOpenFile={(id) => abrirArchivo.mutate(id)}
            />
          </Card>

          <h3 className="ap-grupo">ANTECEDENTES</h3>
          <AntecedentesGrid pacienteId={pacienteId} />

          <h3 className="ap-grupo">REGISTROS</h3>
          <Card id="consultas" title="Consultas" flush>
            {consultas.length === 0 ? <Vacio>Aún no tiene consultas.</Vacio> : null}
            <div className="ap-list">
              {consultas.map((c) => (
                <CodedEntry
                  key={c.id}
                  term={c.motivoConsulta || 'Consulta sin motivo registrado'}
                  detail={[c.tipoCitaNombre, c.diagnosticoPrincipal, c.medicoNombre].filter(Boolean).join(' · ')}
                  date={`${fechaCorta(c.fecha)} · ${hora12(c.fecha)}`}
                  status={c.estado === 'borrador' ? 'Sin cerrar' : 'Cerrada'}
                  statusTone={c.estado === 'borrador' ? 'warning' : 'slate'}
                  acciones={[{ label: c.estado === 'borrador' ? 'Continuar consulta' : 'Ver consulta', onClick: () => navigate({ to: '/consultas/$consultaId', params: { consultaId: c.id } }) }]}
                />
              ))}
            </div>
          </Card>

          <Card id="paraclinicos" title="Paraclínicos" flush>
            {examenes.length === 0 ? <Vacio>Sin paraclínicos solicitados.</Vacio> : null}
            <div className="ap-list">
              {examenes.map((e) => (
                <CodedEntry
                  key={e.id}
                  term={`${e.tipoExamenNombre}${e.valor !== null ? `: ${fmtNumLibre(e.valor)}${e.unidad ? ` ${e.unidad}` : ''}` : ''}`}
                  code={e.codigoLoinc}
                  system="LOINC"
                  detail={[e.grupo, e.indicacion].filter(Boolean).join(' · ')}
                  date={e.fechaResultado ? `Resultado ${fechaCorta(e.fechaResultado)}` : `Solicitado ${fechaCorta(e.fechaSolicitud)}`}
                  status={e.bandera === 'alto' ? 'Alto' : e.bandera === 'bajo' ? 'Bajo' : e.fechaResultado ? 'Normal' : 'Pendiente'}
                  statusTone={e.bandera === 'alto' || e.bandera === 'bajo' ? 'warning' : e.fechaResultado ? 'neutral' : 'info'}
                />
              ))}
            </div>
          </Card>

          <Card id="citas" title="Citas" flush>
            {citas.length === 0 ? <Vacio>Sin citas registradas.</Vacio> : null}
            <div className="ap-list">
              {citas.map((c) => (
                <div key={c.id} className="cl-entry ap-entry-3">
                  <div className="cl-entry-main">
                    <div className="cl-entry-term">{[c.tipoCitaNombre, c.motivo].filter(Boolean).join(' · ') || 'Cita'}</div>
                    <div className="cl-entry-sub">
                      <span>
                        {c.duracionMin} min · {c.medicoNombre}
                      </span>
                    </div>
                  </div>
                  <span className="cl-hint cl-num">
                    {fechaCorta(c.fechaHora)} · {hora12(c.fechaHora)}
                  </span>
                  <Badge tone={ESTADOS_CITA[c.estado].tone} dot>
                    {ESTADOS_CITA[c.estado].label}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          <Panel id="composicion" className="ap-legacy">
            <ComposicionCorporalPanel pacienteId={pacienteId} />
          </Panel>
          <Card id="documentos" title="Documentos" subtitle="Entregables preparados en las consultas." flush>
            {entregables.length === 0 ? <Vacio>Sin documentos.</Vacio> : null}
            {entregables.map((e) => (
              <div key={e.id} className="ap-entregable">
                <Icon name={iconoDe(e.tipo)} />
                <div>
                  <b>{e.plantillaNombre ?? e.titulo ?? 'Documento'}</b> <span className="cl-code cl-muted">{e.numero}</span>
                  <div className="cl-hint">
                    {fechaCorta(e.fechaEmision)}
                    {e.pendientesGenerados > 0 ? ` · generó ${e.pendientesGenerados} ${e.pendientesGenerados === 1 ? 'pendiente' : 'pendientes'}` : ''}
                  </div>
                </div>
                <Badge tone={e.estado === 'borrador' ? 'warning' : 'slate'} dot>
                  {e.estado === 'borrador' ? 'Borrador' : 'Emitida'}
                </Badge>
                {e.estado === 'borrador' ? (
                  <Button size="sm" onClick={() => navigate({ to: '/entregables/$entregableId', params: { entregableId: e.id } })}>
                    Abrir
                  </Button>
                ) : (
                  <Button size="sm" disabled={!e.tienePdf || abrirEntregable.isPending} onClick={() => abrirEntregable.mutate(e.id)}>
                    Abrir PDF
                  </Button>
                )}
              </div>
            ))}
          </Card>
        </div>
      </div>

      <PatientFormDialog open={editando} paciente={paciente} onClose={() => setEditando(false)} />
    </Page>
  );
}
