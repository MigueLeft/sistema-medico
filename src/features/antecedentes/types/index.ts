export type TipoAntecedente = 'personal' | 'familiar' | 'quirurgico' | 'hospitalizacion' | 'alergia' | 'habito';

export interface Antecedente {
  id: string;
  pacienteId: string;
  tipo: TipoAntecedente;
  subcategoria: string | null;
  descripcion: string;
  codigoSnomed: string | null;
  detalle: string | null;
  /** Año (yyyy), mes (yyyy-MM) o fecha completa. */
  fecha: string | null;
  /** activo|resuelto, o confirmada|referida en alergias. */
  estado: string | null;
  parentesco: string | null;
  reaccion: string | null;
  severidad: string | null;
  diasEstancia: number | null;
  centroSalud: string | null;
  servicio: string | null;
  consultaId: string | null;
  fechaRegistro: string;
}

export type GuardarAntecedentePayload = Omit<Antecedente, 'id' | 'fechaRegistro'>;
