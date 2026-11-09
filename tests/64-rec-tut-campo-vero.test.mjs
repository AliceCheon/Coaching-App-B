/* Passo 17 — Rec e TUT con la forma VERA del documento (10/11/2026).
 *
 * Alice, dal sito: la cella mostrava la frase del coach, uscire dalla cella
 * faceva partire un salvataggio inutile, che veniva rifiutato («il TUT si
 * scrive in una riga sola, al massimo 24 caratteri») e la pagina si ridisegnava
 * da zero, perdendo la modifica. Le schede importate non tengono il TUT in
 * `prescription.tempo`: il valore sta in un altro campo (top-level `tempo`,
 * oppure `prescription.cadenza`), e la frase del coach vive insieme al valore.
 *
 * Qui si prova la forma vera:
 *  64.1 la lettura trova il valore anche quando il campo non e' quello atteso;
 *  64.2 la frase lunga non fa fallire la scrittura: il limite e' del VALORE;
 *  64.3 si scrive nel campo che si legge (anche `cadenza`), e il valore resta
 *       dopo la rilettura;
 *  64.4 sul rifiuto la pagina NON si ridisegna e il motivo si legge sotto la
 *       cella;
 *  64.5 la cella contiene solo il valore, ed e' vuota se il valore non c'e';
 *  64.6 uscire da una cella non cambiata non scrive niente.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";

import { creaZonaBFinta, creaSdkFinto } from "./finti/zona-b-finta.mjs";
import { prescrizione } from "../comune/schede-v2.js";
import { cambiaRecTempo } from "../comune/modifiche-b.js";
import { separaTempo, separaRecupero } from "../comune/tut-rec.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");

const META = {
  id: "prg-intensita", name: "Intensita ottobre-dicembre", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, description: "", message: "",
  rotation: ["A", "B", "C", "D"],
  createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};
const settimana = (n) => ({ week: n, sets: 4, reps: "10", rest: { seconds: 90 }, type: "normal", note: "", source: "manual" });
const otto = () => Array.from({ length: 8 }, (_, i) => settimana(i + 1));

/* La forma vera: nessun `prescription` sul primo esercizio, il TUT in `tempo`
 * con la frase del coach davanti, il recupero in `pausa`. */
const FRASE = "Partenza al ginocchio, cerca di accelerare in salita";
const esercizi = [
  { id: "ex-1", name: "Alzate_laterali_cavo_basso_cavigliera_polso", muscle: "spalle",
    note2: "", tempo: FRASE + " 2-0-1", pausa: "No recupero tra le braccia e poi 1'30\"",
    progression: { weeks: otto() } },
  { id: "ex-2", name: "Lat_machine", muscle: "centro schiena",
    prescription: { tempo: "", cadenza: FRASE + " 3-1-1", rest: "" }, progression: { weeks: otto() } }
];
const ID_SCHEDA_DOC = "program-v2-sheet-prg-intensita__sh-A";
const DATI = {
  radice: { quando: "2026-11-05T09:00:00.000Z", fonte: "dati di prova del test 64" },
  programmi: [{ id: "program-v2-meta-prg-intensita", dati: { programMeta: META } }],
  schede: [{ id: ID_SCHEDA_DOC, dati: { programId: "prg-intensita", sheetId: "sh-A", kind: "sheet", versione: 1,
    sheet: { id: "sh-A", code: "A", name: "Spalle e schiena", updatedAt: "2026-11-02T18:12:00.000Z", exercises: esercizi } } }],
  sedute: [{ id: "sed-1", dati: { session: { id: "sed-1", dateInput: "2026-10-26", sessionCode: "A", exercises: [{ name: "Lat_machine", kg: 40 }] } } }], esclusioni: [], registro: []
};

/* ---------- 64.1 - 64.3: la lettura e la scrittura, senza pagina ---------- */

