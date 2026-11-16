/* tests/102-igiene-scheda.test.mjs — B.21: i comandi distruttivi.
 *
 * I primi sei test caricano la PAGINA VERA (desktop/index.html) e disegnano
 * dentro #programma-attivo, come fa app-v31.js: i tasti guardati sono quelli
 * che Alice vede. Gli ultimi quattro provano il modello sui dati veri: una voce
 * sola, l'Annulla che rimette tutto (figlie tecniche e superserie comprese),
 * il Logbook intatto e la scheda già vuota che non scrive niente.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { riepilogoProgramma } from "../comune/programma.js";
import { ricostruisciSchede } from "../comune/schede-v2.js";
import { renderProgramma } from "../comune/vista-programma.js";
import { svuotaScheda, ripristinaScheda, contaElenco, improntaElenco, contaDifferenze } from "../comune/igiene-scheda.js";
import { annullaModifica } from "../comune/modifiche-b.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagina = readFileSync(join(radice, "desktop", "index.html"), "utf8");

const meta = {
  id: "prg102", name: "Igiene", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, rotation: ["A", "B"],
  description: "", createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};
let seq = 0;
const sett = (serie, label) => Array.from({ length: 8 }, (_, i) => ({ week: i + 1, sets: serie, reps: { label: label }, rest: { seconds: 120 } }));
const ESE = (nome, sup) => ({ id: "ex-" + (++seq), name: nome, nome: nome, muscolo: "dorsali", nota: "", sup: sup || "", prescription: { sets: 4, rest: { seconds: 90 } }, progression: { weeks: sett(4, "10-8") } });
const schedaDoc = (cod, esercizi) => ({ id: "s-prg102-" + cod, dati: { programId: "prg102", sheetId: "sh-" + cod, kind: "sheet", sheet: { id: "sh-" + cod, code: cod, name: "Dorsali " + cod, exercises: esercizi } } });

const contoScheda = { codice: "A", esercizi: 2, tecniche: 1, righe: 3, modifiche: 2 };
const contoProgramma = { codice: "", schede: 2, esercizi: 3, tecniche: 1, righe: 4, modifiche: 3 };

function paginaVera(schede) {
  const dom = new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
  const doc = dom.window.document;
  const win = dom.window;
  win.setTimeout = () => 0;
  const chiamate = [];
  const mod = {
    attivo: true,
    annullabile: false,
    conta: (id) => (id ? contoScheda : contoProgramma),
    onCambia: (r) => { chiamate.push(r); return Promise.resolve({ ok: true }); },
    svuotaProgramma: () => { chiamate.push({ campo: "programma" }); return Promise.resolve({ ok: true }); }
  };
  const contenitore = doc.querySelector("#programma-attivo");
  assert.ok(contenitore, "la pagina vera ha il contenitore #programma-attivo");
  const r = riepilogoProgramma(meta, [], { schedeV2: ricostruisciSchede(schede), indice: 0, totaleProgrammi: 1, oggi: new Date(Date.UTC(2026, 10, 4)), quante: 8 });
  renderProgramma(doc, contenitore, { presente: true, numeroSedute: 0 }, Object.assign({}, r, { modifica: mod }));
  return { doc, win, chiamate, contenitore, r };
}

const una = () => [schedaDoc("A", [ESE("Rematore bilanciere"), ESE("Trazioni")])];
const due = () => [schedaDoc("A", [ESE("Rematore bilanciere"), ESE("Trazioni")]), schedaDoc("B", [ESE("Panca")])];
const tasto = (s, parola) => Array.from(s.doc.querySelectorAll("#programma-attivo .pr-bar button")).filter((b) => b.textContent.trim() === parola)[0] || null;

test("102.1 sulla pagina vera i tre tasti dell'igiene ci sono, accesi e senza nessun «spento»", () => {
  const s = paginaVera(due());
  for (const parola of ["Svuota scheda", "Svuota tutto il programma", "↺ ripristina scheda"]) {
    const b = tasto(s, parola);
    assert.ok(b, "il tasto «" + parola + "» sta nella barra vera");
    assert.equal(b.disabled, false, "ed è acceso");
    assert.ok(!/spento/.test(String(b.title || "")), "senza tooltip «spento»: " + b.title);
  }
  assert.equal(s.doc.querySelectorAll("#programma-attivo .pr-conf").length, 0, "senza clic non c'e' nessun riquadro");
});

test("102.2 «Svuota scheda» apre il riquadro in pagina, col conto esatto, l'avviso e il fuoco su Annulla", () => {
  const s = paginaVera(una());
  tasto(s, "Svuota scheda").click();
  const box = s.doc.querySelector("#programma-attivo .pr-conf");
  assert.ok(box, "il riquadro sta dentro la pagina, non in una finestrella del browser");
  assert.ok(box.textContent.indexOf("Svuoti la scheda A: 2 esercizi e 1 riga tecnica?") !== -1, "il conto esatto: " + box.textContent);
  assert.ok(box.textContent.indexOf("Puoi annullare solo finché questa pagina resta aperta.") !== -1, "con la riga dell'avviso");
  const annulla = box.querySelector('[data-igiene="annulla"]');
  assert.ok(annulla, "c'e' Annulla");
  assert.equal(s.doc.activeElement, annulla, "e il fuoco parte da lì', non dal tasto rosso");
});

test("102.3 Invio non conferma niente; Annulla chiude il riquadro e non scrive", () => {
  const s = paginaVera(una());
  tasto(s, "Svuota scheda").click();
  const box = s.doc.querySelector(".pr-conf");
  box.dispatchEvent(new s.win.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  assert.equal(s.chiamate.length, 0, "Invio non fa partire lo svuotamento");
  box.querySelector('[data-igiene="annulla"]').click();
  assert.equal(s.doc.querySelector(".pr-conf"), null, "il riquadro si chiude");
  assert.equal(s.chiamate.length, 0, "e non è stata scritta nessuna modifica");
});

test("102.4 il clic sul tasto rosso scrive una modifica sola, col campo giusto", () => {
  const s = paginaVera(una());
  tasto(s, "Svuota scheda").click();
  s.doc.querySelector('[data-igiene="svuota"]').click();
  assert.equal(s.chiamate.length, 1, "una chiamata sola");
  assert.equal(s.chiamate[0].campo, "svuota-scheda", "col campo dello svuotamento");
  assert.equal(s.doc.querySelector(".pr-conf"), null, "il riquadro sparisce dopo la conferma");
});

test("102.5 «Svuota tutto il programma» dice quante schede e quanti esercizi, e conferma da solo", () => {
  const s = paginaVera(due());
  tasto(s, "Svuota tutto il programma").click();
  const box = s.doc.querySelector(".pr-conf");
  assert.ok(box, "il riquadro si apre");
  assert.ok(box.textContent.indexOf("Svuoti il programma: 2 schede, 3 esercizi, 1 riga tecnica?") !== -1, "il conto del programma: " + box.textContent);
  assert.ok(box.textContent.indexOf("Puoi annullare solo finché questa pagina resta aperta.") !== -1, "con l'avviso");
  box.querySelector('[data-igiene="svuota-programma"]').click();
  assert.equal(s.chiamate.length, 1, "una chiamata sola per tutto il programma");
  assert.equal(s.chiamate[0].campo, "programma", "che passa dalla strada del programma intero");
});

test("102.6 «ripristina scheda» chiede conferma e dichiara quante modifiche si perdono", () => {
  const s = paginaVera(una());
  tasto(s, "↺ ripristina scheda").click();
  const box = s.doc.querySelector(".pr-conf");
  assert.ok(box, "il riquadro si apre");
  assert.ok(box.textContent.indexOf("Riporti la scheda A a com'era quando hai aperto la pagina? Perdi 2 modifiche.") !== -1, "il testo vero: " + box.textContent);
  assert.equal(s.chiamate.length, 0, "senza il clic non si scrive niente");
});

/* --- il modello, sui dati veri ------------------------------------------------ */

