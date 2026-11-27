/* Guardia 179 (passo 28, riscritta nel passo 29 il 27/11/2026) — il confronto
 * senza la tabella «Differenze» e con la finestra che usa tutto lo schermo.
 *
 * Alice, passo 28: «togli anche questo perché non mi serve» (la tabella
 * DIFFERENZE · scheda X · settimana Y). Passo 29: «è ancora troppo grande
 * all'interno di un riquadro piccolo, quindi o mi rimpicciolisci l'interno o mi
 * allarghi l'esterno» — la finestra si allarga e il dentro si compatta (le
 * righe visibili sono il doppio, misurate nella guardia 180).
 *
 *  179.1  la tabella Differenze non è più disegnata: niente `.pc-differenze`,
 *         niente titolo orfano, e subito dopo le due colonne arriva il blocco
 *         Volume (nessun buco al suo posto)
 *  179.2  la finestra dichiara i nuovi limiti del passo 29: min(1900px, 99vw)
 *         di larghezza, 96vh di altezza, non più di 100vh − 12px, margine
 *         interno stretto (10-12 px) e l'intestazione su una riga sola
 *  179.3  nel browser vero, a 1440, 1600 e 1680 px: la finestra sta dentro lo
 *         schermo con un margine ai lati, le due colonne restano affiancate con
 *         le intestazioni allineate, il corpo scorre dentro e la pagina sotto
 *         non si allunga (scrollHeight uguale prima e dopo l'apertura)
 *  179.4  il testo del corpo è compatto (11,6-12 px) e le righe sono 30-32 px,
 *         e i numeri non vanno a capo
 */

import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";
import { chromium } from "playwright";
import { ricostruisciSchede } from "../comune/schede-v2.js";
import { modelloConsultabile } from "../comune/programma-consultabile.js";
import { apriConfronto } from "../comune/vista-programma-consultabile.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagina = readFileSync(join(radice, "desktop", "index.html"), "utf8");
const css = pagina;

/* Una progressione come la scrive l'app: otto settimane, serie e ripetizioni
 * per settimana, il recupero nell'esercizio. */
const settimane = (serie, rip, rec) => Array.from({ length: 8 }, (_, i) => ({
  week: i + 1,
  sets: Array.isArray(serie) ? serie[i] : serie,
  reps: Array.isArray(rip) ? rip[i] : rip,
  rest: { seconds: rec },
  type: "normal", note: "", source: "manual"
}));
const ESE = (nome, muscolo, serie, rip, rec) => ({
  id: "ex-" + nome, name: nome, muscle: muscolo,
  prescription: {
    sets: Array.isArray(serie) ? serie[0] : serie,
    reps: { label: Array.isArray(rip) ? rip[0] : String(rip) },
    rest: { seconds: rec }
  },
  progression: { weeks: settimane(serie, rip, rec) }
});
const foglio = (pid, code, nome, esercizi) => ({
  id: "program-v2-sheet-" + pid + "__sh-" + code,
  dati: { programId: pid, sheetId: "sh-" + code, kind: "sheet", versione: 1,
    sheet: { id: "sh-" + code, code: code, name: nome, exercises: esercizi } }
});

const CONSULTATO = { id: "prg-vecchio", name: "B_program_1", status: "archived",
  startDate: "2026-05-04", durationWeeks: 8, daysPerWeek: 4, rotation: ["A", "D"] };
const IN_USO = { id: "prg-uso", name: "Intensita_ottobre_dicembre", status: "active", active: true,
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, rotation: ["A", "D"] };

/* Nomi lunghi apposta: sono quelli veri («Lat machine presa neutra», «Pressa45°
 * piedi alti») e sono il caso in cui il testo va a capo o esce dalla colonna. */
