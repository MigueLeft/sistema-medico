import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Box, Button, Stack, Typography } from '@mui/material';
import { AddOutlined, CloseOutlined } from '@mui/icons-material';
import type { ColumnDef } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { DataTable } from '@/components/DataTable';
import { UltimoRegistroCard } from '@/components/UltimoRegistroCard';
import { useComposicionCorporalPaciente } from '../hooks/useComposicionCorporal';
import { ComposicionCorporalForm } from './ComposicionCorporalForm';
import { ComposicionCorporalDetalleDialog } from './ComposicionCorporalDetalleDialog';
import type { ComposicionCorporal } from '../types';

interface ComposicionCorporalPanelProps {
  pacienteId: string;
  consultaId?: string;
}

export function ComposicionCorporalPanel({ pacienteId, consultaId }: ComposicionCorporalPanelProps) {
  const { data: todos = [], isLoading } = useComposicionCorporalPaciente(pacienteId);
  const registros = useMemo(() => (consultaId ? todos.filter((r) => r.consultaId === consultaId) : todos), [todos, consultaId]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [seleccionado, setSeleccionado] = useState<ComposicionCorporal | null>(null);
  const navigate = useNavigate();

  const columns = useMemo<ColumnDef<ComposicionCorporal>[]>(
    () => [
      { header: 'Fecha', accessorFn: (r) => format(parseISO(r.fecha), 'd MMM yyyy', { locale: es }) },
      { header: 'Peso (kg)', accessorFn: (r) => r.pesoKg ?? '—' },
      { header: 'IMC', accessorFn: (r) => r.imc ?? '—' },
      { header: 'Masa grasa (%)', accessorFn: (r) => r.masaGrasaPct ?? '—' },
      { header: 'Masa grasa (kg)', accessorFn: (r) => (r.masaGrasaKg ? r.masaGrasaKg.toFixed(1) : '—') },
      { header: 'Masa magra (kg)', accessorFn: (r) => (r.masaMagraKg ? r.masaMagraKg.toFixed(1) : '—') },
    ],
    [],
  );

  const masReciente = !consultaId && registros.length > 0 ? registros[0] : null;

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h3">Composición corporal</Typography>
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
        <ComposicionCorporalForm
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
            { label: 'IMC', value: masReciente.imc },
            { label: 'Masa grasa', value: masReciente.masaGrasaKg ? `${masReciente.masaGrasaKg.toFixed(1)} kg` : null },
            { label: 'Masa magra', value: masReciente.masaMagraKg ? `${masReciente.masaMagraKg.toFixed(1)} kg` : null },
          ]}
          onVerConsulta={() => navigate({ to: '/consultas/$consultaId', params: { consultaId: masReciente.consultaId } })}
        />
      )}

      <DataTable
        data={registros}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="Sin registros de composición corporal."
        onRowClick={(registro) => setSeleccionado(registro)}
      />
      <ComposicionCorporalDetalleDialog registro={seleccionado} onClose={() => setSeleccionado(null)} />
    </Box>
  );
}