const tecnica = { id: "tec-1", tipo: "tecnica", padreId: "ex-1", nota: "fermo in basso" };
const docScheda = () => ({
  versione: 4,
  sheet: {
    id: "sh-A", code: "A", name: "Dorsali A",
    exercises: [
      Object.assign(ESE("Rematore bilanciere", "S1"), { id: "ex-1" }),
      Object.assign(ESE("Trazioni", "S1"), { id: "ex-2" }),
      Object.assign({}, tecnica),
      Object.assign(ESE("Panca"), { id: "ex-3" })
    ]
  }
});

test("102.7 svuota la scheda: una voce sola, tutte le righe tolte, e lo svuotamento non tocca il resto del documento", () => {
  const prima = docScheda();
  const esito = svuotaScheda(prima, {}, { quando: "2026-11-16T10:00:00.000Z", uid: "u1" });
  assert.equal(esito.ok, true, esito.motivo);
  assert.equal(esito.dati.sheet.exercises.filter((e) => !e.deletedAt).length, 0, "nessuna riga viva");
  assert.equal(Object.keys(esito.dati).sort().join(","), "modificatoInB,sheet,versione", "il documento non prende campi nuovi: " + Object.keys(esito.dati).join(","));
  assert.equal(esito.dati.sheet.code, "A", "il codice della scheda resta");
  assert.equal(esito.voce.tipo, "svuota-scheda", "una voce del tipo giusto");
  assert.equal(esito.voce.conto.righe, 4, "il conto diceva 4 righe vive");
  assert.deepEqual(esito.voce.prima, prima.sheet.exercises, "la voce porta l'elenco intero di prima");
});

