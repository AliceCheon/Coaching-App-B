import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join, extname } from "node:path";
import { chromium } from "playwright";
const radice = "/tmp/bdrepo";
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
const page = await browser.newPage({ viewport: { width: 1500, height: 1050 } });
page.on("pageerror", (e) => console.log("errore pagina:", String(e.message || e).slice(0, 200)));
await page.route(/gstatic\.com/, (r) => r.abort());
await page.addInitScript({ path: join(radice, "tests", "finti", "zona-b-finta-browser.js") });
await page.goto(base + "/desktop/index.html");
await page.waitForTimeout(2200);
await page.evaluate(() => window.BDVAI("scheletri"));
await page.waitForTimeout(600);
await page.fill("#sk-nome", "Push Pull · nuovo");
await page.locator('#pag-scheletri .sk-chip[data-i="0"]').nth(0).click();
await page.locator('.sk-ex[data-i="0"][data-j="0"]').fill("Panca piana");
await page.locator('#pag-scheletri .sk-chip[data-i="0"]').nth(3).click();
await page.locator('.sk-ex[data-i="0"][data-j="1"]').fill("Squat");
await page.waitForTimeout(200);
await page.locator("#sk-crea-programma").click();
await page.waitForTimeout(500);
console.log("esito dopo clic crea:", (await page.locator("#sk-esito").textContent() || "").replace(/\s+/g, " "));
console.log("conferme in pagina:", await page.locator(".sk-conf-programma").count());
console.log("porte:", await page.evaluate(() => ({ crea: typeof window.BD_CREA_PROGRAMMA, attiva: typeof window.BD_ATTIVA_PROGRAMMA, pagina: typeof window.BD_SCHELETRI_PAGINA })));
console.log("esercizi costruttore:", await page.evaluate(() => (window.BD_COSTRUTTORE_SCHELETRI ? window.BD_COSTRUTTORE_SCHELETRI().schede[0].righe.length : -1)));
if (!(await page.locator(".sk-conf-programma").count())) { await browser.close(); server.close(); process.exit(0); }
console.log("conferma:", (await page.locator(".sk-conf-programma").first().textContent() || "").replace(/\s+/g, " ").slice(0, 220));
await page.locator(".sk-conf-programma .sk-conf-si").first().click();
await page.waitForTimeout(1600);
console.log("esito:", (await page.locator("#sk-esito").textContent() || "").replace(/\s+/g, " "));
console.log("seconda conferma:", (await page.locator(".sk-conf-programma").first().textContent().catch(() => "") || "").replace(/\s+/g, " ").slice(0, 200));
const apri = page.locator(".sk-conf-programma .sk-conf-si").first();
if (await apri.count()) { await apri.click(); await page.waitForTimeout(2000); }
console.log("esito dopo apri:", (await page.locator("#sk-esito").textContent() || "").replace(/\s+/g, " "));
await page.evaluate(() => window.BDVAI("programma-1"));
await page.waitForTimeout(900);
console.log("programma mostrato:", await page.evaluate(() => {
  const n = document.querySelector("#programma-attivo input");
  return { nome: n ? n.value : null, schede: [...document.querySelectorAll("#programma-attivo .pr-ntab")].map(b => (b.textContent||"").trim()).slice(0, 4) };
}));
console.log("righe in pagina:", await page.evaluate(() => [...document.querySelectorAll("#programma-attivo tr.p8-r")].map(tr => (tr.textContent||"").replace(/\s+/g," ").trim().slice(0,40)).slice(0, 6)));
console.log("tab scheda attiva:", await page.evaluate(() => {
  const t = document.querySelector("#programma-attivo .pr-ntab.on");
  return t ? (t.textContent||"").trim() : null;
}));
await browser.close(); server.close(); process.exit(0);
