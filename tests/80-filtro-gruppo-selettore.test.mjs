/* tests/80-filtro-gruppo-selettore.test.mjs — i filtri per gruppo muscolare
 * dentro il popup del Database esercizi (passo B.3, richiesta di Alice).
 *
 * Dentro il popup, sotto la ricerca, compare una fila di chip: «Tutti» in
 * testa, poi un chip per ogni gruppo muscolare VERE del catalogo, nello
 * stesso ordine in cui compaiono. Un gruppo attivo per volta: il click
 * mostra solo quel gruppo, si combina con la ricerca per nome e si azzera
 * alla riapertura. Sempre sola lettura: nessuna scrittura.
 *
 *  80.1 la fila dei chip: «Tutti» + i gruppi reali del catalogo, in ordine
 *       di comparsa, nessuno attivo all'apertura se non «Tutti»;
 *  80.2 il click su un chip mostra solo quel gruppo, il contatore si adegua
 *       e il filtro si combina con la ricerca per nome;
 *  80.3 riclick sullo stesso chip azzera, «Tutti» azzera, la riapertura
 *       riparte senza filtro; nessuna scrittura su localStorage.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

import { CATALOGO_ESERCIZI_B, cercaNelCatalogoB } from "../comune/catalogo-esercizi-b.js";
import { creaSelettoreEserciziB } from "../comune/selettore-esercizi-b.js";

function documento() {
  return new JSDOM("<!doctype html><html><head></head><body></body></html>", { url: "http://localhost/" }).window.document;
}

function click(d, el) {
  el.dispatchEvent(new d.defaultView.MouseEvent("click", { bubbles: true }));
}

/* I gruppi del catalogo, in ordine di prima comparsa: la stessa regola del
 * codice, qui la ribadiamo dalla fonte per non fidarci della memoria. */
const GRUPPI = [];
CATALOGO_ESERCIZI_B.forEach((v) => {
  if (GRUPPI.indexOf(v.g) === -1) GRUPPI.push(v.g);
});

test("80.1 la fila dei chip: Tutti + i gruppi reali del catalogo, in ordine di comparsa", () => {
  const d = documento();
  const s = creaSelettoreEserciziB(d, {});
  s.apri();
  const fila = s.velo.querySelector(".bdsel-filtri");
  assert.ok(fila, "la fila dei filtri deve esistere nel popup");
  const chips = Array.from(fila.querySelectorAll(".bdsel-fchip"));
  const etichette = chips.map((c) => c.textContent);
  assert.deepEqual(etichette, ["Tutti"].concat(GRUPPI), "chip = Tutti + i gruppi del catalogo, in ordine");
  assert.equal(chips[0].classList.contains("on"), true, "all'apertura e' attivo solo Tutti");
  chips.slice(1).forEach((c) => assert.equal(c.classList.contains("on"), false, "nessun gruppo acceso all'apertura"));
  /* nessun gruppo inventato: ogni chip esiste davvero nel catalogo */
  chips.slice(1).forEach((c) => {
    assert.ok(CATALOGO_ESERCIZI_B.some((v) => v.g === c.textContent), "chip senza gruppo nel catalogo: " + c.textContent);
  });
});

test("80.2 il chip filtra il gruppo, il contatore si adegua, si combina con la ricerca", () => {
  const d = documento();
  const prese = [];
  const s = creaSelettoreEserciziB(d, { allaScelta: (scelta) => prese.push(scelta) });
  s.apri();
  const fila = s.velo.querySelector(".bdsel-filtri");
  const gruppo = GRUPPI[0];
  const attesi = CATALOGO_ESERCIZI_B.filter((v) => v.g === gruppo);
  click(d, fila.querySelector('.bdsel-fchip[data-g="' + gruppo + '"]'));
  const voci = Array.from(s.velo.querySelectorAll(".bdsel-it"));
  assert.equal(voci.length, attesi.length, "la griglia mostra solo il gruppo scelto");
  voci.forEach((v) => assert.equal(v.getAttribute("data-g"), gruppo, "tutte le voci sono del gruppo"));
  assert.ok(s.velo.querySelector(".bdsel-n").textContent.indexOf(String(attesi.length)) > -1, "il contatore segue il filtro");
  /* la ricerca dentro il gruppo: intersezione, non bypass */
  const casella = s.velo.querySelector(".bdsel-q");
  casella.value = "curl";
  casella.dispatchEvent(new d.defaultView.Event("input", { bubbles: true }));
  const combinate = cercaNelCatalogoB("curl").filter((v) => v.g === gruppo);
  const ora = Array.from(s.velo.querySelectorAll(".bdsel-it"));
  assert.equal(ora.length, combinate.length, "ricerca e gruppo si combinano");
  ora.forEach((v) => assert.equal(v.getAttribute("data-g"), gruppo));
  /* il click su una voce filtrata restituisce comunque {n, g} a chi ascolta */
  if (ora.length) {
    click(d, ora[0]);
    assert.equal(prese.length, 1, "la scelta filtrata arriva a chi ascolta");
    assert.equal(prese[0].g, gruppo);
  }
});

test("80.3 riclick azzera, Tutti azzera, la riapertura riparte pulita; nessuna scrittura", () => {
  const d = documento();
  const s = creaSelettoreEserciziB(d, {});
  s.apri();
  const fila = s.velo.querySelector(".bdsel-filtri");
  const gruppo = GRUPPI[0];
  const chip = fila.querySelector('.bdsel-fchip[data-g="' + gruppo + '"]');
  click(d, chip);
  assert.ok(s.velo.querySelectorAll(".bdsel-it").length < 179, "il filtro stringe");
  click(d, chip); /* riclick sullo stesso chip = via il filtro */
  assert.equal(s.velo.querySelectorAll(".bdsel-it").length, 179, "il riclick riporta tutto");
  assert.equal(chip.classList.contains("on"), false, "il chip spento dopo il riclick");
  /* due gruppi di fila: il secondo sostituisce il primo, poi Tutti azzera */
  const secondo = GRUPPI[1];
  click(d, fila.querySelector('.bdsel-fchip[data-g="' + gruppo + '"]'));
  click(d, fila.querySelector('.bdsel-fchip[data-g="' + secondo + '"]'));
  const attesi2 = CATALOGO_ESERCIZI_B.filter((v) => v.g === secondo).length;
  assert.equal(Array.from(s.velo.querySelectorAll(".bdsel-it")).length, attesi2, "un gruppo per volta: l'ultimo vince");
  click(d, fila.querySelector('.bdsel-fchip[data-g=""]'));
  assert.equal(s.velo.querySelectorAll(".bdsel-it").length, 179, "Tutti azzera");
  /* la riapertura riparte senza filtro e senza ricerca */
  s.chiudi();
  s.apri();
  assert.equal(s.velo.querySelectorAll(".bdsel-it").length, 179, "alla riapertura tutto l'elenco");
  assert.equal(s.velo.querySelector(".bdsel-q").value, "", "la ricerca riparte pulita");
  /* nessuna scrittura: storage intatto, zero script */
  assert.equal(d.defaultView.localStorage.length, 0);
  assert.equal(d.querySelectorAll("script").length, 0);
});
