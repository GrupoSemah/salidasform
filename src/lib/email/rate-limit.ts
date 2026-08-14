/**
 * Rate limiter en memoria por IP para el endpoint de envío de correo.
 *
 * LIMITACIÓN CONOCIDA: al vivir en la memoria del proceso Node, este límite
 * NO se comparte entre réplicas si la app llegara a escalar horizontalmente
 * (Dokploy hoy corre una sola instancia, así que es suficiente). Si se
 * despliegan múltiples instancias, migrar a un store compartido (ej. Redis)
 * para que el límite aplique de forma consistente entre todas.
 */
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 5;

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Evita que el Map crezca indefinidamente con IPs de una sola visita */
function pruneExpiredBuckets(now: number): void {
  if (buckets.size < 5000) return;
  for (const [ip, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(ip);
  }
}

/**
 * @returns `true` si la IP debe ser bloqueada por exceder el límite.
 */
export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  pruneExpiredBuckets(now);

  const bucket = buckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  if (bucket.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  bucket.count += 1;
  return false;
}

/** Extrae la IP del cliente detrás del proxy/reverse-proxy de Dokploy */
export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();

  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return 'unknown';
}
