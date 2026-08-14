import type { SendEmailInput } from './schema';

/**
 * Convierte texto plano en HTML seguro para interpolar dentro del correo.
 * Defensa en profundidad: el frontend ya sanitiza con DOMPurify, pero este
 * endpoint puede recibirse directo (ej. reenvío manual desde /logs), así que
 * no se confía únicamente en la sanitización del cliente.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function e(value: string | undefined): string {
  return escapeHtml(value ?? '');
}

/**
 * Escapa un valor para interpolarlo de forma segura dentro de un atributo HTML
 * (ej. `src="..."`). Cubre los mismos caracteres peligrosos que `escapeHtml`.
 */
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Data URI de imagen estricto: solo formatos soportados por clientes de correo
// y payload en base64 puro. Rechaza cualquier cosa que no calce exactamente,
// evitando que se rompa el atributo `src` o se inyecten handlers/HTML.
const DATA_IMAGE_URI_REGEX = /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/]+=*$/;

/** `emails` resuelto por el servidor (no el que envió el cliente) para mostrarlo en el pie del correo */
export interface SalidaEmailHtmlParams extends SendEmailInput {
  emails: string;
}

/**
 * Construye el HTML del correo de "Nuevo Formulario de Salida".
 * Migrado 1:1 desde la plantilla de EmailJS — bloques `{{#campo}}...{{/campo}}`
 * ahora son condicionales de JS; `{{campo}}` es interpolación directa escapada.
 */
