/* Guardia 160 (passo 42): il pannello di «Cambia» sta SOPRA la pagina.
 *
 * Alice (26/11/2026): «non mi piace come diventa la pagina quando clicco
 * "cambia": si allunga tutto». Da qui in poi il pannello è una finestra
 * ancorata al tasto, in posizione fissa e con z-index alto: la pagina sotto non
 * si muove.
 *
 *  160.1  la posizione si calcola: sotto se c'è spazio, sopra se non c'è
 *  160.2  la larghezza resta dentro la finestra: a 1280 px non esce
 *  160.3  nel DOM il pannello sta sul corpo, non dentro la carta, e non
 *         aggiunge niente al contenitore del programma
 *  160.4  si chiude col clic fuori, con Esc e con «Chiudi»
 *  160.5  la regola CSS è quella giusta (fixed, z-index alto)
 */

import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { riepilogoProgramma } from "../comune/programma.js";
import { ricostruisciSchede } from "../comune/schede-v2.js";
import { renderProgramma, posizionePannello } from "../comune/vista-programma.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagina = readFileSync(join(radice, "desktop", "index.html"), "utf8");
const css = pagina;

const meta = {
  id: "prg-42", name: "Intensità ottobre-dicembre", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 2, rotation: ["A"],
  description: "", createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};
const sett = () => Array.from({ length: 8 }, (_, i) => ({ week: i + 1, sets: 4, reps: "10", rest: { seconds: 90 }, type: "normal", note: "", source: "manual" }));
const scheda = { id: "program-v2-sheet-prg-42__sh-A", dati: { programId: "prg-42", sheetId: "sh-A", kind: "sheet",
  sheet: { id: "sh-A", code: "A", name: "Dorsali", exercises: [{ id: "ex-1", name: "Rematore", muscle: "dorsali", prescription: { sets: 4 }, progression: { weeks: sett() } }] } } };
const SCHEDE = ricostruisciSchede([scheda]);
const PROGRAMMI = [
  { id: "prg-42", nome: "Intensità ottobre-dicembre", attivo: true, bozza: false, archiviato: false, dettaglio: "1 scheda",
    programma: meta, gruppo: SCHEDE.perProgramma["prg-42"] },
  { id: "prg-vecchio", nome: "Vecchio blocco", attivo: false, bozza: false, archiviato: true,
    programma: { id: "prg-vecchio", name: "Vecchio blocco", status: "archived" }, gruppo: null }
];

function scena() {
  const dom = new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
  const doc = dom.window.document;
  const mod = {
    attivo: true, annullabile: false,
    conta: () => ({ codice: "A", esercizi: 1, tecniche: 0, righe: 1, modifiche: 0 }),
    onCambia: () => Promise.resolve({ ok: true }),
    onAttiva: () => Promise.resolve({ ok: true })
  };
  const r = riepilogoProgramma(meta, [], { schedeV2: SCHEDE, indice: 0, totaleProgrammi: 2, oggi: new Date(Date.UTC(2026, 10, 26)), quante: 8 });
  renderProgramma(doc, doc.querySelector("#programma-attivo"), { presente: true, numeroSedute: 0 },
    Object.assign({}, r, { altriProgrammi: PROGRAMMI, modifica: mod }));
  return { dom, doc };
}
const tasto = (doc, parola) => Array.from(doc.querySelectorAll("#programma-attivo .pr-acts button")).filter((b) => b.textContent.trim() === parola)[0] || null;

test("160.1 la posizione: sotto se c'è spazio, sopra se non c'è", () => {
  const ancora = { top: 300, bottom: 330, left: 100, right: 180 };
  const sotto = posizionePannello(ancora, { larghezza: 360, altezza: 200 }, { larghezza: 1280, altezza: 800 });
  assert.equal(sotto.versoAlto, false, "c'è spazio sotto: si apre in giù");
  assert.ok(sotto.top >= 330, "e comincia sotto il tasto: " + sotto.top);

  /* Tasto in fondo alla finestra: il riquadro andrebbe fuori schermo. */
  const inFondo = posizionePannello({ top: 700, bottom: 730, left: 100, right: 180 }, { larghezza: 360, altezza: 260 }, { larghezza: 1280, altezza: 800 });
  assert.equal(inFondo.versoAlto, true, "senza spazio sotto si apre verso l'alto");
  assert.ok(inFondo.top >= 8, "e non esce dal bordo alto: " + inFondo.top);
  assert.ok(inFondo.top + 260 <= 700, "sta sopra il tasto, non sopra il tasto per finta");
});

