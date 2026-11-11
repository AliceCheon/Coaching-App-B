/* tests/69-pagina-viva.test.mjs — la pagina VERA nel browser (passo 24,
 * 10/11/2026). Le prove 66 e 67 provavano le funzioni: nessuna cliccava i
 * tasti sulla pagina. Questo scatto serve desktop/index.html vera (i moduli
 * veri, la vista vera) col finto Firestore dalla forma dei documenti vera
 * (esercizi dentro sheet.exercises, esercizi anche SENZA id, schede
 * splittate), e clicca davvero:
 *
 *  69.1  il ✕ di una riga: documento marcato, voce di registro, riga di
 *        stato, e l'Annulla del v31 rimette tutto;
 *  69.2  il + di una riga: la voce cliccata scrive le 8 settimane, la pagina
 *        si ridisegna SUBITO, il pannello si chiude, messaggio di Alice;
 *  69.3  "Applica progressione a tutta la scheda": una voce sola, tutte le
 *        righe vive dentro, pagina ridisegnata;
 *  69.4  dopo la ricarica, ?ripristina= trova la voce sul disco (il finto
 *        Firestore persiste in localStorage fra le navigazioni) e riporta i
 *        valori di prima;
 *  69.5  nessun errore non preso in carico a pagina.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";
import { chromium } from "playwright";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript",
  ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json"
};

let server = null;
let browser = null;
let page = null;
let base = "";
const errori = [];
const erroriConsole = [];

async function documentoScheda(page) {
  return page.evaluate(async () => {
    const db = window.firebase.app("B").firestore();
    return (await db.collection("bdB_atleti").doc("alice-prova").collection("schede")
      .doc("program-v2-sheet-prg-intensita__sh-A").get()).data();
  });
}

test("74.0 si apre la pagina vera col finto Firestore", async () => {
  server = createServer(async (req, res) => {
    try {
      const u = new URL(req.url, "http://x");
      let p = decodeURIComponent(u.pathname);
      if (p.endsWith("/")) p += "index.html";
      const dati = await readFile(join(radice, p));
      res.writeHead(200, { "content-type": MIME[extname(p)] || "application/octet-stream" });
      res.end(dati);
    } catch (e) { res.writeHead(404); res.end("no"); }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = "http://127.0.0.1:" + server.address().port;
  let ultimo = null;
  for (const canale of ["chrome", "msedge", null]) {
    try { browser = await chromium.launch(canale ? { channel: canale } : {}); break; }
    catch (e) { ultimo = e; }
  }
  assert.ok(browser, "nessun browser per Playwright: " + (ultimo && ultimo.message));
  page = await browser.newPage();
  page.on("pageerror", (e) => errori.push(String((e && e.message) || e)));
  page.on("console", (m) => { if (m.type() === "error") erroriConsole.push(m.text()); });
  /* Il finto Firestore entra PRIMA dei moduli; gli script del progetto vero
   * (gstatic) restano fuori: window.firebase deve restare il finto. */
  await page.route(/gstatic\.com/, (r) => r.abort());
  await page.addInitScript({ path: join(radice, "tests", "finti", "zona-b-finta-browser.js") });
  await page.goto(base + "/desktop/index.html");
  /* La sezione Programma parte nascosta: il menu del v31 la mostra. Il render
   * pero' c'e' gia' nel DOM: lo si aspetta ATTACCATO, poi si clicca la voce. */
  try {
    await page.waitForSelector(".p8-tab", { state: "attached", timeout: 20000 });
  } catch (e) {
    const qui = await page.evaluate(() => {
      const c = document.querySelector("#programma-attivo");
      return c ? c.textContent.slice(0, 300) : "contenitore mancante";
    });
    assert.fail("la tabella non si e' disegnata. Contenitore: " + qui + " · errori di pagina: " + errori.join(" | ").slice(0, 600));
  }
  const voceMenu = page.locator('.voce[data-vista="programma-1"]').first();
  await voceMenu.click();
  await page.waitForSelector(".p8-tab", { state: "visible", timeout: 10000 });
});


test("74.1 il + apre, rotella e touchmove interni non chiudono, fuori chiude", async () => {
  try {
    const piu = page.locator('.p8-r').first().locator('button[title="inserisci progressione sotto"]');
    await page.waitForTimeout(2000);
    await piu.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await piu.click();
    const pannello = page.locator('.prog-panel:not([data-progp])');
    await pannello.waitFor({ state: 'visible' });
    // Oltre la finestra di 1500ms: non deve essere l'antiscorrimento a salvarlo.
    await page.waitForTimeout(1700);
    assert.equal(await pannello.isVisible(), true, 'il pannello resta aperto dopo apertura e assestamento');
    const prima = await pannello.evaluate(p => ({ top: p.scrollTop, max: p.scrollHeight - p.clientHeight }));
    assert.ok(prima.max > 0, 'il pannello ha contenuto realmente scorrevole');
    await pannello.hover();
    await page.mouse.wheel(0, 160);
    await page.waitForTimeout(250);
    assert.equal(await pannello.isVisible(), true, 'la rotella interna non nasconde il pannello');
    const dopo = await pannello.evaluate(p => p.scrollTop);
    assert.ok(dopo > prima.top, 'la lista e scorsa davvero verso il basso');
    const touch = await pannello.evaluate(p => {
      const e = new Event('touchmove', { bubbles: true, cancelable: true });
      p.querySelector('.prog-item').dispatchEvent(e);
      return { visibile: !p.hidden, bloccato: e.defaultPrevented };
    });
    assert.equal(touch.visibile, true, 'touchmove interno lascia aperto');
    assert.equal(touch.bloccato, false, 'touchmove non blocca lo scorrimento nativo');
    await pannello.evaluate(p => { p.scrollTop = p.scrollHeight; });
    await page.waitForTimeout(100);
    assert.equal(await pannello.isVisible(), true, 'anche la barra interna lascia aperto');
    await page.evaluate(() => document.dispatchEvent(new Event('scroll')));
    assert.equal(await pannello.isVisible(), false, 'scroll esterno conserva la chiusura del v31');
    await piu.click();
    await pannello.waitFor({ state: 'visible' });
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    assert.equal(await pannello.count(), 0, 'clic fuori chiude ancora');
    console.log('Evidenza 74: scrollTop ' + prima.top + ' -> ' + dopo + '; touchmove non annullato; scorrimento esterno e clic fuori chiudono.');
    assert.deepEqual(errori, [], 'nessun errore di pagina');
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise(r => server.close(r));
  }
});
