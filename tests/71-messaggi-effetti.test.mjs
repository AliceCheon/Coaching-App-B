/* tests/71-messaggi-effetti.test.mjs — i messaggi di Alice e la misura dei
 * danni (passo 23/24, 10/11/2026).
 *
 *  71.1-71.4  il messaggio dell'esito: le progressioni dicono "applicata alle
 *             8 settimane · Annulla per annullare", la riga tolta dice come
 *             rimetterla, le celle restano a "salvato alle...";
 *  71.5       le 21 progressioni di riga toccano SOLO serie e ripetizioni
 *             delle 8 settimane: recupero, TUT, nota, RIR, riposo, tipo e
 *             fonte della settimana restano identici, gli altri esercizi pure;
 *  71.6       le 13 voci di scheda: la stessa misura, riga per riga.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { PROG, PRG } from "../comune/progressioni-b.js";
import { applicaProgressione, applicaProgressioneScheda, cancellaEsercizio } from "../comune/modifiche-b.js";
import { testoEsito } from "../desktop/app-v31.js";

const sett = (n, sets, reps) => ({
  week: n, sets, reps, rest: { seconds: 90 }, type: "normal", note: "fermo al petto", rir: "2", source: "coach"
});
const otto = (s, r) => [sett(1, s, r), sett(2, s, r), sett(3, s, r), sett(4, s, r), sett(5, s, r), sett(6, s, r), sett(7, s, r), sett(8, s, r)];

function documento() {
  return {
    id: "program-v2-sheet-p1__A", programId: "p1", sheetId: "sh-A", versione: 5,
    sheet: {
      id: "sh-A", code: "A", name: "Dorsali",
      exercises: [
        { id: "ex-1", name: "Pulley_basso", muscle: "dorso", order: 0,
          prescription: { sets: 4, reps: "10", recupero: "90 sec", tempo: "2-0-1" },
          progression: { weeks: otto(4, "10") } },
        { id: "ex-2", name: "Curl_bilanciere", muscle: "bicipiti", order: 1,
          prescription: { sets: 3, reps: "10", recupero: "60 sec" },
          progression: { weeks: otto(3, "10") } }
      ]
    }
  };
}

const opz = { quando: "2026-11-10T20:00:00.000Z", uid: "alice-prova" };

/* Le coppie attuali di un esercizio, per vedere se la voce cambierebbe qualcosa. */
function coppieDi(esercizio) {
  return (esercizio.progression.weeks || []).map((w) => [String(w.sets), String(w.reps)]);
}

test("71.1 il messaggio della progressione di riga e' quello di Alice", () => {
  const testo = testoEsito(
    { campo: "progressione", progressione: "linear" },
    { ok: true, voce: { nomeProgressione: "Custom", codice: "A" }, peso: { radice: 1, scheda: 1 } }
  );
  assert.equal(testo, "progressione \u00abCustom\u00bb applicata alle 8 settimane \u00b7 Annulla per annullare");
});

test("71.2 il messaggio della progressione di scheda", () => {
  const testo = testoEsito(
    { campo: "progressione-scheda", progressione: "prog-all" },
    { ok: true, voce: { nomeProgressione: "Adattamento", codice: "A" }, peso: { radice: 1, scheda: 1 } }
  );
  assert.equal(testo, "progressione \u00abAdattamento\u00bb applicata alle 8 settimane di tutte le righe \u00b7 Annulla per annullare");
});

test("71.3 il messaggio della riga tolta dice come rimetterla", () => {
  const testo = testoEsito({ campo: "riga" }, { ok: true, voce: { codice: "A" }, peso: { radice: 1, scheda: 1 } });
  assert.equal(testo, "riga tolta \u00b7 Annulla per rimetterla");
});

