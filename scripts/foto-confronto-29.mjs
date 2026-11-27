/* Passo 29 — gli scatti del confronto alla misura di Alice (1905×813) e alle
 * altre due, con i nomi dei suoi programmi. Serve per il prima/dopo: lo stesso
 * script gira anche sul commit del passo 28.
 * Uso: node scripts/foto-confronto-29.mjs <prefisso> [cartella] */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const prefisso = process.argv[2] || "passo29";
const uscita = process.argv[3] || "/tmp";
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

/* La scheda A dei suoi due programmi, con i nomi veri (quelli dello scatto). */
const ELENCO = [
  ["Alzate laterali cavo basso caviglia polso", "Spalle", 4, "12-8", 0],
  ["Hip thrust", "Glutei", 5, "10", 120],
  ["Leg curl", "Femorali", 4, "12", 90],
  ["Pressa45 piedi alti", "Glutei", 5, "12", 120],
  ["Lat machine presa neutra", "Dorsali", 4, "12", 90],
  ["Curl bilanciere", "Bicipiti", 3, "12", 75],
  ["Pushdown corda", "Tricipiti", 4, "12", 60],
  ["Calf raise", "Polpacci", 4, "15", 45],
  ["Bulgaro focus glutei", "Gluteo medio", 5, "8-10", 150],
  ["Pulley basso", "Centro schiena", 4, "12", 90],
  ["Affondo front squat machine", "Quadricipiti", 4, "10", 120],
  ["Crunch inverso", "Addominali", 3, "15", 45]
];

async function apri(page) {
  await page.evaluate(async (ELENCO) => {
    const { ricostruisciSchede } = await import("/comune/schede-v2.js");
    const { modelloConsultabile } = await import("/comune/programma-consultabile.js");
    const { apriConfronto } = await import("/comune/vista-programma-consultabile.js");
    const settimane = (s, r, rec) => Array.from({ length: 8 }, (_, i) => ({
      week: i + 1, sets: s, reps: r, rest: { seconds: rec || null }, type: "normal", note: "", source: "manual"
    }));
    const ESE = ([nome, muscolo, s, r, rec], piu) => ({
      id: "ex-" + nome, name: nome, muscle: muscolo,
      prescription: { sets: s + piu, reps: { label: r }, rest: { seconds: rec || null } },
      progression: { weeks: settimane(s + piu, r, rec) }
    });
    const foglio = (pid, code, nome, esercizi) => ({
      id: "program-v2-sheet-" + pid + "__sh-" + code,
      dati: { programId: pid, sheetId: "sh-" + code, kind: "sheet", versione: 1,
        sheet: { id: "sh-" + code, code: code, name: nome, exercises: esercizi } }
    });
    const A = { id: "prg-a", name: "Intensita_agosto_ottobre", status: "archived",
      startDate: "2026-05-04", durationWeeks: 8, daysPerWeek: 4, rotation: ["A", "D"] };
    const B = { id: "prg-b", name: "Intensita_ottobre_dicembre", status: "active", active: true,
      startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, rotation: ["A", "D"] };
    const DOCS = [
      foglio("prg-a", "A", "Scheda A", ELENCO.map((e) => ESE(e, 0))),
      foglio("prg-a", "D", "Scheda D", ELENCO.slice(0, 6).map((e) => ESE(e, 0))),
      foglio("prg-b", "A", "Scheda A", ELENCO.map((e) => ESE(e, 1))),
      foglio("prg-b", "D", "Scheda D", ELENCO.slice(0, 6).map((e) => ESE(e, 1)))
    ];
    const s = ricostruisciSchede(DOCS);
    apriConfronto(document, {
      consultato: { modello: modelloConsultabile(A, s.perProgramma["prg-a"]), gruppo: s.perProgramma["prg-a"] },
      inUso: { modello: modelloConsultabile(B, s.perProgramma["prg-b"]), gruppo: s.perProgramma["prg-b"] },
      onSalvaCome: null
    });
  }, ELENCO);
  await page.waitForTimeout(450);
}

for (const [w, h] of [[1905, 813], [1440, 900], [1280, 800]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on("pageerror", (e) => console.log("ERRORE:", String(e.message).slice(0, 140)));
  await page.route(/gstatic\.com/, (r) => r.abort());
  await page.goto(base + "/desktop/index.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector("#pag-programma-1", { state: "attached", timeout: 20000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const velo = document.getElementById("veloAccesso31");
    if (velo) velo.remove();
    /* La Diva resta dove sta: nel passo 29 il confronto le passa davanti. */
  });
  await apri(page);
  await page.screenshot({ path: join(uscita, prefisso + "-" + w + "x" + h + ".png") });
  if (w === 1905) {
    await page.evaluate(() => {
      const corpo = document.querySelector(".pc-corpo-confronto");
      corpo.scrollTop = 380;
    });
    await page.waitForTimeout(350);
    await page.screenshot({ path: join(uscita, prefisso + "-" + w + "x" + h + "-scorrimento.png") });
  }
  const righe = await page.evaluate(() => {
    const corpo = document.querySelector(".pc-corpo-confronto");
    corpo.scrollTop = 0;
    const c = corpo.getBoundingClientRect();
    const conta = (sel) => Array.from(document.querySelectorAll(sel + " tbody tr")).filter((tr) => {
      const r = tr.getBoundingClientRect();
      return r.top >= c.top - 1 && r.bottom <= c.bottom + 1;
    }).length;
    return { a: conta(".pc-col-a .pc-col-tab"), b: conta(".pc-col-b .pc-col-tab") };
  });
  console.log(w + "x" + h, "righe visibili all'apertura:", JSON.stringify(righe));
  await page.close();
}
await browser.close();
server.close();
