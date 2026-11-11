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

test("69.0 si apre la pagina vera col finto Firestore", async () => {
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

test("69.1 il ✕ di una riga marca, scrive la voce, avvisa e si annulla", async () => {
  await page.locator(".p8-r").first().locator("button.ab").filter({ hasText: "\u2715" }).click();
  await page.waitForFunction(() => {
    const db = window.firebase.app("B").firestore();
    return db.collection("bdB_atleti").doc("alice-prova").collection("registro")
      .get().then((s) => s.docs.some((d) => d.data().tipo === "cancella-riga"));
  }, null, { timeout: 15000 });
  await page.waitForFunction(async () => {
    const db = window.firebase.app("B").firestore();
    const d = await db.collection("bdB_atleti").doc("alice-prova").collection("schede")
      .doc("program-v2-sheet-prg-intensita__sh-A").get();
    return d.data().sheet.exercises.filter((e) => e.deletedAt).length === 1;
  }, null, { timeout: 15000 });
  await page.waitForFunction(() => {
    const s = document.getElementById("modifica-stato");
    return s && s.textContent.indexOf("riga tolta") !== -1;
  }, null, { timeout: 10000 });
  /* La pagina e il documento raccontano la stessa cosa: le righe a schermo
   * sono quelle vive del documento appena letto. */
  await page.waitForFunction(() => {
    const righe = document.querySelectorAll(".p8-r").length;
    const db = window.firebase.app("B").firestore();
    return db.collection("bdB_atleti").doc("alice-prova").collection("schede")
      .doc("program-v2-sheet-prg-intensita__sh-A").get().then((d) => {
        const vive = d.data().sheet.exercises.filter((e) => !e.deletedAt).length;
        return righe === vive;
      });
  }, null, { timeout: 15000 });
  await page.waitForFunction(() => {
    const b = document.querySelector("button.pg-undo:not(#pg-undo-p)");
    return b && !b.disabled;
  }, null, { timeout: 15000 }).catch(() => {});
  await page.locator("button.pg-undo:not(#pg-undo-p)").click();
  let rimessa = false;
  try {
    await page.waitForFunction(async () => {
      const db = window.firebase.app("B").firestore();
      const d = await db.collection("bdB_atleti").doc("alice-prova").collection("schede")
        .doc("program-v2-sheet-prg-intensita__sh-A").get();
      return d.data().sheet.exercises.every((e) => !e.deletedAt);
    }, null, { timeout: 15000 });
    rimessa = true;
  } catch (e) {}
  const diagnosi = await page.evaluate(async () => {
    const db = window.firebase.app("B").firestore();
    const s = await db.collection("bdB_atleti").doc("alice-prova").collection("registro").get();
    const d2 = await db.collection("bdB_atleti").doc("alice-prova").collection("schede")
      .doc("program-v2-sheet-prg-intensita__sh-A").get();
    return { stato: (document.getElementById("modifica-stato") || {}).textContent || "",
      tipi: s.docs.map((d) => d.data().tipo),
      es0: d2.data().sheet.exercises[0].deletedAt || null, versione: d2.data().versione };
  });
  assert.ok(rimessa, "l'Annulla rimette la riga \u00b7 " + JSON.stringify(diagnosi));
});

test("69.2 Applica progressione di una riga scrive le 8 settimane e la pagina si ridisegna SUBITO", async () => {
  await page.evaluate(() => {
    window.__nascondimenti = [];
    window.__scrolls = [];
    window.__osservo = new MutationObserver((mutazioni) => {
      for (const m of mutazioni) {
        if (m.type === "attributes" && m.target && m.target.classList && m.target.classList.contains("prog-panel") && !m.target.hasAttribute("data-progp")) {
          window.__nascondimenti.push(m.target.hasAttribute("hidden") ? "di-b: hidden" : "di-b: visibile");
        }
      }
    });
    window.__osservo.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ["hidden"] });
    window.addEventListener("scroll", (e) => {
      window.__scrolls.push(String((e.target && (e.target.id || e.target.tagName)) || "?") + "@" + Math.round((window.scrollY || 0)));
    }, true);
  });
  await page.locator(".p8-r").first().locator("button.btn-prog").click();
  try {
    await page.waitForSelector(".prog-panel .prog-item", { state: "visible", timeout: 8000 });
  } catch (e) {
    const dove = await page.evaluate(() => ({
      pannelli: [].map.call(document.querySelectorAll(".prog-panel"), (p) => ({
        nascosto: p.hidden, display: getComputedStyle(p).display, delV31: p.hasAttribute("data-progp"),
        box: Math.round(p.getBoundingClientRect().width) + "x" + Math.round(p.getBoundingClientRect().height),
        item: p.querySelectorAll(".prog-item").length
      })),
      fuori: Boolean(document.__progFuori),
      nascosti: (window.__nascondimenti || []).slice(-6),
      scroll: (window.__scrolls || []).slice(-8)
    }));
    assert.fail("il pannello non ha voci visibili: " + JSON.stringify(dove) + " \u00b7 errori: " + errori.concat(erroriConsole).join(" | "));
  }
  await page.locator(".prog-panel .prog-item").filter({ hasText: "Doppia progressione" }).first().click();
  await page.waitForFunction(() => {
    const db = window.firebase.app("B").firestore();
    return db.collection("bdB_atleti").doc("alice-prova").collection("registro")
      .get().then((s) => s.docs.some((d) => d.data().tipo === "modifica-progressione"));
  }, null, { timeout: 15000 });
  assert.equal(await page.locator(".prog-panel:not([data-progp])").count(), 0, "il pannello di B si chiude (i pannelli del v31 restano nel documento)");
  await page.waitForFunction(() => {
    const s = document.getElementById("modifica-stato");
    return s && s.textContent.indexOf("applicata alle 8 settimane") !== -1;
  }, null, { timeout: 10000 });
  const stato = await page.textContent("#modifica-stato");
  assert.match(stato, /applicata alle 8 settimane \u00b7 Annulla per annullare/);
  /* La pagina mostra SUBITO il dato scritto: la riga dice il valore del
   * documento, non quello di prima. */
  await page.waitForFunction(async () => {
    const db = window.firebase.app("B").firestore();
    const d = await db.collection("bdB_atleti").doc("alice-prova").collection("schede")
      .doc("program-v2-sheet-prg-intensita__sh-A").get();
    const attese = String(d.data().sheet.exercises[0].progression.weeks[0].sets);
    const riga = document.querySelectorAll(".p8-r")[0];
    return riga && riga.textContent.indexOf(attese) !== -1;
  }, null, { timeout: 15000 }).catch(() => {});
  const doc = await documentoScheda(page);
  const attese = String(doc.sheet.exercises[0].progression.weeks[0].sets);
  const testoRiga = await page.locator(".p8-r").first().textContent();
  assert.ok(testoRiga.indexOf(attese) !== -1, "la riga mostra il dato scritto (" + attese + "): " + testoRiga.slice(0, 120));
  await page.waitForFunction(() => {
    const b = document.querySelector("button.pg-undo:not(#pg-undo-p)");
    return b && !b.disabled;
  }, null, { timeout: 15000 }).catch(() => {});
  await page.locator("button.pg-undo:not(#pg-undo-p)").click();
  await page.waitForFunction(async () => {
    const db = window.firebase.app("B").firestore();
    const d = await db.collection("bdB_atleti").doc("alice-prova").collection("schede")
      .doc("program-v2-sheet-prg-intensita__sh-A").get();
    return d.data().sheet.exercises[0].progression.weeks.every((w) => String(w.reps) === "10");
  }, null, { timeout: 15000 }).catch(() => {});
  const dopo = await documentoScheda(page);
  assert.ok(dopo.sheet.exercises[0].progression.weeks.every((w) => String(w.reps) === "10"), "l'Annulla riporta le 8 settimane di prima");
});

