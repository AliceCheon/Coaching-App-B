/* tests/85-sfondo-chiaro-lilla.test.mjs — lo sfondo del riquadro programma (B.9, 13/11/2026).
 *
 * Alice: «lo sfondo non era così bianco, era più sul rosino lilla». La scelta è la C
 * delle quattro provate: #f8eafa, che nel tema chiaro è già il token --surface-raised.
 * Qui si controlla che le due regole esistano, che valgano solo col tema chiaro
 * e che il tema scuro sia rimasto com'era.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const foglio = readFileSync(join(radice, "desktop", "index.html"), "utf8");
const righe = foglio.split(String.fromCharCode(10)).map((l) => l.split(String.fromCharCode(13)).join(""));
const ha = (pezzo) => foglio.indexOf(pezzo) !== -1;
const rigaCon = (pezzo) => righe.find((l) => l.indexOf(pezzo) !== -1) || "";

test("85.1 il riquadro del programma ha lo sfondo rosino lilla", () => {
  assert.ok(ha("#pag-programma-1 .p8-box{background:var(--surface-raised) !important}"), "manca lo sfondo del riquadro");
});

test("85.2 anche la finestra della tabella ha lo stesso sfondo", () => {
  assert.ok(ha("#pag-programma-1 .p8-scroll{background:var(--surface-raised) !important}"), "manca lo sfondo della finestra della tabella");
});

test("85.3 il tono chiaro e' #f8eafa, la C provata da Alice", () => {
  assert.ok(ha("--surface-raised: #f8eafa"), "il tema chiaro deve portare --surface-raised: #f8eafa");
  assert.ok(ha("--surface-raised: #211b3e"), "il tema scuro deve restare con il suo --surface-raised");
});

test("85.4 le regole valgono solo col tema chiaro e il scuro resta com'era", () => {
  for (const sel of ["#pag-programma-1 .p8-box{background:", "#pag-programma-1 .p8-scroll{background:"]) {
    const riga = rigaCon(sel);
    assert.ok(riga, "manca la regola: " + sel);
    assert.ok(riga.indexOf('data-theme="light"') !== -1, "regola non legata al tema chiaro: " + sel);
  }
  assert.ok(ha(".p8-box{background:var(--card);"), "la regola base del tema scuro deve restare");
  assert.ok(ha(".p8-scroll{border:1px solid var(--line);border-radius:18px;overflow:hidden;background:var(--card)}"), "la finestra base del tema scuro deve restare");
});
