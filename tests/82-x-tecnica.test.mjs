/* tests/82-x-tecnica.test.mjs — la X sulla riga della tecnica (B.6, 12/11/2026).
 *
 * Cosa e' provato, con le parole di Alice:
 *  - la riga figlia ha una piccola X accanto al badge della tecnica;
 *  - cliccarla chiede la rimozione della SOLA tecnica («campo: rimozione-tecnica»,
 *    l'id della figlia): e' la stessa richiesta che manda il pannello, quindi il
 *    registro scrive «cancella-riga» e Annulla la rimette;
 *  - il padre non ha la X della tecnica: la X dell'esercizio resta la sua;
 *  - con l'editor spento la X si vede ma e' spenta e non manda niente.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

import { riepilogoProgramma } from "../comune/programma.js";
import { ricostruisciSchede } from "../comune/schede-v2.js";
import { renderProgramma } from "../comune/vista-programma.js";

const meta = {
  id: "prg-x", name: "X", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, rotation: ["A"],
  description: "", message: "",
  createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};
const sett = (n) => ({ week: n, sets: 4, reps: "8-10", rest: { seconds: 120 }, type: "normal", note: "", source: "manual" });
const otto = () => Array.from({ length: 8 }, (_, i) => sett(i + 1));

const padre = {
  id: "ex-1", name: "panca_piana", muscle: "petto",
  prescription: { sets: 4, reps: { label: "10" }, recupero: "2'", tempo: "" },
  progression: { weeks: otto() }
};
const figlia = {
  id: "tec-1", tipo: "tecnica", padreId: "ex-1", tecnica: "rest-pause",
  contaVolume: false,
  settimane: Array.from({ length: 8 }, () => ({ serie: 1, reps: "rest pause" })),
  parametri: { riprese: 5, recuperoSec: 20, maxRiprese: 5 },
  nota: { auto: "Serie tocca il cedimento, poi 20 e 5 ripetizioni.", manuale: null }
};

const docs = [{
  id: "program-v2-sheet-prg-x__sh-A",
  dati: {
    programId: "prg-x", sheetId: "sh-A", kind: "sheet",
    sheet: {
      id: "sh-A", code: "A", name: "X", updatedAt: "2026-11-02T18:12:00.000Z",
      exercises: [padre, figlia]
    }
  }
}];

function schermo(conEditor) {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"g\"></div></body></html>");
  const doc = dom.window.document;
  const cambiate = [];
  const r = riepilogoProgramma(meta, [], {
    schedeV2: ricostruisciSchede(docs), indice: 0, totaleProgrammi: 1,
    oggi: new Date(Date.UTC(2026, 10, 12)), quante: 8
  });
  if (conEditor) r.modifica = { attivo: true, onCambia: (m) => cambiate.push(m) };
  renderProgramma(doc, doc.querySelector("#g"), { presente: true, numeroSedute: 0 }, r);
  return { dom, doc, cambiate, win: dom.window };
}
const click = (win, el) => el.dispatchEvent(new win.MouseEvent("click", { bubbles: true, cancelable: true }));

test("82.1 la riga della tecnica ha la sua X, accanto al badge", () => {
  const { doc } = schermo(true);
  const riga = doc.querySelectorAll("tr.p8-tec");
  assert.equal(riga.length, 1, "una sola riga figlia");
  const x = riga[0].querySelector("button.tec-x");
  assert.ok(x, "la X c'e'");
  assert.equal(x.textContent, "✕");
  assert.equal(x.title, "cancella la riga della tecnica");
  /* sta nella cella dell'esercizio, dopo il badge della tecnica */
  assert.ok(riga[0].querySelector("td.c-ese button.tec-badge"));
  assert.equal(x.closest("td").className, "c-ese");
});

test("82.2 la X chiede la rimozione della sola tecnica, con l'id della figlia", () => {
  const { doc, win, cambiate } = schermo(true);
  click(win, doc.querySelector("tr.p8-tec button.tec-x"));
  assert.equal(cambiate.length, 1);
  assert.equal(cambiate[0].campo, "rimozione-tecnica");
  assert.equal(cambiate[0].idEsercizio, "tec-1");
  assert.equal(cambiate[0].idScheda, "sh-A");
  assert.match(cambiate[0].esercizio, /^↳ /);
});

test("82.3 il padre non porta la X della tecnica, e la sua resta la sua", () => {
  const { doc } = schermo(true);
  /* nessuna riga che non sia una figlia porta la X della tecnica */
  assert.equal(doc.querySelectorAll("tr.p8-r:not(.p8-tec) button.tec-x").length, 0);
  const padreRiga = Array.from(doc.querySelectorAll("tr.p8-r"))
    .find((tr) => !tr.classList.contains("p8-tec") && tr.querySelector("td.c-js") && tr.querySelector("td.c-js").textContent === "A1");
  assert.ok(padreRiga, "la riga A1 c'e'");
  const xPadre = Array.from(padreRiga.querySelectorAll("button.ab")).filter((b) => b.textContent === "✕");
  assert.equal(xPadre.length, 1, "la X dell'esercizio resta quella di sempre");
});

test("82.4 con l'editor spento la X si vede ma e' spenta e non scrive", () => {
  const { doc, win, cambiate } = schermo(false);
  const x = doc.querySelector("tr.p8-tec button.tec-x");
  assert.ok(x);
  assert.equal(x.disabled, true);
  assert.equal(x.getAttribute("aria-disabled"), "true");
  click(win, x);
  assert.equal(cambiate.length, 0);
});
