import { Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { ChevronRightOutlined } from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface UltimoRegistroCardProps {
  fecha: string;
  items: { label: string; value: string | number | null | undefined }[];
  onVerConsulta: () => void;
}

export function UltimoRegistroCard({ fecha, items, onVerConsulta }: UltimoRegistroCardProps) {
  return (
    <Card sx={{ mb: 3, borderColor: 'primary.main', borderWidth: 1.5 }}>
      <CardContent>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Chip label="Más reciente" size="small" sx={{ bgcolor: 'primary.main', color: '#e0fbfc', fontWeight: 700 }} />
            <Typography variant="body2" color="text.secondary">
              {format(parseISO(fecha), "d 'de' MMMM yyyy", { locale: es })}
            </Typography>
          </Stack>
          <Button size="small" endIcon={<ChevronRightOutlined />} onClick={onVerConsulta}>
            Ver consulta
          </Button>
        </Stack>
        <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap' }}>
          {items.map((item) => (
            <Box key={item.label} sx={{ minWidth: 100 }}>
              <Typography variant="caption" color="text.secondary">{item.label}</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>{item.value ?? '—'}</Typography>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
