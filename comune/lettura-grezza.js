/* Barbell Diva B — lettura GREZZA dei documenti (passo 1: conteggi e backup).
 *
 * Perché esiste: `lettura-dati.js` ricostruisce i programmi e scarta ciò che A
 * scarta — giusto per le schermate, sbagliato per una fotografia. Il backup
 * deve contenere i documenti COSÌ COME SONO, id compreso, senza filtri, senza
 * deduplica e senza ricostruzioni: se un giorno si dovesse rimettere a posto
 * qualcosa, si riparte dall'originale, non da una sua interpretazione.
 *
 * Resta una lettura, e resta dentro l'elenco chiuso di `modello-dati.js`:
 * ogni funzione controlla il percorso con `percorsoAmmesso` e lancia
 * `ErrorePercorsoNonAmmesso` per qualunque altra cosa.
 *
 * Fonti nel codice di A (main v148.38, righe già verificate in fase 1):
 *  - sottoraccolta `sessions`, campo `session`: r.6257, r.6365;
 *  - sottoraccolta `nutritionPhotos`, id prefissati: r.5224-5234 (v1),
 *    r.5396-5398 (v2-meta), r.5413-5417 (v2-sheet, v2-exercise, v2-archived);
 *  - la stessa sottoraccolta contiene anche le foto di nutrizione, che NON
 *    vanno lette: per questo si interroga solo per intervallo di id, mai
 *    l'intera collezione (r.5226-5228).
 */

import {
  COLLEZIONE_ATLETI,
  percorsoAmmesso,
  ErrorePercorsoNonAmmesso
} from "./modello-dati.js";

export { ErrorePercorsoNonAmmesso };

/* Intervalli [prefisso, prefisso senza il trattino finale + «.»): in ASCII il
 * carattere subito dopo «-» è «.», quindi l'intervallo contiene esattamente i
 * documenti che cominciano con quel prefisso e nient'altro. Gli intervalli non
 * si sovrappongono: «meta» < «sheet» < «exercise»? No — l'ordine alfabetico non
 * conta, perché ogni intervallo è chiuso in sé. */
export const INTERVALLI_PROGRAMMI = Object.freeze([
  { da: "program-v2-meta-", a: "program-v2-meta." },
  { da: "program-v1-", a: "program-v1." }
]);

export const INTERVALLI_SCHEDE = Object.freeze([
  { da: "program-v2-sheet-", a: "program-v2-sheet." },
  { da: "program-v2-exercise-", a: "program-v2-exercise." },
  { da: "program-v2-archived-", a: "program-v2-archived." }
]);

/* Documenti grezzi di una sottoraccolta, letti un intervallo di id alla volta.
 * Ritorna [{ id, dati }] nell'ordine in cui Firestore li restituisce — per una
 * fotografia l'ordine non è un dato, e non viene «corretto». */
export async function leggiDocumentiGrezzi(db, uid, sottoraccolta, intervalli) {
  const percorso = COLLEZIONE_ATLETI + "/" + uid + "/" + sottoraccolta;
  if (!percorsoAmmesso(percorso, uid)) throw new ErrorePercorsoNonAmmesso(percorso);
  const collezione = db.collection(COLLEZIONE_ATLETI).doc(uid).collection(sottoraccolta);

  // Senza intervalli si legge la sottoraccolta intera: è il caso di `sessions`,
  // che contiene solo sedute. Dove invece vivono anche le foto (nutritionPhotos)
  // si passa SEMPRE dagli intervalli di id, una famiglia di documenti alla volta.
  if (!Array.isArray(intervalli) || !intervalli.length) {
    const tutto = await collezione.get();
    return ((tutto && tutto.docs) || []).map((d) => ({ id: String(d.id || ""), dati: d.data ? d.data() : {} }));
  }

  const visti = Object.create(null);
  const documenti = [];
  for (const intervallo of intervalli) {
    const istantanea = await collezione
      .where("__name__", ">=", intervallo.da)
      .where("__name__", "<", intervallo.a)
      .get();
    const elenco = (istantanea && istantanea.docs) || [];
    elenco.forEach((d) => {
      const id = String(d.id || "");
      if (visti[id]) return;
      visti[id] = true;
      documenti.push({ id, dati: d.data ? d.data() : {} });
    });
  }
  return documenti;
}

/* Programmi: metadati v2 + programmi interi v1. */
export function leggiProgrammiGrezzi(db, uid) {
  return leggiDocumentiGrezzi(db, uid, "nutritionPhotos", INTERVALLI_PROGRAMMI);
}

/* Schede: le schede vere, gli esercizi sciolti delle schede troppo grandi e le
 * schede archiviate. Tre famiglie di documenti, un solo intervallo ciascuna. */
export function leggiSchedeGrezze(db, uid) {
  return leggiDocumentiGrezzi(db, uid, "nutritionPhotos", INTERVALLI_SCHEDE);
}

/* Logbook: TUTTI i documenti della sottoraccolta, anche quelli che A
 * scarterebbe (senza id) — nella fotografia ci stanno, e il conteggio li
 * dichiara a parte. */
export function leggiSeduteGrezze(db, uid) {
  return leggiDocumentiGrezzi(db, uid, "sessions", null);
}
