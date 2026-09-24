-- Verificación de la verdad de datos en producción. SOLO LECTURA.
-- Muestra, para las cuentas vivas, quién cuenta como negocio real y quién no,
-- más el baseline honesto que debería ver Owner.
SELECT json_object(
  'vivas', (
    SELECT json_group_array(json_object(
      'name',      a.name,
      'email',     a.email,
      'excluida',  a."analyticsExcluded",
      'clients',   (SELECT COUNT(*) FROM Client   c WHERE c.advisorId = a.id AND c.active = 1),
      'refs',      (SELECT COUNT(*) FROM Referral r WHERE r.advisorId = a.id AND r.deletedAt IS NULL),
      'refs_conv', (SELECT COUNT(*) FROM Referral r WHERE r.advisorId = a.id AND r.deletedAt IS NULL AND r.status = 'converted')
    ))
    FROM Advisor a WHERE a."deletedAt" IS NULL
  ),
  -- Baseline honesto: solo cuentas vivas y no excluidas.
  'baseline_real', json_object(
    'asesores', (SELECT COUNT(*) FROM Advisor
       WHERE "deletedAt" IS NULL AND "analyticsExcluded" = 0),
    'mrr_mxn',  (SELECT COUNT(*) * 539 FROM Advisor
       WHERE "deletedAt" IS NULL AND "analyticsExcluded" = 0
         AND plan = 'paid' AND "mpPreapprovalId" IS NOT NULL),
    'cartera',  (SELECT COUNT(*) FROM Client c JOIN Advisor a ON a.id = c.advisorId
       WHERE c.active = 1 AND a."deletedAt" IS NULL AND a."analyticsExcluded" = 0),
    'referidos', (SELECT COUNT(*) FROM Referral r JOIN Advisor a ON a.id = r.advisorId
       WHERE r."deletedAt" IS NULL AND a."deletedAt" IS NULL AND a."analyticsExcluded" = 0),
    'convertidos', (SELECT COUNT(*) FROM Referral r JOIN Advisor a ON a.id = r.advisorId
       WHERE r."deletedAt" IS NULL AND r.status = 'converted'
         AND a."deletedAt" IS NULL AND a."analyticsExcluded" = 0),
    'activaciones', (SELECT COUNT(*) FROM ReferralCampaign)
  ),
  -- Esquema: confirma que las 5 migraciones quedaron aplicadas.
  'esquema', json_object(
    'tablas', (SELECT COUNT(*) FROM sqlite_master WHERE type='table'
       AND name IN ('ReferralCampaign','CampaignRecipient','ProductEvent')),
    'convertedAt_poblados', (SELECT COUNT(*) FROM Referral WHERE "convertedAt" IS NOT NULL),
    'convertidos_sin_fecha', (SELECT COUNT(*) FROM Referral
       WHERE status='converted' AND "convertedAt" IS NULL),
    'clients_normalizados', (SELECT COUNT(*) FROM Client WHERE "normalizedPhone" IS NOT NULL)
  )
) AS verdad;
