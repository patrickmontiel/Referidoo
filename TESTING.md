# Testing

100% test coverage es la clave para vibe coding seguro. Los tests te dejan moverte
rápido y confiar en tus instintos — sin ellos, vibe coding es solo yolo coding.
Con tests, es un superpoder.

## Framework

- **Unit/integration**: [Vitest](https://vitest.dev/) 4 + `@testing-library/react`
- **E2E**: `@playwright/test` (configurar `playwright.config.ts` cuando se agregue el primer test e2e)

## Cómo correr los tests

```bash
npm run test         # corre toda la suite una vez
npm run test:watch   # modo watch
npm run test:e2e     # e2e con Playwright (cuando existan specs)
```

## Capas de tests

- **Unit tests** (`src/**/__tests__/*.test.ts`): lógica pura sin dependencias externas —
  cálculo de recompensas (`src/lib/rewards.ts`), generación de códigos de referido
  (`src/lib/utils.ts`). Mock de DB/Prisma cuando aplique.
- **Integration tests**: rutas de API (`src/app/api/**/route.ts`) que tocan la DB —
  aún no hay ejemplos, agregar cuando se escriba el primero.
- **E2E tests**: flujos completos de usuario (login, conversión de referido, reclamo
  de burbuja, portal del cliente) vía Playwright contra el servidor de dev.

## Convenciones

- Archivos de test colocados junto al código en `__tests__/`, sufijo `.test.ts`.
- `describe` por función/módulo, `it` en tercera persona describiendo el comportamiento
  ("returns X when Y"), no implementación.
- Assertions sobre el comportamiento real (valores devueltos, efectos), nunca
  `toBeDefined()` como único check.
