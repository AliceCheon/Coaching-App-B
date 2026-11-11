/* Passo 29: scorciatoia e pulsante devono usare lo stesso registro B. Solo Firestore finto. */
import { test, after } from "node:test";
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

test("76.0 si apre la pagina vera col finto Firestore", async () => {
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



after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise(r => server.close(r));
});
async function registro() {
  return page.evaluate(async () => (await window.firebase.app('B').firestore().collection('bdB_atleti').doc('alice-prova').collection('registro').get()).docs.map(d => Object.assign({}, d.data(), { idVoce: d.data().idVoce || d.id })));
}
async function aspettaVoce(numero, attivo = true) {
  const fine = Date.now() + 7000;
  while ((await registro()).length !== numero && Date.now() < fine) await page.waitForTimeout(80);
  assert.equal((await registro()).length, numero, 'numero atteso delle voci nel registro');
  if (attivo) await page.waitForFunction(() => { const b = document.querySelector('#programma-attivo button.pg-undo'); return b && !b.disabled; });
}
async function verificaAnnullamento(voce, numero, prima) {
  try { await aspettaVoce(numero, false); }
  catch (e) {
    assert.fail('La scorciatoia non usa il registro B: ' + JSON.stringify({ registro: await registro(), messaggi: await page.locator('body').innerText().then(t => t.match(/[^\n]*[Nn]iente da annullare[^\n]*/g)) }));
  }
  const voci = await registro();
  const annullamenti = voci.filter(v => v.annullaDi === voce.idVoce);
  assert.equal(annullamenti.length, 1, JSON.stringify({voce,voci}));
  const dopo = await documentoScheda(page);
  assert.deepEqual(dopo.sheet, prima.sheet, 'scheda ripristinata come con il pulsante');
  await page.waitForFunction(() => (document.getElementById('modifica-stato') || {}).textContent?.includes('annullato'));
  assert.doesNotMatch(await page.locator('body').innerText(), /niente da annullare/i, 'nessun messaggio della pila storica');
  await page.waitForTimeout(600);
  assert.equal((await registro()).length, numero, 'nessun doppio annullamento dopo il ridisegno');
  console.log('Evidenza 76: ' + voce.campo + ', annullaDi=' + voce.idVoce + ', scheda ripristinata, una sola voce, nessun messaggio storico.');
}

test('76.1 pulsante e Ctrl+Z annullano la stessa cancellazione nel registro B', async () => {
  const prima = await documentoScheda(page);
  for (const comando of ['pulsante', 'Control+z']) {
    const n = (await registro()).length;
    await page.locator('.p8-r').first().locator('button.ab').filter({ hasText: '\u2715' }).click();
    await aspettaVoce(n + 1);
    const voci = await registro();
    const cancellazioni = voci.filter(v => v.tipo === 'cancella-riga');
    const ultima = cancellazioni[cancellazioni.length - 1];
    // Il fake ordina i documenti per inserimento; annullaDi identifica la voce, non l'indice.
    if (comando === 'pulsante') await page.locator('#programma-attivo button.pg-undo').click();
    else await page.keyboard.press(comando);
    await verificaAnnullamento(ultima, n + 2, prima);
  }
});

for (const [campo, valore, comando] of [['serie', '7', 'Control+z'], ['ripetizioni', '10-x', 'Meta+z']]) {
  test('76.' + (campo === 'serie' ? '2' : '3') + ' ' + comando + ' annulla una modifica vera di ' + campo, async () => {
    const prima = await documentoScheda(page);
    const n = (await registro()).length;
    await page.locator('.voce[data-vista="programma-1"]').first().click();
    const cella = page.locator('span[data-campo="' + campo + '"]:visible').first();
    await cella.fill(valore, { timeout: 5000 });
    await page.keyboard.press('Enter');
    await aspettaVoce(n + 1);
    const voci = await registro();
    const modifiche = voci.filter(v => v.campo === campo && !v.annullaDi);
    const ultima = modifiche[modifiche.length - 1];
    assert.ok(ultima, 'modifica salvata nel registro');
    assert.notDeepEqual((await documentoScheda(page)).sheet, prima.sheet);
    await page.keyboard.press(comando);
    await verificaAnnullamento(ultima, n + 2, prima);
  });
}

