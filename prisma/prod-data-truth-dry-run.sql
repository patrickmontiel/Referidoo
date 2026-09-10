-- ============================================================================
-- PROD DATA TRUTH · DRY RUN  (SOLO LECTURA — NO BORRA NADA)
-- ============================================================================
-- Ejecutar en el SQL shell de Turso PRODUCCIÓN. Todas las sentencias son
-- SELECT. No hay un solo DELETE/UPDATE/DROP en este archivo.
--
-- Objetivo: saber EXACTAMENTE qué hay en producción antes de decidir qué
-- borrar. Nada se elimina hasta que Patrick apruebe (ver 13-PROD-DATA-CLEANUP-PLAN.md).
--
-- PRIVACIDAD: no se imprime PII (sin nombres de clientes, teléfonos, correos
-- de clientes ni CLABE). Del asesor sí se muestra email porque es la clave
-- para clasificarlo como real vs interno.
--
-- ASESORES REALES confirmados por Patrick:
--   CECILIA CARRASCO CAMPOS · Omar Juarez · EDUARDO NERI
-- Todo lo demás debe demostrarse antes de contarse como real.
-- ============================================================================


-- ─────────────────────────────────────────────────────────────────────────
-- 1. INVENTARIO DE ASESORES + clasificación propuesta
--    Revisa esta tabla PRIMERO: de aquí sale todo lo demás.
-- ─────────────────────────────────────────────────────────────────────────
SELECT
  substr(a.id, 1, 8)                              AS advisor_id,
  a.name,
  a.email,
  a.plan,
  CASE WHEN a.mpPreapprovalId IS NULL THEN 'NO' ELSE 'SI' END AS suscripcion_mp_real,
  a.emailVerified,
  a.deletedAt,
  date(a.createdAt)                               AS creado,
  (SELECT COUNT(*) FROM Client   c WHERE c.advisorId = a.id) AS clients,
  (SELECT COUNT(*) FROM Referral r WHERE r.advisorId = a.id) AS referrals,
  -- Clasificación PROPUESTA (heurística, revisar a mano):
  CASE
    WHEN a.email LIKE '%@referidoo-test.mx'                    THEN 'TEST (e2e)'
    WHEN a.email LIKE '%@local.test'                           THEN 'TEST (QA local)'
    WHEN a.email LIKE 'blur-test@%'                            THEN 'TEST (seed blur)'
    WHEN a.email LIKE 'test-%' OR a.name LIKE 'Test %'         THEN 'TEST'
    WHEN a.name  LIKE 'QA %'   OR a.name LIKE 'Asesor E2E%'    THEN 'TEST'
    WHEN a.email = 'eduardo@referidoo.mx'                      THEN 'UNKNOWN (seed.ts creó este email; Eduardo Neri es asesor REAL — confirmar cuál es cuál)'
    WHEN a.name LIKE '%CECILIA%' OR a.name LIKE '%Cecilia%'    THEN 'REAL (confirmado)'
    WHEN a.name LIKE '%Omar%'                                  THEN 'REAL (confirmado)'
    WHEN a.name LIKE '%NERI%'  OR a.name LIKE '%Neri%'         THEN 'REAL (confirmar cuenta correcta)'
    ELSE 'UNKNOWN — requiere decisión'
  END                                             AS clasificacion_propuesta
FROM Advisor a
ORDER BY clients DESC, a.createdAt ASC;


-- ─────────────────────────────────────────────────────────────────────────
-- 2. VOLUMEN POR TABLA, POR ASESOR (counts + ventana temporal)
--    Para dimensionar qué se borraría por cuenta.
-- ─────────────────────────────────────────────────────────────────────────
SELECT
  substr(a.id, 1, 8) AS advisor_id,
  a.name,
  a.email,
  'Client' AS tabla,
  COUNT(c.id) AS filas,
  date(MIN(c.createdAt)) AS primera,
  date(MAX(c.createdAt)) AS ultima
FROM Advisor a LEFT JOIN Client c ON c.advisorId = a.id
GROUP BY a.id
UNION ALL
SELECT substr(a.id,1,8), a.name, a.email, 'Referral', COUNT(r.id),
       date(MIN(r.createdAt)), date(MAX(r.createdAt))
FROM Advisor a LEFT JOIN Referral r ON r.advisorId = a.id
GROUP BY a.id
UNION ALL
SELECT substr(a.id,1,8), a.name, a.email, 'PlanEvent', COUNT(p.id),
       date(MIN(p.createdAt)), date(MAX(p.createdAt))
FROM Advisor a LEFT JOIN PlanEvent p ON p.advisorId = a.id
GROUP BY a.id
UNION ALL
SELECT substr(a.id,1,8), a.name, a.email, 'RewardTier', COUNT(t.id), NULL, NULL
FROM Advisor a LEFT JOIN RewardTier t ON t.advisorId = a.id
GROUP BY a.id
ORDER BY advisor_id, tabla;


-- ─────────────────────────────────────────────────────────────────────────
-- 3. TABLAS QUE PUEDEN NO EXISTIR TODAVÍA EN PROD
--    (ProductEvent existe; ReferralCampaign/CampaignRecipient solo si ya se
--     corrió add-referral-campaigns.ts. Si dan error, es que aún no existen.)
-- ─────────────────────────────────────────────────────────────────────────
SELECT name AS tabla_existente FROM sqlite_master WHERE type='table' ORDER BY name;

-- ProductEvent por asesor (instrumentación del funnel)
SELECT substr(advisorId,1,8) AS advisor_id, COUNT(*) AS product_events,
       date(MIN(createdAt)) AS primera, date(MAX(createdAt)) AS ultima
