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
import { conDeletedAt } from "./esclusioni.js";

export { ZONA_B, ErroreZonaNonAmmessa };

const AMMESSE = Object.freeze([
  SOTTO_B.programmi,
  SOTTO_B.schede,
  SOTTO_B.esercizi,
  SOTTO_B.sedute,
  SOTTO_B.esclusioni,
  SOTTO_B.registro,
  SOTTO_B.scheletri,
  SOTTO_B.anamnesiLite
]);

/* uid e id ammessi: testo non vuoto, senza barre (niente percorsi dentro). */
function valido(valore) {
  return typeof valore === "string" && valore.length > 0 && valore.indexOf("/") === -1;
}

/* Firestore vero rifiuta qualunque campo o elemento undefined: il finto lo
 * ingoia e le prove non se ne accorgono. Da qui niente undefined esce di
 * casa: diventa null, che e' quello che i lettori del registro sanno leggere. */
export function senzaUndefined(valore) {
  if (valore === undefined) return null;
  if (Array.isArray(valore)) return valore.map((v) => senzaUndefined(v));
  if (valore && typeof valore === "object") {
    const out = {};
    Object.keys(valore).forEach((k) => { out[k] = senzaUndefined(valore[k]); });
    return out;
  }
  return valore;
}

/* Passo 27: Firestore non accetta un array come elemento di un array.
 * Solo sul confine del REGISTRO avvolgiamo gli array interni in una mappa.
 * I documenti scheda e il formato usato da applicazione/Annulla non cambiano.
 * La lettura riconosce esclusivamente la mappa con questa singola chiave;
 * le voci precedenti, prive del marcatore, restano leggibili. */
export function preparaRegistro(valore, dentroArray) {
  if (Array.isArray(valore)) {
    const elementi = valore.map((v) => preparaRegistro(v, true));
    return dentroArray ? { __bdRegistroArrayV1: elementi } : elementi;
  }
  if (valore && typeof valore === "object") {
    const out = {};
    Object.keys(valore).forEach((k) => { out[k] = preparaRegistro(valore[k], false); });
    return out;
  }
  return valore === undefined ? null : valore;
}

export function ripristinaRegistro(valore) {
  if (Array.isArray(valore)) return valore.map(ripristinaRegistro);
  if (valore && typeof valore === "object") {
    const chiavi = Object.keys(valore);
    if (chiavi.length === 1 && chiavi[0] === "__bdRegistroArrayV1" && Array.isArray(valore.__bdRegistroArrayV1)) {
      return valore.__bdRegistroArrayV1.map(ripristinaRegistro);
    }
    const out = {};
    chiavi.forEach((k) => { out[k] = ripristinaRegistro(valore[k]); });
    return out;
  }
  return valore;
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
  return riferimentoB(db, uid, SOTTO_B.registro, id).set(preparaRegistro(dati || {}));
}

/* La fotografia e' il documento radice della zona B (bdB_atleti/{uid}). */
export function scriviFotografia(db, uid, dati) {
  return radiceB(db, uid).set(dati || {});
}

/* ---------- «Patologie o infortuni» (PASSO 14, versione semplice) --------
 * Un documento solo per atleta, con la forma delle altre fotografie singole:
 * `bdB_atleti/{uid}/anamnesi-lite` = { testo, aggiornato, versione }.
 * Si scrive da qui, come tutto il resto della zona B.
 */
export function scriviAnamnesiLite(db, uid, dati) {
  return riferimentoB(db, uid, SOTTO_B.anamnesiLite, uid).set(senzaUndefined(dati || {}));
}

export function leggiAnamnesiLite(db, uid) {
  return riferimentoB(db, uid, SOTTO_B.anamnesiLite, uid)
    .get()
    .then((istantanea) => (istantanea && istantanea.exists ? istantanea.data() || {} : null));
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
      dati: sottoraccolta === SOTTO_B.registro ? ripristinaRegistro(d.data ? d.data() : {}) : (d.data ? d.data() : {})
    })));
}


