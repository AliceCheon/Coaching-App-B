/* tests/133-settimana-intera.test.mjs — PASSO 6e.
 *
 * Lo sbaglio da correggere: la carta guardava UNA scheda (la prima della
 * settimana). Con A/B/C/D il carico era quello di una seduta sola. Qui si
 * verifica che la settimana si sommi, che il numero grande sia la struttura
 * piu' caricata (non una media) e che la classifica scenda.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM } from "jsdom";

import { stressSettimana } from "../comune/articolazioni-b.js";
import { schedaPerRischio, riempiRischioDaZonaBSicuro } from "../comune/vista-reds.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagina = readFileSync(join(radice, "desktop", "index.html"), "utf8");

const settimane = (serie) => Array.from({ length: 8 }, (_, i) => ({
  week: i + 1, sets: Array.isArray(serie) ? serie[i] : serie, reps: "10"
}));
const ESE = (nome, serie) => ({ id: "ex-" + nome, nome: nome, muscolo: "x", prescrizione: { elencoSettimane: settimane(serie) } });
const SCHEDA = (codice, settimana, esercizi) => ({ id: "s-" + codice, codice: codice, settimana: settimana, ordine: codice.charCodeAt(0) - 64, esercizi: esercizi });

/* Settimana 3, quattro sedute:
 *  A Panca piana 4    -> spalla 4   (4/20 = 20%)
 *  B Curl manubri 3   -> gomito 3 (18,75%), polso 1,5 (15%)
 *  C Leg Extension 4  -> ginocchio 4 (18,18%)
 *  D Calf machine 6   -> caviglia 6 (50%)
 */
const A = SCHEDA("A", 3, [ESE("Panca piana", 4)]);
const B = SCHEDA("B", 3, [ESE("Curl manubri", 3)]);
const C = SCHEDA("C", 3, [ESE("Leg Extension", 4)]);
const D = SCHEDA("D", 3, [ESE("Calf machine", 6)]);
const settimana3 = [A, B, C, D];

const zona = (schede, settimana) => ({
  programmi: [{ id: "p1", name: "Forza 1", status: "active" }],
  sedute: settimana == null ? [] : [{ id: 1000000003, source: "App", week: settimana }],
  schedeV2: { perProgramma: { p1: { programId: "p1", schede: schede, archiviate: [] } }, totale: {} }
});
const paginaNuova = () => new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
const carta = (doc) => doc.querySelector("#pag-dashboard .ck-red");
const testo = (doc, sel) => carta(doc).querySelector(sel).textContent;
const voce = (r, a) => r.articolazioni.filter((x) => x.articolazione === a)[0];

test("133.1 quattro schede nella settimana 3: si prendono tutte e la nota lo dichiara", () => {
  const scelta = schedaPerRischio(zona(settimana3, 3));
  assert.equal(scelta.motivo, null);
  assert.equal(scelta.nSchede, 4);
  assert.deepEqual(scelta.codici, ["A", "B", "C", "D"]);
  assert.equal(scelta.settimana, 3);
  assert.deepEqual(scelta.calcolo, { codici: ["A", "B", "C", "D"], settimana: 3 });

  const dom = paginaNuova();
  const doc = dom.window.document;
  riempiRischioDaZonaBSicuro(doc, zona(settimana3, 3));
  assert.equal(carta(doc).getAttribute("data-reds"), "calcolato");
  const nota = testo(doc, "[data-reds-nota]");
  assert.match(nota, /sedute A, B, C, D della settimana 3/);
  assert.match(nota, /4 sedute, 4 righe lette/);
});