/* Passo 33: attese dal banco Node: null e false non sono risultati conclusivi. */
async function aspetta69(leggi, pronta, cosa) {
  const fine = Date.now() + 20000;
  let ultimo;
  while (Date.now() < fine) {
    ultimo = await leggi();
    if (pronta(ultimo)) return ultimo;
    await new Promise(r => setTimeout(r, 60));
  }
  assert.fail("attesa scaduta: " + cosa + " · " + JSON.stringify(ultimo));
}
async function registro69() {
  return page.evaluate(async () => {
    const db = window.firebase.app("B").firestore();
    return (await db.collection("bdB_atleti").doc("alice-prova").collection("registro").get()).docs.map(d => d.data());
  });
}
async function stabile69(minimo = 0) {
  let precedente = "", uguali = 0;
  await aspetta69(() => page.evaluate(() => ({
    inVolo: window.__zonaB.inVolo(), ridisegni: window.BD_B_STATO.ridisegni,
    testo: document.querySelector("#programma-attivo")?.textContent || ""
  })), x => {
    const firma = JSON.stringify([x.ridisegni, x.testo]);
    uguali = x.inVolo === 0 && x.ridisegni >= minimo && firma === precedente ? uguali + 1 : 0;
    precedente = firma;
    return uguali >= 4;
  }, "aggiornamento concluso e tabella stabile");
}
async function apriProgramma69() {
  await page.locator(".voce[data-vista=programma-1]").first().click();
  await page.waitForSelector("#programma-attivo .p8-tab", { state: "visible", timeout: 20000 });
  await stabile69();
}
async function applicaScheda69(nome) {
  await stabile69();
  const prima = await registro69();
  const ridisegni = await page.evaluate(() => window.BD_B_STATO.ridisegni);
  // Ogni scelta chiude il menu: va riaperto anche per la scelta successiva.
  const apri = page.locator("button", { hasText: "Applica progressione a tutta la scheda" }).first();
  await apri.scrollIntoViewIfNeeded();
  await stabile69();
  await apri.click();
  // Clic DOM sul menu: evita lo scroll automatico Playwright che lo chiude.
  await page.locator(".prog-panel:not([data-progp]) .prog-item").filter({ hasText: nome }).first().evaluate(b => {
    if (!b.isConnected || b.closest(".prog-panel").hidden) throw Error("voce non disponibile");
    b.click();
  });
  const nuove = await aspetta69(registro69, v => v.some(x => x.tipo === "modifica-progressione-scheda" && !prima.some(p => p.idVoce === x.idVoce)), "nuova voce reale della progressione");
  const aggiunte = nuove.filter(x => !prima.some(p => p.idVoce === x.idVoce));
  assert.equal(aggiunte.length, 1, "una sola voce per scelta");
  await stabile69(ridisegni + 1);
  assert.equal(await page.locator(".prog-panel:not([data-progp])").count(), 0);
  assert.match(await page.textContent("#modifica-stato"), /applicata alle 8 settimane/);
  return aggiunte[0];
}

