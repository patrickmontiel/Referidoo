import type { Client } from "@libsql/client";

// Un `ALTER TABLE ADD COLUMN` ya aplicado lanza "duplicate column name". Ese es
// el ÚNICO error que significa "ya está hecho". Cualquier otro (token inválido,
// red caída, tabla base inexistente, permiso denegado) es un fallo REAL.
//
// Antes todos los errores se imprimían como `Info:` y el script salía con 0, así
// que una migración fallida se veía igual que una exitosa. Eso es justo lo que
// rompe producción: creer que migraste, pushear, y que el código nuevo consulte
// una columna que no existe.
const ALREADY_APPLIED = /duplicate column name/i;

function label(sql: string): string {
  return sql.split("\n")[0].trim().slice(0, 78);
}

/** Ejecuta DDL aditivo. Tolera solo "ya aplicado"; cualquier otro error aborta. */
export async function runDDL(db: Client, statements: string[]): Promise<void> {
  for (const sql of statements) {
    try {
      await db.execute(sql);
      console.log(`✓ ${label(sql)}`);
    } catch (e) {
      const msg = (e as Error).message;
      if (ALREADY_APPLIED.test(msg)) {
        console.log(`· ya aplicado: ${label(sql)}`);
        continue;
      }
      console.error(`\n✗ FALLÓ: ${label(sql)}\n  ${msg}\n`);
      throw e;
    }
  }
}

/** Verifica que las columnas existan DESPUÉS de migrar. "Sin error" no basta. */
export async function assertColumns(db: Client, table: string, columns: string[]): Promise<void> {
  const info = await db.execute(`PRAGMA table_info("${table}")`);
  const have = new Set(info.rows.map((r) => String(r.name)));
  const missing = columns.filter((c) => !have.has(c));
  if (missing.length) {
    throw new Error(`VERIFICACIÓN FALLIDA — a "${table}" le faltan: ${missing.join(", ")}`);
  }
  console.log(`✓ verificado: "${table}" tiene ${columns.join(", ")}`);
}

/** Verifica que las tablas existan DESPUÉS de migrar. */
export async function assertTables(db: Client, tables: string[]): Promise<void> {
  const res = await db.execute(`SELECT name FROM sqlite_master WHERE type='table'`);
  const have = new Set(res.rows.map((r) => String(r.name)));
  const missing = tables.filter((t) => !have.has(t));
  if (missing.length) {
    throw new Error(`VERIFICACIÓN FALLIDA — faltan tablas: ${missing.join(", ")}`);
  }
  console.log(`✓ verificado: existen ${tables.join(", ")}`);
}

/** Envuelve el main de una migración: cierra la conexión y sale != 0 si falló. */
export function runMigration(db: Client, main: () => Promise<void>, name: string): void {
  main()
    .then(() => console.log(`\n✅ ${name}: OK`))
    .catch((e) => {
      console.error(`\n❌ ${name}: NO SE APLICÓ — ${(e as Error).message}`);
      console.error(`   NO hagas push hasta que esta migración termine en OK.`);
      process.exitCode = 1;
    })
    .finally(() => db.close());
}
