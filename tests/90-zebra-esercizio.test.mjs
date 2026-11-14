/* tests/90-zebra-esercizio.test.mjs — la zebra per esercizio (B.14h) e, dal
 * B.16b, il gruppo come UNA unita' con il suo tono (--sup-fondo). Dal 14/11
 * la zebra scura e' piu' marcata su richiesta di Alice: nel tema scuro il
 * rapporto fra i due toni sta fra 1,25 e 1,5; nel chiaro resta un distacco
 * leggero (entro 1,25). Il testo si legge su tutti i toni (4,5:1) e il tono
 * del gruppo si distingue dai due toni zebra (almeno 1,1) in entrambi i temi.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const foglio = readFileSync(join(radice, "desktop", "index.html"), "utf8").replace(/\r/g, "");
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
  const righe = foglio.split("\n");
  const apri = righe.findIndex((l) => l.indexOf('body[data-theme="' + nome + '"] {') !== -1);
  assert.ok(apri !== -1, "manca il blocco del tema " + nome);
  const t = {};
  for (let i = apri; i < righe.length && righe[i].indexOf("}") !== 0; i += 1) {
    const m = /^ {2}--(zebra-a|zebra-b|text-primary|sup-fondo): (#[0-9A-Fa-f]{6});/.exec(righe[i]);
    if (m) t[m[1]] = m[2];
  }
  return t;
};

test("90.1 le variabili zebra esistono nei due temi e valgono quelli scelti", () => {
  const scuro = tema("dark"), chiaro = tema("light");
  assert.equal(scuro["zebra-a"], "#14132d");
  assert.equal(scuro["zebra-b"], "#30265a");
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

test("90.3 il distacco dei toni: leggero nel chiaro, marcato nel scuro", () => {
  const chiaro = tema("light");
  const rChiaro = contrasto(chiaro["zebra-a"], chiaro["zebra-b"]);
  assert.ok(rChiaro > 1.0 && rChiaro <= 1.25, "chiaro: distacco " + rChiaro.toFixed(2) + ":1 (entro 1,25)");
  const scuro = tema("dark");
  const rScuro = contrasto(scuro["zebra-a"], scuro["zebra-b"]);
  assert.ok(rScuro >= 1.25 && rScuro <= 1.5, "scuro: distacco " + rScuro.toFixed(2) + ":1 (fra 1,25 e 1,5)");
});

test("90.4 la zebra non e' piu' per riga: regole con le variabili, niente nth-child", () => {
  assert.equal(foglio.indexOf("tr.p8-r:nth-child(even)"), -1, "la zebra per riga deve sparire");
  assert.ok(foglio.indexOf("tr.p8-r.z-b td{background:var(--zebra-b)}") !== -1, "manca la regola del tono alternato");
  assert.ok(foglio.indexOf("tr.p8-r td{background:var(--zebra-a)") !== -1, "la base deve leggere var(--zebra-a)");
});

test("90.5 l'unita' che alterna e' l'esercizio o il gruppo (B.16b)", () => {
  assert.ok(vista.indexOf('const tono = unita[indice] % 2 === 0 ? "z-a" : "z-b";') !== -1, "il tono non viene dall'unita'");
  assert.ok(vista.indexOf('" z-gruppo"') !== -1, "il gruppo non prende la sua classe");
  assert.ok(vista.indexOf('"p8-r p8-tec " + tono') !== -1, "la riga tecnica non eredita il tono del padre");
});

test("90.6 il tono del gruppo si legge e si distingue, in entrambi i temi", () => {
  for (const nome of ["dark", "light"]) {
    const t = tema(nome);
    const g = t["sup-fondo"];
    assert.ok(g, "manca --sup-fondo nel tema " + nome);
    const testo = contrasto(t["text-primary"], g);
    assert.ok(testo >= 4.5, nome + ": testo sul gruppo fa " + testo.toFixed(2) + ":1");
    for (const k of ["zebra-a", "zebra-b"]) {
      const r = contrasto(g, t[k]);
      assert.ok(r >= 1.1, nome + ": il gruppo si confonde con " + k + " (" + r.toFixed(2) + ":1)");
    }
  }
});