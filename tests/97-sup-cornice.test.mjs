/* tests/97-sup-cornice.test.mjs — B.17: la cornice sfumata avvolge ogni
 * tratto della superserie (2 o piu' righe di fila con lo stesso sup), per
 * tutta la larghezza della tabella. Gruppo spezzato: due tratti, due
 * cornici; tratto di una riga sola: nessuna cornice. L'overlay non blocca
 * i clic (pointer-events none) e non tocca la tabella. Scollegare il
 * gruppo (o Annullare) fa sparire la cornice. Le figlie tecniche stanno
 * dentro la cornice del padre: nel tbody la figlia si disegna subito dopo
 * la riga del padre, quindi la cornice che va dalla prima all'ultima riga
 * del tratto le copre per costruzione (97.2 verifica l'intero span). */
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
let seq97 = 0;
const ESE = (nome, sup) => Object.assign({ id: "ex-" + (++seq97),
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

test("97.1 gruppo di 2: una cornice che avvolge entrambe le righe", () => {
  const s = schermoCon([ESE("A"), ESE("B", "ss-1"), ESE("C", "ss-1"), ESE("D")]);
  larghezza(s);
  s.righe.forEach((r, i) => misura(r, i * 40, 40));
  assert.equal(corniciScheda(s.box), 1);
  const f = s.box.querySelector(".sup-cornice");
  assert.ok(f, "manca la cornice");
  assert.equal(f.parentNode, s.box);
  assert.equal(f.style.top, "42px");
  assert.equal(f.style.height, "76px");
  assert.equal(f.style.width, "800px");
  assert.equal(f.style.pointerEvents, "none");
});

test("97.2 gruppo di 3: la cornice copre l'intero tratto, prima riga compresa l'ultima (e le figlie fra loro)", () => {
  const s = schermoCon([ESE("A", "ss-1"), ESE("B", "ss-1"), ESE("C", "ss-1"), ESE("D")]);
  larghezza(s);
  s.righe.forEach((r, i) => misura(r, i * 40, 40));
  assert.equal(s.righe.length, 4);
  assert.equal(corniciScheda(s.box), 1);
  const f = s.box.querySelector(".sup-cornice");
  assert.ok(f, "manca la cornice");
  assert.equal(f.style.top, "2px");
  assert.equal(f.style.height, "116px");
  /* lo span della cornice contiene tutte le righe del tratto: qualunque
   * figlia tecnica disegnata fra la prima e l'ultima riga resta dentro */
  const cima = Number(f.style.top.replace("px", ""));
  const fondo = cima + Number(f.style.height.replace("px", ""));
  for (let i = 0; i < 3; i += 1) {
    assert.ok(cima < i * 40 + 40 && fondo > i * 40, "la riga " + i + " esce dalla cornice");
  }
});

test("97.3 gruppo spezzato: due tratti, due cornici; un esercizio solo: nessuna cornice", () => {
  const s = schermoCon([ESE("A", "ss-1"), ESE("B", "ss-1"), ESE("C"), ESE("D", "ss-1"), ESE("E", "ss-1")]);
  larghezza(s);
  s.righe.forEach((r, i) => misura(r, i * 40, 40));
  assert.equal(corniciScheda(s.box), 2);
  const tutte = s.box.querySelectorAll(".sup-cornice");
  assert.equal(tutte[0].style.top, "2px");
  assert.equal(tutte[1].style.top, String(3 * 40 + 2) + "px");
  const solo = schermoCon([ESE("A", "ss-1"), ESE("B", "ss-2")]);
  larghezza(solo);
  solo.righe.forEach((r, i) => misura(r, i * 40, 40));
  assert.equal(corniciScheda(solo.box), 0);
  assert.equal(solo.box.querySelector(".sup-cornice"), null);
});

test("97.4 scheda non visibile: nessuna cornice e la tabella non si tocca", () => {
  const s = schermoCon([ESE("A", "ss-1"), ESE("B", "ss-1")]);
  assert.equal(corniciScheda(s.box), 0);
  assert.equal(s.box.querySelector(".sup-cornice"), null);
  assert.equal(s.tabella.getAttribute("style"), null);
});

test("97.5 i colori della cornice sono variabili per tema e il bordo si legge (3:1)", () => {
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
      const m = /^ {2}--(zebra-a|zebra-b|text-primary|sup-fondo|sup-cornice-a|sup-cornice-b): (#[0-9A-Fa-f]{6});/.exec(righe[i]);
      if (m) t[m[1]] = m[2];
    }
    return t;
  };
  for (const nome of ["dark", "light"]) {
    const t = tema(nome);
    for (const k of ["sup-cornice-a", "sup-cornice-b"]) {
      for (const fondo of ["sup-fondo", "zebra-a", "zebra-b"]) {
        const r = contrasto(t[k], t[fondo]);
        assert.ok(r >= 3, nome + ": " + k + " su " + fondo + " fa " + r.toFixed(2) + ":1 (servono 3)");
      }
    }
  }
  assert.ok(foglio.indexOf(".sup-cornice{position:absolute;pointer-events:none") !== -1, "manca la regola dell'overlay");
  assert.ok(foglio.indexOf("border:2px solid var(--sup-cornice-a)") !== -1, "manca il fallback a bordo pieno rosa");
  assert.ok(foglio.indexOf("mask-composite:exclude") !== -1, "manca la sfumatura con la maschera");
});

test("97.6 scollegare il gruppo o Annullare: la cornice sparisce con le righe", () => {
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
  assert.equal(corniciScheda(box), 1);
  assert.equal(contenitore.querySelectorAll(".sup-cornice").length, 1);
  /* Annulla = ridisegno senza il gruppo: box nuovo, cornici zero */
  renderProgramma(dom.window.document, contenitore, { presente: true, numeroSedute: 0 }, calc([ESE("A"), ESE("B"), ESE("C")]));
  assert.equal(contenitore.querySelectorAll(".sup-cornice").length, 0);
});
