/* Passo 13 — il volume legge le settimane vere.
 *
 * La scheda normalizzata porta DUE campi che sembrano la stessa cosa:
 *   prescrizione.settimane = 2            <- quanto sono (un conteggio)
 *   prescrizione.elencoSettimane = [...]  <- le settimane (l'elenco)
 * Con primoCampo vinceva il numero, che non e' un elenco: ogni riga tornava
 * con zero settimane, il conto restava a zero e nessun distretto usciva.
 * Qui si prova che vince l'elenco, che senza elenco si dichiara il vuoto
 * (non si inventa zero), e che le due pagine mostrano i distretti veri.
 *
 * I numeri sono scelti e verificati a mano: panca, S1 4x8 e S2 5x6 ->
 * 9 serie, 32 + 30 = 62 ripetizioni.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { contaVolume, righeDalleSchede } from "../comune/volume-b.js";
import { renderVolume, FRASI_VUOTO_VOLUME } from "../comune/vista-volume.js";
import { renderSpecializzazione } from "../comune/vista-specializzazione.js";

/* La forma che esce dalle schede v2: nome in `n`, distretto in `muscolo`,
 * prescrizione con il conteggio E l'elenco. */
const SCHEDA = {
  codice: "A",
  esercizi: [
    {
      id: "e1",
      n: "Panca piana",
      muscolo: "Pettorali",
      prescrizione: {
        settimane: 2,
        elencoSettimane: [
          { numero: 1, settimana: 1, serie: "4", ripetizioni: "8" },
          { numero: 2, settimana: 2, serie: "5", ripetizioni: "6" }
        ]
      }
    }
  ]
};

const SENZA_ELENCO = {
  codice: "A",
  esercizi: [
    { id: "e1", n: "Panca piana", muscolo: "Pettorali", prescrizione: { settimane: 2 } }
  ]
};

/* Un documento minimo: basta appendere e leggere il testo. */
function fintoDoc() {
  const nodo = (tag) => ({
    tagName: tag,
    className: "",
    style: {},
    attributi: {},
    figli: [],
    testo: "",
    appendChild(f) { this.figli.push(f); return f; },
    insertBefore(f) { this.figli.unshift(f); return f; },
    removeChild(f) { this.figli = this.figli.filter((x) => x !== f); return f; },
    setAttribute(k, v) { this.attributi[k] = v; },
    removeAttribute(k) { delete this.attributi[k]; },
    addEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    get textContent() {
      return this.testo + this.figli.map((f) => (f && typeof f.textContent === "string" ? f.textContent : "")).join("");
    },
    set textContent(v) { this.testo = String(v); this.figli = []; }
  });
  return { createElement: nodo, createTextNode(t) { return { textContent: String(t) }; } };
}

test("141.1 la scheda normalizzata da' due settimane, non il conteggio", () => {
  const righe = righeDalleSchede([SCHEDA]);
  assert.equal(righe.length, 1);
  assert.equal(righe[0].nome, "Panca piana");
  assert.equal(righe[0].settimane.length, 2, "elencoSettimane vince su settimane: 2");
  assert.deepEqual(righe[0].settimane.map((s) => s.serie), ["4", "5"]);
});

test("141.2 contaVolume: i distretti ci sono, con i totali", () => {
  const c = contaVolume(righeDalleSchede([SCHEDA]), { quante: 2 });
  assert.equal(c.totale.serie, 9);
  assert.equal(c.totale.ripetizioni, 62);
  assert.equal(c.settimaneContate, 2);
  assert.equal(c.settimane[0].serie, 4);
  assert.equal(c.settimane[1].serie, 5);
  assert.equal(c.righeSenzaSettimane, 0);
  const per = Object.fromEntries(c.distretti.map((d) => [d.distretto, d]));
  assert.equal(per.Pettorali.dirette, 9);
  assert.equal(per.Pettorali.totale, 9);
  assert.equal(per.Tricipiti.indirette, 4.5);
});

test("141.3 senza elenco resta zero dichiarato: nessuna settimana, non zero settimane", () => {
  const righe = righeDalleSchede([SENZA_ELENCO]);
  assert.equal(righe[0].settimane.length, 0);
  const c = contaVolume(righe, { quante: 2 });
  assert.equal(c.totale.serie, 0);
  assert.equal(c.settimaneContate, 0);
  assert.equal(c.distretti.length, 0);
  /* la riga e' utile (nome e distretto) ma non porta settimane: si dichiara */
  assert.equal(c.righeUtili, 1);
  assert.equal(c.righeSenzaNome, 0);
  assert.equal(c.righeSenzaSettimane, 1);
});

test("141.4 ripetizioni scritte serie per serie: si sommano, non fermano il conto", () => {
  const riga = {
    id: "z", nome: "Lat machine", distretto: "Dorsali",
    settimane: [
      { serie: 3, ripetizioni: [10, "8", "8-10"] },
      { ripetizioni: [8, 8] }
    ]
  };
  const c = contaVolume([riga], { quante: 2 });
  assert.equal(c.totale.serie, 5, "la seconda settimana prende le serie dall'elenco");
  assert.equal(c.totale.ripetizioni, 34);
  assert.equal(c.totale.ripetizioniMancanti, 0);
});

test("141.5 la pagina vera: Riepilogo volume e Specializzazione mostrano i distretti", () => {
  const doc = fintoDoc();
  const volume = doc.createElement("div");
  const conto = renderVolume(doc, volume, [SCHEDA], { quante: 2 });
  const testoVolume = volume.textContent;
  assert.equal(conto.totale.serie, 9);
  const i = testoVolume.indexOf("Pettorali");
  assert.ok(i >= 0, "il distretto si vede nel Riepilogo volume: " + testoVolume);
  assert.ok(/^Pettorali9/.test(testoVolume.slice(i)), "accanto al distretto c'e' il numero: " + testoVolume.slice(i, i + 40));
  assert.ok(!testoVolume.includes("Nessun distretto riconosciuto"), "non deve dire che la mappa non conosce i nomi");

  const spec = doc.createElement("div");
  const calcolo = renderSpecializzazione(doc, spec, [SCHEDA], { quante: 2 });
  const testoSpec = spec.textContent;
  assert.equal(calcolo.vuoto, false);
  assert.ok(testoSpec.includes("Pettorali"), "il distretto si vede in Specializzazione: " + testoSpec);
  assert.ok(!testoSpec.includes("Nessun programma attivo"));
});

test("141.6 la pagina senza elenco dichiara che le settimane mancano", () => {
  const doc = fintoDoc();
  const volume = doc.createElement("div");
  renderVolume(doc, volume, [SENZA_ELENCO], { quante: 2 });
  const testo = volume.textContent;
  assert.ok(testo.includes(FRASI_VUOTO_VOLUME.nessunaSettimana), "la frase e' quella scritta: " + testo);
  assert.ok(!testo.includes("Nessun distretto riconosciuto"), "il distretto c'e': non si accusa la mappa");
});
