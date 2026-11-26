/* Barbell Diva B — passo 18: «l'accesso che resta».
 *
 * Cosa fa:
 * - ricorda SOLO l'indirizzo dell'ultimo account entrato, per poter scrivere
 *   «Entra come …» invece di un modulo vuoto. Con l'accesso Google non esiste
 *   una password di Barbell Diva e qui non si salva nessuna credenziale: la
 *   sessione vera la tiene l'SDK di Firebase, nelle sue chiavi.
 * - la chiave locale porta il prefisso bd-b.v1. come tutte quelle di B
 *   (comune/tema.js è il custode: una chiave senza prefisso è un errore).
 *
 * Perché non basta: la sessione può cadere davvero (finestra privata, storage
 * bloccato, sessione scaduta). In quel caso la pagina non deve chiedere il
 * login «da zero»: deve dire chi è l'ultima entrata e perché lo sta richiedendo.
 */

import { chiaveBD, salvaChiaveBD, leggiChiaveBD } from "./tema.js";

/* Nome della chiave (il prefisso lo mette chiaveBD). */
export const NOME_CHIAVE = "accesso.email";

/* Un indirizzo plausibile, niente di più: non è una validazione di consegna. */
export function emailValida(valore) {
  const v = String(valore == null ? "" : valore).trim();
  if (v.length < 6 || v.length > 200) return false;
  if (/\s/.test(v)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

/* Salva l'email dell'utente entrato. Ritorna la voce scritta, o null.
 * Non salva uid, nessun token e nessuna password, solo l'indirizzo e quando. */
export function ricordaAccesso(storage, utente, quando, prefisso) {
  const email = String((utente && utente.email) || "").trim();
  if (!storage || !emailValida(email)) return null;
  const voce = { email: email, quando: quando || new Date().toISOString() };
  try {
    salvaChiaveBD(storage, NOME_CHIAVE, JSON.stringify(voce), prefisso);
  } catch (e) {
    return null;
  }
  return voce;
}

/* L'ultima email ricordata, se c'è ed è ancora plausibile. */
export function promemoriaAccesso(storage, prefisso) {
  if (!storage) return null;
  let grezzo = null;
  try {
    grezzo = leggiChiaveBD(storage, NOME_CHIAVE, prefisso);
  } catch (e) {
    return null;
  }
  if (!grezzo) return null;
  let voce = null;
  try {
    voce = JSON.parse(grezzo);
  } catch (e) {
    return null;
  }
  if (!voce || !emailValida(voce.email)) return null;
  return { email: String(voce.email).trim(), quando: String(voce.quando || "") };
}

/* Uscita esplicita: il promemoria sparisce con la sessione. */
export function dimenticaAccesso(storage, prefisso) {
  if (!storage) return false;
  try {
    storage.removeItem(chiaveBD(NOME_CHIAVE, prefisso));
    return true;
  } catch (e) {
    return false;
  }
}

/* Il testo del tasto: dice chi sta per entrare, se lo sappiamo. */
export function testoEntra(promemoria) {
  const email = promemoria && promemoria.email ? String(promemoria.email) : "";
  return email ? "Entra come " + email : "Entra con Google";
}

/* La nota sotto il tasto: cosa fa la pagina, in chiaro, senza promettere
 * niente che il browser non faccia. Tre fatti, tre frasi. */
export function testoNota(fatti) {
  const f = fatti || {};
  if (!f.memoria) {
    return "questo browser non permette di ricordare l'accesso (forse una finestra privata): lo chiederò a ogni apertura";
  }
  if (f.persistenza === "rifiutata") {
    return "questo browser ha rifiutato la sessione che dura: l'accesso lo chiederò a ogni apertura";
  }
  if (f.promemoria && f.promemoria.email) {
    return "ricordo l'accesso su questo dispositivo: la sessione resta finché non esci";
  }
  return "l'accesso resta su questo dispositivo: non lo chiederò a ogni apertura";
}

/* Perché la carta è comparsa nonostante la sessione: la frase da mettere
 * accanto all'errore, così non sembra un guasto senza spiegazione. */
export function testoSpiegazione(fatti) {
  const f = fatti || {};
  if (!f.memoria) return "senza memoria locale la sessione non può restare: entra e la terrai per questa pagina";
  if (f.persistenza === "rifiutata") return "la sessione non può restare su questo browser: entra di nuovo";
  return "";
}
