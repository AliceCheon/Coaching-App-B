/* Fase 1 · guardia: le regole di A sui PROGRAMMI (loadCloudPrograms, r.5586-5642).
 *
 * Non basta leggere la sottoraccolta giusta: A applica due regole in più, e
 * senza di esse B mostra programmi che per A non esistono più.
 *
 *  1. FILTRO programIds (r.5591, r.5600). La radice porta l'elenco dei
 *     programId vivi (r.5934). Un documento con programId fuori elenco è la
 *     traccia di un programma CANCELLATO: A lo scarta, B deve fare lo stesso.
 *  2. DEDUPLICA per programId (r.5636-5639). Il formato v1 salva il programma
 *     intero, il v2 i soli metadati: durante la migrazione possono convivere.
 *     A usa il v1 SOLO se quel programId non è già arrivato in v2. Deduplicare
 *     per id del documento — come faceva B — li conta come due programmi.
 *
 * Il caso della coach (2/11/2026): programma attuale in v2 + la sua copia v1 +
 * un programma cancellato con id che viene PRIMA in ordine alfabetico. Con la
 * patch precedente B leggeva 3 programmi e sceglieva come attivo il cancellato,
 * perché Firestore restituisce i documenti in ordine di id. Qui il caso è
 * riprodotto per intero: questo file FALLISCE sulla patch precedente.
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
import { leggiDocumentoAtleta, leggiProgrammi, programmaAttivo, riepilogoDati } from "../comune/lettura-dati.js";
import { renderDashboard } from "../desktop/app.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const UID = "uid-programmi-di-prova";

/* Documenti come li scrive A: id prefissato, programId nel documento. */
function meta(programId, campi) {
  return {
    id: "program-v2-meta-" + programId,
    data: () => ({ programId, programMeta: Object.assign({ id: programId }, campi) })
  };
}
function v1(programId, campi) {
  return {
    id: "program-v1-" + programId,
    data: () => ({ programId, program: Object.assign({ id: programId }, campi) })
  };
}

const ATTIVO = "z-attivo"; // id volutamente DOPO in ordine alfabetico
const CANCELLATO = "a-cancellato"; // id volutamente PRIMA: è il tranello

/* Ordine di restituzione = ordine di questo array (come Firestore: per id). */
function documentiDelCaso() {
  return [
    meta(CANCELLATO, { name: "Programma Cancellato", status: "active", updatedAt: "2026-11-01T09:00:00Z" }),
    meta(ATTIVO, { name: "Programma Attuale", status: "active", updatedAt: "2026-10-20T10:00:00Z" }),
    v1(ATTIVO, { name: "Copia V1 del programma attuale", status: "active", updatedAt: "2026-10-20T10:00:00Z" }),
    { id: "foto-2026-10-01", data: () => ({ url: "https://example.invalid/foto.jpg", nota: "foto di nutrizione" }) }
  ];
}

const RADICE = {
  programStorage: "subcollection-v2",
  programCount: 1,
  programIds: [ATTIVO],
  sessionCount: 0,
  state: { metrics: {}, quiz: {} }
};

async function leggiCon(radiceDati, documenti) {
  const { firestoreFinto, registri } = creaFirebaseFinto({ datiRadice: radiceDati, documentiNutrizione: documenti });
  const radiceLetta = await leggiDocumentoAtleta(firestoreFinto, UID);
  const letto = await leggiProgrammi(firestoreFinto, UID, radiceLetta);
  return { radiceLetta, letto, registri };
}

function modelloDa(radiceLetta, letto) {
  return riepilogoDati({
    stato: radiceLetta.stato,
    sedute: [],
    documentiSedute: 0,
    programmi: letto.programmi,
    documentiProgrammi: letto.documenti,
    programmiScartatiFiltro: letto.scartatiFiltro,
    programmiV1Doppioni: letto.v1Doppioni,
    programmiFonte: letto.fonte,
    sessionCount: radiceLetta.sessionCount,
    programCount: radiceLetta.programCount
  });
}

function testoCard(modello) {
  const dom = new JSDOM(readFileSync(join(radice, "desktop", "index.html"), "utf8"));
  const griglia = dom.window.document.querySelector("#griglia");
  renderDashboard(dom.window.document, griglia, modello);
  return griglia.textContent;
}

/* ---------- Il caso della coach: deve passare solo con le regole di A ---------- */

