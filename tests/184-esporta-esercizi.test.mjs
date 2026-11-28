/* Guardia 184 (passo 35, 28/11/2026) — «Esporta esercizi»: le schede in un
 * file da mandare in chat.
 *
 * Alice non ha il backup di B: le schede stanno nel suo account Firebase e da
 * qui non si leggono. Il file lo produce la pagina, con un tasto accanto alle
 * stampe. Questa guardia controlla tre cose:
 *
 *  184.1  la funzione pura (`costruisciEsportazione`) mette nel file tutte le
 *         schede e tutti gli esercizi del programma di prova, con il distretto
 *         che mostra l'app, la serie della prima settimana, le settimane e le
 *         articolazioni; quello che l'app non ha resta `null` (mai "", mai 0)
 *         e nell'oggetto non c'è nessun `undefined`;
 *  184.2  il tasto c'è nella barra della scheda, ha l'aria-label che dice cosa
 *         scarica, e con il programma non letto è spento e spiega perché; la
 *         stessa cosa sulla riga dell'Archivio;
 *  184.3  nel browser vero il clic scarica davvero: il file si apre, è un JSON
 *         leggibile e contiene le schede e gli esercizi del programma di prova.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { readFile, mkdtemp, readFile as leggi } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";
import { chromium } from "playwright";
import { ricostruisciSchede } from "../comune/schede-v2.js";
import { costruisciEsportazione, nomeFileEsportazione } from "../comune/esporta-esercizi-b.js";
import { renderProgramma } from "../comune/vista-programma.js";
import { renderArchivio } from "../comune/vista-archivio.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");

/* Il programma di prova: quattro schede (A, B, C, D) con esercizi veri e un
 * esercizio che l'app non conosce (per controllare i campi mancanti). */
const settimane = (serie, rip, rec) => Array.from({ length: 8 }, (_, i) => ({
  week: i + 1, sets: serie, reps: rip, rest: { seconds: rec },
  type: "normal", note: "", source: "manual"
}));
const ESE = (nome, muscolo, serie, rip, rec) => ({
  id: "ex-" + nome, name: nome, muscle: muscolo,
  prescription: { sets: serie, reps: { label: rip }, rest: { seconds: rec } },
  progression: { weeks: settimane(serie, rip, rec) }
});
const foglio = (pid, code, nome, esercizi) => ({
  id: "program-v2-sheet-" + pid + "__sh-" + code,
  dati: { programId: pid, sheetId: "sh-" + code, kind: "sheet", versione: 1,
    sheet: { id: "sh-" + code, code: code, name: nome, exercises: esercizi } }
});
const DOCS = [
  foglio("prg-b", "A", "Scheda A", [
    ESE("Hip thrust", "Glutei", 6, "10", 120),
    ESE("Calf machine", "Polpacci", 4, "12", 45),
    ESE("Curl bilanciere", "Bicipiti", 3, "12", 75)
  ]),
  foglio("prg-b", "B", "Scheda B", [
    ESE("Panca piana manubri", "Pettorali", 4, "10", 90),
    ESE("Lat machine presa neutra", "Dorsali", 4, "12", 90)
  ]),
  foglio("prg-b", "C", "Scheda C", [
    ESE("Leg curl", "Femorali", 3, "12", 90)
  ]),
  foglio("prg-b", "D", "Scheda D", [
    ESE("Crunch inverso", "Addominali", 3, "15", 45),
    /* Senza muscolo, senza settimane e con un nome che il catalogo non ha:
     * deve uscire con `null` dove il dato non c'è. */
    { id: "ex-mistero", name: "Esercizio misterioso", prescription: {}, progression: {} }
  ])
];
const SCHEDE = ricostruisciSchede(DOCS);
const GRUPPO = SCHEDE.perProgramma["prg-b"];
const PROGRAMMA = {
  profilo: { presente: true, nome: "Barbell Diva B", durata: 8 },
  schede: GRUPPO.schede,
  archiviate: GRUPPO.archiviate
};
const OGGI = new Date(2026, 10, 28); /* 28/11/2026, in ora locale */

/* Tutte le chiavi che portano `undefined`, a qualunque profondità. */
function chiaviUndefined(valore, dove) {
  const fuori = [];
  if (valore === undefined) { fuori.push(dove || "(radice)"); return fuori; }
  if (!valore || typeof valore !== "object") return fuori;
  Object.keys(valore).forEach((k) => {
    fuori.push(...chiaviUndefined(valore[k], (dove ? dove + "." : "") + k));
  });
  return fuori;
}

