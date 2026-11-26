/* Prova della linguetta «Mesi» in Monitor peso (passo 40). */
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
await page.waitForTimeout(2200);
await page.evaluate(() => window.BDVAI("monitor-peso"));
await page.waitForTimeout(700);

const stato = () => page.evaluate(() => {
  const on = document.querySelector("#pag-monitor-peso .mp-pane.on");
  const righe = document.querySelectorAll("#mp-mesi tr");
  return { pannello: on ? on.getAttribute("data-p") : null, linguetta: (document.querySelector("#pag-monitor-peso .mp-tab.on") || {}).textContent, righeMesi: righe.length, primo: righe[0] ? (righe[0].textContent || "").replace(/\s+/g, " ").trim() : null };
});
console.log("prima:", JSON.stringify(await stato()));
await page.locator('#pag-monitor-peso .mp-tab[data-t="mesi"]').click();
await page.waitForTimeout(300);
console.log("dopo clic Mesi:", JSON.stringify(await stato()));
console.log("misure:", JSON.stringify(await page.evaluate(() => {
  const t = document.querySelector("#mp-mesi table");
  const d = document.getElementById("mp-mesi");
  const pane = document.querySelector('#pag-monitor-peso .mp-pane[data-p="mesi"]');
  const info = (n) => n ? { w: Math.round(n.getBoundingClientRect().width), display: getComputedStyle(n).display, ml: getComputedStyle(n).marginLeft, ta: getComputedStyle(n).textAlign } : null;
  return { tabella: info(t), contenitore: info(d), pannello: info(pane), thDuplicati: document.querySelectorAll('#pag-monitor-peso .mp-pane .mp-th').length, thead: t ? t.querySelectorAll("thead th").length : 0 };
})));
await page.screenshot({ path: "/tmp/monitor-mesi.png" });
await page.locator('#pag-monitor-peso .mp-tab[data-t="sett"]').click();
await page.waitForTimeout(200);
console.log("torno a Pesate:", JSON.stringify(await stato()));
await browser.close(); server.close(); process.exit(0);
