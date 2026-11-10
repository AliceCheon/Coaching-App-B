/* tests/68-frase-archiviate.test.mjs — la frase delle archiviate dice la
 * verita' (10/11/2026, passo 22).
 *
 * Dal passo 19 la schermata Programma non disegna piu' le schede archiviate.
 * Nel ramo «programma senza schede attive» la frase del pr-hint prometteva
 * ancora «si vedono nella tabella qui sotto»: tabella che non c'e'. Da ora la
 * frase conta le archiviate e nega la vista.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

import { riepilogoProgramma } from "../comune/programma.js";
import { ricostruisciSchede } from "../comune/schede-v2.js";
import { renderProgramma } from "../comune/vista-programma.js";

const meta = {
  id: "prg-68", name: "Frase archiviate", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, rotation: ["A", "B"],
  description: "", message: "",
  createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};
const sett = (n, sets, reps, sec) => ({ week: n, sets, reps, rest: { seconds: sec }, type: "normal", note: "", source: "manual" });
const otto = (reps, sec) => Array.from({ length: 8 }, (_, i) => sett(i + 1, 4, reps, sec));
const esercizio = (nome, rec, tut) => ({
  name: nome, muscle: "dorso",
  prescription: { sets: 4, reps: { label: "10" }, recupero: rec, tempo: tut },
  progression: { weeks: otto("10", 180) }
});
const scheda = (codice, esercizi) => ({ id: "program-v2-sheet-prg-68__sh-" + codice, dati: {
  programId: "prg-68", sheetId: "sh-" + codice, kind: "sheet",
  sheet: { id: "sh-" + codice, code: codice, name: "Giorno " + codice, updatedAt: "2026-11-02T18:12:00.000Z", exercises: esercizi } } });
const docs = [
  scheda("A", [esercizio("rematore_bilanciere", "2-3'", "2-0-1")]),
  scheda("B", [esercizio("lat_machine", "90\"", "3-1-1")])
];
const archiviate = [
  { codice: "Z", numeroEsercizi: 3 },
  { codice: "Y", numeroEsercizi: 4 }
];

/* schedeAttive false = il ramo «programma senza schede attive» (r.schede: []),
 * come fa il test 65 con r.archiviate: la vista non tocca i dati. */
function schermo(schedeAttive, quanteArchiviate) {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"g\"></div></body></html>");
  const doc = dom.window.document;
  const r = riepilogoProgramma(meta, [], { schedeV2: ricostruisciSchede(docs), indice: 0, totaleProgrammi: 1, oggi: new Date(Date.UTC(2026, 10, 10)), quante: 8 });
  if (!schedeAttive) r.schede = [];
  r.archiviate = archiviate.slice(0, quanteArchiviate);
  r.modifica = { attivo: true, onCambia: () => ({ ok: true }) };
  renderProgramma(doc, doc.querySelector("#g"), { presente: true, numeroSedute: 0 }, r);
  return { doc, win: dom.window, g: doc.querySelector("#g") };
}

test("68.1 senza schede attive la frase conta le archiviate e nega la vista, non promette la tabella", () => {
  const { g } = schermo(false, 2);
  assert.match(g.textContent, /Schede archiviate di questo programma: 2/);
  assert.match(g.textContent, /restano nei dati, la pagina non le disegna/);
  assert.doesNotMatch(g.textContent, /si vedono nella tabella/);
  assert.doesNotMatch(g.textContent, /tabella qui sotto/);
  assert.equal(g.querySelectorAll(".pr-archiviate").length, 0, "il riquadro resta morto");
  assert.equal(g.querySelectorAll(".pr-chip-arch").length, 0, "i chip restano morti");
});

test("68.2 senza archiviate nel ramo vuoto nessuna frase", () => {
  const { g } = schermo(false, 0);
  assert.doesNotMatch(g.textContent, /Schede archiviate/);
});

test("68.3 con le schede attive la frase non esiste", () => {
  const { g } = schermo(true, 2);
  assert.doesNotMatch(g.textContent, /Schede archiviate/);
});
