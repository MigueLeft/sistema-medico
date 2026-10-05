import { invoke as tauriInvoke } from '@tauri-apps/api/core';

export interface ErrorApp {
  message: string;
}

function isErrorApp(value: unknown): value is ErrorApp {
  return typeof value === 'object' && value !== null && 'message' in value;
}

/**
 * Wrapper tipado sobre `invoke` que normaliza los errores que vienen de Rust
 * (`ErrorApp { message }`) a un `Error` estándar de JS, para que
 * TanStack Query y los toasts los puedan leer con `error.message`.
 */
export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await tauriInvoke<T>(cmd, args);
  } catch (err) {
    if (isErrorApp(err)) {
      throw new Error(err.message);
    }
    if (typeof err === 'string') {
      throw new Error(err);
    }
    throw err;
  }
}
