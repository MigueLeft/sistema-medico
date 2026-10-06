import { type ReactNode, useMemo, useState } from 'react';
import { Button, Checkbox, type Columna, DataTable, type Opcion, Panel, Select, TextField } from '@/components/ui';
import { fmtNumLibre, parseNum } from '@/lib/formato';
import { useCatalogo, useGuardarCatalogo } from '../hooks/useCatalogos';
import type { EntradaCatalogo, NombreCatalogo } from '../types';

export interface CampoCatalogo {
  clave: string;
  label: string;
  tipo?: 'texto' | 'area' | 'numero' | 'entero' | 'select' | 'bool';
  opciones?: Opcion[];
  requerido?: boolean;
  placeholder?: string;
  hint?: string;
  /** Ocupa media fila junto al campo siguiente. */
  mitad?: boolean;
}

export interface DefCatalogoPanel<T extends EntradaCatalogo> {
  catalogo: NombreCatalogo;
  /** Filtros de igualdad que se envían siempre (p. ej. una categoría de términos). */
  filtrosFijos?: Record<string, string>;
  textoAgregar: string;
  placeholderBusqueda: string;
  columnas: Array<Columna<T>>;
  /** Filtro del lado del cliente por una clave de texto de la entrada. */
  filtro?: { label: string; clave: keyof T & string; opciones?: Opcion[] };
  campos: CampoCatalogo[];
  /** Valores con los que arranca una entrada nueva. */
  nuevo: Record<string, unknown>;
  titulo: (entrada: T) => string;
  /** Línea bajo el título del detalle (código y tipo de concepto). */
  subtitulo?: (entrada: T) => ReactNode;
  /** Datos de solo lectura que se muestran en el detalle. */
  extra?: (entrada: T) => ReactNode;
  pie?: (total: number) => string;
}

type Valores = Record<string, string | boolean>;

function aValores(campos: CampoCatalogo[], origen: Record<string, unknown>): Valores {
  return Object.fromEntries(
    campos.map((c) => {
      const v = origen[c.clave];
      if (c.tipo === 'bool') return [c.clave, v === true];
      if (typeof v === 'number') return [c.clave, fmtNumLibre(v, 4).replace(/\./g, '')];
      return [c.clave, typeof v === 'string' ? v : ''];
    }),
  );
}

/** Lista + panel de detalle para mantener un catálogo. Cada pantalla de catálogo es una definición distinta. */
export function CatalogoPanel<T extends EntradaCatalogo>({ def }: { def: DefCatalogoPanel<T> }) {
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('');
  const [seleccionId, setSeleccionId] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  const { data: entradas = [], isLoading } = useCatalogo<T>(def.catalogo, { query: busqueda.trim() || undefined, filtros: def.filtrosFijos });

  const opcionesFiltro = useMemo<Opcion[]>(() => {
    if (!def.filtro) return [];
    if (def.filtro.opciones) return def.filtro.opciones;
    const clave = def.filtro.clave;
    const valores = entradas.map((e) => e[clave] as unknown).filter((v): v is string => typeof v === 'string' && v !== '');
    return [...new Set(valores)].sort().map((v) => ({ value: v, label: v }));
  }, [def.filtro, entradas]);
  const claveFiltro = def.filtro?.clave;
  const visibles = claveFiltro && filtro ? entradas.filter((e) => e[claveFiltro] === filtro) : entradas;
  const seleccion = creando ? null : (visibles.find((e) => e.id === seleccionId) ?? null);

  return (
    <div className="ap-split">
      <div className="ap-stack">
        <div className="ap-toolbar">
          <TextField label="Buscar en el catálogo" placeholder={def.placeholderBusqueda} style={{ width: 240 }} value={busqueda} onChange={setBusqueda} />
          {def.filtro ? <Select label={def.filtro.label} value={filtro} onChange={setFiltro} placeholder="Todos" options={opcionesFiltro} /> : null}
          <Button
            variant="primary"
            icon="plus"
            onClick={() => {
              setCreando(true);
              setSeleccionId(null);
            }}
          >
            {def.textoAgregar}
          </Button>
        </div>
        <DataTable
          columns={def.columnas}
          rows={visibles}
          rowKey={(e) => e.id}
          selectedKey={seleccion?.id ?? null}
          onRowClick={(e) => {
            setCreando(false);
            setSeleccionId(e.id);
          }}
          emptyText={isLoading ? 'Cargando…' : 'Sin entradas en el catálogo.'}
        />
        {def.pie ? <span className="cl-hint">{def.pie(visibles.length)}</span> : null}
      </div>

      <Panel className="ap-card" style={{ position: 'sticky', top: 0 }}>
        {creando || seleccion ? (
          // La `key` remonta el formulario al cambiar de entrada; una recarga de la lista no pisa lo que se edita.
          <DetalleCatalogo
            key={seleccion?.id ?? 'nueva'}
            def={def}
            entrada={seleccion}
            onGuardada={(id) => {
              setCreando(false);
              setSeleccionId(id);
            }}
            onDescartarNueva={() => setCreando(false)}
          />
        ) : (
          <div className="cl-pend-empty">Seleccione una entrada para ver y editar su detalle.</div>
        )}
      </Panel>
    </div>
  );
}

