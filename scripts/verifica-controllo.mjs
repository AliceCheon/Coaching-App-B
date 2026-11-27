/* Verifica delle voci del giro di controllo: nastro «35 esercizi», build in
 * Impostazioni, doppioni nel database. */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png" };
const server = createServer(async (req, res) => {
  try { const u = new URL(req.url, "http://x"); let p = decodeURIComponent(u.pathname); if (p.endsWith("/")) p += "index.html";
    res.writeHead(200, { "content-type": MIME[extname(p)] || "application/octet-stream" }); res.end(await readFile(join(radice, p)));
  } catch { res.writeHead(404); res.end("no"); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = "http://127.0.0.1:" + server.address().port;
let browser = null;
for (const c of ["chrome", "msedge", null]) { try { browser = await chromium.launch(c ? { channel: c } : {}); break; } catch {} }
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.route(/gstatic\.com/, (r) => r.abort());
await page.addInitScript({ path: join(radice, "tests", "finti", "zona-b-finta-browser.js") });
await page.goto(base + "/desktop/index.html");
await page.waitForTimeout(2800);
console.log("nastro:", await page.evaluate(() => {
  const t = document.body.innerText || "";
  const m = t.match(/(\d+)\s+esercizi/i);
  return m ? m[0] : "non trovato";
}));
console.log("build in pagina:", await page.evaluate(() => {
  const t = document.body.innerText || "";
  const m = t.match(/v\d+\.\d+/);
  return m ? m[0] : "non trovata";
}));
console.log("doppioni 'pressa':", await page.evaluate(() => {
  const righe = [...document.querySelectorAll("tr, .db-riga, li")].map((n) => (n.textContent || "").trim().toLowerCase()).filter((t) => t.startsWith("pressa"));
  const conta = {};
  righe.forEach((t) => { conta[t] = (conta[t] || 0) + 1; });
  return { righe: righe.length, doppie: Object.entries(conta).filter(([, n]) => n > 1).map(([t, n]) => t.slice(0, 30) + " ×" + n) };
}));
await browser.close(); server.close(); process.exit(0);