test("64.1 la lettura trova il valore anche fuori da prescription.tempo", () => {
  const uno = prescrizione(esercizi[0]);
  assert.equal(separaTempo(uno.tempo).valore, "2-0-1", "il TUT non si legge dal campo vero: " + uno.tempo);
  assert.equal(separaRecupero(uno.recupero).valore, "1'30\"", "il recupero non si legge da `pausa`: " + uno.recupero);

  const due = prescrizione(esercizi[1]);
  assert.equal(separaTempo(due.tempo).valore, "3-1-1", "prescription.tempo vuoto ha nascosto cadenza: " + due.tempo);
});

test("64.2 la frase lunga non fa fallire la scrittura: il limite e' del valore", () => {
  const dati = { versione: 1, sheet: { id: "sh-A", exercises: [JSON.parse(JSON.stringify(esercizi[0]))] } };
  const esito = cambiaRecTempo(dati, { idScheda: "sh-A", idEsercizio: "ex-1", campo: "tempo", valore: FRASE + " 3-1-1" });
  assert.equal(esito.ok, true, "scrittura rifiutata per colpa della frase: " + (esito.motivo || ""));
  const dopo = esito.dati.sheet.exercises[0];
  assert.equal(dopo.tempo, FRASE + " 3-1-1", "il campo non porta il valore nuovo: " + dopo.tempo);
  assert.equal(separaTempo(dopo.tempo).valore, "3-1-1");
  assert.equal(dopo.pausa, esercizi[0].pausa, "il recupero e' stato toccato senza motivo");
});

test("64.3 si scrive nel campo che si legge (cadenza) e il valore resta", () => {
  const dati = { versione: 4, sheet: { id: "sh-A", exercises: [JSON.parse(JSON.stringify(esercizi[1]))] } };
  const esito = cambiaRecTempo(dati, { idScheda: "sh-A", idEsercizio: "ex-2", campo: "tempo", valore: FRASE + " 4-0-1" });
  assert.equal(esito.ok, true, esito.motivo || "rifiutata");
  const dopo = esito.dati.sheet.exercises[0];
  assert.equal(separaTempo(prescrizione(dopo).tempo).valore, "4-0-1",
    "dopo la rilettura il valore non e' quello nuovo: " + prescrizione(dopo).tempo);
  assert.equal(dopo.prescription.cadenza.indexOf(FRASE), 0, "la frase del coach e' stata persa");
});

/* ---------- 64.4 - 64.6: la pagina vera ---------------------------------- */

const html = readFileSync(join(radice, "desktop", "index.html"), "utf8");
const consoleFinita = new VirtualConsole();
consoleFinita.on("jsdomError", () => {});
const dom = new JSDOM(html, { runScripts: "outside-only", virtualConsole: consoleFinita });
const doc = dom.window.document;
const zona = creaZonaBFinta({ dati: DATI, latenzeLettura: [90, 30], latenzaScrittura: 10 });
const sdk = creaSdkFinto(zona, { uid: "alice-prova" });
dom.window.BD_B = { nomeAppAuth: "B", prefissoChiavi: "bd-b.v1.", firebase: { projectId: "prova", apiKey: "prova", appId: "prova:prova" } };
dom.window.firebase = sdk;
globalThis.window = dom.window;
globalThis.document = doc;
await import("../desktop/app-v31.js");

async function attendi(condizione, massimoMs, cosa) {
  const t0 = Date.now();
  while (!condizione()) {
    if (Date.now() - t0 > massimoMs) throw new Error("attesa scaduta: " + cosa);
    await new Promise((r) => setTimeout(r, 10));
  }
}

async function codaSvuota() {
  const t0 = Date.now();
  let silenzio = 0;
  while (Date.now() - t0 < 15000) {
    await new Promise((r) => setTimeout(r, 60));
    if (zona.inVolo() === 0) { silenzio += 60; if (silenzio >= 400) return; }
    else silenzio = 0;
  }
  throw new Error("la coda non si e' mai svuotata");
}

