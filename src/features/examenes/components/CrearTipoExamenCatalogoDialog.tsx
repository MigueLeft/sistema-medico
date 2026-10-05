import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material';
import { useCrearTipoExamenCatalogo } from '../hooks/useExamenes';
import type { TipoExamenCatalogo } from '../types';

const schema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  categoria: z.enum(['laboratorio', 'imagenologia', 'otro']),
  codigoLoinc: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface CrearTipoExamenCatalogoDialogProps {
  open: boolean;
  nombreSugerido: string;
  onClose: () => void;
  onCreated: (tipo: TipoExamenCatalogo) => void;
}

export function CrearTipoExamenCatalogoDialog({ open, nombreSugerido, onClose, onCreated }: CrearTipoExamenCatalogoDialogProps) {
  const crear = useCrearTipoExamenCatalogo();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), values: { nombre: nombreSugerido, categoria: 'laboratorio', codigoLoinc: '' } });

  useEffect(() => {
    if (open) reset({ nombre: nombreSugerido, categoria: 'laboratorio', codigoLoinc: '' });
  }, [open, nombreSugerido, reset]);

  const onSubmit = (values: FormValues) => {
    crear.mutate(
      { nombre: values.nombre, categoria: values.categoria, codigoLoinc: values.codigoLoinc || undefined },
      { onSuccess: (nuevo) => onCreated(nuevo) },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700 }}>Agregar tipo de examen</DialogTitle>
      <Stack component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          <Stack spacing={2.5}>
            <Controller
              name="nombre"
              control={control}
              render={({ field }) => <TextField {...field} label="Nombre" error={!!errors.nombre} helperText={errors.nombre?.message} autoFocus />}
            />
            <Controller
              name="categoria"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Categoría">
                  <MenuItem value="laboratorio">Laboratorio</MenuItem>
                  <MenuItem value="imagenologia">Imagenología</MenuItem>
                  <MenuItem value="otro">Otro</MenuItem>
                </TextField>
              )}
            />
            <Controller
              name="codigoLoinc"
              control={control}
              render={({ field }) => <TextField {...field} label="Código LOINC (opcional)" />}
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
