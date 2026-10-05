import { Box, Typography } from '@mui/material';
import { EntregableBuilder } from './EntregableBuilder';
import { EntregablesList } from './EntregablesList';

interface EntregablesPanelProps {
  pacienteId: string;
  consultaId: string;
}

export function EntregablesPanel({ pacienteId, consultaId }: EntregablesPanelProps) {
  return (
    <Box>
      <EntregableBuilder pacienteId={pacienteId} consultaId={consultaId} />
      <Typography variant="h3" sx={{ mb: 2 }}>Documentos de esta consulta</Typography>
      <EntregablesList pacienteId={pacienteId} consultaId={consultaId} />
    </Box>
  );
}
