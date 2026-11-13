/* Passo B.14d — il volume indiretto: la mappa e la regola 1 / 0,5.
 *
 * Numeri scelti a mano, verificati a mano. Niente dati presi dall'app vera.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { contaVolume, PUNTO_BERSAGLIO, PUNTO_SECONDARIO } from "../comune/volume-b.js";
import { muscoliEsercizio, regolaAccosciata, normalizzaNome, inMappa, statisticheMappa } from "../comune/muscoli-b.js";

/* --------------------------- la regola --------------------------- */

test("89.1 la regola e' una sola costante: 1 al bersaglio, 0,5 ai secondari", () => {
  assert.equal(PUNTO_BERSAGLIO, 1);
  assert.equal(PUNTO_SECONDARIO, 0.5);
});

test("89.2 la panca: 3 serie = 3 dirette sul petto, 1,5 indirette su spalle e tricipiti", () => {
  const panca = muscoliEsercizio("Panca piana", "Pettorali");
  assert.deepEqual(panca.primari, ["Pettorali"]);
  assert.deepEqual(panca.secondari.sort(), ["Spalle", "Tricipiti"].sort());

  const righe = [{
    id: "panca", nome: "Panca piana", primari: panca.primari, secondari: panca.secondari,
    settimane: [{ serie: 3, ripetizioni: 10 }]
  }];
  const c = contaVolume(righe, { quante: 8 });
  const per = Object.fromEntries(c.distretti.map((d) => [d.distretto, d]));
  assert.equal(per.Pettorali.dirette, 3);
  assert.equal(per.Pettorali.indirette, 0);
  assert.equal(per.Pettorali.totale, 3);
  assert.equal(per.Spalle.dirette, 0);
  assert.equal(per.Spalle.indirette, 1.5);
  assert.equal(per.Spalle.totale, 1.5);
  assert.equal(per.Tricipiti.indirette, 1.5);
  assert.equal(c.totale.dirette, 3);
  assert.equal(c.totale.indirette, 3);
  assert.equal(c.totale.totale, 6);
  assert.equal(c.sinergiePct, 50);
  /* volume = serie x ripetizioni: 3 x 10 = 30 */
  assert.equal(c.totale.ripetizioni, 30);
});

test("89.3 la riga tecnica eredita distretto E secondari dal padre", () => {
  const panca = muscoliEsercizio("Panca piana", "");
  const righe = [
    { id: "p", nome: "Panca piana", primari: panca.primari, secondari: panca.secondari, settimane: [{ serie: 3, ripetizioni: 10 }] },
    { id: "t", tipo: "tecnica", padreId: "p", tecnica: "rest-pause", contaVolume: false, settimane: [{ serie: 1, ripetizioni: 4 }] }
  ];
  const c = contaVolume(righe);
  const per = Object.fromEntries(c.distretti.map((d) => [d.distretto, d]));
  /* la figlia: 1 serie diretta sul petto, mezzo punto su spalle e tricipiti */
  assert.equal(per.Pettorali.dirette, 4);
  assert.equal(per.Spalle.indirette, 2);
  assert.equal(per.Tricipiti.indirette, 2);
  assert.equal(c.righeContate, 2);
  assert.equal(c.fuoriVolume, 0);
});

test("89.4 esercizio senza secondari: conta solo come diretto", () => {
  const v = muscoliEsercizio("Leg extension", "Quadricipiti");
  assert.deepEqual(v.primari, ["Quadricipiti"]);
  assert.deepEqual(v.secondari, []);
  const c = contaVolume([{ id: "x", primari: v.primari, secondari: v.secondari, settimane: [{ serie: 4, ripetizioni: 12 }] }]);
  assert.equal(c.totale.dirette, 4);
  assert.equal(c.totale.indirette, 0);
  assert.equal(c.sinergiePct, 0);
  assert.equal(c.righeSenzaSecondari, 1);
});

test("89.5 switch Solo diretto: l'indiretto non entra nel totale", () => {
  const panca = muscoliEsercizio("Panca piana", "");
  const righe = [{ id: "p", primari: panca.primari, secondari: panca.secondari, settimane: [{ serie: 3, ripetizioni: 10 }] }];
  const tutti = contaVolume(righe, { soloDiretto: false });
  const solo = contaVolume(righe, { soloDiretto: true });
  assert.equal(tutti.totale.totale, 6);
  assert.equal(solo.totale.totale, 3);
  assert.equal(solo.totale.indirette, 0);
  assert.equal(solo.sinergiePct, 0);
  const spalle = solo.distretti.find((d) => d.distretto === "Spalle");
  assert.equal(spalle.indirette, 0);
  assert.equal(spalle.totale, 0);
});

/* --------------------------- l'accosciata --------------------------- */

test("89.6 accosciata: senza «glutei» nel nome comanda il quadricipite, con «glutei» comanda il gluteo", () => {
  const goblet = regolaAccosciata("Goblet squat", ["Quadricipiti"], []);
  assert.deepEqual(goblet.primari, ["Quadricipiti"]);
  assert.deepEqual(goblet.secondari, ["Glutei"]);

  const bulgaro = regolaAccosciata("Bulgaro focus glutei", [], []);
  assert.deepEqual(bulgaro.primari, ["Glutei"]);
  assert.deepEqual(bulgaro.secondari, ["Quadricipiti"]);

  const pesante = muscoliEsercizio("Affondo pesante triset", "");
  assert.deepEqual(pesante.primari, ["Glutei"]);
  assert.deepEqual(pesante.secondari, ["Quadricipiti"]);

  /* i femorali non sono mai secondari in accosciata, nemmeno se li porta A */
  const pressa = muscoliEsercizio("Pressa45°_piedi_alti_schienale_chiuso", "");
  assert.deepEqual(pressa.primari.sort(), ["Glutei", "Quadricipiti"].sort());
  assert.equal(pressa.secondari.indexOf("Femorali"), -1);

  const pendulum = muscoliEsercizio("Pendulum", "");
  assert.deepEqual(pendulum.primari, ["Quadricipiti"]);
  assert.deepEqual(pendulum.secondari, ["Glutei"]);
});