test("184.1 la funzione pura: tutte le schede e gli esercizi, i buchi sono null", () => {
  const dati = costruisciEsportazione(PROGRAMMA, { oggi: OGGI });

  assert.deepEqual(chiaviUndefined(dati), [], "niente undefined nel file: " + chiaviUndefined(dati).join(", "));
  assert.ok(!JSON.stringify(dati).includes("undefined"), "e nemmeno nel testo JSON");

  /* La testa: nome, settimane, tutte e quattro le schede con i loro conti. */
  assert.equal(dati.programma.nome, "Barbell Diva B");
  assert.equal(dati.programma.settimane, 8, "le settimane dichiarate dal profilo");
  assert.deepEqual(dati.programma.schede.map((s) => s.codice), ["A", "B", "C", "D"]);
  assert.deepEqual(dati.programma.schede.map((s) => s.esercizi), [3, 2, 1, 2],
    "ogni scheda porta quanti esercizi ha");
  assert.equal(dati.esportatoIl, "2026-11-28");

  /* Tutti gli esercizi, e ognuno sa da che scheda viene. */
  assert.equal(dati.esercizi.length, 8, "3 + 2 + 1 + 2 esercizi in tutto");
  const coppie = dati.esercizi.map((e) => e.scheda.codice + ":" + e.nome);
  ["A:Hip thrust", "A:Calf machine", "A:Curl bilanciere", "B:Panca piana manubri",
    "B:Lat machine presa neutra", "C:Leg curl", "D:Crunch inverso", "D:Esercizio misterioso"]
    .forEach((attesa) => assert.ok(coppie.includes(attesa), "c'è " + attesa + " — trovate: " + coppie.join(", ")));

  /* L'esercizio vero: distretto come lo mostra l'app, serie, settimane,
   * articolazioni. */
  const hip = dati.esercizi.find((e) => e.nome === "Hip thrust");
  assert.equal(hip.distretto, "Glutei", "il distretto è il nome di quello che l'app mostra");
  assert.equal(hip.distrettoCodice, "G");
  assert.equal(hip.serie, 6, "le serie della prima settimana, come numero");
  assert.equal(hip.serieTesto, "6");
  assert.equal(hip.settimane, 8);
  assert.deepEqual(hip.articolazioni.principale, "anca");
  assert.deepEqual(hip.articolazioni.secondarie, ["ginocchio", "caviglia"]);
  assert.equal(hip.scheda.nome, "Scheda A");

  /* Quello che l'app non ha: null, non "" e non 0. */
  const mistero = dati.esercizi.find((e) => e.scheda.codice === "D" && e.nome === "Esercizio misterioso");
  assert.ok(mistero, "l'esercizio senza dati c'è lo stesso");
  assert.equal(mistero.distretto, null, "distretto sconosciuto: null");
  assert.equal(mistero.distrettoCodice, null);
  assert.equal(mistero.serie, null, "serie non scritta: null, non 0");
  assert.equal(mistero.serieTesto, null, "e nemmeno una stringa vuota");
  assert.equal(mistero.ripetizioni, null);
  assert.equal(mistero.settimane, null, "nessuna settimana: null, non 0");
  assert.equal(mistero.articolazioni, null, "nome fuori catalogo: articolazioni null, non un oggetto vuoto");

  /* Il nome del file: chiaro, con la data. */
  const nome = nomeFileEsportazione(dati.programma.nome, OGGI);
  assert.equal(nome, "Esercizi Barbell Diva B - 2026-11-28.json");
});

