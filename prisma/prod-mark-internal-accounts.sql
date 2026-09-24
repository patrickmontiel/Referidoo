-- ============================================================================
-- DATA TRUTH · marcar cuentas que NO son adopción de mercado
-- ============================================================================
-- Un solo UPDATE sobre Advisor.analyticsExcluded. No borra nada, no toca datos
-- de ningún asesor, y es reversible con el mismo UPDATE poniendo 0.
--
-- Clasificación decidida por Patrick el 24-sep-2026 sobre las 9 cuentas VIVAS
-- que encontró el dry-run (las 29 borradas ya quedan fuera por deletedAt).
--
-- SE EXCLUYEN (analyticsExcluded = 1):
--   patrickkarim2002@hotmail.com   Patrick (dueño) — cuenta del owner
--   patrickkarim2002@gmail.com     QA Smoke Test — cuenta de pruebas de prod
--   romomarcela925@yahoo.com.mx    Marcela Romo — alta de cortesía (favor
--                                  personal, nunca usó el producto: 0 clientes,
--                                  sin verificar). Contarla como asesora real
--                                  inflaría la tracción.
--   patrickmontiel@gmail.com       Patrik Montiel — no se sabe quién la creó
--                                  (Patrick o un familiar), 0 clientes, 0 uso.
--                                  Sin saber qué es, no puede contar como real.
--
-- SE MANTIENEN EN ANALYTICS (no se tocan, analyticsExcluded sigue en 0):
--   ceci.c.carrasco@gmail.com      CECILIA CARRASCO CAMPOS — real
--   omarjuarezl1708@gmail.com      Omar Juarez — real
--   planeacion.finanzas@gmail.com  EDUARDO NERI — real (cuenta viva confirmada)
--   angelisraelnetworth@gmail.com  Angel Israel Sosa Gómez — real
--   rodrigo@ahoraseguros.com       Rodrigo De la Mora — real, inbound orgánico
--
-- NOTA sobre el referido convertido de Cecilia: Patrick confirmó que fue una
-- prueba. NO se borra ni se altera (regla: nunca tocar datos de Cecilia, Omar
-- o Eduardo). Queda documentado en 13-PROD-DATA-CLEANUP-PLAN.md que las
-- conversiones REALES de negocio son 0, no 1.
-- ============================================================================

UPDATE "Advisor"
SET "analyticsExcluded" = 1
WHERE "deletedAt" IS NULL
  AND email IN (
    'patrickkarim2002@hotmail.com',
    'patrickkarim2002@gmail.com',
    'romomarcela925@yahoo.com.mx',
    'patrickmontiel@gmail.com'
  );
