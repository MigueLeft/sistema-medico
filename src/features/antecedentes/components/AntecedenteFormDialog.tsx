import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material';
import { useCrearAntecedente } from '../hooks/useAntecedentes';

const schema = z.object({
  tipo: z.enum(['personal', 'psicobiologico', 'familiar']),
  subcategoria: z.string().optional(),
  descripcion: z.string().min(1, 'Requerido'),
});

type FormValues = z.infer<typeof schema>;

interface AntecedenteFormDialogProps {
  open: boolean;
  pacienteId: string;
  onClose: () => void;
}

export function AntecedenteFormDialog({ open, pacienteId, onClose }: AntecedenteFormDialogProps) {
  const crear = useCrearAntecedente();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: 'personal', subcategoria: '', descripcion: '' },
  });

  const onSubmit = (values: FormValues) => {
    crear.mutate(
      { pacienteId, tipo: values.tipo, subcategoria: values.subcategoria || undefined, descripcion: values.descripcion },
      { onSuccess: () => { reset(); onClose(); } },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700 }}>Nuevo antecedente</DialogTitle>
      <Stack component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          <Stack spacing={2.5}>
            <Controller
              name="tipo"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Tipo">
                  <MenuItem value="personal">Personal</MenuItem>
                  <MenuItem value="psicobiologico">Psicobiológico</MenuItem>
                  <MenuItem value="familiar">Familiar</MenuItem>
                </TextField>
              )}
            />
            <Controller
              name="subcategoria"
              control={control}
              render={({ field }) => <TextField {...field} label="Subcategoría (opcional)" />}
            />
            <Controller
              name="descripcion"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Descripción"
                  multiline
                  minRows={3}
                  error={!!errors.descripcion}
                  helperText={errors.descripcion?.message}
                  autoFocus
                />
              )}
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
