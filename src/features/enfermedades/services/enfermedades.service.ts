import { invoke } from '@/lib/tauri';
import type { CreateDiagnosticoPayload, CreateEnfermedadCatalogoPayload, EnfermedadCatalogo, PacienteEnfermedad } from '../types';

export const enfermedadesService = {
  async buscarCatalogo(query: string): Promise<EnfermedadCatalogo[]> {
    return invoke<EnfermedadCatalogo[]>('buscar_catalogo_enfermedades', { query });
  },
  async crearCatalogo(payload: CreateEnfermedadCatalogoPayload): Promise<EnfermedadCatalogo> {
    return invoke<EnfermedadCatalogo>('crear_enfermedad_catalogo', { payload });
  },
  async getPorPaciente(pacienteId: string): Promise<PacienteEnfermedad[]> {
    return invoke<PacienteEnfermedad[]>('listar_enfermedades_paciente', { pacienteId });
  },
  async crearDiagnostico(payload: CreateDiagnosticoPayload): Promise<PacienteEnfermedad> {
    return invoke<PacienteEnfermedad>('crear_diagnostico_paciente', { payload });
  },
  async marcarResuelta(id: string, fechaResolucion: string): Promise<PacienteEnfermedad> {
    return invoke<PacienteEnfermedad>('marcar_enfermedad_resuelta', { id, fechaResolucion });
  },
};
