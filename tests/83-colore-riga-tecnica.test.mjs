/* tests/83-colore-riga-tecnica.test.mjs — il colore della riga figlia (B.7, 12/11/2026).
 *
 * Alice, 12/11/2026: «nel mockup era piu' carino il tutto, sul sito e' un po' spento».
 * Qui si guarda il foglio: la riga deve avere la spina, il velo deciso, il badge a
 * gradiente pieno e il tema chiaro i suoi colori. Le regole portano la specificita'
 * vera (#pag-programma-1) perche' la zebra del programma piu' sotto e' piu' forte.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const foglio = readFileSync(join(radice, "desktop", "index.html"), "utf8").replace(/\r/g, "");
const ha = (pezzo) => foglio.indexOf(pezzo) !== -1;

test("83.1 il badge della tecnica e' pieno, a gradiente, con testo scuro", () => {
  assert.ok(ha("tr.p8-tec button.tec-badge{"), "manca la regola del badge nella riga della tecnica");
  assert.ok(ha("linear-gradient(135deg,#C9A7FF,#A855F7)"), "il badge deve essere a gradiente");
  assert.ok(ha("color:#180A24"), "il testo del badge deve essere scuro");
});

test("83.2 la riga ha la spina a sinistra e il velo deciso", () => {
  assert.ok(ha("tr.p8-tec>td{background-color:rgba(168,85,247,.13) !important"), "il velo deve essere al 13% e vincere sulla zebra");
  assert.ok(ha('tr.p8-tec>td:first-child:before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px'), "manca la spina");
  assert.equal(ha("tr.p8-tec td{background:rgba(168,85,247,.05)}"), false, "il velo timido del passo B.5 non deve tornare");
});

test("83.3 serie, reps e nota hanno il loro colore e lo sfondo trasparente", () => {
  assert.ok(ha("tr.p8-tec .c-ser span,html body #pag-programma-1 tr.p8-tec .c-reps span{color:var(--lav)}"), "serie e reps devono essere lavanda");
  assert.ok(ha("tr.p8-tec .p8-note{color:#DCCDF5"), "la nota deve essere lavanda chiara");
  assert.ok(ha(".p8-note{background-color:transparent}"), "gli span devono lasciar vedere il velo");
});

test("83.4 il tema chiaro ha i suoi override (la lavanda sparirebbe)", () => {
  assert.ok(ha('body[data-theme="light"] tr.p8-tec>td{background-color:rgba(168,85,247,.11)'), "manca il velo del tema chiaro");
  assert.ok(ha("#pag-programma-1 tr.p8-tec .c-reps span{color:#7A34C4}"), "serie e reps chiari devono essere viola scuro");
  assert.ok(ha("tr.p8-tec .p8-note{color:#553A70"), "la nota chiara deve essere scura");
});
