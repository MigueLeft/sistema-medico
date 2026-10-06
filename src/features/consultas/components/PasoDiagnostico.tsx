import { useState } from 'react';
import { Button, Card, CodedEntry, type Concepto, Select, TerminologySearch, TextField, Vacio } from '@/components/ui';
import { buscarConceptos, catalogosService, type EnfermedadCatalogo } from '@/features/catalogos';
import { useCrearExamen, useEliminarExamen, useExamenesPaciente } from '@/features/examenes';
import { hoyIso } from '@/lib/formato';
import { toast } from 'sonner';
import { useActualizarDiagnostico, useAgregarDiagnostico, useDiagnosticosConsulta, useEliminarDiagnostico } from '../hooks/useConsultas';
import type { CertezaDiagnostico, Consulta, ConsultaDiagnostico, GuardarConsultaPayload } from '../types';

interface PasoDiagnosticoProps {
  consulta: Consulta;
  borrador: GuardarConsultaPayload;
  onCambiar: (cambios: Partial<GuardarConsultaPayload>) => void;
  onGuardar: () => void;
  soloLectura: boolean;
}

const CERTEZA: Record<CertezaDiagnostico, string> = { definitivo: 'Definitivo', presuntivo: 'Presuntivo' };

function sistemaDe(dx: ConsultaDiagnostico): 'SCT' | 'Local' {
  return dx.sistema === 'SCT' ? 'SCT' : 'Local';
}

export function PasoDiagnostico({ consulta, borrador, onCambiar, onGuardar, soloLectura }: PasoDiagnosticoProps) {
  const { data: diagnosticos = [] } = useDiagnosticosConsulta(consulta.id);
  const agregar = useAgregarDiagnostico();
  const actualizar = useActualizarDiagnostico();
  const eliminar = useEliminarDiagnostico(consulta.id);
  const principal = diagnosticos.find((d) => d.rol === 'principal') ?? null;

  const agregarLibre = async (texto: string) => {
    try {
      // Un diagnóstico sin código se guarda primero en el catálogo local para poder reutilizarlo.
      const entrada = await catalogosService.guardar<EnfermedadCatalogo>('enfermedades', null, { nombre: texto });
      agregar.mutate({ consultaId: consulta.id, enfermedadCatalogoId: entrada.id });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al crear el diagnóstico');
    }
  };
  const cambiar = (dx: ConsultaDiagnostico, cambios: Partial<Pick<ConsultaDiagnostico, 'rol' | 'certeza'>>) =>
    actualizar.mutate({ id: dx.id, payload: { rol: dx.rol, certeza: dx.certeza, nota: dx.nota, ...cambios } });

  return (
    <>
      <Card id="sec-diagnostico" title="Diagnósticos" aside="SNOMED CT, trastornos" flush>
        {soloLectura ? null : (
          <div className="ap-card-body" style={{ borderBottom: '1px solid var(--line)' }}>
            <TerminologySearch
              label="Agregar diagnóstico"
              placeholder="Ej.: hipertensión esencial, 59621000"
              claveCache="trastorno"
              buscar={buscarConceptos.trastornos}
              onSelect={(c) => agregar.mutate({ consultaId: consulta.id, enfermedadCatalogoId: c.id })}
              onCrear={agregarLibre}
            />
          </div>
        )}
        {diagnosticos.length === 0 ? <Vacio>Agregue al menos un diagnóstico para poder cerrar la consulta.</Vacio> : null}
        <div className="ap-list">
          {diagnosticos.map((dx) => (
            <CodedEntry
              key={dx.id}
              term={dx.nombre}
              code={dx.codigo}
              system={sistemaDe(dx)}
              detail={[dx.rol === 'principal' ? 'Principal' : 'Secundario', CERTEZA[dx.certeza], dx.tipo === 'seguimiento' ? 'Seguimiento' : 'Nuevo', dx.nota].filter(Boolean).join(' · ')}
              status={dx.activa ? 'Activo' : 'Resuelto'}
              statusTone={dx.activa ? 'slate' : 'neutral'}
              acciones={
                soloLectura
                  ? []
                  : [
                      ...(dx.rol === 'principal' ? [] : [{ label: 'Marcar como principal', onClick: () => cambiar(dx, { rol: 'principal' }) }]),
                      {
                        label: dx.certeza === 'definitivo' ? 'Cambiar a presuntivo' : 'Cambiar a definitivo',
                        onClick: () => cambiar(dx, { certeza: dx.certeza === 'definitivo' ? 'presuntivo' : 'definitivo' }),
                      },
                      { label: 'Quitar', danger: true, onClick: () => eliminar.mutate(dx.id) },
                    ]
              }
            />
          ))}
        </div>
      </Card>

      <Card title="Clasificación">
        <Select
          label="Diagnóstico principal"
          value={principal?.id ?? ''}
          disabled={soloLectura || diagnosticos.length === 0}
          placeholder={diagnosticos.length === 0 ? 'Agregue un diagnóstico' : undefined}
          options={diagnosticos.map((d) => ({ value: d.id, label: d.nombre }))}
          onChange={(id) => {
            const dx = diagnosticos.find((d) => d.id === id);
            if (dx) cambiar(dx, { rol: 'principal' });
          }}
        />
        <Select
          label="Certeza"
          value={principal?.certeza ?? 'definitivo'}
          disabled={soloLectura || !principal}
          options={[
            { value: 'definitivo', label: 'Definitivo' },
            { value: 'presuntivo', label: 'Presuntivo' },
          ]}
          onChange={(v) => principal && cambiar(principal, { certeza: v as CertezaDiagnostico })}
        />
        <TextField
          label="Impresión diagnóstica"
          multiline
          rows={4}
          value={borrador.impresionDiagnostica ?? ''}
          readOnly={soloLectura}
          onChange={(v) => onCambiar({ impresionDiagnostica: v })}
          onBlur={onGuardar}
        />
      </Card>

      <ParaclinicosSolicitados consulta={consulta} soloLectura={soloLectura} />
    </>
  );
}

