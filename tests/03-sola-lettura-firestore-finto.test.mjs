/* Pipeline completa con Firestore FINTO (fase 1).
 * Cintura di sicurezza (d): login finto, dati di prova INVENTATI, rendering
 * delle card; il registratore delle scritture deve restare vuoto.
 *
 * Fase 1: la radice ha `state.training.sessions` VUOTO per scelta di A (r.5888)
 * e il conteggio in `sessionCount` (r.5937); le sedute stanno nella sottoraccolta
 * `sessions` e i programmi in `nutritionPhotos` con id prefissati. */

import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { creaFirebaseFinto } from "./finti/firebase-finto.mjs";
import { percorsoAmmesso, ErrorePercorsoNonAmmesso } from "../comune/modello-dati.js";
import { leggiDocumentoAtleta, leggiSedute, leggiProgrammi, riepilogoDati } from "../comune/lettura-dati.js";
import { renderDashboard } from "../desktop/app.js";
import { renderDashboard as renderDashboardTelefono } from "../mobile/app.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");

/* Dati di prova INVENTATI (mai dati veri): struttura fedele ad A. */
const SEDUTE_PROVA = [
  { id: "1001", dateInput: "2026-10-28", sessionCode: "A1", sessionName: "Seduta di prova uno", source: "App", week: 2 },
  { id: "1002", dateInput: "2026-10-29", sessionCode: "B2", sessionName: "Seduta di prova due", source: "App", week: 2 },
  { id: "1003", dateInput: "2026-10-30", sessionCode: "C3", sessionName: "Seduta di prova tre", source: "App", week: 2 },
  { id: "1004", dateInput: "2026-10-31", sessionCode: "D4", sessionName: "Seduta di prova quattro", source: "App", week: 2 }
];

const DATI_PROVA = {
  sessionStorage: "subcollection-v1",
  programStorage: "subcollection-v2",
  sessionCount: 4,
  programCount: 1,
  programIds: ["p1"],
  state: {
    // A azzera questo campo a ogni salvataggio (r.5888): non è più una fonte.
    training: { sessions: [] },
    metrics: { weight: "71.5" },
    quiz: {
      questionnaireHistory: [
        { date: "2026-10-26", createdAt: "2026-10-26T08:00:00Z", questionnaireId: "questionnaire-weekly-checkin", answers: { q13: "7" }, wellness: { energy: 3, sleep: 4, doms: 2, stress: 2, hunger: 3 } }
      ]
    }
  }
};

const DOCUMENTI_NUTRIZIONE = [
  {
    id: "program-v2-meta-p1",
    data: () => ({ programId: "p1", updatedAt: "2026-10-01T00:00:00Z", programMeta: { id: "p1", name: "Programma di Prova", status: "active", updatedAt: "2026-10-01T00:00:00Z" } })
  },
  { id: "foto-nutrizione-1", data: () => ({ url: "https://example.invalid/foto-di-prova.jpg" }) }
];

async function leggiTutto(firestoreFinto, uid) {
  const radiceLetta = await leggiDocumentoAtleta(firestoreFinto, uid);
  const [sedute, programmi] = await Promise.all([
    leggiSedute(firestoreFinto, uid),
    leggiProgrammi(firestoreFinto, uid, radiceLetta)
  ]);
  return [radiceLetta, sedute, programmi];
}

test("documento radice, sedute e programmi si leggono senza nessuna scrittura", async () => {
  const { firestoreFinto, registri } = creaFirebaseFinto({ datiRadice: DATI_PROVA, sedute: SEDUTE_PROVA, documentiNutrizione: DOCUMENTI_NUTRIZIONE });
  const uid = "uid-di-prova";
  const [radiceLetta, sedute, programmi] = await leggiTutto(firestoreFinto, uid);
  assert.equal(radiceLetta.presente, true);
  assert.equal(radiceLetta.sessionCount, 4, "sessionCount è di primo livello (r.5937)");
  assert.equal(radiceLetta.stato.training.sessions.length, 0, "la radice è vuota per scelta di A");
  assert.equal(sedute.sedute.length, 4, "le sedute arrivano dalla sottoraccolta");
  assert.equal(programmi.programmi.length, 1, "il programma arriva da nutritionPhotos");
  assert.ok(registri.scritture.length === 0, "scritture registrate: " + JSON.stringify(registri.scritture));
  assert.ok(registri.letture.includes("radice:" + uid));
  assert.ok(registri.letture.includes("sessions"));
});

test("l'elenco chiuso ammette i tre percorsi di lettura e rifiuta il resto", async () => {
  const uid = "uid-di-prova";
  assert.equal(percorsoAmmesso("barbellDivaAccounts/" + uid, uid), true);
  assert.equal(percorsoAmmesso("barbellDivaAccounts/" + uid + "/sessions", uid), true);
  assert.equal(percorsoAmmesso("barbellDivaAccounts/" + uid + "/stateBlobs", uid), true);
  assert.equal(percorsoAmmesso("barbellDivaAccounts/" + uid + "/nutritionPhotos", uid), true);
  assert.equal(percorsoAmmesso("barbellDivaAccounts/" + uid + "/altro", uid), false);
  assert.equal(percorsoAmmesso("barbellDivaAccounts/" + uid + "/programs", uid), false);
  assert.equal(percorsoAmmesso("barbellDivaAccounts/uid-di-qualcunaltro", uid), false);
  const { firestoreFinto, registri } = creaFirebaseFinto({ datiRadice: DATI_PROVA });
  await assert.rejects(() => leggiDocumentoAtleta({ collection: () => { throw new ErrorePercorsoNonAmmesso("x"); } }, uid), ErrorePercorsoNonAmmesso);
  await assert.rejects(async () => { firestoreFinto.collection("barbellDivaAccounts").doc(uid).collection("stateBlobs_etsi"); }, /non ammessa/);
  assert.ok(registri.scritture.length >= 1, "il finto firestore deve registrare il tentativo");
});

