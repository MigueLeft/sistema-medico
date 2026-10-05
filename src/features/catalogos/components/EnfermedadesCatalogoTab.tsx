import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { AddOutlined, SearchOutlined } from '@mui/icons-material';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/DataTable';
import { enfermedadesService, CrearEnfermedadCatalogoDialog, type EnfermedadCatalogo } from '@/features/enfermedades';

export function EnfermedadesCatalogoTab() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['catalogo-enfermedades-admin', query],
    queryFn: () => enfermedadesService.buscarCatalogo(query),
  });

  const columns = useMemo<ColumnDef<EnfermedadCatalogo>[]>(
    () => [
      { header: 'Código', accessorKey: 'codigo' },
      { header: 'Versión CIE', accessorFn: (r) => `CIE-${r.versionCie}` },
      { header: 'Nombre', accessorKey: 'nombre' },
    ],
    [],
  );

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h3">Catálogo de enfermedades (CIE)</Typography>
        <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setOpen(true)}>
          Nueva enfermedad
        </Button>
      </Stack>
      <TextField
        placeholder="Buscar por nombre o código..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ maxWidth: 360, mb: 2 }}
        slotProps={{ input: { startAdornment: <SearchOutlined sx={{ mr: 1, color: 'text.secondary' }} /> } }}
      />
      <DataTable data={items} columns={columns} isLoading={isLoading} emptyMessage="Sin enfermedades en el catálogo." showSearch={false} />
      <CrearEnfermedadCatalogoDialog
        open={open}
        nombreSugerido=""
        onClose={() => setOpen(false)}
        onCreated={() => {
          setOpen(false);
          queryClient.invalidateQueries({ queryKey: ['catalogo-enfermedades-admin'] });
        }}
      />
    </Box>
  );
}
