// Guardia para scripts DESTRUCTIVOS de prisma/ (seeds, resets).
//
// Contexto: `seed.ts` y `reset-demo.ts` borraban tablas completas y aceptaban
// cualquier DATABASE_URL — incluida la de Turso producción. Un `npm run seed`
// o un `prisma db seed` con credenciales de prod en el entorno destruía datos
// reales. Esta guardia hace imposible ese accidente.
//
// Regla: los scripts destructivos SOLO corren contra un archivo local
// (`file:...`). Cualquier URL remota (libsql://, https://, wss://) aborta.

export function assertLocalDatabase(scriptName: string): string {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";

  if (!url.startsWith("file:")) {
    console.error(
      `\n✋ ABORTADO: ${scriptName} es un script DESTRUCTIVO y solo puede correr contra una base LOCAL.\n` +
        `   DATABASE_URL apunta a un destino remoto (${url.split(":")[0]}://…).\n\n` +
        `   Si de verdad quieres correrlo en local:\n` +
        `     DATABASE_URL="file:./dev.db" npx tsx prisma/${scriptName}\n`
    );
    process.exit(1);
  }

  if (process.env.TURSO_AUTH_TOKEN) {
    console.error(
      `\n✋ ABORTADO: hay TURSO_AUTH_TOKEN en el entorno mientras corres ${scriptName}.\n` +
        `   Eso indica credenciales de producción cargadas. Limpia el entorno:\n` +
        `     DATABASE_URL="file:./dev.db" TURSO_AUTH_TOKEN="" npx tsx prisma/${scriptName}\n`
    );
    process.exit(1);
  }

  return url;
}
