// Plantillas de los mensajes de WhatsApp.
//
// Viven aquí para que el texto que el asesor VE en Premios sea exactamente el
// que se ENVÍA. El menú precarga estas plantillas cuando el asesor todavía no
// guardó las suyas, y los dos puntos de envío usan la misma como fallback.
//
// Placeholders: {nombre} {link} {premio} {asesor}

/** El que TU CLIENTE manda a sus conocidos desde su portal. */
export const DEFAULT_CLIENT_SHARE_MESSAGE =
  "Hola, te quiero recomendar algo de corazón.\n\n" +
  "Yo tengo un plan con {asesor} que me ha ayudado a cuidar mi patrimonio y a mi familia. " +
  "Le pedí que te atienda directo, sin compromiso ni venta.\n\n" +
  "Solo échale un ojo aquí: {link}";

/** La bienvenida que ve el REFERIDO nuevo al abrir el link ({nombre} = el cliente que lo refirió). */
export const DEFAULT_REFERRAL_WELCOME_MESSAGE =
  "{nombre} ya tiene un plan de vida y retiro, y cree que a ti también te puede convenir. " +
  "Sin compromiso — solo es información.";

/** El que TÚ (el asesor) le mandas a tu cliente con su link. */
export const DEFAULT_ADVISOR_INVITE_MESSAGE =
  "¡Hola {nombre}! Habla {asesor}.\n\n" +
  "Te tengo algo: por cada amigo o familiar al que le pases tu link y contrate un plan conmigo, " +
  "tú ganas en efectivo, hasta {premio} por persona. Sin costo y sin letra chica.\n\n" +
  "Este es tu link, guárdalo:\n{link}";

export type MessageVars = {
  nombre?: string;
  link?: string;
  premio?: string;
  asesor?: string;
};

/** Sustituye los placeholders. Global: si el asesor repite {nombre}, se cambian todos. */
export function renderMessage(template: string, vars: MessageVars): string {
  return template
    .replace(/\{nombre\}/g, vars.nombre ?? "")
    .replace(/\{link\}/g, vars.link ?? "")
    .replace(/\{premio\}/g, vars.premio ?? "")
    .replace(/\{asesor\}/g, vars.asesor ?? "");
}
