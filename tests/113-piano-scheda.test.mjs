/* PASSO 4a \u2014 il piano della scheda (scarico e test) e la testata del programma.
 *
 * Tre cose provate qui, e sono quelle che possono rompersi davvero:
 *  1. la percentuale di scarico e' un'ANNOTAZIONE: il volume della scheda
 *     (somma delle serie) e' identico prima e dopo averla scritta;
 *  2. i valori si validano (settimana dentro la scheda, percentuale 0\u2013100,
 *     data vera) e l'Annulla rimette com'era;
 *  3. nella pagina vera il campo statico \u00ab2\u00b0\u00bb non c'e' pi\u00f9, e i campi vivi
 *     mostrano il valore salvato dopo il ridisegno.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { riepilogoProgramma } from "../comune/programma.js";
import { ricostruisciSchede } from "../comune/schede-v2.js";
import { renderProgramma } from "../comune/vista-programma.js";
import { leggiPiano, pianiDalleSchede, settimaneScheda, validaSettimana, validaVolume } from "../comune/piano-scheda.js";
import { cambiaPianoScheda, cambiaTestataProgramma, annullaModifica } from "../comune/modifiche-b.js";
import { collegaPiano, inIso, inItaliano } from "../comune/piano-vivo.js";
import { creaEditorSchede } from "../comune/editor-schede-b.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");

const settimana = (n, label) => ({
  week: n, sets: 4, reps: { label: label }, rest: { seconds: 120 }, type: "normal", note: "", source: "manual"
});

let seq = 0;
const ESE = (nome, weeks, sup) => Object.assign({
  id: "ex-4a-" + (++seq), name: nome, muscle: "dorsali",
  prescription: { sets: 4, reps: { min: 0, max: 0, sequence: [], label: "" }, rest: { seconds: 120 } },
  progression: { weeks: weeks }
}, sup ? { sup: sup } : {});

function schedaDati() {
  seq = 0;
  const esercizi = [
    ESE("Lat machine", Array.from({ length: 8 }, (_, i) => settimana(i + 1, i === 0 ? "test 12rm \u2192 8" : "10-8"))),
    ESE("Rematore", Array.from({ length: 8 }, (_, i) => settimana(i + 1, "10-8"))),
    ESE("Pulley", Array.from({ length: 8 }, (_, i) => settimana(i + 1, "12-10")))
  ];
  return {
    programId: "prg-4a", sheetId: "sh-A", kind: "sheet", versione: 3,
    sheet: { id: "sh-A", code: "A", name: "Dorsali", updatedAt: "2026-11-02T18:12:00.000Z", exercises: esercizi }
  };
}

/* Il volume come lo conta la pagina: la somma delle serie scritte. */
const volume = (dati) => dati.sheet.exercises
  .reduce((tot, e) => tot + (e.progression.weeks || []).reduce((s, w) => s + (Number(w.sets) || 0), 0), 0);
const copia = (x) => JSON.parse(JSON.stringify(x));

/* ------------------------------------------------------------------ 1. il piano */

test("113.1 una scheda senza piano dice \u00abnon registrato\u00bb", () => {
  const d = schedaDati();
  const p = leggiPiano(d);
  assert.equal(p.scarico, null);
  assert.equal(p.test, null);
  assert.equal(p.scaricoTesto, "non registrato");
  assert.equal(p.testTesto, "non registrato");
  assert.equal(settimaneScheda(d), 8);
});

test("113.2 la percentuale e' un'annotazione: il volume non cambia", () => {
  const d = schedaDati();
  const seriePrima = copia(d.sheet.exercises.map((e) => e.progression.weeks.map((w) => w.sets)));
  const repsPrima = copia(d.sheet.exercises.map((e) => e.progression.weeks.map((w) => w.reps.label)));
  const volumePrima = volume(d);
  const esito = cambiaPianoScheda(d, { idScheda: "sh-A", campo: "scarico", settimana: 4, volume: 20 }, { quando: "2026-11-18T10:00:00.000Z", uid: "u1" });
  assert.equal(esito.ok, true, esito.motivo);
  assert.equal(esito.dati.sheet.pianoScarico.settimana, 4);
  assert.equal(esito.dati.sheet.pianoScarico.volume, 20);
  const serieDopo = esito.dati.sheet.exercises.map((e) => e.progression.weeks.map((w) => w.sets));
  const repsDopo = esito.dati.sheet.exercises.map((e) => e.progression.weeks.map((w) => w.reps.label));
  assert.deepEqual(serieDopo, seriePrima, "le serie sono cambiate: la percentuale non deve toccarle");
  assert.deepEqual(repsDopo, repsPrima, "le ripetizioni sono cambiate");
  assert.equal(volume(esito.dati), volumePrima, "il volume della scheda e' cambiato");
});

