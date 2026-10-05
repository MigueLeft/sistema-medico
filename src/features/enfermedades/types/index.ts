export interface EnfermedadCatalogo {
  id: string;
  codigo: string;
  versionCie: string;
  nombre: string;
}

export interface CreateEnfermedadCatalogoPayload {
  codigo: string;
  versionCie: string;
  nombre: string;
}

export interface PacienteEnfermedad {
  id: string;
  pacienteId: string;
  enfermedadCatalogoId: string;
  enfermedadNombre: string;
  enfermedadCodigo: string;
  activa: boolean;
  fechaDiagnostico: string;
  fechaResolucion: string | null;
  notas: string | null;
}

export interface CreateDiagnosticoPayload {
  pacienteId: string;
  enfermedadCatalogoId: string;
  fechaDiagnostico: string;
  notas?: string;
}
