/* tests/77-catalogo-selettore.test.mjs — catalogo e selettore del Database
 * esercizi (passo 35, sola lettura).
 *
 * Il catalogo e' la copia VERBATIM dei 179 esercizi del v31 (array CAT di
 * pc/index.html, r.5860: n = nome, g = distretto, nessun identificativo).
 * Il selettore e' il modal pg-lib del v31 rifatto in B: cerca per nome o
 * distretto, clic per scegliere, Esc per chiudere; la scelta torna a chi
 * ascolta e NIENTE si scrive (ne Firestore, ne storage).
 *
 *  77.1 il catalogo e' quello del v31: 179 voci, nome e distretto pieni,
 *       zero duplicati, stessa sequenza del file di origine;
 *  77.2 la ricerca come nel v31: nome o distretto, senza maiuscole,
 *       vuota = tutto l'elenco;
 *  77.3 il selettore apre con i 179, filtra, e alla scelta RESTITUISCE
 *       {n, g} a chi ascolta e chiude;
 *  77.4 Esc chiude senza scegliere; la x pure; alla riapertura la ricerca
 *       riparte pulita; nessuna scrittura su localStorage;
 *  77.5 in Programma il pulsante Database esercizi e' vivo e apre il
 *       selettore; Libreria Coach resta spenta.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM } from "jsdom";

import { CATALOGO_ESERCIZI_B, cercaNelCatalogoB, conteggioCatalogoB } from "../comune/catalogo-esercizi-b.js";
import { creaSelettoreEserciziB } from "../comune/selettore-esercizi-b.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");

function documento() {
  return new JSDOM("<!doctype html><html><head></head><body></body></html>", { url: "http://localhost/" }).window.document;
}

test("77.1 il catalogo e' quello del v31: 179 esercizi, nome e distretto sempre pieni, nessun duplicato", () => {
  assert.equal(conteggioCatalogoB(), 179);
  assert.equal(CATALOGO_ESERCIZI_B.length, 179);
  const visti = Object.create(null);
  let doppioni = 0;
  CATALOGO_ESERCIZI_B.forEach((v) => {
    assert.equal(typeof v.n, "string", "il nome deve essere testo");
    assert.ok(v.n.length > 0, "nome vuoto nel catalogo");
    assert.equal(typeof v.g, "string", "il distretto deve essere testo");
    assert.ok(v.g.length > 0, "distretto vuoto nel catalogo");
    if (visti[v.n]) doppioni += 1;
    visti[v.n] = true;
  });
  assert.equal(doppioni, 0, "nomi duplicati nel catalogo");
  /* stessa sequenza del file di origine: estratto dal v31, non riscritto */
  const sorg = readFileSync(join(radice, "pc", "index.html"), "utf8");
  const inizio = sorg.indexOf("var CAT = ");
  assert.ok(inizio > 0, "l'array CAT del v31 non si trova piu' dov'era");
  const origine = JSON.parse(sorg.slice(sorg.indexOf("[", inizio), sorg.indexOf("];", inizio) + 1));
  assert.equal(origine.length, 179);
  assert.deepEqual(CATALOGO_ESERCIZI_B, origine);
});

test("77.2 la ricerca come nel v31: nome o distretto, senza maiuscole, vuota = tutto", () => {
  assert.equal(cercaNelCatalogoB("").length, 179);
  assert.equal(cercaNelCatalogoB("   ").length, 179);
  assert.equal(cercaNelCatalogoB(null).length, 179);
  const curl = cercaNelCatalogoB("curl");
  assert.ok(curl.length > 0 && curl.length < 179, "la cerca per nome deve restringere il campo");
  curl.forEach((v) => assert.ok(v.n.toLowerCase().indexOf("curl") > -1));
  const distretto = cercaNelCatalogoB("bicipiti");
  assert.ok(distretto.length > 0, "la cerca per distretto deve trovare");
  distretto.forEach((v) => {
    assert.ok(v.g.toLowerCase().indexOf("bicipiti") > -1 || v.n.toLowerCase().indexOf("bicipiti") > -1);
  });
  const esatto = cercaNelCatalogoB("Curl manubri");
  assert.equal(esatto.length, 1);
  assert.equal(esatto[0].n, "Curl manubri");
  assert.equal(cercaNelCatalogoB("zzz-inesistente").length, 0);
});

