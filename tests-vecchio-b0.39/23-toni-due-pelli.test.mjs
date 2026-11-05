// tests/23-toni-due-pelli.test.mjs — Fase 2j: un tono, due pelli.
// Il fumetto del desktop e la bolla della striscia devono dire lo stesso tono
// con lo stesso selettore, e sul tema chiaro i toni devono accendersi.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../comune/tema-b.css", import.meta.url), "utf8");
const html = readFileSync(new URL("../mobile/index.html", import.meta.url), "utf8");
const desktop = readFileSync(new URL("../desktop/index.html", import.meta.url), "utf8");

test("23.01 i toni valgono per il fumetto e per la bolla della striscia, con un selettore solo", () => {
  assert.match(css, /:is\(\.bd-bolla, \.bd-striscia-bolla\)\[data-tono="bene"\]/);
  assert.match(css, /:is\(\.bd-bolla, \.bd-striscia-bolla\)\[data-tono="attenzione"\]/);
  assert.ok(!/^\.bd-striscia-bolla\[data-tono=/m.test(css), "resta un selettore orfano per la striscia");
});

test("23.02 la codina eredita il bordo del tono: non resta grigia sul chiaro", () => {
  assert.match(css, /\.bd-striscia-bolla\s*\{[^}]*--bd-bordo: var\(--line\)/s);
  assert.match(css, /border-right: 1px solid var\(--bd-bordo\)/);
  assert.match(css, /border-top: 1px solid var\(--bd-bordo\)/);
  assert.ok(!/background: inherit;\s*border-right: 1px solid var\(--line\)/.test(css), "la codina usa ancora --line fisso");
});

test("23.03 il tono scrive la variabile, non il bordo a mano", () => {
  assert.match(css, /\[data-tono="bene"\]\s*\{\s*--bd-bordo: color-mix\(in srgb, var\(--verde\) 58%, var\(--line\)\);\s*border-color: var\(--bd-bordo\);/);
  assert.match(css, /\[data-tono="attenzione"\]\s*\{\s*--bd-bordo: color-mix\(in srgb, var\(--pink\) 72%, var\(--line\)\);/);
});

test("23.04 sul tema chiaro i toni si accendono e la figura si stacca", () => {
  assert.match(css, /body\[data-theme="light"\] :is\(\.bd-bolla, \.bd-striscia-bolla\)\[data-tono="bene"\]/);
  assert.match(css, /body\[data-theme="light"\] :is\(\.bd-bolla, \.bd-striscia-bolla\)\[data-tono="attenzione"\]/);
  assert.match(css, /body\[data-theme="light"\] \.bd-diva\[data-tono\] \.bd-figura\s*\{\s*filter: drop-shadow/);
  assert.match(css, /body\[data-theme="light"\] :is\(\.bd-bolla, \.bd-striscia-bolla\)\[data-tono="bene"\]\s*\{[^}]*border: 2px solid var\(--bd-bordo\)/s, "sul chiaro il bordo a 1 px non si vede: ci vuole spessore");
  assert.match(css, /body\[data-theme="light"\] :is\(\.bd-bolla, \.bd-striscia-bolla\)\[data-tono="attenzione"\]\s*\{[^}]*border: 2px solid var\(--bd-bordo\)/s);
});

test("23.05 il tono chiaro è più marcato di quello scuro, non uguale", () => {
  const scuro = css.match(/\[data-tono="bene"\]\s*\{\s*--bd-bordo: color-mix\(in srgb, var\(--verde\) (\d+)%/);
  const chiaro = css.match(/body\[data-theme="light"\] :is\(\.bd-bolla, \.bd-striscia-bolla\)\[data-tono="bene"\]\s*\{\s*--bd-bordo: color-mix\(in srgb, var\(--verde\) (\d+)%/);
  assert.ok(scuro && chiaro, "una delle due dichiarazioni manca");
  assert.ok(Number(chiaro[1]) > Number(scuro[1]), "sul chiaro il verde deve essere più presente");
});

test("23.06 solo lettura e nessun !important: la pulizia non apre porte", () => {
  const insieme = css + html + desktop;
  assert.ok(!/!important/.test(css));
  assert.ok(!/\.set\(|\.add\(|\.update\(|\.delete\(|setDoc|addDoc/.test(insieme));
  assert.ok(!/[A-Za-z]:\\\\/.test(css));
});
