import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { createClient } from "@libsql/client";

// Corre un .sql o un script de migración contra Turso PRODUCCIÓN.
//
// Las credenciales se leen SIEMPRE de .env.turso-prod y nunca se pasan por la
// línea de comandos ni se imprimen, así no quedan en el historial del shell ni
// en el transcript de la sesión. Solo se imprime el host.
//
// .env.turso-prod no lo carga Next ni dotenv/config, así que `npm run dev` y
// los tests siguen apuntando a la base local.
//
// Uso:
//   npx tsx prisma/prod.ts prisma/prod-dry-run-ONE.sql            (solo lectura)
//   npx tsx prisma/prod.ts prisma/add-analytics-excluded.ts --write
//
// Sin --write: un .sql con cualquier sentencia de escritura se rechaza ANTES de
// conectarse, y los scripts .ts no corren. La intención de escribir es explícita.

// Las credenciales viven FUERA del repo, en el home del usuario.
//
// Por qué: cuando el archivo está dentro del workspace, el editor notifica los
// cambios al agente incluyendo el contenido — así que un token pegado ahí acaba
// en el transcript de la sesión aunque nunca se escriba en el chat. Fuera del
// workspace eso no pasa, y el agente nunca abre este archivo: solo lo lee este
// runner para armar la conexión.
const ENV_FILE = path.join(os.homedir(), ".referidoo-turso.env");
const LEGACY_ENV_FILE = ".env.turso-prod";
// Ojo: `REPLACE` solo escribe como `REPLACE INTO` / `INSERT OR REPLACE`.
// `replace(x,y,z)` es la función de cadenas de SQLite y la usa el dry-run para
// normalizar teléfonos — incluirla suelta bloqueaba una query de solo lectura.
const WRITE_SQL =
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|VACUUM|ATTACH)\b|\bREPLACE\s+INTO\b/i;

function loadCreds(): { url: string; authToken: string } {
  if (!fs.existsSync(ENV_FILE)) {
    console.error(`\n✗ Falta el archivo de credenciales:\n    ${ENV_FILE}\n`);
    console.error(`  Debe tener dos líneas:`);
    console.error(`    DATABASE_URL=libsql://<tu-base>.turso.io`);
    console.error(`    TURSO_AUTH_TOKEN=<token de BASE DE DATOS, no de la Platform API>\n`);
    if (fs.existsSync(path.resolve(LEGACY_ENV_FILE))) {
      console.error(`  Hay un ${LEGACY_ENV_FILE} dentro del repo: mueve su contenido al de`);
      console.error(`  arriba y vacíalo. Dentro del workspace el editor expone su contenido.\n`);
    }
    process.exit(1);
  }
  const env: Record<string, string> = {};
  for (const line of fs.readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
    if (/^\s*#/.test(line)) continue;
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  const url = env.DATABASE_URL ?? "";
  const authToken = env.TURSO_AUTH_TOKEN ?? "";
  if (!url) {
    console.error(`\n✗ DATABASE_URL está vacío en ${ENV_FILE}.\n`);
    process.exit(1);
  }
  if (!/^(libsql|https):\/\//.test(url)) {
    console.error(`\n✗ DATABASE_URL no apunta a Turso (debe empezar con libsql://).\n`);
    process.exit(1);
  }
  if (!authToken) {
    console.error(`\n✗ TURSO_AUTH_TOKEN está vacío en ${ENV_FILE}.\n`);
    process.exit(1);
  }
  console.log(`→ destino: ${url.replace(/^(libsql|https):\/\//, "")}`);
  return { url, authToken };
}

async function runSql(file: string, allowWrite: boolean) {
  const sql = fs.readFileSync(file, "utf8");
  const bare = sql.replace(/--[^\n]*/g, ""); // los comentarios no cuentan
  if (!allowWrite && WRITE_SQL.test(bare)) {
    const hit = bare.match(WRITE_SQL)?.[0];
    console.error(`\n✗ ${file} contiene una sentencia de escritura (${hit}) y no se pasó --write.`);
    console.error(`  Nada se envió a producción.\n`);
    process.exit(1);
  }
  const { url, authToken } = loadCreds();
  const db = createClient({ url, authToken });
  try {
    const res = await db.execute(sql);
    if (!res.rows.length) {
      console.log("(sin filas)");
      return;
    }
    for (const row of res.rows) {
      for (const [k, v] of Object.entries(row)) {
        console.log(`\n───── ${k} ─────`);
        console.log(typeof v === "string" ? v : JSON.stringify(v));
      }
    }
  } finally {
    db.close();
  }
}

function runScript(file: string) {
  const { url, authToken } = loadCreds();
  // Las credenciales viajan por el entorno del proceso hijo, nunca por argv.
  const r = spawnSync("npx", ["tsx", file], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, DATABASE_URL: url, TURSO_AUTH_TOKEN: authToken },
  });
  process.exit(r.status ?? 1);
}

const args = process.argv.slice(2);
const allowWrite = args.includes("--write");
const target = args.find((a) => !a.startsWith("--"));

if (!target || !fs.existsSync(target)) {
  console.error(`\nUso: npx tsx prisma/prod.ts <archivo.sql|archivo.ts> [--write]\n`);
  process.exit(1);
}

if (target.endsWith(".sql")) {
  runSql(target, allowWrite).catch((e) => {
    console.error(`\n✗ ${(e as Error).message}\n`);
    process.exit(1);
  });
} else if (!allowWrite) {
  console.error(`\n✗ ${target} es un script y puede escribir. Requiere --write explícito.\n`);
  process.exit(1);
} else {
  runScript(target);
}
