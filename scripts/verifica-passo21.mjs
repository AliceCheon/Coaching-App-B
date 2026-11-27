/* La pagina Progressioni: 34 voci, «Vedi», «Duplica», «＋ Crea progressione custom». */
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
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
page.on("pageerror", (e) => console.log("ERRORE:", String(e.message).slice(0, 160)));
await page.route(/gstatic\.com/, (r) => r.abort());
await page.addInitScript({ path: join(radice, "tests", "finti", "zona-b-finta-browser.js") });
await page.goto(base + "/desktop/index.html");
await page.waitForTimeout(2600);
await page.evaluate(() => { const v = [...document.querySelectorAll("a, button, .nav-item")].find((n) => /Progressioni/i.test(n.textContent || "")); if (v) v.click(); });
await page.waitForTimeout(1500);
const voce = () => page.evaluate(() => {
  const t = document.body.innerText || "";
  return {
    vedi: document.querySelectorAll("[data-lib-vedi]").length,
    duplica: document.querySelectorAll("[data-lib-duplica]").length,
    custom: document.querySelectorAll("[data-lib-modifica]").length,
    crea: /crea progressione custom/i.test(t)
  };
});
console.log("pagina:", JSON.stringify(await voce()));
await page.evaluate(() => { const b = document.querySelector("[data-lib-vedi]"); if (b) b.click(); });
await page.waitForTimeout(900);
console.log("tabella Vedi:", await page.evaluate(() => {
  const m = document.querySelector(".prog-modal");
  if (!m) return "non aperta";
  const righe = m.querySelectorAll(".prog-table tr").length;
  return { righe: righe, inizio: (m.textContent || "").replace(/\s+/g, " ").trim().slice(0, 140) };
}));
await browser.close(); server.close(); process.exit(0);
