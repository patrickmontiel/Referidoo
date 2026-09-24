-- SOLO LECTURA. Cómo guarda Prisma los DateTime en esta base (SQLite/libSQL):
-- INTEGER (epoch ms) o TEXT (ISO). Necesario para escribir paidUntil a mano sin
-- corromper el valor que luego lee Prisma.
SELECT json_object(
  'muestras_paidUntil', (
    SELECT json_group_array(json_object('tipo', typeof("paidUntil"), 'valor', "paidUntil"))
    FROM Advisor WHERE "paidUntil" IS NOT NULL LIMIT 3
  ),
  'muestras_createdAt', (
    SELECT json_group_array(json_object('tipo', typeof("createdAt"), 'valor', "createdAt"))
    FROM Advisor LIMIT 2
  ),
  'ceci', (
    SELECT json_object(
      'plan', plan,
      'paidUntil', "paidUntil",
      'mp', CASE WHEN "mpPreapprovalId" IS NULL THEN 'null' ELSE 'tiene' END,
      'creada', date("createdAt"),
      'excluida', "analyticsExcluded"
    )
    FROM Advisor WHERE email = 'ceci.c.carrasco@gmail.com' AND "deletedAt" IS NULL
  )
) AS formato;
