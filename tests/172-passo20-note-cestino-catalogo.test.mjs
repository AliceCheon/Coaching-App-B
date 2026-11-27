/* Guardia 172 (passo 20) — le note della scheda si scrivono, il cestino toglie
 * la scheda, il catalogo non resta indietro.
 *
 * Le tre cose che Alice ha chiesto il 26/11/2026, con la prova che restano:
 *   172.1  la nota della scheda: la funzione pura scrive DENTRO `sheet` (non un
 *          livello troppo su), con versione +1, marchio, voce di registro; e
 *          l'Annulla la rimette com'era;
 *   172.2  la scheda tolta dal programma: la funzione pura la toglie dal
 *          programma senza cancellare il documento, e rifiuta l'ultima scheda;
 *          l'Annulla la fa tornare;
 *   172.3  nella pagina vera la textarea delle note non è più `readOnly`, si
 *          scrive, il valore arriva nel documento e TORNA dopo il refresh (due
 *          caricamenti, lo stesso finto Firestore);
 *   172.4  il cestino NON è più per scheda (passo 25): in Confronta e in
 *          «Cambia» non c'è, le pastiglie restano; nell'Archivio c'è UN cestino
 *          per programma, che prima chiede conferma in chiaro (schede,
 *          esercizi, serie, cosa non si tocca) e poi marchia il documento del
 *          programma: sparisce da tutte le viste, il programma in uso non si
 *          elimina;
 *   172.5  il catalogo contiene OGNI esercizio che sta nelle schede: quelli del
 *          programma vero di Alice nel v31 e quelli del finto Firestore qui
 *          sotto. È la guardia che impedisce al database di restare indietro.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";
import { creaZonaBFinta, creaSdkFinto } from "./finti/zona-b-finta.mjs";
import { attendiFinche } from "./finti/attesa.mjs";
import { cambiaNotaScheda, togliSchedaDalProgramma, annullaModifica } from "../comune/modifiche-b.js";
import { ricostruisciSchede } from "../comune/schede-v2.js";
import { risolviEsercizio } from "../comune/riconoscimento-esercizio.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const HTML = readFileSync(join(radice, "desktop", "index.html"), "utf8");
const QUANDO = "2026-11-26T21:00:00.000Z";

/* ---------- 172.1 · la nota della scheda (funzione pura) ------------------ */

const settimana = (n) => ({ week: n, sets: 4, reps: "10", rest: { seconds: 90 }, type: "normal", note: "" });
const otto = () => Array.from({ length: 8 }, (_, i) => settimana(i + 1));

function schedaDoc(opzioni) {
  const o = opzioni || {};
  return {
    id: "program-v2-sheet-p1__A",
    programId: "p1", sheetId: "sh-A", kind: "sheet", versione: 4,
    sheet: {
      id: "sh-A", code: "A", name: "Glutei",
      exercises: [
        { id: "ex-1", name: "Pendulum focus glutei", muscle: "glutei", progression: { weeks: otto() } },
        { id: "ex-2", name: "Hip Thrust", muscle: "glutei", progression: { weeks: otto() } }
      ],
      ...(o.nota != null ? { note: o.nota } : {})
    }
  };
}

