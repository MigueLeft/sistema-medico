import { invoke } from '@/lib/tauri';
import type { CreatePendientePayload, EstadoPendiente, Pendiente } from '../types';

export const pendientesService = {
  async getPorPaciente(pacienteId: string): Promise<Pendiente[]> {
    return invoke<Pendiente[]>('listar_pendientes_paciente', { pacienteId });
  },
  async create(payload: CreatePendientePayload): Promise<Pendiente> {
    return invoke<Pendiente>('crear_pendiente', { payload });
  },
  async marcar(id: string, estado: EstadoPendiente, consultaId?: string | null): Promise<Pendiente> {
    return invoke<Pendiente>('marcar_pendiente', { id, payload: { estado, consultaId: consultaId ?? null } });
  },
  /** El archivo viaja como arreglo de bytes; Rust lo guarda en el directorio de datos de la app. */
  async adjuntar(id: string, archivo: File, consultaId?: string | null): Promise<Pendiente> {
    const datos = Array.from(new Uint8Array(await archivo.arrayBuffer()));
    return invoke<Pendiente>('adjuntar_archivo_pendiente', {
      id,
      payload: { consultaId: consultaId ?? null, nombre: archivo.name, mime: archivo.type || 'application/octet-stream', datos },
    });
  },
  async abrirArchivo(id: string): Promise<void> {
    return invoke<void>('abrir_archivo_pendiente', { id });
  },
  async remove(id: string): Promise<void> {
    return invoke<void>('eliminar_pendiente', { id });
  },
};
