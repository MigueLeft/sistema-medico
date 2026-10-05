import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Box, Button, Card, CardContent, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { SaveOutlined } from '@mui/icons-material';
import { usePlantillaEntregable, useGuardarPlantillaEntregable } from '../hooks/useEntregables';

interface FormValues {
  nombreConsultorio: string;
  encabezado: string;
  piePagina: string;
}

export function PlantillaEntregableForm() {
  const { data: plantilla, isLoading } = usePlantillaEntregable();
  const guardar = useGuardarPlantillaEntregable();

  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: { nombreConsultorio: '', encabezado: '', piePagina: '' },
  });

  useEffect(() => {
    if (plantilla) {
      reset({
        nombreConsultorio: plantilla.nombreConsultorio ?? '',
        encabezado: plantilla.encabezado ?? '',
        piePagina: plantilla.piePagina ?? '',
      });
    }
  }, [plantilla, reset]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  const onSubmit = (values: FormValues) => {
    guardar.mutate({
      nombreConsultorio: values.nombreConsultorio || undefined,
      encabezado: values.encabezado || undefined,
      piePagina: values.piePagina || undefined,
    });
  };

  return (
    <Card sx={{ maxWidth: 640 }}>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent>
          <Stack spacing={2.5}>
            <Typography variant="body2" color="text.secondary">
              Esta información aparece como membrete y pie de página en todas las recetas, órdenes, informes y
              constancias que generes desde una consulta.
            </Typography>
            <TextField label="Nombre del consultorio" {...register('nombreConsultorio')} />
            <TextField
              label="Encabezado (médico, colegiatura, dirección, teléfono...)"
              multiline
              minRows={3}
              {...register('encabezado')}
            />
            <TextField label="Pie de página (texto legal, contacto...)" multiline minRows={3} {...register('piePagina')} />
            <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
              <Button type="submit" variant="contained" startIcon={<SaveOutlined />} loading={guardar.isPending}>
                Guardar plantilla
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Box>
    </Card>
  );
}
