/* Barbell Diva B — contratto dei dati (SOLA LETTURA, fase 1).
 *
 * B legge i dati dell'app A sotto `barbellDivaAccounts/{uid}`. L'elenco dei
 * percorsi leggibili è CHIUSO: qualunque percorso diverso viene rifiutato con
 * errore esplicito (cintura di sicurezza 2).
 *
 * FASE 1 — cambio di fonte deciso con la coach il 2/11/2026, dopo verifica sul
 * codice di A (main, v148.38):
 *
 *  - SEDUTE. Non vivono più in `state.training.sessions`: A azzera quel campo a
 *    ogni salvataggio (r.5888: `sessions: []`) e le sincronizza una per una
 *    nella sottoraccolta `sessions` (r.6257 accesso, r.6365 campo `session`).
 *    La radice conserva solo il CONTEGGIO in `sessionCount` (r.5937), che B
 *    mostra come controllo. La vecchia lettura da `state.training.sessions`
 *    dava sempre 0: non è più una fonte.
 *
 *  - PROGRAMMI. Non vivono più in `state.programs`: A li toglie dal payload
 *    della radice (r.5854) e li salva nella sottoraccolta `nutritionPhotos`
 *    (riuso della sottoraccolta privata già autorizzata dalle regole, r.5224-
 *    5230) con id prefissati:
 *      program-v1-…            programma intero (formato vecchio)
 *      program-v2-meta-…       metadati del programma (formato attuale)
 *      program-v2-sheet-…      una scheda
 *      program-v2-exercise-…   un esercizio di una scheda troppo grande
 *      program-v2-archived-…   una scheda archiviata
 *    (r.5232-5234, r.5396-5417). B legge SOLO i metadati, con una query per
 *    intervallo di id: MAI l'intera sottoraccolta, che contiene anche le foto
 *    di nutrizione (r.5226-5228: «i documenti programma […] vengono ignorati
 *    dal lettore delle foto», e viceversa).
 */

export const COLLEZIONE_ATLETI = "barbellDivaAccounts";

/* Percorsi ammessi, con la loro fonte di verità nel codice di A. */
export const PERCORSI_LETTURA = [
  {
    tipo: "documento-atleta",
    modello: "barbellDivaAccounts/{uid}",
    fonte: "src/app-main.js di A, r.24 (CLOUD_COLLECTION), r.6080 (rootData.state), r.5937 (sessionCount di primo livello), r.5932-5935 (programCount e programIds di primo livello)"
  },
  {
    tipo: "sedute-per-seduta",
    modello: "barbellDivaAccounts/{uid}/sessions",
    fonte: "src/app-main.js di A, r.6257 (collezione), r.6365 (campo session), r.5581 (si scartano i documenti senza id)"
  },
  {
    tipo: "blobbi-stato",
    modello: "barbellDivaAccounts/{uid}/stateBlobs",
    fonte: "src/app-main.js di A, r.5340-5365 (CLOUD_BLOB_MIN_BYTES, blob-v1-<campo>)"
  },
  {
    tipo: "programmi-metadati",
    modello: "barbellDivaAccounts/{uid}/nutritionPhotos",
    filtro: "solo id compresi in [program-v1-, program-v1.) e [program-v2-meta-, program-v2-meta.); mai l'intera sottoraccolta. In più, come A: si tengono solo i programId elencati in programIds (r.5591, r.5600) e il v1 di un programma già presente in v2 viene scartato (r.5636-5639)",
    fonte: "src/app-main.js di A, r.5224-5234 (collezione e id v1), r.5396-5398 (id v2 dei metadati), r.5413-5417 (schede archiviate), r.5586-5642 (ricostruzione dei programmi)"
  }
];

/* Intervalli di id per i documenti-programma. In ASCII il carattere subito
 * dopo «-» è «.»: [prefisso, prefisso senza l'ultimo «-» + «.») contiene
 * esattamente gli id che cominciano con quel prefisso, e nient'altro.
 * Le foto di nutrizione non hanno questi prefissi: restano fuori dalla query. */
