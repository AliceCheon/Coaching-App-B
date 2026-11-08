/* tests/57-rec-tut.test.mjs — recupero e TUT scritti dalla tabella (passo 10).
 *
 * Alice, 8/11/2026: Rec e TUT restano testo libero, con una freccetta che
 * offre i valori di sempre; i pulsantini del recupero vanno di 30" fra 30" e 3'.
 * Questi due campi stanno sull'ESERCIZIO, non sulla settimana: cambiarli vale
 * per tutte le settimane.
 *
 * I documenti qui hanno il formato VERO della zona B (id `program-v2-sheet-…`,
 * dentro `programId`, `sheetId` e `sheet`), così la prova non vive in un mondo
 * inventato.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  cambiaRecTempo, annullaModifica, ultimaAnnullabile, differenzeScheda, MARCHIO_B
} from "../comune/modifiche-b.js";
import {
  REC_TENDINA, TUT_TENDINA, secondiRecupero, testoSecondi, passoRecupero
} from "../comune/tut-rec.js";
import { prescrizione } from "../comune/schede-v2.js";

const QUANDO = "2026-11-08T12:00:00.000Z";

/* Il corpo di un documento `program-v2-sheet-…`: `recupero` è il nome che usa
 * A, `tempo` quello che B legge per il TUT. Il secondo esercizio tiene il TUT
 * dentro `prescription`, come capita nei documenti veri. */
function documento() {
  return {
    programId: "p1",
    sheetId: "s1",
    kind: "sheet",
    versione: 3,
    sheet: {
      id: "s1",
      code: "A",
      name: "Spinta",
      exercises: [
        {
          id: "e1", name: "Panca piana", order: 0, recupero: "2'",
          progression: { weeks: [{ sets: 4, reps: "8" }, { sets: 3, reps: "6" }] }
        },
        {
          id: "e2", name: "Lat machine", order: 1, prescription: { tempo: "3-0-1" },
          progression: { weeks: [{ sets: 3, reps: "10" }] }
        },
        {
          id: "e3", name: "Curl manubri", order: 2,
          progression: { weeks: [{ sets: 3, reps: "12" }] }
        }
      ]
    }
  };
}

function cambia(richiesta, dati) {
  return cambiaRecTempo(dati || documento(), richiesta, { quando: QUANDO, uid: "u1" });
}

test("57.1 il recupero si scrive sull'esercizio e vale per tutte le settimane", () => {
  const prima = documento();
  const esito = cambia({ idScheda: "s1", idEsercizio: "e1", campo: "recupero", valore: "1'30\"" });
  assert.equal(esito.ok, true);
  const e1 = esito.dati.sheet.exercises[0];
  assert.equal(e1.recupero, "1'30\"");
  assert.equal(prescrizione(e1).recupero, "1'30\"");
  /* le settimane e gli altri campi non si toccano */
  assert.deepEqual(e1.progression, prima.sheet.exercises[0].progression);
  assert.equal(esito.dati.programId, "p1");
  assert.equal(esito.dati.sheetId, "s1");
  assert.equal(esito.dati.sheet.code, "A");
  assert.equal(esito.dati.sheet.id, "s1");
  assert.equal(esito.dati.versione, 4);
  assert.ok(esito.dati[MARCHIO_B]);
  /* la voce del registro: prima e dopo, senza settimana */
  assert.equal(esito.voce.tipo, "modifica-rec-tut");
  assert.equal(esito.voce.settimana, null);
  assert.equal(esito.voce.campo, "recupero");
  assert.equal(esito.voce.prima, "2'");
  assert.equal(esito.voce.dopo, "1'30\"");
  assert.equal(esito.voce.scheda, "s1");
  assert.equal(esito.voce.idEsercizio, "e1");
  assert.equal(esito.voce.esercizio, "Panca piana");
});

test("57.2 il TUT si scrive dove sta già, senza doppioni", () => {
  const esito = cambia({ idScheda: "s1", idEsercizio: "e2", campo: "tempo", valore: "4-0-1" });
  assert.equal(esito.ok, true);
  const e2 = esito.dati.sheet.exercises[1];
  assert.equal(e2.prescription.tempo, "4-0-1");
  assert.equal(Object.prototype.hasOwnProperty.call(e2, "tempo"), false);
  assert.equal(prescrizione(e2).tempo, "4-0-1");
  assert.equal(esito.voce.prima, "3-0-1");
});

test("57.3 il TUT che non c'era si crea sul campo che B legge", () => {
  const esito = cambia({ idScheda: "s1", idEsercizio: "e3", campo: "tempo", valore: "2-0-2" });
  assert.equal(esito.ok, true);
  assert.equal(esito.dati.sheet.exercises[2].tempo, "2-0-2");
  assert.equal(esito.voce.prima, "");
  assert.equal(esito.voce.dopo, "2-0-2");
});

