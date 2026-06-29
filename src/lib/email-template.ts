import { SUCURSALES } from '@/constants';

/**
 * Forma canónica del payload de salida tal como se guarda en logs y formulario.
 * Todos los campos están en camelCase (forma interna del sistema).
 */
export interface SalidaPayload {
  tenantId?: unknown;
  nombrePersona?: unknown;
  correoPersona?: unknown;
  cedulaPersona?: unknown;
  sucursal?: unknown;
  numeroLocal?: unknown;
  tipoPersona?: unknown;
  fechaDesocupacion?: unknown;
  momentoDecision?: unknown;
  motivoDesocupacion?: unknown;
  destinoBienes?: unknown;
  consideracionCambio?: unknown;
  calificacionExperiencia?: unknown;
  recomendacion?: unknown;
  nombreEmpresa?: unknown;
  rucEmpresa?: unknown;
  nombreCuenta?: unknown;
  banco?: unknown;
  tipoCuenta?: unknown;
  numeroCuenta?: unknown;
  nombreFirma?: unknown;
  telefonoFirma?: unknown;
  fechaDocumento?: unknown;
  mesDocumento?: unknown;
  anoDocumento?: unknown;
}

/** Tipo seguro del objeto que EmailJS recibe como templateParams */
export interface EmailTemplateParams extends Record<string, unknown> {
  emails: string;
  sucursal_nombre: string;
  tipo_persona: string;
  fecha_documento: string;
  nombre_persona: string;
  correo_persona: string;
  cedula_persona: string;
  numero_local: string;
  tenant_id: string;
  fecha_desocupacion: string;
  momento_decision: string;
  motivo_desocupacion: string;
  destino_bienes: string;
  consideracion_cambio: string;
  calificacion_experiencia: string;
  recomendacion: string;
  nombre_empresa: string;
  ruc_empresa: string;
  nombre_cuenta: string;
  banco: string;
  tipo_cuenta: string;
  numero_cuenta: string;
  nombre_firma: string;
  telefono_firma: string;
  fecha_envio: string;
  firma_digital?: string;
}

function str(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

/**
 * Construye el objeto templateParams que EmailJS espera, mapeando camelCase → snake_case.
 * Úsala tanto en el envío original (OutForm) como en el reenvío manual (logs/page).
 *
 * @param payload  Payload en camelCase tal como está almacenado en FormLog o viene del formulario
 * @param firmaDigital  Imagen base64 de la firma (solo disponible en el envío original)
 */
export function buildEmailTemplateParams(
  payload: SalidaPayload,
  firmaDigital?: string
): EmailTemplateParams {
  const sucursalId = str(payload.sucursal);
  const sucursal = SUCURSALES.find(s => s.id === sucursalId);
  const emailsDestino = sucursal?.emails ?? ['info@almacenajes.net'];

  const tipoPersonaRaw = str(payload.tipoPersona);
  const tipoCuentaRaw = str(payload.tipoCuenta);

  return {
    emails: emailsDestino.join(','),
    sucursal_nombre: sucursal?.nombre ?? 'No especificada',
    tipo_persona: tipoPersonaRaw === 'juridica' ? 'Persona Jurídica' : 'Persona Natural',
    fecha_documento: [
      str(payload.fechaDocumento),
      str(payload.mesDocumento),
      str(payload.anoDocumento),
    ].join('/'),
    nombre_persona: str(payload.nombrePersona),
    correo_persona: str(payload.correoPersona),
    cedula_persona: str(payload.cedulaPersona),
    numero_local: str(payload.numeroLocal),
    tenant_id: str(payload.tenantId),
    fecha_desocupacion: str(payload.fechaDesocupacion),
    momento_decision: str(payload.momentoDecision),
    motivo_desocupacion: str(payload.motivoDesocupacion),
    destino_bienes: str(payload.destinoBienes),
    consideracion_cambio: str(payload.consideracionCambio),
    calificacion_experiencia: str(payload.calificacionExperiencia),
    recomendacion: str(payload.recomendacion),
    nombre_empresa: str(payload.nombreEmpresa) || 'N/A',
    ruc_empresa: str(payload.rucEmpresa) || 'N/A',
    nombre_cuenta: str(payload.nombreCuenta) || 'No especificado',
    banco: str(payload.banco) || 'No especificado',
    tipo_cuenta: tipoCuentaRaw === 'ahorro' ? 'Ahorro' : tipoCuentaRaw ? 'Corriente' : 'No especificado',
    numero_cuenta: str(payload.numeroCuenta) || 'No especificado',
    nombre_firma: str(payload.nombreFirma),
    telefono_firma: str(payload.telefonoFirma),
    fecha_envio: new Date().toLocaleString('es-PA'),
    ...(firmaDigital !== undefined ? { firma_digital: firmaDigital } : {}),
  };
}