export const INTERVALLI_PROGRAMMI = Object.freeze([
  { da: "program-v2-meta-", a: "program-v2-meta." },
  { da: "program-v1-", a: "program-v1." }
]);

/* Sottoraccolte future di B (contratto già deciso dalla coach, nomi italiani).
 * SOLO DICHIARAZIONE: il codice di B non scrive nulla, qui o altrove.
 * Servono a fissare il contratto per le fasi successive (≥ 1). */
export const SCRITTURE_FUTURE = Object.freeze([
  { nome: "checkin-giornaliero", idDocumento: "AAAA-MM-GG", fase: "da 1" },
  { nome: "quiz-mangiato", idDocumento: "AAAA-MM-GG-THmmss", fase: "da 1" },
  { nome: "checkin-settimanale", idDocumento: "AAAA-MM-GG", fase: "da 1" },
  { nome: "pesate", idDocumento: "AAAA-MM-GG", fase: "da 1" },
  { nome: "passi", idDocumento: "AAAA-MM-GG", fase: "da 1" },
  { nome: "sonno", idDocumento: "AAAA-MM-GG", fase: "da 1" },
  { nome: "ciclo", idDocumento: "AAAA-MM-GG", fase: "da 1" },
  { nome: "circonferenze", idDocumento: "AAAA-MM-GG", fase: "da 1" },
  { nome: "pliche", idDocumento: "AAAA-MM-GG", fase: "da 1" },
  { nome: "integratori", idDocumento: "elenco-corrente", fase: "da 1" },
  { nome: "integratori-assunti", idDocumento: "AAAA-MM-GG", fase: "da 1" },
  { nome: "anamnesi", idDocumento: "AAAA-MM-GG", fase: "da 1" },
  { nome: "dati-atleta", idDocumento: "corrente", fase: "da 1" },
  { nome: "limitazioni", idDocumento: "AAAA-MM-GG", fase: "da 1" },
  { nome: "feedback-sedute", idDocumento: "id-seduta", fase: "da 1" },
  { nome: "alimentazione", idDocumento: "AAAA-MM-GG", fase: "da 1" }
]);

/* Errore esplicito per qualunque percorso fuori dall'elenco chiuso. */
export class ErrorePercorsoNonAmmesso extends Error {
  constructor(percorso) {
    super("Percorso non ammesso (sola lettura, elenco chiuso): " + percorso);
    this.name = "ErrorePercorsoNonAmmesso";
    this.percorso = percorso;
  }
}

/* Controlla che il percorso richiesto sia nell'elenco chiuso. */
export function percorsoAmmesso(percorso, uid) {
  const ammessi = PERCORSI_LETTURA.map((p) => p.modello.replace("{uid}", uid));
  return ammessi.includes(percorso);
}

/* ---------- ZONA B (passo 4): la casa di B, separata dai dati di A ---------- */

/* Il nome della raccolta radice di B: scritto QUI una volta sola. Ogni
 * percorso di scrittura nasce da questo (guardia 47). Le raccolte di A
 * (barbellDivaAccounts, nutritionPhotos, sessions) restano di sola lettura. */
export const ZONA_B = "bdB_atleti";

/* Sottoraccolte di B: elenco chiuso, nomi italiani. */
export const SOTTO_B = Object.freeze({
  programmi: "programmi",
  schede: "schede",
  esercizi: "esercizi",
  sedute: "sedute",
  registro: "registro"
});

/* Errore esplicito per qualunque scrittura fuori dalla zona B. */
export class ErroreZonaNonAmmessa extends Error {
  constructor(percorso) {
    super("Percorso fuori dalla zona B (si scrive solo in " + ZONA_B + "): " + percorso);
    this.name = "ErroreZonaNonAmmessa";
    this.percorso = percorso;
  }
}

/* Percorso testuale della zona B (per test e schermate). La scrittura vera
 * passa da radiceB() in scritture-b.js. */
export function percorsoB(uid, sottoraccolta, id) {
  const parti = [ZONA_B, String(uid || "")];
  if (sottoraccolta) parti.push(String(sottoraccolta));
  if (id) parti.push(String(id));
  return parti.join("/");
}
