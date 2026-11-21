/* tests/130-reds.test.mjs — PASSO 6b: tolleranze e carta RED-S.
 *
 * Numeri scelti a mano, percentuali calcolate a mano qui nel test. Le prime
 * prove guardano il conto puro (comune/tolleranze-b.js + stressRiepilogo),
 * l'ultima monta la PAGINA VERA e guarda la carta che Alice vede.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM } from "jsdom";

import { TOLLERANZE, tolleranzaDi } from "../comune/tolleranze-b.js";
import { stressRiepilogo, ARTICOLAZIONI } from "../comune/articolazioni-b.js";
import { riempiRischioStrutturale } from "../comune/vista-reds.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagina = readFileSync(join(radice, "desktop", "index.html"), "utf8");

const settimane = (serie) => Array.from({ length: 8 }, (_, i) => ({
  week: i + 1,
  sets: Array.isArray(serie) ? serie[i] : serie,
  reps: "10"
}));
const ESE = (nome, serie) => ({ id: "ex-" + nome, nome: nome, muscolo: "x", prescrizione: { elencoSettimane: settimane(serie) } });

/* Scheda di prova (nomi identici al catalogo):
 *  Panca piana     4 -> spalla 4 (20%), gomito 2
 *  Curl manubri    3 -> gomito 3 (tot 5 = 31,25%), polso 1,5 (15%)
 *  Hip Thrust      5 -> anca 5 (22,73%), ginocchio 2,5
 *  Leg Extension   4 -> ginocchio 4 (tot 6,5 = 29,55%)
 *  Calf machine    3,4,5,5,4,3,2,2 -> caviglia max 5 in settimana 3 (41,67%)
 *  Crunch classici 2 -> colonna lombare 2 (11,11%), toracica 1 (5,56%)
 */
const scheda = {
  codice: "A",
  esercizi: [
    ESE("Panca piana", 4),
    ESE("Curl manubri", 3),
    ESE("Hip Thrust", 5),
    ESE("Leg Extension", 4),
    ESE("Calf machine", [3, 4, 5, 5, 4, 3, 2, 2]),
    ESE("Crunch classici", 2)
  ]
};
const voce = (r, nome) => r.articolazioni.filter((a) => a.articolazione === nome)[0] || null;
const cent = (v) => Math.round(v * 100) / 100;

test("130.1 le otto tolleranze sono quelle decise con Alice, e sono congelate", () => {
  assert.deepEqual(TOLLERANZE, {
    "spalla": 20, "gomito": 16, "polso": 10, "anca": 22,
    "ginocchio": 22, "caviglia": 12, "colonna lombare": 18, "colonna toracica": 18
  });
  assert.equal(Object.isFrozen(TOLLERANZE), true);
  assert.deepEqual(ARTICOLAZIONI.slice().sort(), Object.keys(TOLLERANZE).sort());
  assert.equal(tolleranzaDi("caviglia"), 12);
  assert.equal(tolleranzaDi("collo"), null, "il collo non ha tolleranza: non è nel catalogo");
  try { TOLLERANZE.spalla = 1; } catch (e) { /* congelato: in strict lancia */ }
  assert.equal(TOLLERANZE.spalla, 20);
});

test("130.2 massimo settimanale, percentuale e settimana del massimo: conto a mano", () => {
  const r = stressRiepilogo(scheda);
  assert.equal(r.leggibile, true);
  assert.equal(r.righeContate, 6);

  assert.equal(voce(r, "spalla").massimo, 4);
  assert.equal(cent(voce(r, "spalla").percentuale), 20, "4 su 20");
  assert.equal(voce(r, "spalla").massimoSettimana, 1);

  assert.equal(voce(r, "gomito").massimo, 5);
  assert.equal(cent(voce(r, "gomito").percentuale), 31.25, "5 su 16");

  assert.equal(voce(r, "polso").massimo, 1.5);
  assert.equal(cent(voce(r, "polso").percentuale), 15, "1,5 su 10");

  assert.equal(voce(r, "anca").massimo, 5);
  assert.equal(cent(voce(r, "anca").percentuale), 22.73, "5 su 22");

  assert.equal(voce(r, "ginocchio").massimo, 6.5, "2,5 da Hip Thrust + 4 da Leg Extension");
  assert.equal(cent(voce(r, "ginocchio").percentuale), 29.55, "6,5 su 22");

  const caviglia = voce(r, "caviglia");
  assert.equal(caviglia.massimo, 5);
  assert.equal(caviglia.massimoSettimana, 3, "il picco è in settimana 3, non in 1");
  assert.equal(cent(caviglia.percentuale), 41.67, "5 su 12");

  assert.equal(voce(r, "colonna lombare").massimo, 2);
  assert.equal(cent(voce(r, "colonna lombare").percentuale), 11.11);
  assert.equal(voce(r, "colonna toracica").massimo, 1);
  assert.equal(cent(voce(r, "colonna toracica").percentuale), 5.56);
});

