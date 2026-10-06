import { useState } from 'react';
import { Button, Card, CodedEntry, Vacio } from '@/components/ui';
import { useAntecedentes, useEliminarAntecedente } from '../hooks/useAntecedentes';
import type { Antecedente } from '../types';
import { AntecedenteFormDialog } from './AntecedenteFormDialog';
import { type DefGrupoAntecedente, GRUPOS_ANTECEDENTES, detalleAntecedente, estadoAntecedente, fechaAntecedente } from './grupos';

interface AntecedentesGridProps {
  pacienteId: string;
  /** Consulta en curso: lo que se agregue queda asociado a ella. */
  consultaId?: string | null;
  soloLectura?: boolean;
}

/** Las seis tarjetas de antecedentes de la historia clínica. Se usa igual en la historia y dentro de la consulta. */
export function AntecedentesGrid({ pacienteId, consultaId, soloLectura }: AntecedentesGridProps) {
  const { data: antecedentes = [] } = useAntecedentes(pacienteId);
  const eliminar = useEliminarAntecedente(pacienteId);
  const [dialogo, setDialogo] = useState<{ grupo: DefGrupoAntecedente; antecedente: Antecedente | null } | null>(null);

  return (
    <>
      <div className="ap-two">
        {GRUPOS_ANTECEDENTES.map((grupo) => {
          const items = antecedentes.filter((a) => a.tipo === grupo.tipo);
          return (
            <Card
              key={grupo.tipo}
              id={grupo.ancla}
              title={grupo.titulo}
              flush
              actions={
                soloLectura ? null : (
                  <Button variant="quiet" icon="plus" onClick={() => setDialogo({ grupo, antecedente: null })}>
                    Agregar
                  </Button>
                )
              }
            >
              {items.length === 0 ? <Vacio>Sin registros.</Vacio> : null}
              <div className="ap-list">
                {items.map((a) => {
                  const estado = estadoAntecedente(a);
                  return (
                    <CodedEntry
                      key={a.id}
                      term={a.descripcion}
                      code={a.codigoSnomed}
                      detail={detalleAntecedente(a)}
                      date={fechaAntecedente(a.fecha)}
                      status={estado?.label}
                      statusTone={estado?.tone}
                      acciones={
                        soloLectura
                          ? []
                          : [
                              { label: 'Editar', onClick: () => setDialogo({ grupo, antecedente: a }) },
                              { label: 'Eliminar', danger: true, onClick: () => eliminar.mutate(a.id) },
                            ]
                      }
                    />
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
      {dialogo ? (
        <AntecedenteFormDialog
          onClose={() => setDialogo(null)}
          grupo={dialogo.grupo}
          antecedente={dialogo.antecedente}
          pacienteId={pacienteId}
          consultaId={consultaId}
        />
      ) : null}
    </>
  );
}
