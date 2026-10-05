import { useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { AddOutlined, ArrowBackOutlined, ChevronRightOutlined } from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { usePaciente } from '@/features/patients';
import { ExpedienteHeader } from '@/features/expedientes';
import { useConsultasPorPaciente, ConsultaFormDialog } from '@/features/consultas';
import { AntecedentesPanel } from '@/features/antecedentes';
import { EnfermedadesPanel } from '@/features/enfermedades';
import { ExamenFisicoPanel } from '@/features/examen-fisico';
import { ComposicionCorporalPanel } from '@/features/composicion-corporal';
import { ExamenesPanel } from '@/features/examenes';
import { TratamientoPanel } from '@/features/tratamientos';

export const Route = createFileRoute('/pacientes/$pacienteId')({
  component: ExpedientePage,
});

const TABS = ['Consultas', 'Antecedentes', 'Enfermedades', 'Examen físico', 'Composición corporal', 'Exámenes', 'Tratamiento'] as const;

function ExpedientePage() {
  const { pacienteId } = Route.useParams();
  const { data: paciente, isLoading } = usePaciente(pacienteId);
  const { data: consultas = [], isLoading: isLoadingConsultas } = useConsultasPorPaciente(pacienteId);
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [openConsulta, setOpenConsulta] = useState(false);

  if (isLoading || !paciente) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2.5, md: 4 } }}>
      <Button component={Link} to="/pacientes" startIcon={<ArrowBackOutlined />} color="inherit" sx={{ mb: 2 }}>
        Volver a pacientes
      </Button>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <ExpedienteHeader paciente={paciente} />
        </CardContent>
      </Card>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} variant="scrollable" scrollButtons="auto">
        {TABS.map((label) => (
          <Tab key={label} label={label} />
        ))}
      </Tabs>

      {tab === 0 && (
        <Box>
          <Stack direction="row" sx={{ mb: 2, justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h3">Historial de consultas</Typography>
            <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setOpenConsulta(true)}>
              Nueva consulta
            </Button>
          </Stack>

          {isLoadingConsultas ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : consultas.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Este paciente todavía no tiene consultas registradas.
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {consultas.map((consulta) => (
                <Card key={consulta.id}>
                  <CardContent>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ color: 'primary.main' }}>
                          {format(parseISO(consulta.fecha), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
                        </Typography>
                        <Typography variant="body1" sx={{ mt: 0.5 }}>
                          {consulta.motivoConsulta}
                        </Typography>
                      </Box>
                      <Button
                        endIcon={<ChevronRightOutlined />}
                        size="small"
                        onClick={() => navigate({ to: '/consultas/$consultaId', params: { consultaId: consulta.id } })}
                      >
                        Ver consulta
                      </Button>
                    </Stack>
                    {consulta.notasMedico && (
                      <>
                        <Divider sx={{ my: 1.5 }} />
                        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                          {consulta.notasMedico}
                        </Typography>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}

          <ConsultaFormDialog open={openConsulta} pacienteId={paciente.id} onClose={() => setOpenConsulta(false)} />
        </Box>
      )}

      {tab === 1 && <AntecedentesPanel pacienteId={paciente.id} />}
      {tab === 2 && <EnfermedadesPanel pacienteId={paciente.id} />}
      {tab === 3 && <ExamenFisicoPanel pacienteId={paciente.id} />}
      {tab === 4 && <ComposicionCorporalPanel pacienteId={paciente.id} />}
      {tab === 5 && <ExamenesPanel pacienteId={paciente.id} />}
      {tab === 6 && <TratamientoPanel pacienteId={paciente.id} />}
    </Box>
  );
}
