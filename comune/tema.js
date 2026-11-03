/* Barbell Diva B — tema (scuro di default, chiaro "Lavender Diva 2026") e
 * custodia delle chiavi locali.
 *
 * Regole:
 * - data-theme va impostato su <html> E su <body> (regola fissa del progetto);
 * - i colori vivono nei token CSS dei file HTML: qui solo logica;
 * - ogni chiave scritta da B comincia con il prefisso `bd-b.v1.`; scrivere in
 *   chiavi dell'app A (la chiave di stato dell'app A) è VIETATO e lancia un errore
 *   (cintura di sicurezza 2, punto "d").
 */

export const PREFISSO_FISSO = "bd-b.v1.";
export const TEMA_VALIDI = ["dark", "light"];
export const TEMA_PREDEFINITO = "dark";

/* Costruisce una chiave con prefisso riservato. Rifiuta chiavi straniere. */
export function chiaveBD(nome, prefisso = PREFISSO_FISSO) {
  if (typeof nome !== "string" || nome.length === 0) {
    throw new Error("Nome chiave mancante");
  }
  if (nome.startsWith(prefisso)) return nome;
  if (nome.includes("alice-method-" + "app")) {
    throw new Error("Vieta: le chiavi dell'app A non si toccano mai");
  }
  return prefisso + nome;
}

/* Salva SOLO con prefisso: nessuna via d'uscita per chiavi senza prefisso. */
export function salvaChiaveBD(storage, nome, valore, prefisso = PREFISSO_FISSO) {
  storage.setItem(chiaveBD(nome, prefisso), String(valore));
}

export function leggiChiaveBD(storage, nome, prefisso = PREFISSO_FISSO) {
  return storage.getItem(chiaveBD(nome, prefisso));
}

/* Applica il tema a <html> e <body>. Ritorna il tema applicato. */
export function applicaTema(doc, tema, storage = null, prefisso = PREFISSO_FISSO) {
  const nome = TEMA_VALIDI.includes(tema) ? tema : TEMA_PREDEFINITO;
  if (doc.documentElement) doc.documentElement.setAttribute("data-theme", nome);
  if (doc.body) doc.body.setAttribute("data-theme", nome);
  if (storage) salvaChiaveBD(storage, "tema", nome, prefisso);
  return nome;
}

export function temaSalvato(storage, prefisso = PREFISSO_FISSO) {
  const v = storage ? storage.getItem(chiaveBD("tema", prefisso)) : null;
  return TEMA_VALIDI.includes(v) ? v : TEMA_PREDEFINITO;
}

/* Inverte il tema e lo salva. Ritorna il nuovo tema. */
export function alternaTema(doc, storage) {
  const attuale = doc.documentElement.getAttribute("data-theme") || TEMA_PREDEFINITO;
  const nuovo = attuale === "dark" ? "light" : "dark";
  return applicaTema(doc, nuovo, storage);
}
