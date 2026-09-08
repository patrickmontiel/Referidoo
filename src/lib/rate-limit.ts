// Cooldown en memoria por instancia (best-effort). NO es un rate-limit
// distribuido: en serverless cada instancia tiene su propio Map, así que un
// atacante que rota requests puede esquivarlo. Su función real es frenar el
// disparo repetido accidental (doble clic, spamear "Otro") y sumarse al
// disable del botón en el cliente. Para un límite duro a escala, ver TODOS.md
// (Upstash Ratelimit o contador en DB).
const lastCall = new Map<string, number>();

export function onCooldown(key: string, ms: number): boolean {
  const now = Date.now();
  const prev = lastCall.get(key);
  if (prev && now - prev < ms) return true;
  lastCall.set(key, now);
  // Limpieza básica para que el Map no crezca sin fin.
  if (lastCall.size > 5000) {
    for (const [k, t] of lastCall) if (now - t > 60_000) lastCall.delete(k);
  }
  return false;
}

// Rate limit por ventana deslizante, en memoria por instancia (mismo patrón
// best-effort que onCooldown: NO es distribuido; en serverless cada instancia
// tiene su propio Map, así que a escala hace falta Upstash/DB — ver TODOS.md).
// Su función real: frenar fuerza bruta / spam desde una sola instancia y sumar
// una capa barata sobre bcrypt. Devuelve `true` si se EXCEDIÓ el límite.
const hits = new Map<string, number[]>();

export function isRateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    hits.set(key, arr); // conserva las marcas dentro de la ventana
    return true;
  }
  arr.push(now);
  hits.set(key, arr);
  // Limpieza básica del Map.
  if (hits.size > 5000) {
    for (const [k, list] of hits) {
      const kept = list.filter((t) => now - t < windowMs);
      if (kept.length === 0) hits.delete(k);
      else hits.set(k, kept);
    }
  }
  return false;
}

// Extrae una IP best-effort del request para usar como clave del rate limit.
export function clientIp(req: { headers: { get(name: string): string | null } }): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

// Solo para tests: limpia el estado en memoria del rate limit.
export function __resetRateLimit() {
  hits.clear();
  lastCall.clear();
}
