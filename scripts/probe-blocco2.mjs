/* Sonda del secondo blocco (impaginazione): fumetto, Study time, lampadina.
 * Uso: node scripts/probe-blocco2.mjs [--shot nomeBase]
 * Salva /tmp/blocco2-<nomeBase>-<vista>-<larghezza>.png e stampa le misure. */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".woff2": "font/woff2", ".woff": "font/woff" };
const server = createServer(async (req, res) => {
  try {
    const u = new URL(req.url, "http://x"); let p = decodeURIComponent(u.pathname); if (p.endsWith("/")) p += "index.html";
    res.writeHead(200, { "content-type": MIME[extname(p)] || "application/octet-stream" }); res.end(await readFile(join(radice, p)));
  } catch { res.writeHead(404); res.end("no"); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = "http://127.0.0.1:" + server.address().port;

const shot = process.argv.includes("--shot");
const tag = (process.argv[process.argv.indexOf("--shot") + 1] && !process.argv[process.argv.indexOf("--shot") + 1].startsWith("--"))
  ? process.argv[process.argv.indexOf("--shot") + 1] : "sonda";

let browser = null;
for (const c of ["chrome", "msedge", null]) { try { browser = await chromium.launch(c ? { channel: c } : {}); break; } catch {} }
const viste = ["dashboard", "specializzazione", "misure", "overview-atleta", "impostazioni", "study-time"];
const larghezze = [[1440, 900], [1280, 800]];

const R = (r) => r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), r: Math.round(r.right), b: Math.round(r.bottom) } : null;
const sovrapp = (a, b, m = 0) => !!a && !!b && a.x < b.r - m && b.x < a.r - m && a.y < b.b - m && b.y < a.b - m;

for (const [W, H] of larghezze) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.route(/gstatic\.com/, (r) => r.abort());
  await page.addInitScript({ path: join(radice, "tests", "finti", "zona-b-finta-browser.js") });
  page.on("pageerror", (e) => console.log("errore pagina:", String(e.message).slice(0, 160)));
  await page.goto(base + "/desktop/index.html");
  await page.waitForTimeout(2800);
  console.log("\n===== " + W + "x" + H + " =====");

  for (const vista of viste) {
    await page.evaluate((v) => {
      const b = document.querySelector('.voce[data-vista="' + v + '"]');
      if (b) b.click();
    }, vista);
    await page.waitForTimeout(1200);

    const m = await page.evaluate(() => {
      const b = document.getElementById('dv-fumetto');
      const br = b.getBoundingClientRect();
      const pag = document.querySelector('.voce-pag.on');
      const sel = 'input:not([type=hidden]),select,textarea,button,a[href],[contenteditable="true"],[contenteditable="plaintext-only"],.filtri';
      const pezzi = [];
      if (pag) {
        for (const n of pag.querySelectorAll(sel)) {
          if (n.closest('#bd-diva')) continue;
          const s = getComputedStyle(n);
          if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) < 0.05) continue;
          const r = n.getBoundingClientRect();
          if (r.width < 4 || r.height < 4) continue;
          if (r.bottom < 0 || r.top > innerHeight) continue;
          const hit = !(r.left >= br.right || br.left >= r.right || r.top >= br.bottom || br.top >= r.bottom);
          if (hit) pezzi.push({ tag: n.tagName.toLowerCase(), cls: (n.className || '').toString().slice(0, 40), id: n.id || '', txt: (n.textContent || '').trim().slice(0, 40), r: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } });
        }
      }
      return { fumetto: { x: Math.round(br.x), y: Math.round(br.y), w: Math.round(br.width), h: Math.round(br.height), off: b.classList.contains('off') },
        testo: (document.getElementById('dv-where') || {}).textContent + ' — ' + ((document.getElementById('dv-testo') || {}).textContent || '').slice(0, 60),
        coperti: pezzi.slice(0, 8), copertiN: pezzi.length };
    });
    console.log("[" + vista + "] fumetto", JSON.stringify(m.fumetto), "| dice:", m.testo);
    console.log("   coperti:", m.copertiN, JSON.stringify(m.coperti));

    if (vista === "study-time") {
      const st = await page.evaluate(() => {
        const carte = [...document.querySelectorAll('#pag-study-time .st-grid > .st-card')].map((c) => {
          const r = c.getBoundingClientRect(); const f = c.querySelector('.st-fig'); const fr = f ? f.getBoundingClientRect() : null;
          const i = c.querySelector('.st-fig img'); const ir = i ? i.getBoundingClientRect() : null;
          return { h4: (c.querySelector('h4') || {}).textContent, card: Math.round(r.height), fig: fr ? { w: Math.round(fr.width), h: Math.round(fr.height) } : null, img: ir ? { w: Math.round(ir.width), h: Math.round(ir.height) } : null };
        });
        const zoom = [];
        document.querySelectorAll('#pag-study-time .st-zoom').forEach((z) => {
          const zr = z.getBoundingClientRect(); const f = z.closest('.st-fig'); const fr = f ? f.getBoundingClientRect() : null;
          const ir = f && f.querySelector('img') ? f.querySelector('img').getBoundingClientRect() : null;
          zoom.push({ dentroFigura: !!(fr && zr.left >= fr.left && zr.right <= fr.right && zr.top >= fr.top && zr.bottom <= fr.bottom), sopraImmagine: !!(ir && zr.left < ir.right && ir.left < zr.right && zr.top < ir.bottom && ir.top < zr.bottom), z: { x: Math.round(zr.x), y: Math.round(zr.y), w: Math.round(zr.width), h: Math.round(zr.height) } });
        });
        return { carte, zoom };
      });
      console.log("   study:", JSON.stringify(st));
    }

    if (vista === "dashboard") {
      const n = await page.evaluate(() => {
        const lamp = document.getElementById('bd-tema');
        const fr = document.getElementById('fr-nastro');
        const nas = document.querySelector('.nastro');
        const g = (n) => { if (!n) return null; const r = n.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), r: Math.round(r.right), b: Math.round(r.bottom), txt: (n.textContent || '').trim().slice(-40) }; };
        return { lamp: g(lamp), fr: g(fr), nastro: g(nas) };
      });
      console.log("   lampadina/nastro:", JSON.stringify(n));
    }

    if (shot) await page.screenshot({ path: "/tmp/blocco2-" + tag + "-" + vista + "-" + W + ".png" });
  }
  await page.close();
}
await browser.close(); server.close(); process.exit(0);
