// tests/34-menu-chiaro.test.mjs — il menu laterale ha gli stessi colori nelle due pelli.
// 4/11/2026: in chiaro la rotaia restava scura ma le scritte prendevano i gettoni
// del giorno, quindi testo prugna su fondo prugna. Qui si piantona la correzione.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../comune/tema-b.css", import.meta.url), "utf8");
const blocco = css.match(/body\[data-theme="light"\] \.rail\s*\{([^}]*)\}/s);

test("34.01 sul chiaro la rotaia ridichiara i gettoni della notte", () => {
  assert.ok(blocco, "manca il blocco dei gettoni della rotaia chiara");
  const dentro = blocco[1];
  for (const gettone of ["--text", "--muted", "--lav", "--line", "--line-soft", "--surface", "--raised", "--fioco"]) {
    assert.match(dentro, new RegExp(gettone + ":"), "la rotaia chiara non riporta " + gettone);
  }
});

test("34.02 il testo della rotaia chiara è chiaro, non prugna", () => {
  const testo = blocco[1].match(/--text:\s*([^;]+);/)[1].trim();
  assert.equal(testo.toLowerCase(), "#fff8fd", "il testo della rotaia deve essere quello del tema scuro");
  const muto = blocco[1].match(/--muted:\s*([^;]+);/)[1].trim();
  assert.equal(muto.toLowerCase(), "#cbbbd7");
});

test("34.03 la rotaia chiara ha un fondo scuro pieno, non trasparente sul lilla", () => {
  assert.match(blocco[1], /background:\s*linear-gradient\(180deg/);
  const opacita = [...blocco[1].matchAll(/rgba\(30, 20, 40, (\.\d+)\)/g)].map((m) => Number(m[1]));
  assert.ok(opacita.length >= 1, "il fondo della rotaia deve essere dichiarato in rgba");
  assert.ok(opacita.every((v) => v >= 0.9), "sotto 0.9 il lilla della pagina traspare e il menu si schiarisce");
  assert.match(blocco[1], /backdrop-filter:\s*none/);
});

test("34.04 il pulsante della rotaia resta bianco su vetro scuro", () => {
  assert.ok(css.includes("body[data-theme=\"light\"] .rail .bottone-secondario"));
  const pulsante = css.match(/body\[data-theme="light"\] \.rail \.bottone-secondario\s*\{([^}]*)\}/s)[1];
  assert.match(pulsante, /color:\s*var\(--testo-rail\)/);
});
