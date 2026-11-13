/* tests/84-tema-chiaro-leggibile.test.mjs — il tema chiaro leggibile (B.8, 13/11/2026).
 *
 * La nota delle righe era in lavanda fissa #C9A7FF: sul nero bella, sul bianco
 * invisibile. Qui si controlla che le regole del tema chiaro ci siano e che
 * ognuna sia legata a data-theme="light", cosi' il tema scuro resta com'e'.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const foglio = readFileSync(join(radice, "desktop", "index.html"), "utf8").replace(/\r/g, "");
const righe = foglio.split("\n");
const ha = (pezzo) => foglio.indexOf(pezzo) !== -1;
const rigaCon = (pezzo) => righe.find((l) => l.indexOf(pezzo) !== -1) || "";

test("84.1 la nota delle righe, in tema chiaro, e' scura", () => {
  assert.ok(ha('body[data-theme="light"] #pag-programma-1 .p8-r .p8-note{color:#3A2A4E}'), "manca la nota scura del tema chiaro");
  assert.ok(ha("color:var(--lav);background:transparent;border:0"), "la regola originale (lavanda) deve restare per il tema scuro");
});

test("84.2 il segnaposto della nota non e' sbiadito", () => {
  assert.ok(ha(".p8-note:empty::before{color:#6B5A7E;opacity:1}"), "manca il segnaposto leggibile");
});

test("84.3 serie e ripetizioni sono scure in tema chiaro", () => {
  assert.ok(ha(".p8-r td.c-reps span{color:#241238}"), "serie e reps devono essere scure");
  assert.ok(ha('body[data-theme="light"] #pag-programma-1 .p8-r td.c-ser span'), "manca la regola delle serie");
});

test("84.4 le regole nuove stanno tutte dentro il tema chiaro", () => {
  const nuove = [
    'body[data-theme="light"] #pag-programma-1 .p8-r .p8-note{color:#3A2A4E}',
    'body[data-theme="light"] #pag-programma-1 .p8-r .p8-note:empty::before{color:#6B5A7E',
    'body[data-theme="light"] #pag-programma-1 .p8-r td.c-ser span,body[data-theme="light"] #pag-programma-1 .p8-r td.c-reps span{color:#241238}',
    'body[data-theme="light"] #pag-programma-1 .p8h.sub{color:#5E4A72}'
  ];
  for (const pezzo of nuove) {
    const riga = rigaCon(pezzo);
    assert.ok(riga, "manca la regola: " + pezzo.slice(0, 50));
    assert.ok(riga.indexOf('data-theme="light"') !== -1, "regola non legata al tema chiaro: " + pezzo.slice(0, 50));
  }
});
