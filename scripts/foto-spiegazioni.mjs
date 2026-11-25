/* Foto e prova del pannello Spiegazioni: apre la pagina vera, va in Programma 1,
 * preme il tasto e salva l'immagine. Uso: node scripts/foto-spiegazioni.mjs [cartella]
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

const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.route(/gstatic\.com/, (r) => r.abort());
await page.addInitScript({ path: join(radice, "tests", "finti", "zona-b-finta-browser.js") });
await page.goto(base + "/desktop/index.html");
await page.waitForSelector(".p8-tab", { state: "attached", timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1600);
await page.evaluate(() => window.BDVAI("programma-1"));
await page.waitForTimeout(700);

const tasto = page.locator('[data-spiegazioni="1"]').first();
console.log("tasto presente:", await tasto.count(), "| spento:", await tasto.isDisabled().catch(() => "n/d"));
await tasto.click();
await page.waitForTimeout(400);
const aperto = await page.evaluate(() => {
  const m = document.querySelector(".bd-spiega");
  if (!m) return null;
  const r = m.getBoundingClientRect();
  return { rect: [r.x, r.y, r.width, r.height], voci: m.querySelectorAll(".pr-spiega > div").length, padre: m.parentElement === document.body };
});
console.log("pannello:", JSON.stringify(aperto));
const misura = await page.evaluate(() => {
  const m = document.querySelector(".bd-spiega");
  const r = m.getBoundingClientRect();
  const s = getComputedStyle(m);
  const c = m.querySelector(".pr-mbox").getBoundingClientRect();
  const inMezzo = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
  return { rect: [r.x, r.y, r.width, r.height], display: s.display, z: s.zIndex, vis: s.visibility, op: s.opacity, box: [c.x, c.y, c.width, c.height], sopra: inMezzo ? inMezzo.id || inMezzo.className : null };
});
console.log("misura:", JSON.stringify(misura));
console.log("catena:", await page.evaluate(() => {
  const out = [];
  let n = document.getElementById("pr-mspiega");
  while (n && n.tagName) {
    const s = getComputedStyle(n);
    out.push((n.id || n.className || n.tagName) + " [display:" + s.display + "]");
    n = n.parentElement;
  }
  return out.join(" < ");
}));
await page.screenshot({ path: join(uscita, "spiegazioni-aperte.png") });
await page.keyboard.press("Escape");
await page.waitForTimeout(200);
console.log("dopo Esc chiuso:", await page.evaluate(() => !document.querySelector(".bd-spiega")));
await browser.close();
server.close();
process.exit(0);
