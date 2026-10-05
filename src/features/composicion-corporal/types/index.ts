export type Segmento = 'brazo_izquierdo' | 'brazo_derecho' | 'pierna_izquierda' | 'pierna_derecha' | 'tronco';

export const SEGMENTOS: Segmento[] = ['brazo_izquierdo', 'brazo_derecho', 'pierna_izquierda', 'pierna_derecha', 'tronco'];

export const SEGMENTO_LABEL: Record<Segmento, string> = {
  brazo_izquierdo: 'Brazo izquierdo',
  brazo_derecho: 'Brazo derecho',
  pierna_izquierda: 'Pierna izquierda',
  pierna_derecha: 'Pierna derecha',
  tronco: 'Tronco',
};

export interface ComposicionCorporalSegmento {
  id: string;
  segmento: Segmento;
  masaGrasaPct: number | null;
  masaGrasaKg: number | null;
  masaMagraKg: number | null;
  masaMuscularPrevistaKg: number | null;
  masaMusculoEsqueleticaPct: number | null;
  masaMusculoEsqueleticaKg: number | null;
}

export interface ItemSegmentoPayload {
  segmento: Segmento;
  masaGrasaPct?: number;
  masaGrasaKg?: number;
  masaMagraKg?: number;
  masaMuscularPrevistaKg?: number;
  masaMusculoEsqueleticaPct?: number;
}

export interface ComposicionCorporal {
  id: string;
  pacienteId: string;
  consultaId: string;
  fecha: string;
  alturaCm: number | null;
  pesoKg: number | null;
  imc: number | null;
  mbKcal: number | null;
  masaGrasaPct: number | null;
  masaGrasaKg: number | null;
  masaMagraKg: number | null;
  aguaTotalKg: number | null;
  pesoIdealKg: number | null;
  masaGrasaIdealKg: number | null;
  grasaAPerderKg: number | null;
  notas: string | null;
  segmentos: ComposicionCorporalSegmento[];
}

export interface CreateComposicionCorporalPayload {
  pacienteId: string;
  consultaId: string;
  alturaCm?: number;
  pesoKg?: number;
  imc?: number;
  mbKcal?: number;
  masaGrasaPct?: number;
  aguaTotalKg?: number;
  pesoIdealKg?: number;
  masaGrasaIdealKg?: number;
  notas?: string;
  segmentos: ItemSegmentoPayload[];
}
