/* Guardia 145 (passo 15): in Dati Cliente restano QUATTRO linguette —
 * Anagrafica, Anamnesi, Biofeedback, Questionari. «Wearable» e
 * «Personalizzati» sono usciti dal file: erano gusci nati dal video, senza
 * un dato dietro e senza un bisogno espresso. Non restano nascosti.
 * Il tipo esercizio «personalizzata» di comune/schede-v2.js resta: è un'altra cosa. */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagina = readFileSync(join(radice, "desktop", "index.html"), "utf8");
const righe = pagina.split("\n");

function bloccoTabs() {
  const i = pagina.indexOf('<div class="dc-tabs">');
  assert.ok(i > 0, "manca la barra delle linguette");
  return pagina.slice(i, pagina.indexOf("</div>", i));
}
function rigaPannello(k) {
  return righe.find((r) => r.includes('data-pan="' + k + '"'));
}
const KEYS = [...bloccoTabs().matchAll(/data-dc="([^"]+)"/g)].map((m) => m[1]);

test("145.1 i due tasti Wearable e Personalizzati non ci sono piu'", () => {
  const tasti = /<button[^>]*data-dc="([^"]+)"/g;
  const nomi = [...pagina.matchAll(tasti)].map((m) => m[1]);
  assert.ok(!nomi.includes("wearable"), "il tasto Wearable e' ancora nella pagina");
  assert.ok(!nomi.includes("personalizzati"), "il tasto Personalizzati e' ancora nella pagina");
  assert.equal((pagina.match(/data-dc="wearable"/g) || []).length, 0);
  assert.equal((pagina.match(/data-dc="personalizzati"/g) || []).length, 0);
});

test("145.2 i due pannelli non ci sono piu'", () => {
  assert.equal((pagina.match(/data-pan="wearable"/g) || []).length, 0, "il pannello Wearable e' rimasto");
  assert.equal((pagina.match(/data-pan="personalizzati"/g) || []).length, 0, "il pannello Personalizzati e' rimasto");
  assert.equal(rigaPannello("wearable"), undefined);
  assert.equal(rigaPannello("personalizzati"), undefined);
});

test("145.3 restano quattro linguette, nell'ordine, ognuna col suo pannello", () => {
  assert.deepEqual(KEYS, ["anagrafica", "anamnesi", "biofeedback", "questionari"]);
  for (const k of KEYS) assert.ok(rigaPannello(k), "la linguetta " + k + " non ha il pannello");
  const pannelli = (pagina.match(/data-pan="/g) || []).length;
  assert.equal(pannelli, 4, "ci sono " + pannelli + " pannelli invece di quattro");
});

test("145.4 la riga delle linguette elenca le quattro, e la frase del video e' andata", () => {
  assert.match(pagina, /<p>Anagrafica, Anamnesi, Biofeedback e Questionari<\/p>/);
  assert.equal((pagina.match(/da costruire con i tuoi screen/gi) || []).length, 0, "e' rimasta la frase dei gusci");
});

test("145.5 Biofeedback e Questionari dicono cosa manca e da dove arriva, senza campi", () => {
  for (const k of ["biofeedback", "questionari"]) {
    const riga = rigaPannello(k);
    assert.ok(riga, "manca il pannello " + k);
    assert.doesNotMatch(riga, /<(input|textarea|select)\b/i, k + " ha un campo editabile");
    assert.doesNotMatch(riga, /contenteditable/i, k + " ha un campo editabile");
    assert.match(riga, /telefono|check-in/i, k + " non dice da dove arriva il dato");
    assert.match(riga, /manca/i, k + " non dice cosa manca");
  }
});

test("145.6 nessun riferimento orfano a wearable o personalizzati in desktop/ e comune/", () => {
  const colpevoli = [];
  function cammina(dir) {
    for (const nome of readdirSync(dir)) {
      if (nome === "node_modules" || nome.startsWith(".")) continue;
      const pieno = join(dir, nome);
      const st = statSync(pieno);
      if (st.isDirectory()) { cammina(pieno); continue; }
      if (!/\.(html|js|mjs|css|json|txt)$/i.test(nome)) continue;
      const testo = readFileSync(pieno, "utf8");
      testo.split("\n").forEach((riga, n) => {
        if (/wearable/i.test(riga)) colpevoli.push(pieno + ":" + (n + 1) + " wearable");
        if (/\bpersonalizzati\b/i.test(riga)) colpevoli.push(pieno + ":" + (n + 1) + " personalizzati");
      });
    }
  }
  for (const d of ["desktop", "comune"]) cammina(join(radice, d));
  assert.deepEqual(colpevoli, [], "riferimenti rimasti: " + colpevoli.join(", "));
  /* il tipo esercizio resta dov'era: non e' una linguetta */
  const schede = readFileSync(join(radice, "comune", "schede-v2.js"), "utf8");
  assert.match(schede, /personalizzata/i, "il tipo esercizio 'personalizzata' e' sparito da schede-v2.js");
});
