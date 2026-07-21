import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { buildServiceHmacHeaders } from '@/lib/ponline-hmac';

// Ruta EXACTA (sin querystring) del endpoint S2S en PonlineV2 — debe coincidir
// con lo que firma este cliente y con `req.originalUrl` que recompone el
// middleware `authenticateServiceHmac` del lado del backend.
const PONLINE_PAYMENT_SESSION_PATH = '/api/service/payment-sessions';

// Página de retorno en Salidas tras completar (o abandonar) el pago. El
// manejo de `?status=success|failed|error&ref=...` vive en `SalidaFlow`
// (src/components/SalidaFlow.tsx), que se monta ÚNICAMENTE en la ruta raíz
// `/` (src/app/page.tsx) — por eso el returnUrl apunta ahí y no a una ruta
// dedicada. El origin (SALIDAS_PUBLIC_URL o el del request) debe estar dado
// de alta en la allowlist `SALIDAS_RETURN_URL_ALLOWLIST` de PonlineV2, o el
// backend rechazará la sesión con 400.
const SALIDAS_RETURN_PATH = '/';

const REQUEST_TIMEOUT_MS = 10_000;

// Validación de entrada del front. Espejo (más laxo) del DTO real de
// PonlineV2 (`CreatePaymentSessionSchema`) — la fuente de verdad de negocio
// vive en el backend; aquí solo se filtra basura antes de gastar una firma.
const CreatePaymentSessionRequestSchema = z.object({
  tenantId: z.string().regex(/^\d{6}$/, 'tenantId debe tener exactamente 6 dígitos'),
  siteCode: z
    .string()
    .min(1, 'siteCode es requerido')
    .max(32, 'siteCode inválido')
    .regex(/^[A-Za-z0-9_-]+$/, 'siteCode contiene caracteres inválidos'),
});

interface PonlineSessionSuccessResponse {
  sessionUrl: string;
  expiresAt: string;
}

// Resuelve el origin esperado del `sessionUrl` que devuelve PonlineV2.
// `PONLINE_SERVICE_URL` es el host del API S2S (backend); `/pay/[token]` vive
// en el FRONTEND de PonlineV2, que puede estar en un dominio distinto (p.ej.
// Vercel del frontend vs Railway del backend). Se prioriza `PONLINE_FRONTEND_ORIGIN`
// si está configurado; si no, se asume (con warning) que comparte origin con
// el API — documentar en el deploy si ambos hosts difieren.
const resolveExpectedSessionOrigin = (): string | null => {
  const configuredFrontend = process.env.PONLINE_FRONTEND_ORIGIN?.trim();
  const source = configuredFrontend && configuredFrontend.length > 0
    ? configuredFrontend
    : process.env.PONLINE_SERVICE_URL;

  if (!source) return null;

  try {
    const origin = new URL(source).origin;
    if (!configuredFrontend) {
      console.warn(
        '[create-payment-session] PONLINE_FRONTEND_ORIGIN no configurado — usando el origin de PONLINE_SERVICE_URL como fallback. Configura PONLINE_FRONTEND_ORIGIN si el frontend de PonlineV2 vive en un host distinto al API.',
      );
    }
    return origin;
  } catch {
    return null;
  }
};

// Defensa en profundidad: nunca redirigir al cliente a un `sessionUrl` con
// esquema inseguro o de un origin que no sea el esperado de PonlineV2, aunque
// la respuesta upstream haya sido 2xx (evita open redirect si el upstream es
// comprometido o hay un error de configuración).
const isSafeSessionUrl = (rawUrl: string, expectedOrigin: string): boolean => {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const hasSafeProtocol = parsed.protocol === 'https:' || (parsed.protocol === 'http:' && !isProduction);

  return hasSafeProtocol && parsed.origin === expectedOrigin;
};

const resolveReturnUrl = (req: NextRequest): string => {
  const configuredBase = process.env.SALIDAS_PUBLIC_URL?.trim().replace(/\/$/, '');
  const baseUrl = configuredBase && configuredBase.length > 0 ? configuredBase : req.nextUrl.origin;
  return `${baseUrl}${SALIDAS_RETURN_PATH}`;
};

