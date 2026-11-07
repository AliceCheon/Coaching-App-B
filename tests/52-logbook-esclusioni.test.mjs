/* Passo 6 · il Logbook di B deve nascondere le sedute escluse da Alice.
 *
 * Il caso vero: le sedute di A NON hanno `deletedAt` (li' tornano indietro, e
 * A non si tocca). L'esclusione vive solo in `bdB_atleti/{uid}/esclusioni`.
 * Quindi la catena giusta e':
 *
 *   sedute di A senza deletedAt
 *     + documenti di esclusione in bdB_
 *     -> applicaEsclusioni(...)  -> sedute senza le cinque
 *     -> seduteLogbook(...)      -> il Logbook non le mostra
 *
 * Questi test partono esattamente da li': nessuna seduta cancellata in A, una
 * esclusione in B, e la seduta non deve comparire.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { applicaEsclusioni } from "../comune/esclusioni.js";
import { seduteLogbook } from "../comune/logbook.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");

/* Una seduta come la legge A: id vero, nessun deletedAt. */
const daA = (id, data, scheda) => ({
  id: id,
  dateInput: data,
  sessionCode: scheda,
  week: "Settimana 1",
  sessionName: "Logbook " + scheda,
  source: "App",
  exercises: [{ name: "Squat" }, { name: "Panca" }]
});

/* Un documento della sottoraccolta esclusioni di B, come lo scrive la pagina. */
const esclusione = (idSeduta) => ({
  id: idSeduta,
  dati: {
    idSeduta: idSeduta,
    data: "2026-10-24",
    scheda: "C",
    settimana: 1,
    motivo: "chiusa da Alice",
    quando: "2026-11-07T10:00:00.000Z"
  }
});

test("52.1 cinque sedute di A senza deletedAt e cinque esclusioni in B: restano nascoste", () => {
  const seduteDiA = [
    daA("s1", "2026-10-24", "C"),
    daA("s2", "2026-10-24", "B"),
    daA("s3", "2026-10-24", "D"),
    daA("s4", "2026-10-27", "C"),
    daA("s5", "2026-09-22", "D"),
    daA("s6", "2026-10-20", "A"),
    daA("s7", "2026-10-21", "E")
  ];
  const esclusioni = ["s1", "s2", "s3", "s4", "s5"].map(esclusione);
  const esito = applicaEsclusioni(seduteDiA, esclusioni);

  assert.equal(esito.sedute.length, 2, "le due sedute non escluse restano");
  assert.deepEqual(esito.sedute.map((s) => s.id), ["s6", "s7"]);
  assert.equal(esito.escluse, 5);
  assert.deepEqual(esito.escluseId.sort(), ["s1", "s2", "s3", "s4", "s5"]);
  assert.equal(esito.dichiarazione, "5 sedute escluse da Alice");
});

test("52.2 la seduta di A non ha deletedAt: e' l'esclusione di B a nasconderla", () => {
  const seduta = daA("s1", "2026-10-24", "C");
  assert.equal(seduta.deletedAt, undefined, "la seduta di A e' viva");
  const esito = applicaEsclusioni([seduta], [esclusione("s1")]);
  assert.equal(esito.sedute.length, 0);
  assert.equal(esito.escluse, 1);
  assert.equal(seduta.deletedAt, undefined, "la funzione non muta la seduta di A");
});

test("52.3 il Logbook non mostra la seduta esclusa, e la dichiara a schermo", () => {
  const seduteDiA = [daA("s1", "2026-10-24", "C"), daA("s6", "2026-10-20", "A")];
  const filtrate = applicaEsclusioni(seduteDiA, [esclusione("s1")]);
  const lb = seduteLogbook(filtrate.sedute, {
    oggi: new Date("2026-11-07T12:00:00.000Z"),
    escluse: filtrate.escluse
  });

  assert.equal(lb.sedute.length, 1);
  assert.equal(lb.sedute[0].id, "s6");
  assert.equal(lb.sedute.filter((s) => s.id === "s1").length, 0, "la seduta esclusa non compare");
  assert.equal(lb.dichiarazioni.escluseDaAlice, 1);
  assert.equal(lb.dichiarazioni.dichiarazioneEsclusi, "1 seduta esclusa da Alice");
});

test("52.4 l'esclusione senza idSeduta non nasconde niente (nessun id inventato)", () => {
  const seduteDiA = [daA("s1", "2026-10-24", "C")];
  const esito = applicaEsclusioni(seduteDiA, [{ id: "", dati: { motivo: "rotta" } }]);
  assert.equal(esito.sedute.length, 1);
  assert.equal(esito.escluse, 0);
  assert.equal(esito.dichiarazione, "nessuna seduta esclusa da Alice");
});

test("52.5 un'esclusione che non trova la seduta si dichiara, non sparisce", () => {
  const esito = applicaEsclusioni([daA("s1", "2026-10-24", "C")], [esclusione("fantasma")]);
  assert.equal(esito.sedute.length, 1);
  assert.equal(esito.escluse, 0);
  assert.deepEqual(esito.senzaCorrispondenza, ["fantasma"]);
});

test("52.6 la data di esclusione non c'entra: conta l'id, cosi' una data sbagliata non salva nessuno", () => {
  const seduta = daA("s1", "2026-10-24", "C");
  const esclusa = { id: "s1", dati: { idSeduta: "s1", data: "1999-01-01" } };
  const esito = applicaEsclusioni([seduta], [esclusa]);
  assert.equal(esito.sedute.length, 0, "l'id comanda, non la data scritta nel motivo");
});

test("52.7 la pagina dell app legge le esclusioni dalla zona B e le applica prima del Logbook", () => {
  const pagina = readFileSync(join(radice, "desktop", "app-v31.js"), "utf8");
  assert.ok(pagina.indexOf("leggiEsclusioni(db, utente.uid)") >= 0, "app-v31 non legge le esclusioni della zona B");
  assert.ok(pagina.indexOf("applicaEsclusioni(") >= 0, "app-v31 non applica le esclusioni");
  assert.ok(pagina.indexOf("seduteLogbook(sedutePulite.sedute") >= 0, "il Logbook non riceve le sedute filtrate");
});

test("52.8 la dichiarazione a schermo arriva alla nota del Logbook", () => {
  const pagina = readFileSync(join(radice, "desktop", "app-v31.js"), "utf8");
  assert.ok(pagina.indexOf("escluseDaAlice") >= 0, "la nota non dichiara le sedute escluse");
});
