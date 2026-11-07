/* Barbell Diva B — la catena con cui A sceglie le sedute da mostrare.
 *
 * Il caso vero: 129 documenti, 2 con cancellazione logica, 1 vecchia seduta
 * importata (fonte diversa e id piccolo). A mostra 126. Questi test bloccano
 * ogni passo della catena, compreso quello che mi era sfuggito.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { seduteSecondoA } from "../comune/regola-sedute-a.js";
import { contaSedute, confrontoConRadice, righeConteggi } from "../comune/conteggi-copia.js";
import { seduteLogbook } from "../comune/logbook.js";

function seduta(id, extra) {
  return Object.assign(
    { id: id, dateInput: "2026-10-01", sessionCode: "A", savedAt: "2026-10-01T10:00:00.000Z", exercises: [] },
    extra || {}
  );
}
function doc(s) {
  return { id: "doc-" + s.id, dati: { session: s } };
}

/* ---------- 50.1 un solo documento per id ---------- */

test("50.1 lo stesso id due volte diventa una seduta, e il doppione si conta", () => {
  const esito = seduteSecondoA([seduta("s1"), seduta("s1", { dateInput: "2026-10-02" })]);
  assert.equal(esito.secondoA, 1);
  assert.equal(esito.doppioniId, 1);
});

test("50.2 le righe senza id non si buttano: A le tiene", () => {
  const esito = seduteSecondoA([seduta("s1"), seduta("")]);
  assert.equal(esito.distintePerId, 2);
  assert.equal(esito.secondoA, 2);
});

/* ---------- 50.3 la vista di A: fonte App oppure id recente ---------- */

test("50.3 una seduta con fonte diversa e id piccolo resta fuori dalla vista di A", () => {
  const esito = seduteSecondoA([
    seduta("1700000000000"),
    seduta("7", { source: "Alice Logbook", dateInput: "2025-03-04" })
  ]);
  assert.equal(esito.secondoA, 1);
  assert.equal(esito.escluseVista.length, 1);
  assert.equal(esito.escluseVista[0].id, "7");
  assert.equal(esito.escluseVista[0].fonte, "Alice Logbook");
  assert.equal(esito.escluseVista[0].data, "2025-03-04");
});

test("50.4 la fonte vale piu' dell'id: una seduta App con id piccolo si mostra", () => {
  const esito = seduteSecondoA([seduta("7", { source: "App" })]);
  assert.equal(esito.secondoA, 1);
  assert.equal(esito.escluseVista.length, 0);
});

test("50.5 senza campo fonte la seduta e' App, come in A", () => {
  const esito = seduteSecondoA([seduta("7")]);
  assert.equal(esito.secondoA, 1);
});

/* ---------- 50.6 il caso vero: 129 documenti, A ne mostra 126 ---------- */

function scenarioReale() {
  const righe = [];
  for (let i = 1; i <= 126; i += 1) {
    const giorno = String((i % 28) + 1).padStart(2, "0");
    righe.push(doc(seduta("s" + i, { dateInput: "2026-09-" + giorno })));
  }
  righe.push(doc(seduta("s900", { dateInput: "2026-08-01", deletedAt: "2026-09-01T09:00:00.000Z" })));
  righe.push(doc(seduta("s901", { dateInput: "2026-08-02", deletedAt: "2026-09-02T09:00:00.000Z" })));
  righe.push(doc(seduta("12", { source: "Alice Logbook", dateInput: "2025-03-04" })));
  return righe;
}

test("50.6 da 129 documenti A mostra 126: 2 cancellate e 1 fuori dalla vista", () => {
  const righe = scenarioReale();
  assert.equal(righe.length, 129);
  const c = contaSedute(righe);
  assert.equal(c.documenti, 129);
  assert.equal(c.valide, 129);
  assert.equal(c.cancellate, 2);
  assert.equal(c.valideNonCancellate, 127);
  assert.equal(c.secondoA, 126);
  assert.equal(c.escluseVista.length, 1);
});

test("50.7 il confronto usa il numero di A, e con 126 coincide", () => {
  const conteggi = { sedute: contaSedute(scenarioReale()), programmi: { distinti: 0 } };
  const c = confrontoConRadice(conteggi, { sessionCount: 126 });
  assert.equal(c.sessioni.dichiarato, 126);
  assert.equal(c.sessioni.letto, 126);
  assert.equal(c.sessioni.lettoGrezzo, 129);
  assert.equal(c.sessioni.cancellate, 2);
  assert.equal(c.sessioni.coincide, true, "con la catena di A il conto deve tornare");
});

test("50.8 la riga a schermo dichiara ogni passo, non solo il totale", () => {
  const tabella = righeConteggi({
    schede: { schede: 0, esercizi: 0, archiviate: 0, programmi: 0 },
    programmi: { distinti: 0, documentiMeta: 0, documentiV1: 0, fuoriElenco: 0 },
    sedute: contaSedute(scenarioReale()),
    radice: {},
    confronto: {}
  });
  const logbook = tabella.find((r) => r.cosa === "Logbook");
  assert.match(logbook.lettoOra, /sedute valide \(non cancellate\): 127/);
  assert.match(logbook.lettoOra, /valide secondo A: 126/);
  assert.match(logbook.lettoOra, /di cui con cancellazione logica: 2/);
  assert.match(logbook.lettoOra, /non ammesse alla vista di A: 1/);
});

test("50.9 il Logbook di B mostra 126 sedute, come A", () => {
  const esito = seduteLogbook(scenarioReale().map((d) => d.dati.session), {});
  assert.equal(esito.sedute.length, 126);
  assert.equal(esito.dichiarazioni.cancellate, 2);
  assert.equal(esito.sedute.some((s) => s.id === "12"), false, "la seduta fuori vista non compare");
});
