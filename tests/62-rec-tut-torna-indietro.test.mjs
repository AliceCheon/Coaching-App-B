/* Passo 15 — Rec e TUT: il valore torna indietro (9/11/2026).
 *
 * Alice, dal sito pubblicato su e5332ca, con la prova dal registro Firebase
 * (voce `mod-2026-11-09T13-30-00-388Z`, esercizio «Pendulum focus glutei»,
 * prima vuoto, dopo «2-1-0», versione 15 -> 16): la scrittura RIESCE, il dato
 * nuovo e' nel database, ma la cella torna a mostrarne uno vecchio.
 *
 * Qui si prova la catena vera, senza browser: i documenti come li lascia la
 * copia da A, la modifica con `cambiaRecTempo`, la rilettura con
 * `ricostruisciSchede` (la stessa che fa la pagina). Le due cause che questa
 * prova inchioda:
 *
 *  1. lo stesso esercizio arriva DUE volte: una dentro il documento-scheda e
 *     una nei documenti «esercizio sciolto» (le schede grandi si spezzano
 *     cosi'). La tabella disegna due righe con lo stesso id: la modifica va
 *     sulla prima, la riga che si guarda e' l'altra, che resta vecchia. E' il
 *     «dopo qualche secondo torna com'era» e anche il «+ premuto piu' volte
 *     non applica tutte le pressioni»: ogni pressione riparte dal valore
 *     vecchio che si vede.
 *
 *  2. lo stesso esercizio porta piu' campi di recupero (dentro `prescription`
 *     e fuori, piu' il `rec` della singola settimana). Oggi la scrittura ne
 *     tocca UNO solo: gli altri restano col valore vecchio, e basta che la
 *     lettura ne preferisca un altro perche' la modifica sparisca.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { ricostruisciSchede, prescrizione } from "../comune/schede-v2.js";
import { cambiaRecTempo } from "../comune/modifiche-b.js";
import { passoRecupero } from "../comune/tut-rec.js";

/* ---- il documento vero, nella forma che lascia la copia da A ------------- */

const ID_ESERCIZIO = "exercise-5b54db15-a9ab-46dc-a";
const NOME = "Pendulum_focus_glutei";
const ID_SCHEDA = "program-v2-sheet-prg-intensita__sh-A";

const settimana = (n, rec) => ({
  week: n, sets: 4, reps: "10", rest: { seconds: 120 }, rec: rec || "", type: "normal", note: "", source: "manual"
});
const settimane = () => [settimana(1, "2'"), settimana(2, "2'")];

/* L'esercizio come sta DENTRO la scheda: TUT vuoto, recupero scritto in due
 * punti (dentro `prescription` e fuori), piu' un `rec` nella settimana. */
function esercizioNellaScheda() {
  return {
    id: ID_ESERCIZIO,
    name: NOME,
    muscle: "glutei",
    order: 3,
    recupero: "2'",                        /* campo di recupero anche fuori */
    prescription: { sets: 4, reps: "10", rest: "2-3'", tempo: "" },
    progression: { weeks: settimane() }
  };
}

const documento = () => ({
  id: ID_SCHEDA,
  dati: {
    programId: "prg-intensita",
    sheetId: "sh-A",
    kind: "sheet",
    versione: 15,
    sheet: { id: "sh-A", code: "A", name: "Importata", exercises: [esercizioNellaScheda()] }
  }
});

/* La stessa scheda «splittata»: l'esercizio arriva anche come documento
 * sciolto, con i valori vecchi. E' cosi' che A salva le schede troppo grandi. */
function documentoSciolto() {
  const e = esercizioNellaScheda();
  return {
    id: "program-v2-exercise-prg-intensita__sh-A__" + ID_ESERCIZIO,
    dati: {
      programId: "prg-intensita",
      sheetId: "sh-A",
      kind: "exercise",
      exercise: { id: e.id, name: e.name, muscle: e.muscle, order: e.order, prescription: { sets: 4, reps: "10", rest: "2-3'", tempo: "" } }
    }
  };
}

const schede = (elenco) => ricostruisciSchede(elenco).perProgramma["prg-intensita"].schede[0];
const righeDi = (scheda, id) => scheda.esercizi.filter((e) => e.id === id);

/* ---- 1. lo stesso esercizio non deve comparire due volte --------------- */

test("62.1 una scheda con l'esercizio anche in un documento sciolto disegna UNA riga", () => {
  const scheda = schede([documento(), documentoSciolto()]);
  const righe = righeDi(scheda, ID_ESERCIZIO);
  assert.equal(righe.length, 1,
    "l'esercizio compare " + righe.length + " volte nella tabella: la modifica puo' finire sulla riga che non si guarda");
});