test("172.1 la nota si scrive DENTRO la scheda, con versione, marchio, voce e Annulla", () => {
  const prima = schedaDoc({ nota: "Vecchia nota" });
  const esito = cambiaNotaScheda(prima, { idScheda: "sh-A", valore: "  Riscaldamento 10' bici\nPrehab spalle  " }, { quando: QUANDO, uid: "u1" });
  assert.equal(esito.ok, true, "la nota non si è scritta: " + JSON.stringify(esito));
  /* Il campo sta DENTRO `sheet`: scritto un livello troppo su la scrittura
   * «riesce» e la pagina non lo vede (la lezione del passo 15b). */
  assert.equal(esito.dati.sheet.note, "Riscaldamento 10' bici\nPrehab spalle", "la nota non è nel foglio della scheda: " + JSON.stringify(esito.dati.sheet));
  assert.equal(esito.dati.note, undefined, "la nota è finita anche fuori dalla scheda");
  assert.equal(esito.dati.versione, 5, "la versione deve avanzare di uno");
  assert.equal(esito.dati.modificatoInB.ultima, "nota");
  assert.equal(esito.voce.tipo, "nota-scheda");
  assert.equal(esito.voce.campo, "nota");
  assert.equal(esito.voce.prima, "Vecchia nota");
  assert.equal(esito.voce.dopo, "Riscaldamento 10' bici\nPrehab spalle");
  assert.equal(esito.voce.versionePrima, 4);
  assert.equal(esito.voce.versioneDopo, 5);

  /* Le stesse parole non si riscrivono, il troppo lungo si rifiuta. */
  assert.equal(cambiaNotaScheda(esito.dati, { valore: "  Riscaldamento 10' bici\nPrehab spalle " }, { quando: QUANDO }).ok, false);
  const lungo = cambiaNotaScheda(prima, { valore: "x".repeat(2001) }, { quando: QUANDO });
  assert.equal(lungo.ok, false);
  assert.match(String(lungo.motivo), /2000/);

  /* Vuoto = nota tolta dalla scheda (non una stringa vuota lasciata li'). */
  const tolta = cambiaNotaScheda(prima, { valore: "" }, { quando: QUANDO });
  assert.equal(tolta.ok, true);
  assert.equal(Object.prototype.hasOwnProperty.call(tolta.dati.sheet, "note"), false, "la nota vuota deve sparire dal foglio");

  /* L'Annulla rimette esattamente quella di prima. */
  const indietro = annullaModifica(esito.dati, esito.voce, { quando: "2026-11-26T21:05:00.000Z", uid: "u1" });
  assert.equal(indietro.ok, true, "l'Annulla della nota non è passata: " + JSON.stringify(indietro));
  assert.equal(indietro.dati.sheet.note, "Vecchia nota");
  assert.equal(indietro.voce.campo, "nota");
  assert.equal(indietro.voce.annullaDi, esito.voce.idVoce);
});

/* ---------- 172.2 · togliere la scheda dal programma (funzione pura) ------ */

test("172.2 la scheda esce dal programma, il documento resta; l'ultima non si toglie; l'Annulla la rimette", () => {
  const prima = JSON.stringify(schedaDoc({ nota: "resta" }));
  const ultima = togliSchedaDalProgramma(schedaDoc(), { idScheda: "sh-A", schedeAttive: 1 }, { quando: QUANDO, uid: "u1" });
  assert.equal(ultima.ok, false, "l'ultima scheda del programma non si deve poter togliere");
  assert.match(String(ultima.motivo), /ultima scheda/);

  const esito = togliSchedaDalProgramma(schedaDoc({ nota: "resta" }), {
    idScheda: "sh-A", idProgramma: "p1", idDocumento: "program-v2-sheet-p1__A", schedeAttive: 2
  }, { quando: QUANDO, uid: "u1" });
  assert.equal(esito.ok, true, "la scheda non è stata tolta: " + JSON.stringify(esito));
  assert.equal(esito.dati.toltoDalProgramma, QUANDO);
  assert.equal(esito.dati.kind, "archived");
  assert.equal(esito.dati.versione, 5);
  /* Niente si cancella: esercizi, note e settimane sono ancora li'. */
  assert.equal(esito.dati.sheet.exercises.length, 2);
  assert.equal(esito.dati.sheet.note, "resta");
  assert.equal(esito.voce.tipo, "togli-scheda");
  assert.equal(esito.voce.documento, "program-v2-sheet-p1__A", "la voce deve portare il documento da rimettere");
  assert.match(String(esito.voce.prima), /Scheda A/);

  /* La ricostruzione delle schede non la vede piu': per il programma non c'e'. */
  const dopo = ricostruisciSchede([{ id: "program-v2-sheet-p1__A", dati: esito.dati }]);
  assert.equal((((dopo.perProgramma || {}).p1 || {}).schede || []).length, 0, "la scheda tolta compare ancora fra le schede");
  assert.equal((((dopo.perProgramma || {}).p1 || {}).archiviate || []).length, 0, "la scheda tolta non è un'archiviata da leggere");

  /* L'Annulla la rimette com'era. */
  const indietro = annullaModifica(esito.dati, esito.voce, { quando: "2026-11-26T21:10:00.000Z", uid: "u1" });
  assert.equal(indietro.ok, true, "l'Annulla della scheda non è passata: " + JSON.stringify(indietro));
  assert.equal(indietro.dati.toltoDalProgramma, undefined);
  assert.equal(indietro.dati.kind, "sheet");
  const tornata = ricostruisciSchede([{ id: "program-v2-sheet-p1__A", dati: indietro.dati }]);
  assert.equal((((tornata.perProgramma || {}).p1 || {}).schede || []).length, 1, "la scheda annullata non è tornata nel programma");
  /* E la scheda di prima, tolta e rimessa, è identica a com'era. */
  const senzaVersioni = (d) => {
    const c = JSON.parse(JSON.stringify(d));
    delete c.versione; delete c.modificatoInB; delete c.archivedAt;
    return c;
  };
  assert.deepEqual(senzaVersioni(indietro.dati), senzaVersioni(JSON.parse(prima)));
});