test("184.2 il tasto c'è, dice cosa scarica, e spento spiega perché (barra e Archivio)", () => {
  const dom = new JSDOM(readFileSync(join(radice, "desktop", "index.html"), "utf8"),
    { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
  const doc = dom.window.document;

  /* Programma letto: il tasto è vivo, accanto alle due stampe. */
  const box = doc.createElement("div");
  doc.body.appendChild(box);
  renderProgramma(doc, box, { presente: true }, {
    profilo: { presente: true, nome: "Barbell Diva B", durata: 8, giorni: 4, stato: "In corso", segno: "vivo", fase: "", inizio: "", descrizione: "", messaggio: "", aggiornato: "", id: "prg-b", archiviato: false },
    schede: GRUPPO.schede, archiviate: [],
    rotazione: { codici: ["A", "B", "C", "D"], registrata: true, fonte: "profilo" },
    codiciVisti: ["A", "B", "C", "D"],
    osservato: { righe: [], conCodice: 0, dentro: 0, fuori: 0, senzaData: 0, totale: 0 },
    settimane: [], esercizi: 8, modifica: null, prestazioni: {},
    progressioni: { id: "", custom: [] }
  });
  const vivi = Array.from(box.querySelectorAll('[data-esporta="1"]'));
  assert.ok(vivi.length > 0, "c'è almeno un «Esporta esercizi» nella pagina");
  vivi.forEach((b) => {
    assert.equal(b.textContent.trim(), "Esporta esercizi");
    assert.equal(b.disabled, false, "il tasto è vivo: esportare è una lettura");
    assert.match(b.getAttribute("aria-label"), /file JSON/);
    assert.match(b.getAttribute("aria-label"), /tutti gli esercizi delle schede/);
  });
  const barra = vivi[0].closest(".pr-bar");
  assert.ok(barra, "sta nella barra della scheda");
  const testi = Array.from(barra.querySelectorAll("button")).map((b) => b.textContent.trim());
  const iCompatta = testi.indexOf("Stampa Compatta");
  const iCompilare = testi.indexOf("Stampa da Compilare");
  const iEsporta = testi.indexOf("Esporta esercizi");
  assert.ok(iCompatta >= 0 && iCompilare >= 0 && iEsporta === iCompilare + 1,
    "è subito dopo le due stampe: " + testi.join(" · "));

  /* Programma non letto: spento, e il perché si legge. */
  const vuoto = doc.createElement("div");
  doc.body.appendChild(vuoto);
  renderProgramma(doc, vuoto, { presente: false }, {
    profilo: { presente: false, nome: "non registrato", durata: null, giorni: null, stato: "non registrato", segno: "vuoto", fase: "", inizio: "", descrizione: "", messaggio: "", aggiornato: "", id: "", archiviato: false },
    schede: [], archiviate: [], rotazione: { codici: [], registrata: false, fonte: "non registrato" },
    codiciVisti: [], osservato: { righe: [], conCodice: 0, dentro: 0, fuori: 0, senzaData: 0, totale: 0 },
    settimane: [], esercizi: null, modifica: null, prestazioni: {}, progressioni: null
  });
  const spento = vuoto.querySelector('[data-esporta="spento"]');
  assert.ok(spento, "con il programma non letto il tasto è quello spento");
  assert.equal(spento.disabled, true);
  assert.match(spento.getAttribute("aria-label"), /non è stato letto/);
  assert.match(spento.title, /non c'è niente da esportare/);

  /* Archivio: la stessa cosa sulla riga del programma. */
  const corpo = doc.createElement("tbody");
  doc.body.appendChild(corpo);
  renderArchivio(doc, corpo, {
    righe: [{ id: "prg-b", nome: "Barbell Diva B", attivo: true, schede: 4, esercizi: 8, serie: 38, sedute: 0, ultima: null, gruppo: GRUPPO, programma: {} }],
    esporta: () => {}
  });
  const inArchivio = corpo.querySelector('[data-esporta-programma="prg-b"]');
  assert.ok(inArchivio, "il tasto c'è anche in Archivio, sulla riga del programma");
  assert.equal(inArchivio.disabled, false);
  assert.match(inArchivio.getAttribute("aria-label"), /file JSON/);

  /* Archivio senza schede lette: spento e dichiarato. */
  const corpo2 = doc.createElement("tbody");
  doc.body.appendChild(corpo2);
  renderArchivio(doc, corpo2, {
    righe: [{ id: "prg-x", nome: "Programma non letto", attivo: false, schede: null, esercizi: null, serie: null, sedute: null, ultima: null, gruppo: null, programma: {} }],
    esporta: () => {}
  });
  const spentoArch = corpo2.querySelector('[data-esporta-programma="prg-x"]');
  assert.ok(spentoArch, "la riga senza schede ha il tasto spento");
  assert.equal(spentoArch.disabled, true);
  assert.match(spentoArch.getAttribute("aria-label"), /non sono state lette/);
});

/* ---------- il browser vero: il clic scarica davvero --------------------- */

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript",
  ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png" };

test("184.3 nel browser il clic scarica un file leggibile con tutte le schede", async () => {
  const server = createServer(async (req, res) => {
    try {
      const u = new URL(req.url, "http://x");
      let p = decodeURIComponent(u.pathname);
      if (p.endsWith("/")) p += "index.html";
      res.writeHead(200, { "content-type": MIME[extname(p)] || "application/octet-stream" });
      res.end(await readFile(join(radice, p)));
    } catch (e) { res.writeHead(404); res.end("no"); }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  let browser = null;
  let ultimo = null;
  for (const canale of ["chrome", "msedge", null]) {
    try { browser = await chromium.launch(canale ? { channel: canale } : {}); break; }
    catch (e) { ultimo = e; }
  }
  assert.ok(browser, "nessun browser per Playwright: " + (ultimo && ultimo.message));
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const errori = [];
  page.on("pageerror", (e) => errori.push(String((e && e.message) || e)));
  await page.route(/gstatic\.com/, (r) => r.abort());
  const cartella = await mkdtemp(join(tmpdir(), "esporta35-"));
  try {
    await page.goto("http://127.0.0.1:" + server.address().port + "/desktop/index.html",
      { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector("#pag-programma-1", { state: "attached", timeout: 20000 });
    /* Il velo dell'accesso copre la pagina e si mangia i clic: qui non serve
     * (si prova il tasto, non l'accesso). Come fa la guardia 180. */
    await page.evaluate(() => { const velo = document.getElementById("veloAccesso31"); if (velo) velo.remove(); });

    /* Il programma di prova, montato nella pagina vera con il suo tasto. */
    await page.evaluate(async (schede) => {
      const { renderProgramma } = await import("/comune/vista-programma.js");
      const box = document.createElement("div");
      box.id = "prova-esporta";
      document.body.appendChild(box);
      renderProgramma(document, box, { presente: true }, {
        profilo: { presente: true, nome: "Barbell Diva B", durata: 8, giorni: 4, stato: "In corso", segno: "vivo", fase: "", inizio: "", descrizione: "", messaggio: "", aggiornato: "", id: "prg-b", archiviato: false },
        schede: schede, archiviate: [],
        rotazione: { codici: ["A", "B", "C", "D"], registrata: true, fonte: "profilo" },
        codiciVisti: ["A", "B", "C", "D"],
        osservato: { righe: [], conCodice: 0, dentro: 0, fuori: 0, senzaData: 0, totale: 0 },
        settimane: [], esercizi: 8, modifica: null, prestazioni: {},
        progressioni: { id: "", custom: [] }
      });
    }, JSON.parse(JSON.stringify(GRUPPO.schede)));

    assert.equal(await page.locator('#prova-esporta [data-esporta="1"]').count(), 4,
      "un tasto per ogni scheda della pagina");

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 15000 }),
      page.locator('#prova-esporta [data-esporta="1"]').first().click()
    ]);
    const nome = download.suggestedFilename();
    assert.match(nome, /^Esercizi Barbell Diva B - \d{4}-\d{2}-\d{2}\.json$/,
      "il nome del file dice cosa contiene: " + nome);
    const percorso = join(cartella, nome);
    await download.saveAs(percorso);

    /* Il file scaricato è un JSON leggibile e ha dentro quello che serve. */
    const testoScaricato = await leggi(percorso, "utf8");
    const file = JSON.parse(testoScaricato);
    assert.equal(file.programma.nome, "Barbell Diva B");
    assert.deepEqual(file.programma.schede.map((s) => s.codice), ["A", "B", "C", "D"]);
    assert.equal(file.esercizi.length, 8);
    assert.ok(file.esercizi.some((e) => e.nome === "Hip thrust" && e.distretto === "Glutei"
      && e.serie === 6 && e.articolazioni && e.articolazioni.principale === "anca"),
      "Hip thrust con distretto, serie e articolazioni");
    assert.ok(file.esercizi.some((e) => e.nome === "Esercizio misterioso"
      && e.distretto === null && e.serie === null && e.articolazioni === null),
      "quello che l'app non sa resta null");
    assert.ok(!testoScaricato.includes("undefined"), "nessun undefined nel file scaricato");
    assert.equal(await download.failure(), null, "il download è andato a buon fine");

    /* Sotto il tasto si legge com'è andata, e la pagina non ha gridato. */
    assert.match(await page.locator("#prova-esporta .pr-esito").first().textContent(),
      /File scaricato: 8 esercizi da 4 schede/);
    const gravi = errori.filter((e) => !/gstatic|firebase|Firestore|permission|Failed to fetch/i.test(e));
    assert.deepEqual(gravi, [], "nessun errore di pagina: " + gravi.join(" | ").slice(0, 300));
  } finally {
    await page.close();
    await browser.close();
    await new Promise((r) => server.close(r));
  }
});