/* Le esclusioni decise da Alice, in sola lettura: le usano il Logbook e ogni
 * schermata che mostra sedute, cosi' una seduta esclusa non ricompare solo
 * perche' qualcuno legge da A. */
export function leggiEsclusioni(db, uid) {
  return leggiZonaB(db, uid, SOTTO_B.esclusioni).catch(() => []);
}

export function leggiFotografia(db, uid) {
  return radiceB(db, uid)
    .get()
    .then((istantanea) => (istantanea && istantanea.exists ? istantanea.data() || {} : null));
}

/* ---------- Esclusioni decise da Alice (passo 5) ----------
 *
 * Una seduta sbagliata si esclude in B, non in A. Due scritture, entrambe
 * dentro bdB_atleti/{uid}: il documento `esclusioni/{idSeduta}` (la memoria
 * della decisione: data, motivo, quando) e il `deletedAt` sulla copia, cosi'
 * il Logbook di B la salta subito e le copie future la ritrovano esclusa.
 */

export function scriviEsclusione(db, uid, id, dati) {
  return riferimentoB(db, uid, SOTTO_B.esclusioni, id).set(dati || {});
}

/* Marca la copia gia' presente. Se la seduta non e' ancora stata copiata non
 * si inventa niente: basta il documento di esclusione, e la copia futura
 * nascera' gia' con deletedAt. */
export async function marcaEsclusaLaCopia(db, uid, id, quando) {
  const istantanea = await riferimentoB(db, uid, SOTTO_B.sedute, id).get();
  if (!istantanea || !istantanea.exists) return { copia: false, motivo: "seduta non ancora copiata" };
  const dati = (istantanea.data && istantanea.data()) || {};
  return riferimentoB(db, uid, SOTTO_B.sedute, id).set(conDeletedAt(dati, quando)).then(() => ({ copia: true }));
}

/* Le due scritture in un colpo solo: e' quello che chiama la pagina. */
export async function escludiSeduta(db, uid, idSeduta, info) {
  const i = info || {};
  const quando = i.quando ? String(i.quando) : new Date().toISOString();
  const documento = {
    idSeduta: String(idSeduta),
    data: i.data == null ? null : String(i.data),
    scheda: i.scheda == null ? null : String(i.scheda),
    settimana: i.settimana == null ? null : Number(i.settimana),
    richiesta: i.richiesta == null ? null : String(i.richiesta),
    motivo: i.motivo == null ? "esclusa da Alice" : String(i.motivo),
    quando,
    origine: "esclusione-decisa-in-B"
  };
  await riferimentoB(db, uid, SOTTO_B.esclusioni, idSeduta).set(documento);
  const copia = await marcaEsclusaLaCopia(db, uid, idSeduta, quando);
  return { idSeduta: String(idSeduta), quando, copia: copia.copia === true, notaCopia: copia.motivo || null };
}


/* ---------- Una singola scheda (passo 9) ---------------------------------
 * La modifica delle schede passa di qui: si rilegge il documento, si confronta
 * la versione e solo allora si scrive. Cosi' due schede aperte non si
 * sovrascrivono a vicenda e una scrittura vecchia non torna buona.
 */

export class ErroreVersione extends Error {
  constructor(messaggio) {
    super(messaggio);
    this.name = "ErroreVersione";
  }
}

export function leggiSchedaB(db, uid, id) {
  const rif = riferimentoB(db, uid, SOTTO_B.schede, id);
  return rif.get().then((istantanea) => {
    if (!istantanea || !istantanea.exists) return { id: String(id), esiste: false, dati: null };
    return { id: String(id), esiste: true, dati: (istantanea.data && istantanea.data()) || {} };
  });
}

export async function salvaSchedaConVersione(db, uid, id, dati, versioneAttesa) {
  const letto = await leggiSchedaB(db, uid, id);
  if (!letto.esiste) throw new ErroreVersione("la scheda non e' ancora in B: fai prima la copia");
  const sulDisco = Number(letto.dati.versione) || 0;
  const attesa = Number(versioneAttesa) || 0;
  if (sulDisco !== attesa) {
    throw new ErroreVersione("la scheda e' cambiata nel frattempo (versione " + sulDisco +
      " invece di " + attesa + "): non ho scritto niente");
  }
  return riferimentoB(db, uid, SOTTO_B.schede, id).set(senzaUndefined(dati));
}

