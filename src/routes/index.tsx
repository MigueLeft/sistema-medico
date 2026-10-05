import type { ReactNode } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { CalendarMonthOutlined, PersonOutlined } from '@mui/icons-material';
import { usePacientes } from '@/features/patients';
import { useCitas } from '@/features/citas';
import { useSesionActual } from '@/features/auth';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <Card sx={{ flex: 1, minWidth: 220 }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#c2dfe3',
            color: '#253237',
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h2">{value}</Typography>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

function HomePage() {
  const { data: session } = useSesionActual();
  const { data: pacientes = [] } = usePacientes();
  const { data: citas = [] } = useCitas();

  return (
    <Box sx={{ p: { xs: 2.5, md: 4 } }}>
      <Typography variant="h1" sx={{ color: 'primary.main', mb: 0.5 }}>
        Hola, {session?.nombreCompleto?.split(' ')[0] ?? 'doctor'}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Este es el resumen de tu consultorio.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>
        <StatCard icon={<PersonOutlined />} label="Pacientes registrados" value={pacientes.length} />
        <StatCard icon={<CalendarMonthOutlined />} label="Citas" value={citas.length} />
      </Stack>
    </Box>
  );
}
