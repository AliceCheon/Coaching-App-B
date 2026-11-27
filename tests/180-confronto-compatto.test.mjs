/* Guardia 180 (passo 29, 27/11/2026) — il confronto alla misura di Alice:
 * 1905×813, largo e basso.
 *
 * Alice, terza volta sulla stessa finestra: «è ancora troppo grande all'interno
 * di un riquadro piccolo, quindi o mi rimpicciolisci l'interno o mi allarghi
 * l'esterno perché non riesco a vedere bene così» (msg 12769511, screen
 * /tmp/dentro1.png). Il passo 28 aveva ingrandito il testo: sbagliato. Qui si
 * misura la cosa che le serve — QUANTO se ne vede.
 *
 *  180.1  la tabella ha le colonne fissate e proporzionali (ESERCIZIO grande,
 *         SERIE/RIP./REC. strette), le due colonne del confronto possono
 *         stringersi (min-width:0) e l'intestazione è ferma in cima
 *  180.2  a 1905×813, nel browser vero: due colonne affiancate, la colonna
 *         «REC.» dentro la finestra in tutte e due, NESSUNO scorrimento
 *         orizzontale (scrollWidth <= clientWidth + 1), la pagina sotto non
 *         cambia altezza e le righe di esercizi visibili sono almeno il doppio
 *         di prima (PRIMA 8, ADESSO 18 sulla stessa scheda di 25 righe)
 *  180.3  la stessa cosa a 1440×900 e 1280×800: colonne affiancate, REC dentro,
 *         niente scorrimento orizzontale, pagina ferma
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
const css = readFileSync(join(radice, "desktop", "index.html"), "utf8");

/* Venticinque esercizi veri (i nomi sono quelli delle sue schede): con meno
 * righe la misura si fermerebbe al fondo della scheda e non direbbe niente
 * sulla finestra. */
const ELENCO = [
  ["Hip thrust", "Glutei", 6, "10", 120],
  ["Alzate laterali cavo basso", "Spalle", 4, "12", 60],
  ["Lat machine presa neutra", "Dorsali", 4, "12", 90],
  ["Leg curl", "Femorali", 3, "12", 90],
  ["Pressa45 piedi alti", "Glutei", 6, "12", 120],
  ["Calf raise", "Polpacci", 4, "15", 45],
  ["Bulgaro focus glutei", "Glutei", 5, "8-10", 150],
  ["Tricipiti cavo", "Tricipiti", 5, "12", 60],
  ["Pulley basso", "Centro schiena", 4, "12", 90],
  ["Curl bilanciere", "Bicipiti", 3, "12", 75],
  ["Affondo front squat machine", "Quadricipiti", 4, "10", 120],
  ["Slanci laterali cavo basso", "Glutei", 3, "15", 45],
  ["Pulldown presa larga", "Dorsali", 4, "10", 90],
  ["Chest press", "Pettorali", 4, "10", 90],
  ["Stacco rumeno", "Femorali", 4, "8", 120],
  ["Lento avanti manubri", "Spalle", 3, "10", 75],
  ["Leg extension", "Quadricipiti", 3, "12", 60],
  ["Hip abduction machine", "Glutei", 4, "15", 45],
  ["Curl a martello", "Bicipiti", 3, "12", 60],
  ["Pushdown corda", "Tricipiti", 3, "12", 60],
  ["Rematore manubrio", "Centro schiena", 4, "10", 90],
  ["Crunch inverso", "Addominali", 3, "15", 45],
  ["Abductor in piedi", "Glutei", 3, "15", 45],
  ["Panca piana manubri", "Pettorali", 4, "10", 90],
  ["Tirate al mento", "Spalle", 3, "12", 60]
];

