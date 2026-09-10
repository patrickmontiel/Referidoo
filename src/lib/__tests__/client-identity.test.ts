import { describe, it, expect } from "vitest";
import {
  normalizeClientPhone,
  normalizeClientEmail,
  classifyImportRows,
  summarizeClassification,
  type ExistingClientLite,
} from "@/lib/client-identity";

describe("normalización de identidad", () => {
  it("teléfono: ignora formato, lada y +52 (compara últimos 10 dígitos)", () => {
    expect(normalizeClientPhone("55 1234 5678")).toBe("5512345678");
    expect(normalizeClientPhone("+52 55 1234 5678")).toBe("5512345678");
    expect(normalizeClientPhone("(55) 1234-5678")).toBe("5512345678");
    // Las tres formas son la MISMA persona.
    expect(normalizeClientPhone("+525512345678")).toBe(normalizeClientPhone("55 1234 5678"));
  });

  it("teléfono: vacío/sin dígitos → null", () => {
    expect(normalizeClientPhone(null)).toBeNull();
    expect(normalizeClientPhone("")).toBeNull();
    expect(normalizeClientPhone("sin datos")).toBeNull();
  });

  it("email: trim + lowercase", () => {
    expect(normalizeClientEmail("  Ana@Ejemplo.COM ")).toBe("ana@ejemplo.com");
    expect(normalizeClientEmail("")).toBeNull();
    expect(normalizeClientEmail(null)).toBeNull();
  });
});

const existing: ExistingClientLite[] = [
  { id: "c1", name: "Ana López", normalizedPhone: "5512345678", normalizedEmail: "ana@ejemplo.com" },
  { id: "c2", name: "Luis Pérez", normalizedPhone: "5599998888", normalizedEmail: "luis@ejemplo.com" },
];

describe("classifyImportRows", () => {
  it("CASE A — mismo teléfono (otro formato) → YA_EXISTE, no duplica", () => {
    const [r] = classifyImportRows([{ name: "Ana L.", phone: "+52 55 1234 5678" }], existing);
    expect(r.status).toBe("YA_EXISTE");
    expect(r.matchedClientId).toBe("c1");
  });

  it("CASE B — mismo email pero teléfono distinto → POSIBLE_DUPLICADO (no auto-merge)", () => {
    const [r] = classifyImportRows([{ name: "Ana", email: "ANA@ejemplo.com", phone: "5500000000" }], existing);
    expect(r.status).toBe("POSIBLE_DUPLICADO");
    expect(r.matchedClientId).toBe("c1");
  });

  it("CASE C — sin match → NUEVO", () => {
    const [r] = classifyImportRows([{ name: "Nuevo Cliente", phone: "5511112222" }], existing);
    expect(r.status).toBe("NUEVO");
  });

  it("CASE D — sin teléfono ni correo → NO_CONTACTABLE", () => {
    const [r] = classifyImportRows([{ name: "Sin Datos" }], existing);
    expect(r.status).toBe("NO_CONTACTABLE");
  });

  it("sin nombre → FALTA_DATO", () => {
    const [r] = classifyImportRows([{ name: "   ", phone: "5511112222" }], existing);
    expect(r.status).toBe("FALTA_DATO");
  });

  it("deduplica DENTRO del mismo archivo (mismo teléfono dos veces)", () => {
    const rows = classifyImportRows(
      [
        { name: "Repetido A", phone: "5533334444" },
        { name: "Repetido B", phone: "55 3333 4444" },
      ],
      existing
    );
    expect(rows[0].status).toBe("NUEVO");
    expect(rows[1].status).toBe("YA_EXISTE"); // no crea una segunda fila
  });

  it("REIMPORT idempotente: reimportar la cartera existente no produce NINGÚN nuevo", () => {
    const sameFile = [
      { name: "Ana López", phone: "5512345678", email: "ana@ejemplo.com" },
      { name: "Luis Pérez", phone: "5599998888", email: "luis@ejemplo.com" },
    ];
    const rows = classifyImportRows(sameFile, existing);
    expect(rows.every((r) => r.status === "YA_EXISTE")).toBe(true);
    expect(summarizeClassification(rows).nuevos).toBe(0);
  });

  it("resumen del preview cuadra con el ejemplo del brief", () => {
    const rows = classifyImportRows(
      [
        { name: "Ana López", phone: "5512345678" }, // ya existe
        { name: "Nuevo 1", phone: "5510000001" },
        { name: "Nuevo 2", phone: "5510000002" },
        { name: "Dup", email: "luis@ejemplo.com", phone: "5510000003" }, // posible duplicado
        { name: "Sin canal" }, // no contactable
        { name: "" }, // falta dato
      ],
      existing
    );
    const s = summarizeClassification(rows);
    expect(s.total).toBe(6);
    expect(s.yaExisten).toBe(1);
    expect(s.nuevos).toBe(2);
    expect(s.posiblesDuplicados).toBe(1);
    expect(s.noContactables).toBe(1);
    expect(s.faltaDato).toBe(1);
  });

  it("NO fusiona entre asesores: la cartera de otro asesor no entra en `existing`", () => {
    // `existing` siempre se consulta filtrando por advisorId, así que un mismo
    // humano en la cartera de OTRO asesor no aparece aquí → se crea como nuevo.
    const otroAsesor: ExistingClientLite[] = [];
    const [r] = classifyImportRows([{ name: "Ana López", phone: "5512345678" }], otroAsesor);
    expect(r.status).toBe("NUEVO");
  });
});
