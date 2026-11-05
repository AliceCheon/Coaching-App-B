/* Fase 1 · guardia: la VERITÀ delle sedute è la sottoraccolta `sessions`.
 *
 * Perché questo test esiste: in fase 0 la card leggeva `state.training.sessions`
 * dalla radice. A azzera quel campo a ogni salvataggio (r.5888) e sincronizza
 * una seduta per documento in `sessions` (r.6257, r.6365): la radice mostrava 0
 * mentre i documenti veri erano 123. Qui si piantona la lettura giusta:
 *  - contano solo i documenti con `session.id` valido (come A, r.5581);
 *  - niente doppioni: una copia residua non gonfia il numero;
 *  - ultima seduta e settimana vengono dalle stesse sedute;
 *  - il `sessionCount` della radice (r.5937) fa da controllo e, se non
 *    coincide, la card lo DICE invece di scegliere un numero e tacere.
 *
 * Dati di prova INVENTATI (mai dati veri).
 */

import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { creaFirebaseFinto } from "./finti/firebase-finto.mjs";
import { leggiDocumentoAtleta, leggiSedute, riepilogoDati } from "../comune/lettura-dati.js";
import { renderDashboard } from "../desktop/app.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const UID = "uid-di-prova";

function seduta(id, giorno, extra = {}) {
  return { id, dateInput: giorno, sessionCode: id === "1003" ? "C3" : "A1", sessionName: "Seduta di prova " + id, source: "App", week: 3, ...extra };
}

/* 5 documenti: 3 sedute valide + 1 senza id + 1 copia della seduta 1002. */
const DOCUMENTI_SEDUTE = [
  seduta("1001", "2026-10-27"),
  seduta("1002", "2026-10-28", { revision: 1, sessionName: "Seduta di prova vecchia" }),
  seduta("1002", "2026-10-28", { revision: 4, sessionName: "Seduta di prova aggiornata" }),
  seduta("1003", "2026-10-31"),
  { sessionName: "Documento senza id (sporco di una vecchia scrittura)", dateInput: "2026-10-30" }
];

const RADICE = {
  sessionStorage: "subcollection-v1",
  sessionCount: 3,
  state: {
    // Scelta di A (r.5888): il campo esiste ma è SEMPRE vuoto.
    training: { sessions: [] },
    metrics: { weight: "71.5" },
    quiz: { questionnaireHistory: [] }
  }
};

test("conta solo le sedute valide e non i doppioni, senza nessuna scrittura", async () => {
  const { firestoreFinto, registri } = creaFirebaseFinto({ datiRadice: RADICE, sedute: DOCUMENTI_SEDUTE });
  const lette = await leggiSedute(firestoreFinto, UID);
  assert.equal(lette.documenti, 5, "documenti presenti nella sottoraccolta");
  assert.equal(lette.sedute.length, 3, "sedute valide e distinte");
  assert.equal(lette.senzaId, 1, "un documento senza id va scartato come in A (r.5581)");
  assert.equal(lette.duplicati, 1, "la copia della seduta 1002 non è una seduta in più");
  assert.equal(registri.scritture.length, 0, "scritture: " + JSON.stringify(registri.scritture));
});

test("del doppione resta la versione più recente (revision più alta)", async () => {
  const { firestoreFinto } = creaFirebaseFinto({ datiRadice: RADICE, sedute: DOCUMENTI_SEDUTE });
  const lette = await leggiSedute(firestoreFinto, UID);
  const doppia = lette.sedute.find((s) => String(s.id) === "1002");
  assert.equal(doppia.revision, 4);
  assert.equal(doppia.sessionName, "Seduta di prova aggiornata");
});

test("ultima seduta e settimana arrivano dalla sottoraccolta, non dalla radice", async () => {
  const { firestoreFinto } = creaFirebaseFinto({ datiRadice: RADICE, sedute: DOCUMENTI_SEDUTE });
  const radiceLetta = await leggiDocumentoAtleta(firestoreFinto, UID);
  const lette = await leggiSedute(firestoreFinto, UID);
  const modello = riepilogoDati({
    stato: radiceLetta.stato,
    sedute: lette.sedute,
    documentiSedute: lette.documenti,
    seduteSenzaId: lette.senzaId,
    seduteDuplicate: lette.duplicati,
    sessionCount: radiceLetta.sessionCount
  });
  assert.equal(modello.numeroSedute, 3, "la radice è vuota per scelta di A: il numero è quello dei documenti");
  assert.equal(modello.ultima.data, "2026-10-31");
  assert.equal(modello.ultima.codice, "C3");
  assert.equal(modello.programma, null, "senza programmi non si inventa un programma");
});

test("la radice piena ma non aggiornata non vince sul dato vero", () => {
  /* Scenario opposto: radice con 4 voci vecchie e sessionCount 0, sottoraccolta
   * con 2 sedute. Il numero mostrato deve venire dalla sottoraccolta (2), mai 0. */
  const modello = riepilogoDati({
    stato: { training: { sessions: [{ id: "x1" }, { id: "x2" }, { id: "x3" }, { id: "x4" }] } },
    sedute: [seduta("2001", "2026-10-01"), seduta("2002", "2026-10-02")],
    documentiSedute: 2,
    sessionCount: 0
  });
  assert.equal(modello.numeroSedute, 2);
  assert.equal(modello.controlloSessioni.coincide, false);
});

test("la card dice se sessionCount e documenti non coincidono (e tace quando manca)", async () => {
  const dom = new JSDOM(readFileSync(join(radice, "desktop", "index.html"), "utf8"));
  const doc = dom.window.document;
  const griglia = doc.querySelector("#griglia");

  const incoerente = riepilogoDati({
    stato: RADICE.state,
    sedute: [seduta("3001", "2026-10-10")],
    documentiSedute: 1,
    sessionCount: 123
  });
  renderDashboard(doc, griglia, incoerente);
  const testo = griglia.textContent;
  assert.ok(testo.includes("sessionCount nella radice: 123"), "manca la controprova della radice");
  assert.ok(testo.includes("NON coincide"), "l'incoerenza deve essere dichiarata");
  assert.ok(testo.includes("differenza 122"), "la differenza deve essere esplicita");

  const coerente = riepilogoDati({
    stato: RADICE.state,
    sedute: [seduta("3001", "2026-10-10")],
    documentiSedute: 1,
    sessionCount: 1
  });
  renderDashboard(doc, griglia, coerente);
  assert.ok(griglia.textContent.includes("coincide"));
  assert.ok(!griglia.textContent.includes("NON coincide"));

  const senzaConteggio = riepilogoDati({
    stato: { metrics: {}, quiz: {} },
    sedute: [seduta("3001", "2026-10-10")],
    documentiSedute: 1,
    sessionCount: null
  });
  renderDashboard(doc, griglia, senzaConteggio);
  assert.ok(griglia.textContent.includes("sessionCount nella radice: non registrato"));
});

test("se la sottoraccolta non risponde, la card lo dice invece di mostrare zero", () => {
  const dom = new JSDOM(readFileSync(join(radice, "desktop", "index.html"), "utf8"));
  const doc = dom.window.document;
  const griglia = doc.querySelector("#griglia");
  const modello = riepilogoDati({ stato: RADICE.state, sedute: [], seduteNonLette: true, sessionCount: 3 });
  renderDashboard(doc, griglia, modello);
  const testo = griglia.textContent;
  assert.ok(testo.includes("lettura non riuscita"));
  assert.ok(testo.includes("nessun numero inventato"));
  assert.ok(!/sessionCount nella radice/.test(testo), "senza lettura non si mostra un controllo finto");
});
