import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, Button, Card, CardContent, Divider, Stack, TextField, Typography } from '@mui/material';
import { ConsultaSelect } from '@/components/ConsultaSelect';
import { useConsultasPorPaciente } from '@/features/consultas';
import { aNumero, aNumeroONull } from '@/lib/forms';
import { useCrearExamenFisico } from '../hooks/useExamenFisico';

const campo = z.string().optional();

const schema = z.object({
  taSistolica: campo,
  taDiastolica: campo,
  pesoKg: campo,
  tallaCm: campo,
  grasaCorporalPct: campo,
  masaMuscularPct: campo,
  circunferenciaAbdominalCm: campo,
  circunferenciaCaderaCm: campo,
  circunferenciaCuelloCm: campo,
  fuerzaManoDerechaKg: campo,
  fuerzaManoIzquierdaKg: campo,
  fc: campo,
  temperatura: campo,
  frecuenciaRespiratoria: campo,
  saturacionOxigenoPct: campo,
  notas: campo,
});

type FormValues = z.infer<typeof schema>;

const DEFAULT_VALUES: FormValues = {
  taSistolica: '',
  taDiastolica: '',
  pesoKg: '',
  tallaCm: '',
  grasaCorporalPct: '',
  masaMuscularPct: '',
  circunferenciaAbdominalCm: '',
  circunferenciaCaderaCm: '',
  circunferenciaCuelloCm: '',
  fuerzaManoDerechaKg: '',
  fuerzaManoIzquierdaKg: '',
  fc: '',
  temperatura: '',
  frecuenciaRespiratoria: '',
  saturacionOxigenoPct: '',
  notas: '',
};

interface ExamenFisicoFormProps {
  pacienteId: string;
  /** Si se provee, el examen se guarda directo en esta consulta (sin selector). */
  consultaId?: string;
  onCancel: () => void;
  onGuardado: () => void;
}