test("160.2 a 1280 px il pannello resta dentro la finestra", () => {
  const tastoVicinoAlBordo = { top: 200, bottom: 230, left: 1200, right: 1270 };
  const pos = posizionePannello(tastoVicinoAlBordo, { larghezza: 360, altezza: 220 }, { larghezza: 1280, altezza: 800 });
  assert.ok(pos.left >= 8, "non esce a sinistra: " + pos.left);
  assert.ok(pos.left + pos.larghezza <= 1280 - 8, "non esce a destra: " + (pos.left + pos.larghezza));
  assert.ok(pos.larghezza >= 280, "le voci restano leggibili: larghezza " + pos.larghezza);

  /* Finestra strettissima: la larghezza si riduce invece di uscire. */
  const stretta = posizionePannello({ top: 100, bottom: 130, left: 40, right: 120 }, { larghezza: 360, altezza: 200 }, { larghezza: 360, altezza: 640 });
  assert.ok(stretta.larghezza <= 360 - 16, "dentro una finestra da 360 la larghezza si stringe: " + stretta.larghezza);
});

test("160.3 il pannello sta sul corpo e non allunga la pagina", () => {
  const { doc } = scena();
  const contenitore = doc.querySelector("#programma-attivo");
  const figliPrima = contenitore.children.length;
  tasto(doc, "Cambia").click();
  const pannello = doc.querySelector(".pr-elenco-programmi");
  assert.ok(pannello, "il pannello si apre");
  assert.equal(pannello.parentNode, doc.body, "è agganciato al corpo della pagina");
  assert.equal(pannello.closest("#programma-attivo"), null, "non è un figlio della carta");
  assert.equal(contenitore.children.length, figliPrima, "il contenitore del programma non guadagna figli: la pagina non si allunga");
  assert.equal(pannello.style.position || doc.defaultView.getComputedStyle(pannello).position, "fixed", "posizione fissa");
});

test("160.4 si chiude col clic fuori, con Esc e con «Chiudi»", () => {
  const { doc } = scena();
  /* clic fuori */
  tasto(doc, "Cambia").click();
  assert.equal(doc.querySelectorAll(".pr-elenco-programmi").length, 1);
  const fuori = doc.querySelector("#pag-programma-1 .v-testo") || doc.body;
  fuori.dispatchEvent(new doc.defaultView.MouseEvent("click", { bubbles: true }));
  assert.equal(doc.querySelectorAll(".pr-elenco-programmi").length, 0, "il clic fuori lo chiude");

  /* Esc */
  tasto(doc, "Cambia").click();
  assert.equal(doc.querySelectorAll(".pr-elenco-programmi").length, 1);
  doc.dispatchEvent(new doc.defaultView.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  assert.equal(doc.querySelectorAll(".pr-elenco-programmi").length, 0, "Esc lo chiude");

  /* «Chiudi» */
  tasto(doc, "Cambia").click();
  const chiudi = Array.from(doc.querySelectorAll(".pr-elenco-programmi button")).filter((b) => b.textContent.trim() === "Chiudi")[0];
  assert.ok(chiudi, "c'è il tasto «Chiudi»");
  chiudi.click();
  assert.equal(doc.querySelectorAll(".pr-elenco-programmi").length, 0, "«Chiudi» chiude");
});

test("160.5 la regola CSS: fissa sopra la pagina, z-index alto", () => {
  const regola = /\.pr-elenco-programmi\{([^}]*)\}/.exec(css);
  assert.ok(regola, "la regola .pr-elenco-programmi c'è");
  assert.match(regola[1], /position:\s*fixed/, "posizione fissa: non sposta la pagina");
  const z = /z-index:\s*(\d+)/.exec(regola[1]);
  assert.ok(z, "ha uno z-index");
  assert.ok(Number(z[1]) >= 9000, "z-index alto, sopra le carte: " + z[1]);
  assert.match(regola[1], /max-height/, "ha un tetto di altezza, così non esce dallo schermo");
});
