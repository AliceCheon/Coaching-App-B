/* tests/65-programma-senza-archiviate.test.mjs — la schermata Programma non
 * mostra piu' le schede archiviate (10/11/2026).
 *
 * Alice: nella barra delle linguette c'era «Archiviate N» e in fondo il
 * riquadro «Schede archiviate» con i chip. Le schede archiviate restano nei
 * dati (r.archiviate) ma non si disegnano.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

import { riepilogoProgramma } from "../comune/programma.js";
import { ricostruisciSchede } from "../comune/schede-v2.js";
import { renderProgramma } from "../comune/vista-programma.js";

const meta = {
  id: "prg-arch", name: "Archiviate", status: "active", phase: "Bulk",
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
const scheda = (codice, esercizi) => ({ id: "program-v2-sheet-prg-arch__sh-" + codice, dati: {
  programId: "prg-arch", sheetId: "sh-" + codice, kind: "sheet",
  sheet: { id: "sh-" + codice, code: codice, name: "Giorno " + codice, updatedAt: "2026-11-02T18:12:00.000Z", exercises: esercizi } } });
const docs = [
  scheda("A", [esercizio("rematore_bilanciere", "2-3'", "2-0-1")]),
  scheda("B", [esercizio("lat_machine", "90\"", "3-1-1")])
];
const archiviate = [
  { codice: "Z", numeroEsercizi: 3 },
  { codice: "Y", numeroEsercizi: 4 }
];

function schermo(conArchiviate) {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"g\"></div></body></html>");
  const doc = dom.window.document;
  const r = riepilogoProgramma(meta, [], { schedeV2: ricostruisciSchede(docs), indice: 0, totaleProgrammi: 1, oggi: new Date(Date.UTC(2026, 10, 10)), quante: 8 });
  r.archiviate = conArchiviate ? archiviate.slice() : [];
  r.modifica = { attivo: true, onCambia: () => ({ ok: true }) };
  renderProgramma(doc, doc.querySelector("#g"), { presente: true, numeroSedute: 0 }, r);
  return { dom, doc, r, win: dom.window, g: doc.querySelector("#g") };
}

test("65.1 con le archiviate nei dati non si disegna ne' il riquadro ne' i chip", () => {
  const { g } = schermo(true);
  assert.equal(g.querySelectorAll(".pr-archiviate").length, 0);
  assert.equal(g.querySelectorAll(".pr-chip-arch").length, 0);
  assert.doesNotMatch(g.textContent, /Schede archiviate/);
});

test("65.2 nessuna linguetta dice «Archiviate», e la barretta resta una sola", () => {
  const { doc } = schermo(true);
  const linguette = doc.querySelector(".pr-tabs");
  assert.ok(linguette, "la barra delle linguette c'e'");
  const testi = Array.from(linguette.querySelectorAll(".pr-ntab")).map((b) => b.textContent);
  assert.equal(testi.some((t) => /Archiviate/i.test(t)), false, "nessuna linguetta «Archiviate»");
  assert.equal(linguette.querySelectorAll(".pr-tabs-sep").length, 1, "la barretta e' quella tra schede e letture");
});

test("65.3 le linguette delle schede vere e «Analisi programmazione» ci sono ancora", () => {
  const { doc } = schermo(true);
  const bottoni = Array.from(doc.querySelectorAll(".pr-tabs .pr-ntab"));
  const schedeVere = bottoni.filter((b) => /^Scheda [AB]/.test(b.textContent));
  assert.equal(schedeVere.length, 2, "Scheda A e Scheda B");
  const analisi = bottoni.find((b) => b.textContent === "Analisi programmazione");
  assert.ok(analisi, "«Analisi programmazione» c'e'");
  assert.equal(analisi.classList.contains("pr-ntab-extra"), true);
  assert.equal(doc.querySelectorAll(".pr-pannello").length, 3, "due schede + il pannello delle analisi");
});

test("65.4 «Analisi programmazione» apre ancora il suo pannello", () => {
  const { doc, win } = schermo(true);
  const analisi = Array.from(doc.querySelectorAll(".pr-tabs .pr-ntab")).find((b) => b.textContent === "Analisi programmazione");
  analisi.dispatchEvent(new win.MouseEvent("click", { bubbles: true, cancelable: true }));
  const pannelli = Array.from(doc.querySelectorAll(".pr-pannello"));
  assert.equal(pannelli[2].hidden, false, "il pannello delle analisi si vede");
  assert.equal(pannelli[0].hidden, true, "la scheda A si chiude");
});

test("65.5 la pagina con le archiviate e' identica a quella senza", () => {
  const con = schermo(true).g.innerHTML;
  const senza = schermo(false).g.innerHTML;
  assert.equal(con, senza, "le archiviate non cambiano piu' il disegno del Programma");
});

test("65.6 i dati delle archiviate restano nel riepilogo", () => {
  const { r } = schermo(true);
  assert.equal(r.archiviate.length, 2, "la vista non tocca i dati");
  assert.deepEqual(r.archiviate.map((s) => s.codice), ["Z", "Y"]);
});
