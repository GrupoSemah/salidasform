import { z } from 'zod';

/**
 * Valida el body de POST /api/send-email.
 * Refleja los campos de `EmailTemplateParams` (src/lib/email-template.ts), que es
 * lo que hoy arma el frontend (OutForm y /logs) en snake_case.
 *
 * `emails` se acepta pero NUNCA se usa para decidir destinatarios reales — el
 * servidor los resuelve a partir de `sucursal_id` (ver src/lib/email/recipients.ts).
 * `correo_persona` no se valida como email estricto: puede provenir de un log
 * histórico ya sanitizado y no debe romper el flujo de reenvío manual desde /logs.
 */
export const sendEmailSchema = z.object({
  emails: z.string().max(2000).optional(),
  sucursal_id: z.string().trim().min(1, 'sucursal_id es requerido').max(100),
  sucursal_nombre: z.string().trim().min(1, 'sucursal_nombre es requerido').max(200),
  tipo_persona: z.string().max(200).optional().default(''),
  fecha_documento: z.string().max(100).optional().default(''),
  nombre_persona: z.string().trim().min(1, 'nombre_persona es requerido').max(300),
  correo_persona: z.string().trim().min(1, 'correo_persona es requerido').max(300),
  cedula_persona: z.string().max(100).optional().default(''),
  numero_local: z.string().max(100).optional().default(''),
  tenant_id: z.string().max(100).optional().default(''),
  fecha_desocupacion: z.string().max(100).optional().default(''),
  momento_decision: z.string().max(500).optional().default(''),
  motivo_desocupacion: z.string().max(500).optional().default(''),
  destino_bienes: z.string().max(500).optional().default(''),
  consideracion_cambio: z.string().max(500).optional().default(''),
  calificacion_experiencia: z.string().max(500).optional().default(''),
  recomendacion: z.string().max(500).optional().default(''),
  nombre_empresa: z.string().max(300).optional().default(''),
  ruc_empresa: z.string().max(100).optional().default(''),
  nombre_cuenta: z.string().max(300).optional().default(''),
  banco: z.string().max(200).optional().default(''),
  tipo_cuenta: z.string().max(100).optional().default(''),
  numero_cuenta: z.string().max(100).optional().default(''),
  nombre_firma: z.string().max(300).optional().default(''),
  telefono_firma: z.string().max(100).optional().default(''),
  fecha_envio: z.string().max(100).optional().default(''),
  // ~500k caracteres cubre holgadamente una firma base64 (el frontend ya
  // reemplaza la firma por un placeholder de texto si supera ~30KB decodificados)
  firma_digital: z.string().max(500_000).optional(),
});

export type SendEmailInput = z.infer<typeof sendEmailSchema>;
