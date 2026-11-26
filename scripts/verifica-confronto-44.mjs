/* Passo 44 — il confronto schede: cosa mostra, prima e dopo le correzioni.
 * Uso: node scripts/verifica-confronto-44.mjs
 *
 * Apre la VERA finestra del confronto (desktop/index.html in jsdom) su due
 * programmi finti che hanno le forme di quelli di Alice: schede con esercizi
 * diversi, un muscolo scritto «Gluteo medio» accanto a «Glutei», e volumi
 * diversi da una scheda all'altra. Serve a due cose:
 *  1. riprodurre il guasto del volume (le pastiglie e la tabella Differenze
 *     davano il totale del PROGRAMMA, uguale per ogni scheda);
 *  2. vedere, dopo la correzione, che i numeri cambiano cambiando scheda, che i
 *     glutei stanno in una riga sola e che le due colonne hanno le stesse righe.
 * Non scrive niente e non tocca i dati veri: è un foglio di prova.
 */
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ricostruisciSchede } from "../comune/schede-v2.js";
import { modelloConsultabile } from "../comune/programma-consultabile.js";
import { apriConfronto } from "../comune/vista-programma-consultabile.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagina = readFileSync(join(radice, "desktop", "index.html"), "utf8");

const settimane = (serie, rip, rec) => Array.from({ length: 8 }, (_, i) => ({
  week: i + 1, sets: serie, reps: rip[i] == null ? rip : rip[i], rest: { seconds: rec },
  type: "normal", note: "", source: "manual"
}));
const ESE = (nome, muscolo, serie, rip, rec) => ({
  id: "ex-" + nome, name: nome, muscle: muscolo,
  prescription: { sets: serie, reps: { label: String(rip) }, rest: { seconds: rec } },
  progression: { weeks: settimane(serie, rip, rec) }
});
const foglio = (pid, code, esercizi) => ({
  id: "program-v2-sheet-" + pid + "__sh-" + code,
  dati: { programId: pid, sheetId: "sh-" + code, kind: "sheet", versione: 1,
    sheet: { id: "sh-" + code, code: code, name: "Scheda " + code, exercises: esercizi } }
});

const VECCHIO = { id: "prg-vecchio", name: "B_program_1", status: "archived",
  startDate: "2026-05-04", durationWeeks: 8, daysPerWeek: 4, rotation: ["A", "B", "C", "D"] };
const IN_USO = { id: "prg-uso", name: "Intensita_ottobre_dicembre", status: "active", active: true,
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, rotation: ["A", "B", "C", "D"] };

/* La scheda A e la scheda D hanno volumi molto diversi: se il confronto conta
 * il programma intero, cambiare scheda non cambia niente — è il guasto. */
const DOCS = [
  foglio("prg-vecchio", "A", [ESE("Hip thrust", "Glutei", 4, "10", 120),
    ESE("Panca piana", "Petto", 4, "8", 120)]),
  foglio("prg-vecchio", "D", [ESE("Crab walk con elastico", "Attivazione", 2, "25-35", 90)]),
  foglio("prg-uso", "A", [ESE("Alzate laterali cavo basso", "Spalle", 3, "30", 60),
    ESE("Lat machine supina", "Dorsali", 3, "12", 90)]),
  foglio("prg-uso", "D", [ESE("Adductor", "Quadricipiti", 3, "12-8", 120),
    ESE("Bulgaro focus glutei", "Gluteo medio", 3, "8-10", 150),
    ESE("Rotazioni cavo medio", "Glutei", 4, "10-8", 90)])
];
const SCHEDE = ricostruisciSchede(DOCS);
const GRUPPO_A = SCHEDE.perProgramma["prg-vecchio"];
const GRUPPO_B = SCHEDE.perProgramma["prg-uso"];

function scena() {
  const dom = new JSDOM(pagina, { url: "https://example.invalid/desktop/" });
  const doc = dom.window.document;
  apriConfronto(doc, {
    consultato: { modello: modelloConsultabile(VECCHIO, GRUPPO_A), gruppo: GRUPPO_A },
    inUso: { modello: modelloConsultabile(IN_USO, GRUPPO_B), gruppo: GRUPPO_B },
    onSalvaCome: null
  });
  return doc;
}
const euro = (s) => String(s).replace(/\s+/g, " ").trim();
const colonna = (doc, quale) => doc.querySelector(".pc-col-" + (quale === "a" ? "a" : "b"));
const pastiglie = (doc, quale) => Array.from(colonna(doc, quale).querySelectorAll(".pc-vol"))
  .map((v) => euro(v.textContent));
const nomi = (doc, quale) => Array.from(colonna(doc, quale).querySelectorAll("tbody tr"))
  .map((tr) => euro(tr.children[0].textContent));
const differenze = (doc) => Array.from(doc.querySelectorAll(".pc-diff-riga"))
  .map((tr) => euro(tr.textContent));
const tasto = (doc, codice) => doc.querySelector('.pc-st[data-scheda="' + codice + '"]');

function foglioDiScheda(doc, titolo) {
  const testa = doc.querySelector(".pc-finestra-sotto");
  const volume = Array.from(doc.querySelectorAll(".pc-volume-sett .pc-vol-blocco")).map((b) => {
    const nome = euro((b.querySelector(".pc-vol-nome") || {}).textContent || "");
    const righe = Array.from(b.querySelectorAll(".pc-vol-riga")).map((tr) => euro(tr.textContent));
    return nome + " → " + righe.join(" | ");
  });
  console.log("  " + titolo);
  console.log("  finestra: " + euro(testa ? testa.textContent : "—"));
  console.log("  colonna sinistra: " + pastiglie(doc, "a").join(" | "));
  console.log("  colonna destra:   " + pastiglie(doc, "b").join(" | "));
  console.log("  titolo differenze: " + euro((doc.querySelector(".pc-diff-t") || {}).textContent || "—"));
  console.log("  prima riga differenze: " + (differenze(doc)[0] || "—"));
  console.log("  volume della settimana: " + (volume.join("  ;;  ") || "—"));
  console.log("  righe sinistra: " + nomi(doc, "a").join(" / "));
  console.log("  righe destra:   " + nomi(doc, "b").join(" / "));
}

const doc = scena();
console.log("Scheda scelta dai tasti: A");
foglioDiScheda(doc, "SCHEDA A");
tasto(doc, "D").click();
tasto(doc, "A").click();
console.log("");
console.log("Scheda scelta dai tasti: D");
foglioDiScheda(doc, "SCHEDA D");
