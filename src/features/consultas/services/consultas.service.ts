import { invoke } from '@/lib/tauri';
import type {
  Consulta,
  ConsultaDiagnostico,
  ConsultaSintoma,
  CreateConsultaDiagnosticoPayload,
  CreateSintomaPayload,
  EstadoConsulta,
  ExamenSistema,
  GuardarConsultaPayload,
  GuardarExamenSistemaPayload,
  IniciarConsultaPayload,
  UpdateConsultaDiagnosticoPayload,
} from '../types';

export const consultasService = {
  async getPorPaciente(pacienteId: string): Promise<Consulta[]> {
    return invoke<Consulta[]>('listar_consultas_por_paciente', { pacienteId });
  },

  async getTodas(estado?: EstadoConsulta): Promise<Consulta[]> {
    return invoke<Consulta[]>('listar_consultas', { estado: estado ?? null });
  },

  async getOne(id: string): Promise<Consulta> {
    return invoke<Consulta>('obtener_consulta', { id });
  },

  async iniciar(payload: IniciarConsultaPayload): Promise<Consulta> {
    return invoke<Consulta>('iniciar_consulta', { payload });
  },

  async guardar(id: string, payload: GuardarConsultaPayload): Promise<Consulta> {
    return invoke<Consulta>('guardar_consulta', { id, payload });
  },

  async cerrar(id: string): Promise<Consulta> {
    return invoke<Consulta>('cerrar_consulta', { id });
  },

  async getSintomas(consultaId: string): Promise<ConsultaSintoma[]> {
    return invoke<ConsultaSintoma[]>('listar_sintomas_consulta', { consultaId });
  },

  async agregarSintoma(payload: CreateSintomaPayload): Promise<ConsultaSintoma> {
    return invoke<ConsultaSintoma>('agregar_sintoma_consulta', { payload });
  },

  async eliminarSintoma(id: string): Promise<void> {
    return invoke<void>('eliminar_sintoma_consulta', { id });
  },

  async getExamenSistemas(consultaId: string): Promise<ExamenSistema[]> {
    return invoke<ExamenSistema[]>('listar_examen_sistemas', { consultaId });
  },

  async guardarExamenSistema(payload: GuardarExamenSistemaPayload): Promise<void> {
    return invoke<void>('guardar_examen_sistema', { payload });
  },

  async getDiagnosticos(consultaId: string): Promise<ConsultaDiagnostico[]> {
    return invoke<ConsultaDiagnostico[]>('listar_diagnosticos_consulta', { consultaId });
  },

  async agregarDiagnostico(payload: CreateConsultaDiagnosticoPayload): Promise<ConsultaDiagnostico> {
    return invoke<ConsultaDiagnostico>('agregar_diagnostico_consulta', { payload });
  },

  async actualizarDiagnostico(id: string, payload: UpdateConsultaDiagnosticoPayload): Promise<ConsultaDiagnostico> {
    return invoke<ConsultaDiagnostico>('actualizar_diagnostico_consulta', { id, payload });
  },

  async eliminarDiagnostico(id: string): Promise<void> {
    return invoke<void>('eliminar_diagnostico_consulta', { id });
  },
};
