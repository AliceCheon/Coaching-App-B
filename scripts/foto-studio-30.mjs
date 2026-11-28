/* Passo 30 — gli scatti dei tre ritocchi, a 1440:
 *   /tmp/passo30-studio-prima.png   la carta «Muscoli adduttori» com'era (figura
 *                                   larga 205 px, 173 px di altezza su 424)
 *   /tmp/passo30-studio-dopo.png    com'è adesso (figura 433x367, riempie 86%)
 *   /tmp/passo30-misure-conferma.png  «Svuota archivio» che chiede prima
 *   /tmp/passo30-archivio-cestino.png il cestino spento accanto a quello acceso
 * Uso: node scripts/foto-studio-30.mjs   (serve Playwright: già nel repo)
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { chromium } from "playwright";

const radice = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
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
const base = "http://127.0.0.1:" + server.address().port;

let browser = null;
for (const canale of ["chrome", "msedge", null]) {
  try { browser = await chromium.launch(canale ? { channel: canale } : {}); break; } catch {}
}
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.route(/gstatic\.com/, (r) => r.abort());
await page.addInitScript({ path: join(radice, "tests", "finti", "zona-b-finta-browser.js") });
/* Un secondo programma (non in uso) per vedere il cestino acceso accanto a
 * quello spento: il finto ne ha uno solo, cioè proprio quello in uso. */
