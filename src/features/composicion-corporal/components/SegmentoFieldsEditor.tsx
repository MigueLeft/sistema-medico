import { Stack, TextField, Typography } from '@mui/material';
import { aNumeroONull } from '@/lib/forms';
import { SEGMENTO_LABEL, type Segmento } from '../types';

export interface SegmentoFormState {
  masaGrasaPct: string;
  masaGrasaKg: string;
  masaMagraKg: string;
  masaMuscularPrevistaKg: string;
  masaMusculoEsqueleticaPct: string;
}

export const SEGMENTO_VACIO: SegmentoFormState = {
  masaGrasaPct: '',
  masaGrasaKg: '',
  masaMagraKg: '',
  masaMuscularPrevistaKg: '',
  masaMusculoEsqueleticaPct: '',
};

interface SegmentoFieldsEditorProps {
  segmento: Segmento;
  value: SegmentoFormState;
  onChange: (value: SegmentoFormState) => void;
}

export function SegmentoFieldsEditor({ segmento, value, onChange }: SegmentoFieldsEditorProps) {
  const masaMagra = aNumeroONull(value.masaMagraKg);
  const mmeKgPreview = masaMagra !== null ? 0.566 * masaMagra : null;

  const set = (patch: Partial<SegmentoFormState>) => onChange({ ...value, ...patch });

  return (
    <Stack spacing={2} sx={{ p: 2, borderRadius: 2, bgcolor: '#f4fbfc', border: '1px solid #c2dfe3' }}>
      <Typography variant="subtitle2" sx={{ color: 'primary.main' }}>
        {SEGMENTO_LABEL[segmento]}
      </Typography>
      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
        <TextField
          label="Masa grasa (%)"
          type="number"
          size="small"
          value={value.masaGrasaPct}
          onChange={(e) => set({ masaGrasaPct: e.target.value })}
        />
        <TextField
          label="Masa grasa (kg)"
          type="number"
          size="small"
          value={value.masaGrasaKg}
          onChange={(e) => set({ masaGrasaKg: e.target.value })}
        />
        <TextField
          label="Masa magra (kg)"
          type="number"
          size="small"
          value={value.masaMagraKg}
          onChange={(e) => set({ masaMagraKg: e.target.value })}
        />
      </Stack>
      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
        <TextField
          label="Masa muscular prevista (kg)"
          type="number"
          size="small"
          value={value.masaMuscularPrevistaKg}
          onChange={(e) => set({ masaMuscularPrevistaKg: e.target.value })}
        />
        <TextField
          label="Masa músculo esquelética (%)"
          type="number"
          size="small"
          value={value.masaMusculoEsqueleticaPct}
          onChange={(e) => set({ masaMusculoEsqueleticaPct: e.target.value })}
        />
        <TextField label="Masa músculo esquelética (kg)" size="small" value={mmeKgPreview !== null ? mmeKgPreview.toFixed(2) : ''} disabled />
      </Stack>
    </Stack>
  );
}
