// tests/18-desktop.test.mjs — FASE 2f: la Diva sul desktop (mockup-pc.html).
// La guardia non dice «bello»: dice che le misure, i tempi e le ombre sono
// quelli del mockup PC e che il telefono non se li è presi per sbaglio.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const leggi = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");

const css = leggi("comune/tema-b.css");
const config = leggi("app-config-b.js");

/** Il testo del blocco @media che comincia con `testa`. */
function bloccoMedia(testa) {
  const inizio = css.indexOf(testa);
  if (inizio < 0) return "";
  let i = css.indexOf("{", inizio);
  let profondita = 0;
  for (let j = i; j < css.length; j += 1) {
    if (css[j] === "{") profondita += 1;
    if (css[j] === "}") {
      profondita -= 1;
      if (profondita === 0) return css.slice(i, j + 1);
    }
  }
  return "";
}

const grande = bloccoMedia("@media (min-width: 900px) {");
const movimento = bloccoMedia("@media (min-width: 900px) and (prefers-reduced-motion: no-preference) {");

test("18.01 il blocco desktop esiste ed è un @media a 900px", () => {
  assert.ok(grande.length > 0, "manca il blocco @media (min-width: 900px)");
  assert.match(grande, /\.bd-diva\s*\{[^}]*width:\s*104px/);
});

test("18.02 la figura sul desktop è 104 px, la misura del mockup PC", () => {
  const base = css.slice(0, css.indexOf("@media (min-width: 900px)"));
  assert.match(base, /\.bd-diva\s*\{[^}]*width:\s*78px/, "il telefono resta a 78 px");
  assert.ok(!/width:\s*104px/.test(base), "i 104 px non devono stare fuori dal desktop");
});

test("18.03 l'ombra è quella del mockup: 0 15px 24px", () => {
  assert.match(grande, /drop-shadow\(0 15px 24px rgba\(8, 2, 18, 0\.5\)\)/);
});

test("18.04 il fumetto si allarga come `#bd-diva .bub`: 310 px o 58 vw", () => {
  assert.match(grande, /\.bd-bolla\s*\{[^}]*max-width:\s*min\(310px,\s*58vw\)/);
});

test("18.05 l'oscillazione desktop è dvBob: 3,4 s, cinque pixel, mezzo grado", () => {
  assert.match(movimento, /animation:\s*bd-oscilla-pc 3\.4s ease-in-out infinite/);
  assert.match(movimento, /@keyframes bd-oscilla-pc/);
  assert.match(movimento, /translateY\(-5px\) rotate\(0\.6deg\)/);
  assert.match(movimento, /translateY\(0\) rotate\(-0\.6deg\)/);
});

test("18.06 lo scatto alla frase nuova è dvPop: mezzo secondo, nove pixel", () => {
  assert.match(movimento, /animation:\s*bd-scatto-pc 0\.5s cubic-bezier\(0\.2, 0\.9, 0\.25, 1\.3\)/);
  assert.match(movimento, /@keyframes bd-scatto-pc/);
  assert.match(movimento, /translateY\(-9px\) scale\(1\.05\)/);
});

test("18.07 il movimento vive dentro preferisce-meno-movimento", () => {
  assert.ok(movimento.length > 0, "manca il blocco con prefers-reduced-motion");
  assert.ok(
    css.includes("@media (min-width: 900px) and (prefers-reduced-motion: no-preference) {"),
    "il blocco del movimento non dichiara prefers-reduced-motion: no-preference"
  );
  const fuori = css.replace(movimento, "");
  assert.ok(!/bd-oscilla-pc/.test(fuori), "l'oscillazione PC non deve stare fuori dal suo @media");
  assert.ok(!/bd-scatto-pc/.test(fuori), "lo scatto non deve stare fuori dal suo @media");
});

test("18.08 il marchio resta fermo: niente animazioni sulla testa", () => {
  assert.match(css, /\.bd-marco \.bd-figura\s*\{\s*animation:\s*none;/);
});

test("18.09 nessun !important: il tema si vince per cascata, non per forza", () => {
  assert.ok(!css.includes("!important"), "trovato !important in tema-b.css");
});

test("18.10 la bolla mantiene coda e classe del contratto", () => {
  assert.match(css, /\.bd-bolla::after\s*\{/);
  assert.match(css, /\.bd-bolla-testo\s*\{/);
});

test("18.11 build della fase", () => {
  assert.match(config, /build:\s*"b0\.11-fase2g-testata"/);
});
