// Fuente ÚNICA de verdad del tope de leads del plan gratuito.
//
// Vive en su propio módulo (sin dependencias de DB/Prisma) para poder
// importarse tanto desde el servidor (lib/plan.ts, rutas API) como desde
// componentes cliente (perfil, pipeline) sin arrastrar el cliente Prisma al
// bundle del navegador. Antes estaba duplicado hardcodeado en varios lugares
// (causa de la inconsistencia "5 vs 12"); ahora todos importan de aquí.
export const FREEMIUM_LEAD_LIMIT = 5;
