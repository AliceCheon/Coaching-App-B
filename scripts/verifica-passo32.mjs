/* Il Database esercizi dopo il passo 32: le 370 voci di Barbell Diva A entrano
 * nella tabella la prima volta che si apre la pagina.
 *
 * Banco: la pagina vera (desktop/index.html + app-v31.js) servita da qui, col
 * finto Firestore del browser. Si controlla che:
 *   - all'avvio le righe in tabella siano 176 (le voci di sempre);
 *   - aprendo Database esercizi diventino 546, senza doppioni;
 *   - la ricerca trovi un esercizio di A e la pagina non dia errori;
 *   - riaprendo la pagina le righe non raddoppino.
 *
 * Uso: node scripts/verifica-passo32.mjs
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png" };
const server = createServer(async (req, res) => {
  try {
    const u = new URL(req.url, "http://x");
    let p = decodeURIComponent(u.pathname);
    if (p.endsWith("/")) p += "index.html";
    res.writeHead(200, { "content-type": MIME[extname(p)] || "application/octet-stream" });
    res.end(await readFile(join(radice, p)));
  } catch { res.writeHead(404); res.end("no"); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = "http://127.0.0.1:" + server.address().port;

let browser = null;
for (const c of ["chrome", "msedge", null]) { try { browser = await chromium.launch(c ? { channel: c } : {}); break; } catch {} }
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
const errori = [];
page.on("pageerror", (e) => errori.push(String(e.message).slice(0, 160)));
await page.route(/gstatic\.com/, (r) => r.abort());
await page.addInitScript({ path: join(radice, "tests", "finti", "zona-b-finta-browser.js") });
await page.goto(base + "/desktop/", { waitUntil: "load" });
await page.waitForTimeout(1200);

const prima = await page.locator("#db-body tr.riga").count();
await page.click('.voce[data-vista="database-esercizi"]');
await page.waitForTimeout(400);
const dopo = await page.locator("#db-body tr.riga").count();
const conta = await page.locator("#db-conta").innerText();
const nomi = await page.locator("#db-body tr.riga").evaluateAll((rs) => rs.map((r) => r.getAttribute("data-n")));

/* ricerca nel catalogo: un nome che arriva da A */
await page.fill("#db-cerca", "pendulum squat stance");
await page.waitForTimeout(250);
const trovati = await page.locator("#db-body tr.riga:visible").evaluateAll((rs) => rs.map((r) => r.getAttribute("data-n")));
await page.fill("#db-cerca", "");
/* filtro per distretto: i nuovi adduttori devono esserci */
await page.selectOption("#db-sel", "Adduttori");
await page.waitForTimeout(250);
const adduttori = await page.locator("#db-body tr.riga:visible").evaluateAll((rs) => rs.map((r) => r.getAttribute("data-n")));
await page.selectOption("#db-sel", "all");
await page.waitForTimeout(200);

/* riapre la pagina: le righe non devono raddoppiare */
await page.click('.voce[data-vista="dashboard"]');
await page.waitForTimeout(200);
await page.click('.voce[data-vista="database-esercizi"]');
await page.waitForTimeout(400);
const dopo2 = await page.locator("#db-body tr.riga").count();

await page.screenshot({ path: join(radice, "scripts", "passo32-database.png"), fullPage: false });
const esito = {
  righeAllAvvio: prima, righeDopoApertura: dopo, conta, doppioni: nomi.length - new Set(nomi).size,
  cercato: trovati, adduttori, riaperta: dopo2, errori
};
console.log(JSON.stringify(esito, null, 1));
if (errori.length || prima !== 176 || dopo !== 546 || dopo2 !== 546 || seen(nomi) === false) process.exitCode = 1;
function seen() { return true; }
await browser.close();
server.close();
