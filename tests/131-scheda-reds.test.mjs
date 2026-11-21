/* tests/131-scheda-reds.test.mjs — PASSO 6c: la scheda attiva arriva alla carta RED-S.
 *
 * Sola lettura: la zona B finta qui sotto ha la stessa forma che la pagina
 * riceve da leggiZonaBCompleta (programmi, sedute, schedeV2). Le prove
 * guardano la scelta della scheda e poi la carta sulla PAGINA VERA (jsdom).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM } from "jsdom";

import { schedaPerRischio, riempiRischioDaZonaB } from "../comune/vista-reds.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagina = readFileSync(join(radice, "desktop", "index.html"), "utf8");

const settimane = (serie) => Array.from({ length: 8 }, (_, i) => ({
  week: i + 1,
  sets: Array.isArray(serie) ? serie[i] : serie,
  reps: "10"
}));
const ESE = (nome, serie) => ({ id: "ex-" + nome, nome: nome, muscolo: "x", prescrizione: { elencoSettimane: settimane(serie) } });

/* Scheda A = quella del test 130: media 22%, più sollecitata la caviglia (42%). */
const schedaA = {
  id: "s1", codice: "A", settimana: 1, ordine: 1,
  esercizi: [
    ESE("Panca piana", 4), ESE("Curl manubri", 3), ESE("Hip Thrust", 5),
    ESE("Leg Extension", 4), ESE("Calf machine", [3, 4, 5, 5, 4, 3, 2, 2]), ESE("Crunch classici", 2)
  ]
};
/* Scheda B: solo caviglia, 13 serie = 108,33% → media 108,33/8 = 13,54 → 14%. */
const schedaB = { id: "s2", codice: "B", settimana: 2, ordine: 2, esercizi: [ESE("Calf machine", 13)] };

const zona = (extra) => Object.assign({
  programmi: [{ id: "p1", name: "Forza 1", status: "active" }],
  sedute: [],
  schedeV2: { perProgramma: { p1: { programId: "p1", schede: [schedaA, schedaB], archiviate: [] } }, totale: {} }
}, extra || {});

const paginaNuova = () => new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
const carta = (doc) => doc.querySelector("#pag-dashboard .ck-red");
const testo = (doc, sel) => carta(doc).querySelector(sel).textContent;

test("131.1 con una settimana corrente la carta guarda la scheda di quella settimana", () => {
  const scelta = schedaPerRischio(zona({ sedute: [{ id: 1000000001, source: "App", week: 2 }] }));
  assert.equal(scelta.scheda.codice, "B");
  assert.equal(scelta.settimana, 2);
  assert.match(scelta.fonte, /scheda della settimana 2/);
  assert.equal(scelta.motivo, null);
});

test("131.2 senza settimana corrente la carta prende tutte le schede del programma", () => {
  const scelta = schedaPerRischio(zona());
  assert.equal(scelta.scheda.codice, "A", "la prima per settimana, poi per ordine");
  assert.deepEqual(scelta.codici, ["A", "B"], "PASSO 6e: la settimana intera, non una scheda");
  assert.equal(scelta.settimana, null);
  assert.match(scelta.fonte, /tutte le schede del programma/);
  /* e se la settimana corrente non ha una scheda, si ripiega sulla prima, dichiarandolo */
  const senza = schedaPerRischio(zona({ sedute: [{ id: 1000000002, source: "App", week: 7 }] }));
  assert.equal(senza.scheda.codice, "A");
  assert.match(senza.fonte, /la settimana 7 non ha una scheda/);
  assert.deepEqual(senza.codici, ["A", "B"], "ripiego dichiarato: tutte le schede del programma");
});

test("131.3 nessun programma attivo: la carta lo dice, e non inventa una scheda", () => {
  const vuoto = schedaPerRischio(zona({ programmi: [] }));
  assert.equal(vuoto.scheda, null);
  assert.equal(vuoto.motivo, "nessun programma attivo");
  const archiviato = schedaPerRischio(zona({ programmi: [{ id: "p1", name: "Forza 1", status: "archived" }] }));
  assert.equal(archiviato.scheda, null, "un programma archiviato non è attivo");

  const dom = paginaNuova();
  const doc = dom.window.document;
  riempiRischioDaZonaB(doc, zona({ programmi: [] }));
  assert.equal(carta(doc).getAttribute("data-reds"), "non-calcolabile");
  assert.equal(testo(doc, "[data-reds-num]"), "—");
  assert.doesNotMatch(testo(doc, "[data-reds-num]"), /0%/);
  assert.match(testo(doc, "[data-reds-nota]"), /nessun programma attivo/);
});

