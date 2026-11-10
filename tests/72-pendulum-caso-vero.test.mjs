/* tests/72-pendulum-caso-vero.test.mjs — il caso Pendulum focus glutei
 * (Alice, 11/11/2026). La voce Custom copia la S1 su tutte le 8 settimane
 * (il sintomo visto sul sito: 1 serie ovunque), e l'Annulla deve riportare
 * ESATTAMENTE la progressione di prima, S1 compresa ("Test 12rm, poi 1x8").
 *
 *  72.1  la voce Custom sul caso Pendulum: le 8 settimane diventano la S1
 *        (il danno di Alice, ricostruito);
 *  72.2  l'annullamento riporta la progressione vera, cella per cella;
 *  72.3  una voce nata con i valori di prima VUOTI (il difetto corretto nel
 *        passo 23) viene RIFIUTATA: nessun ripristino puo' cancellare.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { applicaProgressione, annullaModifica } from "../comune/modifiche-b.js";
import { PROG } from "../comune/progressioni-b.js";

const Q = { quando: "2026-11-11T00:00:00.000Z", uid: "alice-prova" };

/* La progressione vera di Pendulum focus glutei, dettata da Alice il 11/11. */
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

function documento() {
  return {
    id: "program-v2-sheet-p1__A", programId: "p1", sheetId: "sh-A", versione: 5,
    sheet: {
      id: "sh-A", code: "A", name: "Glutei",
      exercises: [
        { id: "ex-1", name: "Pendulum focus glutei", muscle: "glutei", order: 0,
          prescription: { sets: 3, reps: "10" },
          progression: { weeks: PENDULUM.map((c, i) => sett(i + 1, Number(c[0]), c[1])) } }
      ]
    }
  };
}

const richiesta = (id) => ({ idScheda: "sh-A", idEsercizio: "ex-1", esercizio: "Pendulum focus glutei", campo: "progressione", progressione: id });

/* La voce di PROG che copia la S1 su tutte le settimane: si CERCA, non si
 * indovina l'id. */
function trovoCustom() {
  return PROG.map((v) => v[0]).find((id) => {
    const esito = applicaProgressione(documento(), richiesta(id), Q);
    if (!esito.ok) return false;
    const settimane = esito.dati.sheet.exercises[0].progression.weeks;
    return settimane.every((w) => String(w.sets) === "1" && String(w.reps) === "Test 12rm, poi 1x8");
  });
}

let ultimaVoce = null;
let datiDopo = null;

test("72.1 la voce Custom sul caso Pendulum: le 8 settimane diventano la S1", async () => {
  const idCustom = trovoCustom();
  assert.ok(idCustom, "nessuna voce di PROG copia la S1 su tutte le settimane");
  const esito = applicaProgressione(documento(), richiesta(idCustom), Q);
  assert.equal(esito.ok, true, esito.motivo || "la progressione si applica");
  const settimane = esito.dati.sheet.exercises[0].progression.weeks;
  for (let k = 0; k < 8; k += 1) {
    assert.equal(String(settimane[k].sets), "1", "S" + (k + 1) + ": il danno di Alice, 1 serie su tutte");
    assert.equal(String(settimane[k].reps), "Test 12rm, poi 1x8", "S" + (k + 1) + ": la S1 copiata su tutte");
  }
  ultimaVoce = esito.voce;
  datiDopo = esito.dati;
});

test("72.2 l'annullamento riporta la progressione vera, cella per cella", async () => {
  assert.ok(ultimaVoce && datiDopo, "la 72.1 ha preparato il caso");
  assert.deepEqual(ultimaVoce.prima, PENDULUM.map((c) => [String(c[0]), c[1]]), "i valori di prima sono le coppie vere, non vuote");
  const esito = annullaModifica(datiDopo, ultimaVoce, Q);
  assert.equal(esito.ok, true, esito.motivo || "l'annullo si applica");
  const attese = documento().sheet.exercises[0].progression.weeks;
  const tornate = esito.dati.sheet.exercises[0].progression.weeks;
  assert.equal(JSON.stringify(tornate), JSON.stringify(attese), "le 8 settimane tornano ESATTAMENTE quelle di Pendulum (S1 compresa)");
  assert.equal(esito.voce.tipo, "annulla-modifica", "la voce nuova e' un annulla-modifica");
  assert.equal(esito.voce.annullaDi, ultimaVoce.idVoce, "la voce nuova cita quella annullata");
});

test("72.3 una voce con i valori di prima VUOTI viene rifiutata, non cancella", async () => {
  assert.ok(ultimaVoce && datiDopo, "la 72.1 ha preparato il caso");
  const voceRotta = Object.assign({}, ultimaVoce, {
    idVoce: "mod-rotta-di-prova",
    prima: PENDULUM.map(() => ["", ""])
  });
  const esito = annullaModifica(datiDopo, voceRotta, Q);
  assert.equal(esito.ok, false, "il ripristino della voce senza valori di prima si rifiuta");
  assert.match(esito.motivo, /non porta i valori di prima/);
  const restate = datiDopo.sheet.exercises[0].progression.weeks;
  assert.equal(String(restate[0].sets), "1", "le settimane restano com'erano: niente cancellazioni");
});