/* ---------- Scheletri (B.21 commit 2) ------------------------------------
 * Uno scheletro e' la struttura di UNA scheda, senza carichi e senza
 * Logbook: si applichera' a qualunque scheda, quindi NON porta la lettera
 * A/B/C. La versione avanza come per le schede, cosi' due salvataggi sullo
 * stesso scheletro non si sovrascrivono in silenzio.
 */
export function leggiScheletroB(db, uid, id) {
  const rif = riferimentoB(db, uid, SOTTO_B.scheletri, id);
  return rif.get().then((istantanea) => {
    if (!istantanea || !istantanea.exists) return { id: String(id), esiste: false, dati: null };
    return { id: String(id), esiste: true, dati: (istantanea.data && istantanea.data()) || {} };
  });
}

/* L'elenco intero della raccolta: la pagina Scheletri legge da qui. */
export function leggiScheletriB(db, uid) {
  const rif = riferimentoB(db, uid, SOTTO_B.scheletri);
  return rif.get().then((istantanea) => {
    const fuori = [];
    if (!istantanea || typeof istantanea.forEach !== "function") return fuori;
    istantanea.forEach((d) => {
      if (!d) return;
      fuori.push({ id: String(d.id), dati: (d.data && d.data()) || {} });
    });
    return fuori;
  });
}

/* Cancellare e' una scrittura come le altre: se lo scheletro non c'e' piu',
 * si dice, non si finge che sia sparito. */
export async function eliminaScheletroB(db, uid, id) {
  const letto = await leggiScheletroB(db, uid, id);
  if (!letto.esiste) throw new ErroreVersione("lo scheletro non e' piu' in B: niente da eliminare");
  await riferimentoB(db, uid, SOTTO_B.scheletri, id).delete();
  return { id: String(id) };
}

/* ---------- Programmi (B.21 PASSO 2a) ------------------------------------
 * Il programma attivo e' un campo del documento, non una scheda: la scrittura
 * segue la stessa regola delle schede (versione attesa) e aggiunge `versione`,
 * che nella zona B tiene il conto delle scritture di B.
 */
export function leggiProgrammaB(db, uid, id) {
  const rif = riferimentoB(db, uid, SOTTO_B.programmi, id);
  return rif.get().then((istantanea) => {
    if (!istantanea || !istantanea.exists) return { id: String(id), esiste: false, dati: null };
    return { id: String(id), esiste: true, dati: (istantanea.data && istantanea.data()) || {} };
  });
}

export async function salvaProgrammaConVersione(db, uid, id, dati, versioneAttesa) {
  const letto = await leggiProgrammaB(db, uid, id);
  if (!letto.esiste) throw new ErroreVersione("il programma non e' ancora in B: fai prima la copia");
  const sulDisco = Number(letto.dati.versione) || 0;
  const attesa = Number(versioneAttesa) || 0;
  if (sulDisco !== attesa) {
    throw new ErroreVersione("il programma e' cambiato nel frattempo (versione " + sulDisco +
      " invece di " + attesa + "): non ho scritto niente");
  }
  const documento = Object.assign({}, dati, { versione: attesa + 1 });
  await riferimentoB(db, uid, SOTTO_B.programmi, id).set(senzaUndefined(documento));
  return { id: String(id), versione: attesa + 1 };
}

export async function salvaScheletroConVersione(db, uid, id, dati) {
  const letto = await leggiScheletroB(db, uid, id);
  const prima = letto.esiste ? Number(letto.dati.versione) || 0 : 0;
  const versione = prima + 1;
  const documento = Object.assign({}, dati, { versione: versione, aggiornatoIl: new Date().toISOString() });
  await riferimentoB(db, uid, SOTTO_B.scheletri, id).set(senzaUndefined(documento));
  return { id: String(id), versione: versione };
}