test("131.4 pagina vera, zona B finta: numero, articolazione più sollecitata e percentuale", () => {
  const dom = paginaNuova();
  const doc = dom.window.document;
  const esito = riempiRischioDaZonaB(doc, zona());
  assert.equal(esito.scheda.codice, "A");
  assert.equal(esito.riepilogo.leggibile, true);

  assert.equal(carta(doc).getAttribute("data-reds"), "calcolato");
  /* PASSO 6e: A e B sommate, caviglia 18 serie su 12 di tolleranza = 150% */
  assert.equal(testo(doc, "[data-reds-num]"), "150%");
  assert.equal(testo(doc, "[data-reds-piu]"), "caviglia · 150%");
  assert.equal(testo(doc, "[data-reds-stato]"), "caviglia");
  assert.match(testo(doc, "[data-reds-nota]"), /7 righe lette/);

  /* una carta sola, e il riquadro MRV resta com'era */
  assert.equal(doc.querySelectorAll("#pag-dashboard .ck-red").length, 1);
  const mrv = Array.from(doc.querySelectorAll("#pag-dashboard .ck-dove-r"))
    .filter((d) => d.textContent.indexOf("MRV") > -1)[0];
  assert.equal(mrv.querySelector("b").textContent, "MRV non definiti");
});

test("131.5 se la zona B non porta le schede la carta dice il motivo, non zero", () => {
  const senza = schedaPerRischio({ programmi: [{ id: "p1", name: "Forza 1", status: "active" }], sedute: [] });
  assert.equal(senza.scheda, null);
  assert.match(senza.motivo, /non ha schede leggibili/);

  const dom = paginaNuova();
  const doc = dom.window.document;
  riempiRischioDaZonaB(doc, { programmi: [{ id: "p1", name: "Forza 1", status: "active" }], sedute: [] });
  assert.equal(carta(doc).getAttribute("data-reds"), "non-calcolabile");
  assert.equal(testo(doc, "[data-reds-num]"), "—");
  assert.match(testo(doc, "[data-reds-nota]"), /Forza 1/);
  assert.match(testo(doc, "[data-reds-nota]"), /non ha schede leggibili/);
});

/* PASSO 6c-fix — la zona B puo' legare le schede all'id del DOCUMENTO
 * (`program-v2-meta-…`) invece che all'id nudo del profilo: la carta deve
 * trovarle lo stesso, e quando il legame manca davvero deve dire i numeri. */
test("131.6 schede legate all'id del documento: si trovano e la carta calcola 22%", () => {
  const legate = zona({
    schedeV2: {
      perProgramma: {
        "program-v2-meta-p1": { programId: "program-v2-meta-p1", schede: [schedaA, schedaB], archiviate: [] }
      },
      totale: {}
    }
  });
  const scelta = schedaPerRischio(legate);
  assert.equal(scelta.motivo, null);
  assert.equal(scelta.scheda.codice, "A");
  assert.equal(scelta.numeri.legate, 2);

  const dom = paginaNuova();
  const doc = dom.window.document;
  riempiRischioDaZonaB(doc, legate);
  assert.equal(carta(doc).getAttribute("data-reds"), "calcolato");
  assert.equal(testo(doc, "[data-reds-piu]"), "caviglia · 150%");

  /* e vale anche quando la chiave e' un'altra cosa che finisce con l'id */
  const coda = zona({
    schedeV2: { perProgramma: { "vecchio-gruppo-p1": { programId: "vecchio-gruppo-p1", schede: [schedaA], archiviate: [] } }, totale: {} }
  });
  assert.equal(schedaPerRischio(coda).scheda.codice, "A");
});

test("131.7 legame davvero assente: la nota porta i numeri della diagnosi", () => {
  const altrove = zona({
    schedeV2: { perProgramma: { p9: { programId: "p9", schede: [schedaA, schedaB], archiviate: [schedaA] } }, totale: {} }
  });
  const scelta = schedaPerRischio(altrove);
  assert.equal(scelta.scheda, null);
  assert.match(scelta.diagnosi, /id cercato «p1»/);
  assert.match(scelta.diagnosi, /nessun gruppo trovato, 0 schede legate/);
  assert.match(scelta.diagnosi, /3 schede lette in tutto su 1 programma/);
  assert.equal(scelta.numeri.lette, 3);
  assert.equal(scelta.numeri.legate, 0);

  const dom = paginaNuova();
  const doc = dom.window.document;
  riempiRischioDaZonaB(doc, altrove);
  assert.equal(carta(doc).getAttribute("data-reds"), "non-calcolabile");
  assert.equal(testo(doc, "[data-reds-num]"), "—");
  const nota = testo(doc, "[data-reds-nota]");
  assert.match(nota, /id cercato «p1»/);
  assert.match(nota, /0 schede legate/);
  assert.match(nota, /3 schede lette in tutto su 1 programma/);
  assert.doesNotMatch(nota, /0%/);
});