test("71.4 le celle restano a \u00absalvato alle...\u00bb", () => {
  const testo = testoEsito(
    { campo: "recupero", valore: "45 sec" },
    { ok: true, voce: { codice: "A", campo: "recupero", esercizio: "Pulley basso", dopoTesto: "45 sec" }, peso: { radice: 10, scheda: 20 } }
  );
  assert.match(testo, /^salvato alle \d\d:\d\d/);
  assert.match(testo, /peso radice 10 B/);
});

test("71.5 le 21 progressioni di riga toccano SOLO serie e ripetizioni delle 8 settimane", () => {
  let cambiate = 0;
  for (const voce of PROG) {
    const dati = documento();
    const esito = applicaProgressione(dati, { idScheda: "sh-A", idEsercizio: "ex-1", esercizio: "Pulley basso", campo: "progressione", progressione: voce[0] }, opz);
    if (!esito.ok) {
      assert.match(esito.motivo, /non cambia nessuna cella/, "una voce rifiutata deve dirlo: " + voce[1]);
      continue;
    }
    cambiate += 1;
    const nuovo = esito.dati.sheet.exercises[0];
    assert.deepEqual(nuovo.prescription, dati.sheet.exercises[0].prescription, voce[1] + ": la prescrizione (rec, TUT) e' intatta");
    for (let w = 0; w < 8; w += 1) {
      const prima = dati.sheet.exercises[0].progression.weeks[w];
      const dopo = nuovo.progression.weeks[w];
      for (const chiave of Object.keys(prima)) {
        if (chiave === "sets" || chiave === "reps") continue;
        assert.deepEqual(dopo[chiave], prima[chiave], voce[1] + ": la settimana " + (w + 1) + " ha cambiato " + chiave);
      }

      assert.equal(dopo.sets === undefined, false);
      assert.equal(dopo.reps === undefined, false);
    }
    const altro = esito.dati.sheet.exercises[1];
    assert.deepEqual(altro, dati.sheet.exercises[1], voce[1] + ": l'altro esercizio e' intatto");
    assert.equal(esito.dati.versione, 6, "versione +1");
    assert.ok(esito.dati.modificatoInB, "marchio di B");
    for (const c of esito.voce.prima.concat(esito.voce.dopo)) {
      assert.equal(c.length, 2);
      assert.equal(c[0] === undefined, false, "niente undefined nelle coppie");
      assert.equal(c[1] === undefined, false);
    }
  }
  assert.ok(cambiate > 10, "le voci che cambiano davvero sono la maggioranza: " + cambiate);
});

test("71.6 le 13 voci di scheda toccano SOLO serie e ripetizioni, riga per riga", () => {
  let cambiate = 0;
  for (const voce of PRG) {
    const dati = documento();
    const esito = applicaProgressioneScheda(dati, { idScheda: "sh-A", campo: "progressione-scheda", progressione: voce.id }, opz);
    if (!esito.ok) {
      assert.match(esito.motivo, /non cambia nessuna cella/, "una voce rifiutata deve dirlo: " + voce.n);
      continue;
    }
    cambiate += 1;
    assert.equal(esito.voce.righe.length, 2, voce.n + ": una voce sola con tutte le righe");
    for (let e = 0; e < 2; e += 1) {
      const prima = dati.sheet.exercises[e];
      const dopo = esito.dati.sheet.exercises[e];
      assert.deepEqual(dopo.prescription, prima.prescription, voce.n + ": la prescrizione dell'esercizio " + (e + 1) + " e' intatta");
      assert.deepEqual(dopo.muscle, prima.muscle);
      for (let w = 0; w < 8; w += 1) {
        const primaW = prima.progression.weeks[w];
        const dopoW = dopo.progression.weeks[w];
        for (const chiave of Object.keys(primaW)) {
          if (chiave === "sets" || chiave === "reps") continue;
          assert.deepEqual(dopoW[chiave], primaW[chiave], voce.n + ": esercizio " + (e + 1) + " settimana " + (w + 1) + " ha cambiato " + chiave);
        }
      }
    }
  }
  assert.ok(cambiate > 5, "le voci che cambiano davvero: " + cambiate);
});
