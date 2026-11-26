/* Guardia 166 (passo 16): l'interruttore della rotazione e i due testi liberi.

  166.1  l'interruttore disegna lo stato vero del documento (acceso/spento)
  166.2  premuto da acceso, spegne: rotazione tolta dal documento, schede intatte
  166.3  premuto da spento, riaccende con le lettere dell'anteprima
  166.4  descrizione e messaggio si salvano nel meta, con gli a capo
  166.5  il testo vuoto toglie il campo; oltre il limite rifiuta e dice quanto togliere
  166.6  la carta li disegna come campi scrivibili, non come testo da leggere
*/
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { cambiaTestataProgramma } from "../comune/modifiche-b.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const vista = readFileSync(join(radice, "comune", "vista-programma.js"), "utf8");
const vivo = readFileSync(join(radice, "comune", "piano-vivo.js"), "utf8");
const app = readFileSync(join(radice, "desktop", "app-v31.js"), "utf8");

const QUANDO = "2026-11-26T12:00:00.000Z";
const V2 = {
  versione: 5,
  programMeta: { id: "prg-x", name: "Prova", phase: "Bulk", durationWeeks: 8, daysPerWeek: 4, rotation: ["A", "B"] }
};

test("166.1 l'interruttore disegna lo stato vero", () => {
  assert.match(vista, /const accesa = !!rotScritta/, "lo stato viene dal documento, non da un valore fisso");
  assert.match(vista, /aria-checked", accesa \? "true" : "false"/);
  assert.match(vista, /accesa \? "ON" : "OFF"/);
  assert.ok(!/aria-checked", "true"\)/.test(vista), "non deve restare un ON fisso");
});

test("166.2 spegnere toglie la rotazione e lascia le schede", () => {
  const spento = cambiaTestataProgramma(V2, { campo: "rotazione", valore: "" }, { quando: QUANDO, uid: "u1" });
  assert.equal(spento.ok, true, spento.motivo);
  assert.equal(Object.prototype.hasOwnProperty.call(spento.dati.programMeta, "rotation"), false, "la rotazione sparisce dal meta");
  assert.deepEqual(spento.dati.programMeta.sheets, undefined, "le schede non si toccano");
  assert.match(vivo, /rotazione spenta: le schede restano/, "e la riga di stato lo dice");
});

test("166.3 riaccendere scrive le lettere dell'anteprima", () => {
  assert.match(vivo, /dallAnteprima/, "l'accensione prende le lettere dalle pastiglie");
  assert.match(vivo, /letters?.*join\(" "\)|letto\.lettere\.join\(" "\)/);
  const riacceso = cambiaTestataProgramma(
    { versione: 6, programMeta: { id: "prg-x" } },
    { campo: "rotazione", valore: "A B" }, { quando: QUANDO, uid: "u1" });
  assert.equal(riacceso.ok, true, riacceso.motivo);
  assert.deepEqual(riacceso.dati.programMeta.rotation, ["A", "B"]);
});

test("166.4 descrizione e messaggio si salvano nel meta, con gli a capo", () => {
  const testo = "Forza base\ndue sedute brevi, una lunga";
  const desc = cambiaTestataProgramma(V2, { campo: "descrizione", valore: testo }, { quando: QUANDO, uid: "u1" });
  assert.equal(desc.ok, true, desc.motivo);
  assert.equal(desc.dati.programMeta.description, testo, "il testo arriva intero, a capo compresi");
  const msg = cambiaTestataProgramma(V2, { campo: "messaggio", valore: "Ciao, oggi si parte piano" }, { quando: QUANDO, uid: "u1" });
  assert.equal(msg.ok, true, msg.motivo);
  assert.equal(msg.dati.programMeta.message, "Ciao, oggi si parte piano");
  assert.equal(msg.dati.programMeta.updatedAt, QUANDO);
});

test("166.5 vuoto toglie il campo, troppo lungo rifiuta", () => {
  const conTesto = { versione: 7, programMeta: { id: "prg-x", description: "Forza base" } };
  const vuoto = cambiaTestataProgramma(conTesto, { campo: "descrizione", valore: "   " }, { quando: QUANDO, uid: "u1" });
  assert.equal(vuoto.ok, true);
  assert.equal(Object.prototype.hasOwnProperty.call(vuoto.dati.programMeta, "description"), false);
  const lungo = cambiaTestataProgramma(V2, { campo: "messaggio", valore: "x".repeat(1001) }, { quando: QUANDO, uid: "u1" });
  assert.equal(lungo.ok, false);
  assert.match(lungo.motivo, /1000/);
  assert.match(lungo.motivo, /accorcialo di 1/);
});

test("166.6 la carta li disegna come campi scrivibili", () => {
  assert.match(vista, /"programma-descrizione", "area"/, "la descrizione è un campo scrivibile");
  assert.match(vista, /"programma-messaggio", "area"/, "il messaggio è un campo scrivibile");
  assert.match(vista, /n\(doc, "textarea", "pr-in pr-vivo pr-area"\)/, "textarea, non input numerico");
  assert.match(vivo, /descrizione\.addEventListener\("change"/, "la pagina ascolta la descrizione");
  assert.match(vivo, /messaggio\.addEventListener\("change"/, "la pagina ascolta il messaggio");
  assert.match(app, /descrizione: nomePulito\(rp\.profilo\.descrizione\)/, "dopo il salvataggio la carta ritrova il testo");
  assert.match(app, /messaggio: nomePulito\(rp\.profilo\.messaggio\)/);
});
