/* Prove della 2.7: i tre gruppi del menu si aprono e si chiudono come nel v31,
 * e lo stato aperto/chiuso resta nel browser. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { JSDOM } from "jsdom";
import { gruppiApribili } from "../comune/gruppi-menu.js";

const html = fs.readFileSync(new URL("../desktop/index.html", import.meta.url), "utf8");

function pagina() {
  const dom = new JSDOM(html, { url: "https://example.test/desktop/" });
  const doc = dom.window.document;
  const memoria = dom.window.localStorage;
  memoria.clear();
  gruppiApribili(doc, memoria);
  return { dom, doc, memoria };
}

test("40.01 i tre gruppi hanno la freccina e partono aperti", () => {
  const { doc } = pagina();
  const gruppi = Array.from(doc.querySelectorAll(".gruppo.apribile[data-gruppo]"));
  assert.deepEqual(gruppi.map((g) => g.getAttribute("data-gruppo")), ["alimentazione", "programmi", "studio"]);
  for (const g of gruppi) {
    assert.equal(g.classList.contains("chiuso"), false);
    assert.equal(g.querySelector(".etichetta").getAttribute("aria-expanded"), "true");
    assert.ok(g.querySelector(".chev"), "manca la freccina");
  }
});

test("40.02 clic sull'intestazione: il gruppo si chiude davvero", () => {
  const { doc } = pagina();
  const gruppo = doc.querySelector('[data-gruppo="programmi"]');
  gruppo.querySelector(".etichetta").click();
  assert.equal(gruppo.classList.contains("chiuso"), true);
  assert.equal(gruppo.querySelector(".etichetta").getAttribute("aria-expanded"), "false");
  gruppo.querySelector(".etichetta").click();
  assert.equal(gruppo.classList.contains("chiuso"), false);
  assert.equal(gruppo.querySelector(".etichetta").getAttribute("aria-expanded"), "true");
});

test("40.03 lo stato resta nel browser, per gruppo", () => {
  const { doc, memoria } = pagina();
  doc.querySelector('[data-gruppo="alimentazione"] .etichetta').click();
  doc.querySelector('[data-gruppo="studio"] .etichetta').click();
  assert.equal(memoria.getItem("bd-b.v1.gruppi-chiusi"), JSON.stringify(["alimentazione", "studio"]));
  // una pagina nuova, con la stessa memoria, riparte da lì
  const dom2 = new JSDOM(html, { url: "https://example.test/desktop/" });
  dom2.window.localStorage.setItem("bd-b.v1.gruppi-chiusi", memoria.getItem("bd-b.v1.gruppi-chiusi"));
  gruppiApribili(dom2.window.document, dom2.window.localStorage);
  assert.equal(dom2.window.document.querySelector('[data-gruppo="alimentazione"]').classList.contains("chiuso"), true);
  assert.equal(dom2.window.document.querySelector('[data-gruppo="studio"]').classList.contains("chiuso"), true);
  assert.equal(dom2.window.document.querySelector('[data-gruppo="programmi"]').classList.contains("chiuso"), false);
});

test("40.04 memoria rotta o assente: nessun errore, tutto aperto", () => {
  const dom = new JSDOM(html, { url: "https://example.test/desktop/" });
  const doc = dom.window.document;
  gruppiApribili(doc, { getItem() { return "{non è json"; }, setItem() { throw new Error("piena"); } });
  assert.equal(doc.querySelector('[data-gruppo="programmi"]').classList.contains("chiuso"), false);
  doc.querySelector('[data-gruppo="programmi"] .etichetta').click();
  assert.equal(doc.querySelector('[data-gruppo="programmi"]').classList.contains("chiuso"), true);
});

test("40.05 il foglio ha le regole del v31 per il gruppo chiuso", () => {
  const css = fs.readFileSync(new URL("../comune/dashboard-b.css", import.meta.url), "utf8");
  assert.match(css, /\.gruppo\.chiuso \.voci\s*\{display:none\}/);
  assert.match(css, /\.gruppo\.chiuso \.chev\s*\{transform:rotate\(-90deg\)\}/);
});
