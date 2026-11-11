/* tests/73-ripetizioni-testo-libero.test.mjs — passo 25 (Alice, 11/11/2026).
 *
 * "le ripetizioni si scrivono come 8 oppure 8-10": l'app rifiutava le celle a
 * mano con "10-x", "10-8-x", "Test 12rm, poi 1x8", mentre nelle altre schede
 * quegli stessi valori ci sono gia' e non danno fastidio. Qui si prova che il
 * testo vero passa, che arriva nel documento come l'ha scritto Alice, e che
 * resta rifiutato solo cio' che romperebbe la riga.
 *
 *  73.1  "10-x" su una settimana: accettato, scritto nel documento, voce nel
 *        registro; serie e altre settimane non si toccano;
 *  73.2  la progressione vera di Pendulum focus glutei, settimana per settimana,
 *        riporta il documento ESATTAMENTE a quella dettata da Alice (spazi
 *        compresi);
 *  73.3  "10-8-x", "10-x-x", "3x8", "8 (ced)" passano; il testo oltre 40
 *        caratteri viene rifiutato senza scrivere niente; un a capo diventa
 *        uno spazio (una riga sola, niente testo spezzato) e un carattere di
 *        controllo vero viene rifiutato;
 *  73.4  le serie restano numeriche: "tre" viene rifiutato.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { cambiaSerieRipetizioni } from "../comune/modifiche-b.js";

/* La progressione vera di Pendulum focus glutei, dettata da Alice l'11/11. */
const PENDULUM = [
  ["1", "Test 12rm, poi 1x8"],
  ["2", "10-x"],
  ["3", "10-8-x"],
  ["2", "10"],
  ["2", "10-x"],
  ["3", "10-x-x"],
  ["3", "10-8-x"],
  ["2", "10"]
];

const sett = (n, sets, reps) => ({ week: n, sets, reps, rest: { seconds: 90 }, type: "normal", note: "", rir: "2", source: "coach" });

/* Il documento com'e' dopo il danno: la S1 su tutte le 8 settimane. */
function documento() {
  return {
    id: "program-v2-sheet-p1__A", programId: "p1", sheetId: "sh-A", versione: 5,
    sheet: {
      id: "sh-A", code: "A", name: "Glutei",
      exercises: [
        { id: "ex-1", name: "Pendulum focus glutei", muscle: "glutei", order: 0,
          prescription: { sets: 3, reps: "10" },
          progression: { weeks: PENDULUM.map((c, i) => sett(i + 1, 1, "Test 12rm, poi 1x8")) } }
      ]
    }
  };
}

const richiesta = (campo, settimana, valore) => ({
  idScheda: "sh-A", idEsercizio: "ex-1", esercizio: "Pendulum focus glutei",
  campo, settimana, valore
});
const opzioni = () => ({ quando: "2026-11-11T15:00:00.000Z", uid: "alice-prova" });
const settimana = (dati, k) => dati.sheet.exercises[0].progression.weeks[k];

test("73.1 «10-x» si scrive: accettato, nel documento, con la voce del registro", () => {
  const esito = cambiaSerieRipetizioni(documento(), richiesta("ripetizioni", 2, "10-x"), opzioni());
  assert.equal(esito.ok, true, esito.motivo || "10-x deve passare");
  assert.equal(settimana(esito.dati, 1).reps, "10-x");
  /* scrivere le ripetizioni non tocca le serie (qui restano quelle del danno) */
  assert.equal(String(settimana(esito.dati, 1).sets), "1");
  assert.ok(esito.voce, "la voce del registro c'e'");
  assert.equal(esito.voce.tipo, "modifica-serie-ripetizioni");
  /* le altre settimane non si toccano */
  assert.equal(settimana(esito.dati, 0).reps, "Test 12rm, poi 1x8");
  assert.equal(settimana(esito.dati, 7).reps, "Test 12rm, poi 1x8");
});

test("73.2 Pendulum: la progressione vera torna nel documento, cella per cella", () => {
  let dati = documento();
  /* la S1 e' gia' quella giusta (il danno aveva copiato lei su tutte) */
  for (let k = 2; k <= 8; k += 1) {
    const coppia = PENDULUM[k - 1];
    const serie = cambiaSerieRipetizioni(dati, richiesta("serie", k, coppia[0]), opzioni());
    assert.equal(serie.ok, true, "serie S" + k + ": " + (serie.motivo || ""));
    dati = serie.dati;
    const reps = cambiaSerieRipetizioni(dati, richiesta("ripetizioni", k, coppia[1]), opzioni());
    assert.equal(reps.ok, true, "ripetizioni S" + k + " («" + coppia[1] + "»): " + (reps.motivo || ""));
    dati = reps.dati;
  }
  const settimane = dati.sheet.exercises[0].progression.weeks;
  assert.equal(settimane.length, 8);
  PENDULUM.forEach((coppia, i) => {
    assert.equal(String(settimane[i].sets), coppia[0], "S" + (i + 1) + " serie");
    assert.equal(settimane[i].reps, coppia[1], "S" + (i + 1) + " ripetizioni");
  });
  /* gli spazi di «Test 12rm, poi 1x8» sono quelli veri, non incollati */
  assert.equal(settimane[0].reps, "Test 12rm, poi 1x8");
  /* il resto della settimana resta com'era */
  assert.equal(settimane[3].rest.seconds, 90);
  assert.equal(settimane[3].rir, "2");
  assert.equal(settimane[3].source, "coach");
});

test("73.3 i testi veri passano, il troppo lungo no, l'a capo diventa uno spazio", () => {
  for (const valore of ["10-8-x", "10-x-x", "8-10", "6", "12/10", "3x8", "8 (ced)"]) {
    const esito = cambiaSerieRipetizioni(documento(), richiesta("ripetizioni", 3, valore), opzioni());
    assert.equal(esito.ok, true, "«" + valore + "» deve passare: " + (esito.motivo || ""));
    assert.equal(settimana(esito.dati, 2).reps, valore);
  }

  const lunga = "una ripetizione descritta con troppe parole davvero";
  const r1 = cambiaSerieRipetizioni(documento(), richiesta("ripetizioni", 3, lunga), opzioni());
  assert.equal(r1.ok, false, "oltre 40 caratteri si rifiuta");
  assert.equal(r1.dati, undefined, "nessun dato scritto quando si rifiuta");

  const aCapo = cambiaSerieRipetizioni(documento(), richiesta("ripetizioni", 3, "10-x\ndi nuovo"), opzioni());
  assert.equal(aCapo.ok, true, aCapo.motivo || "");
  assert.equal(settimana(aCapo.dati, 2).reps, "10-x di nuovo", "l'a capo diventa uno spazio");

  const controllo = cambiaSerieRipetizioni(documento(), richiesta("ripetizioni", 3, "10-x\u0007x"), opzioni());
  assert.equal(controllo.ok, false, "un carattere di controllo viene rifiutato");
  assert.match(controllo.motivo, /una riga sola/);
});

test("73.4 le serie restano numeriche: «tre» viene rifiutato, «4» passa", () => {
  const male = cambiaSerieRipetizioni(documento(), richiesta("serie", 4, "tre"), opzioni());
  assert.equal(male.ok, false);
  assert.match(male.motivo, /numero/);
  const bene = cambiaSerieRipetizioni(documento(), richiesta("serie", 4, "4"), opzioni());
  assert.equal(bene.ok, true, bene.motivo || "");
  assert.equal(String(settimana(bene.dati, 3).sets), "4");
});
