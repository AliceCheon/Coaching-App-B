/* Barbell Diva B — contratto dei dati (fase 0: SOLO LETTURA).
 *
 * B legge i dati dell'app A sotto `barbellDivaAccounts/{uid}`. L'elenco dei
 * percorsi leggibili è CHIUSO: qualunque percorso diverso viene rifiutato con
 * errore esplicito (cintura di sicurezza 2, punto "b" delle regole di fase 0).
 *
 * In A (riferimenti verificati sul codice di main il 2/11/2026):
 *  - il documento radice porta lo stato dentro il campo `state` (vedi il
 *    commento a src/app-main.js:6080 "rootData.state");
 *  - i campi di stato sopra 120000 byte viaggiano in documenti dedicati della
 *    sottoraccolta `stateBlobs` (src/app-main.js, costante CLOUD_BLOB_MIN_BYTES
 *    = 120000, id documento `blob-v1-<campo>`, esclusi meta/profile/migrations);
 *  - le sedute sincronizzate per singola seduta (dalla v148.15) stanno nella
 *    sottoraccolta `sessions`, ciascuna con il campo `session` (src/app-main.js:6365).
 */

export const COLLEZIONE_ATLETI = "barbellDivaAccounts";

/* Percorsi ammessi in fase 0, con la loro fonte di verità nel codice di A. */
export const PERCORSI_LETTURA_FASE0 = [
  {
    tipo: "documento-atleta",
    modello: "barbellDivaAccounts/{uid}",
    fonte: "src/app-main.js di A, r.24 (CLOUD_COLLECTION) e r.6080 (rootData.state)"
  },
  {
    tipo: "sedute-per-seduta",
    modello: "barbellDivaAccounts/{uid}/sessions",
    fonte: "src/app-main.js di A, r.6257 e r.6365 (sincronizzazione v148.15)"
  },
  {
    tipo: "blobbi-stato",
    modello: "barbellDivaAccounts/{uid}/stateBlobs",
    fonte: "src/app-main.js di A, r.5340-5365 (CLOUD_BLOB_MIN_BYTES, blob-v1-<campo>)"
  }
];

/* Sottoraccolte future di B (contratto già deciso dalla coach, nomi italiani).
 * SOLO DICHIARAZIONE: in fase 0 nessun codice scrive nulla, qui o altrove.
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
    super("Percorso non ammesso in fase 0 (sola lettura, elenco chiuso): " + percorso);
    this.name = "ErrorePercorsoNonAmmesso";
    this.percorso = percorso;
  }
}

/* Controlla che il percorso richiesto sia nell'elenco chiuso. */
export function percorsoAmmesso(percorso, uid) {
  const ammessi = PERCORSI_LETTURA_FASE0.map((p) =>
    p.modello.replace("{uid}", uid)
  );
  return ammessi.includes(percorso);
}