/* --------------------------- la copertura --------------------------- */

/* I settantotto esercizi dei cinque programmi (Intensità agosto-ottobre,
 * ottobre-dicembre, B program 1, B program 2, Intensificazione), più push up.
 * Se uno esce dalla mappa, questo test diventa rosso: la mappa non perde pezzi
 * senza che Alice lo sappia. */
const ESERCIZI_PROGRAMMI = [
  "ab roll", "abductor", "adductor", "affondo con rotazione busto triset", "affondo focus glutei",
  "affondo front squat machine", "affondo pesante triset", "alzate laterali",
  "alzate laterali cavo basso cavigliera polso", "alzate laterali macchinario", "alzate laterali seduta",
  "bulgaro focus glutei", "calf al multypower", "calf machine", "cardio tapins + corsa",
  "crab walk con elastico", "crunch machine", "crunch obliqui", "curl cavo basso con bilancere piccolo",
  "curl manubri", "curls bilaciere z", "curls martello panca", "curls martello panca inlinata 45",
  "curls panca 45", "curls panca scoot", "distensione manubri su inclinata", "distensioni manubri su piana",
  "face pull", "french press manubri", "front squat machine", "glutes machine", "goblet squat",
  "hack squat con elastico", "hip thrust", "hip thrust statico", "hip trust mono",
  "hyperstension con cuscinetto", "lat machine", "lat machine supina", "lat machine triangolo",
  "lat mono braccio", "leg curls", "leg curls seduta", "leg curls singolo", "leg extension",
  "leg extension singola", "leg raise", "lento avanti machine", "lento avanti manubri",
  "military al multypower panca70", "panca piana", "pendulum", "pendulum focus glutei",
  "pressa45 piedi alti schienale chiuso", "pull down corda", "pull down sbarra", "pulley mono",
  "pulley sbarra presa larga supina", "pulley triangolo", "push up", "rdl belt machine",
  "rdl focus gluteo", "rematore dead stop", "rotazioni cavo medio", "row machine panatta",
  "sissy squat in piedi", "slanci cavo basso", "slanci laterali cavo basso",
  "slancio laterale cavo basso triset", "stacco gambe semi tese", "stacco mono gamba",
  "stacco rdl", "stacco rumeno con manubri", "trazioni", "trazioni neutre",
  "tricipiti cavo alto in corda", "tricipiti cavo basso dietro la testa",
  "tricipiti manubrio dietro la testa", "vertical row machine singolo presa neutra"
];

test("89.7 tutti e 79 gli esercizi dei cinque programmi sono in mappa", () => {
  const mancanti = ESERCIZI_PROGRAMMI.filter((nome) => !inMappa(nome));
  assert.deepEqual(mancanti, [], "esercizi fuori mappa: " + mancanti.join(", "));
  assert.equal(ESERCIZI_PROGRAMMI.length, 79);
});

test("89.8 ogni esercizio in mappa ha almeno un primario, e nessun doppione", () => {
  ESERCIZI_PROGRAMMI.forEach((nome) => {
    const v = muscoliEsercizio(nome, "");
    assert.ok(v && v.primari.length > 0, "senza primario: " + nome);
    const tutti = v.primari.concat(v.secondari);
    assert.equal(new Set(tutti).size, tutti.length, "distretto ripetuto in: " + nome);
    v.secondari.forEach((d) => {
      assert.equal(v.primari.indexOf(d), -1, "secondario che e' anche primario: " + nome);
    });
  });
});

test("89.9 i distretti sono quelli della casa: nessun nome inventato", () => {
  const buoni = ["Pettorali", "Dorsali", "Spalle", "Bicipiti", "Tricipiti", "Quadricipiti", "Femorali", "Glutei", "Adduttori", "Centro schiena", "Addominali", "Polpacci", "Cardio"];
  ESERCIZI_PROGRAMMI.forEach((nome) => {
    const v = muscoliEsercizio(nome, "");
    v.primari.concat(v.secondari).forEach((d) => {
      assert.ok(buoni.indexOf(d) !== -1, "distretto sconosciuto «" + d + "» in " + nome);
    });
  });
});

test("89.10 nomi con trattini, accenti e maiuscole sono lo stesso esercizio", () => {
  assert.equal(normalizzaNome("Pressa45°_piedi_alti_schienale_chiuso"), "pressa45 piedi alti schienale chiuso");
  assert.equal(normalizzaNome("Military_al_multypower_panca70°"), "military al multypower panca70");
  assert.equal(inMappa("STACCO_RDL"), true);
  assert.equal(inMappa("Curls_panca_45°"), true);
  const s = statisticheMappa();
  assert.ok(s.esercizi >= 79, "la mappa deve tenere almeno i 79 esercizi, ne ha " + s.esercizi);
  assert.ok(s.conSecondari > 0, "qualche esercizio deve avere i secondari");
});
