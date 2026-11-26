/* Verifica visiva del confronto (passo 43) con il finto Firestore. */
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

const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on("pageerror", (e) => console.log("errore:", String(e.message).slice(0, 160)));
await page.route(/gstatic\.com/, (r) => r.abort());
await page.addInitScript({ path: join(radice, "tests", "finti", "zona-b-finta-browser.js") });
await page.goto(base + "/desktop/index.html");
await page.waitForTimeout(2300);

/* 1. un secondo programma, dallo scheletro */
await page.evaluate(() => window.BDVAI("scheletri"));
await page.waitForTimeout(500);
await page.fill("#sk-nome", "Confronto prova");
await page.locator('#pag-scheletri .sk-chip[data-i="0"]').nth(0).click();
await page.locator('.sk-ex[data-i="0"][data-j="0"]').fill("Panca piana");
await page.keyboard.press("Escape");
await page.waitForTimeout(150);
await page.locator("#sk-crea-programma").click();
await page.waitForTimeout(300);
await page.locator(".sk-conf-programma .sk-conf-si").first().click();
await page.waitForTimeout(1600);

/* 2. confronto dal programma in uso verso l'altro */
await page.evaluate(() => window.BDVAI("programma-1"));
await page.waitForTimeout(800);
const altezzaPagina = () => page.evaluate(() => document.querySelector("#pag-programma-1").getBoundingClientRect().height);
const prima = await altezzaPagina();
await page.locator("#programma-attivo .pr-acts button").filter({ hasText: "Confronta con" }).first().click();
await page.waitForTimeout(500);
console.log("pannello:", (await page.locator(".pr-elenco-programmi").first().textContent().catch(() => "nessuno") || "").replace(/\s+/g, " ").slice(0, 260));
console.log("tasti pannello:", await page.evaluate(() => [...document.querySelectorAll(".pr-elenco-programmi button")].map(b => b.textContent.trim() + (b.disabled ? "[spento]" : ""))));
const righe = page.locator(".pr-elenco-riga");
const quante = await righe.count();
let scelta = false;
const confronta = righe.nth(1).locator("button").filter({ hasText: /^Confronta$/ }).first();
if (await confronta.count()) { await confronta.click(); scelta = true; }
await page.waitForTimeout(700);
const si = page.locator(".pr-conf button").filter({ hasText: /^Sì/ }).first();
if (await si.count()) { await si.click(); await page.waitForTimeout(1200); }

const esito = await page.evaluate(() => {
  const finestra = document.querySelector(".pc-conf-window") || document.querySelector("[class*='conf-finestra']") || document.querySelector("[class*='confronto-grande']") || document.querySelector(".pc-finestra-testo");
  const tasti = document.querySelectorAll("[data-settimana], .pc-sett, .sett");
  const tabelle = document.querySelectorAll("table");
  return {
    finestra: finestra ? { classe: finestra.className, altezza: Math.round(finestra.getBoundingClientRect().height) } : null,
    tastiSettimana: tasti.length,
    tabelle: tabelle.length,
    differenze: Boolean(document.body.textContent.match(/non registrato|Differenze/i)),
    testo: document.body.textContent.replace(/\s+/g, " ").slice(0, 0)
  };
});
console.log("scelta:", scelta, "| confronto:", JSON.stringify(esito));
console.log("altezza pagina prima/dopo:", prima, await altezzaPagina());
const leggiTot = () => page.evaluate(() => Array.from(document.querySelectorAll(".pc-tot-v")).map(n => n.textContent.trim()).slice(0, 6));
console.log("totali S1:", JSON.stringify(await leggiTot()));
const s4 = page.locator(".sett, [data-settimana='4'], .pc-sett").filter({ hasText: "S4" }).first();
if (await s4.count()) { await s4.click(); await page.waitForTimeout(500); console.log("totali S4:", JSON.stringify(await leggiTot())); }
await page.screenshot({ path: "/tmp/confronto-app.png" });
await browser.close(); server.close(); process.exit(0);
