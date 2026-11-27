/* Passo 27 — due schermate del blocco «Volume» del confronto: la vista a
 * settimana e quella a tutte le settimane. Apre la pagina vera (per il CSS) e
 * disegna il confronto su due programmi finti con le forme di quelli di Alice:
 * volumi diversi da scheda a scheda, un distretto che manca da una parte, un
 * altro che manca dall'altra. Non scrive niente. */
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
const base = "http://127.0.0.1:" + server.address().port;

let browser = null;
for (const c of ["chrome", "msedge", null]) { try { browser = await chromium.launch(c ? { channel: c } : {}); break; } catch {} }
if (!browser) { console.log("nessun browser"); process.exit(1); }
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on("pageerror", (e) => console.log("ERRORE:", String(e.message).slice(0, 160)));
await page.route(/gstatic\.com/, (r) => r.abort());
await page.goto(base + "/desktop/index.html");
await page.waitForTimeout(2500);

/* Il velo dell'accesso e il fumetto della Diva coprirebbero la finestra: qui
 * servono solo allo scatto, non si tocca niente nel codice. */
await page.evaluate(() => {
  const velo = document.getElementById("veloAccesso31");
  if (velo) velo.remove();
  const diva = document.getElementById("bd-diva");
  if (diva) diva.style.display = "none";
});

await page.evaluate(async () => {
  const { ricostruisciSchede } = await import("/comune/schede-v2.js");
  const { modelloConsultabile } = await import("/comune/programma-consultabile.js");
  const { apriConfronto } = await import("/comune/vista-programma-consultabile.js");
  const settimane = (serie, rip, rec, quante) => Array.from({ length: quante == null ? 8 : quante }, (_, i) => ({
    week: i + 1, sets: Array.isArray(serie) ? serie[i] : serie,
    reps: rip == null ? "" : (Array.isArray(rip) ? rip[i] : rip),
    rest: rec == null ? {} : { seconds: rec }, type: "normal", note: "", source: "manual"
  }));
  const ESE = (nome, muscolo, serie, rip, rec, quante) => ({
    id: "ex-" + nome, name: nome, muscle: muscolo,
    prescription: { sets: Array.isArray(serie) ? serie[0] : serie, reps: { label: Array.isArray(rip) ? rip[0] : String(rip) }, rest: rec == null ? {} : { seconds: rec } },
    progression: { weeks: settimane(serie, rip, rec, quante) }
  });
  const foglio = (pid, code, nome, esercizi) => ({
    id: "program-v2-sheet-" + pid + "__sh-" + code,
    dati: { programId: pid, sheetId: "sh-" + code, kind: "sheet", versione: 1, sheet: { id: "sh-" + code, code, name: nome, exercises: esercizi } }
  });
  const A = { id: "prg-a", name: "B_program_1", status: "archived", startDate: "2026-05-04", durationWeeks: 8, daysPerWeek: 4, rotation: ["A", "B", "C", "D"] };
  const B = { id: "prg-b", name: "Intensita_ottobre_dicembre", status: "active", active: true, startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, rotation: ["A", "B", "C", "D"] };
  const DOCS = [
    foglio("prg-a", "A", "Scheda A", [
      ESE("Hip thrust", "Glutei", [5, 5, 6, 6, 5, 6, 7, 6], "10", 120),
      ESE("Alzate laterali", "Spalle", [4, 4, 5, 4, 5, 5, 4, 5], "12", 60),
      ESE("Lat machine supina", "Dorsali", [3, 3, 4, 4, 4, 5, 4, 5], "12", 90),
      ESE("Leg curl", "Femorali", [3, 3, 3, 4, 4, 4, 3, 4], "12", 90)]),
    foglio("prg-a", "D", "Scheda D", [
      ESE("Pressa45 piedi alti", "Glutei", [5, 5, 6, 6, 7, 7, 7, 8], "12", 120),
      ESE("Calf raise", "Polpacci", [3, 3, 4, 4, 4, 4, 4, 5], "15", 45),
      ESE("Abduzioni", "Glutei", [2, 2, 3, 3, 3, 3, 4, 4], "15", 60)]),
    foglio("prg-b", "A", "Scheda A", [
      ESE("Hip thrust", "Glutei", [6, 6, 7, 6, 7, 7, 8, 7], "10", 120),
      ESE("Alzate laterali cavo basso", "Spalle", [4, 5, 5, 5, 6, 6, 6, 6], "12", 60),
      ESE("Lat machine presa neutra", "Dorsali", [5, 5, 6, 6, 7, 7, 7, 8], "10", 90)]),
    foglio("prg-b", "D", "Scheda D", [
      ESE("Bulgaro focus glutei", "Gluteo medio", [4, 4, 5, 5, 6, 6, 6, 7], "8-10", 150),
      ESE("Abductor", "Glutei", [4, 4, 5, 5, 5, 6, 6, 6], "15", 60),
      ESE("Tricipiti cavo", "Tricipiti", [5, 5, 5, 6, 6, 6, 7, 7], "12", 60)])
  ];
  const s = ricostruisciSchede(DOCS);
  apriConfronto(document, {
    consultato: { modello: modelloConsultabile(A, s.perProgramma["prg-a"]), gruppo: s.perProgramma["prg-a"] },
    inUso: { modello: modelloConsultabile(B, s.perProgramma["prg-b"]), gruppo: s.perProgramma["prg-b"] },
    onSalvaCome: null
  });
});
await page.waitForTimeout(700);

