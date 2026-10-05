import { useState } from 'react';
import { Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { AddOutlined, CheckCircleOutlined } from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEnfermedadesPaciente, useMarcarEnfermedadResuelta } from '../hooks/useEnfermedades';
import { DiagnosticoFormDialog } from './DiagnosticoFormDialog';

export function EnfermedadesPanel({ pacienteId }: { pacienteId: string }) {
  const { data: enfermedades = [], isLoading } = useEnfermedadesPaciente(pacienteId);
  const marcarResuelta = useMarcarEnfermedadResuelta(pacienteId);
  const [open, setOpen] = useState(false);

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h3">Enfermedades y diagnósticos</Typography>
        <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setOpen(true)}>
          Nuevo diagnóstico
        </Button>
      </Stack>

      {!isLoading && enfermedades.length === 0 && (
        <Typography variant="body2" color="text.secondary">Sin diagnósticos registrados.</Typography>
      )}

      <Stack spacing={1.5}>
        {enfermedades.map((e) => (
          <Card key={e.id}>
            <CardContent>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{e.enfermedadNombre}</Typography>
                    <Chip label={e.enfermedadCodigo} size="small" sx={{ bgcolor: '#c2dfe3', color: '#253237' }} />
                    <Chip
                      label={e.activa ? 'Activa' : 'Resuelta'}
                      size="small"
                      sx={e.activa ? { bgcolor: '#253237', color: '#e0fbfc' } : { bgcolor: '#e0e0e0', color: '#555' }}
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Diagnosticada el {format(parseISO(e.fechaDiagnostico), 'd MMM yyyy', { locale: es })}
                    {e.fechaResolucion && ` · Resuelta el ${format(parseISO(e.fechaResolucion), 'd MMM yyyy', { locale: es })}`}
                  </Typography>
                  {e.notas && <Typography variant="body2" sx={{ mt: 0.5 }}>{e.notas}</Typography>}
                </Box>
                {e.activa && (
                  <Button
                    size="small"
                    color="inherit"
                    startIcon={<CheckCircleOutlined />}
                    onClick={() => marcarResuelta.mutate({ id: e.id, fechaResolucion: new Date().toISOString().slice(0, 10) })}
                  >
                    Marcar resuelta
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <DiagnosticoFormDialog open={open} pacienteId={pacienteId} onClose={() => setOpen(false)} />
    </Box>
  );
}
