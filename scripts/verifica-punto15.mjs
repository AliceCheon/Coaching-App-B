/* Verifica del punto 15 nella pagina vera col finto Firestore. */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".woff2": "font/woff2" };
const server = createServer(async (req, res) => {
  try { const u = new URL(req.url, "http://x"); let p = decodeURIComponent(u.pathname); if (p.endsWith("/")) p += "index.html";
    res.writeHead(200, { "content-type": MIME[extname(p)] || "application/octet-stream" }); res.end(await readFile(join(radice, p)));
  } catch { res.writeHead(404); res.end("no"); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = "http://127.0.0.1:" + server.address().port;
let browser = null;
for (const c of ["chrome", "msedge", null]) { try { browser = await chromium.launch(c ? { channel: c } : {}); break; } catch {} }
if (!browser) { console.log("nessun browser"); process.exit(1); }

const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
page.on("pageerror", (e) => console.log("errore:", String(e.message).slice(0, 140)));
await page.route(/gstatic\.com/, (r) => r.abort());
await page.addInitScript({ path: join(radice, "tests", "finti", "zona-b-finta-browser.js") });
await page.goto(base + "/desktop/index.html");
await page.waitForTimeout(2400);
await page.evaluate(() => window.BDVAI("programma-1"));
await page.waitForTimeout(700);

const campi = await page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const gg = q('[data-pr-c="programma-giorni"]');
  const sett = q('[data-pr-c="programma-settimane"]');
  const rot = q('[data-pr-c="programma-rotazione"]');
  return {
    gg: gg ? { tag: gg.tagName, value: gg.value, opzioni: gg.options ? [...gg.options].map(o => o.value).slice(1) : null } : null,
    settimane: sett ? { tag: sett.tagName, value: sett.value } : null,
    rotazione: rot ? { tag: rot.tagName, value: rot.value } : null
  };
});
console.log("campi:", JSON.stringify(campi));

/* prima controllo un campo che esisteva già: la fase */
const fase = page.locator('[data-pr-c="programma-fase"]').first();
await fase.selectOption("Cut").catch(() => {});
await fase.dispatchEvent("change");
await page.waitForTimeout(900);
console.log("fase dopo change:", await page.evaluate(() => (document.querySelector('[data-pr-c="programma-fase"]') || {}).value));

/* cambio le settimane a 10 e guardo il prospetto */
const righePrima = await page.evaluate(() => document.querySelectorAll("#programma-attivo .pr-prow").length);
const sett = page.locator('[data-pr-c="programma-settimane"]').first();
await sett.fill("10");
await sett.dispatchEvent("change");
await page.evaluate(() => { const n = document.querySelector('[data-pr-c="programma-settimane"]'); if (n) n.blur(); });
await page.waitForTimeout(2600);
console.log("zona dopo:", await page.evaluate(() => {
  const z = window.__zonaB && window.__zonaB.dati;
  const d = z && z.programmi ? Object.values(z.programmi)[0] : null;
  const meta = d && d.programMeta;
  return { durata: meta && meta.durationWeeks, giorni: meta && meta.daysPerWeek, rotazione: meta && meta.rotation };
}));
const righeDopo = await page.evaluate(() => document.querySelectorAll("#programma-attivo .pr-prow").length);
const esito = await page.evaluate(() => [...document.querySelectorAll("#programma-attivo, #barra, #toast, .st-stato, #stato")].map(n => (n.textContent || "").replace(/\s+/g, " ")).join(" | ").slice(0, 300));
console.log("quanti campi:", await page.evaluate(() => ({
  tutti: document.querySelectorAll('[data-pr-c="programma-settimane"]').length,
  dentroAttivo: document.querySelectorAll('#programma-attivo [data-pr-c="programma-settimane"]').length,
  fuoriAttivo: document.querySelectorAll('[data-pr-c="programma-settimane"]:not(#programma-attivo *)').length
})));
console.log("valore dopo il change:", await page.evaluate(() => (document.querySelector('[data-pr-c="programma-settimane"]') || {}).value));
console.log("prospetto righe:", righePrima, "->", righeDopo);
console.log("titolo prospetto:", await page.evaluate(() => {
  const t = [...document.querySelectorAll("#programma-attivo *")].map(n => n.textContent || "").find(x => /PROSPETTO/i.test(x) && x.length < 120);
  return t ? t.replace(/\s+/g, " ").trim() : "non trovato";
}));
console.log("riga di stato:", await page.evaluate(() => {
  const n = document.querySelector("#st-modifica, .st-modifica, [data-tono]");
  return n ? { id: n.id, classe: n.className, testo: (n.textContent || "").trim().slice(0, 140), nascosta: n.hidden } : "nessuna";
}));

/* valore sbagliato */
await sett.fill("99");
await sett.dispatchEvent("change");
await page.waitForTimeout(900);
const msg = await page.evaluate(() => (document.querySelector("#programma-attivo") || {}).textContent || "");
console.log("dice del 99:", /99|settimane/i.test(msg) ? "sì" : "no");
await page.screenshot({ path: "/tmp/punto15.png" });
await browser.close(); server.close(); process.exit(0);
