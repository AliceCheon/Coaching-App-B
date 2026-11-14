/* Passo B.16a — le superserie: collega due, collega tre, scollega, sposta,
 * scheda vecchia, Annulla, le 8 settimane, e le regole del vicino. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { cambiaSuperserie, annullaModifica, ultimaAnnullabile, supAttivi } from "../comune/modifiche-b.js";

function settimaneVuote() {
  const s = [];
  for (let i = 0; i < 8; i += 1) s.push({});
  return s;
}

function dati() {
  return {
    sheet: {
      code: "A",
      exercises: [
        { id: "ex-1", name: "Panca", muscle: "Pettorali", order: 1, progression: { weeks: settimaneVuote() } },
        { id: "tex-1", padreId: "ex-1", name: "Drop set", order: 2, progression: { weeks: [] } },
        { id: "ex-2", name: "Rematore", muscle: "Dorsali", order: 3, progression: { weeks: settimaneVuote() } },
        { id: "ex-3", name: "Lat machine", muscle: "Dorsali", order: 4, progression: { weeks: settimaneVuote() } }
      ]
    }
  };
}

const Q = { quando: "2026-11-14T02:00:00Z" };
const rich = (id) => ({ idScheda: "s1", idEsercizio: id, esercizio: "x" });

test("94.1 collega due: stesso campo, una voce sola, la terza riga fuori", () => {
  const esito = cambiaSuperserie(dati(), rich("ex-1"), Q);
  assert.equal(esito.ok, true);
  const e = esito.dati.sheet.exercises;
  assert.equal(e[0].sup, e[2].sup);
  assert.match(e[0].sup, /^ss-/);
  assert.equal(e[3].sup, undefined);
  assert.equal(esito.voce.tipo, "superserie");
  assert.equal(esito.voce.prima.length, 2);
  assert.equal(esito.voce.con, "Rematore");
});

test("94.2 collega tre: premendo sul secondo, una voce sola", () => {
  const primo = cambiaSuperserie(dati(), rich("ex-1"), Q);
  const secondo = cambiaSuperserie(primo.dati, rich("ex-2"), Q);
  assert.equal(secondo.ok, true);
  const e = secondo.dati.sheet.exercises;
  assert.equal(e[0].sup, e[2].sup);
  assert.equal(e[2].sup, e[3].sup);
  assert.equal(secondo.voce.prima.length, 1);
});

test("94.3 scollega sul primo: nessuno resta con il campo", () => {
  const primo = cambiaSuperserie(dati(), rich("ex-1"), Q);
  const via = cambiaSuperserie(primo.dati, rich("ex-1"), Q);
  assert.equal(via.ok, true);
  const e = via.dati.sheet.exercises;
  assert.equal(e[0].sup, undefined);
  assert.equal(e[2].sup, undefined);
  assert.match(via.voce.dopoTesto, /^scollegate/);
});

test("94.4 gruppo di tre, scollega sul primo: gli altri due restano uniti", () => {
  const uno = cambiaSuperserie(dati(), rich("ex-1"), Q);
  const due = cambiaSuperserie(uno.dati, rich("ex-2"), Q);
  const via = cambiaSuperserie(due.dati, rich("ex-1"), Q);
  assert.equal(via.ok, true);
  const e = via.dati.sheet.exercises;
  assert.equal(e[0].sup, undefined);
  assert.equal(e[2].sup, e[3].sup);
  assert.ok(e[2].sup);
});

test("94.5 il vicino salta le figlie tecniche, e su una figlia si rifiuta", () => {
  const esito = cambiaSuperserie(dati(), rich("ex-1"), Q);
  assert.equal(esito.voce.con, "Rematore");
  const figlia = cambiaSuperserie(dati(), rich("tex-1"), Q);
  assert.equal(figlia.ok, false);
});

test("94.6 sull'ultimo esercizio si rifiuta", () => {
  const esito = cambiaSuperserie(dati(), rich("ex-3"), Q);
  assert.equal(esito.ok, false);
  assert.match(esito.motivo, /ultimo/);
});

test("94.7 un Annulla rimette com'era", () => {
  const esito = cambiaSuperserie(dati(), rich("ex-1"), Q);
  const ritorno = annullaModifica(esito.dati, esito.voce, { quando: "2026-11-14T02:01:00Z" });
  assert.equal(ritorno.ok, true);
  const e = ritorno.dati.sheet.exercises;
  assert.equal(e[0].sup, undefined);
  assert.equal(e[2].sup, undefined);
  assert.equal(ritorno.voce.tipo, "annulla-modifica");
  assert.equal(ritorno.voce.annullaDi, esito.voce.idVoce);
  const voce = ultimaAnnullabile([{ dati: esito.voce }]);
  assert.equal(voce && voce.tipo, "superserie");
});

test("94.8 scheda vecchia senza campo: funziona, e le 8 settimane restano", () => {
  const prima = JSON.stringify(dati().sheet.exercises[3].progression.weeks);
  const esito = cambiaSuperserie(dati(), rich("ex-2"), Q);
  assert.equal(esito.ok, true);
  assert.equal(esito.dati.sheet.exercises[2].sup, esito.dati.sheet.exercises[3].sup);
  assert.equal(JSON.stringify(esito.dati.sheet.exercises[3].progression.weeks), prima);
});

test("94.9 spostata una riga: il campo resta, il disegno segue i tratti di fila", () => {
  const esito = cambiaSuperserie(dati(), rich("ex-1"), Q);
  const spostata = JSON.parse(JSON.stringify(esito.dati));
  const r2 = spostata.sheet.exercises[2];
  const r3 = spostata.sheet.exercises[3];
  spostata.sheet.exercises = [spostata.sheet.exercises[0], r3, r2, spostata.sheet.exercises[1]];
  /* Il gruppo ex-1/ex-2 adesso ha un buco: nessun tratto da due in su. */
  assert.deepEqual(supAttivi(spostata.sheet.exercises), {});
  /* Rimessa a posto, il gruppo torna disegnato. */
  const originali = esito.dati.sheet.exercises;
  assert.deepEqual(supAttivi(originali), { "ex-1": true, "ex-2": true });
  /* E le righe tolte o figlie non rompono la fila. */
  const conTolte = JSON.parse(JSON.stringify(esito.dati));
  conTolte.sheet.exercises.splice(1, 0, { id: "x", name: "vecchia", deletedAt: "q", sup: "" });
  assert.deepEqual(supAttivi(conTolte.sheet.exercises), { "ex-1": true, "ex-2": true });
});
