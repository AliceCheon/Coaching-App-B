// tests/24-voce-che-si-sente.test.mjs — Fase 2k: accessibilità della bolla.
// La frase cambia da sola: se non è una regione viva, per un lettore di
// schermo non cambia mai niente.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { montaDivaBot } from "../comune/diva-bot.js";

const css = readFileSync(new URL("../comune/tema-b.css", import.meta.url), "utf8");
const sorgente = readFileSync(new URL("../comune/diva-bot.js", import.meta.url), "utf8");

function fintoDocumento() {
  const crea = (tag) => ({
    tagName: tag.toUpperCase(), className: "", figli: [], attributi: {}, _testo: "",
    get firstChild() { return this.figli[0] || null; },
    set textContent(v) { this._testo = v; this.figli = []; },
    get textContent() { return this._testo; },
    appendChild(f) { this.figli.push(f); return f; },
    removeChild(f) { this.figli = this.figli.filter((x) => x !== f); return f; },
    setAttribute(k, v) { this.attributi[k] = String(v); },
    removeAttribute(k) { delete this.attributi[k]; },
    querySelector() { return crea("svg"); },
    addEventListener() {}
  });
  return { createElement: crea };
}

function radice() {
  const doc = fintoDocumento();
  const nodo = doc.createElement("div");
  nodo.ownerDocument = doc;
  return nodo;
}

function bollaDi(contenitore) {
  return contenitore.figli[0].className === "bd-striscia"
    ? contenitore.figli[0].figli[0]
    : contenitore.figli[0];
}

test("24.01 la bolla è una regione viva, nella striscia e nel fumetto", () => {
  ["striscia", "fumetto"].forEach((modo) => {
    const contenitore = radice();
    montaDivaBot(contenitore, ["Ciao"], "neutro", modo === "striscia" ? { striscia: true } : undefined);
    const bolla = bollaDi(contenitore);
    assert.equal(bolla.attributi.role, "status", modo + ": manca role=status");
    assert.equal(bolla.attributi["aria-live"], "polite", modo + ": manca aria-live=polite");
    assert.equal(bolla.attributi["aria-atomic"], "true", modo + ": la frase andrebbe annunciata a pezzi");
  });
});

test("24.02 il cambio di frase avviene DENTRO la regione viva", () => {
  const contenitore = radice();
  const bot = montaDivaBot(contenitore, ["Prima"], "neutro", { striscia: true });
  const bolla = bollaDi(contenitore);
  bot.mostra("La carta che guardi", "neutro");
  assert.equal(bolla.textContent, "La carta che guardi", "il testo cambiato è fuori dalla regione viva");
  assert.equal(bolla.attributi["aria-live"], "polite", "la regione viva è sparita dopo l'aggiornamento");
});

test("24.03 anche il giro del tocco cambia il testo nella regione viva", () => {
  const contenitore = radice();
  const bot = montaDivaBot(contenitore, ["Uno", "Due"], "neutro", { striscia: true });
  const bolla = bollaDi(contenitore);
  assert.equal(bolla.textContent, "Uno");
  bot.aggiungi(["Due"]);
  assert.equal(bolla.textContent, "Due");
  assert.equal(bolla.attributi.role, "status");
});

test("24.04 la figura è decorativa, il tono lo dice l'aria-label del pulsante", () => {
  const contenitore = radice();
  montaDivaBot(contenitore, ["Ciao"], "bene", { striscia: true });
  const riga = contenitore.figli[0];
  const pallino = riga.figli[1].figli[0];
  assert.equal(pallino.figli[0].attributi["aria-hidden"], "true", "l'SVG verrebbe letto pezzo per pezzo");
  assert.equal(pallino.tagName, "BUTTON", "la figura resta un pulsante vero");
  assert.equal(pallino.type, "button");
  assert.match(pallino.attributi["aria-label"], /^Diva Bot: /, "il tono deve essere detto a parole");
  assert.ok(pallino.attributi["aria-label"].length > "Diva Bot: ".length);
});

test("24.05 cambiando tono, l'aria-label del pulsante segue", () => {
  const contenitore = radice();
  const bot = montaDivaBot(contenitore, ["Ciao"], "neutro", { striscia: true });
  const pallino = contenitore.figli[0].figli[1].figli[0];
  const prima = pallino.attributi["aria-label"];
  bot.mostra("Attenzione qui", "attenzione");
  assert.notEqual(pallino.attributi["aria-label"], prima, "il tono cambia e l'etichetta resta muta");
});

test("24.06 il testo resta testo: nessun innerHTML nel montaggio", () => {
  assert.ok(!/innerHTML/.test(sorgente), "innerHTML nel montaggio: i dati potrebbero diventare markup");
  const contenitore = radice();
  montaDivaBot(contenitore, ["<b>grassetto</b>"], "neutro", { striscia: true });
  assert.equal(bollaDi(contenitore).textContent, "<b>grassetto</b>");
});

test("24.07 chi ha chiesto meno movimento non perde niente", () => {
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\)/);
  assert.ok(!/animation:[^;]*!important/.test(css));
});

test("24.08 solo lettura: nessuna scrittura, nessun !important nel montaggio", () => {
  assert.ok(!/\.set\(|\.add\(|\.update\(|\.delete\(|setDoc|addDoc/.test(sorgente));
  assert.ok(!/!important/.test(sorgente));
});
