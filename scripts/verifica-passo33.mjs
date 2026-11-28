/* Il suggerimento degli scheletri vede le voci nuove del catalogo. */
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
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
page.on("pageerror", (e) => console.log("ERRORE:", String(e.message).slice(0, 140)));
await page.route(/gstatic\.com/, (r) => r.abort());
await page.addInitScript({ path: join(radice, "tests", "finti", "zona-b-finta-browser.js") });
await page.goto(base + "/desktop/index.html");
await page.waitForTimeout(3000);
await page.evaluate(() => { const v = [...document.querySelectorAll("a, button, .nav-item")].find((n) => /Scheletri/i.test(n.textContent || "")); if (v) v.click(); });
await page.waitForTimeout(1500);
console.log("catalogo vivo:", await page.evaluate(() => (window.BD_CATALOGO || []).length));
console.log("campi sk-ex:", await page.evaluate(() => document.querySelectorAll(".sk-ex").length));
console.log("pagina scheletri:", await page.evaluate(() => !!document.getElementById("sk-schede") ));
const esito = await page.evaluate(() => {
  const campo = document.querySelector(".sk-ex");
  if (!campo) return "campo esercizio non trovato";
  campo.focus();
  campo.value = "pendulum";
  campo.dispatchEvent(new Event("input", { bubbles: true }));
  const sug = document.querySelector(".sk-sug");
  return { suggerimenti: sug ? sug.textContent.replace(/\s+/g, " ").slice(0, 160) : "nessun pannello" };
});
console.log("digitando «pendulum»:", JSON.stringify(esito));
await browser.close(); server.close(); process.exit(0);