test("caso della coach: v1 + programma cancellato + id sfavorevole → UN programma, e l'attivo è quello giusto", async () => {
  const { radiceLetta, letto, registri } = await leggiCon(RADICE, documentiDelCaso());

  assert.equal(letto.documenti, 3, "3 documenti-programma letti (la foto resta fuori dagli intervalli)");
  assert.equal(letto.programmi.length, 1, "un solo programma: il v1 è la copia del v2, il cancellato non esiste più");
  assert.equal(letto.programmi[0].name, "Programma Attuale");
  assert.equal(letto.scartatiFiltro, 1, "il programma cancellato è scartato dal filtro programIds");
  assert.equal(letto.v1Doppioni, 1, "il v1 dello stesso programId è scartato perché già in v2");
  assert.deepEqual(registri.scritture, [], "nessuna scrittura");

  const attivo = programmaAttivo(letto.programmi);
  assert.equal(attivo.programma.name, "Programma Attuale", "mai il cancellato, anche se il suo id viene prima");
  assert.equal(attivo.esplicito, true);

  const modello = modelloDa(radiceLetta, letto);
  assert.equal(modello.numeroProgrammi, 1);
  assert.equal(modello.programma.nome, "Programma Attuale");
  assert.equal(modello.controlloProgrammi.radice, 1);
  assert.equal(modello.controlloProgrammi.coincide, true);
  assert.equal(modello.controlloProgrammi.mancanti, false);

  const testo = testoCard(modello);
  assert.ok(!testo.includes("Programma Cancellato"), "il programma cancellato non compare nella card");
  assert.ok(!testo.includes("Copia V1"), "la copia v1 non compare come programma a sé");
  assert.ok(testo.includes("Programma Attuale"));
  assert.ok(testo.includes("scartati come in A: 1 fuori da programIds"));
});

test("l'ordine dei documenti non conta: stesso esito con l'elenco rovesciato", async () => {
  const diritti = await leggiCon(RADICE, documentiDelCaso());
  const rovesciati = await leggiCon(RADICE, documentiDelCaso().slice().reverse());

  assert.deepEqual(
    rovesciati.letto.programmi.map((p) => p.name),
    diritti.letto.programmi.map((p) => p.name),
    "stesso elenco, stesso ordine, qualunque sia l'ordine di Firestore"
  );
  assert.equal(programmaAttivo(rovesciati.letto.programmi).programma.name, "Programma Attuale");
});

test("senza programma esplicito, con documenti in ordine sfavorevole, il ripiego è deterministico", () => {
  const a = { id: "b-vecchio", name: "Vecchio", updatedAt: "2026-09-01T00:00:00Z" };
  const b = { id: "a-recente", name: "Recente", updatedAt: "2026-10-30T00:00:00Z" };
  assert.equal(programmaAttivo([a, b]).programma.name, "Recente");
  assert.equal(programmaAttivo([b, a]).programma.name, "Recente");
});

/* ---------- Le due regole, una per una ---------- */

test("documento di un programma cancellato (fuori da programIds): scartato e contato", async () => {
  const documenti = [
    meta(CANCELLATO, { name: "Programma Cancellato", status: "active" }),
    meta(ATTIVO, { name: "Programma Attuale", status: "active" })
  ];
  const { letto } = await leggiCon(RADICE, documenti);
  assert.equal(letto.programmi.length, 1);
  assert.equal(letto.scartatiFiltro, 1);
  assert.equal(letto.v1Doppioni, 0);
});

test("v1 e v2 dello stesso programma: vince il v2, il v1 è un doppione (non un secondo programma)", async () => {
  const documenti = [
    v1(ATTIVO, { name: "Copia V1 del programma attuale", status: "active" }),
    meta(ATTIVO, { name: "Programma Attuale", status: "active" })
  ];
  const { letto } = await leggiCon(RADICE, documenti);
  assert.equal(letto.programmi.length, 1);
  assert.equal(letto.programmi[0].name, "Programma Attuale", "il v2 vince anche se arriva dopo");
  assert.equal(letto.v1Doppioni, 1);
});

test("un v1 senza campo programId usa l'id del programma, come A (r.5601)", async () => {
  const documenti = [
    { id: "program-v1-" + ATTIVO, data: () => ({ program: { id: ATTIVO, name: "V1 senza programId", status: "active" } }) },
    meta(ATTIVO, { name: "Programma Attuale", status: "active" })
  ];
  const { letto } = await leggiCon(RADICE, documenti);
  assert.equal(letto.programmi.length, 1);
  assert.equal(letto.v1Doppioni, 1);
});

