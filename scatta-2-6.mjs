import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { chromium } from "playwright";
const { renderProgramma } = await import("./comune/vista-programma.js");
const { riepilogoProgramma } = await import("./comune/programma.js");
const { ricostruisciSchede } = await import("./comune/schede-v2.js");
const { montaDivaBot } = await import("./comune/diva-bot.js");

const OGGI = new Date(Date.UTC(2026, 10, 4));
const meta = {
  id: "prg-intensita", name: "Intensità ottobre-dicembre", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4,
  description: "Blocco di intensità: quattro sedute, doppia progressione sui fondamentali. Scarico in S8 (volume −25% sulle serie di accoppiata).",
  message: "Questo blocco lavora sulla tenuta: nessuna serie al limite. Se una serie «sembra facile», il carico della settimana dopo sale di 2,5 kg.",
  rotation: ["A", "B", "C", "D"], createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};
const E = (nome, muscolo, serie, rip, rec, nota) => ({ name: nome, muscle: muscolo, prescription: { sets: serie, reps: rip, rest: rec }, note: nota || "" });
const schede = {
  A: ["A", "Dorsali, spalle, braccia", "dorso", 1, [
    E("Trazioni assistite", "dorsali", 4, "8-10", "90s"),
    E("Lat machine presa neutra", "dorsali", 4, "10", "75s"),
    E("Rematore bilanciere", "dorso", 4, "8", "120s"),
    E("Pulley basso", "dorso", 3, "12", "60s"),
    E("Curl bilanciere", "bicipiti", 3, "10", "60s"),
    E("Curl a martello", "brachiale", 3, "12", "45s")]],
  B: ["B", "Petto, spalle, tricipiti", "spinta", 2, [
    E("Panca piana", "pettorali", 5, "5", "150s", "fermo al petto 1”"),
    E("Lento avanti manubri", "deltoidi", 4, "8", "90s"),
    E("Croci ai cavi", "pettorali", 3, "12", "60s"),
    E("Alzate laterali", "deltoidi", 4, "15", "45s"),
    E("French press", "tricipiti", 3, "10", "60s"),
    E("Push down corda", "tricipiti", 3, "12", "45s")]],
  C: ["C", "Gambe e core", "gambe", 3, [
    E("Squat", "quadricipiti", 5, "5", "180s", "profondità al parallelo"),
    E("Leg press", "quadricipiti", 4, "10", "90s"),
    E("Affondi camminati", "glutei", 3, "12", "75s"),
    E("Leg curl seduto", "femorali", 4, "12", "60s"),
    E("Calf in piedi", "polpacci", 4, "15", "45s"),
    E("Plank", "core", 3, "40”", "30s")]],
  D: ["D", "Catena posteriore", "tirata", 4, [
    E("Stacco da terra", "catena posteriore", 4, "6", "180s"),
    E("Stacco rumeno", "femorali", 3, "8", "120s"),
    E("Hip thrust", "glutei", 4, "10", "90s"),
    E("Lat machine", "dorsali", 3, "12", "60s")]]
};
const docs = Object.keys(schede).map((k, i) => {
  const [cod, nome, focus, giorno, esercizi] = schede[k];
  return { id: `program-v2-sheet-prg-intensita__sh-${cod}`, dati: { programId: "prg-intensita", sheetId: `sh-${cod}`, kind: "sheet",
    sheet: { id: `sh-${cod}`, code: cod, name: nome, focus, day: giorno, week: 1, order: i, updatedAt: "2026-11-02T18:12:00.000Z", exercises: esercizi } } };
});
docs.push({ id: "program-v2-archived-prg-intensita__sh-Z", dati: { programId: "prg-intensita", sheetId: "sh-Z", kind: "archived",
  sheet: { id: "sh-Z", code: "Z", name: "Petto vecchia impostazione", order: 5, exercises: [E("Panca inclinata", "pettorali", 4, "8", "120s")] } } });
const ric = ricostruisciSchede(docs);

const sedute = [];
const giorni = [0, 1, 3, 4];
for (let s = 0; s < 8; s += 1) {
  const lunedi = Date.UTC(2026, 8, 21) + s * 7 * 86400000;
  giorni.forEach((g, idx) => {
    const d = new Date(lunedi + g * 86400000);
    if (d > OGGI) return;
    sedute.push({ dateInput: d.toISOString().slice(0, 10), sessionCode: ["A", "B", "C", "D"][idx], sessionName: schede[["A", "B", "C", "D"][idx]][1] });
  });
}

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
const r = riepilogoProgramma(meta, sedute, { schedeV2: ric, indice: 0, totaleProgrammi: 5, oggi: OGGI, quante: 8 });
renderProgramma(doc, doc.querySelector("#programma1Griglia"), { presente: true, numeroSedute: sedute.length }, r);
montaDivaBot(doc.querySelector("#divaContenitore"), ["Quattro schede, trentaquattro esercizi, e i logbook che dicono quali hai davvero fatto. Il resto lo scrive il documento, e quello che non c'è resta vuoto."], "neutro");
fs.writeFileSync("scatta-2-6.html", dom.serialize().replace("</head>", `<style>\n${cssText}\n</style>\n</head>`));

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
await p.goto("file://" + path.resolve("scatta-2-6.html"));
await p.waitForTimeout(1500);
await p.screenshot({ path: "/tmp/pg2-full.png", fullPage: true });
const m = await p.evaluate(() => ({
  schede: document.querySelectorAll(".pr-ntab").length,
  esercizi: document.querySelectorAll(".pr-tb-row").length - 1,
  bloccati: document.querySelectorAll(".pr-in[readonly],.pr-sel:disabled,.pr-ta[readonly]").length,
  prospetto: document.querySelectorAll(".pr-prow").length,
  chips: document.querySelectorAll(".pr-rotchip").length,
  altezza: document.body.scrollHeight
}));
await b.close();
console.log(JSON.stringify(m));
