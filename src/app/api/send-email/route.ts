import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { sendEmailSchema } from '@/lib/email/schema';
import { resolveRecipients } from '@/lib/email/recipients';
import { buildSalidaEmailHtml } from '@/lib/email/salida-template';
import { isRateLimited, getClientIp } from '@/lib/email/rate-limit';

// Resend usa el SDK de Node — nunca puede correr en el runtime Edge.
export const runtime = 'nodejs';

// Límite defensivo de tamaño de body (la firma en base64 es lo más pesado del payload)
const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2MB

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY no configurada');
  }
  resendClient = new Resend(apiKey);
  return resendClient;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { ok: false, error: 'Demasiados intentos. Intenta de nuevo en unos minutos.' },
      { status: 429 },
    );
  }

  // El header Content-Length es opcional (ej. Transfer-Encoding: chunked) y
  // un cliente malicioso puede omitirlo para saltarse el chequeo previo.
  // Se lee el body completo como ArrayBuffer y se valida su tamaño real
  // antes de intentar parsearlo, evitando bufferizar payloads gigantes.
  const buf = await req.arrayBuffer();
  if (buf.byteLength > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: 'Solicitud demasiado grande.' }, { status: 413 });
  }

  let rawInput: unknown;
  try {
    rawInput = JSON.parse(new TextDecoder().decode(buf));
  } catch {
    return NextResponse.json({ ok: false, error: 'Body inválido.' }, { status: 400 });
  }

  const parsed = sendEmailSchema.safeParse(rawInput);
  if (!parsed.success) {
    console.warn('[send-email] Validación fallida', parsed.error.flatten().fieldErrors);
    return NextResponse.json({ ok: false, error: 'Datos inválidos.' }, { status: 400 });
  }

  const data = parsed.data;

  // Fuente de verdad de destinatarios: SUCURSALES en el servidor. Nunca `data.emails`.
  const recipients = resolveRecipients(data.sucursal_id);
  if (!recipients || recipients.length === 0) {
    return NextResponse.json({ ok: false, error: 'Sucursal no reconocida.' }, { status: 400 });
  }

  const fromAddress = process.env.RESEND_FROM_EMAIL;
  if (!fromAddress) {
    console.error('[send-email] RESEND_FROM_EMAIL no configurada');
    return NextResponse.json({ ok: false, error: 'Servicio de correo no disponible.' }, { status: 500 });
  }

  const resolvedEmailsDisplay = recipients.join(',');
  const html = buildSalidaEmailHtml({ ...data, emails: resolvedEmailsDisplay });

  try {
    const resend = getResendClient();
    const { error } = await resend.emails.send({
      from: fromAddress,
      to: recipients,
      subject: 'Nuevo Formulario de Salida',
      html,
    });

    if (error) {
      console.error('[send-email] Resend rechazó el envío', {
        sucursal: data.sucursal_id,
        numeroLocal: data.numero_local,
        error,
      });
      return NextResponse.json({ ok: false, error: 'No se pudo enviar el correo.' }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[send-email] Error inesperado al enviar', {
      sucursal: data.sucursal_id,
      numeroLocal: data.numero_local,
      err: String(err),
    });
    return NextResponse.json({ ok: false, error: 'No se pudo enviar el correo.' }, { status: 500 });
  }
}
