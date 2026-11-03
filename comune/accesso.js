/* Barbell Diva B — accesso con Google (fase 0).
 *
 * Come A (FIREBASE-LOGIN.md di A, r.47-49): popup su desktop, redirect su
 * mobile. Se il popup viene bloccato, si ricade sul redirect (lezione di A:
 * su alcuni ambienti il popup fallisce in silenzio). Nessuna credenziale tocca
 * i file: la sessione resta nel browser, nelle chiavi dell'SDK.
 *
 * L'unico ascoltatore di B è onAuthStateChanged (stato di sessione): le
 * letture dei dati NON hanno ascoltatori (vedi lettura-dati.js).
 */

export function eMobile(navigatore = (typeof navigator !== "undefined" ? navigator : null)) {
  if (!navigatore || !navigatore.userAgent) return false;
  return /Android|iPhone|iPad|iPod|Mobile|webOS/i.test(navigatore.userAgent);
}

/* Codici di errore che giustificano il ricado sul redirect. */
const CODICI_POPUP_BLOCCATO = ["auth/popup-blocked", "auth/operation-not-supported-in-this-environment", "auth/cancelled-popup-request"];

export async function entraConGoogle(sdk, auth, opzioni = {}) {
  const provider = new sdk.auth.GoogleAuthProvider();
  const forzaRedirect = opzioni.forzaRedirect === true || (opzioni.mobile === true);
  if (forzaRedirect) {
    await auth.signInWithRedirect(provider);
    return { via: "redirect" };
  }
  try {
    const risultato = await auth.signInWithPopup(provider);
    return { via: "popup", utente: risultato.user || null };
  } catch (errore) {
    const codice = errore && errore.code ? String(errore.code) : "";
    if (CODICI_POPUP_BLOCCATO.includes(codice)) {
      await auth.signInWithRedirect(provider);
      return { via: "redirect", causa: codice };
    }
    throw errore;
  }
}

export function esci(auth) {
  return auth.signOut();
}

/* Registra l'ascolto dello stato di sessione (unico ascoltatore di B). */
export function ascoltaStato(auth, callback) {
  return auth.onAuthStateChanged(callback);
}