const DOCS = [
  foglio("prg-vecchio", "A", "Scheda A", [
    ESE("Hip thrust", "Glutei", [5, 5, 6, 6, 5, 6, 7, 6], "10", 120),
    ESE("Alzate laterali cavo basso", "Spalle", [4, 4, 5, 4, 5, 5, 4, 5], "12", 60),
    ESE("Lat machine presa neutra", "Dorsali", [3, 3, 4, 4, 4, 5, 4, 5], "12", 90),
    ESE("Leg curl", "Femorali", [3, 3, 3, 4, 4, 4, 3, 4], "12", 90)
  ]),
  foglio("prg-vecchio", "D", "Scheda D", [
    ESE("Pressa45 piedi alti", "Glutei", [5, 5, 6, 6, 7, 7, 7, 8], "12", 120),
    ESE("Calf raise", "Polpacci", [3, 3, 4, 4, 4, 4, 4, 5], "15", 45)
  ]),
  foglio("prg-uso", "A", "Scheda A", [
    ESE("Hip thrust", "Glutei", [6, 6, 7, 6, 7, 7, 8, 7], "10", 120),
    ESE("Alzate laterali cavo basso", "Spalle", [4, 5, 5, 5, 6, 6, 6, 6], "12", 60),
    ESE("Lat machine presa neutra", "Dorsali", [5, 5, 6, 6, 7, 7, 7, 8], "10", 90),
    ESE("Leg curl", "Femorali", [3, 3, 3, 3, 3, 3, 3, 3], "12", 90)
  ]),
  foglio("prg-uso", "D", "Scheda D", [
    ESE("Bulgaro focus glutei", "Gluteo medio", [4, 4, 5, 5, 6, 6, 6, 7], "8-10", 150),
    ESE("Tricipiti cavo", "Tricipiti", [5, 5, 5, 6, 6, 6, 7, 7], "12", 60)
  ])
];
const SCHEDE = ricostruisciSchede(DOCS);

function scena() {
  const dom = new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
  const doc = dom.window.document;
  const modale = apriConfronto(doc, {
    consultato: { modello: modelloConsultabile(CONSULTATO, SCHEDE.perProgramma["prg-vecchio"]),
      gruppo: SCHEDE.perProgramma["prg-vecchio"] },
    inUso: { modello: modelloConsultabile(IN_USO, SCHEDE.perProgramma["prg-uso"]),
      gruppo: SCHEDE.perProgramma["prg-uso"] },
    onSalvaCome: null
  });
  return { dom, doc, modale };
}

test("179.1 la tabella Differenze non c'è più, e al suo posto non resta un buco", () => {
  const { doc } = scena();
  assert.equal(doc.querySelector(".pc-differenze"), null, "la sezione .pc-differenze non è disegnata");
  assert.equal(doc.querySelector(".pc-diff-t"), null, "non resta il titolo della tabella");
  assert.equal(doc.querySelector(".pc-diff-tab"), null, "non resta la tabella");
  assert.equal(doc.querySelector(".pc-diff-riga"), null, "non restano le righe");
  const testi = Array.from(doc.querySelectorAll(".pc-corpo-confronto *"))
    .filter((e) => /^\s*differenze\b/i.test(e.textContent) && !e.children.length);
  assert.deepEqual(testi, [], "nessun testo «DIFFERENZE» orfano nel corpo della finestra");

  /* Dopo le due colonne (e l'eventuale nota sulle righe accoppiate) il primo
   * blocco è il Volume: non c'è nessun vuoto al posto della tabella. */
  const duetto = doc.querySelector(".pc-duetto");
  let dopo = duetto.nextElementSibling;
  if (dopo && dopo.classList.contains("pc-nota-posizione")) dopo = dopo.nextElementSibling;
  assert.ok(dopo, "dopo le colonne c'è qualcosa");
  assert.ok(dopo.classList.contains("pc-volume-sett"),
    "il primo blocco dopo le colonne è il Volume, non un buco: " + dopo.className);
  const primoTitolo = dopo.querySelector(".pc-vol-t");
  assert.match(primoTitolo.textContent, /volume per distretto/i, "e ha il suo titolo, non quello di un'altra sezione");

  /* Il volume è ancora quello del passo 27: non è stato toccato se non per il
   * testo più grande. */
  assert.ok(dopo.querySelector(".pc-vol2-barra"), "selettore settimane e modi c'è");
  assert.ok(dopo.querySelector(".pc-vol2-chi-riga"), "le due righe A/B ci sono");
  assert.ok(dopo.querySelector(".pc-vol2-kpi"), "i riquadri in alto ci sono");
});

