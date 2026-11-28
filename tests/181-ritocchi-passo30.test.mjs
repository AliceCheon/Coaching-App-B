/* Guardia 181 (passo 30, 28/11/2026) — tre ritocchi piccoli rimasti aperti, più
 * una pulizia dichiarata.
 *
 *  181.1  «Svuota archivio» in Misure non cancella più al primo clic: apre una
 *         conferma in pagina (lo stesso riquadro `.pr-conf` delle altre
 *         conferme), dice quante sessioni e quante misure escono e che tocca
 *         solo la copia in questo browser (B e le schede non si toccano).
 *         «Annulla» non cambia niente; «Svuota l'archivio» svuota davvero; con
 *         l'archivio già vuoto lo dice senza aprire niente.
 *  181.2  il cestino spento (programma in uso) si vede spento: sbiadito, in
 *         grigio e col bordo tratteggiato, e resta non premibile con il
 *         `title`/`aria-label` che dicono perché (guardia 176 già prova il
 *         resto: niente conferma, niente scrittura).
 *  181.3  Study time: la figura cresce in ALTEZZA (85% della carta invece del
 *         41% di prima), non si deforma (`object-fit:contain`), resta dentro
 *         il suo riquadro e le due carte affiancate restano di pari altezza.
 *         Le regole sono dichiarate nel foglio, non messe a mano nel DOM.
 *  181.4  `confrontoSettimana` non è più esportata né definita: nessuno la
 *         chiamava (passo 30 la toglie, dopo che il passo 28 ne aveva tolto
 *         la tabella «Differenze»).
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";
import { chromium } from "playwright";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(radice, "desktop", "index.html"), "utf8");

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript",
  ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png" };

/* Apre la pagina vera con il finto Firestore (11 finti non toccano il cloud),
 * esegue `prova(page)` e chiude tutto: un browser lasciato aperto terrebbe in
 * vita la corsa. */
