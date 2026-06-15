import "server-only";

/**
 * Rate limiter simple en memoria (ventana deslizante por clave).
 * Nota: en serverless (Vercel) la memoria no se comparte entre instancias, así que
 * es best-effort. Suficiente como primera barrera para el MVP, combinado con auth,
 * límites de longitud y el gate de alcance del chat. Para algo estricto, mover a
 * Postgres/Upstash Redis.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(
  key: string,
  max: number,
  windowMs: number
): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  if (hits.length >= max) {
    const retryAfterMs = windowMs - (now - hits[0]);
    buckets.set(key, hits);
    return { ok: false, retryAfterMs };
  }

  hits.push(now);
  buckets.set(key, hits);

  // Limpieza oportunista para que el Map no crezca indefinidamente.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }

  return { ok: true, retryAfterMs: 0 };
}