const settimane = (serie, rip, rec) => Array.from({ length: 8 }, (_, i) => ({
  week: i + 1, sets: serie, reps: rip, rest: { seconds: rec },
  type: "normal", note: "", source: "manual"
}));
const ESE = ([nome, muscolo, serie, rip, rec], inPiu) => ({
  id: "ex-" + nome, name: nome, muscle: muscolo,
  prescription: { sets: serie + inPiu, reps: { label: rip }, rest: { seconds: rec } },
  progression: { weeks: settimane(serie + inPiu, rip, rec) }
});
const foglio = (pid, code, nome, esercizi) => ({
  id: "program-v2-sheet-" + pid + "__sh-" + code,
  dati: { programId: pid, sheetId: "sh-" + code, kind: "sheet", versione: 1,
    sheet: { id: "sh-" + code, code: code, name: nome, exercises: esercizi } }
});
const A = { id: "prg-a", name: "Intensita_agosto_ottobre", status: "archived",
  startDate: "2026-05-04", durationWeeks: 8, daysPerWeek: 4, rotation: ["A", "D"] };
const B = { id: "prg-b", name: "Intensita_ottobre_dicembre", status: "active", active: true,
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, rotation: ["A", "D"] };
const DOCS = [
  foglio("prg-a", "A", "Scheda A", ELENCO.map((e) => ESE(e, 0))),
  foglio("prg-a", "D", "Scheda D", ELENCO.slice(0, 6).map((e) => ESE(e, 0))),
  foglio("prg-b", "A", "Scheda A", ELENCO.map((e) => ESE(e, 1))),
  foglio("prg-b", "D", "Scheda D", ELENCO.slice(0, 6).map((e) => ESE(e, 1)))
];
const SCHEDE = ricostruisciSchede(DOCS);

test("180.1 colonne fissate e proporzionali, colonne che si stringono, testa ferma", () => {
  const dom = new JSDOM(readFileSync(join(radice, "desktop", "index.html"), "utf8"),
    { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
  const doc = dom.window.document;
  apriConfronto(doc, {
    consultato: { modello: modelloConsultabile(A, SCHEDE.perProgramma["prg-a"]),
      gruppo: SCHEDE.perProgramma["prg-a"] },
    inUso: { modello: modelloConsultabile(B, SCHEDE.perProgramma["prg-b"]),
      gruppo: SCHEDE.perProgramma["prg-b"] },
    onSalvaCome: null
  });

  const tab = doc.querySelector(".pc-col-a .pc-col-tab");
  const colonne = Array.from(tab.querySelectorAll("colgroup col"))
    .map((c) => c.getAttribute("style"));
  assert.equal(colonne.length, 4, "quattro colonne: esercizio, serie, rip., rec.");
  assert.ok(colonne.every((s) => /width:\s*\d+%/.test(s)),
    "larghezze proporzionali in percentuale, non px fissi: " + colonne.join(" "));
  const percentuali = colonne.map((s) => Number(/(\d+)%/.exec(s)[1]));
  assert.ok(percentuali[0] >= 55, "l'esercizio si prende la maggior parte: " + percentuali[0] + "%");
  assert.ok(percentuali.slice(1).every((p) => p >= 9 && p <= 16),
    "serie/rip./rec. restano strette ma leggibili: " + percentuali.slice(1).join(" / "));
  assert.equal(percentuali.reduce((a, b) => a + b, 0), 100, "e insieme fanno tutta la tabella");

  /* Le due colonne del confronto possono stringersi: niente larghezza minima
   * che spinga la tabella fuori dalla finestra. */
  const regolaCol = /\.pc-col\{([^}]*)\}/.exec(css)[1];
  assert.match(regolaCol, /min-width:\s*0/, "la colonna può stringersi: min-width 0");
  const regolaDuetto = /\.pc-duetto\{([^}]*)\}/.exec(css)[1];
  assert.match(regolaDuetto, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*1fr\)/,
    "due colonne uguali, entrambe stringibili");
  assert.match(regolaDuetto, /overflow:\s*clip/,
    "il ritaglio degli angoli non crea un contenitore che scorre (l'intestazione ferma si sgancerebbe)");
});

