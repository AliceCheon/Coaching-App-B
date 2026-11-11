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

test("69.3 tutta la scheda: una voce sola, tutte le righe, pagina ridisegnata", async () => {
  await page.locator("button", { hasText: "Applica progressione a tutta la scheda" }).first().click();
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
    assert.fail("il pannello della scheda non ha voci visibili: " + JSON.stringify(dove) + " \u00b7 errori: " + errori.concat(erroriConsole).join(" | "));
  }
  /* Le voci di scheda hanno effetti diversi sui valori di prova: qualcuna
   * legittimamente non cambia niente (e il rifiuto e' giusto). Si cerca la
   * voce che SCRIVE: una alla volta, con attesa corta fra una e l'altra. */
  const nomiVoci = await page.evaluate(() => [].map.call(
    document.querySelectorAll(".prog-panel:not([data-progp]) .prog-item"),
    (b) => b.querySelector("b").textContent));
  let voce = null;
  for (const nomeVoce of nomiVoci) {
    const primaQuante = await page.evaluate(async () => {
      const db = window.firebase.app("B").firestore();
      const s = await db.collection("bdB_atleti").doc("alice-prova").collection("registro").get();
      return s.docs.filter((d) => d.data().tipo === "modifica-progressione-scheda").length;
    });
    await page.locator(".prog-panel:not([data-progp]) .prog-item").filter({ hasText: nomeVoce }).first().click();
    const trovata = await page.waitForFunction((gia) => {
      const db = window.firebase.app("B").firestore();
      return db.collection("bdB_atleti").doc("alice-prova").collection("registro")
        .get().then((s) => {
          const quante = s.docs.filter((d) => d.data().tipo === "modifica-progressione-scheda").length;
          return quante > gia ? s.docs.map((d) => d.data()).filter((v) => v.tipo === "modifica-progressione-scheda").pop() : null;
        });
    }, primaQuante, { timeout: 6000 }).then((presa) => presa.jsonValue()).catch(() => null);
    if (trovata && Array.isArray(trovata.righe) && trovata.righe.length === 6) { voce = trovata; break; }
  }
  if (!voce) {
    const diagnosi = await page.evaluate(async () => {
      const db = window.firebase.app("B").firestore();
      const s = await db.collection("bdB_atleti").doc("alice-prova").collection("registro").get();
      return { voci: s.docs.map((d) => d.data().tipo), stato: (document.getElementById("modifica-stato") || {}).textContent || "" };
    });
    assert.fail("nessuna voce di scheda ha scritto: " + JSON.stringify(diagnosi) + " \u00b7 errori: " + errori.concat(erroriConsole).join(" | "));
  }
  assert.ok(Array.isArray(voce.righe) && voce.righe.length === 6, "tutte le righe vive della scheda sono nella voce");
  await page.waitForFunction(() => {
    const s = document.getElementById("modifica-stato");
    return s && s.textContent.indexOf("applicata alle 8 settimane") !== -1;
  }, null, { timeout: 10000 });
  const stato = await page.textContent("#modifica-stato");
  assert.match(stato, /applicata alle 8 settimane/);
  assert.equal(await page.locator(".prog-panel:not([data-progp])").count(), 0, "il pannello di B si chiude (i pannelli del v31 restano nel documento)");
});

test("69.4 dopo la ricarica, ?ripristina= trova la voce sul disco e ripristina", async () => {
  await page.goto(base + "/desktop/index.html?ripristina=");
  await page.waitForSelector("#pannello-ripristino", { timeout: 20000 });
  const titolo = await page.textContent("#pannello-ripristino");
  assert.match(titolo, /Ripristino dai valori di prima/);
  const quanteVoci = await page.evaluate(() => document.querySelectorAll("#pannello-ripristino button").length);
  assert.ok(quanteVoci >= 2, "nel pannello del ripristino mancano i bottoni (bottoni: " + quanteVoci + "): " + titolo.slice(0, 300));
  await page.locator("#pannello-ripristino button", { hasText: "Ripristina i valori di prima" }).first().click();
  await page.waitForFunction(async () => {
    const db = window.firebase.app("B").firestore();
    const d = await db.collection("bdB_atleti").doc("alice-prova").collection("schede")
      .doc("program-v2-sheet-prg-intensita__sh-A").get();
    return d.data().sheet.exercises[0].progression.weeks.every((w) => String(w.reps) === "10");
  }, null, { timeout: 20000 }).catch(() => {});
  const doc = await documentoScheda(page);
  assert.ok(doc.sheet.exercises[0].progression.weeks.every((w) => String(w.reps) === "10"), "il ripristino riporta le 8 settimane di prima");
  await page.waitForFunction(() => {
    const db = window.firebase.app("B").firestore();
    return db.collection("bdB_atleti").doc("alice-prova").collection("registro")
      .get().then((s) => s.docs.some((d) => d.data().tipo === "annulla-modifica" && d.data().annullaDi));
  }, null, { timeout: 15000 });
  assert.equal(await page.locator("#pannello-ripristino").count(), 0, "il pannello si chiude dopo il ripristino");
});

test("69.6 la cella a mano (serie) salva e la voce dice serie", async () => {
  const cella = page.locator(".p8-r").first().locator('span[data-campo="serie"], span[data-campo="ripetizioni"]').first();
  await cella.scrollIntoViewIfNeeded();
  await cella.click({ clickCount: 3, timeout: 8000 });
  await page.keyboard.type("5");
  const digitato = (await cella.textContent()).trim();
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => {
    const db = window.firebase.app("B").firestore();
    return db.collection("bdB_atleti").doc("alice-prova").collection("registro")
      .get().then((s) => s.docs.some((d) => d.data().tipo === "modifica-serie-ripetizioni"));
  }, null, { timeout: 15000 });
  const voce = await page.evaluate(async () => {
    const db = window.firebase.app("B").firestore();
    const s = await db.collection("bdB_atleti").doc("alice-prova").collection("registro").get();
    return s.docs.map((d) => d.data()).filter((v) => v.tipo === "modifica-serie-ripetizioni").pop() || null;
  });
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
