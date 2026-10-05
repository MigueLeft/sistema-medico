import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { differenceInYears, isValid, parseISO } from 'date-fns';
import { useCrearPaciente, useActualizarPaciente } from '../hooks/usePatients';
import type { PacienteConExpediente } from '../types';

const schema = z.object({
  documentoIdentidad: z.string().min(1, 'Requerido'),
  nombres: z.string().min(1, 'Requerido'),
  apellidos: z.string().min(1, 'Requerido'),
  fechaNacimiento: z.string().min(1, 'Requerido'),
  sexo: z.enum(['masculino', 'femenino', 'otro']),
  telefono: z.string().optional(),
  email: z.string().email('Correo inválido').optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

const DEFAULT_VALUES: FormValues = {
  documentoIdentidad: '',
  nombres: '',
  apellidos: '',
  fechaNacimiento: '',
  sexo: 'masculino',
  telefono: '',
  email: '',
};

interface PatientFormDialogProps {
  open: boolean;
  paciente?: PacienteConExpediente | null;
  onClose: () => void;
}

export function PatientFormDialog({ open, paciente, onClose }: PatientFormDialogProps) {
  const crear = useCrearPaciente();
  const actualizar = useActualizarPaciente();
  const isEdit = !!paciente;
  const isPending = crear.isPending || actualizar.isPending;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULT_VALUES });

  const fechaNacimiento = useWatch({ control, name: 'fechaNacimiento' });
  const fecha = fechaNacimiento ? parseISO(fechaNacimiento) : null;
  const edad = fecha && isValid(fecha) ? differenceInYears(new Date(), fecha) : null;

  useEffect(() => {
    if (open) {
      reset(
        paciente
          ? {
              documentoIdentidad: paciente.documentoIdentidad,
              nombres: paciente.nombres,
              apellidos: paciente.apellidos,
              fechaNacimiento: paciente.fechaNacimiento,
              sexo: paciente.sexo,
              telefono: paciente.telefono ?? '',
              email: paciente.email ?? '',
            }
          : DEFAULT_VALUES,
      );
    }
  }, [open, paciente, reset]);

  const onSubmit = (values: FormValues) => {
    const payload = {
      ...values,
      telefono: values.telefono || undefined,
      email: values.email || undefined,
    };

    const onSuccess = () => onClose();

    if (isEdit && paciente) {
      actualizar.mutate({ id: paciente.id, payload }, { onSuccess });
    } else {
      crear.mutate(payload, { onSuccess });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700 }}>
        {isEdit ? 'Editar paciente' : 'Nuevo paciente'}
      </DialogTitle>
      <Stack component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={2}>
              <Controller
                name="nombres"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="Nombres" error={!!errors.nombres} helperText={errors.nombres?.message} autoFocus />
                )}
              />
              <Controller
                name="apellidos"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="Apellidos" error={!!errors.apellidos} helperText={errors.apellidos?.message} />
                )}
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <Controller
                name="documentoIdentidad"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Nro de cédula"
                    error={!!errors.documentoIdentidad}
                    helperText={errors.documentoIdentidad?.message}
                  />
                )}
              />
              <Controller
                name="fechaNacimiento"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Fecha de nacimiento"
                    type="date"
                    slotProps={{ inputLabel: { shrink: true } }}
                    error={!!errors.fechaNacimiento}
                    helperText={errors.fechaNacimiento?.message ?? (edad !== null ? `${edad} años` : undefined)}
                  />
                )}
              />
            </Stack>
            <Controller
              name="sexo"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Sexo">
                  <MenuItem value="masculino">Masculino</MenuItem>
                  <MenuItem value="femenino">Femenino</MenuItem>
                  <MenuItem value="otro">Otro</MenuItem>
                </TextField>
              )}
            />
            <Stack direction="row" spacing={2}>
              <Controller
                name="telefono"
                control={control}
                render={({ field }) => <TextField {...field} label="Teléfono (opcional)" />}
              />
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="Correo (opcional)" error={!!errors.email} helperText={errors.email?.message} />
                )}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color="inherit">
            Cancelar
          </Button>
          <Button type="submit" variant="contained" loading={isPending}>
            {isEdit ? 'Guardar cambios' : 'Registrar paciente'}
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
}
