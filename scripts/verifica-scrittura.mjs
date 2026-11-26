/* Riproduce: scrivere nella descrizione riga per riga e vedere se la pagina
 * si sposta o se il campo viene sostituito (testo perso). */
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
if (!browser) { console.log("nessun browser"); process.exit(2); }
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on("pageerror", (e) => console.log("errore:", String(e.message).slice(0, 140)));
await page.route(/gstatic\.com/, (r) => r.abort());
await page.addInitScript(() => { window.__bdDiagnosi = true; });
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE:", m.text().slice(0, 700)); });
await page.addInitScript({ path: join(radice, "tests", "finti", "zona-b-finta-browser.js") });
await page.goto(base + "/desktop/index.html");
await page.waitForTimeout(2400);
await page.evaluate(() => window.BDVAI("programma-1"));
await page.waitForTimeout(800);

const sonda = () => page.evaluate(() => {
  const a = document.querySelector('[data-pr-c="programma-descrizione"]');
  const scheda = document.querySelector("#programma-attivo");
  return {
    scrollY: Math.round(window.scrollY),
    altezzaPagina: Math.round(document.documentElement.scrollHeight),
    campo: a ? { valore: (a.value || "").slice(0, 30), connesso: a.isConnected, fuoco: document.activeElement === a } : "assente",
    messaggio: (document.querySelector('[data-pr-c="programma-messaggio"]') || {}).value,
    fuocoSu: document.activeElement ? (document.activeElement.getAttribute && document.activeElement.getAttribute("data-pr-c")) || document.activeElement.tagName : null,
    topScheda: scheda ? Math.round(scheda.getBoundingClientRect().top) : null
  };
});

console.log("prima:", JSON.stringify(await sonda()));
await page.click('[data-pr-c="programma-descrizione"]');
await page.type('[data-pr-c="programma-descrizione"]', "Prova", { delay: 120 });
/* poi passo al campo messaggio come farebbe lei, e scrivo subito */
console.log("dopo 5 lettere:", JSON.stringify(await sonda()));
await page.click('[data-pr-c="programma-messaggio"]');
await page.type('[data-pr-c="programma-messaggio"]', "Ciao atleta", { delay: 150 });
console.log("dopo il passaggio al messaggio:", JSON.stringify(await sonda()));
console.log("dopo altre lettere:", JSON.stringify(await sonda()));
await page.waitForTimeout(2500);
console.log("dopo attesa:", JSON.stringify(await sonda()));
/* esco dalla carta come farebbe lei e guardo che cosa resta */
await page.click("#nome-programma, header, body", { position: { x: 5, y: 5 } }).catch(() => {});
await page.evaluate(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
await page.waitForTimeout(2500);
console.log("dopo uscita:", JSON.stringify(await sonda()));
console.log("stato:", await page.evaluate(() => ((document.querySelector("#modifica-stato") || {}).textContent || "").trim()));

/* e ora la settimana: si scrive a due cifre senza che la pagina salti */
const sett = page.locator('[data-pr-c="programma-settimane"]').first();
await sett.click();
await page.keyboard.press("Control+A");
await page.keyboard.type("12", { delay: 200 });
console.log("mentre scrivo 12:", JSON.stringify(await sonda()));
await page.evaluate(() => document.querySelector('[data-pr-c="programma-settimane"]').blur());
await page.waitForTimeout(2500);
console.log("dopo il 12:", JSON.stringify(await sonda()), "| stato:", await page.evaluate(() => ((document.querySelector("#modifica-stato") || {}).textContent || "").trim()));
await browser.close(); server.close(); process.exit(0);
