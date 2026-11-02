/* Fase 2c · la voce della Diva Bot.
 *
 * Guardia: la frase più importante del quadro deve essere scelta dalla scala
 * di priorità, deve citare solo numeri che esistono nel quadro, e non deve mai
 * promettere una diagnosi che B non può fare. */

import test from "node:test";
import assert from "node:assert/strict";

import { quadroStrutturale } from "../comune/struttura.js";
import { voceDelQuadro, frasiPerDati, montaDivaBot } from "../comune/diva-bot.js";

const GIORNO = 86400000;

/* Quadro costruito a mano: risparmia i conti del modulo e rende esplicito
 * che cosa la voce sta guardando. */
function quadroFinto(valori) {
  return Object.assign(
    {
      oggi: new Date(Date.UTC(2026, 10, 3)),
      numeroSedute: 12,
      senzaData: 0,
      giorniDallUltima: 1,
      ultimi7: 3,
      mediaSettimanale: 3.5,
      settimane: [],
      settimaneVuote: 0,
      settimaneVuoteDiFila: 0,
      bucoMassimo: 4,
      distribuzione: [
        { codice: "A", numero: 6 },
        { codice: "B", numero: 6 }
      ],
      schedeDistinte: 2
    },
    valori || {}
  );
}

/* Sedute vere su un calendario fisso: serve al test dei numeri citati. */
function seduteDiProva() {
  const base = Date.UTC(2026, 8, 1);
  const elenco = [];
  for (let i = 0; i < 24; i += 1) {
    const data = new Date(base + i * 7 * GIORNO);
    elenco.push({ dateInput: data.toISOString().slice(0, 10), sessionCode: i % 3 === 0 ? "C" : "A" });
  }
  return elenco;
}

test("senza sedute la voce dichiara «non registrato» e non finge un quadro", () => {
  const vuoto = quadroStrutturale([], { oggi: new Date(Date.UTC(2026, 10, 3)) });
  const voce = voceDelQuadro(vuoto);
  assert.equal(voce.tono, "neutro");
  assert.match(voce.testo, /non registrato/);
});

test("una pausa lunga vince su qualunque altro segnale", () => {
  const voce = voceDelQuadro(
    quadroFinto({
      giorniDallUltima: 20,
      settimaneVuoteDiFila: 1,
      distribuzione: [
        { codice: "A", numero: 11 },
        { codice: "B", numero: 1 }
      ]
    })
  );
  assert.equal(voce.tono, "attenzione");
  assert.match(voce.testo, /20 giorni/);
  assert.doesNotMatch(voce.testo, /pende/);
});

test("due settimane vuote di fila vengono dette prima della pausa corta", () => {
  const voce = voceDelQuadro(quadroFinto({ giorniDallUltima: 3, settimaneVuoteDiFila: 2 }));
  assert.equal(voce.tono, "attenzione");
  assert.match(voce.testo, /2 settimane di fila/);
});

test("oltre una settimana di pausa: numero citato, nessun giudizio", () => {
  const voce = voceDelQuadro(quadroFinto({ giorniDallUltima: 9 }));
  assert.equal(voce.tono, "attenzione");
  assert.match(voce.testo, /9 giorni/);
  assert.doesNotMatch(voce.testo, /diagnosi di|bruciato|sovrallen/i);
});

test("distribuzione storta: cita le due schede vere", () => {
  const voce = voceDelQuadro(
    quadroFinto({
      numeroSedute: 10,
      distribuzione: [
        { codice: "A", numero: 9 },
        { codice: "B", numero: 1 }
      ]
    })
  );
  assert.equal(voce.tono, "attenzione");
  assert.match(voce.testo, /A 9 sedute contro B 1/);
});

test("quadro regolare: tono buono, e dichiara comunque ciò che manca", () => {
  const voce = voceDelQuadro(quadroFinto({ mediaSettimanale: 3.5, giorniDallUltima: 1 }));
  assert.equal(voce.tono, "bene");
  assert.match(voce.testo, /3\.5 sedute a settimana/);
  assert.match(voce.testo, /non registrati/);
});