export function ExamenFisicoForm({ pacienteId, consultaId: consultaFija, onCancel, onGuardado }: ExamenFisicoFormProps) {
  const { data: consultas = [] } = useConsultasPorPaciente(consultaFija ? undefined : pacienteId);
  const crear = useCrearExamenFisico();
  const [consultaSeleccionada, setConsultaSeleccionada] = useState('');
  const [consultaError, setConsultaError] = useState(false);

  const { control, handleSubmit } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULT_VALUES });

  const [pesoKg, tallaCm, grasaPct, muscularPct, abdominal, cadera] = useWatch({
    control,
    name: ['pesoKg', 'tallaCm', 'grasaCorporalPct', 'masaMuscularPct', 'circunferenciaAbdominalCm', 'circunferenciaCaderaCm'],
  });

  const peso = aNumeroONull(pesoKg);
  const talla = aNumeroONull(tallaCm);
  const imcPreview = peso && talla ? peso / (talla / 100) ** 2 : null;
  const grasaKgPreview = peso && aNumeroONull(grasaPct) !== null ? (peso * aNumeroONull(grasaPct)!) / 100 : null;
  const muscularKgPreview = peso && aNumeroONull(muscularPct) !== null ? (peso * aNumeroONull(muscularPct)!) / 100 : null;
  const abd = aNumeroONull(abdominal);
  const cad = aNumeroONull(cadera);
  const whrPreview = abd && cad ? abd / cad : null;

  const onSubmit = (values: FormValues) => {
    const consultaId = consultaFija ?? consultaSeleccionada;
    if (!consultaId) {
      setConsultaError(true);
      return;
    }
    crear.mutate(
      {
        pacienteId,
        consultaId,
        taSistolica: aNumero(values.taSistolica),
        taDiastolica: aNumero(values.taDiastolica),
        pesoKg: aNumero(values.pesoKg),
        tallaCm: aNumero(values.tallaCm),
        grasaCorporalPct: aNumero(values.grasaCorporalPct),
        masaMuscularPct: aNumero(values.masaMuscularPct),
        circunferenciaAbdominalCm: aNumero(values.circunferenciaAbdominalCm),
        circunferenciaCaderaCm: aNumero(values.circunferenciaCaderaCm),
        circunferenciaCuelloCm: aNumero(values.circunferenciaCuelloCm),
        fuerzaManoDerechaKg: aNumero(values.fuerzaManoDerechaKg),
        fuerzaManoIzquierdaKg: aNumero(values.fuerzaManoIzquierdaKg),
        fc: aNumero(values.fc),
        temperatura: aNumero(values.temperatura),
        frecuenciaRespiratoria: aNumero(values.frecuenciaRespiratoria),
        saturacionOxigenoPct: aNumero(values.saturacionOxigenoPct),
        notas: values.notas || undefined,
      },
      { onSuccess: onGuardado },
    );
  };

  return (
    <Card sx={{ mb: 3 }}>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent>
          <Stack spacing={2.5}>
            <Typography variant="h3">Nuevo examen físico</Typography>

            {!consultaFija && (
              <ConsultaSelect
                consultas={consultas}
                value={consultaSeleccionada}
                onChange={(v) => { setConsultaSeleccionada(v); setConsultaError(false); }}
                error={consultaError}
                helperText={consultaError ? 'Selecciona una consulta' : undefined}
              />
            )}

            <Typography variant="subtitle2" color="text.secondary">Signos vitales</Typography>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
              <Controller name="taSistolica" control={control} render={({ field }) => <TextField {...field} label="TA sistólica" type="number" />} />
              <Controller name="taDiastolica" control={control} render={({ field }) => <TextField {...field} label="TA diastólica" type="number" />} />
              <Controller name="fc" control={control} render={({ field }) => <TextField {...field} label="Frecuencia cardíaca (lpm)" type="number" />} />
              <Controller name="temperatura" control={control} render={({ field }) => <TextField {...field} label="Temperatura (°C)" type="number" />} />
              <Controller name="frecuenciaRespiratoria" control={control} render={({ field }) => <TextField {...field} label="Frecuencia respiratoria (rpm)" type="number" />} />
              <Controller name="saturacionOxigenoPct" control={control} render={({ field }) => <TextField {...field} label="Saturación O2 (%)" type="number" />} />
            </Stack>

            <Divider />
            <Typography variant="subtitle2" color="text.secondary">Antropometría y composición</Typography>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
              <Controller name="pesoKg" control={control} render={({ field }) => <TextField {...field} label="Peso (kg)" type="number" />} />
              <Controller name="tallaCm" control={control} render={({ field }) => <TextField {...field} label="Altura (cm)" type="number" />} />
              <TextField label="IMC" value={imcPreview ? imcPreview.toFixed(1) : ''} disabled />
              <Controller name="grasaCorporalPct" control={control} render={({ field }) => <TextField {...field} label="Grasa corporal (%)" type="number" />} />
              <TextField label="Grasa corporal (kg)" value={grasaKgPreview ? grasaKgPreview.toFixed(1) : ''} disabled />
              <Controller name="masaMuscularPct" control={control} render={({ field }) => <TextField {...field} label="Masa muscular (%)" type="number" />} />
              <TextField label="Masa magra/muscular (kg)" value={muscularKgPreview ? muscularKgPreview.toFixed(1) : ''} disabled />
            </Stack>

            <Divider />
            <Typography variant="subtitle2" color="text.secondary">Circunferencias</Typography>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
              <Controller name="circunferenciaAbdominalCm" control={control} render={({ field }) => <TextField {...field} label="Circunf. abdominal (cm)" type="number" />} />
              <Controller name="circunferenciaCaderaCm" control={control} render={({ field }) => <TextField {...field} label="Circunf. cadera (cm)" type="number" />} />
              <TextField label="Índice cintura-cadera" value={whrPreview ? whrPreview.toFixed(2) : ''} disabled />
              <Controller name="circunferenciaCuelloCm" control={control} render={({ field }) => <TextField {...field} label="Circunferencia de cuello (cm)" type="number" />} />
            </Stack>

            <Divider />
            <Typography variant="subtitle2" color="text.secondary">Fuerza de agarre</Typography>
            <Stack direction="row" spacing={2}>
              <Controller name="fuerzaManoDerechaKg" control={control} render={({ field }) => <TextField {...field} label="Fuerza mano derecha (kg)" type="number" />} />
              <Controller name="fuerzaManoIzquierdaKg" control={control} render={({ field }) => <TextField {...field} label="Fuerza mano izquierda (kg)" type="number" />} />
            </Stack>

            <Divider />
            <Controller name="notas" control={control} render={({ field }) => <TextField {...field} label="Notas generales" multiline minRows={3} />} />

            <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
              <Button onClick={onCancel} color="inherit">Cancelar</Button>
              <Button type="submit" variant="contained" loading={crear.isPending} disabled={!consultaFija && consultas.length === 0}>Guardar</Button>
            </Stack>
          </Stack>
        </CardContent>
      </Box>
    </Card>
  );
}
