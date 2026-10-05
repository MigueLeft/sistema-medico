import { useState } from 'react';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { EditOutlined } from '@mui/icons-material';
import { ConsultaSelect } from '@/components/ConsultaSelect';
import { useConsultasPorPaciente } from '@/features/consultas';
import { useTratamientoPorConsulta } from '../hooks/useTratamientos';
import { TratamientoFormDialog } from './TratamientoFormDialog';

interface TratamientoPanelProps {
  pacienteId: string;
  /** Si se provee, se administra directo el tratamiento de esta consulta (sin selector). */
  consultaId?: string;
}

export function TratamientoPanel({ pacienteId, consultaId: consultaFija }: TratamientoPanelProps) {
  const { data: consultas = [] } = useConsultasPorPaciente(consultaFija ? undefined : pacienteId);
  const [consultaSeleccionada, setConsultaSeleccionada] = useState('');
  const consultaId = consultaFija ?? consultaSeleccionada;
  const { data: tratamiento } = useTratamientoPorConsulta(consultaId || undefined);
  const [open, setOpen] = useState(false);

  return (
    <Box>
      <Typography variant="h3" sx={{ mb: 2 }}>Tratamiento</Typography>

      {!consultaFija && (
        <Box sx={{ maxWidth: 420, mb: 3 }}>
          <ConsultaSelect consultas={consultas} value={consultaSeleccionada} onChange={setConsultaSeleccionada} />
        </Box>
      )}

      {!consultaId && (
        <Typography variant="body2" color="text.secondary">
          Selecciona una consulta para ver o registrar su tratamiento.
        </Typography>
      )}

      {consultaId && (
        <Card>
          <CardContent>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
              <Typography variant="subtitle2" color="text.secondary">
                {tratamiento ? 'Tratamiento indicado' : 'Sin tratamiento registrado para esta consulta.'}
              </Typography>
              <Button size="small" startIcon={<EditOutlined />} onClick={() => setOpen(true)}>
                {tratamiento ? 'Editar' : 'Registrar tratamiento'}
              </Button>
            </Stack>

            {tratamiento?.indicacionesGenerales && (
              <Typography variant="body2" sx={{ mb: 1.5 }}>{tratamiento.indicacionesGenerales}</Typography>
            )}

            {tratamiento && tratamiento.medicamentos.length > 0 && (
              <Stack spacing={1}>
                {tratamiento.medicamentos.map((m) => (
                  <Box key={m.id} sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f4fbfc' }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{m.medicamentoNombre}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {m.dosis} · {m.frecuencia}
                      {m.duracion ? ` · ${m.duracion}` : ''}
                      {m.via ? ` · ${m.via}` : ''}
                    </Typography>
                    {m.indicaciones && <Typography variant="body2">{m.indicaciones}</Typography>}
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      )}

      {consultaId && <TratamientoFormDialog open={open} consultaId={consultaId} onClose={() => setOpen(false)} />}
    </Box>
  );
}
