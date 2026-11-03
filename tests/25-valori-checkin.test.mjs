// tests/25-valori-checkin.test.mjs — Fase 2l: i valori del check-in.
// Le cinque voci che A scrive davvero (r.15021), una per riga, con la data.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  VOCI_CHECKIN, valoriDelCheckin, dataDelCheckin, quanteRegistrate, righeValoriCheckin
} from "../comune/valori-checkin.js";

const mobile = readFileSync(new URL("../mobile/app.js", import.meta.url), "utf8");
const desktop = readFileSync(new URL("../desktop/app.js", import.meta.url), "utf8");
const modulo = readFileSync(new URL("../comune/valori-checkin.js", import.meta.url), "utf8");

const PIENO = {
  date: "2026-10-21",
  createdAt: "2026-10-21T18:02:00.000Z",
  questionnaireId: "questionnaire-weekly-checkin",
  answers: { a: "b" },
  wellness: { energy: "alta", sleep: "7/10", doms: "pochi", stress: "basso", hunger: "media" }
};

test("25.01 le voci sono le cinque che A scrive davvero, nell'ordine dichiarato", () => {
  assert.deepEqual(VOCI_CHECKIN.map((v) => v.chiave), ["energy", "sleep", "doms", "stress", "hunger"]);
  assert.deepEqual(VOCI_CHECKIN.map((v) => v.nome), ["Energia", "Sonno", "DOMS", "Stress", "Fame"]);
});

test("25.02 un check-in pieno mostra cinque valori, tutti registrati", () => {
  const righe = valoriDelCheckin(PIENO);
  assert.equal(righe.length, 5);
  righe.forEach((r) => assert.equal(r.registrato, true, r.nome + " risulta mancante"));
  assert.equal(righe[0].valore, "alta");
  assert.equal(righe[4].valore, "media");
  assert.equal(quanteRegistrate(righe), 5);
});

test("25.03 una voce vuota resta al suo posto e dice «non registrato»", () => {
  const righe = valoriDelCheckin({ date: "2026-10-21", wellness: { energy: "alta", sleep: "", doms: null } });
  assert.equal(righe.length, 5, "le voci mancanti non devono sparire");
  assert.equal(righe[0].valore, "alta");
  assert.equal(righe[1].valore, "non registrato");
  assert.equal(righe[1].registrato, false);
  assert.equal(righe[2].valore, "non registrato");
  assert.equal(righe[3].valore, "non registrato", "stress assente deve dirlo, non sparire");
  assert.equal(quanteRegistrate(righe), 1);
});

test("25.04 senza check-in: cinque righe, tutte «non registrato», data dichiarata assente", () => {
  [null, undefined, {}].forEach((vuoto) => {
    const righe = valoriDelCheckin(vuoto);
    assert.equal(righe.length, 5);
    assert.equal(quanteRegistrate(righe), 0);
    righe.forEach((r) => assert.equal(r.valore, "non registrato"));
  });
  const data = dataDelCheckin(null);
  assert.equal(data.registrata, false);
  assert.equal(data.testo, "data non registrata");
});

test("25.05 la data mostrata è quella del check-in, non quella di oggi", () => {
  assert.deepEqual(dataDelCheckin(PIENO), { testo: "2026-10-21", registrata: true });
  assert.deepEqual(dataDelCheckin({ createdAt: "2026-10-20T08:00:00.000Z" }), { testo: "2026-10-20T08:00:00.000Z", registrata: true });
  assert.equal(dataDelCheckin({ date: "   " }).registrata, false);
});

test("25.06 zero e falso sono valori, non buchi", () => {
  const righe = valoriDelCheckin({ wellness: { energy: 0, sleep: false } });
  assert.equal(righe[0].valore, "0");
  assert.equal(righe[0].registrato, true);
  assert.equal(righe[1].valore, "no");
  assert.equal(righe[1].registrato, true);
});

test("25.07 le righe della carta: prima la data, poi le cinque voci, poi il conto", () => {
  const righe = righeValoriCheckin(PIENO);
  assert.equal(righe[0].testo, "ultimo aggiornamento: 2026-10-21");
  assert.equal(righe[0].classe, "lemmacarta");
  assert.equal(righe[1].testo, "Energia — alta");
  assert.equal(righe[6].testo, "tutte e 5 le voci compilate");
  const parziale = righeValoriCheckin({ date: "2026-10-21", wellness: { energy: "alta" } });
  assert.match(parziale[6].testo, /^1 voci su 5 compilate/);
  const vuoto = righeValoriCheckin(null);
  assert.equal(vuoto[0].classe, "errore", "una data assente non deve sembrare normale");
});

test("25.08 la carta esiste sul telefono e sul desktop, con la stessa fonte dichiarata", () => {
  assert.match(mobile, /carta\(doc, "Valori del check-in", righeValoriCheckin\(modello\.checkin\)/);
  assert.match(desktop, /carta\(doc, "Valori del check-in", righeValoriCheckin\(modello\.checkin\)/);
  assert.match(mobile, /questionnaireHistory · wellness \(energy, sleep, doms, stress, hunger\) · A r\.15021/);
});

test("25.09 la pagina legge il check-in, non le metriche che A non scrive", () => {
  const soloCodice = modulo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.ok(!/metrics/.test(soloCodice), "il modulo non deve leggere metrics: A non le scrive");
  assert.match(modulo, /questionnaireHistory/);
});

test("25.10 solo lettura e nessun !important", () => {
  assert.ok(!/\.set\(|\.add\(|\.update\(|\.delete\(|setDoc|addDoc/.test(modulo + mobile + desktop));
  assert.ok(!/!important/.test(modulo));
  assert.ok(!/[A-Za-z]:\\\\/.test(modulo));
});
