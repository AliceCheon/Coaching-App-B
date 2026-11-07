/* Barbell Diva B — l'UNICO modulo che scrive (passo 4).
 *
 * Regola secca: si scrive SOLO dentro `bdB_atleti/{uid}`, la zona di B.
 * Il nome della zona sta in modello-dati.js (ZONA_B), una volta sola; qui non
 * compare mai il nome di una raccolta di A, e nessuna funzione accetta un
 * percorso gia' pronto: si passano uid, sottoraccolta e id, e il percorso lo
 * costruisce `riferimentoB`. La guardia tests/47-scritture-zona-b.test.mjs
 * fallisce se una sola scrittura nasce altrove.
 *
 * Perche' il recinto sta qui e non nelle regole Firestore: le regole sono del
 * progetto e non distinguono le due app. Oggi sono una riga sola
 * (`allow read, write: if request.auth != null`) e consentono anche la
 * scrittura sui dati di A. Il "no" a B non puo' stare li' senza dire "no"
 * anche ad A: sta nel codice e nella suite, e questo e' un rischio residuo
 * dichiarato, non nascosto.
 */
import { ZONA_B, SOTTO_B, ErroreZonaNonAmmessa } from "./modello-dati.js";

export { ZONA_B, ErroreZonaNonAmmessa };

const AMMESSE = Object.freeze([
  SOTTO_B.programmi,
  SOTTO_B.schede,
  SOTTO_B.esercizi,
  SOTTO_B.sedute,
  SOTTO_B.registro
]);

/* uid e id ammessi: testo non vuoto, senza barre (niente percorsi dentro). */
function valido(valore) {
  return typeof valore === "string" && valore.length > 0 && valore.indexOf("/") === -1;
}

/* Radice della zona B: `bdB_atleti/{uid}`. */
export function radiceB(db, uid) {
  if (!db || typeof db.collection !== "function") throw new ErroreZonaNonAmmessa("db mancante");
  if (!valido(uid)) throw new ErroreZonaNonAmmessa(ZONA_B + "/" + String(uid));
  return db.collection(ZONA_B).doc(uid);
}

/* L'UNICO punto in cui nasce un riferimento scrivibile. */
function riferimentoB(db, uid, sottoraccolta, id) {
  if (AMMESSE.indexOf(sottoraccolta) === -1) {
    throw new ErroreZonaNonAmmessa(ZONA_B + " · sottoraccolta " + String(sottoraccolta));
  }
  if (!valido(id)) throw new ErroreZonaNonAmmessa(ZONA_B + " · id " + String(id));
  return radiceB(db, uid).collection(sottoraccolta).doc(id);
}

/* ---------- Scritture: una funzione per famiglia, stesso id di A ---------- */

export function copiaProgramma(db, uid, id, dati) {
  return riferimentoB(db, uid, SOTTO_B.programmi, id).set(dati || {});
}

export function copiaScheda(db, uid, id, dati) {
  return riferimentoB(db, uid, SOTTO_B.schede, id).set(dati || {});
}

export function copiaEsercizio(db, uid, id, dati) {
  return riferimentoB(db, uid, SOTTO_B.esercizi, id).set(dati || {});
}

export function copiaSeduta(db, uid, id, dati) {
  return riferimentoB(db, uid, SOTTO_B.sedute, id).set(dati || {});
}

export function scriviVoceRegistro(db, uid, id, dati) {
  return riferimentoB(db, uid, SOTTO_B.registro, id).set(dati || {});
}

/* La fotografia e' il documento radice della zona B (bdB_atleti/{uid}). */
export function scriviFotografia(db, uid, dati) {
  return radiceB(db, uid).set(dati || {});
}

/* ---------- Letture della zona B (per il confronto finale) ---------- */

export function leggiZonaB(db, uid, sottoraccolta) {
  if (AMMESSE.indexOf(sottoraccolta) === -1) {
    throw new ErroreZonaNonAmmessa(ZONA_B + " · sottoraccolta " + String(sottoraccolta));
  }
  return radiceB(db, uid)
    .collection(sottoraccolta)
    .get()
    .then((istantanea) => ((istantanea && istantanea.docs) || []).map((d) => ({
      id: String(d.id || ""),
      dati: d.data ? d.data() : {}
    })));
}

export function leggiFotografia(db, uid) {
  return radiceB(db, uid)
    .get()
    .then((istantanea) => (istantanea && istantanea.exists ? istantanea.data() || {} : null));
}
