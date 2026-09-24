-- ============================================================================
-- COMP para CECILIA CARRASCO CAMPOS — Pro de regalo por 1 año
-- ============================================================================
-- Decidido por Patrick el 24-sep-2026: le regala el acceso Pro para el
-- experimento de activación.
--
-- Por qué se escribe `paidUntil` y no solo `plan`: Ceci arrastraba un
-- `paidUntil` VENCIDO (2026-08-17) de un trial anterior. Al subirla a "paid"
-- sin tocar esa fecha, el cron billing-downgrade la encontraba en
-- `plan='paid' AND paidUntil < now` y la bajaba a freemium en su siguiente
-- corrida. Eso era el "sube de nivel y al otro día se quita".
--
-- `mpPreapprovalId` se queda en NULL a propósito: es un regalo, no una
-- suscripción. Las métricas de MRR real exigen `mpPreapprovalId IS NOT NULL`
-- (ver src/lib/analytics-scope.ts), así que este comp NO infla el ingreso.
--
-- Formato de fecha: TEXT ISO con offset, igual que el resto de la tabla
-- (verificado con prod-check-date-format.sql). Escribirlo de otra forma
-- rompería la lectura de Prisma.
-- ============================================================================

UPDATE "Advisor"
SET plan              = 'paid',
    "paidUntil"       = strftime('%Y-%m-%dT%H:%M:%S.000+00:00', 'now', '+365 days'),
    "paymentFailedAt" = NULL
WHERE email = 'ceci.c.carrasco@gmail.com'
  AND "deletedAt" IS NULL;
