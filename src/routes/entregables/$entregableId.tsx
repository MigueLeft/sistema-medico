import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Cargando, Page } from '@/components/AppShell';
import { alergiaQueChoca, sustanciaAlergia, useAntecedentes } from '@/features/antecedentes';
import { useCitasPaciente } from '@/features/citas';
import { useConsulta, useDiagnosticosConsulta } from '@/features/consultas';
import { EditorEntregable, useEntregable, usePlantillaEntregable, usePlantillasDocumento, type Entregable } from '@/features/entregables';
import { usePaciente } from '@/features/patients';
import { useTratamientoPorConsulta } from '@/features/tratamientos';
import { aFecha, edad, fechaCorta, sexoLargo } from '@/lib/formato';

export const Route = createFileRoute('/entregables/$entregableId')({
  component: EntregablePage,
});

function EntregablePage() {
  const { entregableId } = Route.useParams();
  const { data: entregable, isLoading } = useEntregable(entregableId);

  if (isLoading || !entregable) {
    return (
      <Page title="Entregable">
        <Cargando texto={isLoading ? 'Cargando…' : 'Documento no encontrado.'} />
      </Page>
    );
  }
  return <EntregableCargado entregable={entregable} />;
}

function EntregableCargado({ entregable }: { entregable: Entregable }) {
  const navigate = useNavigate();
  const { data: plantillas } = usePlantillasDocumento();
  const { data: membrete } = usePlantillaEntregable();
  const { data: paciente } = usePaciente(entregable.pacienteId);
  const { data: consulta } = useConsulta(entregable.consultaId);
  const { data: diagnosticos } = useDiagnosticosConsulta(entregable.consultaId);
  const { data: antecedentes } = useAntecedentes(entregable.pacienteId);
  const { data: tratamiento, isSuccess: tratamientoListo } = useTratamientoPorConsulta(entregable.consultaId);
  const { data: citas = [] } = useCitasPaciente(entregable.pacienteId);
  const [ahora] = useState(() => Date.now());

  const plantilla = plantillas?.find((p) => p.id === entregable.plantillaDocumentoId);
  const titulo = entregable.plantillaNombre ?? 'Entregable';
  // El editor toma sus valores iniciales al montarse: espera a tener todo lo que los determina.
  if (!plantillas || !paciente || !consulta || !diagnosticos || !antecedentes || !tratamientoListo) {
    return (
      <Page title={titulo}>
        <Cargando />
      </Page>
    );
  }
  if (!plantilla) {
    return (
      <Page title={titulo}>
        <Cargando texto="Este documento es anterior a las plantillas y no se puede editar aquí." />
      </Page>
    );
  }

  const alergias = antecedentes.filter((a) => a.tipo === 'alergia');
  const alertasMedicamento: Record<string, string> = {};
  for (const m of tratamiento?.medicamentos ?? []) {
    const alergia = alergiaQueChoca(m.alergenos, alergias);
    if (alergia) alertasMedicamento[m.medicamentoId] = `alergia a ${sustanciaAlergia(alergia).toLowerCase()}`;
  }
  const proximaCita = citas.filter((c) => c.estado !== 'cancelada' && aFecha(c.fechaHora).getTime() > ahora).map((c) => c.fechaHora).sort()[0] ?? null;
  const volver = (paso: 'entregables' | 'plan') => navigate({ to: '/consultas/$consultaId', params: { consultaId: consulta.id }, search: { paso } });

  return (
    <Page title={titulo}>
      <EditorEntregable
        // Se remonta cuando el documento pasa de borrador a emitido.
        key={`${entregable.id}:${entregable.estado}`}
        entregable={entregable}
        plantilla={plantilla}
        membrete={membrete}
        paciente={{
          nombre: `${paciente.nombres} ${paciente.apellidos}`,
          documento: paciente.documentoIdentidad,
          edad: edad(paciente.fechaNacimiento),
          sexo: sexoLargo(paciente.sexo),
          historia: paciente.expediente.codigo,
        }}
        medico={consulta.medicoNombre}
        consultaFecha={fechaCorta(consulta.fecha)}
        diagnosticos={diagnosticos.map((d) => (d.sistema === 'SCT' ? `${d.nombre} (SNOMED CT ${d.codigo})` : d.nombre))}
        alertasMedicamento={alertasMedicamento}
        proximaCita={proximaCita}
        onVolver={() => volver('entregables')}
        onEditarTratamiento={() => volver('plan')}
      />
    </Page>
  );
}