/* ---------- il finto Firestore della pagina ------------------------------- */

const META = (id, nome, rotazione) => ({
  id: id, name: nome, status: id === "prg-viva" ? "active" : "available", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, description: "", message: "",
  rotation: rotazione, createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
});
const PROGRAMMA = (id, nome, rotation) => ({
  id: id, name: nome, status: id === "prg-viva" ? "active" : "available", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, versione: 2, rotation: rotation
});
const ESE = (id, nome, muscolo) => ({
  id: id, name: nome, muscle: muscolo,
  prescription: { rest: "1'30\"" },
  progression: { weeks: otto() }
});
const ID_VIVA_A = "program-v2-sheet-prg-viva__sh-A";
const ID_ALTRO_A = "program-v2-sheet-prg-altro__sh-A";
const ID_ALTRO_B = "program-v2-sheet-prg-altro__sh-B";

const DATI = {
  radice: { quando: "2026-11-05T09:00:00.000Z", fonte: "prova 172" },
  programmi: [
    { id: "program-v2-meta-prg-viva", dati: { programMeta: META("prg-viva", "Programma in uso", ["A"]) } },
    { id: "prg-viva", dati: PROGRAMMA("prg-viva", "Programma in uso", ["A"]) },
    { id: "program-v2-meta-prg-altro", dati: { programMeta: META("prg-altro", "Blocco autunno", ["A", "B"]) } },
    { id: "prg-altro", dati: PROGRAMMA("prg-altro", "Blocco autunno", ["A", "B"]) }
  ],
  schede: [
    {
      id: ID_VIVA_A,
      dati: { programId: "prg-viva", sheetId: "sh-viva-a", kind: "sheet", versione: 1, sheet: { id: "sh-viva-a", code: "A", name: "Glutei", exercises: [ESE("ex-v1", "Pendulum focus glutei", "glutei")] } }
    },
    {
      id: ID_ALTRO_A,
      dati: { programId: "prg-altro", sheetId: "sh-altro-a", kind: "sheet", versione: 1, sheet: { id: "sh-altro-a", code: "A", name: "Glutei e femorali", exercises: [ESE("ex-a1", "Hip Thrust", "glutei"), ESE("ex-a2", "Slanci laterali cavo basso", "gluteo medio")] } }
    },
    {
      id: ID_ALTRO_B,
      dati: { programId: "prg-altro", sheetId: "sh-altro-b", kind: "sheet", versione: 1, sheet: { id: "sh-altro-b", code: "B", name: "Spinta", exercises: [ESE("ex-b1", "Panca piana", "petto"), ESE("ex-b2", "Lat machine presa neutra", "dorsali")] } }
    }
  ],
  sedute: [{ id: "sed-1", dati: { session: { id: "sed-1", dateInput: "2026-10-26", sessionCode: "A", exercises: [{ name: "Hip Thrust", kg: 60 }] } } }],
  esclusioni: [], registro: [], scheletri: []
};