test("179.2 la finestra dichiara i nuovi limiti e il suo respiro interno", () => {
  const regolaBox = /\.pc-modale \.pc-box-confronto\{([^}]*)\}/.exec(css);
  assert.ok(regolaBox, "la regola della finestra c'è");
  const regola = regolaBox[1];
  assert.match(regola, /width:\s*min\(1900px,\s*99vw\)/, "larga 1900 px al massimo, 99vw di schermo");
  assert.match(regola, /height:\s*96vh/, "alta 96vh");
  assert.match(regola, /max-height:\s*calc\(100vh\s*-\s*12px\)/, "e mai oltre 100vh − 12px");
  assert.match(regola, /overflow:\s*hidden/, "la scatola non scorre: scorre il corpo");
  /* La finestra passa sopra ai galleggianti (Diva e lampadina del tema), che
   * coprivano la colonna «REC.» e la ×. */
  const regolaModale = /\.pc-modale-confronto\{([^}]*)\}/.exec(css);
  assert.ok(regolaModale, "la regola della modale del confronto c'è");
  assert.match(regolaModale[1], /z-index:\s*\d+\s*!important/, "la finestra sta sopra ai galleggianti");

  const respiro = (selettore) => {
    const fuga = selettore.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const r = new RegExp(fuga + "\\{([^}]*)\\}").exec(css);
    assert.ok(r, "la regola " + selettore + " c'è");
    /* il primo valore può essere lo zero senza unità (`padding:0 12px 8px`) */
    const m = /padding:\s*(0|[\d.]+px)\s+([\d.]+)px(?:\s+([\d.]+)px)?(?:\s+([\d.]+)px)?/.exec(r[1]);
    assert.ok(m, selettore + " dichiara un padding");
    return { sopra: parseFloat(m[1]), lato: Number(m[2]) };
  };
  const testa = respiro(".pc-finestra-testa");
  const corpo = respiro(".pc-corpo-confronto");
  const piede = respiro(".pc-piede");
  [["testa", testa], ["corpo", corpo], ["piede", piede]].forEach(([nome, r]) => {
    assert.ok(r.lato >= 10 && r.lato <= 14,
      "margine interno stretto ma vero nella " + nome + " (10-12 px): " + r.lato + " px");
  });
  /* Sopra il corpo non c'è respiro: l'intestazione ferma della tabella si
   * appoggia al bordo, altrimenti le righe che scorrono si vedono a fette. */
  assert.equal(corpo.sopra, 0, "nessun margine sopra il corpo (l'intestazione si appoggia al bordo)");

  /* Le barre ferme in cima hanno lo stesso margine stretto delle altre fasce. */
  ["\.pc-settimane", "\.pc-schede-tab"].forEach((sel) => {
    const r = new RegExp("\\" + sel + "\\{([^}]*)\\}").exec(css);
    const m = /padding:\s*[\d.]+px\s+([\d.]+)px/.exec(r[1]);
    assert.ok(m && Number(m[1]) >= 10 && Number(m[1]) <= 14,
      "margine interno in " + sel + ": " + (m && m[1]) + " px");
  });

  /* Passo 29 — l'intestazione sta su una riga: titolo, i due nomi e «Settimana
   * N · Scheda X» sono fratelli in fila. */
  const sinistra = /\.pc-finestra-sinistra\{([^}]*)\}/.exec(css);
  assert.ok(sinistra, "la regola della testa (parte sinistra) c'è");
  assert.match(sinistra[1], /display:\s*flex/, "la testa è una fila");
  assert.match(sinistra[1], /flex-wrap:\s*wrap/, "che va a capo solo se non ci sta");
  const nomi = /\.pc-nomi\{([^}]*)\}/.exec(css);
  assert.match(nomi[1], /flex-direction:\s*row/, "i due nomi sono in fila, non uno sopra l'altro");
  const regolaTesta = /\.pc-finestra-testa\{([^}]*)\}/.exec(css);
  assert.ok(regolaTesta, "la regola della testa c'è");
  assert.match(regolaTesta[1], /align-items:\s*center/, "e tutto è allineato sulla stessa riga");

  /* Il corpo scorre dentro, la pagina sotto no. */
  const regolaCorpo = /\.pc-corpo-confronto\{([^}]*)\}/.exec(css)[1];
  assert.match(regolaCorpo, /overflow:\s*auto/);
  assert.match(regolaCorpo, /min-height:\s*0/);

  const { dom, doc } = scena();
  assert.equal(dom.window.getComputedStyle(doc.querySelector(".pc-modale")).position, "fixed",
    "la finestra è un pannello fisso: la pagina sotto non si muove");
});

