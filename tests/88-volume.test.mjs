/* Passo B.14 — il volume conta davvero.
 *
 * I numeri di questo test sono scelti a mano e verificati a mano: nessun dato
 * copiato dall'app vera. Se il conto cambia, qui si vede subito.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { contaVolume, testoTonnellaggio, formattaNumero, numeroDaTesto, righeDalleSchede } from "../comune/volume-b.js";

/* Scheda finta, otto settimane di lavoro:
 *  - lat:     S1 3x10 a 50 kg = 1.500 ; S2 4x8 a 55 kg = 1.760
 *  - panca:   S1 4x8 a 60 kg  = 1.920 ; S2 4x8 senza peso
 *  - tecnica: rest-pause sotto lat, S1 1 serie, reps in testo, contaVolume
 *             false scritto dal codice vecchio (deve contare lo stesso)
 *  - vecchia: spalle con contaVolume false e 3x12 a 20 kg (deve restare fuori)
 */
const RIGHE = [
  {
    id: "lat", distretto: "Dorsali", settimane: [
      { serie: 3, ripetizioni: 10, peso: 50 },
      { serie: 4, ripetizioni: 8, peso: 55 }
    ]
  },
  {
    id: "panca", distretto: "Pettorali", settimane: [
      { serie: 4, ripetizioni: 8, peso: 60 },
      { serie: 4, ripetizioni: 8 }
    ]
  },
  {
    id: "tec-rest-pause", tipo: "tecnica", padreId: "lat", tecnica: "rest-pause",
    contaVolume: false, settimane: [{ serie: 1, ripetizioni: "rest pause" }]
  },
  {
    id: "spalle-vecchia", distretto: "Spalle", contaVolume: false,
    settimane: [{ serie: 3, ripetizioni: 12, peso: 20 }]
  }
];

test("88.1 totale: serie 16, ripetizioni 126, tonnellaggio 5.180 kg", () => {
  const c = contaVolume(RIGHE);
  /* 3+4+4+4+1 = 16 serie ; 30+32+32+32 = 126 ripetizioni ;
   * 1.500 + 1.760 + 1.920 = 5.180 kg ; fuori la riga vecchia delle spalle. */
  assert.equal(c.totale.serie, 16);
  assert.equal(c.totale.ripetizioni, 126);
  assert.equal(c.totale.tonnellaggio, 5180);
  assert.equal(c.righeContate, 3);
  assert.equal(c.fuoriVolume, 1);
});

test("88.2 settimana per settimana: S1 8 serie e 3.420 kg, S2 8 serie e 1.760 kg", () => {
  const c = contaVolume(RIGHE);
  assert.equal(c.settimane.length, 2);
  const s1 = c.settimane[0];
  const s2 = c.settimane[1];
  assert.deepEqual({ n: s1.numero, serie: s1.serie, rip: s1.ripetizioni, tonn: s1.tonnellaggio, senza: s1.senzaTonnellaggio },
    { n: 1, serie: 8, rip: 62, tonn: 3420, senza: 1 });
  assert.deepEqual({ n: s2.numero, serie: s2.serie, rip: s2.ripetizioni, tonn: s2.tonnellaggio, senza: s2.senzaTonnellaggio },
    { n: 2, serie: 8, rip: 64, tonn: 1760, senza: 4 });
  assert.equal(c.mediaSerie, 8);
  assert.equal(c.picco.numero, 1);
  assert.equal(c.picco.serie, 8);
});

test("88.3 distretti: la tecnica eredita il distretto del padre, le spalle non ci sono", () => {
  const c = contaVolume(RIGHE);
  const per = Object.fromEntries(c.distretti.map((d) => [d.distretto, d]));
  assert.deepEqual(Object.keys(per).sort(), ["Dorsali", "Pettorali"]);
  assert.equal(per.Dorsali.serie, 8);          /* 3 + 4 + 1 della tecnica */
  assert.equal(per.Dorsali.ripetizioni, 62);
  assert.equal(per.Dorsali.tonnellaggio, 3260);
  assert.equal(per.Dorsali.senzaTonnellaggio, 1);
  assert.equal(per.Pettorali.serie, 8);
  assert.equal(per.Pettorali.tonnellaggio, 1920);
  assert.equal(per.Pettorali.senzaTonnellaggio, 4);
});

test("88.4 peso vuoto: serie e ripetizioni contano, il tonnellaggio dice non registrato", () => {
  const solo = [{ id: "x", distretto: "Glutei", settimane: [{ serie: 4, ripetizioni: 10 }] }];
  const c = contaVolume(solo);
  assert.equal(c.totale.serie, 4);
  assert.equal(c.totale.ripetizioni, 40);
  assert.equal(c.totale.tonnellaggio, null);
  assert.equal(c.totale.senzaTonnellaggio, 4);
  assert.equal(testoTonnellaggio(c.totale.tonnellaggio), "non registrato");
  assert.notEqual(testoTonnellaggio(c.totale.tonnellaggio), "0 kg");
});

test("88.5 lo zero è un dato, il vuoto no: la settimana non scritta non entra", () => {
  const c = contaVolume([{ id: "y", distretto: "Quadricipiti", settimane: [{ serie: 3, ripetizioni: 12, peso: 0 }] }], { quante: 8 });
  assert.equal(c.totale.serie, 3);
  assert.equal(c.totale.tonnellaggio, 0);
  assert.equal(testoTonnellaggio(c.totale.tonnellaggio), "0 kg");
  assert.equal(c.settimane.length, 8);
  assert.equal(c.settimane[7].serie, 0);
  assert.equal(c.settimane[7].tonnellaggio, null);
  assert.equal(c.settimaneContate, 1);
});

test("88.6 il ponte con la scheda: muscolo, prescrizione e tecnica figlia", () => {
  const scheda = {
    codice: "A",
    esercizi: [
      { id: "e1", muscolo: "Dorsali", prescrizione: { elencoSettimane: [{ serie: "4", ripetizioni: "8" }] } },
      { id: "e2", tipo: "tecnica", padreId: "e1", tecnica: "myo-reps", settimane: [{ serie: "1", ripetizioni: "myo reps" }], contaVolume: false },
      { id: "e3", muscolo: "Pettorali", deletedAt: "2026-11-01", prescrizione: { elencoSettimane: [{ serie: "9", ripetizioni: "9" }] } }
    ]
  };
  const righe = righeDalleSchede([scheda]);
  assert.equal(righe.length, 2);
  assert.equal(righe[0].distretto, "Dorsali");
  assert.equal(righe[1].tipo, "tecnica");
  assert.equal(righe[1].padreId, "e1");
  const c = contaVolume(righe);
  assert.equal(c.totale.serie, 5);
  assert.equal(c.distretti.length, 1);
  assert.equal(c.distretti[0].distretto, "Dorsali");
  assert.equal(c.distretti[0].serie, 5);
});

test("88.7 i numeri si leggono come li scrive un coach", () => {
  assert.equal(numeroDaTesto("8"), 8);
  assert.equal(numeroDaTesto("50,5"), 50.5);
  assert.equal(numeroDaTesto("8-10"), null);
  assert.equal(numeroDaTesto("rest pause"), null);
  assert.equal(formattaNumero(5180), "5.180");
  assert.equal(formattaNumero(124.05), "124,05");
  assert.equal(formattaNumero(1500.5), "1.500,5");
});
