import { useState } from 'react';
import { List, ListItem, ListItemButton } from '@mui/material';
import { Badge, BotonIcono, Button, Checkbox, Field, MenuAcciones, Panel, Select, TextField } from '@/components/ui';
import { TOKENS } from '@/theme/clinica';
import { useGuardarPlantillaDocumento, usePlantillasDocumento } from '../hooks/useEntregables';
import type { BloquePlantilla, GuardarPlantillaDocumentoPayload, Papel, PlantillaDocumento } from '../types';
import { BLOQUES_AUTOMATICOS, PAPELES, claveDeTitulo, resumenPlantilla } from './bloques';

const NUEVA: GuardarPlantillaDocumentoPayload = {
  nombre: '',
  prefijo: '',
  papel: 'carta',
  bloques: [
    BLOQUES_AUTOMATICOS[0],
    BLOQUES_AUTOMATICOS[1],
    { clave: 'contenido', titulo: 'Contenido', descripcion: 'Texto libre', modo: 'texto' },
    BLOQUES_AUTOMATICOS.find((b) => b.clave === 'firma')!,
  ],
  generaPendientes: false,
  pendienteTipo: 'documento',
  pendienteCuantos: 'uno_por_documento',
  pendienteTexto: null,
  entregaImprimir: true,
  entregaWhatsapp: false,
  entregaCorreo: false,
  requiereFirma: true,
  activa: true,
};

function aPayload(p: PlantillaDocumento): GuardarPlantillaDocumentoPayload {
  return {
    nombre: p.nombre,
    prefijo: p.prefijo,
    papel: p.papel,
    bloques: p.bloques,
    generaPendientes: p.generaPendientes,
    pendienteTipo: p.pendienteTipo,
    pendienteCuantos: p.pendienteCuantos,
    pendienteTexto: p.pendienteTexto,
    entregaImprimir: p.entregaImprimir,
    entregaWhatsapp: p.entregaWhatsapp,
    entregaCorreo: p.entregaCorreo,
    requiereFirma: p.requiereFirma,
    activa: p.activa,
  };
}