test("113.3 la settimana di scarico e' segnata anche come deload", () => {
  const d = schedaDati();
  const esito = cambiaPianoScheda(d, { idScheda: "sh-A", campo: "scarico", settimana: 4, volume: 25 }, { quando: "2026-11-18T10:00:00.000Z", uid: "u1" });
  assert.equal(esito.ok, true, esito.motivo);
  const settimane = esito.dati.sheet.exercises.map((e) => e.progression.weeks[3].type);
  assert.deepEqual(settimane, ["deload", "deload", "deload"]);
  assert.equal(esito.dati.sheet.exercises[0].progression.weeks[2].type, "normal", "ha segnato la settimana sbagliata");
  assert.equal(esito.voce.tipiPrima.length, 3);
  assert.equal(esito.voce.tipo, "piano-scheda");
});

test("113.4 settimana e percentuale fuori misura si rifiutano", () => {
  const d = schedaDati();
  assert.equal(validaSettimana(9, 8).ok, false);
  assert.equal(validaSettimana(0, 8).ok, false);
  assert.equal(validaSettimana("4", 8).ok, true);
  assert.equal(validaVolume(101).ok, false);
  assert.equal(validaVolume(-1).ok, false);
  assert.equal(validaVolume(20).ok, true);
  const fuori = cambiaPianoScheda(d, { idScheda: "sh-A", campo: "scarico", settimana: 9, volume: 20 }, { quando: "2026-11-18T10:00:00.000Z", uid: "u1" });
  assert.equal(fuori.ok, false);
  assert.match(fuori.motivo, /1 a 8/);
  const troppo = cambiaPianoScheda(d, { idScheda: "sh-A", campo: "scarico", settimana: 4, volume: 150 }, { quando: "2026-11-18T10:00:00.000Z", uid: "u1" });
  assert.equal(troppo.ok, false);
  assert.match(troppo.motivo, /0 a 100/);
});

test("113.5 il test non si scrive piu': lo dicono le celle della scheda", () => {
  const esito = cambiaPianoScheda({}, { idScheda: "sh-A", campo: "test", settimana: 8 }, {});
  assert.equal(esito.ok, false, "il salvataggio del test deve essere rifiutato");
  assert.ok(/celle della scheda/.test(esito.motivo || ""), "e deve dire perche': " + esito.motivo);
});

test("113.6 l'Annulla dello scarico rimette il piano e il tipo di prima", () => {
  const d = schedaDati();
  const esito = cambiaPianoScheda(d, { idScheda: "sh-A", campo: "scarico", settimana: 4, volume: 20 }, { quando: "2026-11-18T10:00:00.000Z", uid: "u1" });
  const annulla = annullaModifica(esito.dati, esito.voce, { quando: "2026-11-18T10:05:00.000Z", uid: "u1" });
  assert.equal(annulla.ok, true, annulla.motivo);
  assert.equal(annulla.dati.sheet.pianoScarico, undefined);
  assert.deepEqual(annulla.dati.sheet.exercises.map((e) => e.progression.weeks[3].type), ["normal", "normal", "normal"]);
  assert.equal(volume(annulla.dati), volume(d));
});

test("113.12 il vecchio pianoTest nel documento e' ignorato, senza errori", () => {
  const d = schedaDati();
  d.sheet.pianoTest = { settimana: 5 };
  const p = leggiPiano(d);
  assert.equal(p.test, null, "il vecchio pianoTest non si legge piu'");
  assert.equal(p.testTesto, "non registrato");
  assert.equal(d.sheet.pianoTest.settimana, 5, "il documento non si ripulisce: si ignora e basta");
  assert.doesNotThrow(() => pianiDalleSchede([{ id: "sh-A", dati: d }]), "un documento col vecchio pianoTest non deve far errori");
  assert.equal(pianiDalleSchede([{ id: "sh-A", dati: d }])["sh-A"].test, null, "il vecchio test non torna dal piano della scheda");
  const rifiuto = cambiaPianoScheda(d, { idScheda: "sh-A", campo: "test", settimana: 5 }, { quando: "2026-11-19T10:00:00.000Z", uid: "u1" });
  assert.equal(rifiuto.ok, false, "scrivere il test deve restare rifiutato");
  assert.match(rifiuto.motivo, /celle della scheda/);
});