/* ---------- il browser vero: le misure che jsdom non sa dare ---------- */

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript",
  ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png" };
let server = null;
let browser = null;
let page = null;
let base = "";

async function apriConfrontoVero() {
  await page.evaluate(async () => {
    const { ricostruisciSchede } = await import("/comune/schede-v2.js");
    const { modelloConsultabile } = await import("/comune/programma-consultabile.js");
    const { apriConfronto } = await import("/comune/vista-programma-consultabile.js");
    const settimane = (serie, rip, rec) => Array.from({ length: 8 }, (_, i) => ({
      week: i + 1, sets: Array.isArray(serie) ? serie[i] : serie,
      reps: Array.isArray(rip) ? rip[i] : rip, rest: { seconds: rec }, type: "normal", note: "", source: "manual"
    }));
    const ESE = (nome, muscolo, serie, rip, rec) => ({
      id: "ex-" + nome, name: nome, muscle: muscolo,
      prescription: {
        sets: Array.isArray(serie) ? serie[0] : serie,
        reps: { label: Array.isArray(rip) ? rip[0] : String(rip) }, rest: { seconds: rec }
      },
      progression: { weeks: settimane(serie, rip, rec) }
    });
    const foglio = (pid, code, nome, esercizi) => ({
      id: "program-v2-sheet-" + pid + "__sh-" + code,
      dati: { programId: pid, sheetId: "sh-" + code, kind: "sheet", versione: 1,
        sheet: { id: "sh-" + code, code: code, name: nome, exercises: esercizi } }
    });
    const A = { id: "prg-a", name: "B_program_1", status: "archived", startDate: "2026-05-04",
      durationWeeks: 8, daysPerWeek: 4, rotation: ["A", "D"] };
    const B = { id: "prg-b", name: "Intensita_ottobre_dicembre", status: "active", active: true,
      startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, rotation: ["A", "D"] };
    const DOCS = [
      foglio("prg-a", "A", "Scheda A", [
        ESE("Hip thrust", "Glutei", [5, 5, 6, 6, 5, 6, 7, 6], "10", 120),
        ESE("Alzate laterali cavo basso", "Spalle", [4, 4, 5, 4, 5, 5, 4, 5], "12", 60),
        ESE("Lat machine presa neutra", "Dorsali", [3, 3, 4, 4, 4, 5, 4, 5], "12", 90),
        ESE("Leg curl", "Femorali", [3, 3, 3, 4, 4, 4, 3, 4], "12", 90)]),
      foglio("prg-a", "D", "Scheda D", [
        ESE("Pressa45 piedi alti", "Glutei", [5, 5, 6, 6, 7, 7, 7, 8], "12", 120),
        ESE("Calf raise", "Polpacci", [3, 3, 4, 4, 4, 4, 4, 5], "15", 45)]),
      foglio("prg-b", "A", "Scheda A", [
        ESE("Hip thrust", "Glutei", [6, 6, 7, 6, 7, 7, 8, 7], "10", 120),
        ESE("Alzate laterali cavo basso", "Spalle", [4, 5, 5, 5, 6, 6, 6, 6], "12", 60),
        ESE("Lat machine presa neutra", "Dorsali", [5, 5, 6, 6, 7, 7, 7, 8], "10", 90),
        ESE("Leg curl", "Femorali", [3, 3, 3, 3, 3, 3, 3, 3], "12", 90)]),
      foglio("prg-b", "D", "Scheda D", [
        ESE("Bulgaro focus glutei", "Gluteo medio", [4, 4, 5, 5, 6, 6, 6, 7], "8-10", 150),
        ESE("Tricipiti cavo", "Tricipiti", [5, 5, 5, 6, 6, 6, 7, 7], "12", 60)])
    ];
    const s = ricostruisciSchede(DOCS);
    apriConfronto(document, {
      consultato: { modello: modelloConsultabile(A, s.perProgramma["prg-a"]), gruppo: s.perProgramma["prg-a"] },
      inUso: { modello: modelloConsultabile(B, s.perProgramma["prg-b"]), gruppo: s.perProgramma["prg-b"] },
      onSalvaCome: null
    });
  });
  await page.waitForTimeout(350);
}

