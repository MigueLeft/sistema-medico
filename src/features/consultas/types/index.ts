export type EstadoConsulta = 'borrador' | 'cerrada';

export interface Consulta {
  id: string;
  pacienteId: string;
  pacienteNombre: string;
  expedienteCodigo: string;
  medicoId: string;
  medicoNombre: string;
  citaId: string | null;
  fecha: string;
  tipoCitaId: string | null;
  tipoCitaNombre: string | null;
  motivoConsulta: string;
  enfermedadActual: string | null;
  notasMedico: string | null;
  estado: EstadoConsulta;
  cerradaAt: string | null;
  impresionDiagnostica: string | null;
  proximoControl: string | null;
  proximoControlTipoId: string | null;
  diagnosticoPrincipal: string | null;
}

export interface IniciarConsultaPayload {
  pacienteId: string;
  citaId?: string | null;
}

export interface GuardarConsultaPayload {
  tipoCitaId: string | null;
  motivoConsulta: string;
  enfermedadActual: string | null;
  notasMedico: string | null;
  impresionDiagnostica: string | null;
  proximoControl: string | null;
  proximoControlTipoId: string | null;
}

export interface ConsultaSintoma {
  id: string;
  consultaId: string;
  nombre: string;
  codigoSnomed: string | null;
  detalle: string | null;
}

export interface CreateSintomaPayload {
  consultaId: string;
  nombre: string;
  codigoSnomed?: string | null;
  detalle?: string | null;
}

export type EstadoExamenSistema = 'normal' | 'hallazgos';

/** Un aparato o sistema del catálogo con lo registrado en la consulta (estado nulo = sin examinar). */
export interface ExamenSistema {
  sistemaId: string;
  sistemaNombre: string;
  textoNormal: string | null;
  estado: EstadoExamenSistema | null;
  descripcion: string | null;
  codigoSnomed: string | null;
}

export interface GuardarExamenSistemaPayload {
  consultaId: string;
  sistemaId: string;
  estado: EstadoExamenSistema | null;
  descripcion?: string | null;
  codigoSnomed?: string | null;
}

export type RolDiagnostico = 'principal' | 'secundario';
export type CertezaDiagnostico = 'definitivo' | 'presuntivo';

export interface ConsultaDiagnostico {
  id: string;
  consultaId: string;
  pacienteEnfermedadId: string;
  enfermedadCatalogoId: string;
  nombre: string;
  codigo: string;
  /** 'SCT', '10', '11' o 'LOCAL'. */
  sistema: string;
  tipo: 'nuevo' | 'seguimiento' | 'resuelto';
  rol: RolDiagnostico;
  certeza: CertezaDiagnostico;
  nota: string | null;
  activa: boolean;
}

export interface CreateConsultaDiagnosticoPayload {
  consultaId: string;
  enfermedadCatalogoId: string;
  rol?: RolDiagnostico;
  certeza?: CertezaDiagnostico;
  nota?: string | null;
}

export interface UpdateConsultaDiagnosticoPayload {
  rol: RolDiagnostico;
  certeza: CertezaDiagnostico;
  nota: string | null;
}