/** Configuración › Plantillas de entregables: lista de plantillas y editor de la seleccionada. */
export function PlantillasDocumento() {
  const { data: plantillas = [] } = usePlantillasDocumento();
  const [seleccionId, setSeleccionId] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const seleccion = creando ? null : (plantillas.find((p) => p.id === seleccionId) ?? plantillas[0] ?? null);

  return (
    <>
      <div className="cl-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'nowrap' }}>
        <div>
          <h2 className="ap-h">Plantillas de entregables</h2>
          <div className="ap-sub">Cada plantilla define un tipo de documento: qué bloques lleva, cómo se numera y si genera pendientes.</div>
        </div>
        <Button variant="primary" icon="plus" onClick={() => setCreando(true)}>
          Nueva plantilla
        </Button>
      </div>

      <div className="ap-config-plantillas">
        <Panel>
          <List disablePadding aria-label="Plantillas">
            {plantillas.map((p) => (
              <ListItem key={p.id} disablePadding divider>
                <ListItemButton
                  selected={seleccion?.id === p.id}
                  sx={{ borderRadius: 0, flexDirection: 'column', alignItems: 'flex-start', gap: '2px', px: 2, py: 1.5, '&:hover': { bgcolor: TOKENS.surface } }}
                  onClick={() => {
                    setCreando(false);
                    setSeleccionId(p.id);
                  }}
                >
                  <b style={{ fontWeight: 600 }}>{p.nombre}</b>
                  <span className="cl-hint">{resumenPlantilla(p)}</span>
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Panel>

        {creando || seleccion ? (
          // La `key` remonta el formulario al cambiar de plantilla o al guardarse una versión nueva.
          <FormularioPlantilla
            key={creando ? 'nueva' : JSON.stringify(seleccion)}
            plantilla={seleccion}
            onGuardada={(id) => {
              setCreando(false);
              setSeleccionId(id);
            }}
            onCancelar={() => setCreando(false)}
          />
        ) : null}
      </div>
    </>
  );
}

interface FormularioPlantillaProps {
  /** `null` = plantilla nueva. */
  plantilla: PlantillaDocumento | null;
  onGuardada: (id: string) => void;
  onCancelar: () => void;
}

function FormularioPlantilla({ plantilla, onGuardada, onCancelar }: FormularioPlantillaProps) {
  const guardar = useGuardarPlantillaDocumento();
  const [form, setForm] = useState<GuardarPlantillaDocumentoPayload>(() => (plantilla ? aPayload(plantilla) : NUEVA));
  const [tituloNuevo, setTituloNuevo] = useState<string | null>(null);

  const cambiar = (cambios: Partial<GuardarPlantillaDocumentoPayload>) => setForm((f) => ({ ...f, ...cambios }));
  const mover = (indice: number, sentido: 1 | -1) => {
    const destino = indice + sentido;
    if (destino < 0 || destino >= form.bloques.length) return;
    const bloques = [...form.bloques];
    [bloques[indice], bloques[destino]] = [bloques[destino], bloques[indice]];
    cambiar({ bloques });
  };
  const agregar = (bloque: BloquePlantilla) => cambiar({ bloques: [...form.bloques, bloque] });
  const disponibles = BLOQUES_AUTOMATICOS.filter((b) => !form.bloques.some((x) => x.clave === b.clave));
  const tieneItems = form.bloques.some((b) => ['medicamentos', 'pruebas'].includes(b.clave));
  const bloquesTexto = form.bloques.filter((b) => b.modo === 'texto');

  return (
    <Panel className="ap-card">
      <div className="ap-card-body">
        <div className="cl-row" style={{ justifyContent: 'space-between' }}>
          <h2 className="ap-card-title">{plantilla ? plantilla.nombre : 'Nueva plantilla'}</h2>
          <Badge dot tone={form.activa ? 'slate' : 'neutral'}>
            {form.activa ? 'Activa' : 'Inactiva'}
          </Badge>
        </div>

        <div className="ap-grid ap-grid-3">
          <TextField label="Nombre" required value={form.nombre} onChange={(v) => cambiar({ nombre: v })} />
          <TextField
            label="Prefijo de numeración"
            required
            placeholder="REF-"
            value={form.prefijo}
            unit={plantilla ? `sig. ${String(plantilla.siguienteNumero).padStart(6, '0')}` : undefined}
            onChange={(v) => cambiar({ prefijo: v.toUpperCase() })}
          />
          <Select label="Papel" value={form.papel} onChange={(v) => cambiar({ papel: v as Papel })} options={Object.entries(PAPELES).map(([value, label]) => ({ value, label }))} />
        </div>

        <Field label="Bloques del documento (en orden de impresión)">
          <div className="ap-bloques">
            {form.bloques.map((b, i) => (
              <div key={b.clave} className="ap-bloque">
                <span>{i + 1}</span>
                <div>
                  <b>{b.titulo}</b>
                  <span className="cl-hint">{b.descripcion}</span>
                </div>
                <Badge>{b.modo === 'automatico' ? 'Automático' : 'Texto'}</Badge>
                <div className="ap-inline" style={{ gap: 0 }}>
                  <BotonIcono icon="chevron" className="ap-girado" label={`Subir ${b.titulo}`} disabled={i === 0} onClick={() => mover(i, -1)} />
                  <BotonIcono icon="chevron" label={`Bajar ${b.titulo}`} disabled={i === form.bloques.length - 1} onClick={() => mover(i, 1)} />
                  <BotonIcono icon="x" label={`Quitar ${b.titulo}`} onClick={() => cambiar({ bloques: form.bloques.filter((x) => x.clave !== b.clave) })} />
                </div>
              </div>
            ))}
          </div>
        </Field>

        {tituloNuevo === null ? (
          <div className="ap-inline">
            <MenuAgregarBloque disponibles={disponibles} onAgregar={agregar} onTexto={() => setTituloNuevo('')} />
          </div>
        ) : (
          <div className="ap-inline" style={{ alignItems: 'flex-end' }}>
            <TextField label="Título del bloque de texto" style={{ flex: 1 }} autoFocus placeholder="Ej.: Motivo de referencia" value={tituloNuevo} onChange={setTituloNuevo} />
            <Button onClick={() => setTituloNuevo(null)}>Cancelar</Button>
            <Button
              variant="primary"
              disabled={tituloNuevo.trim() === ''}
              onClick={() => {
                agregar({ clave: claveDeTitulo(tituloNuevo, form.bloques.map((b) => b.clave)), titulo: tituloNuevo.trim(), descripcion: 'Texto libre', modo: 'texto' });
                setTituloNuevo(null);
              }}
            >
              Agregar
            </Button>
          </div>
        )}

        <div className="ap-grupo" style={{ borderTop: '1px solid var(--line)', paddingTop: 'var(--space-4)', color: 'var(--ink)' }}>
          Seguimiento
        </div>
        <Checkbox checked={form.generaPendientes} onChange={(v) => cambiar({ generaPendientes: v })}>
          <b>Al emitir, generar pendientes para el paciente</b>
          <div className="cl-hint">Aparecen en la agenda antes de la próxima consulta y se revisan dentro de ella.</div>
        </Checkbox>
        {form.generaPendientes ? (
          <div className="ap-grid ap-grid-3">
            <Select
              label="Tipo de pendiente"
              value={form.pendienteTipo}
              onChange={(v) => cambiar({ pendienteTipo: v as PlantillaDocumento['pendienteTipo'] })}
              options={[
                { value: 'paraclinico', label: 'Paraclínico' },
                { value: 'documento', label: 'Documento' },
                { value: 'registro', label: 'Registro' },
              ]}
            />
            <Select
              label="Cuántos"
              value={form.pendienteCuantos}
              onChange={(v) => cambiar({ pendienteCuantos: v as PlantillaDocumento['pendienteCuantos'] })}
              options={[
                { value: 'uno_por_documento', label: 'Uno por documento' },
                ...(tieneItems || form.pendienteCuantos === 'uno_por_item' ? [{ value: 'uno_por_item', label: 'Uno por prueba o medicamento' }] : []),
              ]}
            />
            <TextField
              label="Texto del pendiente"
              placeholder={form.nombre || 'Nombre del documento'}
              value={form.pendienteTexto ?? ''}
              readOnly={form.pendienteCuantos === 'uno_por_item'}
              onChange={(v) => cambiar({ pendienteTexto: v === '' ? null : v })}
            />
          </div>
        ) : null}
        {form.generaPendientes && form.pendienteCuantos === 'uno_por_documento' && bloquesTexto.length > 0 ? (
          <span className="cl-hint">
            Puede usar el texto de un bloque entre llaves: {bloquesTexto.map((b) => `{${b.clave}}`).join(', ')}. Ej.: «Informe de {`{${bloquesTexto[0].clave}}`}».
          </span>
        ) : null}

        <div className="ap-grupo" style={{ borderTop: '1px solid var(--line)', paddingTop: 'var(--space-4)', color: 'var(--ink)' }}>
          Entrega
        </div>
        <div className="cl-row" style={{ gap: 'var(--space-5)' }}>
          <Checkbox checked={form.entregaImprimir} onChange={(v) => cambiar({ entregaImprimir: v })}>
            Imprimir
          </Checkbox>
          <Checkbox checked={form.entregaWhatsapp} onChange={(v) => cambiar({ entregaWhatsapp: v })}>
            WhatsApp (PDF)
          </Checkbox>
          <Checkbox checked={form.entregaCorreo} onChange={(v) => cambiar({ entregaCorreo: v })}>
            Correo electrónico
          </Checkbox>
        </div>
        <span className="cl-hint">Los documentos se generan en PDF para imprimir. El envío por WhatsApp o correo queda como preferencia: aún no está conectado.</span>
        <Checkbox checked={form.requiereFirma} onChange={(v) => cambiar({ requiereFirma: v })}>
          Requiere firma del médico
        </Checkbox>
        <Checkbox checked={form.activa} onChange={(v) => cambiar({ activa: v })}>
          Activa (se ofrece al crear un entregable en la consulta)
        </Checkbox>

        <div className="cl-row" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          {plantilla ? null : <Button onClick={onCancelar}>Cancelar</Button>}
          <Button variant="primary" disabled={guardar.isPending} onClick={() => guardar.mutate({ id: plantilla?.id ?? null, payload: form }, { onSuccess: (p) => onGuardada(p.id) })}>
            Guardar plantilla
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function MenuAgregarBloque({ disponibles, onAgregar, onTexto }: { disponibles: BloquePlantilla[]; onAgregar: (b: BloquePlantilla) => void; onTexto: () => void }) {
  return (
    <>
      <Button variant="quiet" icon="plus" onClick={onTexto}>
        Agregar bloque de texto
      </Button>
      {disponibles.length > 0 ? (
        <span className="ap-inline cl-hint">
          Bloque automático
          <MenuAcciones acciones={disponibles.map((b) => ({ label: b.titulo, onClick: () => onAgregar(b) }))} />
        </span>
      ) : null}
    </>
  );
}
