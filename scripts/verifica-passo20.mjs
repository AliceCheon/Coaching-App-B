/* Note scrivibili e cestino: prova nella pagina vera col finto Firestore. */
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
page.on("pageerror", (e) => console.log("errore:", String(e.message).slice(0, 120)));
await page.route(/gstatic\.com/, (r) => r.abort());
await page.addInitScript({ path: join(radice, "tests", "finti", "zona-b-finta-browser.js") });
await page.goto(base + "/desktop/index.html");
await page.waitForTimeout(2600);
await page.evaluate(() => window.BDVAI("programma-1"));
await page.waitForTimeout(900);

const stato = () => page.evaluate(() => ((document.querySelector("#modifica-stato") || {}).textContent || "").trim());
console.log("nota prima:", JSON.stringify(await page.evaluate(() => {
  const t = document.querySelector(".pr-ta-note");
  return t ? { solaLettura: t.readOnly, valore: (t.value || "").slice(0, 30) } : "assente";
})));
const nota = page.locator("#programma-attivo .pr-ta-note").first();
await nota.click();
await nota.fill("Riscaldamento 10 minuti di bici");
await page.evaluate(() => document.querySelector("#programma-attivo .pr-ta-note").blur());
await page.waitForTimeout(1800);
console.log("dopo il salvataggio → stato:", await stato(), "| campo:", await page.evaluate(() => (document.querySelector("#programma-attivo .pr-ta-note") || {}).value));

/* cestino: nel pannello Cambia */
await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((n) => /Cambia/i.test(n.textContent || ""));
  if (b) b.click();
});
await page.waitForTimeout(1500);
const cestini = await page.evaluate(() => [...document.querySelectorAll(".pr-cestino")].map((b) => ({
  scheda: b.getAttribute("data-cestino-scheda"),
  titolo: (b.getAttribute("aria-label") || b.title || "").slice(0, 60)
})));
console.log("cestini nel pannello Cambia:", JSON.stringify(cestini.slice(0, 4)));
if (cestini.length) {
  await page.locator(".pr-cestino").first().scrollIntoViewIfNeeded();
  await page.locator(".pr-cestino").first().click({ force: true });
  await page.waitForTimeout(700);
  const confermaTesto = await page.evaluate(() => {
    const m = document.querySelector(".cestino-modale");
    return m ? (m.textContent || "").replace(/\s+/g, " ").trim().slice(0, 220) : "nessuna conferma";
  });
  console.log("conferma:", confermaTesto);
}
await page.screenshot({ path: "/tmp/passo20.png" });
await browser.close(); server.close(); process.exit(0);
