import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { chromium } from "playwright";
const radice = "/tmp/bdrepo";
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png" };
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
const pagine = ["Dashboard", "Overview", "Archivio"];
for (const nome of pagine) {
  await page.evaluate((n) => { const v = [...document.querySelectorAll("a, button, .nav-item")].find((x) => new RegExp("^" + n, "i").test((x.textContent || "").trim())); if (v) v.click(); }, nome);
  await page.waitForTimeout(1100);
  const riga = await page.evaluate(() => {
    const t = document.body.innerText || "";
    const s = t.match(/settimana[^\n]{0,40}/i);
    return s ? s[0].replace(/\s+/g, " ").trim() : "—";
  });
  console.log(nome + ":", riga);
}
await browser.close(); server.close(); process.exit(0);
