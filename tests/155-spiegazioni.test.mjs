/* Guardia 155 (passo 33): «Spiegazioni (4/4)» apre davvero il pannello.
 *
 *  155.1  il pannello in pagina ha quattro voci, con i quattro titoli
 *  155.2  il tasto della barra viva e' acceso (non piu' spento) e apre il pannello
 *  155.3  si chiude col × , col clic fuori e con Esc
 *  155.4  i testi non promettono dati che non ci sono: niente «qui S4», niente
 *         percentuali fisse, e la rotazione dice che si vede solo dal logbook
 *  155.5  «Suggerimenti» resta al suo posto (serve alla robottina)
 */

import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { riepilogoProgramma } from "../comune/programma.js";
import { ricostruisciSchede } from "../comune/schede-v2.js";
import { renderProgramma, apriSpiegazioni } from "../comune/vista-programma.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagina = readFileSync(join(radice, "desktop", "index.html"), "utf8");

const meta = {
  id: "prg155", name: "Intensit\u00e0 ottobre-dicembre", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 2, rotation: ["A", "B"],
  description: "", createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};
const sett = (serie, label) => Array.from({ length: 8 }, (_, i) => ({ week: i + 1, sets: serie, reps: { label }, rest: { seconds: 120 } }));
const ESE = (nome) => ({ id: "ex-155-" + nome, name: nome, nome, muscolo: "dorsali", nota: "", sup: "", prescription: { sets: 4, rest: { seconds: 90 } }, progression: { weeks: sett(4, "10-8") } });
const schedaDoc = (cod) => ({ id: "s-prg155-" + cod, dati: { programId: "prg155", sheetId: "sh-" + cod, kind: "sheet", sheet: { id: "sh-" + cod, code: cod, name: "Dorsali " + cod, exercises: [ESE("Rematore bilanciere"), ESE("Trazioni")] } } });

function paginaVera() {
  const dom = new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
  const doc = dom.window.document;
  const win = dom.window;
  win.setTimeout = () => 0;
  const mod = {
    attivo: true,
    annullabile: false,
    conta: () => ({ codice: "A", esercizi: 2, tecniche: 1, righe: 3, modifiche: 2 }),
    onCambia: () => Promise.resolve({ ok: true })
  };
  const contenitore = doc.querySelector("#programma-attivo");
  assert.ok(contenitore, "la pagina vera ha il contenitore #programma-attivo");
  const r = riepilogoProgramma(meta, [], {
    schedeV2: ricostruisciSchede([schedaDoc("A")]),
    indice: 0, totaleProgrammi: 1, oggi: new Date(Date.UTC(2026, 10, 16)), quante: 8
  });
  renderProgramma(doc, contenitore, { presente: true, numeroSedute: 0 }, Object.assign({}, r, { modifica: mod }));
  return { dom, doc, win, contenitore };
}

const apertura = (doc) => doc.querySelector(".bd-spiega");
const titoli = (doc) => Array.from(doc.querySelectorAll(".bd-spiega .pr-spiega > div > b")).map((b) => String(b.textContent || "").trim());

test("155.1 il pannello ha quattro voci con i quattro titoli", () => {
  const { doc } = paginaVera();
  /* lo stampo (una volta sola in pagina) e la copia viva dicono le stesse cose */
  const stampo = Array.from(doc.querySelectorAll("#pr-mspiega .pr-spiega > div > b")).map((b) => String(b.textContent || "").trim());
  assert.deepEqual(stampo, ["TUT — tempo sotto tensione", "Ondata 10-x", "Scarico", "Rotazione schede"]);
  assert.equal(doc.querySelectorAll("#pr-mspiega .pr-spiega > div").length, 4);
  apriSpiegazioni(doc);
  assert.deepEqual(titoli(doc), stampo, "la copia viva riporta gli stessi quattro titoli");
  assert.equal(doc.querySelectorAll(".bd-spiega .pr-spiega > div").length, 4);
  assert.equal(apertura(doc).getAttribute("hidden"), null);
});

test("155.2 il tasto e' acceso (non spento) e apre il pannello", () => {
  const { doc } = paginaVera();
  const tasto = doc.querySelector('[data-spiegazioni="1"]');
  assert.ok(tasto, "manca il tasto Spiegazioni nella barra viva");
  assert.equal(String(tasto.textContent).trim(), "Spiegazioni (4/4)");
  assert.equal(tasto.disabled, false, "il tasto non deve essere spento");
  assert.equal(tasto.getAttribute("aria-disabled"), null);
  assert.equal(apertura(doc), null, "prima del clic non c'e' nessun pannello aperto");
  tasto.click();
  assert.ok(apertura(doc), "dopo il clic il pannello e' aperto e visibile");
  assert.equal(apertura(doc).parentElement, doc.body, "il pannello vive sul corpo della pagina, non in un contenitore nascosto");
});

test("155.3 si chiude col ×, col clic fuori e con Esc", () => {
  {
    const { doc } = paginaVera();
    apriSpiegazioni(doc);
    const pannello = apertura(doc);
    assert.ok(pannello, "il pannello e' aperto");
    pannello.querySelector(".pr-mx").click();
    assert.equal(apertura(doc), null, "il × chiude il pannello");
  }
  {
    const { doc, win } = paginaVera();
    apriSpiegazioni(doc);
    assert.ok(apertura(doc), "il pannello e' aperto");
    doc.dispatchEvent(new win.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    assert.equal(apertura(doc), null, "Esc chiude il pannello");
  }
  {
    const { doc } = paginaVera();
    apriSpiegazioni(doc);
    const pannello = apertura(doc);
    pannello.dispatchEvent(new (doc.defaultView.MouseEvent)("click", { bubbles: true }));
    assert.equal(apertura(doc), null, "il clic fuori chiude il pannello");
  }
});

test("155.4 i testi dicono solo cose vere", () => {
  const { doc } = paginaVera();
  const testo = (n) => String(doc.querySelectorAll("#pr-mspiega .pr-spiega > div")[n].textContent || "");
  const scarico = testo(2), rotazione = testo(3);
  assert.ok(!/qui S4/.test(scarico), "lo scarico non e' per forza S4: dipende dalla scheda");
  assert.ok(!/−20%|−30%|-20%|-30%/.test(scarico), "le percentuali si leggono dalla scheda, non si fissano qui");
  assert.match(scarico, /Scarico/);
  assert.match(scarico, /Vol −%/);
  assert.match(rotazione, /logbook/, "la rotazione si vede solo dal logbook");
});

test("155.5 Suggerimenti resta al suo posto", () => {
  const { doc } = paginaVera();
  const sug = Array.from(doc.querySelectorAll("button")).filter((b) => /^Suggerimenti/.test(String(b.textContent || "").trim()));
  assert.ok(sug.length >= 1, "il tasto Suggerimenti non deve sparire: serve alla robottina");
});