async function misuraA(vw) {
  await page.setViewportSize({ width: vw, height: 1000 });
  await page.waitForTimeout(150);
  const prima = await page.evaluate(() => document.documentElement.scrollHeight);
  await apriConfrontoVero();
  const m = await page.evaluate(() => {
    const box = document.querySelector(".pc-modale .pc-box-confronto").getBoundingClientRect();
    const a = document.querySelector(".pc-col-a").getBoundingClientRect();
    const b = document.querySelector(".pc-col-b").getBoundingClientRect();
    const ta = document.querySelector(".pc-col-a .pc-col-testa").getBoundingClientRect();
    const tb = document.querySelector(".pc-col-b .pc-col-testa").getBoundingClientRect();
    const corpo = document.querySelector(".pc-corpo-confronto");
    const numeri = Array.from(document.querySelectorAll(".pc-col-tab td.pc-n"));
    return {
      dopo: document.documentElement.scrollHeight,
      box: { x: box.x, y: box.y, w: box.width, h: box.height, destra: window.innerWidth - box.right },
      colonne: {
        affiancate: a.right <= b.left + 1,
        stessoTop: Math.abs(a.top - b.top) < 1.5,
        larghezzePari: Math.abs(a.width - b.width) < 2,
        dentroFinestra: a.left >= box.left && b.right <= box.right + 0.5
      },
      testeAllineate: Math.abs(ta.top - tb.top) < 1.5,
      corpo: {
        scorre: corpo.scrollHeight > corpo.clientHeight + 20,
        cliente: corpo.clientHeight,
        contenuto: corpo.scrollHeight,
        paddingSx: parseFloat(getComputedStyle(corpo).paddingLeft),
        paddingDx: parseFloat(getComputedStyle(corpo).paddingRight)
      },
      numeriANastro: numeri.every((td) => getComputedStyle(td).whiteSpace === "nowrap"
        && td.scrollWidth <= td.clientWidth + 1),
      fontRiga: parseFloat(getComputedStyle(document.querySelector(".pc-col-tab td.pc-nome b")).fontSize),
      altezzaRiga: document.querySelector(".pc-col-tab td").getBoundingClientRect().height,
      tavolaDifferenze: document.querySelectorAll(".pc-differenze, .pc-diff-t, .pc-diff-tab").length
    };
  });
  await page.evaluate(() => { const m = document.querySelector(".pc-modale"); if (m) m.remove(); });
  await page.waitForTimeout(120);
  return { prima, ...m };
}

