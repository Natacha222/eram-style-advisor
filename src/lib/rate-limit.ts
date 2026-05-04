/**
 * Rate limiting in-memory pour /api/recommend (cybersécurité).
 *
 * Pour la démo : Map en mémoire (suffit pour 1 instance Vercel).
 * Pour multi-instance : remplacer par `@upstash/ratelimit` + Redis (cf. spec).
 *
 * Limite par défaut : 10 requêtes / minute / IP. Configurable via
 * `RATE_LIMIT_PER_MINUTE` dans `.env.local`.
 */

const WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 10;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function getLimit(): number {
  const fromEnv = Number(process.env.RATE_LIMIT_PER_MINUTE);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_LIMIT;
}

/**
 * Vérifie si l'IP peut faire une nouvelle requête maintenant.
 *
 * Sliding fixed window simple : tant que `now < resetAt`, on incrémente ; sinon
 * on ouvre une nouvelle fenêtre.
 *
 * @returns
 * - `{ allowed: true, remaining: number }` si la requête est autorisée.
 * - `{ allowed: false, retryAfterMs: number }` si bloquée (avec délai à attendre).
 */
export function checkRateLimit(
  ip: string,
):
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterMs: number } {
  const limit = getLimit();
  const now = Date.now();
  const bucket = buckets.get(ip);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: limit - 1 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count };
}
