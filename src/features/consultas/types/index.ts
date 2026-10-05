export interface Consulta {
  id: string;
  pacienteId: string;
  medicoId: string;
  medicoNombre: string;
  citaId: string | null;
  fecha: string; // ISO datetime
  motivoConsulta: string;
  notasMedico: string | null;
}

export interface CreateConsultaPayload {
  pacienteId: string;
  citaId?: string;
  motivoConsulta: string;
  notasMedico?: string;
}

export interface UpdateNotasConsultaPayload {
  notasMedico: string;
}