const riga = () => doc.querySelector("#programma-attivo .p8-tab tbody tr.p8-r[data-js='1']");
const spanTut = () => riga().querySelector("td.c-tut span.tut");
const cellaRec = () => riga().querySelector("td.c-rec span.rec");
const schedaDisco = () => zona.datiDi("schede", ID_SCHEDA_DOC);
const esDisco = (i) => schedaDisco().sheet.exercises[i];
const ridisegni = () => Number(dom.window.BD_B_STATO.ridisegni) || 0;

test("64.5 la cella contiene solo il valore, ed e' vuota se il valore non c'e'", async () => {
  await attendi(() => doc.querySelector("#programma-attivo .p8-tab"), 15000, "la tabella non si e' mai montata");
  assert.equal(spanTut().textContent, "2-0-1", "la cella TUT mostra altro: " + spanTut().textContent);
  assert.equal(cellaRec().textContent, "1'30\"", "la cella Rec mostra altro: " + cellaRec().textContent);
  assert.ok(spanTut().textContent.indexOf("Partenza") === -1, "la frase del coach e' finita in cella");
});

test("64.6 uscire da una cella non cambiata non scrive niente", async () => {
  const prima = ridisegni();
  const versionePrima = schedaDisco().versione;
  const s = spanTut();
  s.dispatchEvent(new dom.window.FocusEvent("focus"));
  s.dispatchEvent(new dom.window.FocusEvent("blur"));
  await codaSvuota();

  assert.equal(schedaDisco().versione, versionePrima, "la versione e' salita: qualcuno ha scritto");
  assert.equal(ridisegni(), prima, "la pagina si e' ridisegnata uscendo da una cella non cambiata");
  assert.equal(spanTut().textContent, "2-0-1", "la cella ha cambiato testo: " + spanTut().textContent);
});

test("64.4 un cambio vero si salva, resta in cella e non ridisegna; il rifiuto non ridisegna", async () => {
  const prima = ridisegni();
  const s = spanTut();
  s.dispatchEvent(new dom.window.FocusEvent("focus"));
  s.textContent = "3-1-1";
  s.dispatchEvent(new dom.window.Event("input"));
  s.dispatchEvent(new dom.window.FocusEvent("blur"));
  await codaSvuota();

  assert.equal(separaTempo(esDisco(0).tempo).valore, "3-1-1", "il disco non ha il valore nuovo: " + esDisco(0).tempo);
  assert.equal(esDisco(0).tempo.indexOf(FRASE), 0, "la frase del coach e' stata persa sul disco");
  assert.equal(spanTut().textContent, "3-1-1", "la cella non mostra il valore appena scritto: " + spanTut().textContent);
  assert.equal(ridisegni(), prima, "dopo il salvataggio la pagina si e' ridisegnata");

  /* il rifiuto: la scheda sul disco cambia versione alle spalle dell'app */
  const dietro = JSON.parse(JSON.stringify(schedaDisco()));
  dietro.versione = 99;
  await zona.db.collection("bdB_atleti").doc("alice-prova").collection("schede").doc(ID_SCHEDA_DOC).set(dietro);

  const dopoRifiuto = ridisegni();
  const s2 = spanTut();
  s2.dispatchEvent(new dom.window.FocusEvent("focus"));
  s2.textContent = "4-0-2";
  s2.dispatchEvent(new dom.window.Event("input"));
  s2.dispatchEvent(new dom.window.FocusEvent("blur"));
  await codaSvuota();
  await new Promise((r) => setTimeout(r, 150));

  assert.equal(ridisegni(), dopoRifiuto, "la scrittura rifiutata ha ridisegnato la pagina");
  assert.equal(separaTempo(esDisco(0).tempo).valore, "3-1-1", "il rifiuto ha scritto lo stesso: " + esDisco(0).tempo);
  const errore = riga().querySelector("td.c-tut .errore-cella");
  assert.ok(errore, "il motivo del rifiuto non si legge sotto la cella");
  assert.ok(String(errore.textContent).length > 5, "l'errore sotto la cella e' vuoto");
});
