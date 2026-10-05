import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { usePacientes } from '@/features/patients';
import { useCrearCita } from '../hooks/useCitas';

const schema = z.object({
  pacienteId: z.string().min(1, 'Selecciona un paciente'),
  fechaHora: z.string().min(1, 'Requerido'),
  motivo: z.string().min(1, 'Requerido'),
});

type FormValues = z.infer<typeof schema>;

interface CitaFormDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CitaFormDialog({ open, onClose }: CitaFormDialogProps) {
  const { data: pacientes = [] } = usePacientes();
  const crear = useCrearCita();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { pacienteId: '', fechaHora: '', motivo: '' },
  });

  const onSubmit = (values: FormValues) => {
    crear.mutate(values, {
      onSuccess: () => {
        reset();
        onClose();
      },
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700 }}>Nueva cita</DialogTitle>
      <Stack component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          <Stack spacing={2.5}>
            <Controller
              name="pacienteId"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  options={pacientes}
                  getOptionLabel={(p) => `${p.nombres} ${p.apellidos} — ${p.documentoIdentidad}`}
                  onChange={(_, value) => field.onChange(value?.id ?? '')}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Paciente"
                      error={!!errors.pacienteId}
                      helperText={errors.pacienteId?.message}
                    />
                  )}
                />
              )}
            />
            <Controller
              name="fechaHora"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Fecha y hora"
                  type="datetime-local"
                  slotProps={{ inputLabel: { shrink: true } }}
                  error={!!errors.fechaHora}
                  helperText={errors.fechaHora?.message}
                />
              )}
            />
            <Controller
              name="motivo"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Motivo de la cita"
                  multiline
                  minRows={2}
                  error={!!errors.motivo}
                  helperText={errors.motivo?.message}
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color="inherit">
            Cancelar
          </Button>
          <Button type="submit" variant="contained" loading={crear.isPending}>
            Agendar cita
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
}