// Traduce el status HTTP que devuelve PonlineV2 a uno seguro para el front,
// sin filtrar detalles internos (p.ej. 401 = credenciales HMAC mal
// configuradas en ESTE servicio, no un error del usuario final).
const mapUpstreamStatus = (upstreamStatus: number): number => {
  if (upstreamStatus === 401) return 500;
  if (upstreamStatus === 429) return 429;
  if (upstreamStatus >= 500) return 502;
  return 400;
};

export async function POST(req: NextRequest) {
  const serviceUrl = process.env.PONLINE_SERVICE_URL;
  const keyId = process.env.PONLINE_HMAC_KEY_ID;
  const secret = process.env.PONLINE_HMAC_SECRET;

  if (!serviceUrl || !keyId || !secret) {
    console.error('[create-payment-session] Faltan variables de entorno de PonlineV2 (PONLINE_SERVICE_URL / PONLINE_HMAC_KEY_ID / PONLINE_HMAC_SECRET)');
    return NextResponse.json({ success: false, error: 'Servicio de pago no disponible' }, { status: 500 });
  }

  let rawInput: unknown;
  try {
    rawInput = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Body inválido' }, { status: 400 });
  }

  const parsed = CreatePaymentSessionRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Datos inválidos', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { tenantId, siteCode } = parsed.data;
  const returnUrl = resolveReturnUrl(req);

  // Serializado UNA sola vez: el mismo string se firma y se envía como body,
  // para que el hash que recalcula PonlineV2 sobre el rawBody coincida byte a
  // byte con el que firmamos aquí.
  const rawBody = JSON.stringify({ tenantId, siteCode, returnUrl });

  const hmacHeaders = buildServiceHmacHeaders(
    'POST',
    PONLINE_PAYMENT_SESSION_PATH,
    rawBody,
    keyId,
    secret,
  );

  try {
    const upstreamResponse = await fetch(`${serviceUrl}${PONLINE_PAYMENT_SESSION_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...hmacHeaders,
      },
      body: rawBody,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const upstreamData = await upstreamResponse.json().catch(() => null) as unknown;

    if (!upstreamResponse.ok) {
      console.error('[create-payment-session] PonlineV2 rechazó la solicitud', {
        status: upstreamResponse.status,
        tenantId,
        siteCode,
      });
      return NextResponse.json(
        { success: false, error: 'No se pudo iniciar la sesión de pago' },
        { status: mapUpstreamStatus(upstreamResponse.status) },
      );
    }

    const sessionData = upstreamData as Partial<PonlineSessionSuccessResponse> | null;
    if (!sessionData?.sessionUrl) {
      console.error('[create-payment-session] Respuesta de PonlineV2 sin sessionUrl', { tenantId, siteCode });
      return NextResponse.json(
        { success: false, error: 'Respuesta inválida del servicio de pago' },
        { status: 502 },
      );
    }

    const expectedOrigin = resolveExpectedSessionOrigin();
    if (!expectedOrigin || !isSafeSessionUrl(sessionData.sessionUrl, expectedOrigin)) {
      // No se loguea el sessionUrl crudo: puede llevar el token de sesión de pago.
      console.error('[create-payment-session] sessionUrl de PonlineV2 con esquema u origin no confiable', {
        tenantId,
        siteCode,
        expectedOrigin,
      });
      return NextResponse.json(
        { success: false, error: 'Respuesta inválida del servicio de pago' },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, sessionUrl: sessionData.sessionUrl });
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'TimeoutError';
    console.error('[create-payment-session] Error al contactar PonlineV2', {
      tenantId,
      siteCode,
      timeout: isTimeout,
      err: String(err),
    });
    return NextResponse.json(
      { success: false, error: 'No se pudo iniciar la sesión de pago. Intenta de nuevo.' },
      { status: isTimeout ? 504 : 502 },
    );
  }
}
