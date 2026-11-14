/* tests/98-sup-giunzione.test.mjs — B.18: il cerchietto della giunzione
 * fra due esercizi collegati. Due esercizi = una freccia, tre = due;
 * la giunzione e' calcolata sulle righe vere, figlie tecniche comprese
 * (il confine sta SOTTO la figlia, non sotto il padre). Gruppo spezzato:
 * nessuna freccia al confine. pointer-events none; sparisce con la
 * cornice quando si scollega o dopo Annulla. Colori variabili per tema,
 * simbolo leggibile (3:1 sul fondo del cerchio), animazione solo
 * transform e ferma con reduced-motion. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { riepilogoProgramma } from "../comune/programma.js";
import { ricostruisciSchede } from "../comune/schede-v2.js";
import { renderProgramma, corniciScheda } from "../comune/vista-programma.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const foglio = readFileSync(join(radice, "desktop", "index.html"), "utf8").replace(/\r/g, "");

const meta = {
  id: "prg-intensita", name: "Intensità ottobre-dicembre", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, rotation: ["A", "B", "C", "D"],
  description: "", message: "", createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};
const settimana = (n) => ({ week: n, sets: 4, reps: { label: "10-8" }, rest: { seconds: 120 }, type: "normal", note: "", source: "manual" });
const otto = () => Array.from({ length: 8 }, (_, i) => settimana(i + 1));
let seq98 = 0;
const ESE = (nome, sup) => Object.assign({ id: "ex-" + (++seq98),
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
  const box = dom.window.document.querySelector(".p8-scroll");
  return { doc: dom.window.document, box: box, tabella: box.querySelector(".p8-tab"),
    righe: Array.from(dom.window.document.querySelectorAll("tbody tr")) };
}
function misura(el, cima, alta) {
  Object.defineProperty(el, "offsetTop", { configurable: true, value: cima });
  Object.defineProperty(el, "offsetHeight", { configurable: true, value: alta });
  Object.defineProperty(el, "offsetParent", { configurable: true, value: null });
}
const larghezza = (s) => Object.defineProperty(s.tabella, "offsetWidth", { configurable: true, value: 800 });

test("98.1 due esercizi collegati: una freccia sulla linea di confine, a sinistra", () => {
  const s = schermoCon([ESE("A"), ESE("B", "ss-1"), ESE("C", "ss-1"), ESE("D")]);
  larghezza(s);
  s.righe.forEach((r, i) => misura(r, i * 40, 40));
  corniciScheda(s.box);
  const frecce = s.box.querySelectorAll(".sup-giunzione");
  assert.equal(frecce.length, 1);
  /* confine fra riga 1 (40..80) e riga 2 (80..120): centro a 80 */
  assert.equal(frecce[0].style.top, "70px");
  assert.equal(frecce[0].style.left, "1px");
  assert.equal(frecce[0].style.pointerEvents, "none");
  assert.ok(frecce[0].querySelector("svg"), "manca l'icona");
});

test("98.2 tre esercizi collegati: due frecce; il confine conta le figlie tecniche", () => {
  const s = schermoCon([ESE("A", "ss-1"), ESE("B", "ss-1"), ESE("C", "ss-1")]);
  larghezza(s);
  s.righe.forEach((r, i) => misura(r, i * 40, 40));
  corniciScheda(s.box);
  const frecce = s.box.querySelectorAll(".sup-giunzione");
  assert.equal(frecce.length, 2);
  assert.equal(frecce[0].style.top, "30px");
  assert.equal(frecce[1].style.top, "70px");
});

test("98.3 il confine sta sotto la figlia tecnica, non sotto il padre", () => {
  /* una tecnica inventata da sé non esiste nella vista: qui simulo il
   * blocco del padre piu' alto — riga 1 alta 60 (padre + figlia insieme,
   * come succede con il testo che va a capo): il confine con l'esercizio
   * di sotto e' a 60, non a 40 */
  const s = schermoCon([ESE("A"), ESE("B", "ss-1"), ESE("C", "ss-1"), ESE("D")]);
  larghezza(s);
  misura(s.righe[1], 40, 60); /* B alta 60: eventuale figlia inglobata */
  s.righe[0].offsetHeight && misura(s.righe[0], 0, 40);
  misura(s.righe[2], 100, 40);
  s.righe[3] && misura(s.righe[3], 140, 40);
  corniciScheda(s.box);
  const frecce = s.box.querySelectorAll(".sup-giunzione");
  assert.equal(frecce.length, 1);
  /* confine = 40 + 60 = 100, centro a 100 */
  assert.equal(frecce[0].style.top, "90px");
});

