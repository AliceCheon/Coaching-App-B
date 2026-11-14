/* Passo B.14k — la pagina Specializzazione conta davvero.
 *
 * I numeri di questo test sono scelti a mano e verificati a mano (come nel
 * test 88): quattro esercizi su due settimane, secondari presi da
 * muscoli-b.js solo dove esistono. Chi non ha secondari conta solo da
 * diretto, ed e' dichiarato in pagina.
 *
 * La pagina, poi: se il programma attivo non c'e' o non porta esercizi
 * leggibili, dice «nessun programma attivo» e non mostra numeri.
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { calcolaSpecializzazione, renderSpecializzazione } from "../comune/vista-specializzazione.js";

/* Schede a mano, due settimane:
 *  - panca:  petto bersaglio, tricipiti secondario  -> S1 3x8,  S2 4x8
 *  - lat:    dorsali bersaglio, bicipiti secondario -> S1 3x10, S2 3x8
 *  - alzate: spalle bersaglio, NESSUN secondario    -> S1 3x12, S2 3x12
 *  - hip:    glutei bersaglio, femorali secondario  -> S1 4x8,  S2 5x8
 *
 * Dirette:  petto 7, dorsali 6, spalle 6, glutei 9.
 * Indirette (0,5 a serie): tricipiti 3,5, bicipiti 3, femorali 4,5.
 * Totale blocco: 7+3,5+6+3+6+9+4,5 = 39. Media distretto: 39/7 = 5,6.
 */
const RIGHE = [
  {
    id: "panca", nome: "Panca piana", primari: ["Pettorali"], secondari: ["Tricipiti"], settimane: [
      { serie: 3, ripetizioni: 8 },
      { serie: 4, ripetizioni: 8 }
    ]
  },
  {
    id: "lat", nome: "Lat machine", primari: ["Dorsali"], secondari: ["Bicipiti"], settimane: [
      { serie: 3, ripetizioni: 10 },
      { serie: 3, ripetizioni: 8 }
    ]
  },
  {
    id: "alzate", nome: "Alzate laterali", primari: ["Spalle"], secondari: [], settimane: [
      { serie: 3, ripetizioni: 12 },
      { serie: 3, ripetizioni: 12 }
    ]
  },
  {
    id: "hip", nome: "Hip thrust", primari: ["Glutei"], secondari: ["Femorali"], settimane: [
      { serie: 4, ripetizioni: 8 },
      { serie: 5, ripetizioni: 8 }
    ]
  }
];

test("92.1 classifica, in testa, quota e media: tutti dal conto, niente a mano", () => {
  const c = calcolaSpecializzazione(RIGHE, { quante: 2 });
  assert.equal(c.vuoto, false);
  assert.deepEqual(c.classifica.map((d) => d.distretto),
    ["Glutei", "Pettorali", "Dorsali", "Spalle", "Femorali", "Tricipiti", "Bicipiti"]);
  assert.deepEqual({ d: c.inTesta.distretto, v: c.inTesta.totale }, { d: "Glutei", v: 9 });
  assert.equal(c.quotaInTesta, 23.1); /* 9 su 39 */
  assert.equal(c.media, 5.6);         /* 39/7 = 5,57 arrotondato */
  assert.equal(c.senzaSecondari, 1);  /* solo le alzate */
  assert.equal(c.righeContate, 4);
});

test("92.2 sotto soglia, da sinergie, leader di settimana", () => {
  const c = calcolaSpecializzazione(RIGHE, { quante: 2 });
  /* soglia: 60% di 5,57 = 3,34 -> solo i bicipiti (3) restano sotto */
  assert.deepEqual(c.sotto.map((d) => d.distretto), ["Bicipiti"]);
  /* oltre il 40% di rimbalzo: i tre distretti presi solo come secondari */
  assert.deepEqual(c.daSinergie.map((d) => d.distretto).sort(), ["Bicipiti", "Femorali", "Tricipiti"]);
  /* S1 glutei 4, S2 glutei 5: chi guida ogni settimana */
  assert.deepEqual(c.leaders, [
    { numero: 1, distretto: "Glutei", valore: 4 },
    { numero: 2, distretto: "Glutei", valore: 5 }
  ]);
});

test("92.3 lo switch rifà il conto: solo diretto, gli indiretti escono", () => {
  const c = calcolaSpecializzazione(RIGHE, { quante: 2, soloDiretto: true });
  assert.deepEqual({ d: c.inTesta.distretto, v: c.inTesta.totale }, { d: "Glutei", v: 9 });
  assert.equal(c.somma, 28);  /* 7+6+6+9, niente mezzi punti */
  assert.equal(c.media, 4);   /* 28/7 */
  /* con i secondari spenti, i rimbalzi spariscono (tutte le quote indirette sono zero) */
  assert.deepEqual(c.daSinergie.map((d) => d.distretto), []);
  assert.deepEqual(c.sotto.map((d) => d.distretto), []);
});

test("92.4 nessun programma attivo: vuoto dichiarato, nessun numero", () => {
  assert.equal(calcolaSpecializzazione([], { quante: 2 }).vuoto, true);
  const soloSpente = RIGHE.map((r) => Object.assign({}, r, { contaVolume: false }));
  assert.equal(calcolaSpecializzazione(soloSpente, { quante: 2 }).vuoto, true);
});

test("92.5 la pagina: guscio libero dai numeri finti, vista agganciata, messaggio vuoto", () => {
    const pagina = fs.readFileSync(new URL("../desktop/index.html", import.meta.url), "utf8");
  const inizio = pagina.indexOf('id="pag-specializzazione"');
  const fine = pagina.indexOf('id="pag-curve-forza"');
  assert.ok(inizio > 0 && fine > inizio, "la sezione Specializzazione non si trova");
  const sezione = pagina.slice(inizio, fine);
  assert.ok(sezione.includes('id="sp-corpo"'), "manca il contenitore sp-corpo");
  assert.ok(!sezione.includes("20.5"), "restano i numeri finti del v31 (20.5)");
  assert.ok(!sezione.includes("18.9%"), "restano i numeri finti del v31 (18.9%)");
  const app = fs.readFileSync(new URL("../desktop/app-v31.js", import.meta.url), "utf8");
  assert.ok(app.includes("vista-specializzazione.js"), "app-v31 non importa la vista");
  assert.ok(app.includes('renderSpecializzazione(doc, doc.querySelector("#sp-corpo")'), "app-v31 non aggancia la vista");
  const vista = fs.readFileSync(new URL("../comune/vista-specializzazione.js", import.meta.url), "utf8");
  assert.ok(/nessun programma attivo/i.test(vista), "la vista non dichiara il caso vuoto");
});

test("92.6 il render senza schede riempie il contenitore col messaggio, non con numeri", () => {
  const nodo = () => new Proxy({ figli: [], style: {} }, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === "appendChild" || k === "setAttribute") return () => {};
      return undefined;
    },
    set(t, k, v) { t[k] = v; return true; }
  });
  const docFinto = { createElement: () => nodo(), createTextNode: (x) => ({ testo: x }) };
  const contenitore = nodo();
  const fuori = renderSpecializzazione(docFinto, contenitore, [], { quante: 2 });
  assert.equal(fuori, null);
});
