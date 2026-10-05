import { useState } from 'react';
import { Box, Card, CardContent, Chip, IconButton, Stack, Typography } from '@mui/material';
import { AddOutlined, DeleteOutlined } from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAntecedentes, useEliminarAntecedente, useIntervencionesQx, useEliminarIntervencionQx } from '../hooks/useAntecedentes';
import { AntecedenteFormDialog } from './AntecedenteFormDialog';
import { IntervencionQxFormDialog } from './IntervencionQxFormDialog';
import type { TipoAntecedente } from '../types';

const TIPO_LABEL: Record<TipoAntecedente, string> = {
  personal: 'Personal',
  psicobiologico: 'Psicobiológico',
  familiar: 'Familiar',
};

export function AntecedentesPanel({ pacienteId }: { pacienteId: string }) {
  const { data: antecedentes = [], isLoading } = useAntecedentes(pacienteId);
  const { data: intervenciones = [] } = useIntervencionesQx(pacienteId);
  const eliminarAntecedente = useEliminarAntecedente(pacienteId);
  const eliminarQx = useEliminarIntervencionQx(pacienteId);

  const [openAntecedente, setOpenAntecedente] = useState(false);
  const [openQx, setOpenQx] = useState(false);
  const [aEliminar, setAEliminar] = useState<{ tipo: 'antecedente' | 'qx'; id: string } | null>(null);

  return (
    <Stack spacing={4}>
      <Box>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h3">Antecedentes</Typography>
          <IconButton color="primary" onClick={() => setOpenAntecedente(true)}>
            <AddOutlined />
          </IconButton>
        </Stack>
        {!isLoading && antecedentes.length === 0 && (
          <Typography variant="body2" color="text.secondary">Sin antecedentes registrados.</Typography>
        )}
        <Stack spacing={1.5}>
          {antecedentes.map((a) => (
            <Card key={a.id}>
              <CardContent>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                      <Chip label={TIPO_LABEL[a.tipo]} size="small" sx={{ bgcolor: '#c2dfe3', color: '#253237', fontWeight: 700 }} />
                      {a.subcategoria && <Typography variant="caption" color="text.secondary">{a.subcategoria}</Typography>}
                    </Stack>
                    <Typography variant="body1">{a.descripcion}</Typography>
                  </Box>
                  <IconButton size="small" onClick={() => setAEliminar({ tipo: 'antecedente', id: a.id })}>
                    <DeleteOutlined fontSize="small" />
                  </IconButton>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Box>

      <Box>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h3">Intervenciones quirúrgicas</Typography>
          <IconButton color="primary" onClick={() => setOpenQx(true)}>
            <AddOutlined />
          </IconButton>
        </Stack>
        {intervenciones.length === 0 && (
          <Typography variant="body2" color="text.secondary">Sin intervenciones registradas.</Typography>
        )}
        <Stack spacing={1.5}>
          {intervenciones.map((qx) => (
            <Card key={qx.id}>
              <CardContent>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: 'primary.main' }}>
                      {format(parseISO(qx.fecha), 'd MMM yyyy', { locale: es })}
                    </Typography>
                    <Typography variant="body1">{qx.nombre}</Typography>
                    {qx.notas && <Typography variant="body2" color="text.secondary">{qx.notas}</Typography>}
                  </Box>
                  <IconButton size="small" onClick={() => setAEliminar({ tipo: 'qx', id: qx.id })}>
                    <DeleteOutlined fontSize="small" />
                  </IconButton>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Box>

      <AntecedenteFormDialog open={openAntecedente} pacienteId={pacienteId} onClose={() => setOpenAntecedente(false)} />
      <IntervencionQxFormDialog open={openQx} pacienteId={pacienteId} onClose={() => setOpenQx(false)} />
      <ConfirmDialog
        open={!!aEliminar}
        title="Eliminar registro"
        description="Esta acción no se puede deshacer desde la interfaz. ¿Deseas continuar?"
        destructive
        loading={eliminarAntecedente.isPending || eliminarQx.isPending}
        onClose={() => setAEliminar(null)}
        onConfirm={() => {
          if (!aEliminar) return;
          const onSuccess = () => setAEliminar(null);
          if (aEliminar.tipo === 'antecedente') eliminarAntecedente.mutate(aEliminar.id, { onSuccess });
          else eliminarQx.mutate(aEliminar.id, { onSuccess });
        }}
      />
    </Stack>
  );
}
