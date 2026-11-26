/* Verifica (passo 17) — i salvataggi tornano dopo il refresh.
 *
 * Scrive «Peso (kg)» e il campo «Come dormi» del quaderno nel finto Firestore
 * del browser (che ricorda le voci in localStorage, quindi sopravvive alla
 * navigazione), ricarica la pagina come farebbe Alice con F5, e rilegge i due
 * campi. Prima della correzione mostravano «—».
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".woff2": "font/woff2" };
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
for (const c of ["chrome", "msedge", null]) {
  try { browser = await chromium.launch(c ? { channel: c } : {}); break; } catch { /* prova il prossimo */ }
}
if (!browser) { console.log("nessun browser"); process.exit(2); }

const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on("pageerror", (e) => console.log("errore:", String(e.message).slice(0, 140)));
await page.route(/gstatic\.com/, (r) => r.abort());
await page.addInitScript({ path: join(radice, "tests", "finti", "zona-b-finta-browser.js") });
await page.goto(base + "/desktop/index.html");
await page.waitForTimeout(2400);
/* le due linguette vivono in «Dati cliente»: si apre la vista e la linguetta */
await page.evaluate(() => window.BDVAI("dati-cliente"));
await page.waitForTimeout(400);

const leggi = () => page.evaluate(() => {
  const riga = (pannello, etichetta) => {
    const f = [...document.querySelectorAll('[data-pan="' + pannello + '"] .dc-f')]
      .find((x) => { const l = x.querySelector(".dc-lbl"); return l && l.textContent.trim() === etichetta; });
    return f ? f.querySelector(".dc-val").textContent.trim() : "(riga assente)";
  };
  return { peso: riga("anagrafica", "Peso (kg)"), sonno: riga("anamnesi", "Come dormi e quante ore") };
});

console.log("prima di scrivere:", JSON.stringify(await leggi()));

await page.click('[data-pan="anagrafica"] .dc-f:has(.dc-lbl:text-is("Peso (kg)")) .dc-val');
await page.fill('[data-pan="anagrafica"] .dc-f:has(.dc-lbl:text-is("Peso (kg)")) input', "62");
await page.click('[data-pan="anagrafica"] .dc-f:has(.dc-lbl:text-is("Peso (kg)")) button:text-is("Salva")');
await page.waitForTimeout(1200);

await page.click('#pag-dati-cliente .dc-tab[data-dc="anamnesi"]');
await page.waitForTimeout(300);
await page.click('[data-pan="anamnesi"] .dc-f:has(.dc-lbl:text-is("Come dormi e quante ore")) .dc-val');
await page.fill('[data-pan="anamnesi"] .dc-f:has(.dc-lbl:text-is("Come dormi e quante ore")) textarea', "Sette ore, sveglia alle 6");
await page.click('[data-pan="anamnesi"] .dc-f:has(.dc-lbl:text-is("Come dormi e quante ore")) button:text-is("Salva")');
await page.waitForTimeout(1500);

console.log("dopo il salvataggio:", JSON.stringify(await leggi()));
const registro = await page.evaluate(() => {
  const grezzo = window.localStorage.getItem("bd-b-finta-v1") || "{}";
  /* nel finto la memoria e' { registro: { id: dati } } */
  try {
    const dentro = JSON.parse(grezzo).registro || {};
    return Object.keys(dentro).map((id) => (dentro[id] || {}).tipo + " · " + (dentro[id] || {}).campo);
  } catch { return ["(non leggibile)"]; }
});
console.log("voci nel registro:", JSON.stringify(registro));

await page.reload();
await page.waitForTimeout(2600);
await page.evaluate(() => window.BDVAI("dati-cliente"));
await page.waitForTimeout(400);
console.log("DOPO IL REFRESH:", JSON.stringify(await leggi()));

await browser.close();
server.close();
