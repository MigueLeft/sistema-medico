import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Modal, Select, TextField } from '@/components/ui';
import { useActualizarPaciente, useCrearPaciente } from '../hooks/usePatients';
import type { CreatePacientePayload, PacienteConExpediente } from '../types';

const schema = z.object({
  nombres: z.string().trim().min(1, 'Los nombres son requeridos'),
  apellidos: z.string().trim().min(1, 'Los apellidos son requeridos'),
  documentoIdentidad: z.string().trim().min(1, 'La cédula es requerida'),
  fechaNacimiento: z
    .string()
    .min(1, 'La fecha de nacimiento es requerida')
    .refine((v) => v <= new Date().toISOString().slice(0, 10), 'La fecha no puede ser futura'),
  sexo: z.enum(['femenino', 'masculino', 'otro']),
  grupoSanguineo: z.string(),
  telefono: z.string(),
  email: z.string().trim().email('Correo inválido').or(z.literal('')),
  estadoCivil: z.string(),
  ocupacion: z.string(),
  direccion: z.string(),
  contactoEmergenciaNombre: z.string(),
  contactoEmergenciaParentesco: z.string(),
  contactoEmergenciaTelefono: z.string(),
});

type FormValues = z.infer<typeof schema>;

const VACIO: FormValues = {
  nombres: '',
  apellidos: '',
  documentoIdentidad: '',
  fechaNacimiento: '',
  sexo: 'femenino',
  grupoSanguineo: '',
  telefono: '',
  email: '',
  estadoCivil: '',
  ocupacion: '',
  direccion: '',
  contactoEmergenciaNombre: '',
  contactoEmergenciaParentesco: '',
  contactoEmergenciaTelefono: '',
};

const GRUPOS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const ESTADOS_CIVILES = ['Soltero/a', 'Casado/a', 'Unión estable', 'Divorciado/a', 'Viudo/a'];

function aValores(p: PacienteConExpediente): FormValues {
  return {
    nombres: p.nombres,
    apellidos: p.apellidos,
    documentoIdentidad: p.documentoIdentidad,
    fechaNacimiento: p.fechaNacimiento,
    sexo: p.sexo,
    grupoSanguineo: p.grupoSanguineo ?? '',
    telefono: p.telefono ?? '',
    email: p.email ?? '',
    estadoCivil: p.estadoCivil ?? '',
    ocupacion: p.ocupacion ?? '',
    direccion: p.direccion ?? '',
    contactoEmergenciaNombre: p.contactoEmergenciaNombre ?? '',
    contactoEmergenciaParentesco: p.contactoEmergenciaParentesco ?? '',
    contactoEmergenciaTelefono: p.contactoEmergenciaTelefono ?? '',
  };
}

const oNull = (v: string) => (v.trim() === '' ? null : v.trim());

interface PatientFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** Paciente a editar; sin él, el diálogo registra uno nuevo. */
  paciente?: PacienteConExpediente | null;
  /** Nombre precargado al registrar desde una búsqueda. */
  nombreInicial?: string;
  onGuardado?: (paciente: PacienteConExpediente) => void;
}

export function PatientFormDialog({ open, onClose, paciente, nombreInicial, onGuardado }: PatientFormDialogProps) {
  const crear = useCrearPaciente();
  const actualizar = useActualizarPaciente();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: VACIO });

  useEffect(() => {
    if (open) reset(paciente ? aValores(paciente) : { ...VACIO, nombres: nombreInicial ?? '' });
  }, [open, paciente, nombreInicial, reset]);

  const onSubmit = (v: FormValues) => {
    const payload: CreatePacientePayload = {
      nombres: v.nombres,
      apellidos: v.apellidos,
      documentoIdentidad: v.documentoIdentidad,
      fechaNacimiento: v.fechaNacimiento,
      sexo: v.sexo,
      grupoSanguineo: oNull(v.grupoSanguineo),
      telefono: oNull(v.telefono),
      email: oNull(v.email),
      estadoCivil: oNull(v.estadoCivil),
      ocupacion: oNull(v.ocupacion),
      direccion: oNull(v.direccion),
      contactoEmergenciaNombre: oNull(v.contactoEmergenciaNombre),
      contactoEmergenciaParentesco: oNull(v.contactoEmergenciaParentesco),
      contactoEmergenciaTelefono: oNull(v.contactoEmergenciaTelefono),
    };
    const alGuardar = (p: PacienteConExpediente) => {
      onGuardado?.(p);
      onClose();
    };
    if (paciente) actualizar.mutate({ id: paciente.id, payload }, { onSuccess: alGuardar });
    else crear.mutate(payload, { onSuccess: alGuardar });
  };

  const guardando = crear.isPending || actualizar.isPending;
  const texto = (name: keyof FormValues, label: string, extra: { required?: boolean; type?: string; placeholder?: string } = {}) => (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <TextField label={label} value={field.value} onChange={field.onChange} onBlur={field.onBlur} error={errors[name]?.message} {...extra} />
      )}
    />
  );

  return (
    <Modal
      open={open}
      title={paciente ? 'Editar paciente' : 'Nuevo paciente'}
      onClose={onClose}
      width={680}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={guardando} onClick={handleSubmit(onSubmit)}>
            {paciente ? 'Guardar cambios' : 'Registrar paciente'}
          </Button>
        </>
      }
    >
      <div className="ap-grid ap-grid-2">
        {texto('nombres', 'Nombres', { required: true })}
        {texto('apellidos', 'Apellidos', { required: true })}
      </div>
      <div className="ap-grid ap-grid-4">
        {texto('documentoIdentidad', 'Cédula', { required: true, placeholder: 'V-12.345.678' })}
        {texto('fechaNacimiento', 'Fecha de nacimiento', { required: true, type: 'date' })}
        <Controller
          name="sexo"
          control={control}
          render={({ field }) => (
            <Select
              label="Sexo"
              required
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: 'femenino', label: 'Femenino' },
                { value: 'masculino', label: 'Masculino' },
                { value: 'otro', label: 'Otro' },
              ]}
            />
          )}
        />
        <Controller
          name="grupoSanguineo"
          control={control}
          render={({ field }) => <Select label="Grupo sanguíneo" value={field.value} onChange={field.onChange} options={GRUPOS} placeholder="Sin registrar" />}
        />
      </div>
      <div className="ap-grid ap-grid-3">
        <Controller
          name="estadoCivil"
          control={control}
          render={({ field }) => <Select label="Estado civil" value={field.value} onChange={field.onChange} options={ESTADOS_CIVILES} placeholder="Sin registrar" />}
        />
        {texto('ocupacion', 'Ocupación')}
        {texto('telefono', 'Teléfono')}
      </div>
      <div className="ap-grid ap-grid-2">
        {texto('email', 'Correo', { type: 'email' })}
        {texto('direccion', 'Dirección')}
      </div>
      <div className="ap-grupo">CONTACTO DE EMERGENCIA</div>
      <div className="ap-grid ap-grid-3">
        {texto('contactoEmergenciaNombre', 'Nombre')}
        {texto('contactoEmergenciaParentesco', 'Parentesco')}
        {texto('contactoEmergenciaTelefono', 'Teléfono')}
      </div>
    </Modal>
  );
}
