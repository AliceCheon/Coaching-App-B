/* Verifica del passo 16 nella pagina vera (finto Firestore): interruttore della
 * rotazione che si spegne e riaccende, e i due testi liberi che si salvano. */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".woff2": "font/woff2" };
const server = createServer(async (req, res) => {
  try {
    const u = new URL(req.url, "http://x"); let p = decodeURIComponent(u.pathname); if (p.endsWith("/")) p += "index.html";
    res.writeHead(200, { "content-type": MIME[extname(p)] || "application/octet-stream" });
    res.end(await readFile(join(radice, p)));
  } catch { res.writeHead(404); res.end("no"); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = "http://127.0.0.1:" + server.address().port;

let browser = null;
for (const c of ["chrome", "msedge", null]) { try { browser = await chromium.launch(c ? { channel: c } : {}); break; } catch {} }
if (!browser) { console.log("nessun browser disponibile"); process.exit(2); }

const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
page.on("pageerror", (e) => console.log("errore di pagina:", String(e.message).slice(0, 160)));
await page.route(/gstatic\.com/, (r) => r.abort());
await page.addInitScript({ path: join(radice, "tests", "finti", "zona-b-finta-browser.js") });
await page.goto(base + "/desktop/index.html");
await page.waitForTimeout(2400);
await page.evaluate(() => window.BDVAI("programma-1"));
await page.waitForTimeout(800);

const stato = () => page.evaluate(() => ((document.querySelector("#modifica-stato") || {}).textContent || "").trim());
const sw = () => page.evaluate(() => {
  const b = document.querySelector("[data-pr-interruttore]");
  return b ? { testo: (b.textContent || "").trim(), acceso: b.getAttribute("aria-checked"), tag: b.tagName } : null;
});

console.log("interruttore prima:", JSON.stringify(await sw()));
await page.click("[data-pr-interruttore]");
await page.waitForTimeout(1200);
console.log("interruttore dopo OFF:", JSON.stringify(await sw()), "| stato:", await stato());
const vuoto = await page.evaluate(() => (document.querySelector('[data-pr-c="programma-rotazione"]') || {}).value);
console.log("campo rotazione dopo OFF:", JSON.stringify(vuoto));

await page.click("[data-pr-interruttore]");
await page.waitForTimeout(1200);
console.log("interruttore dopo riaccensione:", JSON.stringify(await sw()), "| stato:", await stato());

/* i due testi liberi */
const aree = await page.evaluate(() => ["programma-descrizione", "programma-messaggio"].map((c) => {
  const n = document.querySelector('[data-pr-c="' + c + '"]');
  return n ? { campo: c, tag: n.tagName, scrivibile: n.getAttribute("data-pr-c"), valore: (n.value || "").slice(0, 40) } : { campo: c, manca: true };
}));
console.log("aree:", JSON.stringify(aree));

const desc = page.locator('[data-pr-c="programma-descrizione"]').first();
await desc.click();
await desc.fill("Programma di forza\ncon due sedute brevi");
await page.evaluate(() => document.querySelector('[data-pr-c="programma-descrizione"]').blur());
await page.waitForTimeout(1600);
console.log("stato dopo descrizione:", await stato());
const msg = page.locator('[data-pr-c="programma-messaggio"]').first();
await msg.click();
await msg.fill("Ciao Alice, oggi si parte piano");
await page.evaluate(() => document.querySelector('[data-pr-c="programma-messaggio"]').blur());
await page.waitForTimeout(1600);
console.log("stato dopo messaggio:", await stato());
console.log("valori riletti:", JSON.stringify(await page.evaluate(() => ({
  descrizione: (document.querySelector('[data-pr-c="programma-descrizione"]') || {}).value,
  messaggio: (document.querySelector('[data-pr-c="programma-messaggio"]') || {}).value
}))));
await page.screenshot({ path: "/tmp/punto16.png" });
await browser.close(); server.close(); process.exit(0);
