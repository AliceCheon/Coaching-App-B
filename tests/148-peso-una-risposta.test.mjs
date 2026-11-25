/* Guardia 148 (passo 17b): una sola risposta sul peso in ogni pagina, e le cifre
 * di Reset/Bulk/Cut solo con un profilo confermato.
 *
 *  148.1 Dashboard «Stato di sintesi»: la tessera Peso dice 67,7 kg e le 5 pesate
 *  148.2 tessera Peso: vuoto e lettura negata non mostrano numeri
 *  148.3 la card «Andamento peso» non promette più «60 giorni» e cambia icona
 *  148.4 Overview: il KPI del peso si ridipinge (vuoto e errore non restano a 67,7)
 *  148.5 Monitor annuale: errore e vuoto dicono cose diverse, e «1 pesata letta»
 *  148.6 Reset/Bulk/Cut: profilo pieno ma non confermato = nessuna cifra
 *  148.7 la legenda del peso non promette un tratteggio che non c'è
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

function pagina(profiloFinto) {
  let html = sorgente
    .replace('<script src="../comune/peso-b.js"></script>', "<script>" + modulo + "</script>")
    .replace(/<script[^>]*\ssrc="[^"]*"[^>]*><\/script>/g, "");
  if (profiloFinto) {
    html = html.replace("<script>" + modulo + "</script>",
      "<script>" + modulo + "\nwindow.BDPesoB.leggiProfilo = function(){ return " +
      JSON.stringify(profiloFinto) + "; };</script>");
  }
  const rumori = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { const m = String((e && e.message) || ""); if (!/Not implemented/.test(m)) rumori.push(m); });
  const dom = new JSDOM(html, { runScripts: "dangerously", url: "http://localhost/desktop/index.html", virtualConsole: vc });
  return { w: dom.window, rumori };
}
const testo = (w, sel) => (w.document.querySelector(sel) || {}).textContent || "";
const UNA = [{ data: "2026-10-27", kg: 67.7, fonte: "scheda coach (importata)" }];

test("148.1 la tessera Peso della Dashboard dice lo stesso numero delle altre pagine", () => {
  const { w, rumori } = pagina();
  try {
    assert.equal(testo(w, "#ck-peso-v").trim(), "67,7");
    const nota = testo(w, "#ck-peso-n");
    assert.match(nota, /5 pesate/);
    assert.match(nota, /27\/10/);
    assert.equal(sorgente.includes("non c'è nel backup"), false, "la tessera Peso è ancora ferma al mockup");
    assert.equal(testo(w, "#ck-peso-ico").trim(), "✓");
    assert.deepEqual(rumori, []);
  } finally { w.close(); }
});

test("148.2 tessera Peso: vuoto e lettura negata non mostrano numeri", () => {
  const { w } = pagina();
  try {
    w.BDPESO_PITTA(P.leggiPeso({ pesate: [] }));
    assert.equal(testo(w, "#ck-peso-v").trim(), "—");
    assert.match(testo(w, "#ck-peso-n"), /letta e vuota/);
    assert.equal(testo(w, "#ck-peso-ico").trim(), "!");
    w.BDPESO_PITTA(P.leggiPeso({ errore: "permission-denied" }));
    assert.equal(testo(w, "#ck-peso-v").trim(), "—");
    assert.match(testo(w, "#ck-peso-n"), /non ho potuto leggere/);
    assert.doesNotMatch(testo(w, "#ck-peso-n"), /\b67,7\b/);
  } finally { w.close(); }
});

test("148.3 la card «Andamento peso» non promette più 60 giorni", () => {
  assert.equal(sorgente.includes("· 60 giorni"), false, "la card dice ancora «60 giorni» senza contare la finestra");
  assert.match(sorgente, /Andamento peso <span class="ck-sub">· tutte le pesate<\/span>/);
  const { w } = pagina();
  try {
    w.BDPESO_PITTA(P.leggiPeso({ pesate: [] }));
    assert.equal(testo(w, "#ck-peso-ico").trim(), "!");
  } finally { w.close(); }
});

test("148.4 il KPI del peso in Overview si ridipinge con il resto", () => {
  const { w } = pagina();
  try {
    assert.match(testo(w, "#ov-k-peso .kv"), /67,7/);
    w.BDPESO_PITTA(P.leggiPeso({ pesate: [] }));
    assert.equal(testo(w, "#ov-k-peso .kv").trim(), "—");
    assert.match(testo(w, "#ov-k-peso .kf"), /nessuna pesata registrata/);
    assert.ok(w.document.querySelector("#ov-k-peso").classList.contains("nd"));
    w.BDPESO_PITTA(P.leggiPeso({ errore: "permission-denied" }));
    assert.equal(testo(w, "#ov-k-peso .kv").trim(), "—");
    assert.match(testo(w, "#ov-k-peso .kf"), /non ho potuto leggere/);
    assert.doesNotMatch(testo(w, "#ov-k-peso .kv"), /67,7/);
  } finally { w.close(); }
});

test("148.5 Monitor annuale: errore, vuoto e una pesata sola dicono cose diverse", () => {
  const { w } = pagina();
  try {
    w.BDPESO_PITTA(P.leggiPeso({ errore: "permission-denied" }));
    assert.match(testo(w, "#ma-year"), /non ho potuto leggere/);
    assert.doesNotMatch(testo(w, "#ma-year"), /nessuna pesata registrata/);
    w.BDPESO_PITTA(P.leggiPeso({ pesate: [] }));
    assert.match(testo(w, "#ma-year"), /nessuna pesata registrata/);
    w.BDPESO_PITTA(P.leggiPeso({ pesate: UNA }));
    assert.match(testo(w, "#ma-kpi"), /1 pesata letta/);
    assert.doesNotMatch(testo(w, "#ma-kpi"), /1 pesate lette/);
  } finally { w.close(); }
});

test("148.6 Reset/Bulk/Cut: profilo pieno ma non confermato non mostra cifre", () => {
  const { w } = pagina({ confermato: false, altezza: 165, eta: 30, sesso: "d", mancanti: [] });
  try {
    assert.equal(testo(w, "#tb-bmr").trim(), "—");
    assert.equal(testo(w, "#tb-tdee").trim(), "—");
    assert.equal(testo(w, "#tb-target").trim(), "—");
    assert.equal(testo(w, "#tb-fasi").trim(), "");
    assert.match(testo(w, "#tb-dati"), /Mancano/);
    assert.match(testo(w, "#tb-dati"), /altezza/);
    assert.match(testo(w, "#tb-dati"), /non si mostrano/);
  } finally { w.close(); }
});

test("148.7 la legenda del peso non promette un tratteggio che non c'è", () => {
  assert.equal(sorgente.includes("tratteggio = tendenza"), false);
  const { w } = pagina();
  try {
    const leg = testo(w, ".mp-legend");
    assert.match(leg, /linea del peso/);
    assert.doesNotMatch(leg, /tratteggio/);
  } finally { w.close(); }
});
