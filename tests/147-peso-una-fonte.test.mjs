/* Guardia 147 (passo 17): il peso ha una fonte sola e tre stati distinti.
 *
 *  147.1  comune/peso-b.js: cinque pesate dalla scheda, stato "letto"
 *  147.2  vuoto: "letta e vuota: nessuna pesata registrata", anno nullo
 *  147.3  lettura negata: "non ho potuto leggere", mai uno zero
 *  147.4  profilo non confermato: altezza ed eta' mancanti
 *  147.5  le cinque pagine dicono lo stesso numero di pesate e la stessa data
 *  147.6  con il vuoto dicono tutte "nessuna pesata registrata", senza zeri
 *  147.7  con la lettura negata dicono "non ho potuto leggere", senza zeri
 *  147.8  Reset/Bulk/Cut senza profilo: nessuna cifra, i campi mancanti nominati
 *  147.9  il desktop non tiene piu' la sua copia delle cinque pesate
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";
import "../comune/peso-b.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const P = globalThis.BDPesoB;
const sorgente = readFileSync(join(radice, "desktop", "index.html"), "utf8");
const modulo = readFileSync(join(radice, "comune", "peso-b.js"), "utf8");

test("147.1 cinque pesate dalla scheda, stato letto", () => {
  const st = P.leggiPeso();
  assert.equal(st.stato, "letto");
  assert.equal(st.pesate.length, 5);
  assert.equal(st.ultima.data, "2026-10-27");
  assert.equal(st.prima.data, "2026-03-13");
  assert.ok(st.pesate.every((x) => x.fonte === "scheda coach (importata)"));
  assert.deepEqual(st.pesate.map((x) => x.kg), [68, 67.4, 66.4, 66, 67.7]);
  assert.equal(P.testoPeso(st), "5 pesate, l'ultima del 27/10/2026");
  assert.equal(st.anno, 2026);
});

test("147.2 vuoto: nessuna pesata registrata, nessun anno", () => {
  const st = P.leggiPeso({ pesate: [] });
  assert.equal(st.stato, "vuoto");
  assert.equal(st.pesate.length, 0);
  assert.equal(st.anno, null);
  assert.equal(P.testoPeso(st), "letta e vuota: nessuna pesata registrata");
  assert.equal(P.riassunto(st).titolo, "Nessuna pesata");
  assert.doesNotMatch(P.testoPeso(st), /\b0\b/);
});

test("147.3 lettura negata: non ho potuto leggere, non zero", () => {
  const st = P.leggiPeso({ errore: "permission-denied" });
  assert.equal(st.stato, "non-letto");
  assert.equal(P.testoPeso(st), "non ho potuto leggere il peso: permission-denied");
  assert.equal(P.testoPeso(P.leggiPeso({ errore: "" })), "non ho ancora letto il peso");
  assert.doesNotMatch(P.testoPeso(st), /\b0\b/);
});

test("147.4 profilo non confermato: altezza ed eta' mancanti", () => {
  const pr = P.leggiProfilo(null);
  assert.equal(pr.confermato, false);
  assert.ok(pr.mancanti.includes("altezza"));
  assert.ok(pr.mancanti.includes("età"));
  assert.equal(P.profiloTesto(pr), "altezza e età non registrate");
  const finto = P.leggiProfilo({ altezza: 165, eta: 30, sesso: "d", confermato: true });
  assert.equal(finto.confermato, true);
  assert.equal(P.profiloTesto(finto), "165 cm · 30 anni");
});

function pagina() {
  const html = sorgente.replace('<script src="../comune/peso-b.js"></script>',
    "<script>" + modulo + "</script>").replace(/<script[^>]*\ssrc="[^"]*"[^>]*><\/script>/g, "");
  const rumori = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { const m = String((e && e.message) || ""); if (!/Not implemented/.test(m)) rumori.push(m); });
  const dom = new JSDOM(html, { runScripts: "dangerously", url: "http://localhost/desktop/index.html", virtualConsole: vc });
  return { w: dom.window, rumori };
}
const testo = (w, sel) => (w.document.querySelector(sel) || {}).textContent || "";

test("147.5 le cinque pagine dicono lo stesso numero e la stessa data", () => {
  const { w, rumori } = pagina();
  try {
    const atteso = P.testoPeso(P.leggiPeso());
    w.BDPESO_PITTA(P.leggiPeso());
    const pezzi = {
      dashboard: testo(w, "[data-peso-p]"),
      monitorPeso: testo(w, "#mp-badge"),
      chi: testo(w, "[data-peso-profilo]"),
      overview: testo(w, "#ov-pesot"),
      annuale: testo(w, "#ma-kpi"),
      rigaAnnuale: testo(w, "#ma-year")
    };
    assert.match(pezzi.dashboard, /5 pesate/);
    assert.match(pezzi.monitorPeso, /5 pesate, l'ultima del 27\/10\/2026/);
    assert.match(pezzi.overview, /5 pesate, l'ultima del 27\/10\/2026/);
    assert.match(pezzi.annuale, /5/);
    assert.match(pezzi.annuale, /27\/10\/2026/);
    for (const [dove, t2] of Object.entries(pezzi)) {
      if (dove === "chi" || dove === "rigaAnnuale") continue;
      assert.ok(t2.includes(atteso) || t2.includes("5 pesate"), dove + ": " + t2);
    }
    assert.match(pezzi.rigaAnnuale, /2026/);
    assert.match(testo(w, "#mp-kpi"), /67,7 kg/);
    assert.match(testo(w, "#ov-leg"), /27\/10/);
    assert.equal(pezzi.chi, "altezza e età non registrate");
    assert.deepEqual(rumori, []);
  } finally { w.close(); }
});

test("147.6 col vuoto tutte dicono nessuna pesata registrata", () => {
  const { w } = pagina();
  try {
    const vuoto = P.leggiPeso({ pesate: [] });
    w.BDPESO_PITTA(vuoto);
    for (const sel of ["[data-peso-p]", "#mp-badge", "#mp-kpi", "#ma-kpi", "#ma-year", "#ov-pesot", "#ov-spark"]) {
      const t2 = testo(w, sel);
      assert.ok(/nessuna pesata registrata/i.test(t2), sel + ": " + t2);
      assert.doesNotMatch(t2, /\b0 pesate\b/i, sel + ": " + t2);
    }
    assert.match(testo(w, "#ma-year"), /nessun anno/i);
  } finally { w.close(); }
});

test("147.7 con la lettura negata dicono non ho potuto leggere", () => {
  const { w } = pagina();
  try {
    w.BDPESO_PITTA(P.leggiPeso({ errore: "permission-denied" }));
    for (const sel of ["[data-peso-p]", "#mp-badge", "#mp-kpi", "#ma-kpi", "#ov-pesot"]) {
      const t2 = testo(w, sel);
      assert.match(t2, /non ho potuto leggere/i, sel + ": " + t2);
      assert.doesNotMatch(t2, /\b0 pesate\b|\b0\b/, sel + ": " + t2);
    }
  } finally { w.close(); }
});

test("147.8 senza profilo Reset/Bulk/Cut non mostra cifre e nomina i campi", () => {
  const { w } = pagina();
  try {
    assert.equal(testo(w, "#tb-bmr").trim(), "—");
    assert.equal(testo(w, "#tb-tdee").trim(), "—");
    assert.equal(testo(w, "#tb-target").trim(), "—");
    const dati = testo(w, "#tb-dati");
    assert.match(dati, /Mancano/);
    assert.match(dati, /altezza/);
    assert.match(dati, /età/);
    assert.match(dati, /5 pesate, l'ultima del 27\/10\/2026/);
    assert.equal(testo(w, "#tb-fasi"), "");
  } finally { w.close(); }
});

test("147.9 il desktop non tiene piu' la sua copia delle pesate", () => {
  assert.equal(sorgente.includes('"2026-03-13"'), false, "la data della prima pesata e' ancora nel desktop");
  assert.equal(sorgente.includes("var CAST"), false, "e' rimasta la copia locale (CAST)");
  assert.equal(sorgente.includes("178 cm · 31 anni"), false, "e' rimasto il ripiego del profilo");
  assert.match(sorgente, /<script src="\.\.\/comune\/peso-b\.js"><\/script>/);
  assert.match(sorgente, /window\.BDPESO_PITTA = pitta/);
  assert.match(modulo, /scheda coach \(importata\)/);
});
