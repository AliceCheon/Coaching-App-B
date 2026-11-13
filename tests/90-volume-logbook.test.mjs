/* Passo B.14e — il volume eseguito: le serie chiuse del Logbook.
 *
 * Numeri scelti a mano e verificati a mano. Le sedute finte hanno la stessa
 * forma di quelle vere (seduteLogbook): { w, sc, ex: [{ n, np, cs }] }, dove
 * cs e' [kg, reps, rpe, rir].
 */

import test from "node:test";
import assert from "node:assert/strict";
import { contaVolume, righeDalLogbook } from "../comune/volume-b.js";

/* Lat machine, settimana 1: tre serie chiuse, 8 + 8 + 10 ripetizioni. */
const LAT_S1 = { w: 1, sc: "A1", ex: [
  { n: "Lat machine", np: "Lat machine", cs: [[55, 8, null, null], [55, 8, null, null], [55, 10, null, null]] }
] };

/* Lat machine, settimana 2: due serie da 8. */
const LAT_S2 = { w: 2, sc: "A2", ex: [
  { n: "Lat machine", np: "Lat machine", cs: [[57, 8, null, null], [57, 8, null, null]] }
] };

/* Lat machine senza settimana nel documento: non si inventa, va nel secchio 0. */
const LAT_SENZA = { w: "", sc: "A3", ex: [
  { n: "Lat machine", np: "Lat machine", cs: [[50, 10, null, null]] }
] };

/* Lat machine chi usa solo il carico: due serie senza ripetizioni. */
const LAT_SENZA_REPS = { w: 4, sc: "A4", ex: [
  { n: "Lat machine", np: "Lat machine", cs: [[50, null, null, null], [50, null, null, null]] }
] };

/* Panca, settimana 1: due serie da 6. */
const PANCA = { w: 1, sc: "A1", ex: [
  { n: "Panca_piana", np: "Panca piana", cs: [[60, 6, null, null], [60, 6, null, null]] }
] };

/* Seduta con un esercizio mai chiuso: non fa riga. */
const VUOTA = { w: 5, sc: "A5", ex: [
  { n: "Calf_machine", np: "Calf machine", cs: [] }
] };

test("90.1 fanno riga solo le serie chiuse, e una riga per esercizio", () => {
  const { righe, dichiarazioni } = righeDalLogbook([LAT_S1, LAT_S2, LAT_SENZA, LAT_SENZA_REPS, PANCA, VUOTA]);
  assert.deepEqual(righe.map((r) => r.nome).sort(), ["Lat machine", "Panca_piana"]);
  assert.equal(dichiarazioni.seduteLette, 6);
  assert.equal(dichiarazioni.seduteUsate, 5);
  assert.equal(dichiarazioni.senzSettimana, 1);
  const lat = righe.find((r) => r.nome === "Lat machine");
  assert.deepEqual(lat.settimane.map((c) => c.settimana), [0, 1, 2, 4]);
});

test("90.2 le ripetizioni sono la somma di quelle vere: 8 + 8 + 10, non 3 x 9", () => {
  const { righe } = righeDalLogbook([LAT_S1]);
  const cella = righe[0].settimane[0];
  assert.equal(cella.serie, 3);
  assert.equal(cella.ripetizioniTotali, 26);
  assert.equal(cella.ripetizioniMancanti, 0);
});

test("90.3 il conto eseguito: 5 serie, 42 ripetizioni, il petto non c'entra", () => {
  const { righe } = righeDalLogbook([LAT_S1, LAT_S2]);
  const conto = contaVolume(righe, { quante: 2 });
  assert.equal(conto.totale.serie, 5);
  assert.equal(conto.totale.ripetizioni, 42);
  assert.equal(conto.distretti.length, 2);
  const dorsali = conto.distretti.find((d) => d.distretto === "Dorsali");
  const bicipiti = conto.distretti.find((d) => d.distretto === "Bicipiti");
  assert.equal(dorsali.dirette, 5);
  assert.equal(dorsali.indirette, 0);
  assert.equal(bicipiti.dirette, 0);
  assert.equal(bicipiti.indirette, 2.5);
  assert.equal(bicipiti.totale, 2.5);
});

