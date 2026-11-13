/* tests/90-zebra-esercizio.test.mjs — la zebra per esercizio (B.14h, 13/11/2026).
 *
 * Alice, 13/11/2026: «una riga chiara e una leggermente più scura, alternate per
 * esercizio; le figlie delle tecniche hanno il tono del padre». Il distacco è
 * leggero (pochi punti di luminosità, non un cambio di colore) e i due toni per
 * tema stanno in variabili CSS (--zebra-a / --zebra-b), niente colori sparsi.
 * Qui si controlla che il testo si legga su entrambi i toni in entrambi i temi
 * (minimo 4,5:1, calcolato come nel test 86), che i toni siano diversi ma
 * vicini, che la vecchia zebra per riga (nth-child) sia sparita e che la riga
 * tecnica erediti il tono del padre.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const foglio = readFileSync(join(radice, "desktop", "index.html"), "utf8").replace(/\r/g, "");
const righe = foglio.split("\n");
const vista = readFileSync(join(radice, "comune", "vista-programma.js"), "utf8").replace(/\r/g, "");

const lum = (h) => {
  const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrasto = (a, b) => {
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

const tema = (nome) => {
  const apri = righe.findIndex((l) => l.indexOf('body[data-theme="' + nome + '"] {') !== -1);
  assert.ok(apri !== -1, "manca il blocco del tema " + nome);
  const t = {};
  for (let i = apri; i < righe.length && righe[i].indexOf("}") !== 0; i += 1) {
    const m = /^ {2}--(zebra-a|zebra-b|text-primary): (#[0-9A-Fa-f]{6});/.exec(righe[i]);
    if (m) t[m[1]] = m[2];
  }
  return t;
};

test("90.1 le variabili zebra esistono nei due temi e valgono quelli scelti", () => {
  const scuro = tema("dark"), chiaro = tema("light");
  assert.equal(scuro["zebra-a"], "#15152f");
  assert.equal(scuro["zebra-b"], "#211b3e");
  assert.equal(chiaro["zebra-a"], "#fffafd");
  assert.equal(chiaro["zebra-b"], "#f8eafa");
});

test("90.2 il testo si legge su entrambi i toni, in entrambi i temi (4,5:1)", () => {
  for (const nome of ["dark", "light"]) {
    const t = tema(nome);
    for (const k of ["zebra-a", "zebra-b"]) {
      const r = contrasto(t["text-primary"], t[k]);
      assert.ok(r >= 4.5, nome + ": testo su " + k + " fa " + r.toFixed(2) + ":1 (servono 4,5)");
    }
  }
});

test("90.3 i due toni sono diversi ma vicini (distacco leggero)", () => {
  for (const nome of ["dark", "light"]) {
    const t = tema(nome);
    assert.notEqual(t["zebra-a"], t["zebra-b"], nome + ": i due toni sono uguali");
    const r = contrasto(t["zebra-a"], t["zebra-b"]);
    assert.ok(r > 1.0, nome + ": i due toni non si distinguono");
    assert.ok(r <= 1.25, nome + ": il distacco e' troppo forte (" + r.toFixed(2) + ":1)");
  }
});

test("90.4 la zebra non e' piu' per riga: regole con le variabili, niente nth-child", () => {
  assert.equal(foglio.indexOf("tr.p8-r:nth-child(even)"), -1, "la zebra per riga deve sparire");
  assert.ok(foglio.indexOf("tr.p8-r.z-b td{background:var(--zebra-b)}") !== -1, "manca la regola del tono alternato");
  assert.ok(foglio.indexOf("tr.p8-r td{background:var(--zebra-a)") !== -1, "la base deve leggere var(--zebra-a)");
});

test("90.5 l'unita' che alterna e' l'esercizio e la figlia porta il tono del padre", () => {
  assert.ok(vista.indexOf('const tono = indice % 2 === 0 ? "z-a" : "z-b";') !== -1, "il tono non viene dall'indice dell'esercizio");
  assert.ok(vista.indexOf('const tr = n(doc, "tr", "p8-r " + tono);') !== -1, "il padre non prende il tono");
  assert.ok(vista.indexOf('"p8-r p8-tec " + tono') !== -1, "la riga tecnica non eredita il tono del padre");
});
