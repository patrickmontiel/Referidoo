// Fase 1: vendemos SOLO el core — PPR y Vida.
//
// Ocultamos (sin borrar) los tipos de producto no-core (Daños/Auto y GMM) y el
// sistema de premios burbuja, que es Pro y está ligado a Auto/GMM. Los datos,
// las tasas de comisión (COMMISSION_RATES) y el backend siguen intactos: los
// registros históricos con GMM/Auto se siguen mostrando; solo se ocultan las
// opciones seleccionables y las superficies de marketing/UI.
//
// PARA REACTIVAR más adelante:
//   1. Pon SHOW_BUBBLE_REWARDS y SHOW_NON_CORE_PRODUCTS en true.
//   2. Devuelve "Daños/Auto" y "GMM" a VISIBLE_PRODUCT_TYPES.
//   3. Devuelve las opciones de Auto/GMM a VISIBLE_INTERESTS.

// Sistema de premios burbuja (Pro, ligado a Auto/GMM): UI en asesor y cliente.
export const SHOW_BUBBLE_REWARDS: boolean = false;

// Superficies de marketing/precios que mencionan/anuncian los tipos no-core
// (Auto/Daños y GMM): landing pública y tabla de precios.
export const SHOW_NON_CORE_PRODUCTS: boolean = false;

// Tipos de producto que el asesor puede elegir (marcar convertido / interés).
export const VISIBLE_PRODUCT_TYPES = ["PPR", "Vida", "Otro"] as const;

// Intereses que el referido puede elegir en la landing /r/[code].
export const VISIBLE_INTERESTS: { label: string; value: string }[] = [
  { label: "Plan de retiro / ahorro", value: "PPR" },
  { label: "Seguro de vida", value: "Vida" },
  { label: "Aún no sé", value: "" },
];
