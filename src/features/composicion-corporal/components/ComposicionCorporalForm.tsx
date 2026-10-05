import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, Button, Card, CardContent, Divider, Stack, TextField, Typography } from '@mui/material';
import { ConsultaSelect } from '@/components/ConsultaSelect';
import { useConsultasPorPaciente } from '@/features/consultas';
import { aNumero, aNumeroONull } from '@/lib/forms';
import { useCrearComposicionCorporal } from '../hooks/useComposicionCorporal';
import { HumanBodyDiagram } from './HumanBodyDiagram';
import { SegmentoFieldsEditor, SEGMENTO_VACIO, type SegmentoFormState } from './SegmentoFieldsEditor';
import { SEGMENTOS, type Segmento } from '../types';

const campo = z.string().optional();

const schema = z.object({
  alturaCm: campo,
  pesoKg: campo,
  imc: campo,
  mbKcal: campo,
  masaGrasaPct: campo,
  aguaTotalKg: campo,
  pesoIdealKg: campo,
  masaGrasaIdealKg: campo,
  notas: campo,
});

type FormValues = z.infer<typeof schema>;

const DEFAULT_VALUES: FormValues = {
  alturaCm: '',
  pesoKg: '',
  imc: '',
  mbKcal: '',
  masaGrasaPct: '',
  aguaTotalKg: '',
  pesoIdealKg: '',
  masaGrasaIdealKg: '',
  notas: '',
};

const SEGMENTOS_VACIOS: Record<Segmento, SegmentoFormState> = {
  brazo_izquierdo: SEGMENTO_VACIO,
  brazo_derecho: SEGMENTO_VACIO,
  pierna_izquierda: SEGMENTO_VACIO,
  pierna_derecha: SEGMENTO_VACIO,
  tronco: SEGMENTO_VACIO,
};

function segmentoTieneDatos(s: SegmentoFormState): boolean {
  return Object.values(s).some((v) => v.trim() !== '');
}

interface ComposicionCorporalFormProps {
  pacienteId: string;
  /** Si se provee, se guarda directo en esta consulta (sin selector). */
  consultaId?: string;
  onCancel: () => void;
  onGuardado: () => void;
}

