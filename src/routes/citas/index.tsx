import { useCallback, useMemo, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Box, Button, MenuItem, Select, Stack, Typography } from '@mui/material';
import { AddOutlined, MedicalServicesOutlined } from '@mui/icons-material';
import type { ColumnDef } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { DataTable } from '@/components/DataTable';
import {
  CitaFormDialog,
  EstadoCitaChip,
  useCambiarEstadoCita,
  useCitas,
  type Cita,
  type EstadoCita,
} from '@/features/citas';
import { consultasService, useCrearConsulta } from '@/features/consultas';

export const Route = createFileRoute('/citas/')({
  component: CitasPage,
});

const ESTADOS: EstadoCita[] = ['solicitada', 'agendada', 'atendida', 'cancelada'];

function CitasPage() {
  const { data: citas = [], isLoading } = useCitas();
  const cambiarEstado = useCambiarEstadoCita();
  const crearConsulta = useCrearConsulta();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [atendiendoId, setAtendiendoId] = useState<string | null>(null);

  const atender = useCallback(async (cita: Cita) => {
    setAtendiendoId(cita.id);
    try {
      const existente = await consultasService.getPorCita(cita.id);
      if (existente) {
        navigate({ to: '/consultas/$consultaId', params: { consultaId: existente.id } });
        return;
      }
      crearConsulta.mutate(
        { pacienteId: cita.pacienteId, citaId: cita.id, motivoConsulta: cita.motivo },
        {
          onSuccess: (consulta) => navigate({ to: '/consultas/$consultaId', params: { consultaId: consulta.id } }),
          onSettled: () => setAtendiendoId(null),
        },
      );
      return;
    } catch {
      // el error ya se notifica vía toast en el service/hook correspondiente
    }
    setAtendiendoId(null);
  }, [crearConsulta, navigate]);

  const columns = useMemo<ColumnDef<Cita>[]>(
    () => [
      { header: 'Paciente', accessorKey: 'pacienteNombre' },
      {
        header: 'Fecha y hora',
        accessorFn: (c) => format(parseISO(c.fechaHora), "d MMM yyyy, HH:mm", { locale: es }),
      },
      { header: 'Motivo', accessorKey: 'motivo' },
      {
        header: 'Estado',
        cell: ({ row }) => (
          <Select
            size="small"
            value={row.original.estado}
            onChange={(e) =>
              cambiarEstado.mutate({ id: row.original.id, estado: e.target.value as EstadoCita })
            }
            onClick={(e) => e.stopPropagation()}
            renderValue={(value) => <EstadoCitaChip estado={value as EstadoCita} />}
            sx={{ minWidth: 140, '& .MuiSelect-select': { py: 0.5 } }}
          >
            {ESTADOS.map((estado) => (
              <MenuItem key={estado} value={estado}>
                <EstadoCitaChip estado={estado} />
              </MenuItem>
            ))}
          </Select>
        ),
      },
      {
        header: '',
        id: 'atender',
        cell: ({ row }) => (
          <Button
            size="small"
            variant="outlined"
            startIcon={<MedicalServicesOutlined />}
            disabled={row.original.estado === 'cancelada'}
            loading={atendiendoId === row.original.id}
            onClick={(e) => {
              e.stopPropagation();
              atender(row.original);
            }}
          >
            Atender
          </Button>
        ),
      },
    ],
    [cambiarEstado, atendiendoId, atender],
  );

  return (
    <Box sx={{ p: { xs: 2.5, md: 4 } }}>
      <Stack direction="row" sx={{ mb: 3, alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h1" sx={{ color: 'primary.main' }}>
            Citas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Agenda de citas del consultorio
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setOpen(true)}>
          Agendar cita
        </Button>
      </Stack>

      <DataTable data={citas} columns={columns} isLoading={isLoading} emptyMessage="Todavía no hay citas agendadas." searchPlaceholder="Buscar por paciente o motivo..." />

      <CitaFormDialog open={open} onClose={() => setOpen(false)} />
    </Box>
  );
}
