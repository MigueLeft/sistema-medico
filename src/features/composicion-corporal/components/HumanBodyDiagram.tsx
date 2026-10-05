import { Box, Typography } from '@mui/material';
import { SEGMENTO_LABEL, type Segmento } from '../types';

interface RegionProps {
  segmento: Segmento;
  d?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rx?: number;
  activo: boolean;
  completo: boolean;
  onSelect: (segmento: Segmento) => void;
}

function Region({ segmento, x, y, width, height, rx = 10, activo, completo, onSelect }: RegionProps) {
  const fill = activo ? '#253237' : completo ? '#9db4c0' : '#c2dfe3';
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      rx={rx}
      fill={fill}
      stroke="#5c6b73"
      strokeWidth={activo ? 2 : 1}
      onClick={() => onSelect(segmento)}
      style={{ cursor: 'pointer', transition: 'fill 0.15s ease' }}
    >
      <title>{SEGMENTO_LABEL[segmento]}</title>
    </rect>
  );
}

interface HumanBodyDiagramProps {
  segmentoActivo: Segmento;
  segmentosCompletos: Set<Segmento>;
  onSelect: (segmento: Segmento) => void;
}

export function HumanBodyDiagram({ segmentoActivo, segmentosCompletos, onSelect }: HumanBodyDiagramProps) {
  const props = (segmento: Segmento) => ({
    segmento,
    activo: segmentoActivo === segmento,
    completo: segmentosCompletos.has(segmento),
    onSelect,
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      <svg width="180" height="340" viewBox="0 0 200 380">
        {/* Cabeza */}
        <circle cx="100" cy="35" r="26" fill="#e0fbfc" stroke="#5c6b73" strokeWidth={1} />
        {/* Brazo derecho del paciente (lado izquierdo de la pantalla) */}
        <Region {...props('brazo_derecho')} x={22} y={78} width={34} height={140} rx={14} />
        {/* Brazo izquierdo del paciente (lado derecho de la pantalla) */}
        <Region {...props('brazo_izquierdo')} x={144} y={78} width={34} height={140} rx={14} />
        {/* Tronco */}
        <Region {...props('tronco')} x={62} y={68} width={76} height={140} rx={16} />
        {/* Pierna derecha del paciente */}
        <Region {...props('pierna_derecha')} x={64} y={214} width={34} height={155} rx={14} />
        {/* Pierna izquierda del paciente */}
        <Region {...props('pierna_izquierda')} x={102} y={214} width={34} height={155} rx={14} />
      </svg>
      <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
        Vista frontal — la izquierda/derecha es la del paciente.
        <br />
        Haz clic en una zona para cargar sus datos.
      </Typography>
    </Box>
  );
}
