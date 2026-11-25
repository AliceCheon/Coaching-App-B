/* Guardia 154 (passo 32): la linea del peso si disegna nelle misure vere.
 *
 *  154.1  nella pagina non c'e' piu' l'altezza moltiplicata per sette
 *  154.2  la linea prende la larghezza dal riquadro che la contiene
 *  154.3  la tessera Peso: disegno alto come il riquadro, punti dentro il disegno
 *  154.4  il grafico di Monitor peso e' alto 190 e non esce dal suo riquadro
 *  154.5  con una pesata sola non si disegna una linea storta
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM } from "jsdom";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(radice, "desktop", "index.html"), "utf8");
const sorgentePeso = readFileSync(join(radice, "comune", "peso-b.js"), "utf8");

function pagina(larghezza = 300, prepara = null) {
  const dom = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true });
  const { window } = dom;
  window.eval(sorgentePeso);
  Object.defineProperty(window.HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get() { return larghezza; }
  });
  Object.defineProperty(window.HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get() { return larghezza; }
  });
  if (prepara) prepara(window.document);
  const script = window.document.querySelector("script#peso-pittore");
  assert.ok(script, "manca il pittore del peso");
  window.eval(script.textContent);
  return window;
}

test("154.1 nessuna altezza moltiplicata per sette", () => {
  assert.ok(!/\)\s*\*\s*7\s*\+\s*'px'/.test(html), "l'altezza del disegno non si moltiplica per sette");
  assert.ok(!/height:'\+\(\(h\|\|30\)\*7\)/.test(html), "vecchia riga ancora presente");
});

/* La tessera del Peso nel file vero la costruisce un altro script: qui si
   mette la stessa forma, così il pittore trova dove disegnare. */
function tesseraPeso(doc) {
  const kpi = doc.createElement("div");
  kpi.id = "ov-kpi";
  const k = doc.createElement("div");
  k.className = "p7-k";
  k.id = "ov-k-peso";
  k.innerHTML = '<div class="kl">Peso</div><div class="kv">—</div><div class="ks"></div><div class="kf"></div>';
  kpi.appendChild(k);
  doc.body.appendChild(kpi);
}

test("154.2 la linea prende la larghezza dal riquadro", () => {
  const w = pagina(320, tesseraPeso);
  const svg = w.document.querySelector("#ov-k-peso .ks svg");
  assert.ok(svg, "manca il disegno nella tessera Peso");
  assert.match(svg.getAttribute("viewBox"), /^0 0 320 \d+$/);
});

test("154.3 tessera Peso: disegno alto come il riquadro e punti dentro", () => {
  const w = pagina(300, tesseraPeso);
  const svg = w.document.querySelector("#ov-k-peso .ks svg");
  assert.equal(svg.getAttribute("height"), "14");
  assert.match(svg.getAttribute("style"), /height:14px/);
  const punti = [...svg.querySelectorAll("circle")];
  assert.equal(punti.length, 5);
  for (const c of punti) {
    const x = Number(c.getAttribute("cx"));
    const y = Number(c.getAttribute("cy"));
    assert.ok(x >= 0 && x <= 300, "punto fuori larghezza: " + x);
    assert.ok(y >= 0 && y <= 14, "punto fuori altezza: " + y);
  }
  assert.equal(svg.getAttribute("viewBox"), "0 0 300 14");
});

test("154.4 Monitor peso: grafico alto 190 e dentro il riquadro", () => {
  const w = pagina(900);
  const svg = w.document.querySelector("#mp-chart svg");
  assert.ok(svg, "manca il grafico di Monitor peso");
  assert.equal(svg.getAttribute("height"), "190");
  assert.equal(svg.getAttribute("viewBox"), "0 0 900 190");
  const punti = [...svg.querySelectorAll("circle")];
  assert.equal(punti.length, 5);
  for (const c of punti) {
    const y = Number(c.getAttribute("cy"));
    assert.ok(y >= 0 && y <= 190, "punto fuori dal grafico: " + y);
  }
});

test("154.5 con una pesata sola non si disegna una linea", () => {
  const w = pagina(300);
  w.BDPESO_PITTA(w.BDPesoB.leggiPeso({ pesate: [{ data: "2026-10-27", kg: 67.7, fonte: "prova" }] }));
  const svg = w.document.querySelector("#ov-spark svg");
  assert.equal(svg, null, "con una pesata sola non deve esserci una linea");
  assert.match(w.document.querySelector("#ov-spark").textContent, /secondo punto/i);
});
