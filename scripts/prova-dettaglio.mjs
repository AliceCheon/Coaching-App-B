/* Prova del passo 37: dettaglio, rinomina, elimina e riapertura nel costruttore.
 * Uso: node scripts/prova-dettaglio.mjs */
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
page.on("pageerror", (e) => console.log("errore pagina:", String(e.stack || e.message || e).slice(0, 400)));
await page.route(/gstatic\.com/, (r) => r.abort());
await page.addInitScript({ path: join(radice, "tests", "finti", "zona-b-finta-browser.js") });
/* lo scheletro di prova entra nel finto Firestore prima della pagina */
await page.addInitScript(() => {
  const dati = {
    tipo: "scheletro", nome: "Prova con dettaglio", creatoIl: "2026-11-25T10:00:00.000Z", notaScheda: "fatto dalla pagina",
    schede: [
      { lettera: "A", gruppo: "Push", esercizi: [{ nome: "Panca piana", distretto: "Petto", serie: 4 }, { nome: "Croci", distretto: "Petto", serie: 3 }] },
      { lettera: "B", gruppo: "Pull", esercizi: [{ nome: "Rematore bilanciere", distretto: "Dorsali", serie: 4 }] }
    ]
  };
  const metti = () => {
    if (!window.__zonaB) return setTimeout(metti, 20);
    window.__zonaB.dati.scheletri = [{ id: "sk-prova", dati }];
  };
  metti();
});
await page.goto(base + "/desktop/index.html");
await page.waitForTimeout(2400);
await page.evaluate(() => window.BDVAI("scheletri"));
await page.waitForTimeout(700);
await page.locator("#pag-scheletri .sk-tab").nth(3).click();
await page.waitForTimeout(800);
console.log("righe:", await page.locator("#sk-raccolta .skp-riga").count());
await page.locator("#sk-raccolta .skp-riga .skp-btn").first().click();
await page.waitForTimeout(300);
console.log("dettaglio:", (await page.locator("#sk-raccolta .skp-dettaglio").first().textContent() || "").replace(/\s+/g, " ").slice(0, 160));
await page.locator("#sk-raccolta .skp-riga .skp-btn").nth(1).click();
await page.waitForTimeout(200);
await page.fill("#sk-raccolta .skp-rinomina .skp-campo", "Prova rinominata");
await page.locator("#sk-raccolta .skp-rinomina .skp-btn").first().click();
await page.waitForTimeout(900);
console.log("dopo rinomina:", (await page.locator("#sk-raccolta .skp-nome").first().textContent() || "").trim());
console.log("errore in pagina:", await page.locator("#sk-raccolta .skp-errore").first().textContent().catch(() => "nessuno"));
console.log("porte:", await page.evaluate(() => ({ rinomina: typeof window.BD_RINOMINA_SCHELETRO })));
await page.locator("#sk-raccolta .skp-riga .skp-btn").nth(2).click();
await page.waitForTimeout(700);
console.log("costruttore nome:", await page.inputValue("#sk-nome"), "| righe:", await page.locator("#sk-schede .sk-riga").count());
console.log("costruttore visibile:", await page.evaluate(() => {
  const g = document.querySelector("#pag-scheletri .sk-grid");
  const r = document.getElementById("sk-raccolta");
  return { griglia: g.style.display === "" ? "visibile" : g.style.display, raccolta: r.style.display };
}));
console.log("esito:", (await page.locator("#sk-esito").textContent() || "").trim());
await browser.close(); server.close(); process.exit(0);
