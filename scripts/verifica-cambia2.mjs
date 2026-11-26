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
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", (e) => console.log("errore:", String(e.message).slice(0, 120)));
await page.route(/gstatic\.com/, (r) => r.abort());
await page.addInitScript({ path: join(radice, "tests", "finti", "zona-b-finta-browser.js") });
await page.goto(base + "/desktop/index.html");
await page.waitForTimeout(2300);
await page.evaluate(() => window.BDVAI("programma-1"));
await page.waitForTimeout(600);
const altezza = () => page.evaluate(() => document.querySelector("#pag-programma-1").getBoundingClientRect().height);
const prima = await altezza();
await page.locator("#programma-attivo .pr-acts button").filter({ hasText: "Cambia" }).first().click();
await page.waitForTimeout(400);
const dopo = await altezza();
const pos = await page.evaluate(() => {
  const p = document.querySelector(".pr-elenco-programmi");
  if (!p) return null;
  const r = p.getBoundingClientRect();
  const s = getComputedStyle(p);
  return { posizione: s.position, z: s.zIndex, dentroFinestra: r.bottom <= window.innerHeight + 1, altezza: Math.round(r.height) };
});
console.log("altezza pagina prima/dopo:", prima, dopo, "| pannello:", JSON.stringify(pos));
await page.screenshot({ path: "/tmp/cambia-sopra.png" });
console.log("tasti atti:", await page.evaluate(() => [...document.querySelectorAll("#programma-attivo .pr-acts button")].map(b => b.textContent.trim() + (b.disabled ? "[spento]" : "") + (b.dataset.confronta ? "[confronta]" : ""))));
await page.keyboard.press("Escape");
await page.waitForTimeout(200);
console.log("chiuso con Esc:", await page.evaluate(() => !document.querySelector(".pr-elenco-programmi")));
await browser.close(); server.close(); process.exit(0);
