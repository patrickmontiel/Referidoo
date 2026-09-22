-- ============================================================================
-- PROD DATA TRUTH · DRY RUN — QUERY ÚNICA (SOLO LECTURA)
-- ============================================================================
-- Copiar TODO este archivo y pegarlo en el SQL shell de Turso PRODUCCIÓN.
-- Es UNA sola sentencia SELECT. No hay DELETE/UPDATE/INSERT/ALTER/DROP.
-- Devuelve una sola celda con un JSON. Copiar esa celda y pegarla en el chat.
--
-- Solo usa columnas que YA existen en producción. No referencia
-- analyticsExcluded, convertedAt, normalizedPhone ni las tablas de campañas
-- (esas se crean en las migraciones pendientes).
--
-- PRIVACIDAD: cero PII de clientes. Del asesor se muestran nombre y correo
-- porque son la clave para clasificarlo como real vs interno.
-- ============================================================================

SELECT json_object(
  'generado', datetime('now'),

  'tablas', (
    SELECT json_group_array(name) FROM sqlite_master
    WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '\_%' ESCAPE '\'
  ),

  'totales', json_object(
    'advisors',      (SELECT COUNT(*) FROM Advisor),
    'clients',       (SELECT COUNT(*) FROM Client),
    'referrals',     (SELECT COUNT(*) FROM Referral),
    'productEvents', (SELECT COUNT(*) FROM ProductEvent)
  ),

  'asesores', (
    SELECT json_group_array(json_object(
      'id',         substr(a.id, 1, 8),
      'name',       a.name,
      'email',      a.email,
      'plan',       a.plan,
      'mp_real',    CASE WHEN a.mpPreapprovalId IS NULL THEN 0 ELSE 1 END,
      'verificado', a.emailVerified,
      'borrado',    CASE WHEN a.deletedAt IS NULL THEN 0 ELSE 1 END,
      'creado',     date(a.createdAt),
      'clients',    (SELECT COUNT(*) FROM Client   c WHERE c.advisorId = a.id),
      'referrals',  (SELECT COUNT(*) FROM Referral r WHERE r.advisorId = a.id),
      'refs_vivos', (SELECT COUNT(*) FROM Referral r WHERE r.advisorId = a.id AND r.deletedAt IS NULL),
      'refs_conv',  (SELECT COUNT(*) FROM Referral r WHERE r.advisorId = a.id AND r.status='converted' AND r.deletedAt IS NULL),
      'planEvents', (SELECT COUNT(*) FROM PlanEvent p WHERE p.advisorId = a.id),
      'tiers',      (SELECT COUNT(*) FROM RewardTier t WHERE t.advisorId = a.id),
      'prodEvents', (SELECT COUNT(*) FROM ProductEvent e WHERE e.advisorId = a.id),
      'ult_ref',    (SELECT date(MAX(r.createdAt)) FROM Referral r WHERE r.advisorId = a.id),
      'ult_client', (SELECT date(MAX(c.createdAt)) FROM Client   c WHERE c.advisorId = a.id)
    ))
    FROM Advisor a
  ),

  -- MRR fantasma: plan='paid' SIN suscripción de MercadoPago = trial o comp,
  -- NO ingreso. Un backfill histórico puso 'paid' a cuentas no verificadas.
  'mrr', (
    SELECT json_object(
      'paid_total',      COUNT(*),
      'con_mp_real',     COALESCE(SUM(CASE WHEN mpPreapprovalId IS NOT NULL THEN 1 ELSE 0 END), 0),
      'sin_mp_fantasma', COALESCE(SUM(CASE WHEN mpPreapprovalId IS NULL     THEN 1 ELSE 0 END), 0),
      'mrr_inflado_mxn', COALESCE(SUM(CASE WHEN mpPreapprovalId IS NULL     THEN 1 ELSE 0 END), 0) * 539
    )
    FROM Advisor WHERE plan = 'paid' AND deletedAt IS NULL
  ),

  -- Referidos borrados que ninguna query de Owner filtraba (inflaban GWP,
  -- comisión, ranking y close rate).
  'referrals_borrados', (
    SELECT json_object(
      'total',             COUNT(*),
      'convertidos',       COALESCE(SUM(CASE WHEN status='converted' THEN 1 ELSE 0 END), 0),
      'gwp_fantasma',      COALESCE(SUM(CASE WHEN status='converted' THEN saleAmount       END), 0),
      'comision_fantasma', COALESCE(SUM(CASE WHEN status='converted' THEN lessioCommission END), 0)
    )
    FROM Referral WHERE deletedAt IS NOT NULL
  ),

  -- Huella de seeds/fixtures conocidos (seed-blur-test.ts usa 55 1111 00xx).
  'fixtures', json_object(
    'referrals_tel_fixture', (SELECT COUNT(*) FROM Referral
       WHERE replace(replace(replace(leadPhone,' ',''),'-',''),'+','') LIKE '%1111000%'),
    'clients_tel_fixture',   (SELECT COUNT(*) FROM Client
       WHERE replace(replace(replace(phone,' ',''),'-',''),'+','') LIKE '%9999000%')
  )
) AS dry_run;