test("69.3 tutta la scheda: registro vero e aggiornamento finito prima della scelta successiva", async () => {
  await apriProgramma69();
  for (const nome of ["Forza neurale", "Range 8-10 → 8-8"]) {
    const prima = await documentoScheda(page);
    const voce = await applicaScheda69(nome);
    const dopo = await documentoScheda(page);
    const vivePrima = prima.sheet.exercises.filter(e => !e.deletedAt);
    const viveDopo = dopo.sheet.exercises.filter(e => !e.deletedAt);
    assert.equal(voce.righe.length, vivePrima.length);
    for (let i = 0; i < vivePrima.length; i++) {
      assert.equal(voce.righe[i].esercizio, vivePrima[i].name);
      // Il registro su disco contiene gli involucri Firestore: lettura tramite decoder reale.
    }
    const decodificata = await page.evaluate(async id => {
      const { leggiZonaB } = await import("/comune/scritture-b.js");
      return (await leggiZonaB(window.firebase.app("B").firestore(), "alice-prova", "registro")).find(d => d.dati.idVoce === id).dati;
    }, voce.idVoce);
    assert.deepEqual(decodificata.righe.map(r => r.prima), vivePrima.map(e => e.progression.weeks.map(w => [String(w.sets), String(w.reps)])));
    assert.deepEqual(decodificata.righe.map(r => r.dopo), viveDopo.map(e => e.progression.weeks.map(w => [String(w.sets), String(w.reps)])));
  }
});

