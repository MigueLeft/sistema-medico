import { useMemo, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { AddOutlined } from '@mui/icons-material';
import type { ColumnDef } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { DataTable } from '@/components/DataTable';
import { useExamenesPaciente } from '../hooks/useExamenes';
import { ExamenFormDialog } from './ExamenFormDialog';
import { ExamenResultadoDialog } from './ExamenResultadoDialog';
import { EstadoExamenChip } from './EstadoExamenChip';
import type { Examen } from '../types';

interface ExamenesPanelProps {
  pacienteId: string;
  consultaId?: string;
}

export function ExamenesPanel({ pacienteId, consultaId }: ExamenesPanelProps) {
  const { data: todos = [], isLoading } = useExamenesPaciente(pacienteId);
  const examenes = useMemo(() => (consultaId ? todos.filter((r) => r.consultaId === consultaId) : todos), [todos, consultaId]);
  const [open, setOpen] = useState(false);
  const [seleccionado, setSeleccionado] = useState<Examen | null>(null);

  const columns = useMemo<ColumnDef<Examen>[]>(
    () => [
      { header: 'Examen', accessorKey: 'tipoExamenNombre' },
      { header: 'Categoría', accessorKey: 'tipoExamenCategoria' },
      { header: 'Solicitado', accessorFn: (r) => format(parseISO(r.fechaSolicitud), 'd MMM yyyy', { locale: es }) },
      { header: 'Resultado', accessorFn: (r) => (r.fechaResultado ? format(parseISO(r.fechaResultado), 'd MMM yyyy', { locale: es }) : '—') },
      { header: 'Estado', cell: ({ row }) => <EstadoExamenChip estado={row.original.estado} /> },
    ],
    [],
  );

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h3">Exámenes</Typography>
        <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setOpen(true)}>
          Solicitar examen
        </Button>
      </Stack>
      <DataTable
        data={examenes}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="Sin exámenes solicitados."
        onRowClick={(examen) => setSeleccionado(examen)}
      />
      <ExamenFormDialog open={open} pacienteId={pacienteId} consultaId={consultaId} onClose={() => setOpen(false)} />
      <ExamenResultadoDialog examen={seleccionado} onClose={() => setSeleccionado(null)} />
    </Box>
  );
}
