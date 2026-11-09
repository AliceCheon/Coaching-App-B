/* tests/58-rec-tut-menu.test.mjs — la freccetta di Rec e TUT (8/11/2026).
 *
 * Alice, 8/11/2026: la tendina dei select grezzi era larga e copriva le
 * colonne. Adesso la cella ha solo una freccetta piccola, e il menu si apre
 * fuori dalla tabella: si chiude scegliendo, cliccando fuori o con Esc.
 *
 * Qui si guarda il disegno della cella: nessun select, il menu con le voci di
 * sempre, i due pulsantini accanto al valore, il testo intero nel Title.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

import { riepilogoProgramma } from "../comune/programma.js";
import { ricostruisciSchede } from "../comune/schede-v2.js";
import { renderProgramma } from "../comune/vista-programma.js";
import { REC_TENDINA, TUT_TENDINA } from "../comune/tut-rec.js";

const LUNGO_REC = "No recupero tra le braccia e poi 1,30' e si riparte subito";
const LUNGO_TUT = "Eccentrica controllata e poi esplosiva";

const meta = {
  id: "prg-menu", name: "Menu", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, rotation: ["A"], description: "", message: "",
  createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};
const sett = (n, sets, reps, sec) => ({ week: n, sets, reps, rest: { seconds: sec }, type: "normal", note: "", source: "manual" });
const otto = (reps, sec) => Array.from({ length: 8 }, (_, i) => sett(i + 1, 4, reps, sec));
const esercizi = [
  {
    name: "rematore_bilanciere", muscle: "dorso",
    prescription: { sets: 4, reps: { label: "10" }, recupero: LUNGO_REC, tempo: LUNGO_TUT },
    progression: { weeks: otto("10", 180) }
  }
];
const docs = [{ id: "program-v2-sheet-prg-menu__sh-A", dati: { programId: "prg-menu", sheetId: "sh-A", kind: "sheet",
  sheet: { id: "sh-A", code: "A", name: "Menu", updatedAt: "2026-11-02T18:12:00.000Z", exercises: esercizi } } }];
const sedute = [];

function schermo() {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"g\"></div></body></html>");
  const doc = dom.window.document;
  const cambiate = [];
  const r = riepilogoProgramma(meta, sedute, { schedeV2: ricostruisciSchede(docs), indice: 0, totaleProgrammi: 1, oggi: new Date(Date.UTC(2026, 10, 8)), quante: 8 });
  r.modifica = { attivo: true, onCambia: (m) => cambiate.push(m) };
  renderProgramma(doc, doc.querySelector("#g"), { presente: true, numeroSedute: 0 }, r);
  return { dom, doc, cambiate, win: dom.window };
}

const click = (win, el) => el.dispatchEvent(new win.MouseEvent("click", { bubbles: true, cancelable: true }));
const giu = (win, el) => el.dispatchEvent(new win.MouseEvent("mousedown", { bubbles: true, cancelable: true }));

test("58.1 nelle celle Rec e TUT non c'e' nessun select", () => {
  const { doc } = schermo();
  assert.equal(doc.querySelectorAll("td.c-rec select, td.c-tut select").length, 0);
  assert.equal(doc.querySelectorAll("td.c-rec .freccia").length, 1);
  assert.equal(doc.querySelectorAll("td.c-tut .freccia").length, 1);
  const f = doc.querySelector("td.c-rec .freccia");
  assert.equal(f.tagName, "BUTTON");
  assert.equal(f.getAttribute("aria-haspopup"), "menu");
  assert.equal(f.getAttribute("aria-expanded"), "false");
  assert.equal(f.textContent, "\u25be");
});

test("58.2 cliccando la freccia si apre il menu con le voci di sempre", () => {
  const { doc, win } = schermo();
  const f = doc.querySelector("td.c-rec .freccia");
  click(win, f);
  const menu = doc.querySelector(".menu-freccia");
  assert.ok(menu, "il menu deve esistere");
  const voci = Array.from(menu.querySelectorAll(".menu-voce")).map((v) => v.textContent);
  assert.deepEqual(voci, REC_TENDINA);
  assert.equal(f.getAttribute("aria-expanded"), "true");
  assert.equal(menu.getAttribute("role"), "menu");
});

test("58.3 scegliendo una voce il menu si chiude e il recupero cambia", () => {
  const { doc, win, cambiate } = schermo();
  click(win, doc.querySelector("td.c-rec .freccia"));
  const voci = doc.querySelectorAll(".menu-freccia .menu-voce");
  click(win, voci[1]);
  assert.equal(doc.querySelector(".menu-freccia"), null);
  assert.equal(doc.querySelector("td.c-rec .rec").textContent, REC_TENDINA[1]);
  assert.equal(cambiate.length, 1);
  assert.equal(cambiate[0].campo, "recupero");
  assert.equal(cambiate[0].settimana, null);
  /* nel dato va il testo intero, cambia solo il valore (regola di Alice) */
  assert.equal(cambiate[0].valore, "No recupero tra le braccia e poi 1' e si riparte subito");
  assert.equal(cambiate[0].prima, "No recupero tra le braccia e poi 1,30' e si riparte subito");
});

test("58.4 il TUT ha le voci sue e nessun pulsantino", () => {
  const { doc, win } = schermo();
  click(win, doc.querySelector("td.c-tut .freccia"));
  const voci = Array.from(doc.querySelectorAll(".menu-freccia .menu-voce")).map((v) => v.textContent);
  assert.deepEqual(voci, TUT_TENDINA);
  assert.equal(doc.querySelectorAll("td.c-tut .stp").length, 0);
});

test("58.5 il menu si chiude cliccando fuori e con Esc", () => {
  const { doc, win } = schermo();
  click(win, doc.querySelector("td.c-rec .freccia"));
  assert.ok(doc.querySelector(".menu-freccia"));
  giu(win, doc.body);
  assert.equal(doc.querySelector(".menu-freccia"), null);

  click(win, doc.querySelector("td.c-rec .freccia"));
  assert.ok(doc.querySelector(".menu-freccia"));
  const tasto = new win.KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
  doc.dispatchEvent(tasto);
  assert.equal(doc.querySelector(".menu-freccia"), null);
});

test("58.6 nella cella Rec i due pulsantini stanno accanto al valore", () => {
  const { doc } = schermo();
  const riga = doc.querySelector("td.c-rec .rec-riga");
  assert.ok(riga, "la cella ha una riga sola");
  const pezzi = Array.from(riga.children).map((e) => e.className.split(" ")[0]);
  assert.deepEqual(pezzi, ["stp", "rec", "stp", "freccia"]);
  assert.equal(doc.querySelector("td.c-rec .stp").textContent, "\u2212");
  assert.equal(riga.children[2].textContent, "+");
});

test("58.7 il testo lungo resta intero nel Title e la cella lo taglia", () => {
  const { doc } = schermo();
  const rec = doc.querySelector("td.c-rec .rec");
  const tut = doc.querySelector("td.c-tut .tut");
  assert.equal(rec.title, "1'30\"");
  assert.equal(tut.title, ""); /* cella vuota: niente Title */
  assert.equal(rec.textContent, "1'30\"");
  assert.equal(tut.textContent, ""); /* passo 17: senza valore la cella e vuota */
});
