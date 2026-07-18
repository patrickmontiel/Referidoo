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