export function ComposicionCorporalForm({ pacienteId, consultaId: consultaFija, onCancel, onGuardado }: ComposicionCorporalFormProps) {
  const { data: consultas = [] } = useConsultasPorPaciente(consultaFija ? undefined : pacienteId);
  const crear = useCrearComposicionCorporal();

  const [consultaSeleccionada, setConsultaSeleccionada] = useState('');
  const [consultaError, setConsultaError] = useState(false);
  const [segmentoActivo, setSegmentoActivo] = useState<Segmento>('tronco');
  const [segmentos, setSegmentos] = useState<Record<Segmento, SegmentoFormState>>(SEGMENTOS_VACIOS);

  const { control, handleSubmit } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULT_VALUES });

  const [pesoKg, masaGrasaPct, masaGrasaIdealKg] = useWatch({ control, name: ['pesoKg', 'masaGrasaPct', 'masaGrasaIdealKg'] });
  const peso = aNumeroONull(pesoKg);
  const grasaPct = aNumeroONull(masaGrasaPct);
  const grasaKgPreview = peso !== null && grasaPct !== null ? (peso * grasaPct) / 100 : null;
  const magraKgPreview = peso !== null && grasaKgPreview !== null ? Math.max(peso - grasaKgPreview, 0) : null;
  const grasaIdealKg = aNumeroONull(masaGrasaIdealKg);
  const grasaAPerderPreview = grasaKgPreview !== null && grasaIdealKg !== null ? Math.max(grasaKgPreview - grasaIdealKg, 0) : null;

  const segmentosCompletos = new Set(SEGMENTOS.filter((s) => segmentoTieneDatos(segmentos[s])));

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
        alturaCm: aNumero(values.alturaCm),
        pesoKg: aNumero(values.pesoKg),
        imc: aNumero(values.imc),
        mbKcal: aNumero(values.mbKcal),
        masaGrasaPct: aNumero(values.masaGrasaPct),
        aguaTotalKg: aNumero(values.aguaTotalKg),
        pesoIdealKg: aNumero(values.pesoIdealKg),
        masaGrasaIdealKg: aNumero(values.masaGrasaIdealKg),
        notas: values.notas || undefined,
        segmentos: SEGMENTOS.filter((s) => segmentoTieneDatos(segmentos[s])).map((s) => ({
          segmento: s,
          masaGrasaPct: aNumero(segmentos[s].masaGrasaPct),
          masaGrasaKg: aNumero(segmentos[s].masaGrasaKg),
          masaMagraKg: aNumero(segmentos[s].masaMagraKg),
          masaMuscularPrevistaKg: aNumero(segmentos[s].masaMuscularPrevistaKg),
          masaMusculoEsqueleticaPct: aNumero(segmentos[s].masaMusculoEsqueleticaPct),
        })),
      },
      { onSuccess: onGuardado },
    );
  };

  return (
    <Card sx={{ mb: 3 }}>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent>
          <Stack spacing={2.5}>
            <Typography variant="h3">Nueva composición corporal</Typography>

            {!consultaFija && (
              <ConsultaSelect
                consultas={consultas}
                value={consultaSeleccionada}
                onChange={(v) => { setConsultaSeleccionada(v); setConsultaError(false); }}
                error={consultaError}
                helperText={consultaError ? 'Selecciona una consulta' : undefined}
              />
            )}

            <Typography variant="subtitle2" color="text.secondary">Datos generales</Typography>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
              <Controller name="alturaCm" control={control} render={({ field }) => <TextField {...field} label="Altura (cm)" type="number" />} />
              <Controller name="pesoKg" control={control} render={({ field }) => <TextField {...field} label="Peso (kg)" type="number" />} />
              <Controller name="imc" control={control} render={({ field }) => <TextField {...field} label="IMC" type="number" />} />
              <Controller name="mbKcal" control={control} render={({ field }) => <TextField {...field} label="MB (kcal)" type="number" />} />
            </Stack>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
              <Controller name="masaGrasaPct" control={control} render={({ field }) => <TextField {...field} label="Masa grasa (%)" type="number" />} />
              <TextField label="Masa grasa (kg)" value={grasaKgPreview !== null ? grasaKgPreview.toFixed(1) : ''} disabled />
              <TextField label="Masa magra (kg)" value={magraKgPreview !== null ? magraKgPreview.toFixed(1) : ''} disabled />
              <Controller name="aguaTotalKg" control={control} render={({ field }) => <TextField {...field} label="Agua total (kg)" type="number" />} />
            </Stack>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
              <Controller name="pesoIdealKg" control={control} render={({ field }) => <TextField {...field} label="Peso ideal (kg)" type="number" />} />
              <Controller name="masaGrasaIdealKg" control={control} render={({ field }) => <TextField {...field} label="Masa grasa ideal (kg)" type="number" />} />
              <TextField label="Grasa a perder (kg)" value={grasaAPerderPreview !== null ? grasaAPerderPreview.toFixed(1) : ''} disabled />
            </Stack>

            <Divider />
            <Typography variant="subtitle2" color="text.secondary">Composición por extremidad</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
              <Box sx={{ flexShrink: 0 }}>
                <HumanBodyDiagram segmentoActivo={segmentoActivo} segmentosCompletos={segmentosCompletos} onSelect={setSegmentoActivo} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <SegmentoFieldsEditor
                  segmento={segmentoActivo}
                  value={segmentos[segmentoActivo]}
                  onChange={(v) => setSegmentos((prev) => ({ ...prev, [segmentoActivo]: v }))}
                />
              </Box>
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
