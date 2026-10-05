export {
  usePacientes,
  usePaciente,
  useCrearPaciente,
  useActualizarPaciente,
  useEliminarPaciente,
  PACIENTES_KEY,
  pacienteKey,
} from './hooks/usePatients';
export { patientsService } from './services/patients.service';
export { PatientFormDialog } from './components/PatientFormDialog';
export type {
  Paciente,
  Expediente,
  PacienteConExpediente,
  CreatePacientePayload,
  UpdatePacientePayload,
  Sexo,
} from './types';
