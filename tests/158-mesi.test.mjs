/* Guardia 158 (passo 40): «Mesi» in Monitor peso.
 *
 *  158.1  perMese raggruppa per mese anche con pesate fuori ordine o sparse
 *  158.2  la media è quella vera e i mesi sono in ordine
 *  158.3  le linguette «Pesate / Mesi» hanno un gestore che accende i pannelli
 *  158.4  la classe .pg-tab delle tabelle non è più schiacciata dalla regola
 *         delle linguette del cruscotto (era inline-flex: righe a destra)
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
/* il modulo è uno script classico: si carica e si prende quello che espone */
require(join(radice, "comune", "peso-b.js"));
const Peso = globalThis.BDPesoB;
const pagina = readFileSync(join(radice, "desktop", "index.html"), "utf8");
const cruscotto = readFileSync(join(radice, "comune", "dashboard-b.css"), "utf8");

const pesata = (data, kg) => ({ data, kg, fonte: "prova" });

test("158.1 perMese raggruppa per mese, non per vicinanza", () => {
  const mesi = Peso.perMese({ pesate: [
    pesata("2026-10-27", 67.7),
    pesata("2026-03-13", 68.0),
    pesata("2026-10-02", 68.1),   // stesso mese, separato da un'altra data
    pesata("2026-05-04", 67.4)
  ] });
  assert.deepEqual(mesi.map((m) => m.chiave), ["2026-03", "2026-05", "2026-10"], "tre mesi, in ordine");
  const ottobre = mesi[2];
  assert.equal(ottobre.n, 2, "due pesate in ottobre");
  assert.equal(Math.round(ottobre.media * 100) / 100, 67.9, "media vera delle due pesate");
  assert.equal(mesi[0].anno, 2026);
  assert.equal(mesi[0].mese, 3, "marzo");
});

test("158.2 media e conteggi non si inventano niente", () => {
  assert.deepEqual(Peso.perMese({ pesate: [] }), [], "senza pesate, nessun mese");
  const uno = Peso.perMese({ pesate: [pesata("2026-11-01", 70)] });
  assert.equal(uno.length, 1);
  assert.equal(uno[0].media, 70, "una pesata: la media è quella");
  const scarto = Peso.perMese({ pesate: [pesata("2026-11-01", 70), { data: "2026-11-02" }, pesata("2026-11-03", 72)] });
  assert.equal(scarto[0].n, 2, "la pesata senza kg non entra nel conto");
  assert.equal(scarto[0].media, 71);
});

test("158.3 le linguette «Pesate / Mesi» accendono i pannelli", () => {
  assert.match(pagina, /barraMp\.addEventListener\('click'/, "c'è il gestore del clic sulle linguette");
  assert.match(pagina, /pannelli\[k\]\.classList\.toggle\('on'/, "il clic accende il pannello giusto");
  assert.match(pagina, /data-t="sett"[\s\S]{0,200}data-t="mesi"/, "le due linguette ci sono");
  const pannelli = [...pagina.matchAll(/<div class="mp-pane[^"]*" data-p="(\w+)"/g)].map((m) => m[1]);
  assert.deepEqual(pannelli, ["sett", "mesi"], "i due pannelli ci sono: " + pannelli.join(","));
});

test("158.4 la regola delle linguette non schiaccia più le tabelle", () => {
  /* i commenti non sono regole: si tolgono prima di guardare */
  const css = cruscotto.replace(/\/\*[\s\S]*?\*\//g, "");
  const nuda = css.match(/(?<!> )\.pg-tab\{[^}]*\}/);
  assert.equal(nuda, null, "non esiste più una regola .pg-tab nuda: " + (nuda && nuda[0]));
  assert.match(cruscotto, /\.pg-tabs > \.pg-tab\{/, "la linguetta del cruscotto vale solo dentro .pg-tabs");
  assert.match(pagina, /\.pg-tab\{width:100%;border-collapse:collapse/, "la tabella tiene la sua regola");
  assert.equal(/display\s*:\s*inline-flex/.test(pagina.slice(pagina.indexOf(".pg-tab{width:100%"), pagina.indexOf(".pg-tab{width:100%") + 120)), false);
});
