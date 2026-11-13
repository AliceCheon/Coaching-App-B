/* tests/87-riga-tecnica-nome-ese.test.mjs — nome esercizio e corsivo (B.11, 13/11/2026).
 *
 * Alice, 13/11/2026: «quando aggiungo una tecnica di intensità mi deve comparire il
 * nome dell'esercizio, la letterina accanto (per esempio D) e poi sotto al nome
 * dell'esercizio il nome della tecnica di intensità, per esempio rest pause, in corsivo».
 * Qui si guarda la riga disegnata, non solo il foglio.
 */
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
const foglio = readFileSync(join(radice, "desktop", "index.html"), "utf8");

const meta = {
  id: "prg-n", name: "N", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, rotation: ["A"],
  description: "", message: "",
  createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};
const sett = (k) => ({ week: k, sets: 4, reps: "8-10", rest: { seconds: 120 }, type: "normal", note: "", source: "manual" });
const otto = () => Array.from({ length: 8 }, (_, i) => sett(i + 1));

const padre = {
  id: "ex-1", name: "lat_machine_triangolo", muscle: "Dorsali",
  prescription: { sets: 4, reps: { label: "10" }, recupero: "2'", tempo: "" },
  progression: { weeks: otto() }
};
const figlia = {
  id: "tec-1", tipo: "tecnica", padreId: "ex-1", tecnica: "rest-pause",
  contaVolume: false,
  settimane: Array.from({ length: 8 }, () => ({ serie: 1, reps: "rest pause" })),
  parametri: { riprese: 5, recuperoSec: 20, maxRiprese: 5 },
  nota: { auto: "Serie tocca il cedimento.", manuale: null }
};
const docs = [{
  id: "program-v2-sheet-prg-n__sh-A",
  dati: {
    programId: "prg-n", sheetId: "sh-A", kind: "sheet",
    sheet: { id: "sh-A", code: "A", name: "N", updatedAt: "2026-11-02T18:12:00.000Z", exercises: [padre, figlia] }
  }
}];

function schermo() {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"g\"></div></body></html>");
  const doc = dom.window.document;
  const r = riepilogoProgramma(meta, [], {
    schedeV2: ricostruisciSchede(docs), indice: 0, totaleProgrammi: 1,
    oggi: new Date(Date.UTC(2026, 10, 13)), quante: 8
  });
  r.modifica = { attivo: true, onCambia: () => {} };
  renderProgramma(doc, doc.querySelector("#g"), { presente: true, numeroSedute: 0 }, r);
  return { doc };
}

test("87.1 la riga della tecnica porta il nome dell'esercizio, pulito", () => {
  const { doc } = schermo();
  const tr = doc.querySelector("tr.p8-tec");
  const nome = tr.querySelector("td.c-ese .tec-padre");
  assert.ok(nome, "manca il nome dell'esercizio nella riga della tecnica");
  assert.equal(nome.textContent, "Lat machine triangolo", "il nome si mostra senza trattini bassi");
});

test("87.2 accanto c'e' la letterina del distretto, come sul padre", () => {
  const { doc } = schermo();
  const tr = doc.querySelector("tr.p8-tec");
  const lettera = tr.querySelector("td.c-dist span.dist");
  assert.ok(lettera, "manca la lettera del distretto");
  const padreRiga = Array.from(doc.querySelectorAll("tr.p8-r")).filter((r) => !r.classList.contains("p8-tec") && r.querySelector("td.c-js").textContent === "A1")[0];
  const letteraPadre = padreRiga.querySelector("td.c-dist span.dist").textContent;
  assert.equal(lettera.textContent, letteraPadre, "la lettera deve essere la stessa del padre");
  assert.notEqual(lettera.textContent.trim(), "\u2014", "non deve restare il trattino");
});

test("87.3 la tecnica si legge in corsivo UNA volta sola, dentro la capsula", () => {
  const { doc } = schermo();
  const tr = doc.querySelector("tr.p8-tec");
  const capsula = tr.querySelector("td.c-ese button.tec-badge");
  assert.ok(capsula, "manca la capsula della tecnica");
  assert.equal(capsula.textContent, "Rest pause", "REST-PAUSE deve leggersi Rest pause");
  assert.equal(tr.querySelector("td.c-ese .tec-nome"), null, "il corsivo sotto il nome non deve esserci piu'");
  const pezzi = Array.from(tr.querySelectorAll("td.c-ese *"))
    .filter((e) => e.children.length === 0)
    .map((e) => e.textContent.trim().toLowerCase());
  assert.equal(pezzi.filter((t) => t === "rest pause").length, 1,
    "la tecnica si legge una volta sola nella riga");
});

test("87.4 il corsivo in capsula e il nome del padre hanno i colori dei due temi", () => {
  assert.ok(foglio.indexOf("tr.p8-tec button.tec-badge{font-family:'Nunito Sans',sans-serif;font-style:italic") !== -1,
    "la capsula deve portare il corsivo");
  assert.ok(foglio.indexOf("tr.p8-tec .tec-padre{color:#E6D9F7") !== -1, "nel scuro il nome del padre e' chiaro");
  assert.ok(foglio.indexOf('body[data-theme="light"] #pag-programma-1 tr.p8-tec .tec-padre{color:#3A2A4E}') !== -1,
    "sul chiaro il nome del padre e' viola scuro");
});
