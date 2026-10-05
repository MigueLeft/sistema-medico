import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Box, Button, Stack, Typography } from '@mui/material';
import { AddOutlined, CloseOutlined } from '@mui/icons-material';
import type { ColumnDef } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { DataTable } from '@/components/DataTable';
import { UltimoRegistroCard } from '@/components/UltimoRegistroCard';
import { useExamenFisicoPaciente } from '../hooks/useExamenFisico';
import { ExamenFisicoForm } from './ExamenFisicoForm';
import type { ExamenFisico } from '../types';

interface ExamenFisicoPanelProps {
  pacienteId: string;
  /** Si se provee, solo muestra/crea registros de esta consulta puntual. */
  consultaId?: string;
}

export function ExamenFisicoPanel({ pacienteId, consultaId }: ExamenFisicoPanelProps) {
  const { data: todos = [], isLoading } = useExamenFisicoPaciente(pacienteId);
  const registros = useMemo(() => (consultaId ? todos.filter((r) => r.consultaId === consultaId) : todos), [todos, consultaId]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const navigate = useNavigate();

  const columns = useMemo<ColumnDef<ExamenFisico>[]>(
    () => [
      { header: 'Fecha', accessorFn: (r) => format(parseISO(r.fecha), 'd MMM yyyy', { locale: es }) },
      { header: 'Peso (kg)', accessorFn: (r) => r.pesoKg ?? '—' },
      { header: 'Altura (cm)', accessorFn: (r) => r.tallaCm ?? '—' },
      { header: 'IMC', accessorFn: (r) => (r.imc ? r.imc.toFixed(1) : '—') },
      { header: 'TA', accessorFn: (r) => (r.taSistolica && r.taDiastolica ? `${r.taSistolica}/${r.taDiastolica}` : '—') },
      { header: 'FC', accessorFn: (r) => r.fc ?? '—' },
      { header: 'Grasa (%)', accessorFn: (r) => r.grasaCorporalPct ?? '—' },
      { header: 'Sat. O2 (%)', accessorFn: (r) => r.saturacionOxigenoPct ?? '—' },
    ],
    [],
  );

  const masReciente = !consultaId && registros.length > 0 ? registros[0] : null;

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h3">Examen físico</Typography>
        {!mostrarForm && (
          <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setMostrarForm(true)}>
            Nuevo registro
          </Button>
        )}
        {mostrarForm && (
          <Button color="inherit" startIcon={<CloseOutlined />} onClick={() => setMostrarForm(false)}>
            Cerrar formulario
          </Button>
        )}
      </Stack>

      {mostrarForm && (
        <ExamenFisicoForm
          pacienteId={pacienteId}
          consultaId={consultaId}
          onCancel={() => setMostrarForm(false)}
          onGuardado={() => setMostrarForm(false)}
        />
      )}

      {masReciente && (
        <UltimoRegistroCard
          fecha={masReciente.fecha}
          items={[
            { label: 'Peso', value: masReciente.pesoKg ? `${masReciente.pesoKg} kg` : null },
            { label: 'IMC', value: masReciente.imc ? masReciente.imc.toFixed(1) : null },
            {
              label: 'TA',
              value: masReciente.taSistolica && masReciente.taDiastolica ? `${masReciente.taSistolica}/${masReciente.taDiastolica}` : null,
            },
            { label: 'FC', value: masReciente.fc ? `${masReciente.fc} lpm` : null },
            { label: 'Sat. O2', value: masReciente.saturacionOxigenoPct ? `${masReciente.saturacionOxigenoPct}%` : null },
          ]}
          onVerConsulta={() => navigate({ to: '/consultas/$consultaId', params: { consultaId: masReciente.consultaId } })}
        />
      )}

      <DataTable data={registros} columns={columns} isLoading={isLoading} emptyMessage="Sin registros de examen físico." />
    </Box>
  );
}
