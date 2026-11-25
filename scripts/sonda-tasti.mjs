/* Sonda «tocchi e non succede niente» — gira la pagina vera nel browser,
 * apre le venti pagine e clicca ogni tasto VISIBILE e ABILITATO una volta.
 * Registra: (a) i clic che sollevano un'eccezione, (b) i clic che non cambiano
 * niente nel DOM dopo 250 ms (sospetti, da verificare a mano: un tasto puo'
 * scrivere su Firestore senza toccare la pagina).
 *
 * Uso: node scripts/sonda-tasti.mjs
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";
import { chromium } from "playwright";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json" };

const server = createServer(async (req, res) => {
  try {
    const u = new URL(req.url, "http://x");
    let p = decodeURIComponent(u.pathname);
    if (p.endsWith("/")) p += "index.html";
    res.writeHead(200, { "content-type": MIME[extname(p)] || "application/octet-stream" });
    res.end(await readFile(join(radice, p)));
  } catch { res.writeHead(404); res.end("no"); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = "http://127.0.0.1:" + server.address().port;

let browser = null;
for (const canale of ["chrome", "msedge", null]) {
  try { browser = await chromium.launch(canale ? { channel: canale } : {}); break; } catch {}
}
if (!browser) { console.log("nessun browser"); process.exit(1); }

const page = await browser.newPage();
const errori = [];
page.on("pageerror", (e) => errori.push(String(e.message || e) + "\n" + String((e && e.stack) || "").split("\n").slice(0,4).join(" | ")));
await page.route(/gstatic\.com/, (r) => r.abort());
await page.addInitScript({ path: join(radice, "tests", "finti", "zona-b-finta-browser.js") });
await page.goto(base + "/desktop/index.html");
await page.waitForSelector(".p8-tab", { state: "attached", timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1500);

const pagine = await page.evaluate(() => [...document.querySelectorAll("[id^='pag-']")].map((p) => p.id.slice(4)));
console.log("pagine:", pagine.length);

const mute = [];
const rotte = [];
for (const nome of pagine) {
  await page.evaluate((n) => window.BDVAI(n), nome);
  await page.waitForTimeout(350);
  const tasti = await page.evaluate((n) => {
    const pan = document.getElementById("pag-" + n);
    if (!pan) return [];
    const visibile = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 2 && r.height > 2 && s.visibility !== "hidden" && s.display !== "none" && !el.disabled;
    };
    return [...pan.querySelectorAll("button")].filter(visibile).map((b, i) => ({
      i, id: b.id || "", cls: b.className || "", testo: (b.textContent || "").trim().slice(0, 40)
    }));
  }, nome);

  for (const t of tasti) {
    const esito = await page.evaluate(async ({ n, i }) => {
      const pan = document.getElementById("pag-" + n);
      const visibile = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 2 && r.height > 2 && s.visibility !== "hidden" && s.display !== "none" && !el.disabled; };
      const b = [...pan.querySelectorAll("button")].filter(visibile)[i];
      if (!b) return "sparito";
      const prima = pan.innerHTML.length;
      const firma = pan.innerHTML.slice(0, 4000) + "|" + document.body.innerHTML.length;
      try { b.click(); } catch (e) { return "eccezione: " + (e.message || e); }
      await new Promise((r) => setTimeout(r, 250));
      const dopo = pan.innerHTML.slice(0, 4000) + "|" + document.body.innerHTML.length;
      return firma === dopo ? "fermo" : "mosso";
    }, { n: nome, i: t.i });
    if (esito === "fermo") mute.push([nome, t.id || t.cls, t.testo]);
    else if (String(esito).startsWith("eccezione")) rotte.push([nome, t.id || t.cls, t.testo, esito]);
    await page.evaluate((n) => window.BDVAI(n), nome);
    await page.waitForTimeout(80);
  }
}

console.log("\nTasti che NON cambiano niente (" + mute.length + "):");
for (const [p, id, t] of mute) console.log("  " + p.padEnd(22) + (id || "-").padEnd(22) + t);
console.log("\nTasti che sollevano un'eccezione (" + rotte.length + "):");
for (const r of rotte) console.log("  " + r.join(" | "));
console.log("\nErrori non presi in carico a pagina:", errori.length);
errori.slice(0, 8).forEach((e) => console.log("  " + e));

await browser.close();
server.close();
process.exit(0);
