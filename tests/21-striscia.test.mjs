// tests/21-striscia.test.mjs — Fase 2h: la striscia di frasi sul telefono.
// Fonte: mockup/mockup-telefono.html `.strip` (bolla + `.sbt` a 64 px).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { montaDivaBot } from "../comune/diva-bot.js";

const html = readFileSync(new URL("../mobile/index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../mobile/app.js", import.meta.url), "utf8");

function fintoDocumento() {
  const crea = (tag) => {
    const nodo = {
      tagName: tag.toUpperCase(),
      className: "",
      figli: [],
      attributi: {},
      _testo: "",
      set textContent(v) { this._testo = v; this.figli = []; },
      get textContent() { return this._testo; },
      appendChild(f) { this.figli.push(f); return f; },
      setAttribute(k, v) { this.attributi[k] = String(v); },
      removeAttribute() {},
      querySelector() { return crea("svg"); },
      addEventListener() {}
    };
    return nodo;
  };
  return { createElement: crea };
}

function radice() {
  const doc = fintoDocumento();
  const nodo = doc.createElement("div");
  nodo.ownerDocument = doc;
  return nodo;
}

test("21.01 con { striscia: true } la frase e la figura stanno sulla stessa riga", () => {
  const contenitore = radice();
  montaDivaBot(contenitore, ["Prova a salire di cinque chili."], "bene", { striscia: true });
  assert.equal(contenitore.figli.length, 1, "la striscia è un elemento solo");
  const riga = contenitore.figli[0];
  assert.equal(riga.className, "bd-striscia");
  assert.equal(riga.figli.length, 2);
  assert.equal(riga.figli[0].className, "bd-striscia-bolla");
  assert.equal(riga.figli[0].tagName, "P", "nella striscia la bolla è anche il testo");
  assert.equal(riga.figli[0].textContent, "Prova a salire di cinque chili.");
  assert.equal(riga.figli[1].className, "bd-striscia-sbt");
});

test("21.02 la figura della striscia è quella del mockup, intera", () => {
  const contenitore = radice();
  montaDivaBot(contenitore, ["Ciao"], "neutro", { striscia: true });
  const sbt = contenitore.figli[0].figli[1];
  const bottone = sbt.figli[0];
  assert.equal(bottone.className, "bd-diva bd-sbot");
  assert.equal(bottone.figli.length, 1, "dentro c'è la figura");
});

test("21.03 senza opzioni resta il fumetto di prima: il desktop non si tocca", () => {
  const contenitore = radice();
  montaDivaBot(contenitore, ["Ciao"], "neutro");
  assert.equal(contenitore.figli.length, 2);
  assert.equal(contenitore.figli[0].className, "bd-bolla");
  assert.equal(contenitore.figli[1].className, "bd-diva bd-sbot");
});

test("21.04 il telefono chiede la striscia, il desktop no", () => {
  assert.match(app, /tonoPeggiore\(voceQuadro\.tono, voceCarico\.tono\),\s*\{ striscia: true \}/);
  const desktop = readFileSync(new URL("../desktop/app.js", import.meta.url), "utf8");
  assert.ok(!desktop.includes("{ striscia: true }"), "il desktop deve restare a fumetto e figura");
});

test("21.05 via il residuo di 46 px, la figura torna alle misure di tema-b", () => {
  assert.ok(!/\.bd-diva\{width:46px/.test(html), "il 46 px è ancora nel telefono");
  assert.match(html, /\.diva\{left:14px;right:14px;bottom:88px;align-items:stretch\}/);
  assert.match(html, /\.bd-striscia-sbt \.bd-diva\{width:100%\}/);
});

test("21.06 niente !important, nessuna scrittura, nessun HTML nel testo", () => {
  assert.ok(!/!important/.test(html + app));
  assert.ok(!/\.set\(|\.add\(|\.update\(|\.delete\(|setDoc|addDoc|updateDoc|deleteDoc/.test(html + app));
  const contenitore = radice();
  montaDivaBot(contenitore, ["<b>x</b>"], "neutro", { striscia: true });
  assert.equal(contenitore.figli[0].figli[0].textContent, "<b>x</b>");
});
