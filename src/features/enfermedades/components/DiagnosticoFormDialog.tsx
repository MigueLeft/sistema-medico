import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import { useCrearDiagnostico } from '../hooks/useEnfermedades';
import { EnfermedadAutocomplete } from './EnfermedadAutocomplete';
import type { EnfermedadCatalogo } from '../types';

const schema = z.object({
  fechaDiagnostico: z.string().min(1, 'Requerido'),
  notas: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface DiagnosticoFormDialogProps {
  open: boolean;
  pacienteId: string;
  onClose: () => void;
}

export function DiagnosticoFormDialog({ open, pacienteId, onClose }: DiagnosticoFormDialogProps) {
  const crear = useCrearDiagnostico();
  const [enfermedad, setEnfermedad] = useState<EnfermedadCatalogo | null>(null);
  const [enfermedadError, setEnfermedadError] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { fechaDiagnostico: '', notas: '' } });

  const cerrar = () => {
    reset();
    setEnfermedad(null);
    setEnfermedadError(false);
    onClose();
  };

  const onSubmit = (values: FormValues) => {
    if (!enfermedad) {
      setEnfermedadError(true);
      return;
    }
    crear.mutate(
      {
        pacienteId,
        enfermedadCatalogoId: enfermedad.id,
        fechaDiagnostico: values.fechaDiagnostico,
        notas: values.notas || undefined,
      },
      { onSuccess: cerrar },
    );
  };

  return (
    <Dialog open={open} onClose={cerrar} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700 }}>Nuevo diagnóstico</DialogTitle>
      <Stack component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          <Stack spacing={2.5}>
            <EnfermedadAutocomplete
              value={enfermedad}
              onChange={(v) => {
                setEnfermedad(v);
                setEnfermedadError(false);
              }}
              error={enfermedadError}
              helperText={enfermedadError ? 'Selecciona una enfermedad del catálogo' : undefined}
            />
            <Controller
              name="fechaDiagnostico"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Fecha de diagnóstico"
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                  error={!!errors.fechaDiagnostico}
                  helperText={errors.fechaDiagnostico?.message}
                />
              )}
            />
            <Controller
              name="notas"
              control={control}
              render={({ field }) => <TextField {...field} label="Notas (opcional)" multiline minRows={2} />}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={cerrar} color="inherit">Cancelar</Button>
          <Button type="submit" variant="contained" loading={crear.isPending}>Guardar</Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
}
