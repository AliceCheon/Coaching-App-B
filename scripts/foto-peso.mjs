/* Foto di prova: apre la pagina vera e salva le immagini della tessera Peso
 * e delle due sezioni «Andamento peso», per controllare che la linea sia
 * disegnata giusta. Uso: node scripts/foto-peso.mjs [cartella]
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";
import { chromium } from "playwright";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const uscita = process.argv[2] || "/tmp/foto-peso";
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
for (const canale of ["chrome", "msedge", null]) {
  try { browser = await chromium.launch(canale ? { channel: canale } : {}); break; } catch {}
}
if (!browser) { console.log("nessun browser"); process.exit(1); }

const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.route(/gstatic\.com/, (r) => r.abort());
await page.addInitScript({ path: join(radice, "tests", "finti", "zona-b-finta-browser.js") });
await page.goto(base + "/desktop/index.html");
await page.waitForSelector(".p8-tab", { state: "attached", timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1800);
page.on("pageerror", (e) => console.log("errore pagina:", String(e.message || e).slice(0, 200)));

async function foto(pagina, selettore, nome) {
  await page.evaluate((n) => window.BDVAI(n), pagina);
  await page.waitForTimeout(600);
  const box = selettore ? await page.$(selettore) : null;
  if (selettore && !box) { console.log("manca " + selettore + " in " + pagina); return; }
  const dest = join(uscita, nome + ".png");
  if (box) await box.screenshot({ path: dest });
  else await page.screenshot({ path: dest });
  console.log("salvata " + dest);
}

for (const pag of ["overview-atleta", "monitor-peso"]) {
  await page.evaluate((n) => window.BDVAI(n), pag);
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(uscita, pag + ".png") });
  console.log("salvata " + join(uscita, pag + ".png"));
}

await foto("overview-atleta", "#ov-k-peso", "tessera-peso");
await foto("overview-atleta", ".ov-peso, #ov-spark", "ov-spark");
await foto("monitor-peso", "#mp-chart", "mp-chart");

await browser.close();
server.close();
process.exit(0);
