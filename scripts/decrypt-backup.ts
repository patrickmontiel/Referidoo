import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { decryptBackup } from "../src/lib/backup-crypto";

// Abre un respaldo cifrado de los que manda el cron diario por correo.
//
// Uso:
//   npx tsx scripts/decrypt-backup.ts referidoo-backup-2026-09-24.json.enc
//
// La passphrase se pide por consola (no se pasa como argumento: quedaría en el
// historial del shell). Es la de BACKUP_ENCRYPTION_KEY. Sin ella el respaldo es
// irrecuperable — guárdala en un gestor de contraseñas.

function preguntarPassphrase(): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  return new Promise((resolve) => {
    // Oculta lo que se escribe, para que no quede en pantalla.
    const salida = process.stdout as NodeJS.WriteStream & { _writeToOutput?: (s: string) => void };
    const rlAny = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
    const original = rlAny._writeToOutput?.bind(rl);
    rlAny._writeToOutput = function (s: string) {
      if (s.includes("Passphrase")) original?.(s);
      else salida.write("");
    };
    rl.question("Passphrase (BACKUP_ENCRYPTION_KEY): ", (respuesta) => {
      rl.close();
      process.stdout.write("\n");
      resolve(respuesta.trim());
    });
  });
}

async function main() {
  const archivo = process.argv[2];
  if (!archivo) {
    console.error("\nUso: npx tsx scripts/decrypt-backup.ts <archivo.json.enc>\n");
    process.exit(1);
  }
  if (!fs.existsSync(archivo)) {
    console.error(`\n✗ No existe: ${archivo}\n`);
    process.exit(1);
  }

  const passphrase = await preguntarPassphrase();
  if (!passphrase) {
    console.error("✗ Passphrase vacía.");
    process.exit(1);
  }

  let json: string;
  try {
    json = decryptBackup(fs.readFileSync(archivo), passphrase);
  } catch (e) {
    console.error(`\n✗ ${(e as Error).message}\n`);
    process.exit(1);
  }

  const destino = archivo.replace(/\.enc$/, "") || `${archivo}.json`;
  const salida = destino === archivo ? `${archivo}.descifrado.json` : destino;
  fs.writeFileSync(salida, json);

  const dump = JSON.parse(json) as { generatedAt?: string; counts?: Record<string, number> };
  console.log(`✓ Descifrado en: ${path.resolve(salida)}`);
  if (dump.generatedAt) console.log(`  generado: ${dump.generatedAt}`);
  if (dump.counts) {
    console.log(`  contenido: ${Object.entries(dump.counts).map(([k, v]) => `${k}: ${v}`).join(" · ")}`);
  }
  console.log(`\n  Ojo: el archivo descifrado tiene CLABEs y tokens de portales.`);
  console.log(`  Bórralo cuando termines de usarlo.\n`);
}

main();