/* ------------------------------------------------------------- 2. la testata */

test("113.7 data di inizio e fase si scrivono sul programma, con la data vera", () => {
  const doc0 = { id: "program-v2-meta-prg-4a", progId: "prg-4a", name: "Blocco", versione: 2 };
  const i = cambiaTestataProgramma(doc0, { idProgramma: "program-v2-meta-prg-4a", campo: "inizio", valore: "2026-10-05" }, { quando: "2026-11-18T10:00:00.000Z", uid: "u1" });
  assert.equal(i.ok, true, i.motivo);
  assert.equal(i.dati.startDate, "2026-10-05");
  assert.equal(i.voce.tipo, "testata-programma");
  const f = cambiaTestataProgramma(i.dati, { idProgramma: "program-v2-meta-prg-4a", campo: "fase", valore: "Cut" }, { quando: "2026-11-18T10:01:00.000Z", uid: "u1" });
  assert.equal(f.ok, true, f.motivo);
  assert.equal(f.dati.phase, "Cut");
  assert.equal(cambiaTestataProgramma(doc0, { campo: "inizio", valore: "2026-02-30" }, {}).ok, false, "il 30 febbraio non esiste");
  assert.equal(cambiaTestataProgramma(doc0, { campo: "fase", valore: "Ipertrofia" }, {}).ok, false);
  const annulla = annullaModifica(f.dati, f.voce, { quando: "2026-11-18T10:02:00.000Z", uid: "u1" });
  assert.equal(annulla.ok, true, annulla.motivo);
  assert.equal(annulla.dati.phase, undefined);
  assert.equal(annulla.dati.startDate, "2026-10-05", "l'Annulla della fase non deve toccare la data");
});

test("113.8 l'editor espone la scrittura della testata", () => {
  const editor = creaEditorSchede({ db: {}, uid: "u1", documenti: [] });
  assert.equal(typeof editor.testataProgramma, "function");
  assert.equal(typeof editor.modifica, "function");
});

/* --------------------------------------------------- 3. la pagina vera (jsdom) */

const meta = {
  id: "prg-4a", name: "Blocco 4a", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, rotation: ["A", "B", "C", "D"],
  description: "", message: "", createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};

function schermo(dati) {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"g\"></div></body></html>");
  const doc = dom.window.document;
  const scheda = dati ? dati : schedaDati();
  const docs = [{ id: "program-v2-sheet-prg-4a__sh-A", dati: scheda }];
  const r = riepilogoProgramma(meta, [], { schedeV2: ricostruisciSchede(docs), indice: 0, totaleProgrammi: 1, oggi: new Date(Date.UTC(2026, 10, 18)), quante: 8 });
  renderProgramma(doc, doc.querySelector("#g"), { presente: true, numeroSedute: 0 }, r);
  return { doc: doc, dom: dom, dati: scheda };
}

test("113.9 nella pagina vera il campo statico \u00ab2\u00b0\u00bb non c'e' pi\u00f9", () => {
  const { doc } = schermo();
  assert.equal(doc.body.textContent.indexOf("2\u00b0"), -1, "il \u00ab2\u00b0\u00bb compare ancora nella pagina");
  const etichette = Array.from(doc.querySelectorAll(".pr-shd-f .pr-lab")).map((e) => e.textContent);
  assert.ok(etichette.indexOf("Scarico") !== -1, "manca Scarico");
  assert.ok(etichette.indexOf("Test") !== -1, "manca Test");
  assert.ok(etichette.indexOf("2\u00b0") === -1, "il \u00ab2\u00b0\u00bb e' ancora un'etichetta");
});

