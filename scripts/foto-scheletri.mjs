/* Prova e foto della pagina Scheletri (passo 34): linguette, raccolta, salvataggio.
 * Uso: node scripts/foto-scheletri.mjs [cartella]
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";
import { chromium } from "playwright";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const uscita = process.argv[2] || "/tmp/foto-peso";
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".woff2": "font/woff2" };

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
for (const canale of ["chrome", "msedge", null]) {
  try { browser = await chromium.launch(canale ? { channel: canale } : {}); break; } catch {}
}
if (!browser) { console.log("nessun browser"); process.exit(1); }

const page = await browser.newPage({ viewport: { width: 1500, height: 1050 } });
page.on("pageerror", (e) => console.log("errore pagina:", String(e.message || e).slice(0, 160)));
await page.route(/gstatic\.com/, (r) => r.abort());
await page.addInitScript({ path: join(radice, "tests", "finti", "zona-b-finta-browser.js") });
await page.goto(base + "/desktop/index.html");
await page.waitForTimeout(2000);
await page.evaluate(() => window.BDVAI("scheletri"));
await page.waitForTimeout(600);

const stato = async (nota) => console.log(nota, JSON.stringify(await page.evaluate(() => {
  const tabs = [...document.querySelectorAll("#pag-scheletri .sk-tab")].map((b) => (b.textContent || "").replace(/\s+/g, " ").trim() + (b.disabled ? " [spento]" : ""));
  return {
    tabs,
    conteggio: (document.getElementById("sk-miei") || {}).textContent,
    raccoltaVisibile: (document.getElementById("sk-raccolta") || {}).style ? document.getElementById("sk-raccolta").style.display !== "none" : null,
    righe: document.querySelectorAll("#sk-raccolta .skp-riga").length,
    esito: (document.getElementById("sk-esito") || {}).textContent
  };
})));

await stato("iniziale:");
await page.screenshot({ path: join(uscita, "scheletri-pagina.png") });

/* linguetta «Miei scheletri» */
await page.locator("#pag-scheletri .sk-tab").nth(3).click();
await page.waitForTimeout(600);
await stato("dopo Miei scheletri:");
await page.screenshot({ path: join(uscita, "scheletri-raccolta.png") });

/* torno al costruttore, aggiungo due esercizi e salvo */
await page.locator("#pag-scheletri .sk-tab").nth(0).click();
await page.waitForTimeout(300);
await page.fill("#sk-nome", "Push Pull · prova");
await page.locator('#pag-scheletri .sk-chip[data-i="0"]').nth(0).click();
await page.waitForTimeout(200);
await page.locator('.sk-ex[data-i="0"][data-j="0"]').fill("Panca piana");
await page.locator('#pag-scheletri .sk-chip[data-i="0"]').nth(3).click();
await page.waitForTimeout(200);
await page.locator('.sk-ex[data-i="0"][data-j="1"]').fill("Squat");
await page.fill('.sk-set[data-i="0"][data-j="0"]', "4");
await page.waitForTimeout(200);
await page.locator("#sk-salva").click();
await page.waitForTimeout(1200);
await stato("dopo il salvataggio:");
console.log("porte:", JSON.stringify(await page.evaluate(async () => ({
  leggi: typeof window.BD_LEGGI_SCHELETRI,
  salva: typeof window.BD_SALVA_SCHELETRO,
  pagina: typeof window.BD_SCHELETRI_PAGINA,
  letti: typeof window.BD_LEGGI_SCHELETRI === "function" ? (await window.BD_LEGGI_SCHELETRI()).length : -1
}))));
console.log("zona:", JSON.stringify(await page.evaluate(() => Object.keys(window.__zonaB.dati))));
console.log("scheletri in zona:", await page.evaluate(() => JSON.stringify(window.__zonaB.dati.scheletri || null).slice(0, 300)));
console.log("esito raccolta:", await page.evaluate(() => (document.getElementById("sk-esito-raccolta") || {}).textContent));
await page.screenshot({ path: join(uscita, "scheletri-salvato.png") });

await browser.close();
server.close();
process.exit(0);