/* ---------- il browser vero: la sua misura ---------- */

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript",
  ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png" };

async function apri(page) {
  await page.evaluate(async (ELENCO) => {
    const { ricostruisciSchede } = await import("/comune/schede-v2.js");
    const { modelloConsultabile } = await import("/comune/programma-consultabile.js");
    const { apriConfronto } = await import("/comune/vista-programma-consultabile.js");
    const settimane = (serie, rip, rec) => Array.from({ length: 8 }, (_, i) => ({
      week: i + 1, sets: serie, reps: rip, rest: { seconds: rec }, type: "normal", note: "", source: "manual"
    }));
    const ESE = ([nome, muscolo, serie, rip, rec], inPiu) => ({
      id: "ex-" + nome, name: nome, muscle: muscolo,
      prescription: { sets: serie + inPiu, reps: { label: rip }, rest: { seconds: rec } },
      progression: { weeks: settimane(serie + inPiu, rip, rec) }
    });
    const foglio = (pid, code, nome, esercizi) => ({
      id: "program-v2-sheet-" + pid + "__sh-" + code,
      dati: { programId: pid, sheetId: "sh-" + code, kind: "sheet", versione: 1,
        sheet: { id: "sh-" + code, code: code, name: nome, exercises: esercizi } }
    });
    const A = { id: "prg-a", name: "Intensita_agosto_ottobre", status: "archived",
      startDate: "2026-05-04", durationWeeks: 8, daysPerWeek: 4, rotation: ["A", "D"] };
    const B = { id: "prg-b", name: "Intensita_ottobre_dicembre", status: "active", active: true,
      startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, rotation: ["A", "D"] };
    const DOCS = [
      foglio("prg-a", "A", "Scheda A", ELENCO.map((e) => ESE(e, 0))),
      foglio("prg-a", "D", "Scheda D", ELENCO.slice(0, 6).map((e) => ESE(e, 0))),
      foglio("prg-b", "A", "Scheda A", ELENCO.map((e) => ESE(e, 1))),
      foglio("prg-b", "D", "Scheda D", ELENCO.slice(0, 6).map((e) => ESE(e, 1)))
    ];
    const s = ricostruisciSchede(DOCS);
    apriConfronto(document, {
      consultato: { modello: modelloConsultabile(A, s.perProgramma["prg-a"]), gruppo: s.perProgramma["prg-a"] },
      inUso: { modello: modelloConsultabile(B, s.perProgramma["prg-b"]), gruppo: s.perProgramma["prg-b"] },
      onSalvaCome: null
    });
  }, ELENCO);
  await page.waitForTimeout(350);
}

/* Quante righe di esercizi entrano nella finestra, scorrendo la scheda fino in
 * cima alla tabella (come fa Alice quando guarda la scheda). */
