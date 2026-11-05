/* Fase 1 · guardia: i PROGRAMMI si leggono dalla sottoraccolta `nutritionPhotos`.
 *
 * Perché: A toglie `programs` dal payload della radice (r.5854) e li salva
 * nella sottoraccolta `nutritionPhotos`, con id prefissati:
 *   program-v1-…           programma intero, formato vecchio
 *   program-v2-meta-…      metadati, formato attuale
 *   program-v2-sheet-…     schede
 *   program-v2-exercise-…  esercizi delle schede troppo grandi
 *   program-v2-archived-…  schede archiviate
 * (r.5224-5234, r.5396-5417; ricostruzione r.5586-5642).
 *
 * La sottoraccolta contiene ANCHE le foto di nutrizione: B deve leggere solo i
 * documenti-programma, con query per intervallo di id, e mai l'intera
 * sottoraccolta. Il test lo verifica sul finto Firestore.
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
import { leggiProgrammi, programmaAttivo, riepilogoDati, settimanaCorrente } from "../comune/lettura-dati.js";
import { percorsoAmmesso } from "../comune/modello-dati.js";
import { renderDashboard } from "../desktop/app.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const UID = "uid-di-prova";

const DOCUMENTI_NUTRIZIONE = [
  {
    id: "program-v2-meta-p1",
    data: () => ({
      programId: "p1",
      updatedAt: "2026-10-20T10:00:00Z",
      programMeta: { id: "p1", name: "Programma Esplicito", status: "active", updatedAt: "2026-10-20T10:00:00Z" }
    })
  },
  {
    id: "program-v2-meta-p2",
    data: () => ({
      programId: "p2",
      updatedAt: "2026-11-01T10:00:00Z",
      programMeta: { id: "p2", name: "Programma Ripiego", status: "draft", updatedAt: "2026-11-01T10:00:00Z" }
    })
  },
  {
    id: "program-v2-meta-p3",
    data: () => ({
      programId: "p3",
      updatedAt: "2026-11-02T10:00:00Z",
      programMeta: { id: "p3", name: "Programma Archiviato", status: "archived", updatedAt: "2026-11-02T10:00:00Z" }
    })
  },
  { id: "program-v2-sheet-p1-s1", data: () => ({ programId: "p1", sheetId: "s1", sheet: { id: "s1", order: 0 } }) },
  { id: "program-v2-exercise-p1-s1-e1", data: () => ({ programId: "p1", sheetId: "s1", exercise: { id: "e1" } }) },
  {
    id: "program-v1-p4",
    data: () => ({ program: { id: "p4", name: "Programma Formato Vecchio", status: "draft", updatedAt: "2026-09-01T00:00:00Z" } })
  },
  // Foto di nutrizione: NON devono essere lette né interpretate.
  { id: "foto-2026-10-01", data: () => ({ url: "https://example.invalid/foto-di-prova.jpg", nota: "foto" }) },
  { id: "a-foto-inizio", data: () => ({ url: "https://example.invalid/altra.jpg" }) }
];

test("legge solo i documenti-programma, con query per intervallo (mai l'intera sottoraccolta)", async () => {
  const { firestoreFinto, registri } = creaFirebaseFinto({ documentiNutrizione: DOCUMENTI_NUTRIZIONE });
  const letto = await leggiProgrammi(firestoreFinto, UID);

  assert.equal(letto.documenti, 4, "3 metadati v2 + 1 programma v1");
  assert.equal(letto.programmi.length, 4);
  assert.ok(!registri.letture.includes("nutritionPhotos:integrale"), "vietata la lettura integrale: contiene le foto");
  assert.ok(registri.letture.filter((l) => l === "nutritionPhotos:query").length === 2, "due query per intervallo: v2-meta e v1");
  const prefissi = registri.filtri.map((f) => f.valore);
  assert.ok(prefissi.includes("program-v2-meta-") && prefissi.includes("program-v1-"));
  assert.equal(registri.scritture.length, 0, "scritture: " + JSON.stringify(registri.scritture));
});

test("il percorso nutritionPhotos è ammesso in sola lettura; le altre sottoraccolte no", () => {
  assert.equal(percorsoAmmesso("barbellDivaAccounts/" + UID + "/nutritionPhotos", UID), true);
  assert.equal(percorsoAmmesso("barbellDivaAccounts/" + UID + "/sessions", UID), true);
  assert.equal(percorsoAmmesso("barbellDivaAccounts/" + UID + "/stateBlobs", UID), true);
  assert.equal(percorsoAmmesso("barbellDivaAccounts/" + UID + "/programs", UID), false);
});

test("programma attivo: vince l'esplicito, gli archiviati restano fuori", async () => {
  const { firestoreFinto } = creaFirebaseFinto({ documentiNutrizione: DOCUMENTI_NUTRIZIONE });
  const letto = await leggiProgrammi(firestoreFinto, UID);
  const attivo = programmaAttivo(letto.programmi);
  assert.equal(attivo.programma.name, "Programma Esplicito");
  assert.equal(attivo.esplicito, true);
  assert.equal(attivo.ripiego, false);
});

test("senza programma esplicito si ripiega sul più aggiornato non archiviato (etichettato)", () => {
  const attivo = programmaAttivo([
    { id: "a", name: "Vecchio", updatedAt: "2026-09-01T00:00:00Z" },
    { id: "b", name: "Recente", updatedAt: "2026-10-30T00:00:00Z" },
    { id: "c", name: "Archiviato", status: "archived", updatedAt: "2026-11-01T00:00:00Z" }
  ]);
  assert.equal(attivo.programma.name, "Recente");
  assert.equal(attivo.esplicito, false);
  assert.equal(attivo.ripiego, true);
  assert.equal(programmaAttivo([]), null);
});

test("la settimana viene dalle sedute della sottoraccolta; senza sedute App è «non registrata»", () => {
  assert.equal(settimanaCorrente([{ id: "1", source: "App", week: 4, dateInput: "2026-10-01" }]), 4);
  assert.equal(settimanaCorrente([{ id: "1", source: "App", dateInput: "2026-10-01", sessionCode: "Scheda-7" }]), 7);
  assert.equal(settimanaCorrente([{ id: "1", source: "Carta", week: 9, dateInput: "2026-10-01" }]), null);
  assert.equal(settimanaCorrente([]), null);
});

test("la card «Programma attivo» mostra nome, marcatura e settimana dalla sottoraccolta", async () => {
  const { firestoreFinto } = creaFirebaseFinto({ documentiNutrizione: DOCUMENTI_NUTRIZIONE });
  const letto = await leggiProgrammi(firestoreFinto, UID);
  const modello = riepilogoDati({
    stato: { metrics: {}, quiz: {} },
    sedute: [{ id: "5001", source: "App", week: 5, dateInput: "2026-10-31", sessionCode: "D4" }],
    documentiSedute: 1,
    programmi: letto.programmi,
    documentiProgrammi: letto.documenti
  });
  const dom = new JSDOM(readFileSync(join(radice, "desktop", "index.html"), "utf8"));
  const griglia = dom.window.document.querySelector("#griglia");
  renderDashboard(dom.window.document, griglia, modello);
  const testo = griglia.textContent;
  assert.ok(testo.includes("Programma Esplicito"));
  assert.ok(testo.includes("attivo (marcato esplicitamente)"));
  assert.ok(testo.includes("Settimana: 5"));
  assert.ok(testo.includes("programmi letti dai documenti-programma: 4"));
  assert.ok(testo.includes("fonte: nutritionPhotos"));
});
