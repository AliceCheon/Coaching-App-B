/* Passo B.16b — la zebra conta il gruppo come UNA unita' e le righe del
 * gruppo prendono il loro fondo (z-gruppo), nei due temi. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { riepilogoProgramma } from "../comune/programma.js";
import { ricostruisciSchede } from "../comune/schede-v2.js";
import { renderProgramma } from "../comune/vista-programma.js";

const meta = {
  id: "prg-intensita", name: "Intensità ottobre-dicembre", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, rotation: ["A", "B", "C", "D"],
  description: "", message: "", createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};
const settimana = (n) => ({ week: n, sets: 4, reps: { label: "10-8" }, rest: { seconds: 120 }, type: "normal", note: "", source: "manual" });
const otto = () => Array.from({ length: 8 }, (_, i) => settimana(i + 1));
let seq96 = 0;
const ESE = (nome, sup) => Object.assign({ id: "ex-" + (++seq96),
  name: nome, muscle: "dorsali",
  prescription: { sets: 4, reps: { min: 0, max: 0, sequence: [], label: "" }, rest: { seconds: 120 } },
  progression: { weeks: otto() }
}, sup ? { sup } : {});

function schermoCon(esercizi) {
  const docs = [{ id: "program-v2-sheet-prg-intensita__sh-A", dati: { programId: "prg-intensita", sheetId: "sh-A", kind: "sheet",
    sheet: { id: "sh-A", code: "A", name: "Dorsali", updatedAt: "2026-11-02T18:12:00.000Z", exercises: esercizi } } }];
  const dom = new JSDOM("<!doctype html><html><body><div id=\"g\"></div></body></html>");
  const r = riepilogoProgramma(meta, [], { schedeV2: ricostruisciSchede(docs), indice: 0, totaleProgrammi: 1, oggi: new Date(Date.UTC(2026, 10, 4)), quante: 8 });
  renderProgramma(dom.window.document, dom.window.document.querySelector("#g"), { presente: true, numeroSedute: 0 }, r);
  return Array.from(dom.window.document.querySelectorAll("tbody tr.p8-r"));
}

test("96.1 quattro esercizi sciolti: zebra a toni alternati come sempre", () => {
  const righe = schermoCon([ESE("A"), ESE("B"), ESE("C"), ESE("D")]);
  assert.deepEqual(righe.map((r) => (r.classList.contains("z-a") ? "a" : "b")), ["a", "b", "a", "b"]);
  assert.ok(righe.every((r) => !r.classList.contains("z-gruppo")));
});

test("96.2 un gruppo al centro: il gruppo vale UNA unita' e ha il fondo suo", () => {
  const righe = schermoCon([ESE("A"), ESE("B", "ss-1"), ESE("C", "ss-1"), ESE("D")]);
  const toni = righe.map((r) => (r.classList.contains("z-a") ? "a" : "b"));
  /* A = unita' 0 (z-a), B e C = unita' 1 (z-b, stesso tono), D = unita' 2 (z-a). */
  assert.deepEqual(toni, ["a", "b", "b", "a"]);
  assert.ok(righe[1].classList.contains("z-gruppo") && righe[2].classList.contains("z-gruppo"), "il gruppo non ha il fondo suo");
  assert.ok(!righe[0].classList.contains("z-gruppo") && !righe[3].classList.contains("z-gruppo"));
});

test("96.3 un gruppo di tre: tre righe, un tono, una unita' sola", () => {
  const righe = schermoCon([ESE("A", "ss-1"), ESE("B", "ss-1"), ESE("C", "ss-1"), ESE("D")]);
  const toni = righe.map((r) => (r.classList.contains("z-a") ? "a" : "b"));
  assert.deepEqual(toni, ["a", "a", "a", "b"]);
  assert.ok(righe.slice(0, 3).every((r) => r.classList.contains("z-gruppo")));
});
