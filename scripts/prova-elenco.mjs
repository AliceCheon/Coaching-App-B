/* Prova: l'elenco degli esercizi si vede anche sulle ultime righe della scheda.
 * Uso: node scripts/prova-elenco.mjs [cartella-foto] */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const uscita = process.argv[2] || "/tmp";
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

const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.route(/gstatic\.com/, (r) => r.abort());
await page.addInitScript({ path: join(radice, "tests", "finti", "zona-b-finta-browser.js") });
await page.goto(base + "/desktop/index.html");
await page.waitForTimeout(2000);
await page.evaluate(() => window.BDVAI("scheletri"));
await page.waitForTimeout(500);

/* quattro righe, l'ultima sul fondo: si preme il gruppo e si guarda l'elenco */
for (const [i, chip] of [[0, 8], [1, 3], [2, 2], [3, 8]]) {
  await page.locator(`#pag-scheletri .sk-chip[data-i="0"]`).nth(chip).click();
  await page.waitForTimeout(120);
  await page.keyboard.press("Escape");
  await page.evaluate(() => { document.querySelectorAll(".sk-sug.on").forEach((e) => e.classList.remove("on")); document.activeElement && document.activeElement.blur && document.activeElement.blur(); });
}
const ultimo = page.locator('.sk-ex[data-i="0"][data-j="3"]');
await ultimo.scrollIntoViewIfNeeded();
await ultimo.click();
await page.waitForTimeout(400);

const misura = await page.evaluate(() => {
  const campo = document.querySelector('.sk-ex[data-i="0"][data-j="3"]');
  const sug = document.querySelector('.sk-sug[data-i="0"][data-j="3"]');
  if (!campo || !sug) return null;
  const r = sug.getBoundingClientRect();
  const c = campo.getBoundingClientRect();
  const punti = [[r.left + 20, r.top + 12], [r.left + 20, Math.min(r.bottom - 6, window.innerHeight - 6)]];
  return {
    visibile: getComputedStyle(sug).display !== "none" && r.height > 0,
    dentroFinestra: r.top >= 0 && r.bottom <= window.innerHeight + 1,
    verso: sug.classList.contains("su") ? "sopra" : "sotto",
    altezza: Math.round(r.height),
    campo: { top: Math.round(c.top), bottom: Math.round(c.bottom) },
    sopraAlPunto: punti.map(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? (e.className || e.tagName) : null; }),
    voci: sug.querySelectorAll(".sk-opt").length
  };
});
console.log("elenco:", JSON.stringify(misura));
await page.screenshot({ path: join(uscita, "elenco-esercizi.png") });

/* si sceglie una voce e si controlla che finisca nella riga */
const primaVoce = page.locator('.sk-sug[data-i="0"][data-j="3"] .sk-opt').first();
const nomeScelto = (await primaVoce.textContent() || "").trim();
await primaVoce.click();
await page.waitForTimeout(300);
console.log("scelto:", nomeScelto, "| riga:", await page.evaluate(() => document.querySelector('.sk-ex[data-i="0"][data-j="3"]').value));

await browser.close(); server.close(); process.exit(0);
