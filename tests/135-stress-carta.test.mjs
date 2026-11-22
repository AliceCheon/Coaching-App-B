/* tests/135-stress-carta.test.mjs — PASSO 6h.
 *
 * La carta «Stress allenamento» della Dashboard disegna le otto articolazioni
 * sulla pagina vera (jsdom). Deve leggere la stessa fonte del RED-S
 * (stressSettimana, un conto solo), dare gli stessi numeri, mettere la tacca
 * della soglia solo dove la struttura la passa e non dire piu' la vecchia
 * frase «35 esercizi su 35 non hanno un'articolazione associata».
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM } from "jsdom";

import { stressSettimana, serieInParola } from "../comune/articolazioni-b.js";
import { riempiRischioDaZonaBSicuro } from "../comune/vista-reds.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagina = readFileSync(join(radice, "desktop", "index.html"), "utf8");

const settimane = (serie) => Array.from({ length: 8 }, (_, i) => ({
  week: i + 1, sets: Array.isArray(serie) ? serie[i] : serie, reps: "10"
}));
const ESE = (nome, serie) => ({ id: "ex-" + nome, nome: nome, muscolo: "x", prescrizione: { elencoSettimane: settimane(serie) } });
const SCHEDA = (codice, settimana, esercizi) => ({ id: "s-" + codice, codice: codice, settimana: settimana, ordine: codice.charCodeAt(0) - 64, esercizi: esercizi });

const zona = (schede, settimana) => ({
  programmi: [{ id: "p1", name: "Forza 1", status: "active" }],
  sedute: settimana == null ? [] : [{ id: 1000000003, source: "App", week: settimana }],
  schedeV2: { perProgramma: { p1: { programId: "p1", schede: schede, archiviate: [] } }, totale: {} }
});
const paginaNuova = () => new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
const carta = (doc) => doc.querySelector("#pag-dashboard .ck-st");
const righe = (doc) => [...carta(doc).querySelectorAll("[data-stress-r]")];
const nota = (doc) => carta(doc).querySelector("[data-stress-nota]").textContent;

/* Settimana 3, tolleranze del progetto: spalla 20, gomito 16, polso 10,
 * anca 22, ginocchio 22, caviglia 12, lombare 18, toracica 18. */
const A = SCHEDA("A", 3, [ESE("Panca piana", 4)]);
const B = SCHEDA("B", 3, [ESE("Curl manubri", 3)]);
const C = SCHEDA("C", 3, [ESE("Leg Extension", 4)]);
const D = SCHEDA("D", 3, [ESE("Calf machine", 6)]);
const settimana3 = [A, B, C, D];
const riepilogoDi = (schede) => stressSettimana(schede);

test("135.1 le otto righe ci sono, e la piu' carica e' la prima", () => {
  const dom = paginaNuova();
  const doc = dom.window.document;
  riempiRischioDaZonaBSicuro(doc, zona(settimana3, 3));
  const r = righe(doc);
  assert.equal(r.length, 8);
  const atteso = riepilogoDi(settimana3);
  assert.deepEqual(r.map((x) => x.getAttribute("data-stress-r")), atteso.classifica.map((v) => v.articolazione));
  assert.equal(r[0].getAttribute("data-stress-r"), "caviglia");
  assert.equal(carta(doc).getAttribute("data-stress"), "calcolato");
});

test("135.2 le serie a schermo sono quelle del conto, uguali alla carta RED-S", () => {
  const dom = paginaNuova();
  const doc = dom.window.document;
  riempiRischioDaZonaBSicuro(doc, zona(settimana3, 3));
  const atteso = riepilogoDi(settimana3);
  const aSchermo = righe(doc).map((x) => x.querySelector(".ck-st-rv").textContent);
  assert.deepEqual(aSchermo, atteso.classifica.map((v) => serieInParola(v.massimo) + " serie"));
  assert.equal(aSchermo[0], "6 serie", "la caviglia porta 6 serie");
  assert.equal(aSchermo.length, 8);
  aSchermo.forEach((t) => assert.match(t, /^[0-9]+(,[0-9]+)? serie$/));
  /* stessi numeri, nello stesso ordine, della carta RED-S */
  const reds = [...doc.querySelectorAll("#pag-dashboard .ck-red-rv")].map((x) => x.textContent);
  assert.deepEqual(aSchermo, reds);
  const nomi = righe(doc).map((x) => x.querySelector(".ck-st-rnm").textContent);
  assert.deepEqual(nomi, atteso.classifica.map((v) => v.articolazione));
  assert.ok(righe(doc)[0].querySelector(".ck-st-rb i").style.width);
});

test("135.3 la tacca c'e' solo sopra la soglia di partenza", () => {
  const senza = paginaNuova();
  riempiRischioDaZonaBSicuro(senza.window.document, zona(settimana3, 3));
  assert.equal(senza.window.document.querySelectorAll(".ck-st-rb em").length, 0,
    "nessuna struttura passa la soglia: nessuna tacca");
  righe(senza.window.document).forEach((r) => assert.ok(!r.className.includes("su")));

  /* caviglia 20 serie su una soglia di 12: 166%, la passa */
  const su = paginaNuova();
  const doc = su.window.document;
  riempiRischioDaZonaBSicuro(doc, zona([SCHEDA("A", 3, [ESE("Calf machine", 20)])], 3));
  const tacche = [...doc.querySelectorAll(".ck-st-rb em")];
  assert.equal(tacche.length, 1);
  assert.equal(tacche[0].closest("[data-stress-r]").getAttribute("data-stress-r"), "caviglia");
  assert.equal(tacche[0].style.left, "60%");
  assert.ok(righe(doc)[0].className.includes("su"));
});

test("135.4 senza scheda leggibile la carta dice il motivo, non gli zeri", () => {
  const dom = paginaNuova();
  const doc = dom.window.document;
  riempiRischioDaZonaBSicuro(doc, zona(settimana3, null));
  assert.equal(carta(doc).getAttribute("data-stress"), "calcolato");
  const vuota = paginaNuova();
  const d2 = vuota.window.document;
  riempiRischioDaZonaBSicuro(d2, { programmi: [], sedute: [], schedeV2: { perProgramma: {}, totale: {} } });
  assert.equal(carta(d2).getAttribute("data-stress"), "non-calcolabile");
  assert.equal(righe(d2).length, 0);
  assert.match(nota(d2), /^Non calcolato: nessun programma attivo\./);
  assert.ok(nota(d2).indexOf("0 serie") === -1);
});

test("135.5 la vecchia frase sul non mappato non c'e' piu'", () => {
  assert.equal(pagina.indexOf("35 esercizi su 35"), -1);
  assert.equal(pagina.indexOf("Serve la mappa articolare"), -1);
  assert.equal(pagina.indexOf("data-stress-righe"), pagina.lastIndexOf("data-stress-righe"),
    "un solo contenitore per le righe");
});