test("98.4 gruppi spezzati: nessuna freccia al confine fra i due gruppi", () => {
  const s = schermoCon([ESE("A", "ss-1"), ESE("B", "ss-1"), ESE("C", "ss-2"), ESE("D", "ss-2")]);
  larghezza(s);
  s.righe.forEach((r, i) => misura(r, i * 40, 40));
  corniciScheda(s.box);
  /* due cornici, due frecce: UNA dentro ogni gruppo, nessuna fra B e C */
  assert.equal(s.box.querySelectorAll(".sup-cornice").length, 2);
  const frecce = Array.from(s.box.querySelectorAll(".sup-giunzione"));
  assert.equal(frecce.length, 2);
  const tops = frecce.map((f) => f.style.top).sort();
  assert.deepEqual(tops, ["110px", "30px"])
});

test("98.5 spariscono con la cornice: scollegamento e Annulla", () => {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"g\"></div></body></html>");
  const contenitore = dom.window.document.querySelector("#g");
  const calc = (esercizi) => riepilogoProgramma(meta, [], { schedeV2: ricostruisciSchede(
    [{ id: "program-v2-sheet-prg-intensita__sh-A", dati: { programId: "prg-intensita", sheetId: "sh-A", kind: "sheet",
      sheet: { id: "sh-A", code: "A", name: "Dorsali", updatedAt: "2026-11-02T18:12:00.000Z", exercises: esercizi } } }]
  ), indice: 0, totaleProgrammi: 1, oggi: new Date(Date.UTC(2026, 10, 4)), quante: 8 });
  renderProgramma(dom.window.document, contenitore, { presente: true, numeroSedute: 0 }, calc([ESE("A"), ESE("B", "ss-1"), ESE("C", "ss-1")]));
  const box = contenitore.querySelector(".p8-scroll");
  larghezza({ tabella: box.querySelector(".p8-tab") });
  Array.from(contenitore.querySelectorAll("tbody tr")).forEach((r, i) => misura(r, i * 40, 40));
  corniciScheda(box);
  assert.equal(contenitore.querySelectorAll(".sup-giunzione").length, 1);
  /* Annulla = ridisegno senza il gruppo: niente cornici, niente frecce */
  renderProgramma(dom.window.document, contenitore, { presente: true, numeroSedute: 0 }, calc([ESE("A"), ESE("B"), ESE("C")]));
  assert.equal(contenitore.querySelectorAll(".sup-giunzione").length, 0);
  assert.equal(contenitore.querySelectorAll(".sup-cornice").length, 0);
});

test("98.6 colori per tema, simbolo leggibile (3:1), animazione solo transform e reduced-motion", () => {
  const lum = (h) => {
    const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const contrasto = (a, b) => {
    const x = lum(a), y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  const tema = (nome) => {
    const righe = foglio.split("\n");
    const apri = righe.findIndex((l) => l.indexOf('body[data-theme="' + nome + '"] {') !== -1);
    assert.ok(apri !== -1, "manca il blocco del tema " + nome);
    const t = {};
    for (let i = apri; i < righe.length && righe[i].indexOf("}") !== 0; i += 1) {
      const m = /^ {2}--(text-primary|sup-cornice-a|surface): (#[0-9A-Fa-f]{6});/.exec(righe[i]);
      if (m) t[m[1]] = m[2];
    }
    return t;
  };
  for (const nome of ["dark", "light"]) {
    const t = tema(nome);
    const r = contrasto(t["sup-cornice-a"], t["surface"]);
    assert.ok(r >= 3, nome + ": il simbolo sul cerchio fa " + r.toFixed(2) + ":1 (servono 3)");
  }
  /* il cerchio ha fondo scheda, alone, pointer-events none */
  assert.ok(foglio.indexOf(".sup-giunzione{position:absolute;width:20px;height:20px;border-radius:50%;pointer-events:none;background:var(--card)") !== -1);
  /* l'animazione: SOLO transform, 8 secondi, e ferma con reduced-motion */
  const chiave = foglio.indexOf("@keyframes sup-ruota{");
  assert.ok(chiave !== -1, "manca l'animazione di rotazione");
  const fine = foglio.indexOf("}", chiave) + 1;
  const corpo = foglio.slice(chiave, fine);
  assert.ok(corpo.indexOf("transform:rotate") !== -1, "la rotazione non usa transform");
  assert.equal(/(left|top|width|height|margin|padding)\s*:/.test(corpo), false, "l'animazione tocca altre proprieta'");
  assert.ok(foglio.indexOf("animation:sup-ruota 8s linear infinite") !== -1, "manca la rotazione lenta continua");
  assert.ok(/@media \(prefers-reduced-motion: reduce\)\{\.sup-giunzione-ic\{animation:none\}\}/.test(foglio), "manca la regola reduced-motion");
  /* fallback a bordo pieno rosa quando la maschera non c'e' */
  assert.ok(foglio.indexOf(".sup-giunzione:not(.sup-giunzione-grad)::before{content:\"\";position:absolute;inset:0;border:2px solid var(--sup-cornice-a);border-radius:50%}") !== -1);
});
