/* Due aperture consecutive col finto SDK: la seconda NON deve mostrare la carta
 * d'accesso, e in Impostazioni deve esserci «Esci da questo dispositivo». */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".woff2": "font/woff2" };
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
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("errore:", String(e.message).slice(0, 140)));
await page.route(/gstatic\.com/, (r) => r.abort());
await page.addInitScript({ path: join(radice, "tests", "finti", "zona-b-finta-browser.js") });

const primaCarta = async () => page.evaluate(() => {
  const v = document.querySelector("#veloAccesso31");
  if (!v) return "velo assente";
  const vis = getComputedStyle(v).display !== "none";
  const testo = (v.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60);
  return vis ? "VISIBILE («" + testo + "»)" : "nascosta";
});
await page.goto(base + "/desktop/index.html");
await page.waitForTimeout(1500);
console.log("prima apertura, carta:", await primaCarta());
await page.waitForTimeout(3000);
await page.reload();
for (const t of [300, 800, 1600, 2600]) {
  await page.waitForTimeout(t === 300 ? 300 : t - 300);
  console.log("dopo il refresh a " + t + " ms, carta:", await primaCarta());
}
const uscita = await page.evaluate(() => {
  const t = document.getElementById("st-esci");
  return t ? t.textContent : "tasto non presente";
});
console.log("tasto di uscita:", uscita);
console.log("email ricordata:", await page.evaluate(() => Object.keys(localStorage).filter((k) => /accesso/i.test(k)).join(",") || "nessuna chiave"));
await browser.close(); server.close(); process.exit(0);