interface DetalleCatalogoProps<T extends EntradaCatalogo> {
  def: DefCatalogoPanel<T>;
  /** Entrada a editar; `null` = entrada nueva. */
  entrada: T | null;
  onGuardada: (id: string) => void;
  onDescartarNueva: () => void;
}

function DetalleCatalogo<T extends EntradaCatalogo>({ def, entrada, onGuardada, onDescartarNueva }: DetalleCatalogoProps<T>) {
  const guardar = useGuardarCatalogo<T>(def.catalogo);
  const inicial = () => aValores(def.campos, entrada ? (entrada as unknown as Record<string, unknown>) : def.nuevo);
  const [valores, setValores] = useState<Valores>(inicial);
  const [errores, setErrores] = useState<Record<string, string>>({});

  const enviar = () => {
    const e: Record<string, string> = {};
    const datos: Record<string, unknown> = { ...(entrada ? {} : def.filtrosFijos) };
    for (const c of def.campos) {
      const v = valores[c.clave];
      if (c.tipo === 'bool') {
        datos[c.clave] = v === true;
      } else if (c.tipo === 'numero' || c.tipo === 'entero') {
        const n = parseNum(String(v ?? ''));
        if (String(v ?? '').trim() !== '' && n === null) e[c.clave] = 'Número inválido';
        datos[c.clave] = n !== null && c.tipo === 'entero' ? Math.round(n) : n;
      } else {
        datos[c.clave] = String(v ?? '').trim() === '' ? null : String(v).trim();
      }
      if (c.requerido && (datos[c.clave] === null || datos[c.clave] === undefined)) e[c.clave] = 'Requerido';
    }
    setErrores(e);
    if (Object.keys(e).length > 0) return;
    guardar.mutate({ id: entrada?.id ?? null, datos: datos as Partial<Omit<T, 'id'>> }, { onSuccess: (guardada) => onGuardada(guardada.id) });
  };

  const descartar = () => {
    if (!entrada) onDescartarNueva();
    setValores(inicial());
    setErrores({});
  };

  const renderCampo = (c: CampoCatalogo) => {
    const valor = valores[c.clave];
    const cambiar = (v: string | boolean) => setValores((actuales) => ({ ...actuales, [c.clave]: v }));
    if (c.tipo === 'bool') {
      return (
        <Checkbox key={c.clave} checked={valor === true} onChange={cambiar}>
          {c.label}
        </Checkbox>
      );
    }
    if (c.tipo === 'select') {
      return (
        <Select key={c.clave} label={c.label} required={c.requerido} value={String(valor ?? '')} onChange={cambiar} options={c.opciones ?? []} placeholder={c.requerido ? undefined : 'Sin especificar'} error={errores[c.clave]} />
      );
    }
    return (
      <TextField
        key={c.clave}
        label={c.label}
        required={c.requerido}
        multiline={c.tipo === 'area'}
        rows={2}
        inputMode={c.tipo === 'numero' || c.tipo === 'entero' ? 'decimal' : undefined}
        placeholder={c.placeholder}
        hint={c.hint}
        value={String(valor ?? '')}
        onChange={cambiar}
        error={errores[c.clave]}
      />
    );
  };

  // Los campos marcados `mitad` se agrupan de dos en dos en una misma fila.
  const filas: CampoCatalogo[][] = [];
  for (const c of def.campos) {
    const ultima = filas[filas.length - 1];
    if (c.mitad && ultima && ultima.length === 1 && ultima[0].mitad) ultima.push(c);
    else filas.push([c]);
  }

  return (
    <div className="ap-card-body">
      <div>
        <div className="cl-label">{entrada ? 'Detalle' : 'Nueva entrada'}</div>
        <h2 className="ap-card-title" style={{ fontSize: 18, marginTop: 4 }}>
          {entrada ? def.titulo(entrada) : def.textoAgregar}
        </h2>
        {entrada && def.subtitulo ? (
          <div className="cl-entry-sub" style={{ marginTop: 4 }}>
            {def.subtitulo(entrada)}
          </div>
        ) : null}
      </div>
      {filas.map((fila) =>
        fila.length === 2 ? (
          <div key={fila[0].clave} className="ap-grid ap-grid-2">
            {fila.map(renderCampo)}
          </div>
        ) : (
          renderCampo(fila[0])
        ),
      )}
      {entrada && def.extra ? def.extra(entrada) : null}
      <div className="cl-row" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
        <Button onClick={descartar}>Descartar</Button>
        <Button variant="primary" disabled={guardar.isPending} onClick={enviar}>
          {entrada ? 'Guardar cambios' : 'Agregar al catálogo'}
        </Button>
      </div>
    </div>
  );
}
