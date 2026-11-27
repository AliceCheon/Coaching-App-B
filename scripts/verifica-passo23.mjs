/* Le voci del primo blocco, viste nella pagina vera. */
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
await page.evaluate(() => window.BDVAI && window.BDVAI("programma-1"));
await page.waitForTimeout(1200);

const testo = () => page.evaluate(() => document.body.innerText || "");
const t = await testo();
console.log("nastro:", (t.match(/(\d+)\s+esercizi/i) || ["non trovato"])[0]);
console.log("settimana:", (t.match(/settimana\s+\d+\s+di\s+\d+/i) || ["non trovata"])[0]);
console.log("dicitura 1 seduta:", /1 sedut[ae]/i.test(t) ? "sì" : "no");
await page.evaluate(() => { const v = [...document.querySelectorAll("a, button, .nav-item")].find((n) => /Database esercizi/i.test(n.textContent || "")); if (v) v.click(); });
await page.waitForTimeout(1200);
const db = await page.evaluate(() => {
  const t = document.body.innerText || "";
  const m = t.match(/(\d+)\s+esercizi/i);
  const righe = [...document.querySelectorAll("tr")].map((n) => (n.textContent || "").trim().toLowerCase()).filter((x) => x.startsWith("pressa"));
  const conta = {}; righe.forEach((x) => { conta[x] = (conta[x] || 0) + 1; });
  return { dichiarati: m ? m[0] : "—", pressaRighe: righe.length, doppie: Object.values(conta).filter((n) => n > 1).length };
});
console.log("database:", JSON.stringify(db));
await page.evaluate(() => { const v = [...document.querySelectorAll("a, button, .nav-item")].find((n) => /Impostazioni/i.test(n.textContent || "")); if (v) v.click(); });
await page.waitForTimeout(1200);
console.log("impostazioni:", await page.evaluate(() => {
  const t = document.body.innerText || "";
  const build = (t.match(/b0\.\d+[-a-z0-9]*/i) || ["build non mostrata"])[0];
  const schede = (t.match(/Schede\s+(\d+|non registrato)/i) || [])[0] || "—";
  const esercizi = (t.match(/Esercizi in libreria\s+(\d+|non registrato)/i) || [])[0] || "—";
  return { build, schede, esercizi };
}));
await browser.close(); server.close(); process.exit(0);
