/* Passo 14 — formato unico del Rec in cella e niente zero inventato.
 *
 * Regole di Alice (8/11/2026), sopra il Passo 12:
 *  1) in cella solo i simboli delle tendine: secondi con il pollice (30", 90",
 *     120-180"), minuti con l'apostrofo (2', 2-3'), misti (1'30"). Mai la
 *     parola "sec" o "min" in cella. Il dato non si riscrive: la cella e'
 *     solo la vista; salvando cambia solo il pezzo del valore.
 *  2) cio' che non e' un valore riconoscibile non diventa mai 0": lo zero
 *     (0, "0", "0 sec", {seconds:0}) come una frase senza valore ("2 2")
 *     lasciano la cella al trattino, la frase intera in Descr./Setup.
 * Caso A3 (Pulley sbarra presa larga supina): "REC: 2 2" in Descr./Setup e
 * uno zero in cella.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { testoRecupero, ricostruisciSchede } from "../comune/schede-v2.js";
import {
  separaRecupero, normalizzaValoreRecupero, recuperoInColonna,
  sostituisciRecupero, REC_TENDINA
} from "../comune/tut-rec.js";
import { riepilogoProgramma } from "../comune/programma.js";
import { renderProgramma } from "../comune/vista-programma.js";

const meta = {
  id: "prg-formato", name: "Formato_recupero", status: "active", phase: "bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, rotation: ["A"],
  description: "", message: "",
  createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};
const sett = (n) => ({ week: n, sets: 4, reps: "10", rest: { seconds: 90 }, type: "normal", note: "", source: "manual" });
const otto = () => Array.from({ length: 8 }, (_, i) => sett(i + 1));
const ESE = (nome, resto, extra) => {
  const e = { name: nome, muscle: "dorso", prescription: { sets: 4, rest: resto }, progression: { weeks: otto() } };
  return Object.assign(e, extra || {});
};
const esercizi = [
  ESE("Pulley_sbarra_presa_larga_supina", "2 2"),
  ESE("Panco_piana", 0),
  Object.assign(ESE("Curl_bilanciere", { seconds: 0 }), { note: "REC: 2 2" }),
  ESE("Rematore_bilanciere", "0 sec"),
  ESE("Lat_machine", { seconds: 90 }),
  ESE("Trazioni_assistite", "120-180 sec")
];
const docs = [{ id: "program-v2-sheet-prg-formato__sh-A", dati: { programId: "prg-formato", sheetId: "sh-A", kind: "sheet",
  sheet: { id: "sh-A", code: "A", name: "Prova formato", updatedAt: "2026-11-02T18:12:00.000Z", exercises: esercizi } } }];

function schermo() {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"g\"></div></body></html>");
  const doc = dom.window.document;
  const r = riepilogoProgramma(meta, [], { schedeV2: ricostruisciSchede(docs), indice: 0, totaleProgrammi: 1, oggi: new Date(Date.UTC(2026, 10, 4)), quante: 8 });
  renderProgramma(doc, doc.querySelector("#g"), { presente: true, numeroSedute: 0 }, r);
  return doc;
}

test("61.01 il formato in cella e' solo quello delle tendine: mai sec o min", () => {
  assert.equal(testoRecupero({ seconds: 30 }), "30\"");
  assert.equal(testoRecupero({ seconds: 90 }), "90\"");
  assert.equal(testoRecupero({ seconds: 120 }), "2'");
  assert.equal(testoRecupero("90"), "90\"");
  /* il dato resta com'e': la normalizzazione avviene alla vista */
  assert.equal(testoRecupero("90 sec"), "90 sec");
  assert.equal(normalizzaValoreRecupero("90 sec"), "90\"");
  assert.equal(normalizzaValoreRecupero("2 min"), "2'");
  assert.equal(normalizzaValoreRecupero("120-180 sec"), "120-180\"");
  assert.equal(normalizzaValoreRecupero("2-3'"), "2-3'");
  assert.equal(normalizzaValoreRecupero("1'30\""), "1'30\"");
  assert.equal(normalizzaValoreRecupero("1,30'"), "1'30\"");
  REC_TENDINA.forEach((t) => assert.ok(!/sec|min/i.test(t), "la tendina ha una parola: " + t));
});

test("61.02 lo zero non e' un valore: mai 0' o 0\" nella cella", () => {
  assert.equal(testoRecupero(0), "");
  assert.equal(testoRecupero("0"), "");
  assert.equal(testoRecupero({ seconds: 0 }), "");
  assert.equal(normalizzaValoreRecupero("0"), "");
  assert.equal(normalizzaValoreRecupero("0\""), "");
  assert.equal(normalizzaValoreRecupero("0'"), "");
  assert.equal(normalizzaValoreRecupero("0 sec"), "");
  assert.equal(normalizzaValoreRecupero("0,00'"), "");
  assert.equal(separaRecupero("0 sec").valore, "");
  assert.equal(sostituisciRecupero("2 2", "0\""), "2 2", "lo zero scritto a mano non entra nel dato");
});

test("61.03 una frase senza valore non diventa 0\": il caso di A3", () => {
  const p = separaRecupero("2 2");
  assert.equal(p.valore, "");
  assert.equal(p.frase, "2 2");
  assert.equal(recuperoInColonna("2 2"), false);
});

test("61.04 a schermo: trattino nelle celle vuote, frase intera in Descr./Setup, simboli ovunque", () => {
  const doc = schermo();
  const tab = doc.querySelector("table.p8-tab");
  const rec = Array.from(tab.querySelectorAll("td.c-rec span.rec")).map((s) => s.textContent);
  assert.deepEqual(rec, ["\u2014", "\u2014", "\u2014", "\u2014", "90\"", "120-180\""]);
  const tut = Array.from(tab.querySelectorAll("td.c-tut span.tut")).map((s) => s.textContent);
  assert.ok(tut.every((t) => t === "\u2014"));
  assert.ok(doc.body.textContent.includes("REC: 2 2"), "la frase di A3 non sta in Descr./Setup");
  assert.ok(doc.body.textContent.includes("Pulley sbarra presa larga supina"));
  assert.ok(!tab.textContent.includes("sec") && !tab.textContent.includes("min"), "parole sec/min nella tabella");
});

test("61.05 salvando cambia solo il pezzo del valore, gia' con i simboli", () => {
  assert.equal(sostituisciRecupero("1' a braccio poi 90 sec", "2'"), "1' a braccio poi 2'");
  assert.equal(sostituisciRecupero("120-180 sec", "3'"), "3'");
  assert.equal(sostituisciRecupero("2 2", "90\""), "2 2 90\"");
  assert.equal(sostituisciRecupero("90 sec", "2'"), "2'");
});