test("90.4 panca e lat insieme: ogni serie un punto, ogni sponda mezzo", () => {
  const { righe } = righeDalLogbook([LAT_S1, PANCA]);
  const conto = contaVolume(righe, { quante: 1 });
  const per = Object.create(null);
  conto.distretti.forEach((d) => { per[d.distretto] = d; });
  assert.equal(per.Dorsali.dirette, 3);
  assert.equal(per.Bicipiti.indirette, 1.5);
  assert.equal(per.Pettorali.dirette, 2);
  assert.equal(per.Spalle.indirette, 1);
  assert.equal(per.Tricipiti.indirette, 1);
  assert.equal(conto.totale.dirette, 5);
  assert.equal(conto.totale.indirette, 3.5);
  assert.equal(conto.totale.totale, 8.5);
});

test("90.5 la seduta senza settimana entra nel totale e non nella media", () => {
  const { righe } = righeDalLogbook([LAT_S1, LAT_SENZA]);
  const conto = contaVolume(righe, { quante: 3 });
  assert.equal(conto.totale.serie, 4);
  assert.ok(conto.senzaSettimana, "il secchio senza settimana deve esserci");
  assert.equal(conto.senzaSettimana.serie, 1);
  assert.equal(conto.senzaSettimana.totale, 1.5);
  assert.equal(conto.settimaneContate, 1);
  assert.equal(conto.mediaTotale, 4.5);
  assert.equal(conto.picco.numero, 1);
  const zero = conto.settimane.find((s) => s.numero === 0);
  assert.ok(zero && zero.serie === 1, "la settimana 0 sta nella tabella, dichiarata");
});

test("90.6 le serie senza ripetizioni contano come serie e si dichiarano mancanti", () => {
  const { righe, dichiarazioni } = righeDalLogbook([LAT_SENZA_REPS]);
  assert.equal(dichiarazioni.serieSenzaRip, 2);
  const conto = contaVolume(righe, { quante: 4 });
  assert.equal(conto.totale.serie, 2);
  assert.equal(conto.totale.ripetizioni, 0);
  assert.equal(conto.totale.ripetizioniMancanti, 2);
});

test("90.7 senza serie chiuse non nasce nessuna riga e il conto e' vuoto", () => {
  const { righe, dichiarazioni } = righeDalLogbook([VUOTA]);
  assert.equal(righe.length, 0);
  assert.equal(dichiarazioni.seduteUsate, 0);
  const conto = contaVolume(righe, { quante: 8 });
  assert.equal(conto.totale.serie, 0);
  assert.equal(conto.totale.serie, 0);
});

test("90.8 un nome che la mappa non conosce resta senza distretto, non si indovina", () => {
  const ignoto = { w: 1, sc: "Z9", ex: [{ n: "Macchina_inventata_xyz", np: "Macchina", cs: [[10, 5, null, null]] }] };
  const { righe } = righeDalLogbook([ignoto]);
  assert.equal(righe.length, 1);
  const conto = contaVolume(righe, { quante: 1 });
  assert.equal(conto.righeSenzaDistretto, 1);
  assert.equal(conto.totale.serie, 0);
});

test("90.9 lo switch del solo diretto spegne l'indiretto anche sul Logbook", () => {
  const { righe } = righeDalLogbook([LAT_S1]);
  const conto = contaVolume(righe, { quante: 1, soloDiretto: true });
  assert.equal(conto.totale.dirette, 3);
  assert.equal(conto.totale.indirette, 0);
  assert.equal(conto.totale.totale, 3);
  assert.equal(conto.sinergiePct, 0);
});
