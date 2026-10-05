import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, Button, Divider, Stack, TextField, Typography } from '@mui/material';
import { useCrearOrganizacionInicial } from '../hooks/useAuth';

const schema = z.object({
  nombreOrganizacion: z.string().min(1, 'Requerido'),
  nombreCompleto: z.string().min(1, 'Requerido'),
  email: z.string().min(1, 'Requerido').email('Correo inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  colegiatura: z.string().optional(),
  especialidad: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function SetupForm() {
  const crearInicial = useCrearOrganizacionInicial();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombreOrganizacion: '',
      nombreCompleto: '',
      email: '',
      password: '',
      colegiatura: '',
      especialidad: '',
    },
  });

  const onSubmit = (values: FormValues) => {
    crearInicial.mutate(values);
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack spacing={2.5}>
        <Typography variant="h2" sx={{ color: 'primary.main' }}>
          Configuración inicial
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No hay ninguna cuenta creada todavía. Crea el consultorio y tu usuario de médico para
          empezar.
        </Typography>

        <Controller
          name="nombreOrganizacion"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Nombre del consultorio"
              error={!!errors.nombreOrganizacion}
              helperText={errors.nombreOrganizacion?.message}
              autoFocus
            />
          )}
        />

        <Divider />

        <Controller
          name="nombreCompleto"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Nombre completo"
              error={!!errors.nombreCompleto}
              helperText={errors.nombreCompleto?.message}
            />
          )}
        />
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Correo electrónico"
              type="email"
              error={!!errors.email}
              helperText={errors.email?.message}
            />
          )}
        />
        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Contraseña"
              type="password"
              error={!!errors.password}
              helperText={errors.password?.message}
            />
          )}
        />
        <Stack direction="row" spacing={2}>
          <Controller
            name="colegiatura"
            control={control}
            render={({ field }) => <TextField {...field} label="Colegiatura (opcional)" />}
          />
          <Controller
            name="especialidad"
            control={control}
            render={({ field }) => <TextField {...field} label="Especialidad (opcional)" />}
          />
        </Stack>

        <Button type="submit" variant="contained" size="large" loading={crearInicial.isPending}>
          Crear cuenta y continuar
        </Button>
      </Stack>
    </Box>
  );
}
