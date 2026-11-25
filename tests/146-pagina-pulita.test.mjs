/* Guardia 146 (passo 16): il sito non porta dati personali e non grida errori.
 *
 *  146.1  in desktop/index.html non restano «Faccio», «25/05/2026»,
 *         il questionario fisso (sk-qrisp / sk-qscore / disegnaQuestionario)
 *  146.2  nessuna traccia di Cloudflare: niente /cdn-cgi/, niente
 *         __cf_email__, niente email-decode; l'indirizzo e' testo semplice
 *  146.3  una versione sola: la stringa compare UNA volta nel file e i tre
 *         posti (menu, Build, cambio pagina) mostrano la stessa
 *  146.4  la pagina si apre in jsdom, si visitano le venti pagine e non resta
 *         nessun errore non preso in carico
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const sorgente = readFileSync(join(radice, "desktop", "index.html"), "utf8");
const PAGINE = [...sorgente.matchAll(/id="(pag-[a-z0-9-]+)"/g)].map((m) => m[1]);

test("146.1 il questionario personale e' uscito dal file", () => {
  assert.equal(sorgente.includes("Faccio"), false, "c'e' ancora la frase personale");
  assert.equal(sorgente.includes("25/05/2026"), false, "c'e' ancora la data del questionario");
  for (const residuo of ["sk-qrisp", "sk-qscore", "disegnaQuestionario"]) {
    assert.equal(sorgente.includes(residuo), false, "e' rimasto " + residuo);
  }
  const schede = sorgente.slice(sorgente.indexOf('id="pag-scheletri"'), sorgente.indexOf('id="pag-programma-1"'));
  assert.match(schede, /Nessun questionario registrato/, "la pagina non dichiara che non c'e' un questionario");
});

test("146.2 Cloudflare fuori: indirizzo in chiaro, nessun link protetto", () => {
  for (const traccia of ["/cdn-cgi/", "__cf_email__", "email-decode", "data-cfemail"]) {
    assert.equal(sorgente.includes(traccia), false, "e' rimasto " + traccia);
  }
  assert.match(sorgente, /<div class="dc-mail">scaniscrini@gmail\.com<\/div>/);
});

test("146.3 una versione sola, uguale nei tre posti", () => {
  const trovate = sorgente.match(/v26\.\d+/g) || [];
  assert.equal(new Set(trovate).size, 1, "ci sono versioni diverse: " + [...new Set(trovate)].join(", "));
  assert.equal(trovate.length, 1, "la versione e' scritta " + trovate.length + " volte invece che in un punto solo");
  assert.match(sorgente, /window\.BD_VERSIONE="v26\.\d+"/);
  assert.equal(sorgente.includes("v26.5"), false, "resta la versione vecchia del menu");
  assert.equal(sorgente.includes("v25.7"), false, "resta la versione vecchia del cambio pagina");
  assert.match(sorgente, /bd-ver'\);if\(b\)b\.textContent=\(window\.BD_VERSIONE\|\|''\)/);
});

test("146.4 le venti pagine si aprono senza errori non presi in carico", async () => {
  assert.equal(PAGINE.length, 20, "le pagine trovate sono " + PAGINE.length);
  const html = sorgente.replace(/<script[^>]*\ssrc="[^"]*"[^>]*><\/script>/g, "");
  const rumori = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => {
    const m = String((e && e.message) || "");
    if (!/Not implemented/.test(m)) rumori.push(m);
  });
  const dom = new JSDOM(html, { runScripts: "dangerously", url: "http://localhost/desktop/index.html", virtualConsole: vc });
  const w = dom.window;
  const errori = [];
  w.addEventListener("error", (e) => errori.push("error: " + (e.message || "")));
  try {
    await new Promise((ok) => setTimeout(ok, 400));

    const versione = w.BD_VERSIONE;
    assert.match(String(versione), /^v26\.\d+$/, "manca la versione unica");
    assert.equal(w.document.getElementById("st-ver").textContent, versione, "Build non mostra la versione unica");
    assert.equal(w.document.getElementById("bd-ver").textContent, versione, "il menu non mostra la versione unica");

    for (const id of PAGINE) {
      const chiave = id.slice(4);
      assert.equal(w.BDVAI(chiave), true, "la pagina " + chiave + " non si apre");
      assert.ok(w.document.getElementById(id).classList.contains("on"), "la pagina " + chiave + " non e' quella mostrata");
      assert.equal(w.document.getElementById("bd-ver").textContent, versione + " \u00b7 " + chiave, "il cambio pagina non scrive la versione unica");
    }

    const raccolti = JSON.parse(JSON.stringify(w.BDERR || []));
    assert.deepEqual(raccolti, [], "la pagina ha raccolto errori: " + JSON.stringify(raccolti));
    assert.deepEqual(errori, [], "errori non presi in carico: " + errori.join("; "));
    assert.deepEqual(rumori, [], "errori jsdom: " + rumori.join("; "));
  } finally {
    w.close();
  }
});
