/* tests/117-settimane-test.test.mjs — le settimane di test lette dalle celle
 * (PASSO 4c-anticipo, 19/11/2026) e il titolo della scheda una volta sola.
 *
 * Regola: una settimana e' "di test" se il suo tipo nei dati e' "test", oppure
 * se nelle celle (serie o ripetizioni) di almeno un esercizio c'e' la parola
 * "test", senza maiuscole e con confine di parola. Le righe tecniche non
 * contano. Campo Test e spia rosa usano la stessa funzione.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { settimaneDiTest, settimaneTestDiRiga, testoTest, NESSUN_TEST } from "../comune/settimane-test.js";

const W = (serie, ripetizioni, type) => (type ? { serie, ripetizioni, type } : { serie, ripetizioni });
const otto = (serie, rip) => Array.from({ length: 8 }, (_, i) => (i === 0 ? W(serie, rip) : W("3", "10-8")));
const ESE = (id, settimane, extra) => Object.assign({ id: id, nome: id, prescrizione: { elencoSettimane: settimane } }, extra || {});

test("117.1 «test 12rm» in S1: la scheda dice S1", () => {
  const scheda = { esercizi: [ESE("Lat machine", otto("4", "test 12rm"))] };
  assert.deepEqual(settimaneDiTest(scheda), [1]);
  assert.equal(testoTest(settimaneDiTest(scheda)), "S1");
});

test("117.2 test anche in S5: «S1 · S5»", () => {
  const sett = otto("4", "test 12rm");
  sett[4] = W("5", "TEST 5RM");
  const scheda = { esercizi: [ESE("Panca", sett), ESE("Rematore", otto("3", "10"))] };
  assert.deepEqual(settimaneDiTest(scheda), [1, 5]);
  assert.equal(testoTest(settimaneDiTest(scheda)), "S1 · S5");
});

test("117.3 nessuna cella con «test»: «nessun test»", () => {
  const scheda = { esercizi: [ESE("Squat", otto("4", "6-8"))] };
  assert.deepEqual(settimaneDiTest(scheda), []);
  assert.equal(testoTest([]), NESSUN_TEST);
});

test("117.4 «latest» e «contest» non sono la parola test", () => {
  const scheda = { esercizi: [ESE("Curl", [W("3", "latest 10"), W("3", "contest 8"), W("3", "10")])] };
  assert.deepEqual(settimaneDiTest(scheda), []);
});

test("117.5 la parola in maiuscolo conta", () => {
  const scheda = { esercizi: [ESE("Stacco", [W("3", "10"), W("3", "Test 52RM")])] };
  assert.deepEqual(settimaneDiTest(scheda), [2]);
});

test("117.6 la riga tecnica non conta, nemmeno se ha «test»", () => {
  const scheda = {
    esercizi: [
      ESE("Panca", otto("4", "8")),
      ESE("Panca RP", [W("test", "test")], { tipo: "tecnica", padreId: "p1" }),
      ESE("Panca drop", [W("test", "test")], { padreId: "p1" })
    ]
  };
  assert.deepEqual(settimaneDiTest(scheda), []);
});

test("117.7 il tipo «test» della settimana basta da solo", () => {
  const sett = otto("3", "10");
  sett[2] = W("3", "10", "test");
  const scheda = { esercizi: [ESE("Trazioni", sett)] };
  assert.deepEqual(settimaneDiTest(scheda), [3]);
});

test("117.8 spia della riga e campo della scheda concordano", () => {
  const sett = otto("4", "test 12rm");
  sett[6] = W("2", "test 20RM");
  const riga = settimaneTestDiRiga(sett);
  const scheda = { esercizi: [ESE("Lat machine", sett)] };
  assert.deepEqual(riga, [1, 7]);
  assert.deepEqual(settimaneDiTest(scheda), riga);
  assert.equal(testoTest(riga), "S1 · S7");
});

test("117.9 il titolo non ripete «Scheda A» e passa da suffissoNome", () => {
  const fonte = readFileSync(new URL("../comune/vista-programma.js", import.meta.url), "utf8");
  assert.ok(fonte.includes("function suffissoNome("), "la funzione del titolo c'e'");
  assert.ok(fonte.includes("suffissoNome(scheda)"), "la testata la usa");
  assert.ok(!/nome \? " \u2014 " \+ nomePulito\(scheda\.nome\)/.test(fonte), "non resta nessun «Scheda X — NOME» senza controllo");
});
