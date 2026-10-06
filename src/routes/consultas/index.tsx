import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Page } from '@/components/AppShell';
import { Badge, DataTable, Segmented, type Columna } from '@/components/ui';
import { useConsultas, type Consulta } from '@/features/consultas';
import { fechaCorta, hora12 } from '@/lib/formato';

export const Route = createFileRoute('/consultas/')({
  component: ConsultasPage,
});

type Filtro = 'borrador' | 'todas';

const COLUMNAS: Array<Columna<Consulta>> = [
  { key: 'fecha', label: 'Fecha', width: 170, render: (c) => <span className="cl-num">{`${fechaCorta(c.fecha)} · ${hora12(c.fecha)}`}</span> },
  { key: 'historia', label: 'Historia', width: 120, mono: true, render: (c) => c.expedienteCodigo },
  { key: 'paciente', label: 'Paciente', render: (c) => <b style={{ fontWeight: 600 }}>{c.pacienteNombre}</b> },
  { key: 'tipo', label: 'Tipo', muted: true, render: (c) => c.tipoCitaNombre ?? '—' },
  { key: 'motivo', label: 'Motivo', render: (c) => c.motivoConsulta || '—' },
  { key: 'dx', label: 'Diagnóstico principal', render: (c) => c.diagnosticoPrincipal ?? <span className="cl-muted">Sin diagnóstico</span> },
  {
    key: 'estado',
    label: 'Estado',
    width: 110,
    render: (c) => (
      <Badge tone={c.estado === 'borrador' ? 'warning' : 'slate'} dot>
        {c.estado === 'borrador' ? 'Sin cerrar' : 'Cerrada'}
      </Badge>
    ),
  },
];

function ConsultasPage() {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState<Filtro>('borrador');
  const { data: consultas = [], isLoading } = useConsultas(filtro === 'borrador' ? 'borrador' : undefined);

  return (
    <Page title="Consultas">
      <div className="ap-toolbar">
        <Segmented<Filtro>
          value={filtro}
          onChange={setFiltro}
          ariaLabel="Filtro de consultas"
          options={[
            { value: 'borrador', label: 'Sin cerrar' },
            { value: 'todas', label: 'Todas' },
          ]}
        />
        <span className="cl-hint" style={{ alignSelf: 'center' }}>
          Para iniciar una consulta, ábrala desde la agenda o desde la historia del paciente.
        </span>
      </div>
      <DataTable
        columns={COLUMNAS}
        rows={consultas}
        rowKey={(c) => c.id}
        onRowClick={(c) => navigate({ to: '/consultas/$consultaId', params: { consultaId: c.id } })}
        emptyText={isLoading ? 'Cargando…' : filtro === 'borrador' ? 'No hay consultas sin cerrar.' : 'Aún no se han registrado consultas.'}
      />
    </Page>
  );
}
