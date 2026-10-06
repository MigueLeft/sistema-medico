import { useState } from 'react';
import { Button, Modal, Select, TerminologySearch, TextField } from '@/components/ui';
import { useGuardarAntecedente } from '../hooks/useAntecedentes';
import type { Antecedente, GuardarAntecedentePayload } from '../types';
import type { DefGrupoAntecedente } from './grupos';

/** El diálogo toma sus valores iniciales al montarse: quien lo usa lo monta al abrirlo. */
interface AntecedenteFormDialogProps {
  onClose: () => void;
  grupo: DefGrupoAntecedente;
  pacienteId: string;
  /** Consulta desde la que se registra, si aplica. */
  consultaId?: string | null;
  /** Antecedente a editar; sin él se agrega uno nuevo. */
  antecedente?: Antecedente | null;
}

const PARENTESCOS = ['Madre', 'Padre', 'Hermano/a', 'Abuela materna', 'Abuelo materno', 'Abuela paterna', 'Abuelo paterno', 'Hijo/a', 'Tío/a'];
const SEVERIDADES = ['leve', 'moderada', 'grave'];

function vacio(grupo: DefGrupoAntecedente, pacienteId: string, consultaId?: string | null): GuardarAntecedentePayload {
  return {
    pacienteId,
    tipo: grupo.tipo,
    subcategoria: null,
    descripcion: '',
    codigoSnomed: null,
    detalle: null,
    fecha: null,
    estado: grupo.estadoInicial ?? null,
    parentesco: null,
    reaccion: null,
    severidad: null,
    diasEstancia: null,
    centroSalud: null,
    servicio: null,
    consultaId: consultaId ?? null,
  };
}

function aPayload(a: Antecedente): GuardarAntecedentePayload {
  return {
    pacienteId: a.pacienteId,
    tipo: a.tipo,
    subcategoria: a.subcategoria,
    descripcion: a.descripcion,
    codigoSnomed: a.codigoSnomed,
    detalle: a.detalle,
    fecha: a.fecha,
    estado: a.estado,
    parentesco: a.parentesco,
    reaccion: a.reaccion,
    severidad: a.severidad,
    diasEstancia: a.diasEstancia,
    centroSalud: a.centroSalud,
    servicio: a.servicio,
    consultaId: a.consultaId,
  };
}

export function AntecedenteFormDialog({ onClose, grupo, pacienteId, consultaId, antecedente }: AntecedenteFormDialogProps) {
  const guardar = useGuardarAntecedente();
  const [datos, setDatos] = useState<GuardarAntecedentePayload>(() => (antecedente ? aPayload(antecedente) : vacio(grupo, pacienteId, consultaId)));
  const [error, setError] = useState<string | null>(null);

  const cambiar = <K extends keyof GuardarAntecedentePayload>(clave: K, valor: GuardarAntecedentePayload[K]) =>
    setDatos((d) => ({ ...d, [clave]: valor }));
  const texto = (clave: 'detalle' | 'fecha' | 'reaccion' | 'centroSalud' | 'servicio' | 'subcategoria') => ({
    value: datos[clave] ?? '',
    onChange: (v: string) => cambiar(clave, v === '' ? null : v),
  });

  function enviar() {
    if (datos.descripcion.trim() === '') {
      setError('Busque un término o escriba una descripción.');
      return;
    }
    if (datos.fecha && !/^\d{4}(-\d{2}){0,2}$/.test(datos.fecha)) {
      setError('La fecha debe ser un año (2019), un mes (2021-03) o una fecha completa (2021-03-15).');
      return;
    }
    guardar.mutate({ id: antecedente?.id ?? null, payload: datos }, { onSuccess: onClose });
  }

  const { tipo } = grupo;
  return (
    <Modal
      open
      title={antecedente ? `Editar ${grupo.singular}` : `Agregar ${grupo.singular}`}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={guardar.isPending} onClick={enviar}>
            Guardar en la historia
          </Button>
        </>
      }
    >
      <TerminologySearch
        label="Buscar en el catálogo"
        placeholder={grupo.placeholder}
        claveCache={`antecedente-${tipo}`}
        buscar={grupo.buscar}
        onSelect={(c) => setDatos((d) => ({ ...d, descripcion: c.nombre, codigoSnomed: c.codigo, subcategoria: tipo === 'habito' ? (c.etiqueta ?? null) : d.subcategoria }))}
        onCrear={(t) => setDatos((d) => ({ ...d, descripcion: t, codigoSnomed: null }))}
      />
      <div className="ap-grid ap-grid-3">
        <TextField
          label="Descripción"
          required
          style={{ gridColumn: 'span 2' }}
          value={datos.descripcion}
          onChange={(v) => cambiar('descripcion', v)}
          error={error && datos.descripcion.trim() === '' ? error : undefined}
        />
        <TextField label="Código SNOMED CT" value={datos.codigoSnomed ?? ''} onChange={(v) => cambiar('codigoSnomed', v === '' ? null : v)} />
      </div>

      {tipo === 'familiar' ? (
        <Select label="Parentesco" value={datos.parentesco ?? ''} onChange={(v) => cambiar('parentesco', v === '' ? null : v)} options={PARENTESCOS} placeholder="Sin especificar" />
      ) : null}

      {tipo === 'alergia' ? (
        <div className="ap-grid ap-grid-2">
          <TextField label="Reacción" placeholder="Ej.: urticaria generalizada" {...texto('reaccion')} />
          <Select label="Severidad" value={datos.severidad ?? ''} onChange={(v) => cambiar('severidad', v === '' ? null : v)} options={SEVERIDADES} placeholder="Sin especificar" />
        </div>
      ) : null}

      {tipo === 'hospitalizacion' ? (
        <div className="ap-grid ap-grid-3">
          <TextField
            label="Días de estancia"
            inputMode="numeric"
            value={datos.diasEstancia === null ? '' : String(datos.diasEstancia)}
            onChange={(v) => cambiar('diasEstancia', v.trim() === '' || Number.isNaN(Number(v)) ? null : Math.round(Number(v)))}
          />
          <TextField label="Centro de salud" {...texto('centroSalud')} />
          <TextField label="Servicio" {...texto('servicio')} />
        </div>
      ) : null}

      {tipo === 'habito' ? <TextField label="Categoría" placeholder="Tabaquismo, Alcohol, Actividad física…" {...texto('subcategoria')} /> : null}

      <div className="ap-grid ap-grid-2">
        {tipo === 'familiar' || tipo === 'habito' ? null : (
          <TextField
            label={tipo === 'hospitalizacion' ? 'Fecha de ingreso' : tipo === 'alergia' ? 'Desde' : 'Año o fecha'}
            placeholder="2019 · 2021-03 · 2021-03-15"
            hint="Año, mes o fecha completa."
            {...texto('fecha')}
          />
        )}
        {grupo.estados ? <Select label="Estado" value={datos.estado ?? ''} onChange={(v) => cambiar('estado', v === '' ? null : v)} options={grupo.estados} /> : null}
      </div>

      <TextField label="Detalle" multiline rows={2} placeholder="Notas adicionales" {...texto('detalle')} />
      {error && datos.descripcion.trim() !== '' ? <span className="cl-hint cl-err">{error}</span> : null}
    </Modal>
  );
}
