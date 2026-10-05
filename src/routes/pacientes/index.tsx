import { useMemo, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Box, Button, Stack, Typography } from '@mui/material';
import { AddOutlined } from '@mui/icons-material';
import type { ColumnDef } from '@tanstack/react-table';
import { differenceInYears, parseISO } from 'date-fns';
import { DataTable } from '@/components/DataTable';
import { PatientFormDialog, usePacientes, type PacienteConExpediente } from '@/features/patients';

export const Route = createFileRoute('/pacientes/')({
  component: PacientesPage,
});

function PacientesPage() {
  const { data: pacientes = [], isLoading } = usePacientes();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const columns = useMemo<ColumnDef<PacienteConExpediente>[]>(
    () => [
      {
        header: 'Nombre',
        accessorFn: (p) => `${p.nombres} ${p.apellidos}`,
      },
      { header: 'Cédula', accessorKey: 'documentoIdentidad' },
      { header: 'Edad', accessorFn: (p) => `${differenceInYears(new Date(), parseISO(p.fechaNacimiento))} años` },
      { header: 'Historia', accessorFn: (p) => p.expediente.codigo },
      { header: 'Teléfono', accessorFn: (p) => p.telefono ?? '—' },
    ],
    [],
  );

  return (
    <Box sx={{ p: { xs: 2.5, md: 4 } }}>
      <Stack direction="row" sx={{ mb: 3, alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h1" sx={{ color: 'primary.main' }}>
            Pacientes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {pacientes.length} paciente{pacientes.length === 1 ? '' : 's'} registrado
            {pacientes.length === 1 ? '' : 's'}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setOpen(true)}>
          Nuevo paciente
        </Button>
      </Stack>

      <DataTable
        data={pacientes}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="Todavía no hay pacientes registrados."
        searchPlaceholder="Buscar por nombre o cédula..."
        onRowClick={(paciente) => navigate({ to: '/pacientes/$pacienteId', params: { pacienteId: paciente.id } })}
      />

      <PatientFormDialog open={open} onClose={() => setOpen(false)} />
    </Box>
  );
}
