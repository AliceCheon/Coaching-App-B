/* Guardia 42 (passo 3a): desktop/index.html può differire da pc/index.html
 * (il v31 congelato) SOLO nelle righe dichiarate in docs/differenze-dal-v31.md.
 * Ogni modifica futura al desktop aggiunge un blocco a quel documento, altrimenti
 * questa guardia diventa rossa. pc/index.html resta congelato al suo sha256. */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const documento = readFileSync(join(radice, "docs", "differenze-dal-v31.md"), "utf8");

const blocchiDichiarati = [...documento.matchAll(/- righe (\d+)(?:-(\d+))?/gm)]
  .map((m) => [Number(m[1]), Number(m[2] || m[1])]);

function leggiDiff() {
  try {
    return execFileSync("git", ["diff", "--no-index", "-U0", join(radice, "pc", "index.html"), join(radice, "desktop", "index.html")], { encoding: "utf8" });
  } catch (e) {
    /* git esce 1 quando i file differiscono: è il caso normale. */
    return String((e && e.stdout) || "");
  }
}
const spezzoni = [...leggiDiff().matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)]
  .map((m) => [Number(m[1]), Number(m[2] == null ? 1 : Number(m[2]))]);

test("42.1 pc/index.html resta il v31 congelato allo sha dichiarato", () => {
  const trovato = /sha256 di pc\/index\.html: `?([0-9a-f]{64})`?/.exec(documento);
  assert.ok(trovato, "nel documento manca la riga dello sha256 di pc/index.html");
  const vero = createHash("sha256").update(readFileSync(join(radice, "pc", "index.html"))).digest("hex");
  assert.equal(vero, trovato[1]);
});

test("42.2 il documento dichiara almeno un blocco di righe", () => {
  assert.ok(blocchiDichiarati.length > 0, "nessun blocco dichiarato in docs/differenze-dal-v31.md");
});

test("42.3 ogni riga cambiata del desktop sta in un blocco dichiarato", () => {
  assert.ok(spezzoni.length > 0, "il desktop non differisce piu dal v31: o e' tornato identico o il diff non si legge");
  for (const [inizio, numero] of spezzoni) {
    const fine = inizio + numero - 1;
    const dentro = blocchiDichiarati.some(([a, b]) => inizio >= a && fine <= b);
    assert.ok(dentro, "righe " + inizio + "-" + fine + " cambiate ma non dichiarate in docs/differenze-dal-v31.md");
  }
});

test("42.4 ogni blocco dichiarato serve davvero (niente blocchi morti)", () => {
  for (const [a, b] of blocchiDichiarati) {
    const serve = spezzoni.some(([inizio, numero]) => a <= inizio && inizio + numero - 1 <= b);
    assert.ok(serve, "il blocco dichiarato " + a + "-" + b + " non corrisponde a nessuna differenza reale");
  }
});
