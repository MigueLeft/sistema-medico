import { createFileRoute } from '@tanstack/react-router';
import { Box, Typography } from '@mui/material';
import { PlantillaEntregableForm } from '@/features/entregables';

export const Route = createFileRoute('/entregables/')({
  component: EntregablesPage,
});

function EntregablesPage() {
  return (
    <Box sx={{ p: { xs: 2.5, md: 4 } }}>
      <Typography variant="h1" sx={{ color: 'primary.main', mb: 0.5 }}>
        Entregables
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configura la plantilla general que se usa para generar recetas, órdenes, informes y constancias en PDF.
      </Typography>
      <PlantillaEntregableForm />
    </Box>
  );
}
