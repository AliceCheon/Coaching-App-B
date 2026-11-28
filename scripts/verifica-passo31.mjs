/* La pagina Progressioni dopo il passo 31: le custom stanno nella raccolta
 * sola per utente e si vedono da ogni programma.
 *
 * Banco: la pagina vera (desktop/index.html + app-v31.js) servita da qui, col
 * finto Firestore del browser (tests/finti/zona-b-finta-browser.js). Il finto
 * tiene la memoria in localStorage, quindi si legge da li' se la custom e'
 * davvero finita nella raccolta `progressioni` e se resta dopo la ricarica.
 *
 * Uso: node scripts/verifica-passo31.mjs [http://127.0.0.1:PORT]
 * Senza indirizzo apre da solo la cartella del repo.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png" };
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
const base = process.argv[2] || ("http://127.0.0.1:" + server.address().port);

let browser = null;
for (const c of ["chrome", "msedge", null]) { try { browser = await chromium.launch(c ? { channel: c } : {}); break; } catch {} }
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
const errori = [];
page.on("pageerror", (e) => errori.push(String(e.message).slice(0, 160)));
await page.route(/gstatic\.com/, (r) => r.abort());
await page.addInitScript({ path: join(radice, "tests", "finti", "zona-b-finta-browser.js") });
/* Due progressioni custom nella VECCHIA posizione (dentro il programma): la
 * migrazione deve trovarle e spostarle, una volta sola. */
await page.addInitScript(() => {
  const zona = window.__zonaB && window.__zonaB.dati;
  if (!zona || !zona.programmi || !zona.programmi[0]) return;
  const settimane = (s, r) => Array.from({ length: 8 }, () => ({ serie: String(s), ripetizioni: String(r) }));
  zona.programmi[0].dati.programMeta.progressioniCustom = [
    { id: "pc-uno", nome: "Mia doppia", da: "double-progression", settimane: settimane(3, "8-10") },
    { id: "pc-due", nome: "Mia volume", da: "volume-progression", settimane: settimane(4, "10") }
  ];
});

const memoria = async () => page.evaluate(() => {
  try { return JSON.parse(window.localStorage.getItem("bd-b-finta-v1") || "null") || {}; } catch (e) { return {}; }
});
const pagina = async () => {
  await page.evaluate(() => {
    const v = [...document.querySelectorAll("a, button, .nav-item")].find((n) => /Progressioni/i.test(n.textContent || ""));
    if (v) v.click();
  });
  await page.waitForTimeout(800);
  return page.evaluate(() => {
    const barra = document.getElementById("pr-libn");
    const carte = Array.from(document.querySelectorAll("#pag-progressioni .pr-card"));
    return {
      conteggio: barra ? String(barra.textContent || "").trim() : "(assente)",
      carte: carte.length,
      custom: carte.filter((c) => c.classList.contains("custom")).length,
      nomiCustom: carte.filter((c) => c.classList.contains("custom")).map((c) => String((c.querySelector("h3") || {}).textContent || "").replace(/\s+/g, " ").trim()),
      modifica: document.querySelectorAll("[data-lib-modifica]").length,
      elimina: document.querySelectorAll("[data-lib-elimina]").length
    };
  });
};

await page.goto(base + "/desktop/index.html");
await page.waitForTimeout(3000);
const dopoPrimaApertura = await pagina();
const primoGiro = await memoria();

await page.reload();
await page.waitForTimeout(3000);
const dopoRicarica = await pagina();
const secondoGiro = await memoria();

/* Una custom creata dalla pagina: deve finire nella raccolta e restare. */
const crea = await page.evaluate(() => {
  const b = [...document.querySelectorAll("#pag-progressioni button")].find((x) => /Crea progressione custom/i.test(x.textContent || ""));
  if (!b || b.disabled) return false;
  b.click();
  return true;
});
let dopoCreazione = null;
let terzoGiro = null;
if (crea) {
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const m = document.querySelector(".prog-modal");
    if (!m) return;
    const nome = m.querySelector("input.prog-in");
    if (nome) nome.value = "Prova dal browser";
    const s1 = m.querySelector('input[data-settimana="1"][data-campo="serie"]');
    const r1 = m.querySelector('input[data-settimana="1"][data-campo="ripetizioni"]');
    if (s1) s1.value = "5";
    if (r1) r1.value = "6";
    const agg = [...m.querySelectorAll("button")].find((x) => String(x.textContent || "").trim() === "Aggiorna");
    if (agg) agg.click();
  });
  await page.waitForTimeout(1800);
  dopoCreazione = await pagina();
  terzoGiro = await memoria();
}

const leggiProgressioni = (mem) => {
  const raccolta = (mem && mem.progressioni) || {};
  return Object.keys(raccolta).map((k) => ({ id: k, nome: raccolta[k] && raccolta[k].nome, versione: raccolta[k] && raccolta[k].versione }));
};

console.log("prima apertura:", JSON.stringify(dopoPrimaApertura));
console.log("raccolta dopo la migrazione:", JSON.stringify(leggiProgressioni(primoGiro)));
console.log("programma ancora con il campo vecchio:", JSON.stringify((((primoGiro.programmi || {})["program-v2-meta-prg-intensita"] || {}).programMeta || {}).progressioniCustom || null));
console.log("dopo ricarica:", JSON.stringify(dopoRicarica));
console.log("raccolta dopo la ricarica:", JSON.stringify(leggiProgressioni(secondoGiro)));
if (crea) {
  console.log("dopo la creazione:", JSON.stringify(dopoCreazione));
  console.log("raccolta dopo la creazione:", JSON.stringify(leggiProgressioni(terzoGiro)));
}
console.log("errori di pagina:", errori.length ? JSON.stringify(errori) : "nessuno");
await browser.close();
server.close();
process.exit(0);