test("il rendering desktop mostra i valori di prova con le fonti, e mai scritture", async () => {
  const { firestoreFinto, registri } = creaFirebaseFinto({ datiRadice: DATI_PROVA, sedute: SEDUTE_PROVA, documentiNutrizione: DOCUMENTI_NUTRIZIONE });
  const [radiceLetta, sedute, programmi] = await leggiTutto(firestoreFinto, "uid-di-prova");
  const modello = riepilogoDati({
    stato: radiceLetta.stato,
    sedute: sedute.sedute,
    documentiSedute: sedute.documenti,
    seduteSenzaId: sedute.senzaId,
    seduteDuplicate: sedute.duplicati,
    programmi: programmi.programmi,
    documentiProgrammi: programmi.documenti,
    programmiScartatiFiltro: programmi.scartatiFiltro,
    programmiV1Doppioni: programmi.v1Doppioni,
    programmiFonte: programmi.fonte,
    sessionCount: radiceLetta.sessionCount,
    programCount: radiceLetta.programCount
  });
  const dom = new JSDOM(readFileSync(join(radice, "desktop", "index.html"), "utf8"));
  const griglia = dom.window.document.querySelector("#griglia");
  renderDashboard(dom.window.document, griglia, modello, { build: "b0.2-fase1-programmi" });
  const testo = griglia.textContent;
  assert.ok(testo.includes("4"), "numero sedute di prova mancante");
  assert.ok(testo.includes("2026-10-31"), "data ultima seduta mancante");
  assert.ok(testo.includes("71.5 kg"), "peso di prova mancante");
  assert.ok(testo.includes("Programma di Prova"), "programma attivo mancante");
  assert.ok(testo.includes("coincide"), "il controllo sessionCount deve dire che coincide");
  assert.ok(testo.includes("fonte: state.metrics.weight"), "etichetta fonte peso mancante");
  assert.ok(testo.includes("fonte: state.quiz.questionnaireHistory"), "etichetta fonte check-in mancante");
  assert.ok(testo.includes("fonte: sottoraccolta sessions"), "etichetta fonte sedute mancante");
  assert.ok(testo.includes("fonte: nutritionPhotos"), "etichetta fonte programmi mancante");
  assert.ok(!testo.includes("non registrato"), "stati vuoti non dovrebbero esserci con dati pieni");
  assert.equal(registri.scritture.length, 0, "il rendering ha tentato una scrittura");
});

test("il rendering telefono gestisce il vuoto con onestà («non registrato»)", () => {
  const dom = new JSDOM(readFileSync(join(radice, "mobile", "index.html"), "utf8"));
  const griglia = dom.window.document.querySelector("#griglia");
  renderDashboardTelefono(dom.window.document, griglia, {
    presente: false,
    numeroSedute: null,
    numeroDocumentiSedute: null,
    ultima: null,
    peso: null,
    checkin: null,
    programma: null,
    controlloSessioni: null
  });
  const testo = griglia.textContent;
  assert.ok(testo.includes("non registrato"));
  assert.ok(testo.includes("senza numeri inventati"));
  assert.ok(!/[0-9]+\.[0-9] kg/.test(testo), "nessun peso inventato nel vuoto");
});

test("estrazioni pure: ultima seduta, settimana e programma attivo", () => {
  const modello = riepilogoDati({
    stato: DATI_PROVA.state,
    sedute: SEDUTE_PROVA,
    documentiSedute: SEDUTE_PROVA.length,
    programmi: [{ id: "p1", name: "Programma di Prova", status: "active", updatedAt: "2026-10-01T00:00:00Z" }],
    sessionCount: 4
  });
  assert.equal(modello.numeroSedute, 4);
  assert.equal(modello.ultima.codice, "D4");
  assert.equal(modello.programma.settimana, 2);
  assert.equal(modello.programma.esplicito, true);
  assert.equal(modello.controlloSessioni.coincide, true);

  const senzaAttivo = riepilogoDati({
    stato: { training: { sessions: [] }, metrics: {}, quiz: {} },
    sedute: [],
    programmi: [{ name: "Vecchio", updatedAt: "2026-09-01T00:00:00Z" }]
  });
  assert.equal(senzaAttivo.programma.ripiego, true);
  assert.equal(senzaAttivo.programma.settimana, null, "senza sedute App la settimana resta non registrata");
  assert.equal(senzaAttivo.numeroSedute, 0, "zero sedute è uno zero VERO, non un ripiego");
  assert.equal(senzaAttivo.controlloSessioni, null);
});
