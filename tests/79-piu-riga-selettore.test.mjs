/* Passo B (12/11/2026): "+ Riga" nella barra strumenti apre il selettore del
 * Database esercizi (l'UNICA porta di aggiunta: il pulsante della testa e'
 * stato tolto al passo B.2). Prova sul collegamento della pagina (stile 66.8 e
 * 77.5: lettura del sorgente); la scrittura vera della riga e' provata dalla 78
 * e, sulla pagina vera con l'editor vero, dalla 119.
 *
 *  19/11/2026 - il difetto di "+ Riga": la riga era scritta in B ma la vista
 *  leggeva l'id della scheda dalla PRIMA tabella della pagina
 *  (doc.querySelector(".p8-tab[data-scheda]")), non da quella del tasto
 *  premuto. Adesso l'id viene da idSchedaVicino(bottone), la stessa funzione
 *  che usano Svuota e Ripristina.
 *
 *  79.1 "+ Riga" e' vivo quando l'editor c'e', e spento col tooltip giusto
 *       quando non c'e';
 *  79.2 la scelta passa dallo stesso sentiero della testa (apriSelettoreRigaB):
 *       campo "aggiunta-riga" con nome e distretto del catalogo, e la scheda
 *       presa dal tasto.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const vista = () => readFileSync(join(radice, "comune", "vista-programma.js"), "utf8");

test("79.1 + Riga e' vivo quando l'editor c'e' e spento quando non c'e'", () => {
  const v = vista();
  assert.match(v, /pulsanteVivo\(doc, "pr-btn", "\+ Riga", "aggiunge una riga alla scheda"/,
    "+ Riga deve essere un pulsante vivo quando l'editor c'e'");
  assert.match(v, /apriSelettoreRigaB\(doc, btRiga\)/,
    "+ Riga deve passare il PROPRIO tasto, non un riferimento generico");
  assert.match(v, /pulsanteSpento\(doc, "pr-btn", "\+ Riga", "aspetta che il programma sia caricato"\)/,
    "senza editor il tasto e' spento e dice cosa aspettare");
});

test("79.2 la scelta passa dallo stesso sentiero della testa: campo aggiunta-riga con nome e distretto", () => {
  const v = vista();
  assert.match(v, /function apriSelettoreRigaB\(doc, bottone\)/, "manca l'aiuto comune del selettore");
  assert.match(v, /const idScheda = idSchedaVicino\(bottone\)/,
    "la scheda deve venire dal tasto premuto, non dalla prima tabella della pagina");
  assert.match(v, /campo: "aggiunta-riga", esercizio: scelta\.n, muscolo: scelta\.g/,
    "la scelta deve portare nome e distretto del catalogo");
  assert.match(v, /from "\.\/selettore-esercizi-b\.js"/, "il selettore deve restare il modulo del passo 35");
});
