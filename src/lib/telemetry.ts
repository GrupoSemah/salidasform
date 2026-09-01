// Telemetría best-effort de intentos de submission del formulario de salida.
// Usa navigator.sendBeacon (sobrevive a la navegación fuera de la página) con
// fallback a fetch keepalive en modo no-cors. Nunca debe interrumpir el flujo
// de submit del formulario ni lanzar errores hacia el llamador.
'use client';

const API_URL = process.env.NEXT_PUBLIC_CRM_API_URL || 'http://localhost:4000/api/v1';
const TELEMETRY_URL = `${API_URL}/telemetry/form-submission`;

export type SubmissionStage = 'received' | 'error';
export type SubmissionStatus = 'ok' | 'error';

// Payload final que se envía al backend del tracker
export interface SubmissionTelemetryPayload {
  formType: 'salida';
  stage: SubmissionStage;
  status: SubmissionStatus;
  sucursalRaw: string;
  tenantId: string;
  clientName: string;
  email: string;
  bodega: string;
  failureReason: string | null;
  clientTimestamp: string;
  origin: string;
}

// Datos que el caller debe proveer; clientTimestamp y origin se calculan aquí
export type ReportSubmissionInput = Omit<
  SubmissionTelemetryPayload,
  'formType' | 'clientTimestamp' | 'origin' | 'failureReason'
> & {
  failureReason?: string | null;
};

// Reporta un intento de submission al backend del tracker. No lanza errores:
// cualquier falla (sendBeacon ausente, fetch rechazado, SSR) se descarta en
// silencio ya que esto es telemetría auxiliar, no parte del flujo crítico.
export function reportSubmission(input: ReportSubmissionInput): void {
  if (typeof navigator === 'undefined') return;

  try {
    const payload: SubmissionTelemetryPayload = {
      formType: 'salida',
      stage: input.stage,
      status: input.status,
      sucursalRaw: input.sucursalRaw,
      tenantId: input.tenantId,
      clientName: input.clientName,
      email: input.email,
      bodega: input.bodega,
      failureReason: input.failureReason ?? null,
      clientTimestamp: new Date().toISOString(),
      origin: typeof window !== 'undefined' ? window.location.origin : '',
    };

    const body = JSON.stringify(payload);

    if (typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'text/plain' });
      const delivered = navigator.sendBeacon(TELEMETRY_URL, blob);
      if (delivered) return;
    }

    // Fallback: sendBeacon no existe o rechazó encolar el envío
    void fetch(TELEMETRY_URL, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'text/plain' },
      keepalive: true,
      mode: 'no-cors',
    }).catch(() => undefined);
  } catch {
    // Best-effort: la telemetría nunca debe romper el flujo de submit
  }
}