const nascondiDiva = () => page.evaluate(() => {
  const d = document.getElementById("bd-diva");
  if (d) d.remove();
});
await nascondiDiva();

/* Mi porto sul blocco volume: la vista a settimana. */
await page.evaluate(() => {
  const sez = document.querySelector(".pc-volume-sett");
  if (sez) sez.scrollIntoView({ block: "start" });
});
await page.waitForTimeout(500);
const box = await page.evaluate(() => {
  const s = document.querySelector(".pc-volume-sett");
  const r = s.getBoundingClientRect();
  return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
});
await page.screenshot({ path: "/tmp/passo27-volume-settimana.png", clip: { x: Math.max(0, box.x - 16), y: Math.max(0, box.y - 12), width: Math.min(1440, box.w + 32), height: Math.min(1000, box.h + 12) } });

/* «Tutte le settimane»: la griglia di calore, con le stesse schede accese. */
await page.evaluate(() => {
  const b = document.querySelector('.pc-vol2-modo[data-modo="tutte"]');
  if (b) b.click();
  document.querySelector(".pc-volume-sett").scrollIntoView({ block: "start" });
});
await page.waitForTimeout(500);
const box2 = await page.evaluate(() => {
  const s = document.querySelector(".pc-volume-sett");
  const r = s.getBoundingClientRect();
  return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
});
await nascondiDiva();
await page.screenshot({ path: "/tmp/passo27-volume-tutte.png", clip: { x: Math.max(0, box2.x - 16), y: Math.max(0, box2.y - 12), width: Math.min(1440, box2.w + 32), height: Math.min(1000, box2.h + 12) } });

/* In più (non per la consegna): due schede accese, per vedere la riga che dice
 * quali sta sommando. */
await page.evaluate(() => {
  const d = document.querySelector('.pc-st[data-scheda="D"]');
  if (d) d.click();
  const b = document.querySelector('.pc-vol2-modo[data-modo="settimana"]');
  if (b) b.click();
  document.querySelector(".pc-volume-sett").scrollIntoView({ block: "start" });
});
await page.waitForTimeout(500);
const box3 = await page.evaluate(() => {
  const s = document.querySelector(".pc-volume-sett");
  const r = s.getBoundingClientRect();
  return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
});
await nascondiDiva();
await page.screenshot({ path: "/tmp/passo27-volume-due-schede.png", clip: { x: Math.max(0, box3.x - 16), y: Math.max(0, box3.y - 12), width: Math.min(1440, box3.w + 32), height: Math.min(1000, box3.h + 12) } });

console.log("misure:", JSON.stringify({ settimana: box, tutte: box2, dueSchede: box3 }));
console.log("stato:", await page.evaluate(() => {
  const s = document.querySelector(".pc-volume-sett");
  return { vista: s.getAttribute("data-vista"), righe: s.querySelectorAll(".pc-vol2-riga").length,
    kpi: [...s.querySelectorAll(".pc-vol2-kpi-v")].map((v) => v.textContent.replace(/\s+/g, " ").trim()),
    mancanti: s.querySelectorAll(".pc-vol2-cella.manca").length };
}));
await browser.close(); server.close(); process.exit(0);
