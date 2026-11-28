/* tests/132-nomi-tolleranti.test.mjs — PASSO 6c-fix-3.
 *
 * I nomi arrivano dall'Excel: maiuscole, spazi doppi, accenti, «1x». Devono
 * dare gli STESSI punti del nome esatto. Un nome che non si riconosce non
 * inventa niente: conta come non mappato e la nota lo dice con i numeri.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM } from "jsdom";

import { articolazioniDi, nomeNormalizzato, stressArticolazioni, stressRiepilogo } from "../comune/articolazioni-b.js";
import { riempiRischioDaZonaBSicuro } from "../comune/vista-reds.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagina = readFileSync(join(radice, "desktop", "index.html"), "utf8");

const settimane = (serie) => Array.from({ length: 8 }, (_, i) => ({
  week: i + 1, sets: Array.isArray(serie) ? serie[i] : serie, reps: "10"
}));
const ESE = (nome, serie) => ({ id: "ex-" + nome, nome: nome, muscolo: "x", prescrizione: { elencoSettimane: settimane(serie) } });

const SERIE = [4, 3, 5, 4, [3, 4, 5, 5, 4, 3, 2, 2], 2];
const ESATTI = ["Panca piana", "Curl manubri", "Hip Thrust", "Leg Extension", "Calf machine", "Crunch classici"];
const scheda = (nomi) => ({ codice: "A", esercizi: nomi.map((n, i) => ESE(n, SERIE[i])) });

const paginaNuova = () => new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
const carta = (doc) => doc.querySelector("#pag-dashboard .ck-red");
const testo = (doc, sel) => carta(doc).querySelector(sel).textContent;
const zona = (s) => ({
  programmi: [{ id: "p1", name: "Forza 1", status: "active" }],
  sedute: [],
  schedeV2: { perProgramma: { p1: { programId: "p1", schede: [s], archiviate: [] } }, totale: {} }
});
const massimi = (s) => stressRiepilogo(s).articolazioni.map((a) => Math.round(a.massimo * 100) / 100);

test("132.1 maiuscolo, spazi doppi, accenti e «1x»: stessi punti del nome esatto", () => {
  assert.equal(nomeNormalizzato("  Leg   Extensìon "), "leg extension");
  assert.equal(nomeNormalizzato("Calf machine 1x"), "calf machine");
  const storti = ["PANCA PIANA", "curl   manubri", " Hip Thrust ", "Leg  Extensìon", "Calf machine 1x", "crunch classìci"];
  assert.deepEqual(massimi(scheda(storti)), massimi(scheda(ESATTI)));
  const r = stressRiepilogo(scheda(storti));
  /* 25 dal 28/11: l'Hip Thrust carica anche la caviglia (confermato da Alice). */
  assert.equal(r.mediaIntera, 25, "la media resta quella del nome esatto");
  assert.equal(r.piuSollecitata.articolazione, "caviglia");
  assert.equal(r.righeConArticolazione, 6);
  assert.equal(r.righeSenza, 0);
  assert.equal(r.nomiNonRiconosciuti.length, 0);
});

test("132.2 nome sconosciuto: non mappato, zero punti, nessun errore, nota coi numeri", () => {
  const art = articolazioniDi("Esercizio Inventato 3000");
  assert.equal(art.nonMappato, true);
  assert.deepEqual(Object.keys(art.punti), []);
  const conto = stressArticolazioni(scheda(["Panca piana", "Esercizio Inventato 3000"]));
  assert.equal(conto.righeContate, 2);
  assert.equal(conto.righeConArticolazione, 1);
  assert.equal(conto.righeNonMappate, 1);
  assert.deepEqual(conto.nonMappati, ["Esercizio Inventato 3000"]);

  const dom = paginaNuova();
  const doc = dom.window.document;
  riempiRischioDaZonaBSicuro(doc, zona(scheda(["Panca piana", "Esercizio Inventato 3000"])));
  assert.equal(carta(doc).getAttribute("data-reds"), "calcolato");
  const nota = testo(doc, "[data-reds-nota]");
  assert.match(nota, /2 righe lette/);
  assert.match(nota, /1 righe con articolazione, 1 senza/);
  assert.match(nota, /non riconosciuti: «Esercizio Inventato 3000»/);
});

test("132.3 nome che contiene DUE chiavi non si indovina: resta non mappato", () => {
  const art = articolazioniDi("Trazioni neutre supine");
  assert.equal(art.nonMappato, true);
  assert.equal(art.come, "ambiguo");
  /* e il nome che contiene UNA sola chiave si riconosce */
  const uno = articolazioniDi("Panca piana con bilanciere");
  assert.equal(uno.nonMappato, false);
  assert.equal(uno.catalogo, "Panca piana");
  assert.equal(uno.come, "contiene");
});

test("132.4 tutte a zero: la riga dice che nessun esercizio ha dato punti", () => {
  const soloCardio = scheda(["Vogatore", "Esercizio Inventato 3000"]);
  const r = stressRiepilogo(soloCardio);
  assert.equal(r.leggibile, true);
  assert.equal(r.tutteAZero, true);
  const dom = paginaNuova();
  const doc = dom.window.document;
  riempiRischioDaZonaBSicuro(doc, zona(soloCardio));
  assert.equal(testo(doc, "[data-reds-piu]"), "nessun esercizio ha dato punti");
  assert.doesNotMatch(testo(doc, "[data-reds-piu]"), /·/);
});

test("132.5 il conto lancia: la nota scrive l'errore e la pagina va avanti", () => {
  const dom = paginaNuova();
  const doc = dom.window.document;
  const rotto = { sedute: [], schedeV2: { perProgramma: {} } };
  Object.defineProperty(rotto, "programmi", { get() { throw new Error("boom"); } });
  const esito = riempiRischioDaZonaBSicuro(doc, rotto);
  assert.equal(esito.errore, "boom");
  assert.equal(carta(doc).getAttribute("data-reds"), "errore");
  assert.match(testo(doc, "[data-reds-nota]"), /Errore nel calcolo: boom/);
  assert.equal(testo(doc, "[data-reds-num]"), "\u2014");
  /* il resto della pagina non si ferma */
  assert.ok(doc.querySelector("#pag-dashboard"));
  assert.equal(doc.querySelectorAll("#pag-dashboard .ck-red").length, 1);
});
