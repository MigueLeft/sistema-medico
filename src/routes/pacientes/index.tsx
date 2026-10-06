import { useMemo, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { subDays, subMonths, subYears } from 'date-fns';
import { Page } from '@/components/AppShell';
import { Badge, Button, DataTable, Select, TextField, type Columna, type Tono } from '@/components/ui';
import { PatientFormDialog, usePacientes, type PacienteConExpediente } from '@/features/patients';
import { edad, fechaCorta, isoDia, sexoCorto } from '@/lib/formato';

type EstadoLista = 'en_consulta' | 'en_sala' | 'activo' | 'sin_control';

interface BusquedaPacientes {
  /** Abre el diálogo «Nuevo paciente» al entrar. */
  nuevo?: boolean;
  estado?: EstadoLista;
}

const ESTADOS: Record<EstadoLista, { label: string; tone: Tono }> = {
  en_consulta: { label: 'En consulta', tone: 'accent' },
  en_sala: { label: 'En sala', tone: 'info' },
  activo: { label: 'Activo', tone: 'slate' },
  sin_control: { label: 'Sin control > 1 año', tone: 'warning' },
};

export const Route = createFileRoute('/pacientes/')({
  validateSearch: (s: Record<string, unknown>): BusquedaPacientes => ({
    nuevo: s.nuevo === true || s.nuevo === 'true' ? true : undefined,
    estado: typeof s.estado === 'string' && s.estado in ESTADOS ? (s.estado as EstadoLista) : undefined,
  }),
  component: PacientesPage,
});

const POR_PAGINA = 10;

/** En consulta / en sala salen de la cita de hoy; «sin control» = última consulta hace más de un año. */
function estadoDe(p: PacienteConExpediente, haceUnAnio: string): EstadoLista {
  if (p.estadoCitaHoy) return p.estadoCitaHoy;
  if (p.ultimaConsulta && p.ultimaConsulta.slice(0, 10) < haceUnAnio) return 'sin_control';
  return 'activo';
}

function PacientesPage() {
  const busquedaUrl = Route.useSearch();
  const navigate = useNavigate();
  const { data: pacientes = [], isLoading } = usePacientes();
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState<string>(busquedaUrl.estado ?? '');
  const [ultima, setUltima] = useState('');
  const [pagina, setPagina] = useState(0);
  const [nuevo, setNuevo] = useState(!!busquedaUrl.nuevo);

  const hoy = new Date();
  const haceUnAnio = isoDia(subYears(hoy, 1));
  const filtrados = useMemo(() => {
    const aguja = busqueda.trim().toLowerCase();
    const limites: Record<string, (fecha: string | null) => boolean> = {
      '30d': (f) => !!f && f.slice(0, 10) >= isoDia(subDays(hoy, 30)),
      '6m': (f) => !!f && f.slice(0, 10) >= isoDia(subMonths(hoy, 6)),
      '1a': (f) => !!f && f.slice(0, 10) < haceUnAnio,
      nunca: (f) => !f,
    };
    return pacientes.filter(
      (p) =>
        (aguja === '' || [`${p.nombres} ${p.apellidos}`, p.documentoIdentidad, p.expediente.codigo].some((t) => t.toLowerCase().includes(aguja))) &&
        (estado === '' || estadoDe(p, haceUnAnio) === estado) &&
        (ultima === '' || limites[ultima](p.ultimaConsulta)),
    );
    // `hoy` cambia en cada render; el día es lo único que importa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacientes, busqueda, estado, ultima, haceUnAnio]);

  const paginas = Math.max(Math.ceil(filtrados.length / POR_PAGINA), 1);
  const actual = Math.min(pagina, paginas - 1);
  const visibles = filtrados.slice(actual * POR_PAGINA, (actual + 1) * POR_PAGINA);

  const columnas: Array<Columna<PacienteConExpediente>> = [
    { key: 'historia', label: 'Historia', width: 130, mono: true, render: (p) => p.expediente.codigo },
    { key: 'paciente', label: 'Paciente', render: (p) => `${p.nombres} ${p.apellidos}` },
    { key: 'cedula', label: 'Cédula', width: 150, mono: true, render: (p) => p.documentoIdentidad },
    { key: 'edad', label: 'Edad', width: 70, align: 'right', render: (p) => edad(p.fechaNacimiento) },
    { key: 'sexo', label: 'Sexo', width: 70, render: (p) => sexoCorto(p.sexo) },
    { key: 'ultima', label: 'Última consulta', width: 150, muted: true, render: (p) => <span className="cl-num">{fechaCorta(p.ultimaConsulta)}</span> },
    {
      key: 'estado',
      label: 'Estado',
      width: 180,
      render: (p) => {
        const e = ESTADOS[estadoDe(p, haceUnAnio)];
        return (
          <Badge tone={e.tone} dot>
            {e.label}
          </Badge>
        );
      },
    },
  ];

  const reiniciar = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPagina(0);
  };

  return (
    <Page title="Pacientes">
      <div className="ap-toolbar">
        <TextField label="Buscar" placeholder="Nombre, cédula o número de historia" style={{ width: 280 }} value={busqueda} onChange={reiniciar(setBusqueda)} />
        <Select
          label="Estado"
          value={estado}
          onChange={reiniciar(setEstado)}
          placeholder="Todos"
          options={Object.entries(ESTADOS).map(([value, e]) => ({ value, label: e.label }))}
        />
        <Select
          label="Última consulta"
          value={ultima}
          onChange={reiniciar(setUltima)}
          placeholder="Cualquier fecha"
          options={[
            { value: '30d', label: 'Últimos 30 días' },
            { value: '6m', label: 'Últimos 6 meses' },
            { value: '1a', label: 'Hace más de 1 año' },
            { value: 'nunca', label: 'Sin consultas' },
          ]}
        />
        <Button variant="primary" icon="plus" onClick={() => setNuevo(true)}>
          Nuevo paciente
        </Button>
      </div>

      <DataTable
        columns={columnas}
        rows={visibles}
        rowKey={(p) => p.id}
        onRowClick={(p) => navigate({ to: '/pacientes/$pacienteId', params: { pacienteId: p.id } })}
        emptyText={isLoading ? 'Cargando…' : pacientes.length === 0 ? 'Aún no hay pacientes registrados.' : 'Ningún paciente coincide con los filtros.'}
      />

      <div className="cl-row" style={{ justifyContent: 'space-between' }}>
        <span className="cl-muted">
          {filtrados.length === 0 ? 'Sin resultados' : `Mostrando ${actual * POR_PAGINA + 1}–${actual * POR_PAGINA + visibles.length} de ${filtrados.length} pacientes`}
        </span>
        <div className="cl-row" style={{ gap: 'var(--space-2)' }}>
          <Button size="sm" disabled={actual === 0} onClick={() => setPagina(actual - 1)}>
            Anterior
          </Button>
          <Button size="sm" disabled={actual >= paginas - 1} onClick={() => setPagina(actual + 1)}>
            Siguiente
          </Button>
        </div>
      </div>

      <PatientFormDialog
        open={nuevo}
        onClose={() => {
          setNuevo(false);
          if (busquedaUrl.nuevo) navigate({ to: '/pacientes', search: {}, replace: true });
        }}
        onGuardado={(p) => navigate({ to: '/pacientes/$pacienteId', params: { pacienteId: p.id } })}
      />
    </Page>
  );
}
