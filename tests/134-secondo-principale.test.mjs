/* tests/134-secondo-principale.test.mjs — PASSO 6f.
 *
 * Nei modelli di squat, affondo, stacco e nei rematori o military in piedi la
 * colonna lombare non aiuta: PORTA il carico, e vale 1 punto come una
 * principale. Il tetto di 2 punti per esercizio resta. E la carta non parla
 * piu' in percentuale: il numero grande sono le serie della struttura piu'
 * caricata.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM } from "jsdom";

import {
  articolazioniDi, eserciziConSecondoPrincipale, modelloDiCarico,
  stressSettimana, TETTO_ESERCIZIO
} from "../comune/articolazioni-b.js";
import { riempiRischioDaZonaBSicuro } from "../comune/vista-reds.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagina = readFileSync(join(radice, "desktop", "index.html"), "utf8");

const settimane = (serie) => Array.from({ length: 8 }, (_, i) => ({
  week: i + 1, sets: Array.isArray(serie) ? serie[i] : serie, reps: "10"
}));
const ESE = (nome, serie) => ({ id: "ex-" + nome, nome: nome, muscolo: "x", prescrizione: { elencoSettimane: settimane(serie) } });

/* Front squat 4 -> ginocchio 4, lombare 4
 * Bulgaro focus glutei 3 -> anca 3, lombare 3
 * Squat 5 -> ginocchio 5, lombare 5 (l'anca a 0,5 esce: tetto 2) */
const scheda = {
  codice: "A", settimana: 3, ordine: 1,
  esercizi: [ESE("Front squat machine", 4), ESE("Bulgaro focus glutei", 3), ESE("Squat", 5)]
};
const zona = (s) => ({
  programmi: [{ id: "p1", name: "Forza 1", status: "active" }],
  sedute: [{ id: 1000000003, source: "App", week: 3 }],
  schedeV2: { perProgramma: { p1: { programId: "p1", schede: [s], archiviate: [] } }, totale: {} }
});
const paginaNuova = () => new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
const carta = (doc) => doc.querySelector("#pag-dashboard .ck-red");
const testo = (doc, sel) => carta(doc).querySelector(sel).textContent;
const voce = (r, a) => r.articolazioni.filter((x) => x.articolazione === a)[0];

test("134.1 nei modelli che portano carico la lombare vale 1 per riga", () => {
  assert.equal(modelloDiCarico("Front squat machine"), "squat");
  assert.equal(modelloDiCarico("Bulgaro focus glutei"), "affondo");
  assert.equal(modelloDiCarico("Stacco Regular"), "stacco");
  assert.equal(modelloDiCarico("Rematore bilanciere"), "rematore");
  assert.equal(modelloDiCarico("Military press"), "military in piedi");
  assert.equal(modelloDiCarico("Panca piana"), null);

  assert.equal(articolazioniDi("Front squat machine").punti["colonna lombare"], 1);
  assert.equal(articolazioniDi("Bulgaro focus glutei").punti["colonna lombare"], 1);
  assert.equal(articolazioniDi("Stacco Sumo").punti["colonna lombare"], 1);
  assert.equal(articolazioniDi("Rematore bilanciere").punti["colonna lombare"], 1);
  assert.deepEqual(articolazioniDi("Front squat machine").secondiPrincipali, ["colonna lombare"]);
  /* fuori dai modelli resta com'era */
  assert.equal(articolazioniDi("Panca piana").punti["colonna lombare"], undefined);
  assert.equal(articolazioniDi("Rematore manubri panca 30°").punti["colonna lombare"], undefined,
    "il rematore appoggiato alla panca non porta carico sulla schiena");

  const r = stressSettimana([scheda]);
  assert.equal(voce(r, "colonna lombare").massimo, 12, "4 + 3 + 5 serie, una per riga");
  assert.equal(voce(r, "ginocchio").massimo, 9, "4 da front squat + 5 dallo squat");
  assert.equal(voce(r, "anca").massimo, 3);
});

test("134.2 il tetto di 2 punti resta: la seconda secondaria esce", () => {
  const squat = articolazioniDi("Squat");
  const totale = Object.keys(squat.punti).reduce((a, k) => a + squat.punti[k], 0);
  assert.equal(totale, TETTO_ESERCIZIO);
  assert.equal(squat.punti["colonna lombare"], 1);
  assert.equal(squat.secondarie.indexOf("anca"), -1, "l'anca a 0,5 esce per fare posto alla lombare");
  assert.ok(squat.modello);

  eserciziConSecondoPrincipale().forEach((x) => {
    const t = Object.keys(x.punti).reduce((a, k) => a + x.punti[k], 0);
    assert.ok(t <= TETTO_ESERCIZIO, x.catalogo + " passa il tetto: " + t);
  });
});

test("134.3 il report elenca chi ha guadagnato peso", () => {
  const elenco = eserciziConSecondoPrincipale();
  const nomi = elenco.map((x) => x.catalogo);
  ["Bulgaro focus glutei", "Front squat machine", "Pendulum", "Stacco Regular", "Rematore bilanciere"]
    .forEach((n) => assert.ok(nomi.indexOf(n) > -1, n + " manca dal report"));
  assert.ok(elenco.length > 20, "il secondo principale tocca tutte le famiglie, non due righe");
  elenco.forEach((x) => assert.deepEqual(x.secondiPrincipali, ["colonna lombare"]));
});

test("134.4 il numero grande è in serie, non in percentuale", () => {
  const dom = paginaNuova();
  const doc = dom.window.document;
  riempiRischioDaZonaBSicuro(doc, zona(scheda));
  assert.equal(testo(doc, "[data-reds-num]"), "12 serie");
  assert.equal(testo(doc, "[data-reds-stato]"), "colonna lombare");
  assert.equal(testo(doc, "[data-reds-piu]"), "colonna lombare · 12 serie");
  assert.doesNotMatch(testo(doc, "[data-reds-num]"), /%/);
  assert.doesNotMatch(testo(doc, "[data-reds-piu]"), /%/);
  assert.match(testo(doc, "[data-reds-nota]"), /sedute A della settimana 3 — 1 seduta, 3 righe lette/);
});

test("134.5 la classifica è ordinata per serie, e la soglia sta nella riga", () => {
  const r = stressSettimana([scheda]);
  const serie = r.classifica.map((x) => x.massimo);
  assert.deepEqual(serie, serie.slice().sort((a, b) => b - a), "dalla più caricata alla meno");
  assert.equal(r.classifica[0].articolazione, "colonna lombare");
  assert.equal(r.classifica[0].massimo, 12);

  const dom = paginaNuova();
  const doc = dom.window.document;
  riempiRischioDaZonaBSicuro(doc, zona(scheda));
  const righe = Array.from(doc.querySelectorAll("[data-reds-classifica] .ck-red-r"));
  assert.equal(righe.length, 8);
  assert.equal(righe[0].querySelector(".ck-red-rnm").textContent, "colonna lombare");
  assert.equal(righe[0].querySelector(".ck-red-rv").textContent, "12 serie");
  /* la tolleranza si legge in chiaro, senza percentuali in evidenza */
  const soglie = righe.map((x) => x.querySelector(".ck-red-rs").textContent);
  assert.equal(soglie[0], "soglia di partenza: 18");
  assert.ok(soglie.every((t) => /^soglia di partenza: \d+$/.test(t)));
  assert.equal(righe[0].querySelector(".ck-red-rb em"), null, "sotto soglia la tacca non serve");
});
