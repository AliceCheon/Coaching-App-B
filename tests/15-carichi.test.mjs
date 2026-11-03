/* Fase 2d · guardia dei carichi per esercizio.
 *
 * La regola che questa guardia difende: un peso si legge, non si deduce. Se il
 * campo non c'e' o non e' un numero, l'esercizio esce dai conti e la Diva lo
 * dice. E nessun confronto tra esercizi diversi: due esercizi non si sommano.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  carichiPerEsercizio,
  eserciziDellaSeduta,
  eserciziConStoria,
  righeCarichi,
  numeroCarico,
  SOGLIE_CARICHI,
  CAMPI_CARICHI
} from "../comune/carichi.js";
import { voceDelCarico } from "../comune/diva-bot.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");

function seduta(dateInput, esercizi) {
  return { dateInput, sessionCode: "A", exercises: esercizi };
}

function serie(peso, reps) {
  return { weight: peso, reps: reps };
}

const OGGI = new Date(Date.UTC(2026, 10, 3));

test("legge il peso massimo di un esercizio dalle sue serie", () => {
  const dato = eserciziDellaSeduta(
    seduta("2026-11-02", [{ name: "Panca piana", sets: [serie(40, 8), serie(45, 6), serie(42.5, 8)] }])
  );
  assert.equal(dato.visti, 1);
  assert.equal(dato.conPeso, 1);
  assert.equal(dato.esercizi[0].massimo, 45);
  assert.equal(dato.esercizi[0].serieConPeso, 3);
});

test("accetta i nomi italiani dei campi", () => {
  const dato = eserciziDellaSeduta(
    seduta("2026-11-02", [{ nome: "Stacco", serie: [{ peso: "100 kg", ripetizioni: 5 }] }])
  );
  assert.equal(dato.esercizi[0].massimo, 100);
});

test("legge una serie scritta come testo di palestra", () => {
  const dato = eserciziDellaSeduta(seduta("2026-11-02", [{ name: "Squat", sets: ["80 kg x 5"] }]));
  assert.equal(dato.esercizi[0].massimo, 80);
});

test("la virgola e' un separatore decimale, non una migliaia", () => {
  assert.equal(numeroCarico("42,5 kg"), 42.5);
  assert.equal(numeroCarico("0"), 0);
  assert.equal(numeroCarico("corpo libero"), null);
  assert.equal(numeroCarico(""), null);
});

test("un esercizio senza peso resta fuori dai conti, e non vale zero", () => {
  const dato = eserciziDellaSeduta(
    seduta("2026-11-02", [{ name: "Trazioni", sets: [{ reps: 8 }, { reps: 6 }] }])
  );
  assert.equal(dato.visti, 1);
  assert.equal(dato.conPeso, 0);
  assert.equal(dato.esercizi[0].massimo, null);
  assert.equal(dato.esercizi[0].ripetizioni, 14);
});

test("senza esercizi la card dice non registrato e spiega cosa ha visto", () => {
  const vuoto = carichiPerEsercizio([], { oggi: OGGI });
  const righe = righeCarichi(vuoto);
  assert.equal(righe[0].testo, "non registrato");
  assert.equal(vuoto.esercizi.length, 0);

  const senzaPeso = carichiPerEsercizio([seduta("2026-11-02", [{ name: "Plank", sets: [{ reps: 30 }] }])], { oggi: OGGI });
  const righeSenzaPeso = righeCarichi(senzaPeso);
  assert.match(righeSenzaPeso[1].testo, /1 esercizi letti/);
  assert.match(righeSenzaPeso[1].testo, /non li stimo/);
});

test("raggruppa lo stesso esercizio scritto con maiuscole diverse", () => {
  const carichi = carichiPerEsercizio(
    [
      seduta("2026-10-20", [{ name: "Panca Piana", sets: [serie(40, 8)] }]),
      seduta("2026-10-27", [{ name: "panca piana", sets: [serie(42.5, 8)] }])
    ],
    { oggi: OGGI }
  );
  assert.equal(carichi.esercizi.length, 1);
  assert.equal(carichi.esercizi[0].numeroOccorrenze, 2);
});

test("due esercizi diversi non si sommano e non si confrontano", () => {
  const carichi = carichiPerEsercizio(
    [
      seduta("2026-10-20", [{ name: "Squat", sets: [serie(100, 5)] }, { name: "Curl", sets: [serie(10, 12)] }]),
      seduta("2026-10-27", [{ name: "Squat", sets: [serie(100, 5)] }, { name: "Curl", sets: [serie(12, 12)] }])
    ],
    { oggi: OGGI }
  );
  assert.equal(carichi.esercizi.length, 2);
  const squat = carichi.esercizi.find((e) => e.chiave === "squat");
  const curl = carichi.esercizi.find((e) => e.chiave === "curl");
  assert.equal(squat.ultimoMassimo, 100);
  assert.equal(curl.ultimoMassimo, 12);
  assert.equal(curl.variazione, 20);
});

test("la variazione e' tra la prima e l'ultima occorrenza della finestra", () => {
  const carichi = carichiPerEsercizio(
    [
      seduta("2026-10-06", [{ name: "Panca", sets: [serie(50, 5)] }]),
      seduta("2026-10-20", [{ name: "Panca", sets: [serie(55, 5)] }]),
      seduta("2026-11-02", [{ name: "Panca", sets: [serie(60, 5)] }])
    ],
    { oggi: OGGI }
  );
  const panca = carichi.esercizi[0];
  assert.equal(panca.variazione, 20);
  assert.equal(panca.massimoStorico, 60);
  assert.equal(panca.giorniDallUltima, 1);
  assert.equal(eserciziConStoria(carichi).length, 1);
});

test("i pesi fuori dalla finestra sono esclusi e contati, non cancellati", () => {
  const carichi = carichiPerEsercizio(
    [
      seduta("2026-06-01", [{ name: "Panca", sets: [serie(90, 5)] }]),
      seduta("2026-11-02", [{ name: "Panca", sets: [serie(60, 5)] }])
    ],
    { oggi: OGGI }
  );
  assert.equal(carichi.fuoriFinestra, 1);
  assert.equal(carichi.esercizi[0].numeroOccorrenze, 1);
  assert.equal(carichi.esercizi[0].variazione, null);
});

test("una data impossibile non entra nei conti", () => {
  const carichi = carichiPerEsercizio(
    [seduta("2026-02-31", [{ name: "Panca", sets: [serie(40, 5)] }]), seduta("", [{ name: "Panca", sets: [serie(50, 5)] }])],
    { oggi: OGGI }
  );
  assert.equal(carichi.esercizi.length, 0);
  assert.equal(carichi.seduteConCarichi, 0);
});

test("la voce del carico: calo dice attenzione con i chili veri", () => {
  const carichi = carichiPerEsercizio(
    [
      seduta("2026-10-06", [{ name: "Stacco", sets: [serie(120, 5)] }]),
      seduta("2026-10-20", [{ name: "Stacco", sets: [serie(115, 5)] }]),
      seduta("2026-11-02", [{ name: "Stacco", sets: [serie(105, 5)] }])
    ],
    { oggi: OGGI }
  );
  const voce = voceDelCarico(carichi);
  assert.equal(voce.tono, "attenzione");
  assert.match(voce.testo, /Stacco/);
  assert.match(voce.testo, /105/);
  assert.doesNotMatch(voce.testo, /infortun|sovrallen|bruciat/i);
});

test("la voce del carico: un massimo nuovo ha tono buono", () => {
  const carichi = carichiPerEsercizio(
    [
      seduta("2026-10-06", [{ name: "Squat", sets: [serie(80, 5)] }]),
      seduta("2026-10-20", [{ name: "Squat", sets: [serie(85, 5)] }]),
      seduta("2026-11-02", [{ name: "Squat", sets: [serie(90, 5)] }])
    ],
    { oggi: OGGI }
  );
  const voce = voceDelCarico(carichi);
  assert.equal(voce.tono, "bene");
  assert.match(voce.testo, /90 kg/);
});

test("la voce del carico: senza pesi dice non registrato, senza inventare", () => {
  const voce = voceDelCarico(carichiPerEsercizio([], { oggi: OGGI }));
  assert.equal(voce.tono, "neutro");
  assert.match(voce.testo, /non sono registrat|non registrat/);
  assert.deepEqual(voce.testo.match(/\d+/g), null);
});

test("la voce del carico: poche sedute non fanno una tendenza", () => {
  const carichi = carichiPerEsercizio([seduta("2026-11-02", [{ name: "Panca", sets: [serie(60, 5)] }])], { oggi: OGGI });
  const voce = voceDelCarico(carichi);
  assert.equal(voce.tono, "neutro");
  assert.match(voce.testo, new RegExp(String(SOGLIE_CARICHI.minOccorrenze)));
});

test("i campi accettati sono dichiarati, non sparsi nel codice", () => {
  assert.ok(Array.isArray(CAMPI_CARICHI.esercizi) && CAMPI_CARICHI.esercizi.length >= 1);
  assert.ok(CAMPI_CARICHI.peso.indexOf("weight") >= 0);
  assert.ok(CAMPI_CARICHI.peso.indexOf("peso") >= 0);
});

test("il modulo dei carichi non scrive, non tocca il DOM e non va in rete", () => {
  const sorgente = readFileSync(join(radice, "comune", "carichi.js"), "utf8");
  assert.doesNotMatch(sorgente, /document\.|window\.|fetch\(|localStorage|indexedDB/);
  assert.doesNotMatch(sorgente, /\.set\s*\(|\.update\s*\(|\.delete\s*\(|\.add\s*\(/);
});
