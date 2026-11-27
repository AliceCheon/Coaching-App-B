import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
const radice = "/tmp/bdrepo";
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
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("errore:", String(e.message).slice(0, 120)));
await page.route(/gstatic\.com/, (r) => r.abort());
await page.addInitScript({ path: join(radice, "tests", "finti", "zona-b-finta-browser.js") });
await page.goto(base + "/desktop/index.html");
await page.waitForTimeout(2600);
/* anagrafica: banner del cognome */
const banner = await page.evaluate(() => {
  const b = [...document.querySelectorAll(".dc-banner")].find((n) => /cognome/i.test(n.textContent || ""));
  return b ? { visibile: !!(b.offsetParent), testo: (b.textContent || "").replace(/\s+/g, " ").slice(0, 70) } : "nessun banner";
});
console.log("banner cognome:", JSON.stringify(banner));
/* impostazioni */
await page.evaluate(() => { const v = [...document.querySelectorAll(".voce-pag, .nav-item, .rail a, button")].find((n) => /Impostazioni/i.test(n.textContent || "")); if (v) v.click(); });
await page.waitForTimeout(900);
const righe = await page.evaluate(() => {
  const q = (id) => { const n = document.getElementById(id); return n ? (n.textContent || "").trim() : "—"; };
  return { coda: q("st-sync-queue"), esporta: q("st-esporta"), azzera: q("st-azzera") };
});
console.log("impostazioni:", JSON.stringify(righe));
const notaCoda = await page.evaluate(() => {
  const riga = document.getElementById("st-sync-queue");
  const r = riga && riga.closest(".st-row");
  return r ? (r.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120) : "—";
});
console.log("riga coda:", notaCoda);
console.log("nota della coda:", await page.evaluate(() => {
  const n = document.getElementById("st-coda-nota");
  return n ? { testo: (n.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120), nascosta: n.hidden } : "assente";
}));
/* esporta: che cosa succede premendolo */
const dl = page.waitForEvent("download", { timeout: 8000 }).catch(() => null);
await page.click("#st-esporta");
const scaricato = await dl;
console.log("esporta:", scaricato ? "file " + scaricato.suggestedFilename() : "nessun file", await page.evaluate(() => {
  const n = document.getElementById("st-esporta-nota");
  return n ? (n.textContent || "").replace(/\s+/g, " ").trim().slice(0, 90) : "";
}));
/* azzera: prima dice cosa tocca */
await page.click("#st-azzera");
await page.waitForTimeout(700);
console.log("azzera dice:", await page.evaluate(() => {
  const n = document.getElementById("st-azzera-nota");
  return n ? (n.textContent || "").replace(/\s+/g, " ").trim().slice(0, 160) : "assente";
}));
await browser.close(); server.close(); process.exit(0);
