# 11 · Cartera persistente — implementación

> **Objetivo de producto:** *"Conecto mi cartera UNA vez → la cartera permanece → activo segmentos muchas veces."* Reimportar **no** duplica. Un `Client` participa en **N** activaciones sin duplicarse.
>
> Estado: **implementado en local** (Fase 2). Sin push, sin Turso prod.

## 1. Por qué la cartera NO era persistente
- `Client` **no tenía ningún dedupe**: sin unique en `email` ni `phone`, y sin lógica de match. Crear e importar solo verificaban unicidad de `referralCode`.
- `normalizePhone` **ya existía** en `lib/utils.ts` pero **no se usaba** en ninguna ruta de creación/import.
- `Client` no tenía `updatedAt` → era imposible saber si un import actualizó a alguien.
- Consecuencia: **reimportar el mismo CSV creaba filas nuevas** (nuevo `id`, nuevo `referralCode`, nuevo `accessToken`), rompiendo los links ya compartidos y empujando la metáfora Mailchimp.

Lo que **sí** estaba bien: `CampaignRecipient` referencia `clientId` (sin duplicar PII) con `@@unique([campaignId, clientId])` → un cliente **ya podía** estar en N activaciones. El problema era solo el alta/import.

## 2. Identidad (campos aditivos)
```prisma
normalizedPhone  String?   // últimos 10 dígitos (ignora +52, lada, formato)
normalizedEmail  String?   // trim + lowercase
updatedAt        DateTime  @default(now()) @updatedAt
@@index([advisorId, normalizedPhone])
@@index([advisorId, normalizedEmail])
```
**No son `unique` a nivel DB a propósito:** pueden ser `null`, y dos asesores distintos pueden tener legítimamente al mismo humano. El dedupe se aplica **en la app, siempre dentro del mismo `advisorId`**.

Migración: `prisma/add-client-identity.ts` — agrega columnas, **backfillea** los normalizados y `updatedAt` (desde `createdAt`), y **reporta** duplicados preexistentes sin fusionarlos.
> Nota SQLite: `ADD COLUMN` no acepta default no-constante, por eso `updatedAt` se agrega nullable y se backfillea.

## 3. Reglas de identidad
| Caso | Condición (mismo asesor) | Resultado |
|---|---|---|
| **A** | `normalizedPhone` coincide | **YA_EXISTE** → se **actualiza**. Conserva `id`, `referralCode`, `accessToken`, `createdAt` e historial → **los links y portales ya enviados siguen sirviendo**. |
| **B** | teléfono NO coincide pero `normalizedEmail` sí | **POSIBLE_DUPLICADO** → **nunca** auto-merge. El asesor decide: *Actualizar existente · Crear separado · Omitir* (default **omitir**). |
| **C** | sin match | **NUEVO** |
| **D** | sin teléfono y sin correo | **NO_CONTACTABLE** — se puede guardar, pero no se le puede activar por ningún canal. Se avisa. |

Extra: también deduplica **dentro del mismo archivo** (si el CSV trae dos veces el mismo teléfono, la segunda no crea otra fila).
**Nunca** se fusiona entre asesores: `existing` siempre se consulta filtrando por `advisorId`.

## 4. Import con preview (no escribe hasta confirmar)
```
Conectar cartera → subir CSV → PREVIEW → resolver → confirmar
```
- `POST /api/clients/import { rows, preview: true }` → clasifica y devuelve el resumen **sin escribir**.
- Estados: `NUEVO · YA_EXISTE · POSIBLE_DUPLICADO · FALTA_DATO · NO_CONTACTABLE`.
- Resumen: *"86 encontrados · 72 nuevos · 9 ya existen · 3 posibles duplicados · 2 necesitan datos"*.
- Al confirmar: `{ rows, resolutions }` donde `resolutions[i] ∈ update|create|skip` resuelve los posibles duplicados.
- **La cuota solo la consumen los que REALMENTE se crean** (actualizar a alguien que ya está en la cartera no gasta cupo).
- `POST /api/clients` (alta individual) también deduplica; `PATCH /api/clients/[id]` mantiene los normalizados en sincronía cuando cambian teléfono/correo.

## 5. Prueba del kill criterion
> *"PHASE 2 FAIL: si reimportar aumenta el Client count."*

Cubierto por tests: reimportar la misma cartera devuelve **`created = 0`** (todo `updated`), y al actualizar **no se tocan** `referralCode` ni `accessToken`. También: match por teléfono en otro formato (`+52 55 1234 5678` == `5512345678`), email igual con teléfono distinto → posible duplicado sin fusionar, y sin fusión entre asesores.

## 6. Multi-activación
Un `Client` entra a Activación #1, #2 y #3 **sin duplicarse**: cada `CampaignRecipient` apunta al mismo `clientId`, con `@@unique([campaignId, clientId])` evitando repetirlo *dentro* de una misma activación. No hizo falta cambiar nada aquí.

## 7. Limitación documentada
El CSV acepta `email` y `phone` opcionales, pero el **canal** condiciona la contactabilidad: Email necesita correo, WhatsApp necesita teléfono. Un cliente sin ninguno se guarda pero queda **NO CONTACTABLE**. No se cambió el schema de `Client` para forzar uno u otro: la cartera real de un asesor tiene huecos y forzarlo perdería datos.

## 8. Pendiente
- **UI del preview de import** (drag & drop, tabla de resolución de duplicados, CTA "Conectar 81 clientes"). El backend ya lo soporta; falta la pantalla.
- **Fusión de duplicados preexistentes** en producción: la migración los **reporta** pero no los toca (requiere decisión — ver `13`).