const zona = creaZonaBFinta({ dati: DATI, latenzeLettura: [25, 10, 40], latenzaScrittura: 5 });

async function carica(numero) {
  const vc = new VirtualConsole();
  vc.on("jsdomError", () => {});
  const dom = new JSDOM(HTML, { runScripts: "outside-only", virtualConsole: vc });
  dom.window.BD_B = { nomeAppAuth: "B", prefissoChiavi: "bd-b.prova172." + numero + ".", firebase: { projectId: "prova", apiKey: "prova", appId: "prova:prova" } };
  dom.window.firebase = creaSdkFinto(zona, { uid: "alice-prova" });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  await import("../desktop/app-v31.js?passo20=" + numero);
  return dom;
}

async function coda() {
  let quieto = 0;
  await attendiFinche(() => {
    if (zona.inVolo() === 0) quieto += 10; else quieto = 0;
    return quieto >= 400;
  }, 20000, "la coda delle scritture non si è mai svuotata");
}

const clic = (win, el) => el.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
const testoNota = (doc) => doc.querySelector("#programma-attivo [data-pr-c='scheda-nota']");
const vociRegistro = (tipo) => zona.elencoDi("registro").filter((d) => d.dati && d.dati.tipo === tipo);

/* ---------- 172.3 · la nota nella pagina vera ----------------------------- */

test("172.3 la textarea delle note si scrive, la nota arriva nel documento e torna dopo il refresh", async () => {
  const dom = await carica(1);
  const doc = dom.window.document;
  await attendiFinche(() => testoNota(doc), 20000, "la textarea delle note non si è montata");
  const ta = testoNota(doc);
  assert.equal(ta.readOnly, false, "la textarea delle note è ancora in sola lettura");
  assert.equal(ta.disabled, false, "la textarea delle note è spenta");
  assert.equal(ta.getAttribute("data-pr-scheda"), null);

  const VOLUTO = "Riscaldamento 10' bici\nPrehab spalle con elastico";
  ta.focus();
  ta.value = VOLUTO;
  ta.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  await attendiFinche(() => {
    const d = zona.datiDi("schede", ID_VIVA_A);
    return Boolean(d && d.sheet && d.sheet.note === VOLUTO);
  }, 15000, "la nota non è arrivata nel foglio della scheda: " + JSON.stringify((zona.datiDi("schede", ID_VIVA_A) || {}).sheet));
  const dopo = zona.datiDi("schede", ID_VIVA_A);
  assert.equal(dopo.versione, 2, "la versione della scheda non è avanzata");
  assert.equal(dopo.modificatoInB.ultima, "nota");

  await attendiFinche(() => vociRegistro("nota-scheda").length === 1, 15000, "la voce di registro della nota non è arrivata");
  const voci = vociRegistro("nota-scheda");
  assert.equal(voci.length, 1, "la voce di registro della nota non c'è");
  assert.equal(voci[0].dati.campo, "nota");
  assert.equal(voci[0].dati.dopo, VOLUTO);
  const avviso = String((doc.querySelector("[data-tono]") || {}).textContent || "");
  assert.match(avviso, /nota della scheda salvata/i, "la riga di stato non dice che la nota è salvata: " + JSON.stringify(avviso));
  await coda();

  /* Il refresh: pagina nuova, stesso Firestore. La nota si rilegge dalla
   * scheda, non dalla memoria della sessione. */
  const dom2 = await carica(2);
  const doc2 = dom2.window.document;
  await attendiFinche(() => testoNota(doc2), 20000, "dopo il refresh la textarea delle note non c'è");
  await attendiFinche(() => String(testoNota(doc2).value || "") === VOLUTO, 15000,
    "dopo il refresh la nota non torna: " + JSON.stringify(String(testoNota(doc2).value || "")));
  assert.equal(testoNota(doc2).readOnly, false);
  await coda();
});

