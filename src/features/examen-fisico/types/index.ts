export interface ExamenFisico {
  id: string;
  pacienteId: string;
  consultaId: string;
  fecha: string;
  taSistolica: number | null;
  taDiastolica: number | null;
  pesoKg: number | null;
  tallaCm: number | null;
  imc: number | null; // calculado
  grasaCorporalPct: number | null;
  grasaCorporalKg: number | null; // calculado
  masaMagraKg: number | null; // calculado
  masaMuscularPct: number | null; // calculado a partir de masaMuscularKg
  masaMuscularKg: number | null;
  circunferenciaAbdominalCm: number | null;
  circunferenciaCaderaCm: number | null;
  indiceCinturaCadera: number | null; // calculado
  circunferenciaCuelloCm: number | null;
  fuerzaManoDerechaKg: number | null;
  fuerzaManoIzquierdaKg: number | null;
  fc: number | null;
  temperatura: number | null;
  frecuenciaRespiratoria: number | null;
  saturacionOxigenoPct: number | null;
  notas: string | null;
}

/** Los campos calculados (imc, grasaCorporalKg, masaMagraKg, masaMuscularPct, indiceCinturaCadera) los deriva Rust. */
export interface GuardarExamenFisicoPayload {
  pacienteId: string;
  consultaId: string;
  taSistolica: number | null;
  taDiastolica: number | null;
  pesoKg: number | null;
  tallaCm: number | null;
  grasaCorporalPct: number | null;
  masaMuscularKg: number | null;
  circunferenciaAbdominalCm: number | null;
  circunferenciaCaderaCm: number | null;
  circunferenciaCuelloCm: number | null;
  fuerzaManoDerechaKg: number | null;
  fuerzaManoIzquierdaKg: number | null;
  fc: number | null;
  temperatura: number | null;
  frecuenciaRespiratoria: number | null;
  saturacionOxigenoPct: number | null;
  notas: string | null;
}
