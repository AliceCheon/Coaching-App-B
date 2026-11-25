/* Guardia 147 (passo 16b): i residui del passo 16 che il test 146 non vedeva.
 *
 *  147.1  il beacon Cloudflare non c'e' piu': nessuno script
 *         static.cloudflareinsights.com, nessun data-cf-beacon
 *  147.2  nel pie' del menu non c'e' una seconda versione: via la frase
 *         «In produzione resta la v148.36», che il test 146 non leggeva
 *         (cercava solo v25.7/v26.5/v26.12)
 *  147.3  l'icona del sito e' dentro la pagina (data:), cosi' il browser non
 *         chiede un favicon che su GitHub Pages risponde 404
 *  147.4  la Diva non crea l'AudioContext prima di un gesto: la riga del
 *         suono esce se userActivation dice che nessuno ha ancora cliccato
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM } from "jsdom";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const sorgente = readFileSync(join(radice, "desktop", "index.html"), "utf8");

test("147.1 il beacon Cloudflare e' uscito dal desktop", () => {
  for (const traccia of ["static.cloudflareinsights.com", "data-cf-beacon", "cloudflareinsights"]) {
    assert.equal(sorgente.includes(traccia), false, "e' rimasto " + traccia);
  }
  assert.equal((sorgente.match(/\/cdn-cgi\//g) || []).length, 0, "resta una chiamata /cdn-cgi/");
});

test("147.2 nel pie' del menu non c'e' una seconda versione", () => {
  assert.equal(sorgente.includes("In produzione resta"), false, "resta la frase della v148.36");
  const dom = new JSDOM(sorgente, { url: "http://localhost/desktop/index.html" });
  const piede = dom.window.document.querySelector(".piede-rail");
  assert.ok(piede, "il pie' del menu non esiste piu'");
  const testo = piede.textContent.replace(/\s+/g, " ");
  assert.equal(/v\d+\.\d+/.test(testo), false, "il pie' del menu nomina una versione: " + testo);
  assert.match(testo, /Anteprima/, "il pie' del menu non dice piu' che e' un'anteprima");
  dom.window.close();
});

test("147.3 l'icona del sito viaggia dentro la pagina", () => {
  const trovata = /<link rel="icon" href="data:image\/svg\+xml,[^"]+">/.exec(sorgente);
  assert.ok(trovata, "manca <link rel=\"icon\"> con l'icona dentro la pagina");
});

test("147.4 la Diva aspetta un gesto prima di accendere l'audio", () => {
  const nota = /function nota\([\s\S]*?var c=ctx\(\);/.exec(sorgente);
  assert.ok(nota, "non trovo la funzione nota() dei suoni");
  assert.match(nota[0], /navigator\.userActivation[\s\S]*hasBeenActive===false\)\s*return;/, "manca il controllo sul gesto prima di ctx()");
});
