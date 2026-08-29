# Soluciones de Onboarding — copy + código listo

> Salida de `onboarding-ux` (estructura) + `ux-writing` (copy). Cada fix ataca la activación de dos lados. Copy en español MX, tono "colega que te ayuda", no manual. Estilos calcados del código existente (`#0B0B0C`, `#2563EB`, `rounded-2xl`, etc.). Orden = impacto en cerrar UN loop.

Última actualización: 2026-08-29

---

## FIX 1 — Rescatar "agrégate a ti mismo" (el más importante)

**Problema:** hoy es un link `text-xs` que solo vive mientras `clients.length === 0` (`ClientesClient.tsx:611-619`). Desaparece en cuanto meten al primer familiar.

**Solución en dos frentes:**

### 1a. Estado vacío de /admin/clientes → tarjeta prominente (reemplaza el `:699`)
Hoy: `<div className="text-center py-16 ...">Agrega tu primer cliente para comenzar.</div>`

Reemplázalo por una tarjeta que lidere con probar-sin-riesgo:

```tsx
// Reemplaza el estado vacío en ClientesClient.tsx (~línea 698-699)
) : sorted.length === 0 ? (
  <div className="bg-brand-blue-bg border border-[#DCE6FB] rounded-2xl p-6 text-center">
    <p className="text-[17px] font-bold text-[#0B0B0C]">Pruébalo contigo primero</p>
    <p className="text-sm text-brand-gray-3 mt-1.5 max-w-sm mx-auto leading-relaxed">
      Antes de invitar a un cliente real, corre el loop completo contigo mismo en 2 minutos —
      sin arriesgar a nadie. Así lo entiendes de punta a punta y lo enseñas sin pena.
    </p>
    <div className="flex flex-col sm:flex-row gap-2 justify-center mt-4">
      {advisor?.email && (
        <button
          onClick={() => { setForm({ name: advisor.name, phone: advisor.phone ?? "", email: advisor.email ?? "", policyNumber: "" }); setShowForm(true); }}
          className="bg-brand-blue text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:opacity-90 active:scale-[.98] transition"
        >
          Agregarme como mi cliente de prueba
        </button>
      )}
      <button
        onClick={() => setShowForm(true)}
        className="text-sm font-semibold px-5 py-2.5 rounded-full border border-[#DADCE0] text-[#0B0B0C] hover:bg-[#F4F5F7] transition"
      >
        Agregar un cliente real
      </button>
    </div>
  </div>
) : (
```

### 1b. Que el auto-test NO dependa de `clients.length === 0`
En `PrimerosPasosCard` / `AdminLayoutShell` (las TASKS), agrega una tarea permanente **"Corre el loop una vez (pruébalo contigo)"** que quede marcada solo cuando el asesor haya abierto el portal de un cliente de prueba. Así la salida privada existe aunque ya hayan metido a un familiar.

> **Copy de la tarea:** `Pruébalo contigo: corre el loop completo una vez`

---

## FIX 2 — Forzar el handoff después de crear un cliente

**Problema:** al crear, el form se cierra y el cliente cae en la lista con botones iguales (`ClientesClient.tsx:206-210`). El paso que importa (compartir) no se eleva.

**Solución:** tras crear con éxito, en vez de solo cerrar el form, mostrar un estado de éxito con UN CTA héroe (mandar el link ahora). Guarda el cliente recién creado en estado y muéstralo:

```tsx
// nuevo estado, arriba con los otros useState
const [justCreated, setJustCreated] = useState<Client | null>(null);

// dentro de handleCreate, en el bloque res.ok — en vez de solo cerrar:
if (res.ok) {
  const created: Client = await res.json().catch(() => null);
  setForm({ name: "", email: "", phone: "", policyNumber: "" });
  setShowForm(false);
  if (created?.accessToken) setJustCreated(created);
  load();
}
```

