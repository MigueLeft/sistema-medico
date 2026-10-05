import { Avatar, Box, Chip, Stack, Typography } from '@mui/material';
import { differenceInYears, parseISO } from 'date-fns';
import type { PacienteConExpediente } from '@/features/patients';

export function ExpedienteHeader({ paciente }: { paciente: PacienteConExpediente }) {
  const edad = differenceInYears(new Date(), parseISO(paciente.fechaNacimiento));

  return (
    <Stack direction="row" spacing={2.5} sx={{ alignItems: 'center' }}>
      <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: '1.25rem' }}>
        {paciente.nombres.charAt(0).toUpperCase()}
        {paciente.apellidos.charAt(0).toUpperCase()}
      </Avatar>
      <Box sx={{ flex: 1 }}>
        <Typography variant="h2" sx={{ color: 'primary.main' }}>
          {paciente.nombres} {paciente.apellidos}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 0.5, alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {paciente.documentoIdentidad} · {edad} años · {paciente.sexo}
          </Typography>
          <Chip
            label={`Historia ${paciente.expediente.codigo}`}
            size="small"
            sx={{ bgcolor: '#c2dfe3', color: '#253237', fontWeight: 700 }}
          />
        </Stack>
      </Box>
    </Stack>
  );
}
