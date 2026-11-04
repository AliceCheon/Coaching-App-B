import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readiness } from "../comune/vista-dashboard.js";

const html = readFileSync(new URL("../desktop/index.html", import.meta.url), "utf8");
const modulo = readFileSync(new URL("../comune/vista-dashboard.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../comune/dashboard-b.css", import.meta.url), "utf8");
const config = readFileSync(new URL("../app-config-b.js", import.meta.url), "utf8");

const voci = [...html.matchAll(/<button class="voce([^"]*)" data-vista="([^"]+)"/g)].map((m) => ({
  spenta: m[1].includes("spenta"),
  id: m[2]
}));

test("29.01 il rail ha i tre gruppi del mockup", () => {
  for (const g of ["alimentazione", "programmi", "studio"]) {
    assert.match(html, new RegExp('data-gruppo="' + g + '"'), "manca il gruppo " + g);
  }
});

test("29.02 nel rail ci sono le ventidue voci del v31, una per una", () => {
  const attese = [
    "dashboard", "dati-cliente", "salute-recupero", "misure", "reset-bulk-cut", "monitor-annuale", "monitor-peso", "integratori",
    "overview-atleta", "pianificazione", "database-esercizi", "scheletri", "progressioni", "programma-1", "programma-2", "programma-3",
    "riepilogo-volume", "specializzazione", "curve-forza", "archivio", "study-time", "impostazioni"
  ];
  assert.equal(voci.length, 22, "le voci sono " + voci.length);
  assert.deepEqual(voci.map((v) => v.id), attese, "ordine o nomi diversi dal v31");
});

test("29.03 in questo passo sono vive la Dashboard, la Overview atleta e la Pianificazione", () => {
  const vive = voci.filter((v) => !v.spenta);
  assert.deepEqual(vive.map((v) => v.id), ["dashboard", "overview-atleta", "pianificazione"]);
  assert.match(html, /class="voce attiva"[^>]*data-vista="dashboard"/);
});

test("29.04 le sette rimandate dicono «al passo 5», le altre «prossima schermata»", () => {
  const passo5 = ["salute-recupero", "misure", "reset-bulk-cut", "monitor-annuale", "monitor-peso", "integratori", "study-time"];
  for (const id of passo5) {
    const blocco = html.slice(html.indexOf('data-vista="' + id + '"'));
    assert.match(blocco.slice(0, 220), /<em>al passo 5<\/em>/, id + " non dichiara il passo 5");
  }
  const altre = voci.filter((v) => v.spenta && !passo5.includes(v.id));
  assert.equal(altre.length, 12);
  for (const v of altre) {
    const blocco = html.slice(html.indexOf('data-vista="' + v.id + '"'));
    assert.match(blocco.slice(0, 220), /<em>prossima schermata<\/em>/, v.id + " non dichiara la schermata successiva");
  }
  assert.equal((html.match(/disabled/g) || []).length, 19, "le voci non fatte devono essere davvero disabilitate");
});

test("29.05 l'aspetto è quello del v31, non una carta inventata", () => {
  for (const classe of ["ck-testa", "ck-ready", "ck-gauge", "ck-mets", "ck-met", "ck-due", "ck-card", "ck-sez", "ck-piede-card"]) {
    assert.ok(css.includes("." + classe), "manca ." + classe + " nel foglio preso dal mockup");
  }
  for (const classe of ["ck-testa", "ck-ready", "ck-mets", "ck-card"]) {
    assert.ok(modulo.includes(classe), "la Dashboard non usa " + classe);
  }
  assert.match(html, /class="nastro"/, "manca il nastro del v31");
  assert.match(html, /comune\/dashboard-b\.css/, "il foglio della dashboard non è collegato");
});

test("29.06 la readiness si calcola solo con tutti e cinque i segnali", () => {
  assert.equal(readiness(null), null);
  assert.equal(readiness({ energy: 4, sleep: 5, doms: 3, stress: 2 }), null, "quattro segnali non fanno una media");
  const r = readiness({ energy: 4, sleep: 5, doms: 3, stress: 2, hunger: 4 });
  assert.equal(r.punteggio, 72);
});

test("29.07 nessun numero di riempimento: i valori arrivano dal modello", () => {
  assert.ok(!/\b(124|14321|1234)\b/.test(modulo), "c'è un numero scritto a mano nel modulo");
  assert.match(modulo, /const NON = "non registrato"/);
  assert.ok(modulo.includes("nessuna durata registrata"), "i buchi dichiarano perché sono buchi");
});

test("29.08 resta in sola lettura: nessuna scrittura nel modulo nuovo", () => {
  for (const vietato of ["setDoc", "updateDoc", "addDoc", "deleteDoc", "onSnapshot", "writeBatch"]) {
    assert.ok(!modulo.includes(vietato), "trovato " + vietato + " nella Dashboard");
  }
  assert.ok(!modulo.includes("innerHTML"), "la Dashboard costruisce nodi, non HTML");
});

test("29.09 la build è quella del passo 2.1", () => {
  assert.match(config, /build:\s*"b0\.\d+-passo2-[0-9]-[a-z0-9-]+"/);
  assert.match(html, /data-versione/);
});

test("29.10 nessun !important nel foglio nuovo", () => {
  assert.ok(!css.includes("!important"));
});
