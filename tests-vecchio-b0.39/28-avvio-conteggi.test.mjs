/* Passo 1 · guardia sull'avvio: la pagina dei conteggi non deve restare muta.
 *
 * Il difetto vero era uno solo: lo script partiva solo se trovava
 * [data-avvio-conteggi], e quell'attributo non c'era nell'HTML. La pagina
 * restava ferma (login nascosto, tabella nascosta, pastiglia della versione
 * vuota) senza dire niente. Questo test sorveglia quella classe di difetti:
 * ogni id che lo script cerca deve esistere nell'HTML, e la spia di avvio
 * deve esserci davvero.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const radiceRepo = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(radiceRepo, "desktop", "conteggi.html"), "utf8");
const js = readFileSync(join(radiceRepo, "desktop", "conteggi.js"), "utf8");

test("28.01 la spia di avvio c'è, una sola volta, sul body", () => {
  const occorrenze = html.split("data-avvio-conteggi").length - 1;
  assert.equal(occorrenze, 1, "la spia deve stare nell'HTML una volta sola");
  assert.ok(/<body[^>]*data-avvio-conteggi/.test(html), "la spia sta sul body, dove lo script la cerca");
});

test("28.02 ogni id cercato dallo script esiste nella pagina", () => {
  const cercati = new Set();
  for (const m of js.matchAll(/querySelector\("#([A-Za-z0-9_-]+)"\)/g)) cercati.add(m[1]);
  for (const m of js.matchAll(/getElementById\("([A-Za-z0-9_-]+)"\)/g)) cercati.add(m[1]);
  assert.ok(cercati.size >= 5, "lo script cerca davvero degli elementi");
  const mancanti = [...cercati].filter((id) => !html.includes('id="' + id + '"'));
  assert.deepEqual(mancanti, [], "id cercati dallo script e assenti dall'HTML: " + mancanti.join(", "));
});

test("28.03 la pastiglia della versione e le due viste sono nella pagina", () => {
  assert.ok(html.includes("data-versione"), "la pastiglia della versione");
  assert.ok(html.includes('id="vistaLogin"'), "la vista di accesso");
  assert.ok(html.includes('id="vistaConteggi"'), "la vista dei conteggi");
  assert.ok(/id="vistaLogin"[^>]*hidden/.test(html), "l'accesso parte nascosto: lo mostra lo script");
  assert.ok(/id="vistaConteggi"[^>]*hidden/.test(html), "i conteggi partono nascosti: li mostra lo script");
});

test("28.04 se l'avvio si rompe, lo dice in pagina invece di tacere", () => {
  assert.ok(/\.catch\(\(e\) => \{/.test(js), "l'avvio ha una rete: un errore non resta muto");
  assert.ok(js.includes("#erroreAccesso"), "l'errore si scrive dove l'occhio lo trova");
});