await page.addInitScript(() => {
  const z = window.__zonaB && window.__zonaB.dati;
  if (!z) return;
  const meta = JSON.parse(JSON.stringify(z.programmi[0].dati.programMeta));
  meta.id = "prg-primavera"; meta.name = "Blocco primavera"; meta.status = "available";
  z.programmi.push({ id: "program-v2-meta-prg-primavera", dati: { programMeta: meta } });
  const scheda = JSON.parse(JSON.stringify(z.schede[0]));
  scheda.id = "program-v2-sheet-prg-primavera__sh-C";
  scheda.dati.programId = "prg-primavera"; scheda.dati.sheetId = "sh-C";
  scheda.dati.sheet.id = "sh-C"; scheda.dati.sheet.code = "C"; scheda.dati.sheet.name = "Gambe";
  z.schede.push(scheda);
});
await page.goto(base + "/desktop/index.html", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForSelector("#pag-misure", { state: "attached", timeout: 20000 });
await page.waitForTimeout(1500);

/* — Study time: la riga di «Muscoli adduttori», prima e dopo — */
await page.evaluate(() => window.BDVAI("study-time"));
await page.waitForTimeout(1000);

/* Le regole di prima del passo 30. Niente forzature: il foglio si aggiunge in
 * fondo al <head>, quindi con gli stessi selettori vince lui (la regola 02
 * vieta le forzature nei sorgenti di B). */
const VECCHIE = `
  #pag-study-time .st-fig:not(.st-fig-wide){width:clamp(150px,32%,250px);max-width:none}
  #pag-study-time .st-fig:not(.st-fig-wide) img{width:100%;height:100%}
  #pag-study-time .st-card:not(.st-wide) .st-txt{min-width:0}`;

async function scattoStudio(nome) {
  /* La riga della griglia in cima allo schermo: lo scatto parte da lì, così
   * prima e dopo si guardano nello stesso punto. */
  const riquadro = await page.evaluate(() => {
    const c = [...document.querySelectorAll("#pag-study-time .st-card")]
      .find((x) => (x.textContent || "").includes("Muscoli adduttori"));
    const griglia = c.parentElement;
    griglia.scrollIntoView({ block: "start" });
    const r = griglia.getBoundingClientRect();
    return { y: Math.max(0, r.y - 16), alto: window.innerHeight };
  });
  await page.waitForTimeout(400);
  const y2 = await page.evaluate(() => {
    const c = [...document.querySelectorAll("#pag-study-time .st-card")]
      .find((x) => (x.textContent || "").includes("Muscoli adduttori"));
    const r = c.parentElement.getBoundingClientRect();
    return { y: Math.max(0, r.y - 16), alto: window.innerHeight };
  });
  await page.screenshot({ path: "/tmp/" + nome + ".png", clip: { x: 0, y: y2.y, width: 1440, height: Math.min(900, y2.alto - y2.y) } });
  const m = await page.evaluate(() => {
    const c = [...document.querySelectorAll("#pag-study-time .st-card")]
      .find((x) => (x.textContent || "").includes("Muscoli adduttori"));
    const f = c.querySelector(".st-fig"); const i = f.querySelector("img");
    const rf = f.getBoundingClientRect();
    const s = Math.min(rf.width / i.naturalWidth, rf.height / i.naturalHeight);
    const riga = [...c.parentElement.children].filter((x) => Math.abs(x.getBoundingClientRect().top - c.getBoundingClientRect().top) < 2);
    return {
      figura: [Math.round(rf.width), Math.round(rf.height)],
      immagine: [Math.round(i.naturalWidth * s), Math.round(i.naturalHeight * s)],
      riempie: Math.round((i.naturalHeight * s / rf.height) * 100) + "%",
      carta: [Math.round(c.getBoundingClientRect().width), Math.round(c.getBoundingClientRect().height)],
      riga: riga.map((x) => Math.round(x.getBoundingClientRect().height))
    };
  });
  console.log(nome, JSON.stringify(m));
}

await page.evaluate((regole) => {
  const s = document.createElement("style"); s.id = "passo30-prima"; s.textContent = regole;
  document.head.appendChild(s);
}, VECCHIE);
await page.waitForTimeout(300);
await scattoStudio("passo30-studio-prima");
await page.evaluate(() => { const s = document.getElementById("passo30-prima"); if (s) s.remove(); });
await page.waitForTimeout(300);
await scattoStudio("passo30-studio-dopo");

/* — Misure: la conferma di «Svuota archivio» — */
await page.evaluate(() => {
  window.BDVAI("misure");
  window.BDM.ingest([
    { data: "2026-10-01", peso: 61.2, circ: { vita: 72, fianchi: 98, torace: 88 }, pl7: { tricipite: [12, 14, 13], addome: [18, 19, 17] } },
    { data: "2026-10-15", peso: 61.8, circ: { vita: 71, coscia: 56 }, pl7: { addome: [17, 18, 18] } },
    { data: "2026-11-01", peso: 62.1, circ: { vita: 70 }, pl7: {} }
  ], { fonte: "scatto passo 30" });
});
await page.waitForTimeout(700);
await page.evaluate(() => { document.getElementById("ms-reset").scrollIntoView({ block: "center" }); });
await page.waitForTimeout(300);
await page.evaluate(() => document.getElementById("ms-reset").click());
await page.waitForTimeout(300);
const ym = await page.evaluate(() => {
  const r = document.getElementById("ms-reset").getBoundingClientRect();
  return { y: Math.max(0, r.y - 90), alto: window.innerHeight, documento: document.documentElement.scrollHeight };
});
console.log("misure:", JSON.stringify(ym));
await page.screenshot({ path: "/tmp/passo30-misure-conferma.png", clip: { x: 0, y: ym.y, width: 1180, height: Math.min(470, ym.alto - ym.y) } });

/* — Archivio: cestino spento contro acceso (due programmi) — */
await page.evaluate(() => {
  window.BDVAI("archivio");
});
await page.waitForTimeout(900);
const tb = await page.evaluate(() => {
  const t = document.getElementById("archivio-corpo");
  t.scrollIntoView({ block: "center" });
  return { y: Math.max(0, t.getBoundingClientRect().y - 80), alto: window.innerHeight };
});
await page.waitForTimeout(300);
await page.screenshot({ path: "/tmp/passo30-archivio-cestino.png", clip: { x: 0, y: tb.y, width: 1180, height: Math.min(320, tb.alto - tb.y) } });

await page.close();
await browser.close();
await new Promise((r) => server.close(r));
