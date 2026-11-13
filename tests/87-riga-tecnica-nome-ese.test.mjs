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

test("87.3 sotto il nome c'e' la tecnica in corsivo, in forma leggibile", () => {
  const { doc } = schermo();
  const corsivo = doc.querySelector("tr.p8-tec td.c-ese .tec-nome");
  assert.ok(corsivo, "manca il nome della tecnica in corsivo");
  assert.equal(corsivo.textContent, "Rest pause", "REST-PAUSE deve leggersi Rest pause");
  assert.ok(foglio.indexOf("tr.p8-tec .tec-nome{font-style:italic") !== -1, "il foglio deve mettere il corsivo");
});

test("87.4 il corsivo ha il colore giusto nei due temi", () => {
  assert.ok(foglio.indexOf("tr.p8-tec .tec-nome{font-style:italic;font-size:11.5px;line-height:1.35;color:var(--lav)") !== -1, "nel scuro il corsivo e' lavanda");
  assert.ok(foglio.indexOf('body[data-theme="light"] #pag-programma-1 tr.p8-tec .tec-nome{color:#7A34C4}') !== -1, "sul chiaro il corsivo e' viola scuro");
});
