/* Guardia 165 (passo 15b): dove vive la testata del programma.
 *
 *  165.1  ogni programma letto porta con sé l'id del suo DOCUMENTO
 *  165.2  per un programma v2 la testata si scrive dentro `programMeta`
 *  165.3  per un programma piatto (v1) resta in cima al documento
 *  165.4  il campo vuoto toglie il valore, e il meta si porta dietro updatedAt
 *  165.5  la pagina passa alla scrittura l'id del documento, non quello del meta
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { programmiDaDocumenti } from "../comune/lettura-b.js";
import { cambiaTestataProgramma } from "../comune/modifiche-b.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const app = readFileSync(join(radice, "desktop", "app-v31.js"), "utf8");

const QUANDO = "2026-11-26T10:00:00.000Z";
const V2 = {
  versione: 3,
  programId: "prg-x",
  programMeta: { id: "prg-x", name: "Prova", status: "active", phase: "Bulk", startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, rotation: ["A"], updatedAt: "2026-11-02T18:12:00.000Z" }
};

test("165.1 la lettura porta con sé l'id del documento", () => {
  const letto = programmiDaDocumenti([{ id: "program-v2-meta-prg-x", dati: V2 }]);
  assert.equal(letto.programmi.length, 1);
  assert.equal(letto.programmi[0].id, "prg-x", "il programma resta identificato dal suo id");
  assert.equal(letto.programmi[0].docId, "program-v2-meta-prg-x", "e porta l'id del documento che lo contiene");
});

test("165.2 per un programma v2 la testata si scrive nel meta", () => {
  const esito = cambiaTestataProgramma(V2, { campo: "settimane", valore: "10" }, { quando: QUANDO, uid: "u1" });
  assert.equal(esito.ok, true, esito.motivo);
  assert.equal(esito.dati.programMeta.durationWeeks, 10, "il numero va DENTRO il meta");
  assert.equal(esito.dati.durationWeeks, undefined, "e non in cima al documento, dove la pagina non lo legge");
  assert.equal(esito.dati.programMeta.updatedAt, QUANDO, "il meta si aggiorna: è quello che la lettura confronta");
  assert.equal(esito.dati.versione, 4, "la versione avanza di uno");

  const giorni = cambiaTestataProgramma(V2, { campo: "giorni", valore: "3" }, { quando: QUANDO, uid: "u1" });
  assert.equal(giorni.dati.programMeta.daysPerWeek, 3);
  const rot = cambiaTestataProgramma(V2, { campo: "rotazione", valore: "a, b, c" }, { quando: QUANDO, uid: "u1" });
  assert.deepEqual(rot.dati.programMeta.rotation, ["A", "B", "C"], "la rotazione si normalizza in maiuscolo");
});

test("165.3 per un programma piatto la testata resta in cima", () => {
  const piatto = { versione: 2, id: "prg-y", name: "Piatto", startDate: "2026-10-05", durationWeeks: 8 };
  const esito = cambiaTestataProgramma(piatto, { campo: "settimane", valore: "12" }, { quando: QUANDO, uid: "u1" });
  assert.equal(esito.ok, true, esito.motivo);
  assert.equal(esito.dati.durationWeeks, 12);
  assert.equal(esito.dati.programMeta, undefined, "senza meta non si inventa un contenitore");
});

test("165.4 il campo vuoto toglie il valore e i rifiuti non scrivono", () => {
  const vuoto = cambiaTestataProgramma(V2, { campo: "settimane", valore: "" }, { quando: QUANDO, uid: "u1" });
  assert.equal(vuoto.ok, true);
  assert.equal(Object.prototype.hasOwnProperty.call(vuoto.dati.programMeta, "durationWeeks"), false, "il campo tolto sparisce dal meta");
  assert.equal(Object.prototype.hasOwnProperty.call(vuoto.dati, "durationWeeks"), false, "e non resta in cima");

  const zero = cambiaTestataProgramma(V2, { campo: "giorni", valore: "0" }, { quando: QUANDO, uid: "u1" });
  assert.equal(zero.ok, false);
  assert.match(zero.motivo, /1 a 7/);
  const troppe = cambiaTestataProgramma(V2, { campo: "settimane", valore: "99" }, { quando: QUANDO, uid: "u1" });
  assert.equal(troppe.ok, false);
  assert.match(troppe.motivo, /1 a 52/);
  const doppie = cambiaTestataProgramma(V2, { campo: "rotazione", valore: "A A B" }, { quando: QUANDO, uid: "u1" });
  assert.equal(doppie.ok, false);
  assert.match(doppie.motivo, /ripete/);
});

test("165.5 la pagina passa l'id del documento", () => {
  assert.match(app, /docId \|\| attivo\.programma\.id/, "la testata usa il docId quando c'è");
});