export function buildSalidaEmailHtml(params: SalidaEmailHtmlParams): string {
  const empresaBlock = params.nombre_empresa && params.nombre_empresa !== 'N/A'
    ? `<p style="margin: 5px 0; color: #666;"><strong>Empresa:</strong> ${e(params.nombre_empresa)}</p>`
    : '';

  const rucBlock = params.ruc_empresa && params.ruc_empresa !== 'N/A'
    ? `<p style="margin: 5px 0; color: #666;"><strong>RUC:</strong> ${e(params.ruc_empresa)}</p>`
    : '';

  // La firma solo puede ser un data URI de imagen válido (regex estricta);
  // cualquier otro valor (ej. el placeholder "No se incluyó firma digital"
  // que arma el frontend cuando la firma pesa demasiado, o un payload
  // malicioso que solo simula el prefijo) omite el bloque por completo.
  const isValidFirmaDigital = !!params.firma_digital && DATA_IMAGE_URI_REGEX.test(params.firma_digital);
  const firmaDigitalBlock = isValidFirmaDigital
    ? `<h4 style="color: #4b5563; margin: 15px 0 10px 0; font-size: 14px;">📝 Firma Digital:</h4>
<img style="max-width: 300px; border: 1px solid #ccc; border-radius: 4px;" src="${escapeAttr(params.firma_digital as string)}" alt="Firma Digital">`
    : '';

  return `<div style="font-family: system-ui, sans-serif, Arial; font-size: 14px; color: #333; padding: 20px 14px; background-color: #f5f5f5;">
<div style="max-width: 600px; margin: auto; background-color: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
<div style="text-align: center; background: linear-gradient(135deg, #f97316, #ea580c); padding: 20px;">
<h1 style="color: white; margin: 10px 0 0 0; font-size: 18px; font-weight: 600;">Almacenajes Minidep&oacute;sitos</h1>
</div>
<div style="padding: 30px 20px;">
<h2 style="color: #f97316; font-size: 24px; margin-bottom: 20px; border-bottom: 2px solid #fed7aa; padding-bottom: 10px;">📋 Nuevo Formulario de Salida</h2>
<p style="margin-bottom: 20px; color: #666; line-height: 1.6;">Se ha recibido una nueva solicitud de desocupaci&oacute;n de local. A continuaci&oacute;n los detalles:</p>
<div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 15px; margin: 20px 0; border-radius: 0 6px 6px 0;">
<h3 style="color: #ea580c; margin: 0 0 10px 0; font-size: 16px;">📅 Informaci&oacute;n del Documento</h3>
<p style="margin: 5px 0; color: #666;"><strong>Fecha:</strong> ${e(params.fecha_documento)}</p>
<p style="margin: 5px 0; color: #666;"><strong>Sucursal:</strong> ${e(params.sucursal_nombre)}</p>
<p style="margin: 5px 0; color: #666;"><strong>Tipo de Persona:</strong> ${e(params.tipo_persona)}</p>
</div>
<div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 6px 6px 0;">
<h3 style="color: #d97706; margin: 0 0 10px 0; font-size: 16px;">👤 Datos del Solicitante</h3>
<p style="margin: 5px 0; color: #666;"><strong>Nombre:</strong> ${e(params.nombre_persona)}</p>
<p style="margin: 5px 0; color: #666;"><strong>Correo Electr&oacute;nico:</strong> ${e(params.correo_persona)}</p>
<p style="margin: 5px 0; color: #666;"><strong>C&eacute;dula:</strong> ${e(params.cedula_persona)}</p>
${empresaBlock}${rucBlock}</div>
<div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 0 6px 6px 0;">
<h3 style="color: #059669; margin: 0 0 10px 0; font-size: 16px;">🏢 Informaci&oacute;n del Local</h3>
<p style="margin: 5px 0; color: #666;"><strong>N&uacute;mero de Local:</strong> ${e(params.numero_local)}</p>
<p style="margin: 5px 0; color: #666;"><strong>Tenant ID:</strong> ${e(params.tenant_id)}</p>
<p style="margin: 5px 0; color: #666;"><strong>Fecha de Desocupaci&oacute;n:</strong> ${e(params.fecha_desocupacion)}</p>
</div>
<div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 0 6px 6px 0;">
<h3 style="color: #dc2626; margin: 0 0 10px 0; font-size: 16px;">❓ Motivo de Desocupaci&oacute;n</h3>
<p style="margin: 5px 0; color: #666;"><strong>&iquest;Cu&aacute;ndo tom&oacute; la decisi&oacute;n de desocupar el dep&oacute;sito?</strong></p>
<p style="margin: 5px 0 15px 10px; color: #666;">${e(params.momento_decision)}</p>
<p style="margin: 5px 0; color: #666;"><strong>&iquest;Qu&eacute; le motiv&oacute; a considerar desocupar su dep&oacute;sito?</strong></p>
<p style="margin: 5px 0 15px 10px; color: #666;">${e(params.motivo_desocupacion)}</p>
<p style="margin: 5px 0; color: #666;"><strong>&iquest;Qu&eacute; har&aacute; con las pertenencias que mantiene en el dep&oacute;sito?</strong></p>
<p style="margin: 5px 0; color: #666; margin-left: 10px;">${e(params.destino_bienes)}</p>
</div>
<div style="background-color: #f0f9ff; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0; border-radius: 0 6px 6px 0;">
<h3 style="color: #0369a1; margin: 0 0 10px 0; font-size: 16px;">💭 Consideraciones Adicionales</h3>
<p style="margin: 5px 0; color: #666;"><strong>Cuando pens&oacute; en desocupar, &iquest;consider&oacute; cambiarse a una unidad m&aacute;s peque&ntilde;a?</strong></p>
<p style="margin: 5px 0 15px 10px; color: #666;">${e(params.consideracion_cambio)}</p>
<p style="margin: 5px 0; color: #666;"><strong>En general, &iquest;c&oacute;mo calificar&iacute;a su experiencia con nosotros?</strong></p>
<p style="margin: 5px 0; color: #666; margin-left: 10px;">${e(params.calificacion_experiencia)}</p>
<p style="margin: 5px 0; color: #666; margin-left: 10px;"><strong>Si alguien cercano a usted necesitase un minidep&oacute;sito, &iquest;nos recomendar&iacute;a?</strong></p>
<p style="margin: 5px 0; color: #666; margin-left: 10px;">${e(params.recomendacion)}</p>
</div>
<div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 0 6px 6px 0;">
<h3 style="color: #2563eb; margin: 0 0 10px 0; font-size: 16px;">💳 Datos Bancarios para Devoluci&oacute;n</h3>
<p style="margin: 5px 0; color: #666;"><strong>Titular de la Cuenta:</strong> ${e(params.nombre_cuenta)}</p>
<p style="margin: 5px 0; color: #666;"><strong>Banco:</strong> ${e(params.banco)}</p>
<p style="margin: 5px 0; color: #666;"><strong>Tipo de Cuenta:</strong> ${e(params.tipo_cuenta)}</p>
<p style="margin: 5px 0; color: #666;"><strong>N&uacute;mero de Cuenta:</strong> ${e(params.numero_cuenta)}</p>
</div>
<div style="background-color: #f3f4f6; border-left: 4px solid #6b7280; padding: 15px; margin: 20px 0; border-radius: 0 6px 6px 0;">
<h3 style="color: #4b5563; margin: 0 0 10px 0; font-size: 16px;">✍️ Firma</h3>
<p style="margin: 5px 0; color: #666;"><strong>Nombre del Firmante:</strong> ${e(params.nombre_firma)}</p>
${firmaDigitalBlock}</div>
<div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #e2e8f0;">
<p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.5;"><strong>📧 Enviado desde:</strong> Formulario Web de Almacenajes Minidep&oacute;sitos<br><strong>🕒 Fecha de env&iacute;o:</strong> ${e(params.fecha_envio)}<br><strong>📍 Destinatarios:</strong> ${e(params.emails)}</p>
</div>
</div>
<div style="background-color: #1f2937; color: #9ca3af; padding: 20px; text-align: center;">
<p style="margin: 0; font-size: 12px;">&copy; 2025 Almacenajes Minidep&oacute;sitos - Departamento de IT<br>Este es un email autom&aacute;tico, por favor no responder directamente.</p>
</div>
</div>
</div>`;
}
