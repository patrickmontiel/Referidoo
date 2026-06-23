// Crea el Plan de Referidoo en Mercado Pago. Correr UNA VEZ por cada cuenta/
// credencial (test y producción son cuentas separadas, así que hay que
// correrlo una vez con MP_ACCESS_TOKEN de prueba y otra con el de producción).
// Después de correrlo, copia el "planId" que imprime a MP_PLAN_ID en .env
// (y en Vercel para producción).
import "dotenv/config";
import { createPlan } from "../src/lib/mercadopago";

async function main() {
  const { planId, initPoint } = await createPlan();
  console.log("✓ Plan creado");
  console.log("  planId:", planId);
  console.log("  initPoint (link genérico, no usar directo — cada asesor tiene su propio link):", initPoint);
  console.log("\nAgrega esto a tu .env (o a Vercel para producción):");
  console.log(`MP_PLAN_ID=${planId}`);
}

main().catch((err) => {
  console.error("✗ Error creando el plan:", err);
  process.exit(1);
});
