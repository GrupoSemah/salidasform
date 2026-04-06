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

export const sendToCRMTracker = async (data: OutFormData): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/salidas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Document date
        fechaDocumento: data.fechaDocumento,
        mesDocumento: data.mesDocumento,
        anoDocumento: data.anoDocumento,
        
        // Person type
        tipoPersona: data.tipoPersona,
        
        // Common fields
        nombrePersona: data.nombrePersona,
        correoPersona: data.correoPersona,
        cedulaPersona: data.cedulaPersona,
        numeroLocal: data.numeroLocal,
        tenantId: data.tenantId,
        sucursal: data.sucursal,
        
        // Exit details
        fechaDesocupacion: data.fechaDesocupacion,
        motivoDesocupacion: data.motivoDesocupacion,
        destinoBienes: data.destinoBienes,
        
        // Nuevos campos de tracking
        consideracionCambio: data.consideracionCambio,
        calificacionExperiencia: data.calificacionExperiencia,
        
        // Persona Jurídica
        nombreEmpresa: data.nombreEmpresa,
        rucEmpresa: data.rucEmpresa,
        
        // Bank details
        nombreCuenta: data.nombreCuenta,
        banco: data.banco,
        tipoCuenta: data.tipoCuenta,
        numeroCuenta: data.numeroCuenta,
        
        // Signature
        nombreFirma: data.nombreFirma,
        firmaDigital: data.firmaDigital,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Datos enviados al CRM Tracker:', result);
  } catch (error) {
    console.error('❌ Error al enviar datos al CRM Tracker:', error);
    // No lanzar error para no interrumpir el flujo del formulario
    // El email ya se envió, esto es un backup adicional
  }
};
