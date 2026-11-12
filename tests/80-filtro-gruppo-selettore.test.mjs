/* tests/80-filtro-gruppo-selettore.test.mjs — il filtro per gruppo muscolare
 * dentro il popup del Database esercizi (passi B.3 e B.4, richiesta di Alice).
 *
 * Dentro il popup, sotto la ricerca, c'e' un MENÙ A TENDINA (passo B.4: era
 * una fila di chip, Alice la voleva a tendina): «Tutti» in testa, poi un
 * gruppo per ogni gruppo muscolare VERO del catalogo, nello stesso ordine in
 * cui compaiono. La scelta mostra solo quel gruppo, si combina con la
 * ricerca per nome e si azzera alla riapertura. Sempre sola lettura:
 * nessuna scrittura.
 *
 *  80.1 il menù: «Tutti» + i gruppi reali del catalogo, in ordine di
 *       comparsa, «Tutti» selezionato all'apertura;
 *  80.2 la scelta di un gruppo mostra solo quel gruppo, il contatore si
 *       adegua e il filtro si combina con la ricerca per nome;
 *  80.3 tornare su «Tutti» azzera, la riapertura riparte pulita; nessuna
 *       scrittura su localStorage.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

import { CATALOGO_ESERCIZI_B, cercaNelCatalogoB } from "../comune/catalogo-esercizi-b.js";
import { creaSelettoreEserciziB } from "../comune/selettore-esercizi-b.js";

function documento() {
  return new JSDOM("<!doctype html><html><head></head><body></body></html>", { url: "http://localhost/" }).window.document;
}

/* I gruppi del catalogo, in ordine di prima comparsa: la stessa regola del
 * codice, qui la ribadiamo dalla fonte per non fidarci della memoria. */
const GRUPPI = [];
CATALOGO_ESERCIZI_B.forEach((v) => {
  if (GRUPPI.indexOf(v.g) === -1) GRUPPI.push(v.g);
});

test("80.1 il menu a tendina: Tutti + i gruppi reali del catalogo, in ordine di comparsa", () => {
  const d = documento();
  const s = creaSelettoreEserciziB(d, {});
  s.apri();
  const menu = s.velo.querySelector(".bdsel-sel");
  assert.ok(menu, "il menu a tendina deve esistere nel popup");
  assert.equal(menu.tagName, "SELECT", "il filtro e' un menù a tendina, non una fila di chip");
  const voci = Array.from(menu.querySelectorAll("option"));
  assert.deepEqual(voci.map((o) => o.textContent), ["Tutti"].concat(GRUPPI), "voci = Tutti + i gruppi del catalogo, in ordine");
  assert.equal(voci[0].value, "", "«Tutti» vale tutto: valore vuoto");
  assert.equal(menu.value, "", "all'apertura e' selezionato Tutti");
  /* nessun gruppo inventato: ogni voce esiste davvero nel catalogo */
  voci.slice(1).forEach((o) => {
    assert.ok(CATALOGO_ESERCIZI_B.some((v) => v.g === o.textContent), "voce senza gruppo nel catalogo: " + o.textContent);
  });
});

test("80.2 la scelta del gruppo filtra la griglia, il contatore si adegua, si combina con la ricerca", () => {
  const d = documento();
  const prese = [];
  const s = creaSelettoreEserciziB(d, { allaScelta: (scelta) => prese.push(scelta) });
  s.apri();
  const menu = s.velo.querySelector(".bdsel-sel");
  const gruppo = GRUPPI[0];
  const attesi = CATALOGO_ESERCIZI_B.filter((v) => v.g === gruppo);
  menu.value = gruppo;
  menu.dispatchEvent(new d.defaultView.Event("change", { bubbles: true }));
  let voci = Array.from(s.velo.querySelectorAll(".bdsel-it"));
  assert.equal(voci.length, attesi.length, "la griglia mostra solo il gruppo scelto");
  voci.forEach((v) => assert.equal(v.getAttribute("data-g"), gruppo, "tutte le voci sono del gruppo"));
  assert.ok(s.velo.querySelector(".bdsel-n").textContent.indexOf(String(attesi.length)) > -1, "il contatore segue il filtro");
  /* la ricerca dentro il gruppo: intersezione, non bypass */
  const casella = s.velo.querySelector(".bdsel-q");
  casella.value = "curl";
  casella.dispatchEvent(new d.defaultView.Event("input", { bubbles: true }));
  const combinate = cercaNelCatalogoB("curl").filter((v) => v.g === gruppo);
  voci = Array.from(s.velo.querySelectorAll(".bdsel-it"));
  assert.equal(voci.length, combinate.length, "ricerca e gruppo si combinano");
  voci.forEach((v) => assert.equal(v.getAttribute("data-g"), gruppo));
  /* il clic su una voce filtrata restituisce comunque {n, g} a chi ascolta */
  if (voci.length) {
    voci[0].dispatchEvent(new d.defaultView.MouseEvent("click", { bubbles: true }));
    assert.equal(prese.length, 1, "la scelta filtrata arriva a chi ascolta");
    assert.equal(prese[0].g, gruppo);
  }
});

test("80.3 tornare su Tutti azzera, la riapertura riparte pulita; nessuna scrittura", () => {
  const d = documento();
  const s = creaSelettoreEserciziB(d, {});
  s.apri();
  const menu = s.velo.querySelector(".bdsel-sel");
  const gruppo = GRUPPI[0];
  menu.value = gruppo;
  menu.dispatchEvent(new d.defaultView.Event("change", { bubbles: true }));
  assert.ok(s.velo.querySelectorAll(".bdsel-it").length < 179, "il filtro stringe");
  menu.value = "";
  menu.dispatchEvent(new d.defaultView.Event("change", { bubbles: true }));
  assert.equal(s.velo.querySelectorAll(".bdsel-it").length, 179, "«Tutti» riporta tutto");
  /* un gruppo di fila: il secondo sostituisce il primo (un gruppo per volta) */
  const secondo = GRUPPI[1];
  menu.value = gruppo;
  menu.dispatchEvent(new d.defaultView.Event("change", { bubbles: true }));
  menu.value = secondo;
  menu.dispatchEvent(new d.defaultView.Event("change", { bubbles: true }));
  const attesi2 = CATALOGO_ESERCIZI_B.filter((v) => v.g === secondo).length;
  assert.equal(Array.from(s.velo.querySelectorAll(".bdsel-it")).length, attesi2, "un gruppo per volta: l'ultimo vince");
  /* la riapertura riparte senza filtro e senza ricerca */
  s.chiudi();
  s.apri();
  assert.equal(menu.value, "", "il menù riparte su Tutti");
  assert.equal(s.velo.querySelectorAll(".bdsel-it").length, 179, "alla riapertura tutto l'elenco");
  assert.equal(s.velo.querySelector(".bdsel-q").value, "", "la ricerca riparte pulita");
  /* nessuna scrittura: storage intatto, zero script */
  assert.equal(d.defaultView.localStorage.length, 0);
  assert.equal(d.querySelectorAll("script").length, 0);
});
