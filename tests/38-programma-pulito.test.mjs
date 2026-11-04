/* Prove della correzione 2.5: la pagina parla semplice, il fumetto conta gli
 * stessi esercizi delle carte, la Diva sta in fondo e non copre, il menu e il
 * nastro dicono «Programma 1». */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { JSDOM } from "jsdom";
import { renderProgramma } from "../comune/vista-programma.js";
import { voceDelProgramma } from "../comune/diva-bot.js";
import { ricostruisciSchede } from "../comune/schede-v2.js";

const html = fs.readFileSync(new URL("../desktop/index.html", import.meta.url), "utf8");

const esercizi = [
  { name: "Squat", muscle: "quadricipiti", prescription: { sets: 5, reps: "5", rest: "180s" } },
  { name: "Leg press", muscle: "quadricipiti", prescription: { sets: 4, reps: "10", rest: "90s" } },
  { name: "Calf", muscle: "polpacci", prescription: { sets: 4, reps: "15", rest: "45s" } }
];
const docSchede = [
  { id: "program-v2-sheet-p__a", dati: { programId: "p", sheetId: "a", kind: "sheet", sheet: { code: "A", name: "Gambe", exercises: esercizi } } },
  { id: "program-v2-sheet-p__b", dati: { programId: "p", sheetId: "b", kind: "sheet", sheet: { code: "B", name: "Spinta", exercises: esercizi.slice(0, 2) } } },
  { id: "program-v2-archived-p__z", dati: { programId: "p", sheetId: "z", kind: "archived", sheet: { code: "Z", exercises: esercizi.slice(0, 1) } } }
];

function pagina() {
  const ric = ricostruisciSchede(docSchede);
  const gruppo = (ric.perProgramma && (ric.perProgramma.p || Object.values(ric.perProgramma)[0])) || ric;
  const r = {
    indice: 0, totaleProgrammi: 5,
    profilo: { presente: true, nome: "Intensità", stato: "Attivo", segno: "ok", fase: "Bulk", inizio: "2026-10-05", durata: 8, giorni: 4, descrizione: "", messaggio: "", aggiornato: "2026-11-02T18:12:00.000Z", id: "p" },
    schede: gruppo.schede, archiviate: gruppo.archiviate, esercizi: 5,
    rotazione: { codici: ["A", "B"], registrata: true, fonte: "programma" },
    codiciVisti: ["A", "B"], settimane: [], osservato: { righe: [], dentro: 0, fuori: 0, totale: 0, conCodice: 0, senzaData: 0 }
  };
  const dom = new JSDOM("<div id='c' class='ck'></div>");
  renderProgramma(dom.window.document, dom.window.document.querySelector("#c"), { presente: true }, r);
  return { r, testo: dom.window.document.querySelector("#c").innerHTML };
}

test("il fumetto conta gli stessi esercizi delle carte", () => {
  const { r } = pagina();
  const frase = voceDelProgramma(r);
  assert.match(frase, new RegExp(r.schede.length + " schede"));
  assert.match(frase, new RegExp(r.esercizi + " esercizi"));
  assert.match(frase, /una archiviata/);
  assert.doesNotMatch(frase, /34|trentaquattro/);
});

test("la pagina non nomina il v31 né i nomi tecnici dei documenti", () => {
  const { testo } = pagina();
  assert.doesNotMatch(testo, /v31/i);
  assert.doesNotMatch(testo, /program-v2-/);
  assert.doesNotMatch(testo, /campi bloccati/i);
  assert.doesNotMatch(testo, /documenti v2/i);
});

test("menu e nastro dicono Programma 1, non Dashboard", () => {
  const dom = new JSDOM(html);
  const attive = Array.from(dom.window.document.querySelectorAll(".voce.attiva")).map((v) => v.getAttribute("data-vista"));
  assert.deepEqual(attive, ["programma-1"]);
  assert.equal(dom.window.document.querySelector(".nastro b").textContent, "Programma 1");
  assert.equal(dom.window.document.querySelector("#vistaProgramma1").hidden, false);
});

test("la Diva sta in fondo alla pagina, non copre le carte", () => {
  const css = fs.readFileSync(new URL("../comune/tema-b.css", import.meta.url), "utf8");
  const blocco = css.slice(css.indexOf(".diva {"), css.indexOf(".diva {") + 320);
  assert.match(blocco, /position: fixed/);
  assert.match(blocco, /right:\s*\d+px/);
  assert.match(blocco, /bottom:\s*\d+px/);
  assert.doesNotMatch(blocco, /padding:\s*0 40px/);
  // il contenuto non finisce sotto la Diva: la colonna si porta 250 px di respiro
  const pagina = fs.readFileSync(new URL("../desktop/index.html", import.meta.url), "utf8");
  assert.match(pagina, /\.maino\{min-width:0;padding:34px 40px 250px/);
});

test("la testina e la pastiglia della versione si vedono", () => {
  assert.match(html, /data-marco/);
  assert.match(html, /marchio-ver" data-versione/);
  const app = fs.readFileSync(new URL("../desktop/app.js", import.meta.url), "utf8");
  assert.match(app, /segnoMarco\.appendChild\(creaVolto/);
  assert.match(app, /\[data-versione\]"\).forEach\(\(n\) => \{ n\.textContent = config\.build/);
});

test("le date sono gg/mm/aaaa, mai mese prima del giorno", () => {
  const src = fs.readFileSync(new URL("../comune/vista-programma.js", import.meta.url), "utf8");
  assert.match(src, /placeholder = "gg\/mm\/aaaa"/);
  assert.match(src, /function dataItaliana/);
  assert.match(src, /const iso = \/\^\(\\d\{4\}\)-/);
  assert.doesNotMatch(src, /type = "date"/);
  assert.doesNotMatch(src, /"date", null/);
});
