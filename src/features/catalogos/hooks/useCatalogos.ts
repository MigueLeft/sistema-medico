import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { catalogosService } from '../services/catalogos.service';
import type { EntradaCatalogo, NombreCatalogo, OpcionesCatalogo } from '../types';

export const catalogoKey = (catalogo: NombreCatalogo) => ['catalogo', catalogo] as const;

export function useCatalogo<T extends EntradaCatalogo>(catalogo: NombreCatalogo, opciones: OpcionesCatalogo = {}) {
  return useQuery({
    queryKey: [...catalogoKey(catalogo), opciones.query ?? '', opciones.filtros ?? {}, opciones.limite ?? 0] as const,
    queryFn: () => catalogosService.listar<T>(catalogo, opciones),
  });
}

export function useGuardarCatalogo<T extends EntradaCatalogo>(catalogo: NombreCatalogo) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, datos }: { id: string | null; datos: Partial<Omit<T, 'id'>> }) => catalogosService.guardar<T>(catalogo, id, datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogoKey(catalogo) });
      queryClient.invalidateQueries({ queryKey: ['terminologia'] });
      toast.success('Catálogo actualizado.');
    },
    onError: (error: Error) => toast.error(error.message || 'Error al guardar en el catálogo'),
  });
}
