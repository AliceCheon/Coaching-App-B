import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { chromium } from "playwright";
const { renderProgramma } = await import("./comune/vista-programma.js");
const { riepilogoProgramma } = await import("./comune/programma.js");
const { montaDivaBot } = await import("./comune/diva-bot.js");

const codici = ["A", "B", "C", "D"];
const nomi = { A: "Spinta A", B: "Tirata A", C: "Gambe A", D: "Richiamo" };
const esercizi = { A: 9, B: 9, C: 8, D: 9 };
const sedute = [];
for (let i = 0; i < 124; i += 1) {
  const d = new Date(Date.UTC(2026, 10, 3) - (123 - i) * 2 * 86400000);
  const c = codici[i % 4];
  sedute.push({ dateInput: d.toISOString().slice(0, 10), sessionCode: c, sessionName: nomi[c] });
}
const programma = {
  id: "prg-split-ad",
  name: "Split A–D · test 12RM + ondata 10-x",
  status: "active",
  phase: "Bulk",
  startDate: "2026-10-24",
  durationWeeks: 8,
  daysPerWeek: 4,
  description: "Test 12RM + ondata 10-x. Rotazione A–D su 4 giorni a settimana, scarico in S4 (−20% / −30% di volume).",
  message: "Questo blocco lavora sulla tenuta: quattro sedute, nessuna al limite. Se una serie «sembra facile», il carico della settimana dopo sale.",
  rotation: ["A", "B", "C", "D"],
  createdAt: "2026-10-20T09:00:00.000Z",
  updatedAt: "2026-10-30T18:12:00.000Z",
  sheets: codici.map((c, i) => ({
    id: "sh-" + c, code: c, name: nomi[c], week: 1, order: i,
    exercises: Array.from({ length: esercizi[c] }, (_, k) => ({ name: "Esercizio " + (k + 1) }))
  }))
};
const modello = { presente: true, numeroSedute: 124, programma: { nome: programma.name, settimana: 1, esplicito: true } };
const r = riepilogoProgramma(programma, sedute, { indice: 0, totaleProgrammi: 5 });

let h = fs.readFileSync("desktop/index.html", "utf8");
h = h.replace(/<link rel="stylesheet" href="\.\.\/comune\/[^"]+">\n?/g, "");
h = h.replace(/<script src="https:\/\/www\.gstatic\.com[^"]*"><\/script>\n?/g, "");
h = h.replace(/<script src="\.\.\/app-config-b\.js"><\/script>\n?/g, "");
h = h.replace(/<script type="module">[\s\S]*?<\/script>/g, "");
const b64 = (f) => fs.readFileSync(f).toString("base64");
const font = ["font/nunito-sans-latin.woff2", "font/nunito-sans-latin-ext.woff2", "font/nunito-sans-corsivo-latin.woff2", "font/nunito-sans-corsivo-latin-ext.woff2"];
let cssText = "";
for (const f of ["comune/tema-b.css", "comune/dashboard-b.css", "comune/testata-diva.css"]) {
  let t = fs.readFileSync(f, "utf8");
  for (const p of font) t = t.split(`url("${p}")`).join(`url(data:font/woff2;base64,${b64("comune/" + p)})`);
  cssText += `\n/* ${f} */\n` + t;
}
const dom = new JSDOM(h, { runScripts: "outside-only" });
const doc = dom.window.document;
["#vistaLogin", "#vistaDash", "#vistaOverview", "#vistaPianificazione"].forEach((s) => { doc.querySelector(s).hidden = true; });
doc.querySelector("#vistaProgramma1").hidden = false;
renderProgramma(doc, doc.querySelector("#programma1Griglia"), modello, r);
montaDivaBot(doc.querySelector("#divaContenitore"), ["Mercoledì. Il programma dice quattro sedute: i logbook dicono che le hai fatte, ed è l'unica cosa che conta qui."], "neutro");
fs.writeFileSync("scatta-2-5.html", dom.serialize().replace("</head>", `<style>\n${cssText}\n</style>\n</head>`));

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
await p.goto("file://" + path.resolve("scatta-2-5.html"));
await p.waitForTimeout(1400);
await p.screenshot({ path: "/tmp/pg-1440.png" });
await p.screenshot({ path: "/tmp/pg-1440-full.png", fullPage: true });
const m = await p.evaluate(() => {
  const r2 = (s) => { const e = document.querySelector(s); if (!e) return null; const x = e.getBoundingClientRect(); return { w: Math.round(x.width), h: Math.round(x.height) }; };
  return {
    sint: r2(".pg-sint"), kpi: document.querySelectorAll(".pg-kpi .ck-met").length,
    campi: document.querySelectorAll(".pg-campi .pg-f").length, linguette: document.querySelectorAll(".pg-tab").length,
    righe: document.querySelectorAll(".pg-tabella .pg-tr").length, catena: document.querySelectorAll(".pg-passo").length,
    titolo: document.querySelector(".pg-sint h3")?.textContent
  };
});
await b.close();
console.log(JSON.stringify(m));