/* ---------- 172.4 · un cestino per programma, solo nell'Archivio ----------
 * Passo 25: Alice ha chiesto «1 cestino solo per programma, e lo voglio solo
 * nell'archivio». Qui si prova la pagina vera sul finto Firestore: niente
 * cestini per scheda, un cestino per riga, la conferma, il marchio, e il
 * programma che sparisce da Archivio e da «Cambia». */

test("172.4 nessun cestino per scheda; nell'Archivio un cestino per programma, con conferma e marchio", async () => {
  const dom = await carica(3);
  const doc = dom.window.document;
  await attendiFinche(() => doc.getElementById("archivio-corpo"), 20000, "l'Archivio non si è montato");

  const rigaAltro = () => [...doc.querySelectorAll("#archivio-corpo tr")]
    .find((tr) => String(tr.textContent || "").indexOf("Blocco autunno") > -1) || null;
  await attendiFinche(() => rigaAltro() && rigaAltro().querySelector(".pg-guarda"), 15000, "nell'Archivio non c'è la riga del programma di prova");

  /* (a) in giro non c'è nessun cestino per scheda */
  assert.equal(doc.querySelectorAll(".pr-cestino").length, 0, "c'è ancora un cestino per scheda in pagina");

  /* (b) il pannello «Cambia»: le pastiglie restano, il cestino no */
  const tastoCambia = () => [...doc.querySelectorAll("#programma-attivo .pr-acts button")]
    .find((b) => (b.textContent || "").trim() === "Cambia") || null;
  await attendiFinche(() => tastoCambia(), 15000, "il tasto «Cambia» non c'è");
  clic(dom.window, tastoCambia());
  await attendiFinche(() => doc.querySelector(".pr-elenco-programmi"), 10000, "il pannello «Cambia» non si è aperto");
  const pannello = doc.querySelector(".pr-elenco-programmi");
  assert.ok(pannello.querySelector(".pr-elenco-schede"), "le pastiglie delle schede devono restare nel pannello");
  assert.match(String(pannello.querySelector(".pr-elenco-schede").textContent || ""), /A/);
  assert.equal(pannello.querySelectorAll(".pr-cestino").length, 0, "il pannello «Cambia» ha ancora un cestino per scheda");
  clic(dom.window, tastoCambia());
  await attendiFinche(() => !doc.querySelector(".pr-elenco-programmi"), 10000, "il pannello «Cambia» non si è chiuso");

  /* (c) la finestra «Guarda» (e quindi il Confronto): nessun cestino per scheda */
  clic(dom.window, rigaAltro().querySelector(".pg-guarda"));
  await attendiFinche(() => doc.querySelector(".pc-modale .pc-scheda"), 15000, "la finestra «Guarda» non si è aperta con le schede");
  assert.equal(doc.querySelectorAll(".pc-modale .pc-scheda").length, 2, "il programma di prova deve mostrare due schede");
  assert.equal(doc.querySelectorAll(".pc-modale .pr-cestino").length, 0, "la finestra «Guarda» ha ancora un cestino per scheda");
  const chiudi = [...doc.querySelectorAll(".pc-modale button")].find((b) => (b.textContent || "").trim() === "Chiudi");
  assert.ok(chiudi, "manca il tasto «Chiudi» della finestra");
  clic(dom.window, chiudi);
  await attendiFinche(() => doc.querySelectorAll(".pc-modale").length === 0, 15000, "la finestra non si è chiusa");

  /* (d) UN cestino per riga nell'Archivio, con il nome del programma */
  const cestini = () => [...doc.querySelectorAll("#archivio-corpo .pg-cestino")];
  assert.equal(cestini().length, 2, "non c'è un cestino per ogni riga dell'Archivio");
  const cestinoAltro = rigaAltro().querySelector(".pg-cestino");
  assert.ok(cestinoAltro, "la riga «Blocco autunno» non ha il cestino");
  assert.equal(cestinoAltro.disabled, false, "il cestino del programma non in uso deve essere acceso");
  assert.match(String(cestinoAltro.getAttribute("aria-label")), /^elimina il programma «Blocco autunno»/,
    "l'aria-label del cestino non dice il nome del programma: " + JSON.stringify(cestinoAltro.getAttribute("aria-label")));
  const rigaAttivo = cestini().map((b) => b.closest("tr")).find((tr) => String(tr.textContent || "").includes("(attiva)"));
  const cestinoAttivo = rigaAttivo.querySelector(".pg-cestino");
  assert.equal(cestinoAttivo.disabled, true, "il cestino del programma in uso non deve poter scrivere");
  assert.match(String(cestinoAttivo.getAttribute("title")), /programma in uso/, "il cestino del programma in uso non dice perché è spento");

  /* (e) il primo clic non scrive: apre la conferma in chiaro */
  clic(dom.window, cestinoAltro);
  await attendiFinche(() => doc.querySelector(".cestino-programma-modale"), 10000, "la conferma del cestino non si è aperta");
  const conferma = doc.querySelector(".cestino-programma-modale");
  const domanda = String((conferma.querySelector(".cestino-domanda") || {}).textContent || "");
  assert.match(domanda, /Archivio, Cambia, Confronto e Prospetto/, "la conferma non dice da dove sparisce: " + JSON.stringify(domanda));
  assert.match(domanda, /2 schede/);
  assert.match(domanda, /4 esercizi/);
  assert.match(domanda, /serie programmate/);
  assert.match(String((conferma.querySelector(".cestino-nota") || {}).textContent || ""), /Logbook, le sedute fatte, lo storico e gli scheletri/,
    "la conferma non dice cosa NON si tocca");
  assert.equal(zona.datiDi("programmi", "program-v2-meta-prg-altro").eliminato, undefined, "la conferma ha scritto prima del sì");

  /* (f) il sì: il documento resta in B, marcato */
  const confermaBtn = conferma.querySelector("[data-elimina-programma-conferma]");
  assert.ok(confermaBtn, "manca il tasto che conferma");
  clic(dom.window, confermaBtn);
  await attendiFinche(() => Boolean(zona.datiDi("programmi", "program-v2-meta-prg-altro").eliminato), 15000,
    "il programma non è stato marcato eliminato: " + JSON.stringify(zona.datiDi("programmi", "program-v2-meta-prg-altro")));
  const marcato = zona.datiDi("programmi", "program-v2-meta-prg-altro");
  assert.equal(marcato.eliminato, true);
  assert.match(String(marcato.eliminatoIl || ""), /^20\d\d-/, "il marchio non dice quando");
  assert.ok(marcato.eliminatoDa, "il marchio non dice chi");
  assert.equal(marcato.programMeta.name, "Blocco autunno", "il documento è stato svuotato invece di marcato");
  await attendiFinche(() => vociRegistro("elimina-programma").length === 1, 15000, "la voce di registro dell'eliminazione non è arrivata");
  const voce = vociRegistro("elimina-programma")[0].dati;
  assert.equal(voce.campo, "programma");
  assert.equal(voce.programma, "program-v2-meta-prg-altro", "la voce non dice quale documento");
  assert.equal(voce.conta.schede, 2);

  /* Le schede e le sedute non si sono mosse. */
  assert.equal(zona.datiDi("schede", ID_ALTRO_A).toltoDalProgramma, undefined);
  assert.equal(zona.datiDi("schede", ID_ALTRO_A).sheet.exercises.length, 2, "eliminando il programma si sono persi gli esercizi della scheda");
  assert.equal(zona.datiDi("sedute", "sed-1").session.exercises.length, 1, "la seduta è stata toccata");

  /* (g) è sparito: dall'Archivio e dal pannello «Cambia» */
  await coda();
  await attendiFinche(() => !rigaAltro(), 15000, "l'Archivio mostra ancora il programma eliminato");
  const rigaRimasta = [...doc.querySelectorAll("#archivio-corpo tr")].find((tr) => String(tr.textContent || "").includes("(attiva)"));
  assert.ok(rigaRimasta && String(rigaRimasta.textContent).includes("Programma in uso"),
    "l'Archivio ha perso anche il programma in uso");
  clic(dom.window, tastoCambia());
  await attendiFinche(() => doc.querySelector(".pr-elenco-programmi"), 10000, "il pannello «Cambia» non si è riaperto");
  const dopo = String(doc.querySelector(".pr-elenco-programmi").textContent || "");
  assert.ok(dopo.indexOf("Blocco autunno") === -1, "il pannello «Cambia» elenca ancora il programma eliminato: " + JSON.stringify(dopo));
  assert.match(dopo, /Programma in uso/);
  clic(dom.window, tastoCambia());
  await coda();
});

