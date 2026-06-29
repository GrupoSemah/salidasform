// API client para enviar datos al CRM Tracker
import type { OutFormData, TenantLookupResponse, TenantUnitsResponse } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_CRM_API_URL || 'http://localhost:4000/api/v1';

// Busca un tenant por su ID en el backend
export const lookupTenant = async (tenantId: string): Promise<TenantLookupResponse> => {
  const response = await fetch(`${API_URL}/tenants/lookup/${tenantId}`);
  const data = await response.json() as TenantLookupResponse;
  return data;
};

// Obtiene las unidades activas de un tenant junto con su resumen financiero
export const getTenantUnits = async (tenantId: string): Promise<TenantUnitsResponse> => {
  const response = await fetch(`${API_URL}/tenants/${tenantId}/units`);
  if (!response.ok) {
    const errorData = await response.json() as { message?: string };
    throw new Error(errorData.message || `Error ${response.status}`);
  }
  const data = await response.json() as TenantUnitsResponse;
  return data;
};

// Usa la API route de Next.js para que los errores queden logueados server-side
export const sendToCRMTracker = async (data: OutFormData): Promise<void> => {
  const response = await fetch('/api/crm-salida', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fechaDocumento: data.fechaDocumento,
      mesDocumento: data.mesDocumento,
      anoDocumento: data.anoDocumento,
      tipoPersona: data.tipoPersona,
      nombrePersona: data.nombrePersona,
      correoPersona: data.correoPersona,
      cedulaPersona: data.cedulaPersona,
      numeroLocal: data.numeroLocal,
      tenantId: data.tenantId,
      sucursal: data.sucursal,
      fechaDesocupacion: data.fechaDesocupacion,
      momentoDecision: data.momentoDecision,
      motivoDesocupacion: data.motivoDesocupacion,
      destinoBienes: data.destinoBienes,
      consideracionCambio: data.consideracionCambio,
      calificacionExperiencia: data.calificacionExperiencia,
      recomendacion: data.recomendacion,
      nombreEmpresa: data.nombreEmpresa,
      rucEmpresa: data.rucEmpresa,
      nombreCuenta: data.nombreCuenta,
      banco: data.banco,
      tipoCuenta: data.tipoCuenta,
      numeroCuenta: data.numeroCuenta,
      nombreFirma: data.nombreFirma,
      telefono: data.telefonoFirma,
      firmaDigital: data.firmaDigital,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error(`CRM error ${response.status}: ${JSON.stringify(err)}`);
  }
};
