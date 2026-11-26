/* Prova «Cambia programma» (passo 41): crea un programma dallo scheletro,
 * lo apre, poi torna indietro dall'elenco «Cambia». */
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
page.on("pageerror", (e) => console.log("errore pagina:", String(e.message || e).slice(0, 160)));
await page.route(/gstatic\.com/, (r) => r.abort());
await page.addInitScript({ path: join(radice, "tests", "finti", "zona-b-finta-browser.js") });
await page.goto(base + "/desktop/index.html");
await page.waitForTimeout(2300);

const nome = async () => page.evaluate(() => { const i = document.querySelector("#programma-attivo input"); return i ? i.value : null; });
console.log("programma iniziale:", await nome());

/* crea un programma dallo scheletro */
await page.evaluate(() => window.BDVAI("scheletri"));
await page.waitForTimeout(500);
await page.fill("#sk-nome", "Push Pull nuovo");
await page.locator('#pag-scheletri .sk-chip[data-i="0"]').nth(0).click();
await page.locator('.sk-ex[data-i="0"][data-j="0"]').fill("Panca piana");
await page.keyboard.press("Escape");
await page.waitForTimeout(150);
await page.locator("#sk-crea-programma").click();
await page.waitForTimeout(300);
await page.locator(".sk-conf-programma .sk-conf-si").first().click();
await page.waitForTimeout(1500);
console.log("esito creazione:", (await page.locator("#sk-esito").textContent() || "").trim());
const apri = page.locator(".sk-conf-programma .sk-conf-si").first();
console.log("offre di aprirlo:", await apri.count());
if (await apri.count()) { await apri.click(); await page.waitForTimeout(2200); }

await page.evaluate(() => window.BDVAI("programma-1"));
await page.waitForTimeout(800);
console.log("programma dopo apertura:", await nome());

/* «Cambia»: elenco e ritorno */
await page.locator("#programma-attivo .pr-acts button", { hasText: "Cambia" }).first().click();
await page.waitForTimeout(400);
console.log("elenco:", (await page.locator(".pr-elenco-programmi").first().textContent() || "").replace(/\s+/g, " ").slice(0, 220));
const righe = page.locator(".pr-elenco-riga");
const quante = await righe.count();
console.log("righe elenco:", quante);
if (quante > 1) {
  const rigaApri = righe.nth(0).locator("button").filter({ hasText: "Apri" }).first();
  await rigaApri.click();
  await page.waitForTimeout(300);
  const si = page.locator(".pr-conf button").filter({ hasText: /^Sì, apri/ }).first();
  if (await si.count()) await si.click();
  await page.waitForTimeout(2200);
}
console.log("programma dopo Cambia:", await nome());
await page.screenshot({ path: "/tmp/cambia-programma.png" });
await browser.close(); server.close(); process.exit(0);
