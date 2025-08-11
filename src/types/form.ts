import { z } from 'zod';

// Schema de validación del formulario principal
export const outFormSchema = z.object({
  // Fecha del documento
  fechaDocumento: z.string().min(1, 'Debe ingresar la fecha'),
  mesDocumento: z.string().min(1, 'Debe ingresar el mes'),
  anoDocumento: z.string().min(1, 'Debe ingresar el año'),
  
  // Tipo de persona
  tipoPersona: z.enum(['natural', 'juridica']),
  
  // Campos para Persona Natural
  nombrePersona: z.string().optional(),
  cedulaPersona: z.string().optional(),
  numeroLocal: z.string().min(1, 'Debe ingresar el número del local'),
  sucursal: z.string().min(1, 'Debe seleccionar una sucursal'),
  fechaDesocupacion: z.string().min(1, 'Debe ingresar la fecha de desocupación'),
  motivoDesocupacion: z.string().min(1, 'Debe ingresar el motivo de desocupación'),
  
  // Campos adicionales para Persona Jurídica
  nombreEmpresa: z.string().optional(),
  rucEmpresa: z.string().optional(),
  
  // Datos bancarios para devolución
  nombreCuenta: z.string().min(1, 'Debe ingresar el nombre de la cuenta'),
  banco: z.string().min(1, 'Debe ingresar el banco'),
  tipoCuenta: z.enum(['corriente', 'ahorro']),
  numeroCuenta: z.string().min(1, 'Debe ingresar el número de cuenta'),
  
  // Firma
  nombreFirma: z.string().min(1, 'Debe ingresar el nombre para la firma'),
  firmaDigital: z.string().optional(),
}).refine((data) => {
  if (data.tipoPersona === 'natural') {
    return data.nombrePersona && data.cedulaPersona;
  } else {
    return data.nombrePersona && data.cedulaPersona && data.nombreEmpresa && data.rucEmpresa;
  }
}, {
  message: 'Debe completar todos los campos requeridos según el tipo de persona',
  path: ['tipoPersona']
});

// Tipo inferido del schema
export type OutFormData = z.infer<typeof outFormSchema>;

// Tipos relacionados con el formulario
export type TipoPersona = 'natural' | 'juridica';
export type TipoCuenta = 'corriente' | 'ahorro';

// Tipo para los parámetros del template de EmailJS
export interface EmailTemplateParams {
  emails: string;
  sucursal_nombre: string;
  tipo_persona: string;
  fecha_documento: string;
  nombre_persona: string;
  cedula_persona: string;
  numero_local: string;
  fecha_desocupacion: string;
  motivo_desocupacion: string;
  nombre_empresa: string;
  ruc_empresa: string;
  nombre_cuenta: string;
  banco: string;
  tipo_cuenta: string;
  numero_cuenta: string;
  nombre_firma: string;
  fecha_envio: string;
}