test("57.4 il recupero resta testo libero, e si può svuotare", () => {
  const frase = "1'30\" e cambio gamba";
  const uno = cambia({ idScheda: "s1", idEsercizio: "e1", campo: "recupero", valore: frase });
  assert.equal(uno.ok, true);
  assert.equal(uno.dati.sheet.exercises[0].recupero, frase);
  const due = cambia({ idScheda: "s1", idEsercizio: "e1", campo: "recupero", valore: "" }, uno.dati);
  assert.equal(due.ok, true);
  assert.equal(due.dopo, "");
  assert.equal(due.voce.prima, frase);
  assert.equal(prescrizione(due.dati.sheet.exercises[0]).recupero, "");
});

test("57.5 si rifiuta quello che non è di questo passo, senza scrivere", () => {
  const lungo = cambia({ idScheda: "s1", idEsercizio: "e1", campo: "recupero", valore: "a".repeat(41) });
  assert.equal(lungo.ok, false);
  const serie = cambia({ idScheda: "s1", idEsercizio: "e1", campo: "serie", valore: "5" });
  assert.equal(serie.ok, false);
  const altro = cambia({ idScheda: "s1", idEsercizio: "zz", campo: "recupero", valore: "1'" });
  assert.equal(altro.ok, false);
  const uguale = cambia({ idScheda: "s1", idEsercizio: "e1", campo: "recupero", valore: "2'" });
  assert.equal(uguale.ok, false);
});

test("57.6 la freccetta ha i valori chiesti e i pulsantini vanno di 30\"", () => {
  /* Alice, 8/11/2026: niente "cambio gamba" e "cambio braccio", in cella solo
   * il numero. Sei voci e basta. */
  const rec = ["30\"", "1'", "1'30\"", "2'", "2'30\"", "3'"];
  assert.deepEqual(Array.from(REC_TENDINA), rec, "il recupero ha sei voci, solo numeri");
  assert.deepEqual(Array.from(TUT_TENDINA), ["2-0-2", "2-1-0", "0-1-2", "3-0-1", "3-1-1", "4-0-1"]);

  assert.equal(secondiRecupero("30\""), 30);
  assert.equal(secondiRecupero("1'"), 60);
  assert.equal(secondiRecupero("1'30\""), 90);
  assert.equal(secondiRecupero("2'"), 120);
  assert.equal(secondiRecupero("1'30\" e cambio gamba"), null);

  assert.equal(passoRecupero("30\"", 30), "1'");
  assert.equal(passoRecupero("1'", 30), "1'30\"");
  assert.equal(passoRecupero("2'30\"", 30), "3'");
  assert.equal(passoRecupero("3'", 30), "");
  assert.equal(passoRecupero("30\"", -30), "");
  assert.equal(passoRecupero("2'", -30), "1'30\"");
  assert.equal(passoRecupero("1'30\" e cambio gamba", 30), "");
  assert.equal(passoRecupero("", 30), "");
  assert.equal(testoSecondi(150), "2'30\"");
});

test("57.7 l'annulla riporta il valore di prima e lascia una voce nuova", () => {
  const uno = cambia({ idScheda: "s1", idEsercizio: "e1", campo: "recupero", valore: "3'" });
  const due = annullaModifica(uno.dati, uno.voce, { quando: "2026-11-08T12:05:00.000Z" });
  assert.equal(due.ok, true);
  assert.equal(due.dati.sheet.exercises[0].recupero, "2'");
  assert.equal(due.voce.tipo, "annulla-modifica");
  assert.equal(due.voce.annullaDi, uno.voce.idVoce);
  assert.equal(due.voce.campo, "recupero");
  assert.equal(due.voce.settimana, null);
});

test("57.8 il registro sa annullare anche il recupero e il TUT", () => {
  const uno = cambia({ idScheda: "s1", idEsercizio: "e1", campo: "recupero", valore: "2'30\"" });
  const ultima = ultimaAnnullabile([{ id: uno.voce.idVoce, dati: uno.voce }]);
  assert.ok(ultima);
  assert.equal(ultima.campo, "recupero");
  const due = cambia({ idScheda: "s1", idEsercizio: "e3", campo: "tempo", valore: "0-1-2" });
  const ultima2 = ultimaAnnullabile([{ id: due.voce.idVoce, dati: due.voce }]);
  assert.ok(ultima2);
  assert.equal(ultima2.campo, "tempo");
});

test("57.9 la Copia vede il recupero cambiato, non dice «identica ad A»", () => {
  const uno = cambia({ idScheda: "s1", idEsercizio: "e1", campo: "recupero", valore: "3'" });
  const diff = differenzeScheda(documento(), uno.dati, 6);
  assert.ok(diff.totale > 0);
  assert.ok(diff.righe.some((r) => r.indexOf("recupero") >= 0), "righe: " + diff.righe.join(" | "));
  const due = cambia({ idScheda: "s1", idEsercizio: "e3", campo: "tempo", valore: "2-0-2" });
  const diff2 = differenzeScheda(documento(), due.dati, 6);
  assert.ok(diff2.righe.some((r) => r.indexOf("TUT") >= 0), "righe: " + diff2.righe.join(" | "));
});
