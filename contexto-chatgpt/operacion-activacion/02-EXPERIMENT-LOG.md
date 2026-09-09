# 02 · Experiment Log — Referidoo (acumulativo)

> Bitácora acumulativa de experimentos de activación. **Una entrada por experimento** (normalmente = un cliente real de un asesor). Append-only.
>
> **Regla de privacidad:** NO almacenar PII sensible. Nombres → iniciales o alias ("Cliente A"). IDs → truncados (primeros 6 chars). Nada de teléfonos, correos, CLABE ni apellidos. Las quotes textuales se anonimizan (quitar nombres/datos).

## Campos de cada entrada
- **Experiment ID** — `EXP-YYYYMMDD-n`
- **Date**
- **Advisor** — alias (p. ej. "Ceci", "Prospecto-32")
- **Client** — alias ("Cliente A") · `clientId` truncado
- **Hypothesis** — qué creemos que va a pasar
- **Stage reached** — el outcome A–J más lejano alcanzado (ver `01`)
- **Metrics** — eventos observados en `ProductEvent` (con timestamps)
- **Observed behavior** — qué hizo la persona, sin interpretar
- **Exact quote** — cita textual anonimizada (fricción en sus palabras)
- **Friction** — dónde/por qué se trabó
- **Intervention** — si Patrick intervino, qué hizo (y en qué momento)
- **Outcome** — resultado final del intento
- **Learning** — qué aprendimos (1–3 líneas)
- **Confidence** — baja / media / alta + por qué
- **Decision** — qué decidimos a raíz de esto
- **Next action** — siguiente paso concreto

---

## Plantilla (copiar para cada experimento)

```
### EXP-YYYYMMDD-n
- Experiment ID:
- Date:
- Advisor:
- Client (alias · id truncado):
- Hypothesis:
- Stage reached (A–J):
- Metrics (eventos + timestamps):
- Observed behavior:
- Exact quote (anonimizada):
- Friction:
- Intervention (qué / cuándo):
- Outcome:
- Learning:
- Confidence (baja/media/alta + por qué):
- Decision:
- Next action:
```

---

## Entradas

> **UNKNOWN — REQUIERE OBSERVACIÓN REAL.** Aún no hay experimentos ejecutados con asesores reales. La primera entrada será el experimento 1 con Ceci (ver `01-CECI-EXPERIMENTO.md`), una vez la instrumentación esté en producción y Patrick corra la sesión.

_(sin entradas todavía)_
