// Types para el flujo de arranque de pago hacia PonlineV2

// Petición enviada a la API route interna que firma y llama a PonlineV2
export interface CreatePaymentSessionRequest {
  tenantId: string;
  siteCode: string;
}

// Respuesta de la API route interna con la URL de la sesión de pago
export interface CreatePaymentSessionResponse {
  sessionUrl: string;
}

// Estados posibles con los que PonlineV2 redirige de vuelta a Salidas
export type PaymentReturnStatus = 'success' | 'failed' | 'error';

export interface PaymentReturnData {
  status: PaymentReturnStatus;
  ref: string | null;
}
