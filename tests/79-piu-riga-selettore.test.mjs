/* Passo B (12/11/2026): «+ Riga» nella barra strumenti apre il selettore del
 * Database esercizi, come il pulsante 🗂 della testa. Prova sul collegamento
 * della pagina (stile 66.8 e 77.5: lettura del sorgente); la scrittura vera
 * della riga e' provata dalla 78.
 *
 *  79.1 «+ Riga» e' un pulsante vivo che apre il selettore con l'editor
 *       corrente; la versione spenta non esiste piu';
 *  79.2 la scelta passa dallo stesso sentiero della testa (apriSelettoreRigaB):
 *       campo "aggiunta-riga" con nome e distretto del catalogo.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const vista = () => readFileSync(join(radice, "comune", "vista-programma.js"), "utf8");

test("79.1 «+ Riga» e' vivo e apre il selettore, la versione spenta non c'e' piu'", () => {
  const v = vista();
  assert.match(v, /pulsanteVivo\(doc, "pr-btn", "\+ Riga"/, "«+ Riga» deve essere un pulsante vivo");
  assert.match(v, /apriSelettoreRigaB\(doc, modificaCorrente\)/, "«+ Riga» deve aprire il selettore con l'editor corrente");
  assert.doesNotMatch(v, /pulsanteSpento\(doc, "pr-btn", "\+ Riga"/, "non deve restare la versione spenta");
});

test("79.2 la scelta passa dallo stesso sentiero della testa: campo aggiunta-riga con nome e distretto", () => {
  const v = vista();
  assert.match(v, /function apriSelettoreRigaB\(doc, mod\)/, "manca l'aiuto comune del selettore");
  assert.match(v, /campo: "aggiunta-riga", esercizio: scelta\.n, muscolo: scelta\.g/, "la scelta deve portare nome e distretto del catalogo");
  assert.match(v, /from "\.\/selettore-esercizi-b\.js"/, "il selettore deve restare il modulo del passo 35");
});