async function misura(page, vw, vh) {
  await page.setViewportSize({ width: vw, height: vh });
  await page.waitForTimeout(150);
  const prima = await page.evaluate(() => document.documentElement.scrollHeight);
  await apri(page);
  await page.evaluate(() => {
    const corpo = document.querySelector(".pc-corpo-confronto");
    const tab = document.querySelector(".pc-col-a .pc-col-tab");
    corpo.scrollTop += Math.max(0, tab.getBoundingClientRect().top
      - corpo.getBoundingClientRect().top - 2);
  });
  await page.waitForTimeout(200);
  const m = await page.evaluate(() => {
    const box = document.querySelector(".pc-modale .pc-box-confronto").getBoundingClientRect();
    const corpo = document.querySelector(".pc-corpo-confronto");
    const c = corpo.getBoundingClientRect();
    const a = document.querySelector(".pc-col-a").getBoundingClientRect();
    const b = document.querySelector(".pc-col-b").getBoundingClientRect();
    const conta = (sel) => Array.from(document.querySelectorAll(sel + " tbody tr")).filter((tr) => {
      const r = tr.getBoundingClientRect();
      return r.height > 0 && r.top >= c.top - 1 && r.bottom <= c.bottom + 1;
    }).length;
    const rec = (sel) => Array.from(document.querySelectorAll(sel + " thead th"))
      .filter((th) => /rec/i.test(th.textContent))[0];
    const dentro = (el, limite) => {
      const r = el.getBoundingClientRect();
      return r.left >= limite.left - 0.5 && r.right <= limite.right + 0.5;
    };
    return {
      finestra: { w: Math.round(box.width), h: Math.round(box.height),
        x: Math.round(box.x), destra: Math.round(window.innerWidth - box.right) },
      colonne: { affiancate: a.right <= b.left + 1, dentro: a.left >= box.left && b.right <= box.right + 0.5 },
      scorrimento: {
        corpo: [corpo.scrollWidth, corpo.clientWidth],
        scatola: [document.querySelector(".pc-box-confronto").scrollWidth,
          document.querySelector(".pc-box-confronto").clientWidth]
      },
      recDentro: { a: dentro(rec(".pc-col-a"), box), b: dentro(rec(".pc-col-b"), box) },
      recNellaTabella: {
        a: rec(".pc-col-a").getBoundingClientRect().right
          <= document.querySelector(".pc-col-a .pc-col-tab").getBoundingClientRect().right + 0.5,
        b: rec(".pc-col-b").getBoundingClientRect().right
          <= document.querySelector(".pc-col-b .pc-col-tab").getBoundingClientRect().right + 0.5
      },
      righe: { a: conta(".pc-col-a .pc-col-tab"), b: conta(".pc-col-b .pc-col-tab"),
        altezza: Math.round(document.querySelector(".pc-col-a .pc-col-tab td").getBoundingClientRect().height) },
      corpo: { visibile: Math.round(c.height), contenuto: corpo.scrollHeight }
    };
  });
  const sticky = await page.evaluate(() => new Promise((risolvi) => {
    const corpo = document.querySelector(".pc-corpo-confronto");
    corpo.scrollTop += 260;
    setTimeout(() => {
      const c = corpo.getBoundingClientRect();
      const th = document.querySelector(".pc-col-a thead th").getBoundingClientRect();
      risolvi({ top: Math.round(th.top), corpoTop: Math.round(c.top),
        ferma: th.top >= c.top - 1 && th.top <= c.top + 4,
        visibile: th.bottom <= c.bottom });
    }, 180);
  }));
  const dopo = await page.evaluate(() => document.documentElement.scrollHeight);
  return { prima, dopo, ...m, sticky };
}