test("113.10 i campi vivi mostrano il valore salvato, e la percentuale resta annotata", async () => {
  const primo = schedaDati();
  const scritto = cambiaPianoScheda(primo, { idScheda: "sh-A", campo: "scarico", settimana: 4, volume: 20 }, { quando: "2026-11-18T10:00:00.000Z", uid: "u1" });
  assert.equal(scritto.ok, true, scritto.motivo);
  const volumePrima = volume(primo);
  const { doc, dom } = schermo(scritto.dati);
  const richieste = [];
  const editor = {
    modifica: (r) => { richieste.push(r); return Promise.resolve({ ok: true }); },
    testataProgramma: (r) => { richieste.push(r); return Promise.resolve({ ok: true }); }
  };
  collegaPiano(doc, {
    editor: editor,
    piani: { "sh-A": leggiPiano(scritto.dati) },
    programma: { id: "program-v2-meta-prg-4a", inizio: "2026-10-05", fase: "Bulk" },
    segnala: () => {},
    sincronizza: () => Promise.resolve()
  });
  const sett = doc.querySelector('[data-pr-c="scarico-settimana"]');
  const vol = doc.querySelector('[data-pr-c="scarico-volume"]');
  const tst = doc.querySelector('[data-pr-c="test-settimana"]');
  const inizio = doc.querySelector('[data-pr-c=programma-inizio]');
  assert.equal(sett.value, "S4", "dopo il ridisegno la settimana di scarico non si vede");
  assert.equal(vol.value, "20");
  assert.equal(tst.tagName, "SPAN", "il Test non e' piu' una tendina: e' un'etichetta");
  assert.equal(tst.textContent, "S1", "la scheda ha «test 12rm» in S1: l'etichetta lo dice, e non mostra zero");
  assert.equal(inizio.value, "05/10/2026");
  assert.equal(volume(scritto.dati), volumePrima);

  sett.value = "S5";
  sett.dispatchEvent(new dom.window.Event("change"));
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(richieste.length, 1, "il cambio della settimana non e' partito");
  assert.equal(richieste[0].campo, "scarico");
  assert.equal(richieste[0].settimana, 5);
  assert.equal(richieste[0].volume, 20, "la percentuale deve viaggiare con la settimana");

  inizio.value = "07/10/2026";
  inizio.dispatchEvent(new dom.window.Event("change"));
  await new Promise((r) => setTimeout(r, 5));
  const ultima = richieste[richieste.length - 1];
  assert.equal(ultima.campo, "inizio");
  assert.equal(ultima.valore, "2026-10-07");
  assert.equal(inIso("05/10/2026"), "2026-10-05");
  assert.equal(inItaliano("2026-10-05"), "05/10/2026");
});

test("113.11 una data impossibile viene rifiutata e il campo torna al valore salvato", async () => {
  const { doc, dom } = schermo();
  const richieste = [];
  const messaggi = [];
  const docProgramma = { id: "program-v2-meta-prg-4a", startDate: "2026-10-05", phase: "Bulk", versione: 4 };
  /* Il percorso vero passa da cambiaTestataProgramma: qui si prova la stessa
   * porta, senza Firestore. Il rifiuto arriva dalla funzione pura. */
  const editor = {
    modifica: (r) => { richieste.push(r); return Promise.resolve({ ok: true }); },
    testataProgramma: (r) => {
      richieste.push(r);
      const esito = cambiaTestataProgramma(docProgramma, r, { quando: "2026-11-18T10:00:00.000Z", uid: "u1" });
      return Promise.resolve(esito.ok ? { ok: true } : { ok: false, motivo: esito.motivo });
    }
  };
  collegaPiano(doc, {
    editor: editor,
    piani: {},
    programma: { id: "program-v2-meta-prg-4a", inizio: "2026-10-05", fase: "Bulk" },
    segnala: (testo, tono) => messaggi.push({ testo: testo, tono: tono }),
    sincronizza: () => Promise.resolve()
  });
  const inizio = doc.querySelector("[data-pr-c=programma-inizio]");
  inizio.value = "31/02/2026";
  inizio.dispatchEvent(new dom.window.Event("change"));
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(richieste.length, 1);
  assert.equal(richieste[0].valore, "2026-02-31");
  assert.equal(inizio.value, "31/02/2026", "il campo deve tenere quello che Alice ha scritto");
  assert.equal(messaggi.length, 1);
  assert.equal(messaggi[0].tono, "errore");
  assert.match(messaggi[0].testo, /Data di inizio non salvata/);
});
