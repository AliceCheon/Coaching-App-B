/* Guardia 150 (passo 19): i due tasti «? Guida» che non facevano niente.
 *
 *  150.1  i due tasti ci sono nella pagina vera, e il modulo li riconosce
 *  150.2  il tocco apre un riquadro con la spiegazione, il secondo tocco lo chiude
 *  150.3  il riquadro non promette niente che l'app non faccia: parla di cose
 *         che esistono (Anamnesi che si scrive, check-in dal telefono, set base/TUT)
 *  150.4  nessun tasto «Guida» resta senza ascoltatore nella pagina
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM } from "jsdom";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const sorgente = readFileSync(join(radice, "desktop", "index.html"), "utf8");
const modulo = await import(join(radice, "comune", "guide-vive.js"));

function pagina() {
  const dom = new JSDOM(sorgente, { runScripts: "outside-only", url: "http://localhost/desktop/index.html" });
  return dom.window.document;
}

test("150.1 i due tasti esistono e il modulo li riconosce", () => {
  const doc = pagina();
  assert.ok(doc.querySelector(".dc-guida"), "manca il tasto Guida in Dati cliente");
  assert.ok(doc.querySelector("#db-guida"), "manca il tasto Guida in Database esercizi");
  const annodati = modulo.annodaGuideVive(doc);
  assert.deepEqual(annodati.slice().sort(), [".ck-guida", ".dc-guida", "#db-guida", "#sp-guida"].sort(), "il modulo non ha riconosciuto i quattro tasti");
});

test("150.2 il tocco apre, il secondo tocco chiude", () => {
  for (const [selettore, idBox] of [[".dc-guida", "dc-guida-box"], ["#db-guida", "db-guida-box"]]) {
    const doc = pagina();
    modulo.annodaGuideVive(doc);
    const tasto = doc.querySelector(selettore);
    assert.equal(doc.getElementById(idBox), null, "il riquadro c'è già prima del tocco");
    tasto.click();
    const box = doc.getElementById(idBox);
    assert.ok(box, "il tocco non ha aperto il riquadro " + idBox);
    assert.equal(tasto.getAttribute("aria-expanded"), "true", "il tasto non dice di essere aperto");
    assert.ok(box.textContent.trim().length > 80, "il riquadro è vuoto");
    tasto.click();
    assert.equal(doc.getElementById(idBox), null, "il secondo tocco non ha chiuso il riquadro");
    assert.equal(tasto.getAttribute("aria-expanded"), "false", "il tasto resta segnato come aperto");
  }
});

test("150.3 il testo parla solo di cose che esistono", () => {
  const doc = pagina();
  modulo.annodaGuideVive(doc);
  doc.querySelector(".dc-guida").click();
  const dati = doc.getElementById("dc-guida-box").textContent;
  assert.match(dati, /Anamnesi/i);
  assert.match(dati, /telefono/i, "non dice da dove arriveranno i dati che mancano");

  doc.querySelector("#db-guida").click();
  const db = doc.getElementById("db-guida-box").textContent;
  for (const parola of ["set base", "sovrapposizione", "TUT"]) {
    assert.match(db.toLowerCase(), new RegExp(parola.toLowerCase()), "manca la spiegazione di " + parola);
  }
  assert.match(db, /prehab/i, "non dice che i prehab mancano");
});

test("150.4 nessun tasto Guida resta senza ascoltatore", () => {
  const doc = pagina();
  modulo.annodaGuideVive(doc);
  const guidi = [...doc.querySelectorAll("button")].filter((b) => /guida/i.test(b.textContent || ""));
  const senza = guidi.filter((b) => b.dataset.guidaViva !== "1" && !b.disabled);
  assert.deepEqual(senza.map((b) => (b.textContent || "").trim()), [], "questi tasti Guida non fanno niente");
});

test("150.5 il «?» davanti al nome e' uscito, e le guide dei moduli funzionano", async () => {
  const doc = pagina();
  modulo.annodaGuideVive(doc);
  for (const tasto of doc.querySelectorAll("button")) {
    if (!/guida/i.test(tasto.textContent || "")) continue;
    assert.equal(/^\s*\?/.test(tasto.textContent || ""), false, "resta il «?» in «" + tasto.textContent.trim() + "»");
  }
  /* le tre guide che nascono dai moduli: stesso modulo, tasto creato a mano */
  for (const [chiave, parola] of [["dashboard", /Readiness/i], ["overview", /logbook/i], ["pianificazione", /settimane/i]]) {
    const tasto = doc.createElement("button");
    tasto.textContent = "Guida " + chiave;
    assert.equal(modulo.attaccaGuida(doc, tasto, chiave), true, "la guida " + chiave + " non si e' attaccata");
    assert.equal(tasto.disabled, false, "il tasto " + chiave + " resta spento");
    doc.body.appendChild(tasto);
    tasto.click();
    const box = doc.getElementById("guida-" + chiave + "-box");
    assert.ok(box, "il tocco non ha aperto la guida " + chiave);
    assert.match(box.textContent, parola, "il testo di " + chiave + " non parla di quello che deve");
    tasto.click();
    assert.equal(doc.getElementById("guida-" + chiave + "-box"), null, "il secondo tocco non chiude " + chiave);
  }
});