test("sotto la soglia dichiarata: dice la soglia, non un verdetto", () => {
  const voce = voceDelQuadro(quadroFinto({ mediaSettimanale: 2 }));
  assert.equal(voce.tono, "attenzione");
  assert.match(voce.testo, /3 a settimana/);
  assert.match(voce.testo, /2/);
});

test("«ieri» invece di «1 giorni fa»", () => {
  const voce = voceDelQuadro(quadroFinto({ giorniDallUltima: 1, mediaSettimanale: 4 }));
  assert.match(voce.testo, /l'ultima ieri/);
  assert.doesNotMatch(voce.testo, /1 giorni fa/);
});

test("«oggi» invece di «0 giorni fa»", () => {
  const voce = voceDelQuadro(quadroFinto({ giorniDallUltima: 0, mediaSettimanale: 4 }));
  assert.match(voce.testo, /l'ultima oggi/);
});

test("nessun numero inventato: ogni cifra della frase esiste nel quadro", () => {
  const elenco = seduteDiProva();
  const quadro = quadroStrutturale(elenco, { oggi: new Date(Date.UTC(2026, 8, 15)), settimane: 8 });
  const voce = voceDelQuadro(quadro);
  const ammessi = new Set();
  [
    quadro.numeroSedute,
    quadro.ultimi7,
    quadro.mediaSettimanale,
    quadro.giorniDallUltima,
    quadro.settimane.length,
    quadro.settimaneVuote,
    quadro.settimaneVuoteDiFila,
    quadro.bucoMassimo,
    3,
    8,
    15,
    2
  ].forEach((v) => {
    if (v != null) ammessi.add(String(v));
  });
  quadro.distribuzione.forEach((d) => ammessi.add(String(d.numero)));
  const cifre = (voce.testo.match(/\d+(?:\.\d+)?/g) || []);
  const estranee = cifre.filter((c) => !ammessi.has(c));
  assert.deepEqual(estranee, [], "numeri senza fonte nel quadro: " + estranee.join(", "));
});

test("la voce sta in una bolla: resta breve", () => {
  const elenco = seduteDiProva();
  const quadro = quadroStrutturale(elenco, { oggi: new Date(Date.UTC(2026, 8, 15)), settimane: 8 });
  const voce = voceDelQuadro(quadro);
  assert.ok(voce.testo.length <= 220, "frase troppo lunga: " + voce.testo.length + " caratteri");
});

test("frasiPerDati mette la voce del quadro per prima", () => {
  const quadro = quadroFinto({ giorniDallUltima: 20 });
  const frasi = frasiPerDati({ numeroSedute: 12, pesoPresente: true, checkinPresente: true }, quadro);
  assert.equal(frasi[0], voceDelQuadro(quadro).testo);
  assert.ok(frasi.length >= 5);
});

test("senza quadro le frasi restano quelle di prima (nessuna bolla vuota)", () => {
  const frasi = frasiPerDati({ numeroSedute: 0, pesoPresente: false, checkinPresente: false }, null);
  assert.ok(frasi.length >= 4);
  assert.ok(frasi[0].length > 0);
});

/* Finto DOM minimo: serve solo a provare che il tono arriva sulla bolla. */
function documentoFinto() {
  const nodo = () => ({
    className: "",
    textContent: "",
    attributi: Object.create(null),
    figli: [],
    setAttribute(nome, valore) {
      this.attributi[nome] = valore;
    },
    appendChild(figlio) {
      this.figli.push(figlio);
      return figlio;
    },
    addEventListener() {}
  });
  return { createElement: () => nodo() };
}

test("il tono arriva sulla bolla come attributo, il testo resta testo", () => {
  const contenitore = documentoFinto().createElement();
  contenitore.ownerDocument = documentoFinto();
  const esito = montaDivaBot(contenitore, ["<b>ciao</b>"], "attenzione");
  assert.equal(esito.bolla.attributi["data-tono"], "attenzione");
  assert.equal(esito.bolla.figli[0].textContent, "<b>ciao</b>");
});
