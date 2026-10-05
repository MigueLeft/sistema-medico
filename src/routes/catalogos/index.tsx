import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Box, Tab, Tabs, Typography } from '@mui/material';
import { EnfermedadesCatalogoTab, TiposExamenCatalogoTab, MedicamentosCatalogoTab } from '@/features/catalogos';

export const Route = createFileRoute('/catalogos/')({
  component: CatalogosPage,
});

function CatalogosPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ p: { xs: 2.5, md: 4 } }}>
      <Typography variant="h1" sx={{ color: 'primary.main', mb: 0.5 }}>
        Catálogos
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Datos de referencia usados en el expediente clínico.
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Enfermedades (CIE)" />
        <Tab label="Tipos de examen" />
        <Tab label="Medicamentos" />
      </Tabs>

      {tab === 0 && <EnfermedadesCatalogoTab />}
      {tab === 1 && <TiposExamenCatalogoTab />}
      {tab === 2 && <MedicamentosCatalogoTab />}
    </Box>
  );
}
