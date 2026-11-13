/* tests/86-badge-e-svuota-chiaro.test.mjs — badge demo e pulsanti Svuota (B.10, 13/11/2026).
 *
 * Sul tema chiaro il rosa di marca #FF4FA3 su #fffafd dà 2,96:1: sotto ogni soglia,
 * e su un badge da 9px non si legge. Qui si controlla che le tre regole del tema
 * chiaro esistano, che usino un inchiostro con contrasto sufficiente e che il
 * tema scuro resti col suo rosa.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const foglio = readFileSync(join(radice, "desktop", "index.html"), "utf8");
const righe = foglio.split(String.fromCharCode(10)).map((l) => l.split(String.fromCharCode(13)).join(""));
const rigaCon = (pezzo) => righe.find((l) => l.indexOf(pezzo) !== -1) || "";

const lum = (h) => {
  const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrasto = (a, b) => {
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

test("86.1 il badge demo del tema chiaro ha il suo inchiostro", () => {
  const riga = rigaCon('body[data-theme="light"] #pag-programma-1 .pr-demo{color:#');
  assert.ok(riga, "manca la regola del badge demo sul chiaro");
  assert.ok(riga.indexOf("opacity:1") !== -1, "il badge non deve restare sbiadito");
});

test("86.2 i pulsanti Svuota hanno bordo, testo e fondo propri", () => {
  const riga = rigaCon('body[data-theme="light"] #pag-programma-1 .pr-btn.danger{color:#');
  assert.ok(riga, "manca la regola dei pulsanti Svuota sul chiaro");
  assert.ok(riga.indexOf("background:#FDEEF5") !== -1, "i pulsanti devono avere un fondo che li stacca dalla carta");
});

test("86.3 l'inchiostro scelto supera 4.5:1 su tutti e due i fondi chiari", () => {
  const riga = rigaCon('body[data-theme="light"] #pag-programma-1 .pr-demo{color:#');
  const tinta = /color:(#[0-9A-Fa-f]{6})/.exec(riga);
  assert.ok(tinta, "nella regola del badge non c'e' una tinta esadecimale");
  for (const fondo of ["#fffafd", "#f8eafa"]) {
    const r = contrasto(tinta[1], fondo);
    assert.ok(r >= 4.5, "contrasto " + r.toFixed(2) + ":1 su " + fondo + " (serve almeno 4.5:1)");
  }
});

test("86.4 il tema scuro non e' toccato", () => {
  /* la regola base si cerca a inizio riga: quella nuova del chiaro contiene lo stesso pezzo piu' avanti */
  for (const sel of ["#pag-programma-1 .pr-demo{", "#pag-programma-1 .pr-btn.danger{border-color:var(--pink)"]) {
    const riga = righe.find((l) => l.trim().startsWith(sel)) || "";
    assert.ok(riga, "manca la regola base del scuro: " + sel);
    assert.ok(riga.indexOf('data-theme="light"') === -1, "la regola base non deve essere del chiaro: " + sel);
  }
  assert.ok(foglio.indexOf("--pink:#FF4FA3") !== -1, "il rosa di marca deve restare quello");
});
