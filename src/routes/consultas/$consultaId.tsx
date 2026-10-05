import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Box, Button, Card, CardContent, Chip, CircularProgress, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { ArrowBackOutlined, SaveOutlined } from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useConsulta, useActualizarNotasConsulta, type Consulta } from '@/features/consultas';
import { usePaciente, type PacienteConExpediente } from '@/features/patients';
import { AntecedentesPanel } from '@/features/antecedentes';
import { EnfermedadesPanel } from '@/features/enfermedades';
import { ExamenFisicoPanel } from '@/features/examen-fisico';
import { ComposicionCorporalPanel } from '@/features/composicion-corporal';
import { ExamenesPanel } from '@/features/examenes';
import { TratamientoPanel } from '@/features/tratamientos';
import { EntregablesPanel } from '@/features/entregables';

export const Route = createFileRoute('/consultas/$consultaId')({
  component: ConsultaPage,
});

const TABS = [
  'Antecedentes',
  'Enfermedades',
  'Examen físico',
  'Composición corporal',
  'Exámenes',
  'Tratamiento',
  'Entregables',
] as const;

function ConsultaPage() {
  const { consultaId } = Route.useParams();
  const { data: consulta, isLoading: cargandoConsulta } = useConsulta(consultaId);
  const { data: paciente, isLoading: cargandoPaciente } = usePaciente(consulta?.pacienteId);

  if (cargandoConsulta || cargandoPaciente || !consulta || !paciente) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return <ConsultaWorkspace key={consulta.id} consulta={consulta} paciente={paciente} />;
}

function ConsultaWorkspace({ consulta, paciente }: { consulta: Consulta; paciente: PacienteConExpediente }) {
  const actualizarNotas = useActualizarNotasConsulta();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [notas, setNotas] = useState(consulta.notasMedico ?? '');

  const notasCambiaron = notas !== (consulta.notasMedico ?? '');

  return (
    <Box sx={{ p: { xs: 2.5, md: 4 } }}>
      <Button
        startIcon={<ArrowBackOutlined />}
        color="inherit"
        sx={{ mb: 2 }}
        onClick={() => navigate({ to: '/pacientes/$pacienteId', params: { pacienteId: paciente.id } })}
      >
        Volver al expediente
      </Button>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h2" sx={{ color: 'primary.main' }}>
                {paciente.nombres} {paciente.apellidos}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  Consulta del {format(parseISO(consulta.fecha), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
                </Typography>
                <Chip label={consulta.motivoConsulta} size="small" sx={{ bgcolor: '#c2dfe3', color: '#253237' }} />
              </Stack>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1.5} sx={{ mt: 2, alignItems: 'flex-start' }}>
            <TextField
              label="Notas del médico"
              multiline
              minRows={2}
              fullWidth
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
            <Button
              variant="outlined"
              startIcon={<SaveOutlined />}
              disabled={!notasCambiaron || actualizarNotas.isPending}
              onClick={() => actualizarNotas.mutate({ id: consulta.id, payload: { notasMedico: notas } })}
              sx={{ flexShrink: 0, mt: 0.5 }}
            >
              Guardar
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} variant="scrollable" scrollButtons="auto">
        {TABS.map((label) => (
          <Tab key={label} label={label} />
        ))}
      </Tabs>

      {tab === 0 && <AntecedentesPanel pacienteId={paciente.id} />}
      {tab === 1 && <EnfermedadesPanel pacienteId={paciente.id} />}
      {tab === 2 && <ExamenFisicoPanel pacienteId={paciente.id} consultaId={consulta.id} />}
      {tab === 3 && <ComposicionCorporalPanel pacienteId={paciente.id} consultaId={consulta.id} />}
      {tab === 4 && <ExamenesPanel pacienteId={paciente.id} consultaId={consulta.id} />}
      {tab === 5 && <TratamientoPanel pacienteId={paciente.id} consultaId={consulta.id} />}
      {tab === 6 && <EntregablesPanel pacienteId={paciente.id} consultaId={consulta.id} />}
    </Box>
  );
}
