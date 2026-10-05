import { useMemo } from 'react';
import { Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { PictureAsPdfOutlined } from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAbrirEntregable, useEntregablesPaciente } from '../hooks/useEntregables';
import type { TipoEntregable } from '../types';

const TIPO_LABEL: Record<TipoEntregable, string> = {
  receta: 'Receta',
  orden_lab: 'Orden de laboratorio',
  informe: 'Informe',
  constancia: 'Constancia',
};

interface EntregablesListProps {
  pacienteId: string;
  consultaId?: string;
}

export function EntregablesList({ pacienteId, consultaId }: EntregablesListProps) {
  const { data: todos = [], isLoading } = useEntregablesPaciente(pacienteId);
  const abrir = useAbrirEntregable();
  const entregables = useMemo(
    () => (consultaId ? todos.filter((e) => e.consultaId === consultaId) : todos),
    [todos, consultaId],
  );

  if (isLoading) return null;

  if (entregables.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Todavía no se han generado documentos.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.5}>
      {entregables.map((e) => (
        <Card key={e.id}>
          <CardContent>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                  <Chip label={TIPO_LABEL[e.tipo]} size="small" sx={{ bgcolor: '#c2dfe3', color: '#253237', fontWeight: 700 }} />
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>{e.titulo || TIPO_LABEL[e.tipo]}</Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Emitido el {format(parseISO(e.fechaEmision), "d 'de' MMMM yyyy", { locale: es })}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                startIcon={<PictureAsPdfOutlined />}
                onClick={() => abrir.mutate(e.id)}
                disabled={!e.archivoPdfPath}
              >
                Abrir PDF
              </Button>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
