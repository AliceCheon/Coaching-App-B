/* Fase 2d · guardia della voce del giorno.
 *
 * Il saluto ha due regole: e' deterministica (stessa data, stessa frase: niente
 * sorteggio a ogni ricarica) e non parla di numeri (il giorno non sa quanti
 * chili hai alzato). E la bolla mette le voci nell'ordine dichiarato.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { voceDelGiorno, voceDelCarico, voceDelQuadro, frasiPerDati, tonoPeggiore } from "../comune/diva-bot.js";
import { carichiPerEsercizio } from "../comune/carichi.js";

/* Una settimana intera: lunedi' 2 novembre 2026 (UTC). */
function settimana(offsetSettimane) {
  const base = Date.UTC(2026, 10, 2);
  const giorni = [];
  for (let i = 0; i < 7; i += 1) {
    giorni.push(new Date(base + (i + (offsetSettimane || 0) * 7) * 86400000));
  }
  return giorni;
}

test("stessa data, stessa frase: nessun sorteggio a ogni ricarica", () => {
  const giorno = new Date(Date.UTC(2026, 10, 3));
  assert.equal(voceDelGiorno(giorno).testo, voceDelGiorno(new Date(giorno.getTime())).testo);
});

test("sette giorni della settimana, sette frasi diverse", () => {
  const testi = settimana(0).map((g) => voceDelGiorno(g).testo);
  assert.equal(new Set(testi).size, 7);
});

test("la settimana dopo il registro cambia variante", () => {
  const prima = settimana(0).map((g) => voceDelGiorno(g).testo);
  const dopo = settimana(1).map((g) => voceDelGiorno(g).testo);
  assert.notDeepEqual(prima, dopo);
});

test("il saluto non pronuncia cifre", () => {
  for (let s = 0; s < 6; s += 1) {
    settimana(s).forEach((giorno) => {
      const voce = voceDelGiorno(giorno);
      assert.deepEqual(voce.testo.match(/\d+/g), null, "cifra nel saluto: " + voce.testo);
    });
  }
});

test("il saluto resta breve e non giudica", () => {
  for (let s = 0; s < 6; s += 1) {
    settimana(s).forEach((giorno) => {
      const voce = voceDelGiorno(giorno);
      assert.ok(voce.testo.length > 20 && voce.testo.length <= 160, "lunghezza fuori misura: " + voce.testo.length);
      assert.equal(voce.tono, "neutro");
      assert.doesNotMatch(voce.testo, /diagnosi|grasso|BMI|kg/i);
    });
  }
});

test("una data non valida non fa esplodere il saluto", () => {
  const voce = voceDelGiorno(new Date("non una data"));
  assert.ok(voce.testo.length > 0);
  assert.equal(voce.tono, "neutro");
});

test("il tono della bolla e' il piu' severo, non l'ultimo scritto", () => {
  assert.equal(tonoPeggiore("bene", "attenzione"), "attenzione");
  assert.equal(tonoPeggiore("attenzione", "bene"), "attenzione");
  assert.equal(tonoPeggiore("neutro", "bene"), "bene");
  assert.equal(tonoPeggiore("neutro", "neutro"), "neutro");
  assert.equal(tonoPeggiore("bene", "sconosciuto"), "bene");
});

test("la bolla ordina: saluto, quadro, carico", () => {
  const giorno = new Date(Date.UTC(2026, 10, 3));
  const saluto = voceDelGiorno(giorno);
  const quadro = {
    numeroSedute: 12,
    giorniDallUltima: 1,
    mediaSettimanale: 3.5,
    settimane: [],
    settimaneVuoteDiFila: 0,
    distribuzione: [{ codice: "A", numero: 6 }],
    settimaneVuote: 0,
    ultimi7: 3
  };
  const carichi = carichiPerEsercizio(
    [
      { dateInput: "2026-10-06", exercises: [{ name: "Panca", sets: [{ weight: 50, reps: 5 }] }] },
      { dateInput: "2026-10-20", exercises: [{ name: "Panca", sets: [{ weight: 55, reps: 5 }] }] },
      { dateInput: "2026-11-02", exercises: [{ name: "Panca", sets: [{ weight: 60, reps: 5 }] }] }
    ],
    { oggi: giorno }
  );
  const frasi = frasiPerDati({ numeroSedute: 12, pesoPresente: true, checkinPresente: true }, quadro, { giornata: saluto, carichi });
  assert.equal(frasi[0], saluto.testo);
  assert.equal(frasi[1], voceDelQuadro(quadro).testo);
  assert.equal(frasi[2], voceDelCarico(carichi).testo);
  assert.ok(frasi.length >= 7);
});

test("senza extra la bolla resta quella della fase 2c", () => {
  const quadro = { numeroSedute: 3, giorniDallUltima: 30, mediaSettimanale: 1, settimane: [], settimaneVuoteDiFila: 1, distribuzione: [] };
  const frasi = frasiPerDati({ numeroSedute: 3 }, quadro);
  assert.equal(frasi[0], voceDelQuadro(quadro).testo);
  assert.equal(frasi.filter((f) => f === voceDelCarico(carichiPerEsercizio([], { oggi: new Date() })).testo).length, 0);
});
