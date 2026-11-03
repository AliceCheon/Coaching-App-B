// tests/17-volto.test.mjs — il Diva Bot di B è quello del mockup, importato e non
// ridisegnato. Fase 2e, seconda passata: «importa tutto» — figura intera, sei
// espressioni, striscia dei suggerimenti, marchio della barra in alto.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GEOMETRIA_VOLTO,
  TONI_VOLTO,
  ESPRESSIONI_VOLTO,
  ETICHETTE_ESPRESSIONE,
  etichettaTono,
  espressioneDelTono,
  markupVolto,
  markupFigura,
  markupMarco,
  markupStriscia,
  creaVolto,
  creaFigura,
  montaStriscia,
  montaMarco
} from "../comune/diva-volto.js";

const TUTTO =
  ESPRESSIONI_VOLTO.map((x) => markupFigura(x)).join("") +
  ESPRESSIONI_VOLTO.map((x) => markupVolto(x)).join("");

test("17.01 le sei espressioni del mockup, né una in più", () => {
  assert.deepEqual([...ESPRESSIONI_VOLTO], ["idle", "happy", "focus", "tired", "worried", "cele"]);
});

test("17.02 le due inquadrature sono quelle dell'originale", () => {
  assert.equal(GEOMETRIA_VOLTO.intera, "0 18 240 256");
  assert.equal(GEOMETRIA_VOLTO.testa, "44 58 152 112");
  assert.ok(markupFigura("idle").includes('viewBox="0 18 240 256"'));
  assert.ok(markupVolto("idle").includes('viewBox="44 58 152 112"'));
  assert.ok(markupVolto("idle", { testa: false }).includes('viewBox="0 18 240 256"'));
});

test("17.03 ogni espressione è un disegno diverso", () => {
  const disegni = new Set(ESPRESSIONI_VOLTO.map((x) => markupFigura(x)));
  assert.equal(disegni.size, ESPRESSIONI_VOLTO.length);
});

test("17.04 la figura intera ha scarpe, ombra e bilanciere; la testa no", () => {
  const intera = markupFigura("idle");
  const testa = markupVolto("idle");
  assert.ok(intera.includes('M82 258h30M128 258h30'));
  assert.ok(intera.includes('<ellipse cx="120" cy="268"'));
  assert.ok(intera.includes("M120 189c-10-12-24 3 0 20"));
  assert.ok(intera.includes("M120 49V31"));
  assert.ok(!testa.includes('M82 258h30M128 258h30'));
  assert.ok(!testa.includes('<ellipse cx="120" cy="268"'));
  assert.ok(testa.includes("M120 49V31"));
});

test("17.05 le bocche sono i percorsi del mockup", () => {
  assert.ok(markupFigura("happy").includes("M101 135q19 24 38 0"));
  assert.ok(markupFigura("idle").includes("M103 137q17 15 34 0"));
  assert.ok(markupFigura("focus").includes("M106 143h28"));
  assert.ok(markupFigura("worried").includes("M105 144q8-8 15 0t15 0"));
  assert.ok(markupFigura("tired").includes('rx="8" ry="6"'));
});

test("17.06 la goccia della preoccupata e le Z della stanca", () => {
  const preoccupata = markupFigura("worried");
  assert.ok(preoccupata.includes("M172 98q-8 12 0 17"));
  assert.ok(preoccupata.includes('fill="#8fd3ff"'));
  const stanca = markupFigura("tired");
  assert.ok(stanca.includes(">Z</text>"));
  assert.ok(stanca.includes(">z</text>"));
});

test("17.07 la tavolozza è quella del mockup", () => {
  ["#ff9ad5", "#ff72c2", "#241a2e", "#b9a6d0", "#fdfbff", "#8fd3ff", "#efe6f7"].forEach((colore) => {
    assert.ok(TUTTO.includes(colore), "manca " + colore);
  });
});

test("17.08 l'esultanza alza le braccia più della felicità", () => {
  assert.ok(markupFigura("happy").includes('rotate(130 68 177)'));
  assert.ok(markupFigura("cele").includes('rotate(150 68 177)'));
  assert.ok(!markupFigura("idle").includes("rotate(130 68 177)"));
  assert.ok(!markupVolto("happy").includes("rotate(130 68 177)"));
});

test("17.09 nessuna emoji dentro il personaggio", () => {
  assert.equal(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(TUTTO), false);
});

test("17.10 espressione sconosciuta o assente: resta la tranquilla", () => {
  assert.equal(markupFigura("boh"), markupFigura("idle"));
  assert.equal(markupFigura(), markupFigura("idle"));
  assert.equal(markupFigura(null), markupFigura("idle"));
});

test("17.11 la striscia è quella del mockup: bolla e figura intera", () => {
  const striscia = markupStriscia("focus", "Controlla la discesa!");
  assert.ok(striscia.startsWith('<div class="bd-striscia">'));
  assert.ok(striscia.includes('<div class="bd-striscia-bolla">Controlla la discesa!</div>'));
  assert.ok(striscia.includes('<div class="bd-striscia-sbt">'));
  assert.ok(striscia.includes('viewBox="0 18 240 256"'));
  assert.ok(striscia.includes("M106 143h28"));
});

test("17.12 nella striscia il testo è dato, quindi escapato", () => {
  const striscia = markupStriscia("idle", '<b>tre</b> & "due"');
  assert.ok(striscia.includes("&lt;b&gt;tre&lt;/b&gt; &amp; &quot;due&quot;"));
  assert.ok(!striscia.includes("<b>tre</b>"));
});

test("17.13 il marchio della barra in alto è la testa", () => {
  const marco = markupMarco("idle");
  assert.ok(marco.startsWith('<div class="bd-marco">'));
  assert.ok(marco.includes('viewBox="44 58 152 112"'));
  assert.ok(!marco.includes('viewBox="0 18 240 256"'));
});

test("17.14 i tre toni portano a tre espressioni, e le etichette sono distinte", () => {
  assert.deepEqual([...TONI_VOLTO], ["bene", "attenzione", "neutro"]);
  assert.equal(espressioneDelTono("bene"), "happy");
  assert.equal(espressioneDelTono("attenzione"), "worried");
  assert.equal(espressioneDelTono("neutro"), "idle");
  assert.equal(espressioneDelTono("boh"), "idle");
  const etichette = TONI_VOLTO.map((t) => etichettaTono(t));
  assert.equal(new Set(etichette).size, TONI_VOLTO.length);
});

test("17.15 le etichette della tavola, parola per parola", () => {
  assert.deepEqual(Object.keys(ETICHETTE_ESPRESSIONE).sort(), ["focus", "happy", "idle", "tired", "worried"]);
  assert.equal(ETICHETTE_ESPRESSIONE.happy.nome, "Felice");
  assert.equal(ETICHETTE_ESPRESSIONE.focus.nome, "Concentrata");
  assert.equal(ETICHETTE_ESPRESSIONE.tired.nome, "Stanca");
  assert.equal(ETICHETTE_ESPRESSIONE.worried.nome, "Preoccupata");
  assert.equal(ETICHETTE_ESPRESSIONE.idle.nome, "Tranquilla");
});

test("17.16 senza documento non si costruisce niente: nessun errore", () => {
  assert.equal(creaVolto(null, "bene"), null);
  assert.equal(creaFigura(undefined, "bene"), null);
  assert.equal(montaStriscia({}, "idle", "ciao"), null);
  assert.equal(montaMarco(null, "idle"), null);
});