async function conPagina(prova, larghezza) {
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
  const page = await browser.newPage({ viewport: { width: larghezza || 1440, height: 1000 } });
  const errori = [];
  page.on("pageerror", (e) => errori.push(String((e && e.message) || e)));
  await page.route(/gstatic\.com/, (r) => r.abort());
  await page.addInitScript({ path: join(radice, "tests", "finti", "zona-b-finta-browser.js") });
  await page.goto("http://127.0.0.1:" + server.address().port + "/desktop/index.html",
    { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector("#pag-misure", { state: "attached", timeout: 20000 });
  await page.waitForTimeout(1500);
  try {
    return await prova(page, errori);
  } finally {
    await page.close();
    await browser.close();
    await new Promise((r) => server.close(r));
  }
}

/* ---------- 181.1 · «Svuota archivio» chiede conferma -------------------- */

test("181.1 «Svuota archivio» apre una conferma, dice quante sessioni escono e non tocca B", async () => {
  await conPagina(async (page) => {
    const prima = await page.evaluate(() => {
      window.BDVAI("misure");
      window.BDM.ingest([
        { data: "2026-10-01", peso: 61.2, circ: { vita: 72, fianchi: 98, torace: 88 }, pl7: { tricipite: [12, 14, 13], addome: [18, 19, 17] } },
        { data: "2026-10-15", peso: 61.8, circ: { vita: 71, coscia: 56 }, pl7: { addome: [17, 18, 18] } },
        { data: "2026-11-01", peso: 62.1, circ: { vita: 70 }, pl7: {} }
      ], { fonte: "prova 181" });
      return {
        sessioni: window.BDM.all().sessioni.length,
        storico: document.querySelectorAll("#ms-stor .ms-storr").length,
        b: window.localStorage.getItem("bd-b-finta-v1")
      };
    });
    assert.equal(prima.sessioni, 3, "le tre sessioni di prova non sono entrate nell'archivio");
    await page.waitForTimeout(200);

    /* Primo clic: non si cancella niente, si apre la conferma. */
    await page.evaluate(() => document.getElementById("ms-reset").click());
    await page.waitForTimeout(200);
    const dialogo = await page.evaluate(() => {
      const d = document.querySelector("#ms-reset-conf .pr-conf");
      if (!d) return null;
      return {
        ruolo: d.getAttribute("role"),
        aria: d.getAttribute("aria-label"),
        testo: (d.textContent || "").replace(/\s+/g, " ").trim(),
        tasti: [...d.querySelectorAll("button")].map((b) => (b.textContent || "").trim()),
        focus: document.activeElement ? (document.activeElement.textContent || "").trim() : "",
        sessioni: window.BDM.all().sessioni.length,
        storico: document.querySelectorAll("#ms-stor .ms-storr").length
      };
    });
    assert.ok(dialogo, "il clic su «Svuota archivio» ha cancellato senza chiedere: nessuna conferma");
    assert.equal(dialogo.ruolo, "dialog", "la conferma non è un riquadro dichiarato (role=dialog)");
    assert.match(dialogo.testo, /Svuota l'archivio locale\?/i, "la conferma non dice cosa sta per succedere");
    assert.match(dialogo.testo, /3 sessioni/, "la conferma non dice QUANTE sessioni escono: " + dialogo.testo);
    assert.match(dialogo.testo, /misure corporee/, "la conferma non dice quante misure escono: " + dialogo.testo);
    assert.match(dialogo.testo, /pliche/, "la conferma non dice quante pliche escono: " + dialogo.testo);
    assert.match(dialogo.testo, /B/, "la conferma non dice niente dei dati su B: " + dialogo.testo);
    assert.match(dialogo.testo, /non si toccano/, "la conferma non dice che B non si tocca: " + dialogo.testo);
    assert.match(dialogo.testo, /in questo browser/, "la conferma non dice che è solo la copia locale: " + dialogo.testo);
    assert.deepEqual(dialogo.tasti, ["Annulla", "Svuota l'archivio"],
      "i tasti non sono quelli delle altre conferme della pagina: " + JSON.stringify(dialogo.tasti));
    assert.equal(dialogo.focus, "Annulla", "il fuoco non parte da «Annulla»: Invio non deve confermare");
    assert.equal(dialogo.sessioni, 3, "le sessioni sono sparite prima del sì");
    assert.equal(dialogo.storico, prima.storico, "lo storico è cambiato prima del sì");

    /* Annulla: non cambia niente. */
    await page.evaluate(() => {
      const d = document.querySelector("#ms-reset-conf .pr-conf");
      d.querySelector("button").click();
    });
    await page.waitForTimeout(200);
    const annullato = await page.evaluate(() => ({
      sessioni: window.BDM.all().sessioni.length,
      dialogo: Boolean(document.querySelector("#ms-reset-conf .pr-conf")),
      esito: (document.getElementById("ms-out").textContent || "").trim()
    }));
    assert.equal(annullato.sessioni, 3, "«Annulla» ha svuotato lo stesso");
    assert.equal(annullato.dialogo, false, "«Annulla» non ha chiuso la conferma");
    assert.equal(annullato.esito, "", "«Annulla» ha scritto un esito: non deve cambiare niente");

    /* Conferma: svuota come dichiarato, e lo dice. */
    await page.evaluate(() => document.getElementById("ms-reset").click());
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      const d = document.querySelector("#ms-reset-conf .pr-conf");
      d.querySelectorAll("button")[1].click();
    });
    await page.waitForTimeout(300);
    const dopo = await page.evaluate(() => ({
      sessioni: window.BDM.all().sessioni.length,
      storico: document.querySelectorAll("#ms-stor .ms-storr").length,
      esito: (document.getElementById("ms-out").textContent || "").trim(),
      dialogo: Boolean(document.querySelector("#ms-reset-conf .pr-conf")),
      b: window.localStorage.getItem("bd-b-finta-v1")
    }));
    assert.equal(dopo.sessioni, 0, "confermando l'archivio non si è svuotato");
    assert.equal(dopo.storico, 0, "lo storico mostra ancora le sessioni");
    assert.equal(dopo.dialogo, false, "la conferma è rimasta aperta dopo il sì");
    assert.match(dopo.esito, /3 sessioni tolte/i, "l'esito non dice quante sessioni sono uscite: " + dopo.esito);
    assert.match(dopo.esito, /B non sono stati toccati/i, "l'esito non dice che B è intatto: " + dopo.esito);
    /* Niente è stato scritto verso B: la memoria del finto Firestore è la
     * stessa di prima (le sessioni stavano solo nel localStorage della pagina). */
    assert.equal(dopo.b, prima.b, "«Svuota archivio» ha scritto anche su B");

    /* Archivio già vuoto: lo dice, senza aprire una conferma vuota. */
    await page.evaluate(() => document.getElementById("ms-reset").click());
    await page.waitForTimeout(200);
    const vuoto = await page.evaluate(() => ({
      dialogo: Boolean(document.querySelector("#ms-reset-conf .pr-conf")),
      testo: (document.getElementById("ms-reset-conf").textContent || "").trim()
    }));
    assert.equal(vuoto.dialogo, false, "con l'archivio vuoto si apre lo stesso una conferma");
    assert.match(vuoto.testo, /già vuoto/i, "con l'archivio vuoto non viene detto: " + vuoto.testo);
  });
});

/* ---------- 181.2 · il cestino spento si vede spento --------------------- */

test("181.2 il cestino spento (programma in uso) ha un aspetto distinto e resta non premibile", async () => {
  await conPagina(async (page) => {
    await page.evaluate(() => window.BDVAI("archivio"));
    await page.waitForTimeout(1200);
    const m = await page.evaluate(() => {
      const b = document.querySelector("#archivio-corpo .pg-cestino");
      if (!b) return null;
      const leggi = () => {
        const s = getComputedStyle(b);
        return { opacita: Number(s.opacity), filtro: s.filter, bordo: s.borderTopStyle,
          colore: s.color, cursore: s.cursor, larghezza: Math.round(b.getBoundingClientRect().width) };
      };
      const spento = leggi();
      /* Lo stesso tasto, acceso: così il confronto è sullo stesso elemento e
       * sulla stessa pagina, non su due stili diversi. */
      b.disabled = false;
      const acceso = leggi();
      b.disabled = true;
      return {
        spento, acceso,
        classi: b.className,
        aria: b.getAttribute("aria-label"),
        ariaDisabilitato: b.getAttribute("aria-disabled"),
        titolo: b.getAttribute("title"),
        premuto: (() => {
          let conferme = 0;
          const guarda = () => document.querySelectorAll(".cestino-programma-modale").length;
          b.click();
          conferme = guarda();
          return conferme;
        })()
      };
    });
    assert.ok(m, "l'Archivio non ha montato il cestino del programma in uso");
    assert.match(m.classi, /pg-cestino/, "il tasto non ha la classe del cestino: " + m.classi);

    /* Spento: sbiadito e in grigio, con il bordo tratteggiato. */
    assert.ok(m.spento.opacita <= 0.35,
      "il cestino spento non è sbiadito (opacità " + m.spento.opacita + "): si distingue male da quello acceso");
    assert.match(m.spento.filtro, /grayscale/, "il cestino spento non è in grigio: " + m.spento.filtro);
    assert.equal(m.spento.bordo, "dashed", "il cestino spento non ha il bordo tratteggiato: " + m.spento.bordo);
    assert.equal(m.spento.cursore, "not-allowed", "il cursore del cestino spento non dice «non si può»");
    /* Acceso: pieno, a colori, col bordo pieno. */
    assert.ok(m.acceso.opacita >= 0.9,
      "il cestino acceso è sbiadito anche lui (opacità " + m.acceso.opacita + "): i due stati si confondono");
    assert.equal(m.acceso.filtro, "none", "il cestino acceso è in grigio anche lui: " + m.acceso.filtro);
    assert.equal(m.acceso.bordo, "solid", "il cestino acceso ha il bordo tratteggiato anche lui: " + m.acceso.bordo);
    assert.ok(m.acceso.opacita - m.spento.opacita >= 0.5, "i due stati sono troppo simili per vederli a colpo d'occhio");

    /* Le parole che spiegano perché restano. */
    assert.match(String(m.titolo || ""), /programma in uso/, "il cestino spento ha perso il motivo nel title");
    assert.match(String(m.titolo || ""), /aprine un altro/, "il title non dice cosa fare");
    assert.match(String(m.aria || ""), /programma in uso/, "il cestino spento ha perso il motivo nell'aria-label");
    assert.equal(m.ariaDisabilitato, "true", "manca aria-disabled sul tasto spento");
    assert.equal(m.premuto, 0, "il cestino spento ha aperto la conferma di eliminazione");
  });
});

/* ---------- 181.3 · Study time: la figura riempie l'altezza -------------- */

test("181.3 Study time: la figura cresce in altezza senza deformarsi e le carte restano pari", async () => {
  /* Le regole sono dichiarate nel foglio (non messe a mano nel DOM). */
  const regolaFigura = /#pag-study-time \.st-fig:not\(\.st-fig-wide\)\{([^}]*)\}/.exec(css);
  assert.ok(regolaFigura, "manca la regola della figura laterale (st-fig:not(.st-fig-wide))");
  assert.match(regolaFigura[1], /width:\s*auto/, "la figura non ha la larghezza automatica: " + regolaFigura[1]);
  assert.match(regolaFigura[1], /max-width:\s*calc\(100%/, "la figura non è frenata rispetto al testo: " + regolaFigura[1]);
  const regolaImg = /#pag-study-time \.st-fig:not\(\.st-fig-wide\) img\{([^}]*)\}/.exec(css);
  assert.ok(regolaImg, "manca la regola dell'immagine laterale");
  assert.match(regolaImg[1], /width:\s*auto/, "l'immagine non ha la larghezza automatica: " + regolaImg[1]);
  const base = /#pag-study-time \.st-fig img\{([^}]*)\}/.exec(css);
  assert.ok(base, "manca la regola base dell'immagine");
  assert.match(base[1], /height:\s*100%/, "l'immagine non è alta quanto il riquadro: " + base[1]);
  assert.match(base[1], /object-fit:\s*contain/, "l'immagine può deformarsi (manca object-fit:contain)");
  const regolaTesto = /#pag-study-time \.st-card:not\(\.st-wide\) \.st-txt\{([^}]*)\}/.exec(css);
  assert.ok(regolaTesto, "manca il minimo della colonna di testo");
  const minimo = Number(/min-width:\s*(\d+)px/.exec(regolaTesto[1])[1]);
  assert.ok(minimo >= 160 && minimo <= 240, "il minimo del testo è " + minimo + " px: o troppo stretto o inutile");

  const m = await conPagina(async (page) => {
    await page.evaluate(() => window.BDVAI("study-time"));
    await page.waitForTimeout(900);
    return page.evaluate(() => {
      const carte = [...document.querySelectorAll("#pag-study-time .st-card")];
      const carta = carte.find((c) => (c.textContent || "").includes("Muscoli adduttori"));
      if (!carta) return null;
      const figura = carta.querySelector(".st-fig");
      const img = figura.querySelector("img");
      const rf = figura.getBoundingClientRect();
      const rc = carta.getBoundingClientRect();
      const scala = Math.min(rf.width / img.naturalWidth, rf.height / img.naturalHeight);
      const disegnata = { larghezza: img.naturalWidth * scala, altezza: img.naturalHeight * scala };
      /* Le altre carte della stessa riga (stesso bordo superiore). */
      const riga = carte.filter((c) => Math.abs(c.getBoundingClientRect().top - rc.top) < 2);
      return {
        carta: { larghezza: Math.round(rc.width), altezza: Math.round(rc.height) },
        figura: { larghezza: Math.round(rf.width), altezza: Math.round(rf.height) },
        disegnata: { larghezza: Math.round(disegnata.larghezza), altezza: Math.round(disegnata.altezza) },
        riempimento: disegnata.altezza / rf.height,
        riempimentoLarghezza: disegnata.larghezza / rf.width,
        dentro: disegnata.larghezza <= rf.width + 0.5 && disegnata.altezza <= rf.height + 0.5,
        oggetto: getComputedStyle(img).objectFit,
        naturale: { larghezza: img.naturalWidth, altezza: img.naturalHeight },
        riga: riga.map((c) => Math.round(c.getBoundingClientRect().height)),
        quante: carta.parentElement ? carta.parentElement.children.length : 0
      };
    });
  });
  assert.ok(m, "nella pagina non c'è la carta «Muscoli adduttori»");

  /* Prima del passo 30: 173 px di figura su 424 (41%), larga 205 su 435. */
  assert.ok(m.riempimento >= 0.78,
    "la figura non è cresciuta in altezza: riempie il " + Math.round(m.riempimento * 100) + "% del riquadro (prima 41%)");
  assert.ok(m.riempimentoLarghezza >= 0.95,
    "la figura non usa la larghezza che le spetta: " + Math.round(m.riempimentoLarghezza * 100) + "%");
  assert.equal(m.oggetto, "contain", "l'immagine non è dichiarata `contain`: può deformarsi");
  assert.ok(m.dentro, "l'immagine esce dal suo riquadro: " + JSON.stringify(m.disegnata) + " in " + JSON.stringify(m.figura));
  assert.ok(m.disegnata.larghezza >= 350,
    "la figura è ancora piccola: " + m.disegnata.larghezza + " px di larghezza (prima 205)");
  /* Le carte affiancate restano di pari altezza (la riga della griglia). */
  assert.ok(m.riga.length >= 2, "la carta non ha una vicina di riga: " + JSON.stringify(m.riga));
  assert.ok(Math.max(...m.riga) - Math.min(...m.riga) <= 1,
    "le carte affiancate non sono di pari altezza: " + JSON.stringify(m.riga));
});

/* ---------- 181.4 · `confrontoSettimana` non c'è più --------------------- */

test("181.4 confrontoSettimana non è più né esportata né definita", async () => {
  const sorgente = readFileSync(join(radice, "comune", "programma-consultabile.js"), "utf8");
  assert.ok(sorgente.indexOf("confrontoSettimana") === -1,
    "in comune/programma-consultabile.js c'è ancora confrontoSettimana");
  const modulo = await import("../comune/programma-consultabile.js");
  assert.equal("confrontoSettimana" in modulo, false,
    "confrontoSettimana è ancora esportata: " + Object.keys(modulo).filter((k) => /confronto/i.test(k)).join(", "));
  /* Le funzioni che il blocco Volume usa davvero restano. */
  for (const nome of ["variazionePct", "settimaneDelConfronto", "confrontoProgrammi", "grandezzeProgramma"]) {
    assert.equal(typeof modulo[nome], "function", "manca " + nome + ": il confronto non si monta più");
  }
  /* E nessuno la chiama in giro. */
  for (const cartella of ["comune", "desktop", "tests"]) {
    const trovati = [];
    const guarda = (dir) => {
      for (const voce of readdirSync(dir, { withFileTypes: true })) {
        const pieno = join(dir, voce.name);
        if (voce.isDirectory()) { if (voce.name !== "node_modules") guarda(pieno); }
        else if (/\.(m?js|html)$/.test(voce.name) && pieno !== fileURLToPath(import.meta.url)) {
          const testo = readFileSync(pieno, "utf8");
          if (testo.indexOf("confrontoSettimana") > -1) trovati.push(pieno);
        }
      }
    };
    guarda(join(radice, cartella));
    assert.deepEqual(trovati, [], "qualcuno chiama ancora confrontoSettimana: " + trovati.join(", "));
  }
});
