-- SOLO LECTURA. ¿Qué cuentas vivas va a bajar el cron billing-downgrade y por qué?
-- Replica las tres condiciones del cron para ver a quién alcanza.
SELECT json_group_array(json_object(
  'name',      name,
  'email',     email,
  'plan',      plan,
  'paidUntil', "paidUntil",
  'mp',        CASE WHEN "mpPreapprovalId" IS NULL THEN 'no' ELSE 'si' END,
  'creada',    date("createdAt"),
  'riesgo', CASE
    WHEN plan <> 'paid' THEN 'ninguno (no esta en paid)'
    WHEN "paidUntil" IS NOT NULL AND "paidUntil" < strftime('%Y-%m-%dT%H:%M:%S.000+00:00','now')
      THEN 'LO BAJA YA: paidUntil vencido'
    WHEN "paidUntil" IS NULL AND "mpPreapprovalId" IS NULL
         AND "createdAt" < strftime('%Y-%m-%dT%H:%M:%S.000+00:00','now','-30 days')
      THEN 'LO BAJA YA: paid sin fecha y cuenta de +30 dias'
    WHEN "paidUntil" IS NULL AND "mpPreapprovalId" IS NULL
      THEN 'LO BAJARA al cumplir 30 dias desde el registro'
    ELSE 'a salvo hasta paidUntil'
  END
)) AS riesgo_downgrade
FROM Advisor
WHERE "deletedAt" IS NULL;
