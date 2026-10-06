export interface ConsultaAbierta {
  id: string;
  pacienteId: string;
  pacienteNombre: string;
  fecha: string;
  diagnosticos: number;
}

export interface ResultadoReciente {
  examenId: string;
  pacienteId: string;
  pacienteNombre: string;
  nombre: string;
  valor: number | null;
  unidad: string | null;
  bandera: 'normal' | 'alto' | 'bajo' | null;
  fechaResultado: string | null;
}

export interface PacienteSinControl {
  id: string;
  nombre: string;
  ultimaConsulta: string | null;
}

export interface Dashboard {
  consultasSinCerrar: ConsultaAbierta[];
  resultadosRecientes: ResultadoReciente[];
  pacientesSinControl: PacienteSinControl[];
  /** `semanaInicio` es el lunes de cada semana (yyyy-MM-dd); las semanas sin consultas no vienen. */
  consultasPorSemana: Array<{ semanaInicio: string; total: number }>;
  diagnosticosFrecuentes: Array<{ nombre: string; total: number }>;
}

export interface ContadoresNav {
  citasHoy: number;
  consultasSinCerrar: number;
}
