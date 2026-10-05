import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import { useCrearMedicamentoCatalogo } from '../hooks/useTratamientos';
import type { MedicamentoCatalogo } from '../types';

const schema = z.object({
  nombreComercial: z.string().min(1, 'Requerido'),
  principioActivo: z.string().min(1, 'Requerido'),
  presentacion: z.string().optional(),
  concentracion: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface CrearMedicamentoCatalogoDialogProps {
  open: boolean;
  nombreSugerido: string;
  onClose: () => void;
  onCreated: (medicamento: MedicamentoCatalogo) => void;
}

export function CrearMedicamentoCatalogoDialog({ open, nombreSugerido, onClose, onCreated }: CrearMedicamentoCatalogoDialogProps) {
  const crear = useCrearMedicamentoCatalogo();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: { nombreComercial: nombreSugerido, principioActivo: '', presentacion: '', concentracion: '' },
  });

  useEffect(() => {
    if (open) reset({ nombreComercial: nombreSugerido, principioActivo: '', presentacion: '', concentracion: '' });
  }, [open, nombreSugerido, reset]);

  const onSubmit = (values: FormValues) => {
    crear.mutate(
      { ...values, presentacion: values.presentacion || undefined, concentracion: values.concentracion || undefined },
      { onSuccess: (nuevo) => onCreated(nuevo) },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700 }}>Agregar medicamento</DialogTitle>
      <Stack component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          <Stack spacing={2.5}>
            <Controller
              name="nombreComercial"
              control={control}
              render={({ field }) => (
                <TextField {...field} label="Nombre comercial" error={!!errors.nombreComercial} helperText={errors.nombreComercial?.message} autoFocus />
              )}
            />
            <Controller
              name="principioActivo"
              control={control}
              render={({ field }) => (
                <TextField {...field} label="Principio activo" error={!!errors.principioActivo} helperText={errors.principioActivo?.message} />
              )}
            />
            <Controller
              name="presentacion"
              control={control}
              render={({ field }) => <TextField {...field} label="Presentación (opcional)" />}
            />
            <Controller
              name="concentracion"
              control={control}
              render={({ field }) => <TextField {...field} label="Concentración (opcional)" />}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color="inherit">Cancelar</Button>
          <Button type="submit" variant="contained" loading={crear.isPending}>Agregar</Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
}
