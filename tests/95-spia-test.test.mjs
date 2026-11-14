/* Passo B.16a-2 — la spia «Test», l'icona «ripeti», la barretta sulla prima
 * cella, niente più «⇄ DX/SX» e niente T. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM } from "jsdom";
import { riepilogoProgramma } from "../comune/programma.js";
import { ricostruisciSchede } from "../comune/schede-v2.js";
import { renderProgramma } from "../comune/vista-programma.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const foglio = readFileSync(join(radice, "desktop", "index.html"), "utf8").replace(/\r/g, "");
const vista = readFileSync(join(radice, "comune", "vista-programma.js"), "utf8").replace(/\r/g, "");

const meta = {
  id: "prg-intensita", name: "Intensità ottobre-dicembre", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, rotation: ["A", "B", "C", "D"],
  description: "", message: "", createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};
const settimana = (n, etichettaReps) => ({ week: n, sets: 4, reps: { label: etichettaReps }, rest: { seconds: 120 }, type: "normal", note: "", source: "manual" });
const otto = (prima, altre, dove) => Array.from({ length: 8 }, (_, i) => settimana(i + 1, i + 1 === dove ? prima : altre));
let seq95 = 0;
const ESE = (nome, settimane, sup) => Object.assign({ id: "ex-" + (++seq95),
  name: nome, muscle: "dorsali",
  prescription: { sets: 4, reps: { min: 0, max: 0, sequence: [], label: "" }, rest: { seconds: 120 } },
  progression: { weeks: settimane }
}, sup ? { sup } : {});
const esercizi = [
  ESE("Lat machine", otto("test 12rm → 8", "10-8", 1)),
  ESE("Rematore", otto("Test 10 rm", "10-8", 5)),
  ESE("Pulley", otto("10-8", "10-8", 0)),
  ESE("Trazioni", otto("10-8", "10-8", 0))
];
const docs = [{ id: "program-v2-sheet-prg-intensita__sh-A", dati: { programId: "prg-intensita", sheetId: "sh-A", kind: "sheet",
  sheet: { id: "sh-A", code: "A", name: "Dorsali", updatedAt: "2026-11-02T18:12:00.000Z", exercises: esercizi } } }];
const sedute = [];

function schermo() {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"g\"></div></body></html>");
  const doc = dom.window.document;
  const r = riepilogoProgramma(meta, sedute, { schedeV2: ricostruisciSchede(docs), indice: 0, totaleProgrammi: 1, oggi: new Date(Date.UTC(2026, 10, 4)), quante: 8 });
  renderProgramma(doc, doc.querySelector("#g"), { presente: true, numeroSedute: 0 }, r);
  return doc;
}

const lum = (h) => {
  const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrasto = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
const tema = (nome) => {
  const righe = foglio.split("\n");
  const apri = righe.findIndex((l) => l.indexOf('body[data-theme="' + nome + '"] {') !== -1);
  assert.ok(apri !== -1, "manca il blocco del tema " + nome);
  const t = {};
  for (let i = apri; i < righe.length && righe[i].indexOf("}") !== 0; i += 1) {
    const m = /^ {2}--(test-parola|test-pallino|zebra-a|zebra-b): ([^;]+);/.exec(righe[i]);
    if (m) t[m[1]] = m[2];
  }
  return t;
};

test("95.1 la spia c'e' con «test» in S1 e il tooltip elenca la settimana", () => {
  const doc = schermo();
  const riga = doc.querySelectorAll("tbody tr.p8-r")[0];
  const spia = riga.querySelector(".tb-test.on");
  assert.ok(spia, "la spia non compare");
  assert.equal(spia.title, "Test in S1");
  assert.equal(spia.textContent, "Test");
});

test("95.2 la spia c'e' con «Test» maiuscolo in S5", () => {
  const doc = schermo();
  const spia = doc.querySelectorAll("tbody tr.p8-r")[1].querySelector(".tb-test.on");
  assert.ok(spia, "la spia non compare");
  assert.equal(spia.title, "Test in S5");
});

test("95.3 senza test la spia non c'e' e la fila dei chip non lascia spazio", () => {
  const doc = schermo();
  const riga = doc.querySelectorAll("tbody tr.p8-r")[2];
  assert.equal(riga.querySelector(".tb-test.on"), null);
  const chips2 = riga.querySelector(".ese-chips2");
  assert.ok(chips2, "il contenitore deve restare nel documento");
  assert.equal(chips2.style.display, "none");
});

test("95.4 la parola Test e' in corsivo Nunito Sans, leggibile (11px)", () => {
  const m = /\.tb-test\{display:none;font:600 11px\/1 'Nunito Sans',sans-serif;font-style:italic/.exec(foglio);
  assert.ok(m, "manca la regola unica della spia (corsivo, Nunito, 11px)");
  assert.equal(foglio.indexOf(".tb-test{opacity:.35}"), -1, "regola contraddittoria rimasta");
  assert.equal(foglio.indexOf(".p8-r .tb-test{font-size:8px"), -1, "gli 8px sono rimasti");
});

test("95.5 la parola si legge sul fondo delle celle, in entrambi i temi (4,5:1)", () => {
  for (const nome of ["dark", "light"]) {
    const t = tema(nome);
    const parola = t["test-parola"].trim();
    for (const k of ["zebra-a", "zebra-b"]) {
      const r = contrasto(parola, t[k].trim());
      assert.ok(r >= 4.5, nome + ": «Test» su " + k + " fa " + r.toFixed(2) + ":1");
    }
  }
});

test("95.6 il pallino della spia: var(--pink) nel scuro, #a43369 nel chiaro", () => {
  assert.match(tema("dark")["test-pallino"].trim(), /var\(--pink\)/);
  assert.equal(tema("light")["test-pallino"].trim(), "#a43369");
});

test("95.7 l'icona e' il «ripeti» del Material e «⇄ DX/SX» e' sparita", () => {
  assert.ok(vista.indexOf("M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z") !== -1, "manca il percorso del Material");
  assert.ok(vista.indexOf('s.setAttribute("fill", "currentColor")') !== -1, "il fill non e' currentColor");
  assert.equal(vista.indexOf("M12.8 5.4V3.2h-2.2"), -1, "e' rimasto il vecchio anello");
  assert.equal(vista.indexOf("DX/SX"), -1, "DX/SX e' rimasto nella vista");
  assert.equal(foglio.indexOf('class="chlat"'), -1, "lo span DX/SX e' rimasto nella pagina");
});

test("95.8 la barretta rosa e' andata: la cornice avvolge il gruppo (B.17)", () => {
  assert.equal(foglio.indexOf("tr.p8-r.in-sup td:first-child{border-left:3px solid #FF2D95}"), -1, "la barretta e' rimasta");
  const doc = schermo();
  /* due esercizi di prova, in gruppo */
  const due = JSON.parse(JSON.stringify(docs));
  const ex = due[0].dati.sheet.exercises;
  ex[2].sup = "ss-prova"; ex[3].sup = "ss-prova";
  const dom = new JSDOM("<!doctype html><html><body><div id=\"g\"></div></body></html>");
  const r = riepilogoProgramma(meta, sedute, { schedeV2: ricostruisciSchede(due), indice: 0, totaleProgrammi: 1, oggi: new Date(Date.UTC(2026, 10, 4)), quante: 8 });
  renderProgramma(dom.window.document, dom.window.document.querySelector("#g"), { presente: true, numeroSedute: 0 }, r);
  const righe = dom.window.document.querySelectorAll("tbody tr.p8-r");
  assert.ok(righe[2].classList.contains("in-sup"), "il padre del gruppo non ha la barretta");
  assert.ok(righe[3].classList.contains("in-sup"), "il secondo del gruppo non ha la barretta");
  assert.ok(!righe[0].classList.contains("in-sup"), "la riga fuori gruppo non deve averla");
});

test("95.9 le righe tecniche figlie non hanno la spia", () => {
  const inizio = vista.indexOf("function rigaTecnicaVista");
  const fine = vista.indexOf("function ", inizio + 10);
  assert.equal(vista.slice(inizio, fine).indexOf("tb-test"), -1, "la figlia non deve avere la spia");
});