function ParaclinicosSolicitados({ consulta, soloLectura }: { consulta: Consulta; soloLectura: boolean }) {
  const { data: examenes = [] } = useExamenesPaciente(consulta.pacienteId);
  const crear = useCrearExamen();
  const eliminar = useEliminarExamen(consulta.pacienteId);
  const [solicitando, setSolicitando] = useState(false);
  const [elegido, setElegido] = useState<Concepto | null>(null);
  const [indicacion, setIndicacion] = useState('');
  const solicitados = examenes.filter((e) => e.consultaId === consulta.id);

  const cerrar = () => {
    setSolicitando(false);
    setElegido(null);
    setIndicacion('');
  };
  const confirmar = () => {
    if (!elegido) return;
    crear.mutate(
      { pacienteId: consulta.pacienteId, consultaId: consulta.id, tipoExamenId: elegido.id, fechaSolicitud: hoyIso(), indicacion },
      { onSuccess: cerrar },
    );
  };

  return (
    <Card
      id="sec-solicitados"
      title="Paraclínicos solicitados"
      flush
      actions={
        soloLectura ? null : (
          <Button variant="quiet" icon="plus" onClick={() => setSolicitando(true)}>
            Solicitar
          </Button>
        )
      }
    >
      {solicitando ? (
        <div className="ap-med-form">
          {elegido ? (
            <>
              <b>{elegido.nombre}</b>
              <div className="ap-inline" style={{ alignItems: 'flex-end' }}>
                <TextField label="Indicación para el paciente" style={{ flex: 1 }} autoFocus placeholder="Ej.: en ayunas" value={indicacion} onChange={setIndicacion} />
                <Button onClick={cerrar}>Descartar</Button>
                <Button variant="primary" disabled={crear.isPending} onClick={confirmar}>
                  Solicitar
                </Button>
              </div>
            </>
          ) : (
            <div className="ap-inline" style={{ alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <TerminologySearch
                  label="Buscar paraclínico"
                  placeholder="Nombre o código LOINC"
                  sistema="LOINC"
                  claveCache="paraclinico"
                  buscar={buscarConceptos.paraclinicos}
                  onSelect={setElegido}
                />
              </div>
              <Button onClick={cerrar}>Cancelar</Button>
            </div>
          )}
        </div>
      ) : null}
      {solicitados.length === 0 && !solicitando ? <Vacio>Sin paraclínicos solicitados en esta consulta.</Vacio> : null}
      <div className="ap-list">
        {solicitados.map((e) => (
          <CodedEntry
            key={e.id}
            term={e.tipoExamenNombre}
            code={e.codigoLoinc}
            system="LOINC"
            detail={[e.grupo, e.indicacion].filter(Boolean).join(' · ')}
            status={e.fechaResultado ? 'Con resultado' : 'Solicitado'}
            statusTone={e.fechaResultado ? 'slate' : 'info'}
            acciones={soloLectura || e.fechaResultado ? [] : [{ label: 'Quitar', danger: true, onClick: () => eliminar.mutate(e.id) }]}
          />
        ))}
      </div>
    </Card>
  );
}