test("133.2 la settimana si SOMMA: il carico non è quello della prima scheda", () => {
  const prima = stressSettimana([A]);
  const tutta = stressSettimana(settimana3);

  assert.equal(voce(prima, "ginocchio").massimo, 0, "la scheda A da sola non carica il ginocchio");
  assert.equal(voce(tutta, "ginocchio").massimo, 4, "il ginocchio arriva dalla scheda C");
  assert.equal(voce(tutta, "gomito").massimo, 5, "3 da Curl manubri + 2 da Panca piana");
  assert.equal(voce(tutta, "polso").massimo, 1.5);
  assert.equal(voce(tutta, "spalla").massimo, 4, "una riga vale una volta: non 8");
  assert.equal(tutta.righeContate, 4);
  assert.equal(tutta.schedeLette, 4);
  /* e due sedute con lo stesso esercizio si sommano davvero */
  const due = stressSettimana([A, SCHEDA("B", 3, [ESE("Panca piana", 4)])]);
  assert.equal(voce(due, "spalla").massimo, 8);
});

test("133.3 il numero grande è la struttura più caricata, non la media", () => {
  const r = stressSettimana(settimana3);
  assert.equal(r.piuCaricata.articolazione, "caviglia");
  assert.equal(Math.round(r.piuCaricata.percentuale), 50);
  assert.equal(Object.prototype.hasOwnProperty.call(r, "media"), false, "la media sparisce");

  const dom = paginaNuova();
  const doc = dom.window.document;
  riempiRischioDaZonaBSicuro(doc, zona(settimana3, 3));
  assert.equal(testo(doc, "[data-reds-num]"), "50%");
  assert.equal(testo(doc, "[data-reds-stato]"), "caviglia");
  assert.equal(testo(doc, "[data-reds-piu]"), "caviglia · 50%");
  assert.doesNotMatch(testo(doc, "[data-reds-stato]"), /media/);
});

test("133.4 la classifica scende, ha otto righe, barra sulla più carica e tacca al 100%", () => {
  const r = stressSettimana(settimana3);
  const pct = r.classifica.map((x) => Math.round(x.percentuale * 100) / 100);
  const ordinata = pct.slice().sort((a, b) => b - a);
  assert.deepEqual(pct, ordinata, "dalla più caricata alla meno");
  assert.equal(r.classifica.length, 8);
  assert.equal(r.classifica[0].articolazione, "caviglia");

  const dom = paginaNuova();
  const doc = dom.window.document;
  riempiRischioDaZonaBSicuro(doc, zona(settimana3, 3));
  const righe = Array.from(doc.querySelectorAll("[data-reds-classifica] .ck-red-r"));
  assert.equal(righe.length, 8);
  assert.equal(righe[0].querySelector(".ck-red-rn").textContent, "caviglia");
  assert.equal(righe[0].querySelector(".ck-red-rv").textContent, "6 serie");
  assert.equal(Math.round(parseFloat(righe[0].querySelector(".ck-red-rb i").style.width)), 100, "la barra è proporzionata alla più carica");
  assert.equal(righe[0].querySelector(".ck-red-rb em"), null, "sotto il 100% la tacca non serve");

  /* una settimana che passa il 100%: la tacca compare e la riga si segna */
  const oltre = stressSettimana([SCHEDA("A", 3, [ESE("Calf machine", 13)])]);
  assert.equal(Math.round(oltre.piuCaricata.percentuale), 108);
  const dom2 = paginaNuova();
  const doc2 = dom2.window.document;
  riempiRischioDaZonaBSicuro(doc2, zona([SCHEDA("A", 3, [ESE("Calf machine", 13)])], 3));
  const prima = doc2.querySelector("[data-reds-classifica] .ck-red-r");
  assert.ok(prima.querySelector(".ck-red-rb em"), "la tacca al 100% c'è");
  assert.ok(prima.className.indexOf("su") > -1);
  assert.equal(testo(doc2, "[data-reds-num]"), "108%");
});

test("133.5 senza settimana determinabile: tutte le schede, e l'intervallo è scritto", () => {
  const scelta = schedaPerRischio(zona(settimana3, null));
  assert.equal(scelta.nSchede, 4);
  assert.equal(scelta.settimana, null);
  const dom = paginaNuova();
  const doc = dom.window.document;
  riempiRischioDaZonaBSicuro(doc, zona(settimana3, null));
  const nota = testo(doc, "[data-reds-nota]");
  assert.match(nota, /tutte le schede del programma/i);
  assert.match(nota, /4 sedute, 4 righe lette/);
});
