/* Guardia 151 (passo 21): i tasti che sembravano cliccabili e non lo erano.
 *
 *  151.1  «Apri analisi completa» punta a una voce che esiste (riepilogo-volume),
 *         e il vecchio valore `volume` non c'è più
 *  151.2  la coppia «Pesate / Mesi» è uscita da Monitor peso
 *  151.3  la data di una seduta (.lb-link[data-lb]) porta all'Archivio
 *  151.4  il cambio «Solo diretto / Diretto + indiretto» del Riepilogo volume
 *         non solleva «Assignment to constant variable» e cambia quello che si legge
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM } from "jsdom";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const sorgente = readFileSync(join(radice, "desktop", "index.html"), "utf8");
const codice = readFileSync(join(radice, "desktop", "app-v31.js"), "utf8")
  + readFileSync(join(radice, "comune", "vista-volume.js"), "utf8");

test("151.1 «Apri analisi completa» punta a una pagina che c'è", () => {
  const dom = new JSDOM(sorgente, { runScripts: "outside-only" });
  const doc = dom.window.document;
  const tasto = doc.querySelector('[data-vai]');
  assert.ok(tasto, "manca il tasto «Apri analisi completa»");
  const bersaglio = tasto.dataset.vai;
  assert.ok(doc.querySelector('.voce[data-vista="' + bersaglio + '"]'), "nessuna voce del menu si chiama «" + bersaglio + "»: il tocco cadrebbe nel vuoto");
  assert.equal(bersaglio, "riepilogo-volume");
});

test("151.2 la coppia «Pesate / Mesi» non promette più una vista che non esiste", () => {
  const dom = new JSDOM(sorgente, { runScripts: "outside-only" });
  const doc = dom.window.document;
  const tab = doc.querySelector('#pag-monitor-peso .mp-tab');
  assert.equal(tab, null, "in Monitor peso c'è ancora un tasto «mp-tab» senza comando");
});

test("151.3 la data di una seduta porta all'Archivio", () => {
  assert.equal(codice.includes('closest(".lb-link[data-lb]")'), true, "manca il gestore della data di seduta");
  assert.match(codice, /voce\[data-vista="archivio"\]/, "il gestore non porta all'Archivio");
});

test("151.4 lo switch del Riepilogo volume cambia quello che si legge", async () => {
  const { renderVolume } = await import(join(radice, "comune", "vista-volume.js"));
  const dom = new JSDOM("<div id=\"c\"></div>");
  const doc = dom.window.document;
  const contenitore = doc.getElementById("c");
  const settimana = (serie, rip) => ({ week: 1, sets: serie, reps: String(rip), rest: { seconds: 90 }, type: "normal", note: "", source: "manual" });
  const schede = [{
    id: "sh-A",
    sheet: {
      id: "sh-A",
      exercises: [{
        id: "ex1", name: "Lat machine",
        distretto: "Dorsali", distrettoSecondario: "Bicipiti",
        prescription: { rest: "1'" },
        progression: { weeks: [settimana(4, 10)] }
      }]
    }
  }];
  renderVolume(doc, contenitore, schede, { quante: 1 });
  const prima = contenitore.textContent;
  const tasti = [...contenitore.querySelectorAll("button")];
  assert.equal(tasti.length >= 2, true, "manca lo switch diretto/indiretto");
  let errore = null;
  try { tasti[0].click(); } catch (e) { errore = e; }
  assert.equal(errore, null, "il tocco solleva: " + (errore && errore.message));
  assert.notEqual(contenitore.textContent, prima, "il tocco non cambia niente: lo switch è morto");
});
