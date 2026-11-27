/* Passo 28 — la finestra del confronto com'è adesso: una schermata della
 * finestra intera a 1440 px e le misure che Alice ha chiesto (larghezza,
 * altezza, respiro, altezza della pagina prima e dopo l'apertura).
 *
 * Apre la pagina vera (per il CSS) e disegna il confronto su due programmi
 * finti con le forme di quelli di Alice. Non scrive niente.
 * Uso: node scripts/foto-confronto-28.mjs [cartella-uscita] */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const uscita = process.argv[2] || "/tmp";
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
await page.goto(base + "/desktop/index.html", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForSelector("#pag-programma-1", { state: "attached", timeout: 20000 });
await page.waitForTimeout(1500);
await page.evaluate(() => {
  const velo = document.getElementById("veloAccesso31");
  if (velo) velo.remove();
  /* La Diva e il suo fumetto stanno sopra la finestra: qui servono solo allo
   * scatto, non si tocca niente nel codice. */
  const diva = document.getElementById("bd-diva");
  if (diva) diva.style.setProperty("display", "none", "important");
  const fumetto = document.getElementById("dv-fumetto");
  if (fumetto) fumetto.style.setProperty("display", "none", "important");
});

const prima = await page.evaluate(() => document.documentElement.scrollHeight);

await page.evaluate(async () => {
  const { ricostruisciSchede } = await import("/comune/schede-v2.js");
  const { modelloConsultabile } = await import("/comune/programma-consultabile.js");
  const { apriConfronto } = await import("/comune/vista-programma-consultabile.js");
  const settimane = (serie, rip, rec) => Array.from({ length: 8 }, (_, i) => ({
    week: i + 1, sets: Array.isArray(serie) ? serie[i] : serie,
    reps: Array.isArray(rip) ? rip[i] : rip, rest: { seconds: rec }, type: "normal", note: "", source: "manual"
  }));
  const ESE = (nome, muscolo, serie, rip, rec) => ({
    id: "ex-" + nome, name: nome, muscle: muscolo,
    prescription: {
      sets: Array.isArray(serie) ? serie[0] : serie,
      reps: { label: Array.isArray(rip) ? rip[0] : String(rip) }, rest: { seconds: rec }
    },
    progression: { weeks: settimane(serie, rip, rec) }
  });
  const foglio = (pid, code, nome, esercizi) => ({
    id: "program-v2-sheet-" + pid + "__sh-" + code,
    dati: { programId: pid, sheetId: "sh-" + code, kind: "sheet", versione: 1,
      sheet: { id: "sh-" + code, code: code, name: nome, exercises: esercizi } }
  });
  const A = { id: "prg-a", name: "B_program_1", status: "archived", startDate: "2026-05-04", durationWeeks: 8, daysPerWeek: 4, rotation: ["A", "D"] };
  const B = { id: "prg-b", name: "Intensita_ottobre_dicembre", status: "active", active: true, startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, rotation: ["A", "D"] };
  const DOCS = [
    foglio("prg-a", "A", "Scheda A", [
      ESE("Hip thrust", "Glutei", [5, 5, 6, 6, 5, 6, 7, 6], "10", 120),
      ESE("Alzate laterali cavo basso", "Spalle", [4, 4, 5, 4, 5, 5, 4, 5], "12", 60),
      ESE("Lat machine presa neutra", "Dorsali", [3, 3, 4, 4, 4, 5, 4, 5], "12", 90),
      ESE("Leg curl", "Femorali", [3, 3, 3, 4, 4, 4, 3, 4], "12", 90)]),
    foglio("prg-a", "D", "Scheda D", [
      ESE("Pressa45 piedi alti", "Glutei", [5, 5, 6, 6, 7, 7, 7, 8], "12", 120),
      ESE("Calf raise", "Polpacci", [3, 3, 4, 4, 4, 4, 4, 5], "15", 45)]),
    foglio("prg-b", "A", "Scheda A", [
      ESE("Hip thrust", "Glutei", [6, 6, 7, 6, 7, 7, 8, 7], "10", 120),
      ESE("Alzate laterali cavo basso", "Spalle", [4, 5, 5, 5, 6, 6, 6, 6], "12", 60),
      ESE("Lat machine presa neutra", "Dorsali", [5, 5, 6, 6, 7, 7, 7, 8], "10", 90),
      ESE("Leg curl", "Femorali", [3, 3, 3, 3, 3, 3, 3, 3], "12", 90)]),
    foglio("prg-b", "D", "Scheda D", [
      ESE("Bulgaro focus glutei", "Gluteo medio", [4, 4, 5, 5, 6, 6, 6, 7], "8-10", 150),
      ESE("Tricipiti cavo", "Tricipiti", [5, 5, 5, 6, 6, 6, 7, 7], "12", 60)])
  ];
  const s = ricostruisciSchede(DOCS);
  apriConfronto(document, {
    consultato: { modello: modelloConsultabile(A, s.perProgramma["prg-a"]), gruppo: s.perProgramma["prg-a"] },
    inUso: { modello: modelloConsultabile(B, s.perProgramma["prg-b"]), gruppo: s.perProgramma["prg-b"] },
    onSalvaCome: null
  });
});
await page.waitForTimeout(600);

const misure = await page.evaluate(() => {
  const box = document.querySelector(".pc-modale .pc-box-confronto").getBoundingClientRect();
  const a = document.querySelector(".pc-col-a").getBoundingClientRect();
  const b = document.querySelector(".pc-col-b").getBoundingClientRect();
  const corpo = document.querySelector(".pc-corpo-confronto");
  const stile = getComputedStyle(corpo);
  return {
    finestra: { larghezza: Math.round(box.width), altezza: Math.round(box.height),
      margineSx: Math.round(box.x), margineDx: Math.round(window.innerWidth - box.right) },
    colonne: { affiancate: Math.round(a.right) <= Math.round(b.left) + 1,
      larghezza: Math.round(a.width), altezza: Math.round(a.height) },
    respiro: { sx: parseFloat(stile.paddingLeft), dx: parseFloat(stile.paddingRight), giu: parseFloat(stile.paddingBottom) },
    corpo: { scorre: corpo.scrollHeight > corpo.clientHeight, contenuto: corpo.scrollHeight, visibile: corpo.clientHeight },
    corpoTesto: parseFloat(getComputedStyle(document.querySelector(".pc-col-tab")).fontSize),
    riga: Math.round(document.querySelector(".pc-col-tab td").getBoundingClientRect().height),
    differenze: document.querySelectorAll(".pc-differenze, .pc-diff-tab").length
  };
});
const dopo = await page.evaluate(() => document.documentElement.scrollHeight);

await page.screenshot({ path: join(uscita, "passo28-confronto-finestra.png") });

/* Secondo scatto: il blocco «Volume» con il testo più grande, scorrendo DENTRO
 * la finestra (la pagina sotto resta ferma). */
await page.evaluate(() => {
  const sez = document.querySelector(".pc-volume-sett");
  if (sez) sez.scrollIntoView({ block: "start" });
});
await page.waitForTimeout(400);
await page.screenshot({ path: join(uscita, "passo28-confronto-volume.png") });
console.log("pagina prima/dopo:", prima, "/", dopo);
console.log("misure:", JSON.stringify(misure));
await browser.close();
server.close();
process.exit(0);
