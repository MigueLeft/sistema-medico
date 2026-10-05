import { Box, Chip, Dialog, DialogContent, DialogTitle, Divider, Stack, Typography } from '@mui/material';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { SEGMENTO_LABEL } from '../types';
import type { ComposicionCorporal } from '../types';

function Dato({ label, valor }: { label: string; valor: string | number | null }) {
  return (
    <Box sx={{ minWidth: 120 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body1">{valor ?? '—'}</Typography>
    </Box>
  );
}

export function ComposicionCorporalDetalleDialog({ registro, onClose }: { registro: ComposicionCorporal | null; onClose: () => void }) {
  if (!registro) return null;

  return (
    <Dialog open={!!registro} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700 }}>
        Composición corporal — {format(parseISO(registro.fecha), 'd MMM yyyy', { locale: es })}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3}>
          <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap' }}>
            <Dato label="Altura (cm)" valor={registro.alturaCm} />
            <Dato label="Peso (kg)" valor={registro.pesoKg} />
            <Dato label="IMC" valor={registro.imc} />
            <Dato label="MB (kcal)" valor={registro.mbKcal} />
            <Dato label="Masa grasa (%)" valor={registro.masaGrasaPct} />
            <Dato label="Masa grasa (kg)" valor={registro.masaGrasaKg?.toFixed(1) ?? null} />
            <Dato label="Masa magra (kg)" valor={registro.masaMagraKg?.toFixed(1) ?? null} />
            <Dato label="Agua total (kg)" valor={registro.aguaTotalKg} />
            <Dato label="Peso ideal (kg)" valor={registro.pesoIdealKg} />
            <Dato label="Masa grasa ideal (kg)" valor={registro.masaGrasaIdealKg} />
            <Dato label="Grasa a perder (kg)" valor={registro.grasaAPerderKg?.toFixed(1) ?? null} />
          </Stack>

          {registro.notas && (
            <Typography variant="body2" color="text.secondary">{registro.notas}</Typography>
          )}

          <Divider />
          <Typography variant="subtitle2">Composición por extremidad</Typography>
          <Stack spacing={1.5}>
            {registro.segmentos.map((seg) => (
              <Box key={seg.id} sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f4fbfc', border: '1px solid #c2dfe3' }}>
                <Chip label={SEGMENTO_LABEL[seg.segmento]} size="small" sx={{ bgcolor: '#253237', color: '#e0fbfc', fontWeight: 700, mb: 1 }} />
                <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap' }}>
                  <Dato label="Masa grasa (%)" valor={seg.masaGrasaPct} />
                  <Dato label="Masa grasa (kg)" valor={seg.masaGrasaKg} />
                  <Dato label="Masa magra (kg)" valor={seg.masaMagraKg} />
                  <Dato label="Masa muscular prevista (kg)" valor={seg.masaMuscularPrevistaKg} />
                  <Dato label="Masa músculo esquelética (%)" valor={seg.masaMusculoEsqueleticaPct} />
                  <Dato label="Masa músculo esquelética (kg)" valor={seg.masaMusculoEsqueleticaKg?.toFixed(2) ?? null} />
                </Stack>
              </Box>
            ))}
            {registro.segmentos.length === 0 && (
              <Typography variant="body2" color="text.secondary">Sin datos por extremidad.</Typography>
            )}
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
