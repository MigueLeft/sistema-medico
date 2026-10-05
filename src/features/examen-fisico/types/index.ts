export interface ExamenFisico {
  id: string;
  pacienteId: string;
  consultaId: string;
  fecha: string;
  taSistolica: number | null;
  taDiastolica: number | null;
  pesoKg: number | null;
  tallaCm: number | null;
  imc: number | null;
  grasaCorporalPct: number | null;
  grasaCorporalKg: number | null;
  masaMuscularPct: number | null;
  masaMuscularKg: number | null;
  circunferenciaAbdominalCm: number | null;
  circunferenciaCaderaCm: number | null;
  indiceCinturaCadera: number | null;
  circunferenciaCuelloCm: number | null;
  fuerzaManoDerechaKg: number | null;
  fuerzaManoIzquierdaKg: number | null;
  fc: number | null;
  temperatura: number | null;
  frecuenciaRespiratoria: number | null;
  saturacionOxigenoPct: number | null;
  notas: string | null;
}

export interface CreateExamenFisicoPayload {
  pacienteId: string;
  consultaId: string;
  taSistolica?: number;
  taDiastolica?: number;
  pesoKg?: number;
  tallaCm?: number;
  grasaCorporalPct?: number;
  masaMuscularPct?: number;
  circunferenciaAbdominalCm?: number;
  circunferenciaCaderaCm?: number;
  circunferenciaCuelloCm?: number;
  fuerzaManoDerechaKg?: number;
  fuerzaManoIzquierdaKg?: number;
  fc?: number;
  temperatura?: number;
  frecuenciaRespiratoria?: number;
  saturacionOxigenoPct?: number;
  notas?: string;
}
