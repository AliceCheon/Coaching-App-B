/* Come dal telefono: scrivere nella descrizione, passare al messaggio, e poi
 * nella rotazione — la pagina non deve saltare né perdere il testo. */
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
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("errore:", String(e.message).slice(0, 140)));
await page.route(/gstatic\.com/, (r) => r.abort());
await page.addInitScript({ path: join(radice, "tests", "finti", "zona-b-finta-browser.js") });
await page.goto(base + "/desktop/index.html");
await page.waitForTimeout(2600);
await page.evaluate(() => window.BDVAI("programma-1"));
await page.waitForTimeout(900);

const sonda = () => page.evaluate(() => {
  const a = document.querySelector('[data-pr-c="programma-descrizione"]');
  const m = document.querySelector('[data-pr-c="programma-messaggio"]');
  const r = document.querySelector('[data-pr-c="programma-rotazione"]');
  return { y: Math.round(window.scrollY), alt: Math.round(document.documentElement.scrollHeight),
    desc: a && a.value, msg: m && m.value, rot: r && r.value,
    fuoco: document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute("data-pr-c") };
});
const stato = () => page.evaluate(() => ((document.querySelector("#modifica-stato") || {}).textContent || "").trim());

await page.locator('[data-pr-c="programma-descrizione"]').scrollIntoViewIfNeeded();
console.log("prima:", JSON.stringify(await sonda()));
await page.locator('[data-pr-c="programma-descrizione"]').click();
await page.keyboard.type("Forza tre giorni", { delay: 130 });
console.log("scritto descrizione:", JSON.stringify(await sonda()));
await page.locator('[data-pr-c="programma-messaggio"]').click();
await page.keyboard.type("Ciao, oggi gambe", { delay: 130 });
console.log("scritto messaggio:", JSON.stringify(await sonda()));
console.log("ingombro bot:", JSON.stringify(await page.evaluate(() => {
  const b = document.querySelector("#bd-diva");
  if (!b) return "assente";
  const r = b.getBoundingClientRect();
  return { left: Math.round(r.left), top: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), puntatore: getComputedStyle(b).pointerEvents };
})));
await page.locator('[data-pr-c="programma-rotazione"]').click({ force: true });
await page.keyboard.press("Control+A");
await page.keyboard.type("A B C", { delay: 130 });
console.log("scritto rotazione:", JSON.stringify(await sonda()));
await page.evaluate(() => document.activeElement && document.activeElement.blur());
await page.waitForTimeout(2600);
console.log("dopo uscita:", JSON.stringify(await sonda()), "| stato:", await stato());
await page.screenshot({ path: "/tmp/telefono-punto16.png", fullPage: false });
await browser.close(); server.close(); process.exit(0);