test("77.3 il selettore apre con i 179, filtra, e alla scelta restituisce {n, g} e chiude", () => {
  const d = documento();
  const prese = [];
  const s = creaSelettoreEserciziB(d, { allaScelta: (scelta) => prese.push(scelta) });
  assert.ok(s.velo.hidden, "il selettore nasce chiuso");
  s.apri();
  assert.ok(!s.velo.hidden, "apri() lo rende visibile");
  const card = d.querySelector(".bdsel-card");
  assert.ok(card, "il modal sta nel documento");
  assert.equal(card.getAttribute("aria-label"), "Database esercizi");
  let voci = s.velo.querySelectorAll(".bdsel-it");
  assert.equal(voci.length, 179);
  assert.ok(s.velo.querySelector(".bdsel-n").textContent.indexOf("179") > -1, "il contatore dice 179");
  /* la ricerca filtra come la 77.2 */
  const casella = s.velo.querySelector(".bdsel-q");
  casella.value = "curl";
  casella.dispatchEvent(new d.defaultView.Event("input", { bubbles: true }));
  voci = s.velo.querySelectorAll(".bdsel-it");
  assert.equal(voci.length, cercaNelCatalogoB("curl").length);
  /* il clic su una voce restituisce nome e distretto e chiude */
  voci[0].dispatchEvent(new d.defaultView.MouseEvent("click", { bubbles: true }));
  assert.equal(prese.length, 1, "la scelta deve arrivare a chi ascolta");
  assert.equal(prese[0].n, cercaNelCatalogoB("curl")[0].n);
  assert.equal(prese[0].g, cercaNelCatalogoB("curl")[0].g);
  assert.ok(s.velo.hidden, "dopo la scelta si chiude");
});

test("77.4 Esc chiude senza scegliere; la x pure; riapertura pulita; nessuna scrittura", () => {
  const d = documento();
  const prese = [];
  const s = creaSelettoreEserciziB(d, { allaScelta: (scelta) => prese.push(scelta) });
  s.apri();
  const casella = s.velo.querySelector(".bdsel-q");
  casella.value = "panca";
  casella.dispatchEvent(new d.defaultView.Event("input", { bubbles: true }));
  casella.dispatchEvent(new d.defaultView.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  assert.ok(s.velo.hidden, "Esc chiude");
  assert.equal(prese.length, 0, "Esc non sceglie");
  s.apri();
  assert.equal(s.velo.querySelectorAll(".bdsel-it").length, 179, "alla riapertura la ricerca riparte pulita");
  s.velo.querySelector(".bdsel-x").dispatchEvent(new d.defaultView.MouseEvent("click", { bubbles: true }));
  assert.ok(s.velo.hidden, "la x chiude");
  assert.equal(prese.length, 0);
  /* nessuna scrittura: niente script nel documento, storage intatto */
  assert.equal(d.querySelectorAll("script").length, 0);
  assert.equal(d.defaultView.localStorage.length, 0);
});

test("77.5 in Programma il pulsante Database esercizi e' vivo e apre il selettore; Libreria Coach resta spenta", () => {
  const sorg = readFileSync(join(radice, "comune", "vista-programma.js"), "utf8");
  assert.ok(sorg.indexOf('import { creaSelettoreEserciziB } from "./selettore-esercizi-b.js";') > -1, "manca l'import del selettore");
  assert.ok(!/pulsanteSpento\(doc, "pg-lib pg-lib-db"/.test(sorg), "il pulsante Database esercizi non e' piu' spento");
  assert.ok(/pulsanteVivo\(doc, "pg-lib pg-lib-db"/.test(sorg), "il pulsante Database esercizi deve essere vivo");
  assert.ok(/pulsanteSpento\(doc, "pg-lib pg-lib-c"/.test(sorg), "Libreria Coach deve restare spenta");
});