let primaCampi, voceCampi;
test('76.35 prepara una modifica annullabile durante le prove nei campi', async () => {
  primaCampi = await documentoScheda(page); const n = (await registro()).length;
  await page.locator('.p8-r').first().locator('button.ab').filter({ hasText: '✕' }).click();
  await aspettaVoce(n + 1); const voci = await registro(); voceCampi = voci[voci.length - 1];
});
// Passo 30: digitazione reale, nessun fill per creare la cronologia nativa.
for (const comando of ['Control+z', 'Meta+z']) {
  test('76.4 ' + comando + ' dentro una cella non tocca il registro', async () => {
    const n = (await registro()).length;
    const prima = await documentoScheda(page);
    const cella = page.locator('span[data-campo="ripetizioni"]:visible').first();
    await cella.focus();
    const originale = await cella.innerText();
    await page.keyboard.press('End');
    await page.keyboard.type('abc');
    await page.waitForTimeout(150);
    assert.equal((await registro()).length, n, 'digitare non salva');
    await osservaScorciatoia();
    await page.keyboard.press(comando);
    await verificaNativo(comando, cella, originale, n, prima);
    // Non uscire salvando il testo di prova: ripristino il DOM e solo poi blur.
    await cella.evaluate((el, testo) => { el.textContent = testo; el.blur(); }, originale);
    await page.waitForTimeout(300);
    assert.equal((await registro()).length, n);
  });
}
async function osservaScorciatoia() {
  await page.evaluate(() => {
    window.__provaUndo = null;
    const osserva = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        window.__provaUndo = { impedito: e.defaultPrevented, bersaglio: e.target.tagName }; window.removeEventListener('keydown', osserva);
      }
    }; window.addEventListener('keydown', osserva);
  });
}
async function verificaNativo(comando, campo, originale, n, prima) {
  await page.waitForTimeout(300);
  const evento = await page.evaluate(() => window.__provaUndo);
  assert.ok(evento, 'evento arriva al browser senza essere fermato');
  assert.equal(evento.impedito, false, 'nessun preventDefault sul campo');
  if (comando === 'Control+z') assert.equal(await campo.innerText().catch(() => ''), originale, 'il browser annulla il testo digitato');
  assert.equal((await registro()).length, n, 'nessuna voce registro durante undo testo');
  assert.deepEqual((await documentoScheda(page)).sheet, prima.sheet, 'scheda salvata invariata');
}
for (const comando of ['Control+z', 'Meta+z']) {
  test('76.5 ' + comando + ' ricerca nel modale, input e note restano nativi', async () => {
    const n = (await registro()).length;
    const prima = await documentoScheda(page);
    // Il Database esercizi resta una funzione spenta: apro solo il suo DOM storico
    // nel banco di prova, senza collegare il pulsante o abilitare salvataggi.
    await page.evaluate(() => {
      document.querySelectorAll('#prova-note-undo, #prova-input-undo').forEach(el => el.remove()); const m = document.getElementById('pg-lib'); m.hidden = false; m.style.display = 'block';
      const note = document.createElement('textarea'); note.id = 'prova-note-undo'; m.appendChild(note);
      const testo = document.createElement('input'); testo.id = 'prova-input-undo'; m.appendChild(testo);
    });
    for (const selettore of ['#pg-lib-q', '#prova-note-undo', '#prova-input-undo']) {
      const campo = page.locator(selettore);
      await campo.fill(''); await campo.focus(); await page.keyboard.type('prova');
      await osservaScorciatoia(); await page.keyboard.press(comando);
      await page.waitForTimeout(200);
      const evento = await page.evaluate(() => window.__provaUndo);
      assert.ok(evento, 'nessun vecchio gestore intercetta il campo ' + selettore);
      assert.equal(evento.impedito, false);
      if (comando === 'Control+z') assert.notEqual(await campo.inputValue(), 'prova', 'il browser annulla almeno l’ultima digitazione nel campo ' + selettore);
      assert.equal((await registro()).length, n);
      assert.deepEqual((await documentoScheda(page)).sheet, prima.sheet);
    }
    await page.evaluate(() => { document.getElementById('prova-note-undo').remove(); document.getElementById('prova-input-undo').remove(); const m = document.getElementById('pg-lib'); m.hidden = true; m.style.display = ''; });
  });
}

test('76.6 fuori dai campi annulla la modifica rimasta intatta durante la digitazione', async () => {
  const n = (await registro()).length; await page.evaluate(() => document.activeElement.blur());
  await page.keyboard.press('Control+z'); await verificaAnnullamento(voceCampi, n + 1, primaCampi);
});
