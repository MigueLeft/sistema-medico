import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useActualizarResultadoExamen } from '../hooks/useExamenes';
import { ExamenValoresEditor } from './ExamenValoresEditor';
import type { Examen } from '../types';

const schema = z.object({
  fechaResultado: z.string().min(1, 'Requerido'),
  estado: z.enum(['solicitado', 'en_proceso', 'completado', 'cancelado']),
  notas: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ExamenResultadoDialogProps {
  examen: Examen | null;
  onClose: () => void;
}

export function ExamenResultadoDialog({ examen, onClose }: ExamenResultadoDialogProps) {
  const actualizar = useActualizarResultadoExamen(examen?.pacienteId ?? '');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      fechaResultado: examen?.fechaResultado ?? new Date().toISOString().slice(0, 10),
      estado: examen?.estado ?? 'completado',
      notas: examen?.notas ?? '',
    },
  });

  if (!examen) return null;

  const onSubmit = (values: FormValues) => {
    actualizar.mutate({ id: examen.id, payload: { ...values, notas: values.notas || undefined } });
  };

  return (
    <Dialog open={!!examen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700 }}>
        {examen.tipoExamenNombre}
      </DialogTitle>
      <Stack component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          <Stack spacing={2.5}>
            <Typography variant="body2" color="text.secondary">
              Solicitado el {examen.fechaSolicitud}
            </Typography>
            <Controller
              name="estado"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Estado">
                  <MenuItem value="solicitado">Solicitado</MenuItem>
                  <MenuItem value="en_proceso">En proceso</MenuItem>
                  <MenuItem value="completado">Completado</MenuItem>
                  <MenuItem value="cancelado">Cancelado</MenuItem>
                </TextField>
              )}
            />
            <Controller
              name="fechaResultado"
              control={control}
              render={({ field }) => (
                <TextField {...field} label="Fecha de resultado" type="date" slotProps={{ inputLabel: { shrink: true } }} error={!!errors.fechaResultado} helperText={errors.fechaResultado?.message} />
              )}
            />
            <Controller
              name="notas"
              control={control}
              render={({ field }) => <TextField {...field} label="Notas (opcional)" multiline minRows={2} />}
            />

            {examen.tipoExamenCategoria === 'laboratorio' && <ExamenValoresEditor examenId={examen.id} />}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color="inherit">Cerrar</Button>
          <Button type="submit" variant="contained" loading={actualizar.isPending}>Guardar</Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
}
