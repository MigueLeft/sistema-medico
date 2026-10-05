import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import { useCrearIntervencionQx } from '../hooks/useAntecedentes';

const schema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  fecha: z.string().min(1, 'Requerido'),
  notas: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface IntervencionQxFormDialogProps {
  open: boolean;
  pacienteId: string;
  onClose: () => void;
}

export function IntervencionQxFormDialog({ open, pacienteId, onClose }: IntervencionQxFormDialogProps) {
  const crear = useCrearIntervencionQx();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { nombre: '', fecha: '', notas: '' } });

  const onSubmit = (values: FormValues) => {
    crear.mutate(
      { pacienteId, nombre: values.nombre, fecha: values.fecha, notas: values.notas || undefined },
      { onSuccess: () => { reset(); onClose(); } },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700 }}>Nueva intervención quirúrgica</DialogTitle>
      <Stack component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          <Stack spacing={2.5}>
            <Controller
              name="nombre"
              control={control}
              render={({ field }) => (
                <TextField {...field} label="Nombre de la intervención" error={!!errors.nombre} helperText={errors.nombre?.message} autoFocus />
              )}
            />
            <Controller
              name="fecha"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Fecha"
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                  error={!!errors.fecha}
                  helperText={errors.fecha?.message}
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
          <Button onClick={onClose} color="inherit">Cancelar</Button>
          <Button type="submit" variant="contained" loading={crear.isPending}>Guardar</Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
}