/* ---- 2. modifico il TUT, rileggo e ridisegno: la cella mostra il nuovo -- */

test("62.2 TUT da vuoto a 2-1-0: rileggendo il documento la cella mostra 2-1-0", () => {
  const prima = documento();
  const esito = cambiaRecTempo(prima.dati, { idScheda: prima.id, idEsercizio: ID_ESERCIZIO, esercizio: NOME, campo: "tempo", valore: "2-1-0" }, { quando: "2026-11-09T13:30:00.388Z" });
  assert.equal(esito.ok, true, "la scrittura e' stata rifiutata: " + esito.motivo);
  assert.equal(esito.voce.prima, "", "il valore di prima non e' vuoto: " + esito.voce.prima);
  assert.equal(esito.voce.dopo, "2-1-0");

  /* la rilettura come la fa la pagina: dal documento scritto, con la stessa
   * ricostruzione, documento sciolto compreso */
  const scheda = schede([{ id: prima.id, dati: esito.dati }, documentoSciolto()]);
  const righe = righeDi(scheda, ID_ESERCIZIO);
  assert.equal(righe.length, 1, "dopo la modifica le righe dell'esercizio sono " + righe.length);
  assert.equal(righe[0].prescrizione.tempo, "2-1-0",
    "la cella mostra il TUT vecchio: " + JSON.stringify(righe[0].prescrizione.tempo));
});

/* ---- 3. Rec: tutti i campi esistenti portano il valore nuovo ------------ */

test("62.3 cambiando il Rec, nessun campo di recupero resta col valore vecchio", () => {
  const prima = documento();
  const esito = cambiaRecTempo(prima.dati, { idScheda: prima.id, idEsercizio: ID_ESERCIZIO, esercizio: NOME, campo: "recupero", valore: "1'30\"" }, { quando: "2026-11-09T13:31:00.000Z" });
  assert.equal(esito.ok, true, "la scrittura e' stata rifiutata: " + esito.motivo);

  const e = esito.dati.sheet.exercises[0];
  assert.equal(e.prescription.rest, "1'30\"", "il recupero dentro prescription e' rimasto vecchio: " + e.prescription.rest);
  assert.equal(e.recupero, "1'30\"", "il recupero fuori da prescription e' rimasto vecchio: " + e.recupero);
  /* il rec della singola settimana e' un'eccezione sua: non si tocca */
  assert.equal(e.progression.weeks[0].rec, "2'", "il rec della settimana e' stato cambiato");
  /* e la lettura, qualunque campo preferisca, deve vedere il valore nuovo */
  assert.equal(prescrizione(e).recupero, "1'30\"");
});

/* ---- 4. tre pressioni di + di fila: tutte applicate, in ordine ---------- */

test("62.4 tre + di fila da 30\": tre scritture, versione 15 -> 18, valore finale 2'", () => {
  let dati = documento().dati;
  const dopo = [];
  let attuale = prescrizione(dati.sheet.exercises[0]).recupero; /* 2-3' non e' un tempo: si parte dal valore vero */
  assert.equal(attuale, "2-3'");
  /* il primo + non si muove (intervallo, non tempo): si parte da un valore semplice */
  dati = cambiaRecTempo(dati, { idScheda: ID_SCHEDA, idEsercizio: ID_ESERCIZIO, esercizio: NOME, campo: "recupero", valore: "30\"" }, { quando: "2026-11-09T13:32:00.000Z" }).dati;
  attuale = "30\"";
  for (let i = 0; i < 3; i += 1) {
    const nuovo = passoRecupero(attuale, 30);
    assert.ok(nuovo, "il passo si e' fermato a " + attuale);
    const esito = cambiaRecTempo(dati, { idScheda: ID_SCHEDA, idEsercizio: ID_ESERCIZIO, esercizio: NOME, campo: "recupero", valore: nuovo }, { quando: "2026-11-09T13:3" + (3 + i) + ":00.000Z" });
    assert.equal(esito.ok, true, "pressione " + (i + 1) + " rifiutata: " + esito.motivo);
    dati = esito.dati;
    dopo.push(esito.voce.dopo);
    attuale = nuovo;
  }
  assert.deepEqual(dopo, ["1'", "1'30\"", "2'"], "l'ordine delle pressioni non e' quello giusto: " + JSON.stringify(dopo));
  assert.equal(Number(dati.versione), 16 + 3, "la versione non e' avanzata di tre: " + dati.versione);
  assert.equal(prescrizione(dati.sheet.exercises[0]).recupero, "2'");
  assert.equal(dati.sheet.exercises[0].progression.weeks[1].rec, "2'", "il rec della settimana e' stato toccato");
});
