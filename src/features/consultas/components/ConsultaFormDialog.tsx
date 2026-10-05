import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import { useCrearConsulta } from '../hooks/useConsultas';

const schema = z.object({
  motivoConsulta: z.string().min(1, 'Requerido'),
  notasMedico: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ConsultaFormDialogProps {
  open: boolean;
  pacienteId: string;
  citaId?: string;
  motivoSugerido?: string;
  onClose: () => void;
}

export function ConsultaFormDialog({ open, pacienteId, citaId, motivoSugerido, onClose }: ConsultaFormDialogProps) {
  const crear = useCrearConsulta();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: { motivoConsulta: motivoSugerido ?? '', notasMedico: '' },
  });

  const onSubmit = (values: FormValues) => {
    crear.mutate(
      { pacienteId, citaId, motivoConsulta: values.motivoConsulta, notasMedico: values.notasMedico || undefined },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700 }}>
        {citaId ? 'Atender consulta' : 'Nueva consulta'}
      </DialogTitle>
      <Stack component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          <Stack spacing={2.5}>
            <Controller
              name="motivoConsulta"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Motivo de la consulta"
                  multiline
                  minRows={2}
                  error={!!errors.motivoConsulta}
                  helperText={errors.motivoConsulta?.message}
                  autoFocus
                />
              )}
            />
            <Controller
              name="notasMedico"
              control={control}
              render={({ field }) => <TextField {...field} label="Notas del médico (opcional)" multiline minRows={4} />}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color="inherit">
            Cancelar
          </Button>
          <Button type="submit" variant="contained" loading={crear.isPending}>
            Guardar consulta
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
}