```tsx
// Banner de éxito con el handoff forzado (renderízalo arriba de la lista)
{justCreated && (
  <div className="bg-[#0B0B0C] rounded-2xl p-5 mb-4 text-white">
    <p className="text-[15px] font-bold">Listo, {justCreated.name.split(" ")[0]} ya está en tu cartera.</p>
    <p className="text-[13px] text-white/70 mt-1 leading-relaxed">
      Ahora el paso que de verdad importa: mándale su link para que empiece a recomendarte.
      Sin esto, no pasa nada — con esto, arranca tu primer referido.
    </p>
    <div className="flex flex-wrap gap-2 mt-4">
      <button
        onClick={() => { window.open(buildWhatsAppUrl(justCreated), "_blank"); }}
        className="flex items-center gap-2 bg-[#25D366] hover:bg-[#22C55E] text-white text-sm font-semibold px-5 py-2.5 rounded-full transition"
      >
        <WhatsAppIcon /> Mándale su link ahora
      </button>
      <button
        onClick={() => setJustCreated(null)}
        className="text-sm font-medium text-white/70 hover:text-white px-4 py-2.5 rounded-full border border-white/20 transition"
      >
        Ahora no
      </button>
    </div>
  </div>
)}
```

> **Nota de copy (ux-writing):** el CTA dice exactamente lo que pasa ("Mándale su link ahora" → abre WhatsApp con el mensaje). El "Ahora no" es escape sin culpa, no un dead-end oculto. El texto nombra la consecuencia real ("sin esto, no pasa nada") sin regañar.

---

## FIX 3 — Reencuadrar el copy de éxito: de "clientes" a "un cliente que comparte"

Cambios de una línea, alto impacto en enfoque:

| Dónde | Hoy | Nuevo (ux-writing) |
|---|---|---|
| `AdminOverviewClient.tsx:177` | "Aun no hay referidos." | "Aún no te cae ningún referido — pasa cuando un cliente comparte su link." |
| `AdminOverviewClient.tsx:179` | "Agrega tu primer cliente" | "Empieza: agrega un cliente y mándale su link" |
| `AdminOverviewClient.tsx:137` (subtítulo) | "Resumen de tu actividad · {mes}" | *(déjalo)* |
| Primeros Pasos, subcopy | "toca una tarea y te llevo de la mano" | *(bien, déjalo)* |

Y en el dashboard, considera que la **primera stat** que ve el asesor no sea "Clientes activos" sino "Referidos" (lo que quieres que crezca). Cambio mínimo en `statCards` (`:124-128`): poner `Referidos totales` primero.

> Regla: el copy debe enseñarle al asesor que **el marcador es "referidos que me cayeron", no "clientes que metí".** Cada frase que refuerce "agregar" sin mencionar "compartir" desalinea la sesión.

---

## FIX 4 — Puente del auto-test al cliente real

**Problema:** la tarjeta de cliente de prueba termina en "Cuando termines, elimínalo" (`ClientesClient.tsx:666`). Se pierde el pico de convicción.

**Solución:** reescribe esa línea y el botón para tender puente:

```tsx
// ClientesClient.tsx ~línea 665-667 — nuevo copy
<p className="text-[13px] text-brand-gray-3 mt-1 leading-relaxed">
  Así se ve un cliente registrado. Ábrelo como si fueras tu cliente, pícale a todo y siente el
  flujo completo. Cuando lo tengas claro, elimínalo y hazlo con un cliente real que te recomendaría —
  ese es el que va a traerte tu primer referido.
</p>
```

Y renombra el botón rojo de `"Ya probé, eliminar"` → **`"Ya lo entendí, ahora con un cliente real"`** (que elimine el de prueba Y abra el form de nuevo cliente):

```tsx
<button
  onClick={() => { deactivate(sc.id); setShowForm(true); }}
  className="text-sm font-medium text-brand-blue px-4 py-2 rounded-full border border-[#DCE6FB] hover:bg-brand-blue-bg active:scale-[.98] transition"
>
  Ya lo entendí, ahora con un cliente real
</button>
```

---

## Orden sugerido de implementación
1. **FIX 1** (rescatar el auto-test) — ataca directo la raíz de tu problema.
2. **FIX 2** (forzar el handoff) — dispara el segundo lado del loop.
3. **FIX 4** (puente del auto-test) — barato, alto momentum.
4. **FIX 3** (reencuadre de copy) — cambios de una línea, hazlos de pasada.

Ninguno toca schema ni pagos. Todo es UI/copy en `admin/`. Cuando quieras, los implemento y verifico en el navegador (375px + desktop) antes de pushear.
