/* Fase 0 · guardia: tema doppio su html E body, gradienti dei due temi, nessun
 * bianco di fondo, Diva Bot presente. */

import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { applicaTema, alternaTema, temaSalvato } from "../comune/tema.js";
import { frasiPerDati, montaDivaBot } from "../comune/diva-bot.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");

function storageFinto() {
  const contenuti = {};
  return { getItem: (k) => (k in contenuti ? contenuti[k] : null), setItem: (k, v) => { contenuti[k] = String(v); } };
}

test("data-theme va su <html> e su <body>, dark di default, alternabile", () => {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
  const doc = dom.window.document;
  const storage = storageFinto();
  assert.equal(applicaTema(doc, "light", storage), "light");
  assert.equal(doc.documentElement.getAttribute("data-theme"), "light");
  assert.equal(doc.body.getAttribute("data-theme"), "light");
  assert.equal(applicaTema(doc, "inventato", storage), "dark", "tema sconosciuto ricade sul dark");
  assert.equal(alternaTema(doc, storage), "light");
  assert.equal(doc.documentElement.getAttribute("data-theme"), "light");
  assert.equal(doc.body.getAttribute("data-theme"), "light");
  assert.equal(temaSalvato(storage), "light");
  assert.equal(temaSalvato(storageFinto()), "dark", "senza preferenza salvata: dark");
});

test("i token dei due temi rispettano le regole fisse (gradienti, fondi opachi, mai bianco)", () => {
  for (const ingresso of ["desktop/index.html", "mobile/index.html"]) {
    const html = readFileSync(join(radice, ingresso), "utf8");
    assert.ok(html.includes('html[data-theme="dark"]{background:#090918'), ingresso + ": html scuro non conforme");
    assert.ok(html.includes('html[data-theme="light"]{background:#fff7fb'), ingresso + ": html chiaro non conforme");
    assert.ok(html.includes("--gradiente:linear-gradient(160deg,#050612 0%,#0b0b20 55%,#080719 100%)"), ingresso + ": gradiente scuro mancante");
    assert.ok(html.includes("--gradiente:linear-gradient(160deg,#a985d4 0%,#cfafe8 38%,#e7c9e8 72%,#b897db 100%)"), ingresso + ": gradiente lavanda mancante");
    assert.ok(!/#fff\b|background:\s*#ffffff|background-color:\s*#fff/i.test(html), ingresso + ": bianco di fondo trovato");
    assert.ok(html.includes("viewport-fit=cover"), ingresso + ": viewport-fit=cover mancante");
    const regolaBody = (html.match(/\}body\s*\{[^}]*\}/) || html.match(/body\s*\{[^}]*\}/) || [""])[0];
    assert.ok(regolaBody.includes("body") && !regolaBody.includes("env(safe-area-inset"), ingresso + ": la safe area va solo sugli elementi di interfaccia, non sul body");
  }
});

test("la robottina parla di lettura, non di scrittura", () => {
  const dom = new JSDOM("<!DOCTYPE html><html><body><div id='diva'></div></body></html>");
  const contenitore = dom.window.document.querySelector("#diva");
  const frasi = frasiPerDati({ numeroSedute: 4, pesoPresente: true, checkinPresente: true });
  const bot = montaDivaBot(contenitore, frasi);
  const prima = bot.bolla.textContent;
  assert.ok(prima.length > 0, "la bolla è vuota");
  assert.ok(frasi.some((f) => f.includes("non tocco nulla")), "manca il verdetto di sola lettura");
  assert.ok(frasi.some((f) => f.includes("non ho scritto un byte")), "manca il verdetto di nessuna scrittura");
  bot.pallino.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  assert.ok(bot.bolla.textContent.length > 0, "la bolla resta vuota dopo il click");
});