FROM ProductEvent GROUP BY advisorId ORDER BY product_events DESC;

-- Campañas (si la tabla existe)
-- SELECT substr(advisorId,1,8) AS advisor_id, COUNT(*) AS campaigns FROM ReferralCampaign GROUP BY advisorId;
-- SELECT substr(advisorId,1,8) AS advisor_id, COUNT(*) AS recipients FROM CampaignRecipient GROUP BY advisorId;


-- ─────────────────────────────────────────────────────────────────────────
-- 4. MRR FANTASMA — el origen del humo
--    `plan='paid'` SIN mpPreapprovalId = trial o comp manual, NO ingreso.
--    Un backfill histórico (add-advisor-plan-verification.ts) puso plan='paid'
--    a TODOS los asesores no verificados. Cada uno contaba $539 de MRR.
-- ─────────────────────────────────────────────────────────────────────────
SELECT
  COUNT(*)                                                          AS advisors_plan_paid,
  SUM(CASE WHEN mpPreapprovalId IS NOT NULL THEN 1 ELSE 0 END)       AS con_suscripcion_mp_REAL,
  SUM(CASE WHEN mpPreapprovalId IS NULL     THEN 1 ELSE 0 END)       AS sin_suscripcion_FANTASMA,
  SUM(CASE WHEN mpPreapprovalId IS NULL     THEN 1 ELSE 0 END) * 539 AS mrr_inflado_mxn
FROM Advisor
WHERE plan = 'paid' AND deletedAt IS NULL;

-- Detalle de los "paid" sin suscripción real
SELECT substr(id,1,8) AS advisor_id, name, email, date(createdAt) AS creado,
       paidUntil, paymentFailedAt
FROM Advisor
WHERE plan = 'paid' AND mpPreapprovalId IS NULL AND deletedAt IS NULL
ORDER BY createdAt;


-- ─────────────────────────────────────────────────────────────────────────
-- 5. REFERIDOS BORRADOS QUE AÚN CONTABAN
--    Ninguna query de owner filtraba Referral.deletedAt → inflaban GWP,
--    comisión, ranking y close rate.
-- ─────────────────────────────────────────────────────────────────────────
SELECT
  COUNT(*)                                                   AS referrals_borrados,
  SUM(CASE WHEN status='converted' THEN 1 ELSE 0 END)         AS de_esos_convertidos,
  COALESCE(SUM(CASE WHEN status='converted' THEN saleAmount END), 0)       AS gwp_fantasma,
  COALESCE(SUM(CASE WHEN status='converted' THEN lessioCommission END), 0) AS comision_fantasma
FROM Referral WHERE deletedAt IS NOT NULL;


-- ─────────────────────────────────────────────────────────────────────────
-- 6. HUELLA DE SEEDS / FIXTURES CONOCIDOS
--    seed-blur-test.ts inserta 15 referidos con teléfonos 55 1111 00xx
--    y un cliente con 55 9999 0001. seed.ts inserta eduardo@referidoo.mx.
-- ─────────────────────────────────────────────────────────────────────────
SELECT COUNT(*) AS referrals_con_telefono_de_fixture
FROM Referral WHERE replace(replace(replace(leadPhone,' ',''),'-',''),'+','') LIKE '%1111000%';

SELECT COUNT(*) AS clients_con_telefono_de_fixture
FROM Client WHERE replace(replace(replace(phone,' ',''),'-',''),'+','') LIKE '%9999000%';


-- ─────────────────────────────────────────────────────────────────────────
-- 7. CARTERA DUPLICADA (por falta de dedupe histórico)
--    Mismo teléfono, mismo asesor = misma persona duplicada.
--    NO se fusiona automáticamente: requiere decisión.
--    (Requiere haber corrido add-client-identity.ts en prod.)
-- ─────────────────────────────────────────────────────────────────────────
-- SELECT substr(advisorId,1,8) AS advisor_id, normalizedPhone, COUNT(*) AS copias
-- FROM Client
-- WHERE normalizedPhone IS NOT NULL
-- GROUP BY advisorId, normalizedPhone
-- HAVING COUNT(*) > 1
-- ORDER BY copias DESC;


-- ─────────────────────────────────────────────────────────────────────────
-- 8. BASELINE HONESTO — cómo se vería Owner si solo contáramos lo real
--    Sustituye los ids de la lista por los de los asesores REALES del punto 1.
-- ─────────────────────────────────────────────────────────────────────────
-- SELECT
--   (SELECT COUNT(*) FROM Advisor WHERE deletedAt IS NULL AND analyticsExcluded = 0) AS asesores_reales,
--   (SELECT COUNT(*) FROM Advisor WHERE deletedAt IS NULL AND analyticsExcluded = 0
--      AND plan='paid' AND mpPreapprovalId IS NOT NULL) * 539                        AS mrr_real,
--   (SELECT COUNT(*) FROM Referral r JOIN Advisor a ON a.id=r.advisorId
--      WHERE r.deletedAt IS NULL AND a.deletedAt IS NULL AND a.analyticsExcluded = 0) AS referrals_reales,
--   (SELECT COALESCE(SUM(r.saleAmount),0) FROM Referral r JOIN Advisor a ON a.id=r.advisorId
--      WHERE r.status='converted' AND r.deletedAt IS NULL
--        AND a.deletedAt IS NULL AND a.analyticsExcluded = 0)                         AS gwp_real;
-- (Descomentar DESPUÉS de correr add-analytics-excluded.ts en prod.)