test("programIds assente nella radice: nessun filtro, come A (r.5600: `allowed.size && …`)", async () => {
  const radiceSenzaElenco = { programStorage: "subcollection-v2", programCount: 2, state: { metrics: {}, quiz: {} } };
  const { letto } = await leggiCon(radiceSenzaElenco, documentiDelCaso());
  assert.equal(letto.programmi.length, 2, "il cancellato resta, il v1 no: senza elenco A non filtra");
  assert.equal(letto.scartatiFiltro, 0);
  assert.ok(letto.programmi.some((p) => p.name === "Programma Cancellato"));
});

test("programIds vuoto: trattato come assente, nessun filtro", async () => {
  const radiceElencoVuoto = { programStorage: "subcollection-v2", programCount: 2, programIds: [], state: { metrics: {}, quiz: {} } };
  const { letto } = await leggiCon(radiceElencoVuoto, documentiDelCaso());
  assert.equal(letto.programmi.length, 2);
  assert.equal(letto.scartatiFiltro, 0);
});

/* ---------- Il controllo sui conteggi (come per le sedute) ---------- */

test("programCount incoerente: la card dichiara la differenza", async () => {
  const radiceIncoerente = Object.assign({}, RADICE, { programCount: 3 });
  const { radiceLetta, letto } = await leggiCon(radiceIncoerente, documentiDelCaso());
  const modello = modelloDa(radiceLetta, letto);
  assert.equal(modello.controlloProgrammi.radice, 3);
  assert.equal(modello.controlloProgrammi.letti, 1);
  assert.equal(modello.controlloProgrammi.coincide, false);
  assert.equal(modello.controlloProgrammi.mancanti, false);
  const testo = testoCard(modello);
  assert.ok(testo.includes("programCount nella radice: 3 · NON coincide (differenza 2)"));
});

test("programCount > 0 e nessun programma trovato: «cloud programs missing», non un finto vuoto", async () => {
  const radiceSenzaDocumenti = { programStorage: "subcollection-v2", programCount: 2, programIds: [ATTIVO], state: { metrics: {}, quiz: {} } };
  const { radiceLetta, letto } = await leggiCon(radiceSenzaDocumenti, []);
  const modello = modelloDa(radiceLetta, letto);
  assert.equal(modello.numeroProgrammi, 0);
  assert.equal(modello.controlloProgrammi.mancanti, true);
  const testo = testoCard(modello);
  assert.ok(testo.includes("programmi mancanti nel cloud"));
  assert.ok(testo.includes("cloud programs missing"));
});

test("programCount assente: la card dice «non registrato», senza inventare un confronto", async () => {
  const radiceSenzaConteggio = { programStorage: "subcollection-v2", state: { metrics: {}, quiz: {} } };
  const { radiceLetta, letto } = await leggiCon(radiceSenzaConteggio, documentiDelCaso());
  const modello = modelloDa(radiceLetta, letto);
  assert.equal(modello.controlloProgrammi, null);
  assert.ok(testoCard(modello).includes("controllo · programCount nella radice: non registrato"));
});

/* ---------- Formato vecchio e lettura della radice ---------- */

test("programStorage vecchio: i programmi stanno in state.programs, nessuna query alla sottoraccolta", async () => {
  const radiceVecchia = {
    programCount: 2,
    state: {
      metrics: {},
      quiz: {},
      programs: [{ id: "p1", name: "Programma Vecchio A" }, { id: "p2", name: "Programma Vecchio B" }]
    }
  };
  const { firestoreFinto, registri } = creaFirebaseFinto({ datiRadice: radiceVecchia, documentiNutrizione: documentiDelCaso() });
  const radiceLetta = await leggiDocumentoAtleta(firestoreFinto, UID);
  const letto = await leggiProgrammi(firestoreFinto, UID, radiceLetta);
  assert.equal(letto.fonte, "radice");
  assert.equal(letto.programmi.length, 2);
  assert.equal(letto.documenti, 0);
  assert.ok(!registri.letture.some((l) => l.indexOf("nutritionPhotos") === 0), "con il formato vecchio non si tocca la sottoraccolta");
});

test("leggiDocumentoAtleta porta programIds e programCount di primo livello (r.5932-5935)", async () => {
  const { radiceLetta } = await leggiCon(RADICE, []);
  assert.deepEqual(radiceLetta.programIds, [ATTIVO]);
  assert.equal(radiceLetta.programCount, 1);
  assert.equal(radiceLetta.sessionCount, 0);
});

test("radice senza programIds/programCount: null, non zeri inventati", async () => {
  const { radiceLetta } = await leggiCon({ state: { metrics: {}, quiz: {} } }, []);
  assert.equal(radiceLetta.programIds, null);
  assert.equal(radiceLetta.programCount, null);
});
