/** Convierte el valor string de un TextField numérico opcional a number|undefined. */
export function aNumero(valor?: string): number | undefined {
  if (!valor || valor.trim() === '') return undefined;
  const n = Number(valor);
  return Number.isNaN(n) ? undefined : n;
}

/** Igual que aNumero pero retorna null (útil para previews en vivo). */
export function aNumeroONull(valor?: string): number | null {
  const n = aNumero(valor);
  return n === undefined ? null : n;
}