test("102.8 l'Annulla rimette tutto uguale: esercizi, riga della tecnica, superserie e le otto settimane", () => {
  const prima = docScheda();
  const esito = svuotaScheda(prima, {}, { quando: "2026-11-16T10:00:00.000Z", uid: "u1" });
  const torna = annullaModifica(esito.dati, esito.voce, { quando: "2026-11-16T10:01:00.000Z", uid: "u1" });
  assert.equal(torna.ok, true, torna.motivo);
  assert.equal(improntaElenco(torna.dati.sheet.exercises), improntaElenco(prima.sheet.exercises), "l'elenco torna identico, non solo simile");
  assert.equal(torna.dati.sheet.exercises[0].sup, "S1", "la superserie e' tornata");
  assert.equal(torna.dati.sheet.exercises[2].padreId, "ex-1", "la riga della tecnica e' tornata col suo padre");
  assert.equal(torna.dati.sheet.exercises[0].progression.weeks.length, 8, "e le otto settimane sono ancora lì");
  assert.equal(torna.voce.annullaDi, esito.voce.idVoce, "la voce nuova cita quella annullata");
});

test("102.9 scheda già vuota: non si scrive niente, e lo dice; ripristino identico: idem", () => {
  const vuota = { versione: 2, sheet: { code: "A", exercises: [{ id: "x", name: "Vecchio", deletedAt: "2026-11-01T08:00:00.000Z" }] } };
  const e1 = svuotaScheda(vuota, {}, { quando: "2026-11-16T10:00:00.000Z" });
  assert.equal(e1.ok, false, "non scrive");
  assert.ok(/già vuota/.test(e1.motivo), "e lo dice: " + e1.motivo);
  const scheda = docScheda();
  const e2 = ripristinaScheda(scheda, { fotografia: scheda.sheet.exercises }, { quando: "2026-11-16T10:00:00.000Z" });
  assert.equal(e2.ok, false, "identica alla fotografia: non scrive");
  assert.ok(/com'era all'apertura/.test(e2.motivo), "e lo dice: " + e2.motivo);
});

test("102.10 ripristino con modifiche: rimette la fotografia, e l'Annulla riporta lo stato di prima", () => {
  const apertura = docScheda();
  const attuale = JSON.parse(JSON.stringify(apertura));
  attuale.versione = 6;
  attuale.sheet.exercises = attuale.sheet.exercises.filter((e) => e.id !== "ex-2");
  attuale.sheet.exercises.push(Object.assign(ESE("Lat machine"), { id: "ex-9" }));
  const foto = { elenco: apertura.sheet.exercises, quando: "2026-11-16T09:00:00.000Z" };
  assert.equal(contaDifferenze(attuale.sheet.exercises, foto.elenco), 2, "due righe diverse: una tolta, una aggiunta");
  const e = ripristinaScheda(attuale, { fotografia: foto.elenco }, { quando: "2026-11-16T10:00:00.000Z", uid: "u1" });
  assert.equal(e.ok, true, e.motivo);
  assert.equal(improntaElenco(e.dati.sheet.exercises), improntaElenco(foto.elenco), "la scheda torna com'era all'apertura");
  const torna = annullaModifica(e.dati, e.voce, { quando: "2026-11-16T10:01:00.000Z", uid: "u1" });
  assert.equal(torna.ok, true, torna.motivo);
  assert.equal(improntaElenco(torna.dati.sheet.exercises), improntaElenco(attuale.sheet.exercises), "e l'Annulla riporta lo stato di prima del ripristino");
});
