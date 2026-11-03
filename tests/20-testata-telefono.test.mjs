// tests/20-testata-telefono.test.mjs — Fase 2g: la testata del telefono.
// Fonte: mockup/mockup-cody-apk.html (header.app-header, .brandmark.bothead, CSS 45-46).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../mobile/index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../mobile/app.js", import.meta.url), "utf8");

test("20.01 il monogramma e la riga «build …» non ci sono più", () => {
  assert.ok(!html.includes('class="monogramma"'), "il monogramma è ancora nel markup");
  assert.ok(!html.includes(">BD<"), "la sigla BD è ancora nel markup");
  assert.ok(!html.includes("marchio-sub"), "la vecchia riga mono è ancora nel markup");
});

test("20.02 la testina robot è tonda e grande 36px", () => {
  assert.match(html, /<span class="marchio-bot" aria-hidden="true">/);
  assert.match(html, /\.marchio-bot\{[^}]*width:36px;height:36px/);
  assert.match(html, /\.marchio-bot\{[^}]*border-radius:50%/);
  assert.match(html, /\.marchio-bot\{[^}]*overflow:hidden/);
});

test("20.03 dentro il cerchio c'è la testa del robot, inquadratura del mockup", () => {
  assert.match(html, /viewBox="38 28 164 148"/);
  assert.match(html, /class="bot-head"/);
  assert.match(html, /class="bot-face-line"/);
  assert.match(html, /class="bot-face-fill"/);
  assert.ok(!html.includes("diva-bot-face-happy"), "le facce del mockup non vanno copiate tutte");
});

test("20.04 il nome e il motto, come nel mockup", () => {
  assert.match(html, /<div class="marchio-nome">Barbell <i>Diva<\/i><\/div>/);
  assert.match(html, /<div class="marchio-motto">Lift\. Slay\. Repeat\. <span class="marchio-ver" data-versione><\/span><\/div>/);
  assert.ok(!html.includes('<p class="motto">'), "il motto è ancora ripetuto fuori dal marchio");
});

test("20.05 la pastiglia mostra la build, dalla fonte unica", () => {
  assert.match(html, /\.marchio-ver\{[^}]*border-radius:999px/);
  assert.match(app, /doc\.querySelectorAll\("\[data-versione\]"\)\.forEach\(\(n\) => \{ n\.textContent = config\.build; \}\)/);
});

test("20.06 niente «coach», niente !important, nessuna scrittura nuova", () => {
  assert.ok(!/coach/i.test(html), "la parola «coach» è nella testata del telefono");
  assert.ok(!/!important/.test(html + app));
  assert.ok(!/\.set\(|\.add\(|\.update\(|\.delete\(|setDoc|addDoc|updateDoc|deleteDoc/.test(html + app));
});
