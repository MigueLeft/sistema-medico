export {
  useConsultasPorPaciente,
  useConsulta,
  useCrearConsulta,
  useActualizarNotasConsulta,
  consultasPorPacienteKey,
  consultaKey,
} from './hooks/useConsultas';
export { consultasService } from './services/consultas.service';
export { ConsultaFormDialog } from './components/ConsultaFormDialog';
export type { Consulta, CreateConsultaPayload, UpdateNotasConsultaPayload } from './types';
