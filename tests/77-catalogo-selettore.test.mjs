/* tests/77-catalogo-selettore.test.mjs — catalogo e selettore del Database
 * esercizi (passo 35, sola lettura).
 *
 * Il catalogo e' la copia dei 176 esercizi veri (i 179 del v31, meno i dieci
 * doppioni da codifica uniti al passo 23, piu' le 7 aggiunte del passo 20):
 * n = nome, g = distretto, nessun identificativo.
 * Il selettore e' il modal pg-lib del v31 rifatto in B: cerca per nome o
 * distretto, clic per scegliere, Esc per chiudere; la scelta torna a chi
 * ascolta e NIENTE si scrive (ne Firestore, ne storage).
 *
 *  77.1 il catalogo e' quello del v31 (doppioni uniti) piu' le 7 aggiunte del
 *       passo 20: zero duplicati, i nomi rovinati restano come alias;
 *  77.2 la ricerca come nel v31: nome o distretto, senza maiuscole,
 *       vuota = tutto l'elenco;
 *  77.3 il selettore apre con i 176, filtra, e alla scelta RESTITUISCE
 *       {n, g} a chi ascolta e chiude;
 *  77.4 Esc chiude senza scegliere; la x pure; alla riapertura la ricerca
 *       riparte pulita; nessuna scrittura su localStorage;
 *  77.5 (aggiornata al passo B.2) il pulsante Database esercizi della testa
 *       NON esiste piu' (tolto da Alice: la porta e' «+ Riga»); Libreria Coach spenta non c e piu.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM } from "jsdom";

import { CATALOGO_ESERCIZI_B, cercaNelCatalogoB, conteggioCatalogoB } from "../comune/catalogo-esercizi-b.js";
import { creaSelettoreEserciziB } from "../comune/selettore-esercizi-b.js";
import { ALIAS_NOMI } from "../comune/riconoscimento-esercizio.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");

function documento() {
  return new JSDOM("<!doctype html><html><head></head><body></body></html>", { url: "http://localhost/" }).window.document;
}

test("77.1 il catalogo e' quello del v31 con i doppioni uniti: 176 esercizi, nome e distretto sempre pieni", () => {
  assert.equal(conteggioCatalogoB(), 176);
  assert.equal(CATALOGO_ESERCIZI_B.length, 176);
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
  /* Le 179 voci del v31 restano VERBATIM: nome e distretto come sono nel file
   * di origine, non riscritti. In piu' ci sono solo le aggiunte dichiarate qui
   * sotto (passo 20): gli esercizi che Alice ha nelle schede e che il catalogo
   * non aveva. Cosi' una voce che sparisce o cambia nome si vede subito. */
  const sorg = readFileSync(join(radice, "pc", "index.html"), "utf8");
  const inizio = sorg.indexOf("var CAT = ");
  assert.ok(inizio > 0, "l'array CAT del v31 non si trova piu' dov'era");
  const origine = JSON.parse(sorg.slice(sorg.indexOf("[", inizio), sorg.indexOf("];", inizio) + 1));
  assert.equal(origine.length, 179, "l'array CAT del v31 ha 179 voci");
  const perNome = new Map(CATALOGO_ESERCIZI_B.map((v) => [v.n, v]));
  origine.forEach((v) => {
    const qui = perNome.get(v.n) || perNome.get(ALIAS_NOMI[v.n] || "");
    assert.ok(qui, "la voce del v31 manca dal catalogo: " + v.n);
    assert.equal(qui.g, v.g, "il distretto della voce del v31 e' cambiato: " + v.n);
  });
  /* I dieci nomi rovinati dalla codifica restano come ALIAS: una scheda che li
   * porta trova lo stesso esercizio. */
  const rovinati = origine.filter((v) => v.n.indexOf("Â°") !== -1).map((v) => v.n);
  assert.equal(rovinati.length, 10, "i doppioni da codifica sono dieci");
  rovinati.forEach((n) => {
    assert.equal(perNome.has(n), false, "il nome rovinato non deve restare nel catalogo: " + n);
    assert.ok(perNome.has(ALIAS_NOMI[n]), "il nome rovinato deve puntare al nome giusto: " + n);
  });
  const delV31 = new Set(origine.map((v) => v.n));
  const aggiunte = CATALOGO_ESERCIZI_B.filter((v) => !delV31.has(v.n)).map((v) => v.n + " · " + v.g);
  assert.deepEqual(aggiunte, [
    "Affondo front squat machine · Quadricipiti",
    "Curl bilanciere · Bicipiti",
    "Lat machine presa neutra · Dorsali",
    "Pendulum focus glutei · Glutei",
    "Pulley basso · Centro schiena",
    "Pulley mono · Centro schiena",
    "Slanci laterali cavo basso · Glutei"
  ], "le aggiunte al catalogo sono quelle dichiarate, con il loro distretto");
});

test("77.2 la ricerca come nel v31: nome o distretto, senza maiuscole, vuota = tutto", () => {
  assert.equal(cercaNelCatalogoB("").length, 176);
  assert.equal(cercaNelCatalogoB("   ").length, 176);
  assert.equal(cercaNelCatalogoB(null).length, 176);
  const curl = cercaNelCatalogoB("curl");
  assert.ok(curl.length > 0 && curl.length < 176, "la cerca per nome deve restringere il campo");
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

test("77.3 il selettore apre con i 176, filtra, e alla scelta restituisce {n, g} e chiude", () => {
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
  assert.equal(voci.length, 176);
  assert.ok(s.velo.querySelector(".bdsel-n").textContent.indexOf("176") > -1, "il contatore dice 176");
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
  assert.equal(s.velo.querySelectorAll(".bdsel-it").length, 176, "alla riapertura la ricerca riparte pulita");
  s.velo.querySelector(".bdsel-x").dispatchEvent(new d.defaultView.MouseEvent("click", { bubbles: true }));
  assert.ok(s.velo.hidden, "la x chiude");
  assert.equal(prese.length, 0);
  /* nessuna scrittura: niente script nel documento, storage intatto */
  assert.equal(d.querySelectorAll("script").length, 0);
  assert.equal(d.defaultView.localStorage.length, 0);
});

test("77.5 il pulsante Database esercizi della testa non esiste piu'; Libreria Coach spenta non c e piu", () => {
  const sorg = readFileSync(join(radice, "comune", "vista-programma.js"), "utf8");
  assert.ok(!/pg-lib pg-lib-db/.test(sorg), "il pulsante Database esercizi in testata e' stato tolto (passo B.2): la porta e' «+ Riga», prova 79");
  assert.ok(!/pulsanteSpento\(doc, "pg-lib pg-lib-c"/.test(sorg), "Libreria Coach spenta tolta al PASSO 1");
});
