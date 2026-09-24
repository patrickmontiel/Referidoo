import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

// Cifrado del respaldo diario.
//
// El respaldo se manda por correo como adjunto y contiene la base completa:
// CLABE de los referidos, teléfonos y correos de clientes, y los `accessToken`
// de los portales — con un token cualquiera se abre el portal de ese cliente,
// donde se ve su CLABE. Mandarlo en claro convierte una bandeja de entrada
// comprometida en una filtración de datos bancarios.
//
// Formato del archivo: MAGIC | salt(16) | iv(12) | tag(16) | ciphertext
// AES-256-GCM (cifra y autentica: un archivo alterado falla al descifrar).
// La llave se deriva de la passphrase con scrypt y un salt aleatorio por
// archivo, así que dos respaldos del mismo día no dan el mismo resultado.

const MAGIC = Buffer.from("REFBK1\0\0"); // 8 bytes, para detectar el formato
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;
const SCRYPT_COST = 16384; // N=2^14: ~100ms, suficiente contra fuerza bruta offline

function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return scryptSync(passphrase, salt, KEY_LEN, { N: SCRYPT_COST, r: 8, p: 1 });
}

/** Cifra el respaldo. Devuelve el archivo binario listo para adjuntar. */
export function encryptBackup(plaintext: string, passphrase: string): Buffer {
  if (!passphrase) throw new Error("encryptBackup: falta la passphrase");
  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(passphrase, salt), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([MAGIC, salt, iv, cipher.getAuthTag(), ciphertext]);
}

/** Descifra un respaldo. Lanza si la passphrase es incorrecta o el archivo fue alterado. */
export function decryptBackup(file: Buffer, passphrase: string): string {
  if (!passphrase) throw new Error("decryptBackup: falta la passphrase");
  if (file.length < MAGIC.length + SALT_LEN + IV_LEN + TAG_LEN) {
    throw new Error("Archivo de respaldo truncado o con formato desconocido");
  }
  if (!file.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error("No parece un respaldo cifrado de Referidoo (falta la cabecera)");
  }
  let o = MAGIC.length;
  const salt = file.subarray(o, (o += SALT_LEN));
  const iv = file.subarray(o, (o += IV_LEN));
  const tag = file.subarray(o, (o += TAG_LEN));
  const ciphertext = file.subarray(o);

  const decipher = createDecipheriv("aes-256-gcm", deriveKey(passphrase, salt), iv);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    // GCM no distingue "llave mala" de "archivo alterado": ambos fallan el tag.
    throw new Error("No se pudo descifrar: passphrase incorrecta o archivo alterado");
  }
}