test("130.3 media, articolazione più sollecitata e nessuna sopra il 100%", () => {
  const r = stressRiepilogo(scheda);
  /* (20 + 31,25 + 15 + 22,7272… + 29,5454… + 41,6666… + 11,1111… + 5,5555…) / 8 */
  const atteso = (20 + 31.25 + 15 + (5 / 22) * 100 + (6.5 / 22) * 100 + (5 / 12) * 100 + (2 / 18) * 100 + (1 / 18) * 100) / 8;
  assert.equal(cent(r.media), cent(atteso));
  assert.equal(r.mediaIntera, Math.round(atteso));
  assert.equal(r.mediaIntera, 22, "media 176,86 / 8 = 22,11 → 22");
  assert.equal(r.piuSollecitata.articolazione, "caviglia");
  assert.equal(cent(r.piuSollecitata.percentuale), 41.67);
  assert.deepEqual(r.sopraCento, []);
});

test("130.4 chi passa il 100% finisce nell'elenco, e la somma resta invariata", () => {
  const troppe = { codice: "A", esercizi: [ESE("Calf machine", 13)] };
  const r = stressRiepilogo(troppe);
  assert.equal(cent(voce(r, "caviglia").percentuale), 108.33, "13 su 12");
  assert.equal(voce(r, "caviglia").sopraCento, true);
  assert.deepEqual(r.sopraCento, ["caviglia"]);
  assert.equal(r.piuSollecitata.articolazione, "caviglia");
});

test("130.5 una scheda non leggibile non diventa mai zero", () => {
  const r = stressRiepilogo({ codice: "A", esercizi: [] });
  assert.equal(r.leggibile, false);
  assert.equal(r.media, null);
  assert.equal(r.mediaIntera, null);
  assert.deepEqual(r.articolazioni, []);
  assert.match(r.motivo, /non ha esercizi/);

  const vuota = stressRiepilogo({ codice: "A", esercizi: [ESE("Leg press steso", 4)] });
  assert.equal(vuota.leggibile, true, "Leg press steso conta nel volume: la scheda è leggibile");
  const zero = stressRiepilogo(null);
  assert.equal(zero.leggibile, false);
});

test("130.6 sulla pagina vera la carta mostra la struttura più caricata", () => {
  const dom = new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
  const doc = dom.window.document;
  const r = riempiRischioStrutturale(doc, scheda);
  assert.ok(r && r.leggibile);

  const carta = doc.querySelector("#pag-dashboard .ck-red");
  assert.ok(carta, "la carta RED-S c'è");
  assert.equal(carta.getAttribute("data-reds"), "calcolato");
  /* PASSO 6e: il numero grande e' la struttura piu' caricata, non la media */
  assert.equal(carta.querySelector("[data-reds-num]").textContent, "42%");
  assert.equal(carta.querySelector("[data-reds-stato]").textContent, "caviglia");
  assert.equal(carta.querySelector("[data-reds-piu]").textContent, "caviglia · 42%");
  const nota = carta.querySelector("[data-reds-nota]").textContent;
  assert.match(nota, /Calcolato sulla scheda attiva: 8 articolazioni, tolleranze di partenza/);
  assert.match(nota, /6 righe lette/);
  /* Il resto della Dashboard non si tocca: l'MRV resta com'è. */
  assert.equal(doc.querySelectorAll("#pag-dashboard .ck-red").length, 1);
  const mrv = Array.from(doc.querySelectorAll("#pag-dashboard .ck-dove-r"))
    .filter((d) => d.textContent.indexOf("MRV") > -1)[0];
  assert.ok(mrv, "la riga MRV esiste ancora");
  assert.equal(mrv.querySelector("b").textContent, "MRV non definiti");
});

test("130.7 senza scheda la carta dice perché, e non mostra zeri", () => {
  const dom = new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
  const doc = dom.window.document;
  riempiRischioStrutturale(doc, null);
  const carta = doc.querySelector("#pag-dashboard .ck-red");
  assert.equal(carta.getAttribute("data-reds"), "non-calcolabile");
  assert.equal(carta.querySelector("[data-reds-num]").textContent, "—");
  assert.doesNotMatch(carta.querySelector("[data-reds-num]").textContent, /0%/);
  assert.equal(carta.querySelector("[data-reds-stato]").textContent, "non calcolabile");
  assert.match(carta.querySelector("[data-reds-nota]").textContent, /nessuna scheda da leggere/);
});
