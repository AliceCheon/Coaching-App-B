// tests/19-testata.test.mjs — Fase 2g: il marchio della testata desktop.
// Fonte: mockup/mockup-pc.html, blocco `.marca` (righe 1459-1464) e CSS righe 662-666.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../desktop/index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../desktop/app.js", import.meta.url), "utf8");
const config = readFileSync(new URL("../app-config-b.js", import.meta.url), "utf8");

test("19.01 il monogramma BD non c'è più", () => {
  assert.ok(!html.includes('class="monogramma"'), "il monogramma è ancora nel markup");
  assert.ok(!html.includes(">BD<"), "la sigla BD è ancora nel markup");
});

test("19.02 al suo posto c'è l'emblema della testa", () => {
  assert.match(html, /<span class="marchio-segno" aria-hidden="true" data-marco><\/span>/);
  assert.match(html, /\.marchio-segno \.bd-volto\{width:46px;height:46px/);
});

test("19.03 l'emblema è la testa, non la figura intera", () => {
  assert.match(app, /import \{ creaVolto \} from "\.\.\/comune\/diva-volto\.js"/);
  assert.match(app, /if \(segnoMarco\) segnoMarco\.appendChild\(creaVolto\(doc, "neutro"\)\)/);
});

test("19.04 il nome è «Barbell Diva» con Diva in corsivo lilla", () => {
  assert.match(html, /<div class="marchio-nome">Barbell <i>Diva<\/i><\/div>/);
  assert.match(html, /\.marchio-nome i\{font-style:italic;font-weight:600;color:var\(--lav\)\}/);
  assert.ok(!html.includes("text-transform:uppercase}\n.marchio-chi"), "il nome non è più maiuscoletto");
});

test("19.05 sotto il nome c'è il nome, e nient'altro", () => {
  assert.match(html, /<div class="marchio-chi">Alice Clemente<\/div>/);
  assert.ok(!/coach/i.test(html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/\/\*[\s\S]*?\*\//g, "")),
    "la parola «coach» ricompare nella testata: la Diva non è un mestiere");
});

test("19.06 la versione è una pastiglia, non una riga di build", () => {
  assert.match(html, /<span class="marchio-ver" data-versione><\/span>/);
  assert.match(html, /\.marchio-ver\{[^}]*border-radius:999px/);
  assert.match(html, /\.marchio-ver\{[^}]*font-size:9px/);
  assert.ok(!html.includes('marchio-sub'), "la vecchia riga «build …» è ancora nel markup");
});

test("19.07 la pastiglia mostra la build, dalla fonte unica", () => {
  assert.match(app, /doc\.querySelectorAll\("\[data-versione\]"\)\.forEach\(\(n\) => \{ n\.textContent = config\.build; \}\)/);
  assert.match(config, /build: "b0\.\d+-[a-z0-9-]+"/);
});

test("19.08 il marchio sta in cima alla barra, sopra le sezioni", () => {
  const iMarchio = html.indexOf('<div class="marchio">');
  const iStato = html.indexOf('<div class="stato-lettura">');
  assert.ok(iMarchio > 0 && iStato > iMarchio, "il marchio non è in cima alla barra");
  assert.match(html, /<aside class="rail">[\s\S]{0,400}<div class="marchio">/);
});

test("19.09 nessun !important, nessuna scrittura nuova", () => {
  const nuovo = html.slice(html.indexOf(".marchio{"));
  assert.ok(!/!important/.test(html));
  assert.ok(!/\.set\(|\.add\(|\.update\(|\.delete\(|setDoc|addDoc|updateDoc|deleteDoc/.test(html + app));
});
