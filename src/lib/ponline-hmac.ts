// Firma HMAC-SHA256 para el canal server-to-server Alma-Salidas -> PonlineV2.
//
// Replica BYTE A BYTE el esquema que recomputa `authenticateServiceHmac` en
// PonlineV2 (ponline-backend/src/presentation/middlewares/service-hmac.middleware.ts):
//
//   Headers:    X-Api-Key-Id, X-Timestamp, X-Nonce, X-Signature
//   String a firmar (canonicalización): METHOD \n PATH \n TIMESTAMP \n NONCE \n KEY_ID \n hex(sha256(rawBody))
//   Firma:      hex(HMAC_SHA256(secret, signingString))
//
// CRÍTICO: `rawBody` debe ser el string EXACTO (mismos bytes) que luego se
// envía como body del fetch. Si se vuelve a serializar el objeto antes de
// enviarlo, el hash del body firmado no coincidirá con el que PonlineV2
// recalcula sobre el rawBody que realmente recibe, y la firma será rechazada
// con 401 aunque el secreto sea correcto.
import crypto from 'crypto';

export interface ServiceHmacHeaders {
  'X-Api-Key-Id': string;
  'X-Timestamp': string;
  'X-Nonce': string;
  'X-Signature': string;
}

const buildSigningString = (
  method: string,
  path: string,
  timestamp: string,
  nonce: string,
  keyId: string,
  rawBody: string,
): string => {
  const bodyHash = crypto.createHash('sha256').update(rawBody, 'utf8').digest('hex');
  return [method.toUpperCase(), path, timestamp, nonce, keyId, bodyHash].join('\n');
};

/**
 * Genera los 4 headers HMAC para una petición firmada hacia PonlineV2.
 *
 * @param method HTTP method (p.ej. 'POST')
 * @param path Path exacto sin querystring (p.ej. '/api/service/payment-sessions')
 * @param rawBody String JSON EXACTO que se enviará como body del fetch
 * @param keyId Identificador del secreto (X-Api-Key-Id) — PONLINE_HMAC_KEY_ID
 * @param secret Secreto HMAC compartido — PONLINE_HMAC_SECRET (server-side only)
 */
export const buildServiceHmacHeaders = (
  method: string,
  path: string,
  rawBody: string,
  keyId: string,
  secret: string,
): ServiceHmacHeaders => {
  // Epoch en segundos — el middleware valida una ventana anti-replay (skew)
  // sobre este mismo formato (dígitos puros).
  const timestamp = Math.floor(Date.now() / 1000).toString();
  // uuid v4: cumple el patrón esperado por el middleware (^[A-Za-z0-9-]+$, 8-128 chars)
  // y es único por petición, requisito del bloqueo anti-replay en Redis.
  const nonce = crypto.randomUUID();

  const signingString = buildSigningString(method, path, timestamp, nonce, keyId, rawBody);
  const signature = crypto.createHmac('sha256', secret).update(signingString).digest('hex');

  return {
    'X-Api-Key-Id': keyId,
    'X-Timestamp': timestamp,
    'X-Nonce': nonce,
    'X-Signature': signature,
  };
};
