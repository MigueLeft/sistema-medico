import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Page } from '@/components/AppShell';
import { Segmented, Vacio } from '@/components/ui';
import {
  CatalogoPanel,
  DEF_CENTROS,
  DEF_ENFERMEDADES,
  DEF_MEDICAMENTOS,
  DEF_MOTIVOS_INGRESO,
  DEF_PARACLINICOS,
  DEF_PROCEDIMIENTOS,
  DEF_SERVICIOS,
  DEF_SISTEMAS,
} from '@/features/catalogos';

export const Route = createFileRoute('/catalogos/$catalogo')({
  component: CatalogoPage,
});

type PestanaHospitalizacion = 'motivos' | 'servicios' | 'centros';

function Hospitalizaciones() {
  const [pestana, setPestana] = useState<PestanaHospitalizacion>('motivos');
  return (
    <>
      <div>
        <Segmented<PestanaHospitalizacion>
          value={pestana}
          onChange={setPestana}
          ariaLabel="Catálogos de hospitalización"
          options={[
            { value: 'motivos', label: 'Motivos de ingreso' },
            { value: 'servicios', label: 'Servicios' },
            { value: 'centros', label: 'Centros de salud' },
          ]}
        />
      </div>
      {pestana === 'motivos' ? <CatalogoPanel def={DEF_MOTIVOS_INGRESO} /> : null}
      {pestana === 'servicios' ? <CatalogoPanel def={DEF_SERVICIOS} /> : null}
      {pestana === 'centros' ? <CatalogoPanel def={DEF_CENTROS} /> : null}
    </>
  );
}

function CatalogoPage() {
  const { catalogo } = Route.useParams();
  // `key` reinicia la búsqueda y la selección al pasar de un catálogo a otro.
  switch (catalogo) {
    case 'enfermedades':
      return (
        <Page title="Catálogo · Enfermedades">
          <CatalogoPanel key={catalogo} def={DEF_ENFERMEDADES} />
        </Page>
      );
    case 'paraclinicos':
      return (
        <Page title="Catálogo · Paraclínicos">
          <CatalogoPanel key={catalogo} def={DEF_PARACLINICOS} />
        </Page>
      );
    case 'procedimientos':
      return (
        <Page title="Catálogo · Procedimientos y cirugías">
          <CatalogoPanel key={catalogo} def={DEF_PROCEDIMIENTOS} />
        </Page>
      );
    case 'hospitalizaciones':
      return (
        <Page title="Catálogo · Hospitalizaciones">
          <Hospitalizaciones />
        </Page>
      );
    case 'sistemas':
      return (
        <Page title="Catálogo · Aparatos y sistemas">
          <CatalogoPanel key={catalogo} def={DEF_SISTEMAS} />
        </Page>
      );
    case 'medicamentos':
      return (
        <Page title="Catálogo · Medicamentos">
          <CatalogoPanel key={catalogo} def={DEF_MEDICAMENTOS} />
        </Page>
      );
    default:
      return (
        <Page title="Catálogos">
          <Vacio>Catálogo no encontrado.</Vacio>
        </Page>
      );
  }
}
