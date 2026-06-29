import { NextRequest, NextResponse } from 'next/server';

const CRM_API_URL = process.env.NEXT_PUBLIC_CRM_API_URL || 'http://localhost:4000/api/v1';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function postWithRetry(body: unknown, attempt = 1): Promise<Response> {
  const res = await fetch(`${CRM_API_URL}/salidas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok && attempt < MAX_RETRIES) {
    await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
    return postWithRetry(body, attempt + 1);
  }

  return res;
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Record<string, unknown>;

  try {
    const res = await postWithRetry(body);
    const data = await res.json() as unknown;

    if (!res.ok) {
      console.error('[crm-salida] Backend rechazó el formulario', {
        status: res.status,
        bodega: body?.numeroLocal,
        data,
      });
      return NextResponse.json({ success: false, error: data }, { status: res.status });
    }

    console.log('[crm-salida] Registrado exitosamente', {
      bodega: body?.numeroLocal,
      sucursal: body?.sucursal,
      momentoDecision: body?.momentoDecision,
    });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[crm-salida] Error tras 3 intentos', {
      bodega: body?.numeroLocal,
      sucursal: body?.sucursal,
      err: String(err),
    });
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
