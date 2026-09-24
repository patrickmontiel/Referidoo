import { describe, it, expect } from "vitest";
import { encryptBackup, decryptBackup } from "@/lib/backup-crypto";

const SECRETO = JSON.stringify({
  clients: [{ name: "Ana", accessToken: "tok_abc", phone: "5512345678" }],
  referrals: [{ leadName: "Beto", clabe: "012180012345678901" }],
});

describe("backup-crypto", () => {
  it("lo que se cifra se recupera idéntico", () => {
    const file = encryptBackup(SECRETO, "passphrase-larga-de-prueba");
    expect(decryptBackup(file, "passphrase-larga-de-prueba")).toBe(SECRETO);
  });

  it("el archivo cifrado NO contiene los datos en claro", () => {
    const file = encryptBackup(SECRETO, "passphrase-larga-de-prueba");
    const crudo = file.toString("latin1");
    // Lo que realmente importa que no se filtre.
    expect(crudo).not.toContain("clabe");
    expect(crudo).not.toContain("012180012345678901");
    expect(crudo).not.toContain("tok_abc");
    expect(crudo).not.toContain("5512345678");
    expect(crudo).not.toContain("Ana");
  });

  it("una passphrase incorrecta falla con un error claro, no con basura", () => {
    const file = encryptBackup(SECRETO, "la-correcta");
    expect(() => decryptBackup(file, "la-incorrecta")).toThrow(/passphrase incorrecta o archivo alterado/);
  });

  it("detecta un archivo alterado (AES-GCM autentica)", () => {
    const file = encryptBackup(SECRETO, "passphrase-larga-de-prueba");
    file[file.length - 1] ^= 0xff; // muevo un byte del ciphertext
    expect(() => decryptBackup(file, "passphrase-larga-de-prueba")).toThrow(/alterado/);
  });

  it("rechaza un archivo que no es un respaldo nuestro", () => {
    expect(() => decryptBackup(Buffer.from("solo un json cualquiera aqui dentro"), "x")).toThrow(
      /cabecera|truncado/
    );
  });

  it("rechaza un archivo truncado", () => {
    const file = encryptBackup(SECRETO, "x-passphrase");
    expect(() => decryptBackup(file.subarray(0, 20), "x-passphrase")).toThrow(/truncado/);
  });

  it("dos respaldos del mismo contenido dan archivos distintos (salt e iv aleatorios)", () => {
    const a = encryptBackup(SECRETO, "misma-passphrase");
    const b = encryptBackup(SECRETO, "misma-passphrase");
    expect(a.equals(b)).toBe(false);
    // Y ambos descifran igual.
    expect(decryptBackup(a, "misma-passphrase")).toBe(decryptBackup(b, "misma-passphrase"));
  });

  it("exige passphrase en ambos sentidos", () => {
    expect(() => encryptBackup(SECRETO, "")).toThrow(/falta la passphrase/);
    expect(() => decryptBackup(encryptBackup(SECRETO, "x"), "")).toThrow(/falta la passphrase/);
  });
});