test("69.4 dopo ricarica: tutte le righe e settimane ripristinate con ID, nessuna scrittura senza ID", async () => {
  for (const validi of [true, false]) {
    await page.close();
    // newPage crea un contesto isolato: niente registro o localStorage del caso precedente.
    page = await browser.newPage();
    page.on("pageerror", e => errori.push(String(e.message || e)));
    await page.route(/gstatic[.]com/, r => r.abort());
    const finto = await readFile(join(radice, "tests", "finti", "zona-b-finta-browser.js"), "utf8");
    // Un solo script: ordine deterministico prima dei moduli applicativi.
    await page.addInitScript({ content: finto + (validi ? ";window.__zonaB.dati.schede[0].dati.sheet.exercises[4].id = 6904;" : "") });
    await page.goto(base + "/desktop/index.html");
    await page.waitForSelector(".p8-tab", { state: "attached" });
    await apriProgramma69();
    const iniziale = await documentoScheda(page);
    const voce = await applicaScheda69("Forza neurale");
    const applicata = await documentoScheda(page);
    const registroPrima = await registro69();
    await page.goto(base + "/desktop/index.html?ripristina=" + encodeURIComponent(voce.idVoce), { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForSelector("#pannello-ripristino", { state: "visible", timeout: 20000 });
    await stabile69();
    assert.match(await page.textContent("#pannello-ripristino"), /Ripristino dai valori di prima/);
    await page.locator("#pannello-ripristino button", { hasText: "Ripristina i valori di prima" }).click();
    if (validi) {
      const registro = await aspetta69(registro69, v => v.some(x => x.tipo === "annulla-modifica" && x.annullaDi === voce.idVoce), "voce di ripristino concluso");
      await page.waitForSelector("#pannello-ripristino", { state: "detached" });
      await stabile69(2);
      const dopo = await documentoScheda(page);
      assert.deepEqual(dopo.sheet.exercises, iniziale.sheet.exercises, "tutte le righe e tutte le otto settimane, inclusi gli altri campi");
      assert.equal(dopo.versione, applicata.versione + 1);
      assert.equal(registro.filter(x => x.annullaDi === voce.idVoce).length, 1);
    } else {
      await aspetta69(() => page.textContent("#pannello-ripristino"), t => t.includes("Non ho ripristinato nessuna riga e non ho scritto niente"), "rifiuto esplicito senza ID");
      await stabile69();
      assert.deepEqual(await documentoScheda(page), applicata, "nessuna riga/settimana o versione modificata");
      assert.deepEqual(await registro69(), registroPrima, "nessuna voce di falso successo");
      await page.locator("#pannello-ripristino button", { hasText: "Chiudi", exact: true }).click();
    }
  }
});

test("69.6 la cella a mano (serie) salva e la voce dice serie", async () => {
  await apriProgramma69();
  const cella = page.locator(".p8-r").first().locator('span[data-campo="serie"], span[data-campo="ripetizioni"]').first();
  await cella.scrollIntoViewIfNeeded();
  await cella.click({ clickCount: 3, timeout: 8000 });
  await page.keyboard.type("5");
  const digitato = (await cella.textContent()).trim();
  await page.keyboard.press("Enter");
  const registro = await aspetta69(registro69, v => v.some(x => x.tipo === "modifica-serie-ripetizioni"), "registro della modifica manuale concluso");
  const voce = registro.filter(v => v.tipo === "modifica-serie-ripetizioni").pop();
  await page.waitForFunction((attesoValore) => {
    const db = window.firebase.app("B").firestore();
    return db.collection("bdB_atleti").doc("alice-prova").collection("schede")
      .doc("program-v2-sheet-prg-intensita__sh-A").get().then((d) => {
        const w = d.data().sheet.exercises[0].progression.weeks[0];
        return String(w.sets) === attesoValore || String(w.reps) === attesoValore;
      });
  }, digitato, { timeout: 15000 });
  const doc = await documentoScheda(page);
  const scritto = String(doc.sheet.exercises[0].progression.weeks[0].sets);
  const stato = await page.textContent("#modifica-stato");
  assert.ok(voce, "la voce modifica-serie-ripetizioni non c'e' \u00b7 stato: " + stato + " \u00b7 errori: " + errori.concat(erroriConsole).join(" | "));
  assert.ok(voce.campo === "serie" || voce.campo === "ripetizioni", "il campo della voce e' una cella a mano (" + voce.campo + "), NON una progressione");
  assert.notEqual(voce.tipo, "modifica-progressione", "la cella a mano non e' trattata come progressione");
  const atteso = voce.campo === "serie" ? String(doc.sheet.exercises[0].progression.weeks[0].sets) : String(doc.sheet.exercises[0].progression.weeks[0].reps);
  assert.equal(atteso, digitato, "il documento porta il valore scritto a mano (campo " + voce.campo + ", al documento: " + atteso + ", in cella: " + digitato + ")");
  assert.notEqual(digitato, "4", "la cella e' cambiata davvero (rimasta: " + digitato + ")");
});

test("69.5 nessun errore non preso in carico a pagina", async () => {
  const copia = errori.slice();
  if (browser) await browser.close();
  if (server) await new Promise((r) => server.close(r));
  assert.deepEqual(copia, [], "errori a pagina: " + copia.join(" | "));
});
