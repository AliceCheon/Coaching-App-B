/* Fase 0 · guardia: pipeline completa con Firestore FINTO.
 * Cintura di sicurezza (d): login finto, dati di prova INVENTATI, rendering
 * delle card; il registratore delle scritture deve restare vuoto. */

import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { creaFirebaseFinto } from "./finti/firebase-finto.mjs";
import { percorsoAmmesso, ErrorePercorsoNonAmmesso } from "../comune/modello-dati.js";
import { leggiDocumentoAtleta, leggiSedute, riepilogoDati } from "../comune/lettura-dati.js";
import { renderDashboard } from "../desktop/app.js";
import { renderDashboard as renderDashboardTelefono } from "../mobile/app.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");

/* Dati di prova INVENTATI (mai dati veri): struttura fedele a A. */
const DATI_PROVA = {
  state: {
    training: {
      sessions: [
        { id: "1001", dateInput: "2026-10-28", sessionCode: "A1", sessionName: "Seduta di prova uno", source: "App", week: 2 },
        { id: "1002", dateInput: "2026-10-29", sessionCode: "B2", sessionName: "Seduta di prova due", source: "App", week: 2 },
        { id: "1003", dateInput: "2026-10-30", sessionCode: "C3", sessionName: "Seduta di prova tre", source: "App", week: 2 },
        { id: "1004", dateInput: "2026-10-31", sessionCode: "D4", sessionName: "Seduta di prova quattro", source: "App", week: 2 }
      ]
    },
    metrics: { weight: "71.5" },
    quiz: {
      questionnaireHistory: [
        { date: "2026-10-26", createdAt: "2026-10-26T08:00:00Z", questionnaireId: "questionnaire-weekly-checkin", answers: { q13: "7" }, wellness: { energy: 3, sleep: 4, doms: 2, stress: 2, hunger: 3 } }
      ]
    },
    programs: [
      { id: "p1", name: "Programma di Prova", status: "active", updatedAt: "2026-10-01T00:00:00Z" }
    ]
  }
};

test("il documento radice e le sedute si leggono senza nessuna scrittura", async () => {
  const { firestoreFinto, registri } = creaFirebaseFinto({ datiRadice: DATI_PROVA, sedute: [{ id: "s1" }, { id: "s2" }] });
  const uid = "uid-di-prova";
  const radiceLetta = await leggiDocumentoAtleta(firestoreFinto, uid);
  assert.equal(radiceLetta.presente, true);
  const sedute = await leggiSedute(firestoreFinto, uid);
  assert.equal(sedute.length, 2);
  assert.ok(registri.scritture.length === 0, "scritture registrate: " + JSON.stringify(registri.scritture));
  assert.ok(registri.letture.includes("radice:" + uid));
  assert.ok(registri.letture.includes("sessions"));
});

test("l'elenco chiuso rifiuta qualunque percorso diverso con errore esplicito", async () => {
  const uid = "uid-di-prova";
  assert.equal(percorsoAmmesso("barbellDivaAccounts/" + uid, uid), true);
  assert.equal(percorsoAmmesso("barbellDivaAccounts/" + uid + "/sessions", uid), true);
  assert.equal(percorsoAmmesso("barbellDivaAccounts/" + uid + "/stateBlobs", uid), true);
  assert.equal(percorsoAmmesso("barbellDivaAccounts/" + uid + "/altro", uid), false);
  assert.equal(percorsoAmmesso("barbellDivaAccounts/uid-di-qualcunaltro", uid), false);
  const { firestoreFinto, registri } = creaFirebaseFinto({ datiRadice: DATI_PROVA });
  await assert.rejects(() => leggiDocumentoAtleta({ collection: () => { throw new ErrorePercorsoNonAmmesso("x"); } }, uid), ErrorePercorsoNonAmmesso);
  await assert.rejects(async () => { firestoreFinto.collection("barbellDivaAccounts").doc(uid).collection("stateBlobs_etsi"); }, /non ammessa/);
  assert.ok(registri.scritture.length >= 1, "il finto firestore deve registrare il tentativo");
});

test("il rendering desktop mostra i valori di prova con le fonti, e mai scritture", async () => {
  const { firestoreFinto, registri } = creaFirebaseFinto({ datiRadice: DATI_PROVA, sedute: [{ id: "s1" }] });
  const radiceLetta = await leggiDocumentoAtleta(firestoreFinto, "uid-di-prova");
  const sedute = await leggiSedute(firestoreFinto, "uid-di-prova");
  const modello = riepilogoDati(radiceLetta.stato, sedute);
  const dom = new JSDOM(readFileSync(join(radice, "desktop", "index.html"), "utf8"));
  const griglia = dom.window.document.querySelector("#griglia");
  renderDashboard(dom.window.document, griglia, modello, { build: "b0.1-fase0" });
  const testo = griglia.textContent;
  assert.ok(testo.includes("4"), "numero sedute di prova mancante");
  assert.ok(testo.includes("2026-10-31"), "data ultima seduta mancante");
  assert.ok(testo.includes("71.5 kg"), "peso di prova mancante");
  assert.ok(testo.includes("Programma di Prova"), "programma attivo mancante");
  assert.ok(testo.includes("fonte: state.metrics.weight"), "etichetta fonte peso mancante");
  assert.ok(testo.includes("fonte: state.quiz.questionnaireHistory"), "etichetta fonte check-in mancante");
  assert.ok(!testo.includes("non registrato"), "stati vuoti non dovrebbero esserci con dati pieni");
  assert.equal(registri.scritture.length, 0, "il rendering ha tentato una scrittura");
});

test("il rendering telefono gestisce il vuoto con onestà («non registrato»)", async () => {
  const dom = new JSDOM(readFileSync(join(radice, "mobile", "index.html"), "utf8"));
  const griglia = dom.window.document.querySelector("#griglia");
  renderDashboardTelefono(dom.window.document, griglia, { presente: false, numeroSedute: null, numeroSeduteSottoraccolta: null, ultima: null, peso: null, checkin: null, programma: null });
  const testo = griglia.textContent;
  assert.ok(testo.includes("non registrato"));
  assert.ok(testo.includes("senza numeri inventati"));
  assert.ok(!/[0-9]+\.[0-9] kg/.test(testo), "nessun peso inventato nel vuoto");
});

test("estrazioni pure: ultima seduta, settimana, ripiego del programma attivo", () => {
  const modello = riepilogoDati(DATI_PROVA.state, []);
  assert.equal(modello.numeroSedute, 4);
  assert.equal(modello.ultima.codice, "D4");
  assert.equal(modello.programma.settimana, 2);
  assert.equal(modello.programma.esplicito, true);
  const senzaAttivo = riepilogoDati({ training: { sessions: [] }, programs: [{ name: "Vecchio", updatedAt: "2026-09-01T00:00:00Z" }] }, undefined);
  assert.equal(senzaAttivo.programma.ripiego, true);
  assert.equal(senzaAttivo.programma.settimana, null, "senza sedute App la settimana resta non registrata");
  assert.equal(senzaAttivo.numeroSeduteSottoraccolta, null);
});