test("179.3 a 1440, 1600 e 1680 px: finestra dentro lo schermo, colonne affiancate, pagina ferma", async () => {
  server = createServer(async (req, res) => {
    try {
      const u = new URL(req.url, "http://x");
      let p = decodeURIComponent(u.pathname);
      if (p.endsWith("/")) p += "index.html";
      res.writeHead(200, { "content-type": MIME[extname(p)] || "application/octet-stream" });
      res.end(await readFile(join(radice, p)));
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
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errori = [];
  page.on("pageerror", (e) => errori.push(String((e && e.message) || e)));
  await page.route(/gstatic\.com/, (r) => r.abort());
  await page.goto(base + "/desktop/index.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector("#pag-programma-1", { state: "attached", timeout: 20000 });
  await page.waitForTimeout(1200);
  /* Il velo dell'accesso e la Diva coprirebbero la finestra: qui servono le
   * misure, e non si tocca niente nel codice. */
  await page.evaluate(() => {
    const velo = document.getElementById("veloAccesso31");
    if (velo) velo.remove();
    const diva = document.getElementById("bd-diva");
    if (diva) diva.style.display = "none";
  });

  for (const vw of [1440, 1600, 1680]) {
    const m = await misuraA(vw);
    assert.equal(m.dopo, m.prima,
      "a " + vw + " px la pagina sotto non si allunga: " + m.prima + " → " + m.dopo);
    /* Passo 29: 99vw, ma la modale tiene 8 px di margine per lato. */
    const attesa = Math.min(1900, vw * 0.99, vw - 16);
    assert.ok(Math.abs(m.box.w - attesa) <= 2,
      "a " + vw + " px la finestra è larga " + Math.round(m.box.w) + " px (attesa " + Math.round(attesa) + ")");
    assert.ok(m.box.x >= 7, "a " + vw + " px resta un margine a sinistra: " + Math.round(m.box.x) + " px");
    assert.ok(m.box.destra >= 7, "e a destra: " + Math.round(m.box.destra) + " px");
    assert.ok(m.box.h <= 960 + 1, "a " + vw + " px non esce in basso: alta " + Math.round(m.box.h) + " px");
    assert.ok(m.box.h >= 940, "e usa lo schermo: " + Math.round(m.box.h) + " px su 1000");

    assert.ok(m.colonne.affiancate, "a " + vw + " px le due colonne restano affiancate");
    assert.ok(m.colonne.stessoTop, "a " + vw + " px partono dalla stessa riga");
    assert.ok(m.colonne.larghezzePari, "a " + vw + " px hanno la stessa larghezza");
    assert.ok(m.colonne.dentroFinestra, "a " + vw + " px stanno dentro la finestra");
    assert.ok(m.testeAllineate, "a " + vw + " px le intestazioni sono allineate");

    assert.ok(m.corpo.scorre,
      "a " + vw + " px il corpo scorre dentro (" + m.corpo.contenuto + " px di contenuto in " + m.corpo.cliente + ")");
    assert.ok(m.corpo.paddingSx >= 10 && m.corpo.paddingDx >= 10,
      "a " + vw + " px il testo non tocca i bordi: " + m.corpo.paddingSx + " px");
    assert.ok(m.numeriANastro, "a " + vw + " px i numeri non vanno a capo");
    assert.equal(m.tavolaDifferenze, 0, "a " + vw + " px la tabella Differenze non c'è");
    assert.ok(m.fontRiga >= 11.6 && m.fontRiga <= 12.4,
      "a " + vw + " px il nome dell'esercizio è compatto e leggibile: " + m.fontRiga + " px");
    assert.ok(m.altezzaRiga >= 30 && m.altezzaRiga <= 34,
      "a " + vw + " px le righe sono compatte (30-32 px): " + Math.round(m.altezzaRiga) + " px");
  }
  const gravi = errori.filter((e) => !/gstatic|firebase|Firestore|permission|Failed to fetch/i.test(e));
  assert.deepEqual(gravi, [], "nessun errore di pagina che non sia la SDK bloccata: " + gravi.join(" | ").slice(0, 300));

  /* Le risorse del test si chiudono qui: un browser aperto terrebbe in vita la
   * corsa e la suite non finirebbe mai. */
  await page.close();
  await browser.close();
  await new Promise((r) => server.close(r));
  page = null; browser = null; server = null;
});

test("179.4 il testo del confronto è compatto (11,6-12 px) e le righe sono 30-32 px", () => {
  const regolaTab = /\.pc-col-tab\{([^}]*)\}/.exec(css)[1];
  const corpo = Number(/font-size:\s*([\d.]+)px/.exec(regolaTab)[1]);
  assert.ok(corpo >= 11.6 && corpo <= 12.2, "il corpo del confronto è a " + corpo + " px (passo 29: 11,6-12)");
  assert.match(regolaTab, /table-layout:\s*fixed/, "la tabella ha le colonne fissate: il contenuto non la allarga");
  const regolaCelle = /\.pc-col-tab td\{([^}]*)\}/.exec(css)[1];
  const altezza = Number(/height:\s*(\d+)px/.exec(regolaCelle)[1]);
  assert.ok(altezza >= 30 && altezza <= 32, "le righe sono alte " + altezza + " px (passo 29: 30-32)");
  const padCelle = /padding:\s*([\d.]+)px\s+([\d.]+)px/.exec(regolaCelle);
  assert.ok(padCelle && Number(padCelle[1]) >= 3 && Number(padCelle[1]) <= 4,
    "le celle respirano 3-4 px in verticale, non 8: " + (padCelle && padCelle[1]) + " px");
  const nome = Number(/font-size:\s*([\d.]+)px/.exec(/\.pc-col-tab td\.pc-nome b\{([^}]*)\}/.exec(css)[1])[1]);
  assert.ok(nome >= 12 && nome <= 12.4, "il nome dell'esercizio è a " + nome + " px (passo 29: 12,2)");
  const numero = Number(/font-size:\s*([\d.]+)px/.exec(/\.pc-col-tab \.pc-n\{([^}]*)\}/.exec(css)[1])[1]);
  assert.ok(numero >= 11.2 && numero <= 11.6, "i numeri sono a " + numero + " px (passo 29: 11,4)");

  /* L'intestazione della tabella resta ferma in cima allo scorrimento. */
  const th = /\.pc-col-tab thead th\{([^}]*)\}/.exec(css);
  assert.ok(th, "la regola dell'intestazione ferma c'è");
  assert.match(th[1], /position:\s*sticky/, "ESERCIZIO / SERIE / RIP. / REC. restano in cima");
  assert.match(th[1], /top:\s*0/, "appoggiate al bordo dello scorrimento");
  assert.match(th[1], /background:/, "con lo sfondo pieno: le righe non si vedono attraverso");

  /* Il blocco Volume: struttura del passo 27 intatta, solo le misure compatte. */
  const volNome = Number(/font-size:\s*([\d.]+)px/.exec(/\.pc-vol2-nome\{([^}]*)\}/.exec(css)[1])[1]);
  assert.ok(volNome >= 11.8 && volNome <= 12.2, "i distretti del Volume sono a " + volNome + " px");
  const volDelta = Number(/font:\s*\d+\s+([\d.]+)px/.exec(/\.pc-vol2-delta b\{([^}]*)\}/.exec(css)[1])[1]);
  assert.ok(volDelta >= 12 && volDelta <= 12.4, "il Δ del Volume è a " + volDelta + " px");
});
