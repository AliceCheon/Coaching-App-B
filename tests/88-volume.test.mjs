/* Passo B.14 — il volume conta davvero. Aggiornato al B.14d: il tonnellaggio
 * non c'e' piu', il volume e' serie x ripetizioni, e il conto distingue
 * diretto e indiretto.
 *
 * I numeri di questo test sono scelti a mano e verificati a mano: nessun dato
 * copiato dall'app vera. Se il conto cambia, qui si vede subito.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { contaVolume, formattaNumero, numeroDaTesto, righeDalleSchede, testoVolume } from "../comune/volume-b.js";

/* Scheda finta, otto settimane di lavoro:
 *  - lat:      S1 3x10 ; S2 4x8   -> 3 + 4 = 7 serie, 30 + 32 = 62 ripetizioni
 *  - panca:    S1 4x8  ; S2 4x8   -> 8 serie, 64 ripetizioni
 *  - tecnica:  rest-pause sotto lat, S1 1 serie, reps in testo, campo a false
 *              (deve contare lo stesso e prendere i secondari del padre)
 *  - vecchia:  spalle con il campo a false: resta fuori
 */
const RIGHE = [
  {
    id: "lat", nome: "Lat machine", primari: ["Dorsali"], secondari: ["Bicipiti"], settimane: [
      { serie: 3, ripetizioni: 10 },
      { serie: 4, ripetizioni: 8 }
    ]
  },
  {
    id: "panca", nome: "Panca piana", primari: ["Pettorali"], secondari: ["Tricipiti", "Spalle"], settimane: [
      { serie: 4, ripetizioni: 8 },
      { serie: 4, ripetizioni: 8 }
    ]
  },
  {
    id: "tec-rest-pause", tipo: "tecnica", padreId: "lat", tecnica: "rest-pause",
    contaVolume: false, settimane: [{ serie: 1, ripetizioni: "rest pause" }]
  },
  {
    id: "spalle-vecchia", primari: ["Spalle"], secondari: [], contaVolume: false,
    settimane: [{ serie: 3, ripetizioni: 12 }]
  }
];

test("88.1 serie e ripetizioni, e la riga vecchia resta fuori", () => {
  const c = contaVolume(RIGHE);
  /* serie: 3 + 4 + 4 + 4 + 1 = 16 ; ripetizioni: 30 + 32 + 32 + 32 = 126
   * (la tecnica ha le ripetizioni in testo, quindi non si sommano) */
  assert.equal(c.totale.serie, 16);
  assert.equal(c.totale.ripetizioni, 126);
  assert.equal(c.totale.ripetizioniMancanti, 1);
  assert.equal(c.righeContate, 3);
  assert.equal(c.fuoriVolume, 1);
});

test("88.2 settimana per settimana: S1 8 serie, S2 8 serie", () => {
  const c = contaVolume(RIGHE);
  assert.equal(c.settimane.length, 2);
  const s1 = c.settimane[0];
  const s2 = c.settimane[1];
  assert.deepEqual({ n: s1.numero, serie: s1.serie, rip: s1.ripetizioni }, { n: 1, serie: 8, rip: 62 });
  assert.deepEqual({ n: s2.numero, serie: s2.serie, rip: s2.ripetizioni }, { n: 2, serie: 8, rip: 64 });
  assert.equal(c.mediaDirette, 8);
  assert.equal(c.picco.numero, 1);
});

test("88.3 distretti: la tecnica eredita distretto e secondari dal padre", () => {
  const c = contaVolume(RIGHE);
  const per = Object.fromEntries(c.distretti.map((d) => [d.distretto, d]));
  assert.deepEqual(Object.keys(per).sort(), ["Bicipiti", "Dorsali", "Pettorali", "Spalle", "Tricipiti"]);
  /* dorsali: 3+4 dirette della lat, piu' 1 della tecnica */
  assert.equal(per.Dorsali.dirette, 8);
  assert.equal(per.Dorsali.indirette, 0);
  /* bicipiti: 8 serie x 0,5 = 4 indirette (tecnica compresa) */
  assert.equal(per.Bicipiti.dirette, 0);
  assert.equal(per.Bicipiti.indirette, 4);
  assert.equal(per.Pettorali.dirette, 8);
  assert.equal(per.Spalle.indirette, 4);
  assert.equal(per.Tricipiti.indirette, 4);
});

test("88.4 ripetizioni in testo: la serie conta, le ripetizioni si dichiarano mancanti", () => {
  const solo = [{ id: "x", primari: ["Glutei"], secondari: [], settimane: [{ serie: 4, ripetizioni: "8-10" }] }];
  const c = contaVolume(solo);
  assert.equal(c.totale.serie, 4);
  assert.equal(c.totale.ripetizioni, 0);
  assert.equal(c.totale.ripetizioniMancanti, 4);
  assert.equal(c.totale.dirette, 4);
});

test("88.5 lo zero è un dato, il vuoto no: la settimana non scritta non entra", () => {
  const c = contaVolume([{ id: "y", primari: ["Quadricipiti"], secondari: ["Glutei"], settimane: [{ serie: 3, ripetizioni: 12 }] }], { quante: 8 });
  assert.equal(c.totale.serie, 3);
  assert.equal(c.settimane.length, 8);
  assert.equal(c.settimane[7].serie, 0);
  assert.equal(c.settimane[7].dirette, 0);
  assert.equal(c.settimaneContate, 1);
  assert.equal(c.mediaTotale, 4.5);
});

test("88.6 il ponte con la scheda: nome, mappa, prescrizione e tecnica figlia", () => {
  const scheda = {
    codice: "A",
    esercizi: [
      { id: "e1", nome: "Panca piana", muscolo: "Pettorali", prescrizione: { elencoSettimane: [{ serie: "4", ripetizioni: "8" }] } },
      { id: "e2", tipo: "tecnica", padreId: "e1", tecnica: "myo-reps", settimane: [{ serie: "1", ripetizioni: "myo reps" }], contaVolume: false },
      { id: "e3", nome: "Leg extension", muscolo: "Quadricipiti", deletedAt: "2026-11-01", prescrizione: { elencoSettimane: [{ serie: "9", ripetizioni: "9" }] } }
    ]
  };
  const righe = righeDalleSchede([scheda]);
  assert.equal(righe.length, 2);
  assert.deepEqual(righe[0].primari, ["Pettorali"]);
  assert.deepEqual(righe[0].secondari.sort(), ["Spalle", "Tricipiti"].sort());
  assert.equal(righe[1].tipo, "tecnica");
  assert.equal(righe[1].padreId, "e1");
  const c = contaVolume(righe);
  assert.equal(c.totale.serie, 5);
  const per = Object.fromEntries(c.distretti.map((d) => [d.distretto, d]));
  assert.equal(per.Pettorali.dirette, 5);
  assert.equal(per.Tricipiti.indirette, 2.5);
});

test("88.7 i numeri si leggono come li scrive un coach", () => {
  assert.equal(numeroDaTesto("8"), 8);
  assert.equal(numeroDaTesto("8-10"), null);
  assert.equal(formattaNumero(5180), "5.180");
  assert.equal(formattaNumero(124.05), "124,05");
  assert.equal(formattaNumero(1.5), "1,5");
  assert.equal(testoVolume(null), "non registrato");
  assert.equal(testoVolume(0), "0");
});