/* ---------- 172.5 · il catalogo contiene gli esercizi delle schede --------- */

test("172.5 il catalogo non resta indietro: ogni esercizio delle schede è una voce del catalogo", () => {
  /* (a) il programma VERO di Alice nel v31 (backup del 30/10, quattro schede):
   * ogni nome scritto li' deve essere una voce esatta del catalogo, altrimenti
   * il database esercizi è rimasto indietro rispetto alle schede. */
  const i = HTML.indexOf("const D = ");
  assert.ok(i > 0, "il dataset vero del v31 non si trova piu'");
  const j = HTML.indexOf("\n", i);
  const D = JSON.parse(HTML.slice(i + 10, j).replace(/;\s*$/, ""));
  const nomiVeri = new Set();
  D.programma.schede.forEach((s) => (s.lista || []).forEach((e) => nomiVeri.add(e.nome)));
  assert.ok(nomiVeri.size >= 30, "il dataset vero del v31 ha meno esercizi del previsto: " + nomiVeri.size);
  const mancanti = [...nomiVeri].filter((n) => risolviEsercizio(n).come !== "esatto");
  assert.deepEqual(mancanti, [], "esercizi delle schede vere che il catalogo non ha: " + mancanti.join(" · "));
  /* I casi che Alice ha visto a schermo, con il distretto giusto. */
  assert.equal(risolviEsercizio("Pendulum focus glutei").distretto, "Glutei");
  assert.equal(risolviEsercizio("Slanci laterali cavo basso").distretto, "Glutei");
  assert.equal(risolviEsercizio("Affondo front squat machine").distretto, "Quadricipiti");
  assert.equal(risolviEsercizio("Pulley mono").distretto, "Centro schiena");

  /* (b) le schede e le sedute del finto Firestore di questa guardia: quello che
   * la pagina legge davvero deve stare in catalogo. */
  const dalFinto = new Set();
  DATI.schede.forEach((s) => ((s.dati.sheet || {}).exercises || []).forEach((e) => dalFinto.add(e.name)));
  DATI.sedute.forEach((s) => (((s.dati.session || {}).exercises) || []).forEach((e) => dalFinto.add(e.name)));
  const mancantiFinto = [...dalFinto].filter((n) => risolviEsercizio(n).come !== "esatto");
  assert.deepEqual(mancantiFinto, [], "esercizi del finto Firestore fuori dal catalogo: " + mancantiFinto.join(" · "));
});