async function conBrowser(fn) {
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
  const page = await browser.newPage({ viewport: { width: 1905, height: 813 } });
  const errori = [];
  page.on("pageerror", (e) => errori.push(String((e && e.message) || e)));
  await page.route(/gstatic\.com/, (r) => r.abort());
  await page.goto("http://127.0.0.1:" + server.address().port + "/desktop/index.html",
    { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector("#pag-programma-1", { state: "attached", timeout: 20000 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const velo = document.getElementById("veloAccesso31");
    if (velo) velo.remove();
  });
  try {
    await fn(page, errori);
  } finally {
    await page.close();
    await browser.close();
    await new Promise((r) => server.close(r));
  }
}

test("180.2 a 1905×813: colonne affiancate, REC dentro, niente scorrimento orizzontale, righe almeno il doppio", async () => {
  await conBrowser(async (page, errori) => {
    const m = await misura(page, 1905, 813);

    /* I due numeri che Alice ha chiesto: prima 8 righe, adesso 18. */
    const PRIMA = 8;
    const minime = PRIMA * 2;
    assert.ok(m.righe.a >= minime,
      "a 1905×813 si vedono " + m.righe.a + " righe di esercizi (prima " + PRIMA
      + "): servono almeno il doppio, " + minime);
    assert.equal(m.righe.b, m.righe.a, "e le due colonne ne mostrano lo stesso numero: " + m.righe.b);
    assert.ok(m.righe.altezza >= 30 && m.righe.altezza <= 34,
      "le righe sono compatte: " + m.righe.altezza + " px (erano 52)");

    /* Fuori: la finestra è larghissima. */
    const attesa = Math.min(1900, 1905 * 0.99, 1905 - 16);
    assert.ok(Math.abs(m.finestra.w - attesa) <= 2,
      "la finestra è larga " + m.finestra.w + " px (attesa " + Math.round(attesa) + "), non 1680");
    assert.ok(m.finestra.h >= 770, "e alta " + m.finestra.h + " px: usa lo schermo basso");
    assert.ok(m.finestra.x >= 7 && m.finestra.destra >= 7,
      "con un margine ai lati: " + m.finestra.x + " / " + m.finestra.destra + " px");

    /* Le due colonne affiancate e niente tagliato. */
    assert.ok(m.colonne.affiancate, "le due colonne restano affiancate a 1905 px");
    assert.ok(m.colonne.dentro, "e stanno dentro la finestra");
    assert.ok(m.recDentro.a && m.recDentro.b,
      "la colonna «REC.» è dentro la finestra in tutte e due le colonne");
    assert.ok(m.recNellaTabella.a && m.recNellaTabella.b,
      "e dentro la sua tabella: non esce a destra");
    assert.ok(m.scorrimento.corpo[0] <= m.scorrimento.corpo[1] + 1,
      "nessuno scorrimento orizzontale nel corpo: " + m.scorrimento.corpo.join(" / "));
    assert.ok(m.scorrimento.scatola[0] <= m.scorrimento.scatola[1] + 1,
      "e neanche nella scatola: " + m.scorrimento.scatola.join(" / "));

    /* La testa della tabella resta ferma mentre si scorre. */
    assert.ok(m.sticky.ferma,
      "l'intestazione resta in cima allo scorrimento (thead " + m.sticky.top + ", corpo " + m.sticky.corpoTop + ")");
    assert.ok(m.sticky.visibile, "ed è tutta visibile");

    /* La pagina sotto non si allunga di un pixel. */
    assert.equal(m.dopo, m.prima, "la pagina sotto non cambia altezza: " + m.prima + " → " + m.dopo);

    const gravi = errori.filter((e) => !/gstatic|firebase|Firestore|permission|Failed to fetch/i.test(e));
    assert.deepEqual(gravi, [], "nessun errore di pagina: " + gravi.join(" | ").slice(0, 300));
  });
});

test("180.3 a 1440×900 e 1280×800: colonne affiancate, REC dentro, pagina ferma", async () => {
  await conBrowser(async (page) => {
    for (const [vw, vh] of [[1440, 900], [1280, 800]]) {
      const m = await misura(page, vw, vh);
      assert.equal(m.dopo, m.prima,
        "a " + vw + "×" + vh + " la pagina sotto non cambia altezza: " + m.prima + " → " + m.dopo);
      assert.ok(m.colonne.affiancate, "a " + vw + " px le colonne restano affiancate");
      assert.ok(m.colonne.dentro, "a " + vw + " px stanno dentro la finestra");
      assert.ok(m.recDentro.a && m.recDentro.b,
        "a " + vw + " px la colonna «REC.» è dentro, in tutte e due le colonne");
      assert.ok(m.scorrimento.corpo[0] <= m.scorrimento.corpo[1] + 1,
        "a " + vw + " px niente scorrimento orizzontale: " + m.scorrimento.corpo.join(" / "));
      assert.ok(m.righe.a >= 10,
        "a " + vw + " px si vedono " + m.righe.a + " righe di esercizi");
      assert.ok(m.sticky.ferma, "a " + vw + " px l'intestazione resta in cima");
      await page.evaluate(() => { const mo = document.querySelector(".pc-modale"); if (mo) mo.remove(); });
    }
  });
});
