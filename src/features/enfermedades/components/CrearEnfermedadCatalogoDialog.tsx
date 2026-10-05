import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material';
import { useCrearEnfermedadCatalogo } from '../hooks/useEnfermedades';
import type { EnfermedadCatalogo } from '../types';

const schema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  codigo: z.string().min(1, 'Requerido'),
  versionCie: z.enum(['10', '11']),
});

type FormValues = z.infer<typeof schema>;

interface CrearEnfermedadCatalogoDialogProps {
  open: boolean;
  nombreSugerido: string;
  onClose: () => void;
  onCreated: (enfermedad: EnfermedadCatalogo) => void;
}

export function CrearEnfermedadCatalogoDialog({ open, nombreSugerido, onClose, onCreated }: CrearEnfermedadCatalogoDialogProps) {
  const crear = useCrearEnfermedadCatalogo();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), values: { nombre: nombreSugerido, codigo: '', versionCie: '10' } });

  useEffect(() => {
    if (open) reset({ nombre: nombreSugerido, codigo: '', versionCie: '10' });
  }, [open, nombreSugerido, reset]);

  const onSubmit = (values: FormValues) => {
    crear.mutate(values, { onSuccess: (nueva) => onCreated(nueva) });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700 }}>Agregar enfermedad al catálogo</DialogTitle>
      <Stack component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          <Stack spacing={2.5}>
            <Controller
              name="nombre"
              control={control}
              render={({ field }) => (
                <TextField {...field} label="Nombre" error={!!errors.nombre} helperText={errors.nombre?.message} autoFocus />
              )}
            />
            <Controller
              name="codigo"
              control={control}
              render={({ field }) => (
                <TextField {...field} label="Código CIE" error={!!errors.codigo} helperText={errors.codigo?.message} />
              )}
            />
            <Controller
              name="versionCie"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Versión CIE">
                  <MenuItem value="10">CIE-10</MenuItem>
                  <MenuItem value="11">CIE-11</MenuItem>
                </TextField>
              )}
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
