// tests/22-voci-vista.test.mjs — Fase 2i: la frase segue la carta che guardi.
// Regola: ogni carta ha la sua voce, la voce non inventa cifre, il tono non
// migliora mai quello del quadro.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { VOCI_VISTA, voceDellaVista, titoloSezione, collegaVociDiVista } from "../comune/voci-vista.js";
import { montaDivaBot } from "../comune/diva-bot.js";

const app = readFileSync(new URL("../mobile/app.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../mobile/index.html", import.meta.url), "utf8");
const modulo = readFileSync(new URL("../comune/voci-vista.js", import.meta.url), "utf8");

/* I titoli delle carte, letti dal codice vero: se nasce una carta nuova senza
 * voce, questa guardia cade prima dell'utente. */
function titoliDalleCarte(fonte) {
  return Array.from(fonte.matchAll(/carta\(doc, "([^"]+)"/g)).map((m) => m[1]);
}

function ambiente(titoli) {
  const carte = titoli.map((t) => ({ querySelector: (sel) => (sel === "h2" ? { textContent: t } : null) }));
  const doc = { querySelectorAll: (sel) => (sel === "#griglia .carta" ? carte : []) };
  const osservati = [];
  let risposta = null;
  let staccati = 0;
  function Osservatore(fn) {
    risposta = fn;
    this.observe = (n) => { osservati.push(n); };
    this.disconnect = () => { staccati += 1; };
  }
  const win = { IntersectionObserver: Osservatore };
  const bot = {
    mostre: [],
    mostra(testo, tono) { this.mostre.push({ testo, tono }); return tono; }
  };
  return {
    doc, win, bot, carte, osservati,
    spingi: (nodo, rapporto) => risposta([{ target: nodo, isIntersecting: rapporto > 0, intersectionRatio: rapporto }]),
    staccatiDi: () => staccati
  };
}

test("22.01 ogni carta del telefono ha la sua voce", () => {
  const titoli = titoliDalleCarte(app);
  assert.ok(titoli.length >= 8, "trovate solo " + titoli.length + " carte");
  titoli.forEach((t) => assert.ok(voceDellaVista(t), "manca la voce per «" + t + "»"));
  assert.equal(Object.keys(VOCI_VISTA).length, titoli.length, "voci orfane in tabella");
});

test("22.02 nessuna cifra e nessun HTML nelle voci: i numeri stanno nei dati", () => {
  Object.keys(VOCI_VISTA).forEach((k) => {
    const v = VOCI_VISTA[k];
    assert.ok(["bene", "neutro", "attenzione"].includes(v.tono), "tono non ammesso per «" + k + "»");
    assert.ok(!/\d/.test(v.testo), "cifra inventata nella voce «" + k + "»");
    assert.ok(!/[<>]/.test(v.testo), "markup nella voce «" + k + "»");
    assert.ok(v.testo.length > 30, "voce troppo corta per dire qualcosa: «" + k + "»");
  });
});

test("22.03 un titolo sconosciuto non produce voce, non produce un ripiego", () => {
  assert.equal(voceDellaVista("Carta che non esiste"), null);
  assert.equal(voceDellaVista(""), null);
  assert.equal(voceDellaVista(null), null);
  assert.ok(voceDellaVista("  Peso corrente  "), "gli spazi ai bordi non devono rompere la chiave");
});

test("22.04 il titolo si legge dall'h2 della carta", () => {
  assert.equal(titoloSezione({ querySelector: () => ({ textContent: " Carichi per esercizio " }) }), "Carichi per esercizio");
  assert.equal(titoloSezione({ querySelector: () => null }), "");
  assert.equal(titoloSezione(null), "");
});

test("22.05 la carta più visibile detta la frase", () => {
  const a = ambiente(["Sedute registrate", "Peso corrente"]);
  const collegamento = collegaVociDiVista(a.doc, a.win, a.bot, "neutro");
  assert.ok(collegamento, "il collegamento non è nato");
  assert.equal(a.osservati.length, 2, "ogni carta va osservata");
  assert.equal(a.bot.mostre.length, 0, "senza scorrimento la frase non cambia");
  a.spingi(a.carte[1], 0.8);
  assert.equal(a.bot.mostre.length, 1);
  assert.equal(a.bot.mostre[0].testo, VOCI_VISTA["Peso corrente"].testo);
  assert.equal(a.bot.mostre[0].tono, "neutro");
});

test("22.06 il tono non migliora mai quello del quadro: scorre, non assolve", () => {
  const a = ambiente(["Peso corrente", "Cosa manca per il semaforo completo"]);
  collegaVociDiVista(a.doc, a.win, a.bot, "attenzione");
  a.spingi(a.carte[0], 0.9);
  assert.equal(a.bot.mostre[0].tono, "attenzione", "una carta serena non fa verde la bolla");

  const b = ambiente(["Cosa manca per il semaforo completo"]);
  collegaVociDiVista(b.doc, b.win, b.bot, "bene");
  b.spingi(b.carte[0], 0.9);
  assert.equal(b.bot.mostre[0].tono, "attenzione", "una lacuna dichiarata pesa più di un complimento");
});

test("22.07 la frase cambia solo quando cambia la carta", () => {
  const a = ambiente(["Sedute registrate", "Ultima seduta"]);
  collegaVociDiVista(a.doc, a.win, a.bot, "neutro");
  a.spingi(a.carte[0], 0.6);
  a.spingi(a.carte[0], 0.9);
  a.spingi(a.carte[0], 0.7);
  assert.equal(a.bot.mostre.length, 1, "tre passate di pollice non fanno balbettare la bolla");
  a.spingi(a.carte[1], 0.9);
  assert.equal(a.bot.mostre.length, 2);
  assert.equal(a.bot.mostre[1].testo, VOCI_VISTA["Ultima seduta"].testo);
});

test("22.08 nessuna carta visibile: la frase resta ferma, non si svuota", () => {
  const a = ambiente(["Sedute registrate"]);
  collegaVociDiVista(a.doc, a.win, a.bot, "neutro");
  a.spingi(a.carte[0], 0.5);
  a.spingi(a.carte[0], 0);
  assert.equal(a.bot.mostre.length, 1, "uscire dalla carta non deve cancellare la frase");
});

test("22.09 senza osservatore o senza carte il collegamento non nasce e la pagina vive", () => {
  const a = ambiente(["Sedute registrate"]);
  assert.equal(collegaVociDiVista(a.doc, {}, a.bot, "neutro"), null);
  assert.equal(collegaVociDiVista({ querySelectorAll: () => [] }, a.win, a.bot, "neutro"), null);
  assert.equal(collegaVociDiVista(a.doc, a.win, {}, "neutro"), null);
  assert.equal(collegaVociDiVista(null, null, null, null), null);
});

test("22.10 stacca() chiude l'osservatore: una ricarica non lascia osservatori orfani", () => {
  const a = ambiente(["Sedute registrate"]);
  const collegamento = collegaVociDiVista(a.doc, a.win, a.bot, "neutro");
  assert.equal(typeof collegamento.stacca, "function");
  assert.equal(a.staccatiDi(), 0);
  collegamento.stacca();
  assert.equal(a.staccatiDi(), 1);
});

test("22.11 montaDivaBot espone mostra e cambia tono e faccia", () => {
  const crea = (tag) => ({
    tagName: tag.toUpperCase(), className: "", figli: [], attributi: {}, _testo: "",
    get firstChild() { return this.figli[0] || null; },
    set textContent(v) { this._testo = v; this.figli = []; },
    get textContent() { return this._testo; },
    appendChild(f) { this.figli.push(f); return f; },
    removeChild(f) { this.figli = this.figli.filter((x) => x !== f); return f; },
    setAttribute(k, v) { this.attributi[k] = String(v); },
    removeAttribute() {},
    querySelector() { return crea("svg"); },
    addEventListener() {}
  });
  const doc = { createElement: crea };
  const contenitore = crea("div");
  contenitore.ownerDocument = doc;
  const bot = montaDivaBot(contenitore, ["Prima"], "neutro", { striscia: true });
  assert.equal(typeof bot.mostra, "function");
  const bolla = contenitore.figli[0].figli[0];
  const sbt = contenitore.figli[0].figli[1];
  const pallino = sbt.figli[0];
  assert.equal(bolla.textContent, "Prima");
  bot.mostra("La carta che guardi", "attenzione");
  assert.equal(bolla.textContent, "La carta che guardi");
  assert.equal(bolla.attributi["data-tono"], "attenzione");
  assert.equal(pallino.attributi["data-tono"], "attenzione");
  assert.equal(pallino.figli.length, 1, "la figura si ridisegna, non si moltiplica");
  bot.mostra(null, "bene");
  assert.equal(bolla.textContent, "La carta che guardi", "una frase vuota non cancella quella buona");
});

test("22.12 l'app collega l'osservatore dopo il montaggio e stacca il vecchio", () => {
  assert.match(app, /const bot = montaDivaBot\(/);
  assert.match(app, /if \(vociVista\) vociVista\.stacca\(\);/);
  assert.match(app, /vociVista = collegaVociDiVista\(doc, win, bot, tonoPeggiore\(voceQuadro\.tono, voceCarico\.tono\)\);/);
});

test("22.13 solo lettura: nessuna scrittura, nessun !important, nessun percorso di macchina", () => {
  const insieme = modulo + app + html;
  assert.ok(!/!important/.test(insieme));
  assert.ok(!/\.set\(|\.add\(|\.update\(|\.delete\(|setDoc|addDoc|updateDoc|deleteDoc/.test(modulo + app));
  assert.ok(!/[A-Za-z]:\\\\/.test(modulo), "percorso di macchina nel modulo");
});
