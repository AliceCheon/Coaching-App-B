/* Guardia 176 (passo 25) — UN cestino per programma, e solo nell'Archivio.
 *
 * Alice (27/11/2026): «quel cestino accanto a ogni scheda è orrendo.. io volevo
 * 1 cestino solo per programma, e lo voglio solo nell'archivio che poi se lo
 * cancello da lì sparisce automaticamente da tutte le parti».
 *
 * Le cose che questa guardia tiene ferme:
 *   176.1  la funzione pura marchia il documento del programma (`eliminato` +
 *          quando + chi, versione +1, voce di registro) e NON tocca il resto;
 *          il programma in uso si rifiuta, e un programma già marcato anche;
 *   176.2  la lettura salta i programmi marcati — anche quando dello stesso
 *          programma resta una copia v1 senza marchio: il programma è uno;
 *   176.3  nella pagina vera il programma eliminato sparisce da Archivio e dal
 *          pannello «Cambia» (lo stesso elenco che apre il Confronto), mentre
 *          il documento resta in B, marcato e non cancellato; il Logbook e le
 *          sedute restano dove sono;
 *   176.4  il programma in uso non si elimina: il cestino è spento e spiega, e
 *          il rifiuto c'è anche nella funzione che scrive;
 *   176.5  con un programma solo (l'attivo) non c'è nessun tasto che elimina:
 *          non si resta senza programma in uso.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";
import { creaZonaBFinta, creaSdkFinto } from "./finti/zona-b-finta.mjs";
import { attendiFinche } from "./finti/attesa.mjs";
import { eliminaProgrammaDocumento } from "../comune/modifiche-b.js";
import { programmiDaDocumenti } from "../comune/lettura-b.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const HTML = readFileSync(join(radice, "desktop", "index.html"), "utf8");
const QUANDO = "2026-11-27T10:00:00.000Z";

const otto = () => Array.from({ length: 8 }, (_, i) => ({ week: i + 1, sets: 4, reps: "10", rest: { seconds: 90 }, type: "normal", note: "" }));
const ESE = (id, nome, muscolo) => ({ id, name: nome, muscle: muscolo, prescription: { rest: "1'30\"" }, progression: { weeks: otto() } });

const META = (id, nome, attivo) => ({
  id, name: nome, status: attivo ? "active" : "available", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, description: "", message: "",
  rotation: ["A", "B"], createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
});

const SCHEDA = (idDoc, pid, codice, nome, esercizi) => ({
  id: idDoc,
  dati: {
    programId: pid, sheetId: "sh-" + pid + "-" + codice, kind: "sheet", versione: 1,
    sheet: { id: "sh-" + pid + "-" + codice, code: codice, name: nome, exercises: esercizi }
  }
});

/* Due programmi: quello in uso (schede A e B) e uno disponibile (C e D). Una
 * seduta con il codice A, che il logbook può attribuire solo al programma in
 * uso: così la colonna Sedute dell'Archivio si può controllare prima e dopo. */
function datiDueProgrammi() {
  return {
    radice: { quando: "2026-11-05T09:00:00.000Z", fonte: "prova 176" },
    programmi: [
      { id: "program-v2-meta-prg-uso", dati: { programMeta: META("prg-uso", "Intensita ottobre-dicembre", true) } },
      { id: "program-v2-meta-prg-via", dati: { programMeta: META("prg-via", "Blocco primavera", false) } }
    ],
    schede: [
      SCHEDA("program-v2-sheet-prg-uso__A", "prg-uso", "A", "Glutei", [ESE("u-a1", "Hip Thrust", "glutei"), ESE("u-a2", "Pendulum focus glutei", "glutei")]),
      SCHEDA("program-v2-sheet-prg-uso__B", "prg-uso", "B", "Spinta", [ESE("u-b1", "Panca piana", "petto"), ESE("u-b2", "Lat machine presa neutra", "dorsali")]),
      SCHEDA("program-v2-sheet-prg-via__C", "prg-via", "C", "Gambe", [ESE("v-c1", "Affondo front squat machine", "quadricipiti"), ESE("v-c2", "Leg curl", "femorali")]),
      SCHEDA("program-v2-sheet-prg-via__D", "prg-via", "D", "Trazione", [ESE("v-d1", "Pulley mono", "centro schiena"), ESE("v-d2", "Curl bilanciere", "bicipiti")])
    ],
    sedute: [{ id: "sed-1", dati: { session: { id: "sed-1", dateInput: "2026-10-26", sessionCode: "A", exercises: [{ name: "Hip Thrust", kg: 60 }] } } }],
    esclusioni: [], registro: [], scheletri: []
  };
}

/* ---------- 176.1 · la funzione pura -------------------------------------- */

const DOC_VIA = () => ({
  programMeta: META("prg-via", "Blocco primavera", false),
  versione: 4,
  modificatoInB: { quando: "2026-11-02T18:00:00.000Z", da: "u0", ultima: "testata" }
});
const DOC_USO = () => ({ programMeta: META("prg-uso", "Intensita ottobre-dicembre", true), versione: 2 });

test("176.1 il programma si marchia eliminato: documento intatto, versione +1, voce di registro", () => {
  const prima = DOC_VIA();
  const esito = eliminaProgrammaDocumento(prima, {
    idDocumento: "program-v2-meta-prg-via", idProgramma: "prg-via",
    conta: { schede: 2, esercizi: 4, serie: 128 }
  }, { quando: QUANDO, uid: "alice-uid" });
  assert.equal(esito.ok, true, "il programma non si è marchiato: " + JSON.stringify(esito));
  assert.equal(esito.dati.eliminato, true);
  assert.equal(esito.dati.eliminatoIl, QUANDO, "il marchio non dice quando");
  assert.equal(esito.dati.eliminatoDa, "alice-uid", "il marchio non dice chi");
  assert.equal(esito.dati.versione, 5, "la versione deve avanzare di uno");
  assert.equal(esito.dati.modificatoInB.ultima, "elimina-programma");
  /* Il programma dentro il documento resta com'era: niente si svuota. */
  assert.equal(esito.dati.programMeta.name, "Blocco primavera");
  assert.equal(esito.dati.programMeta.startDate, "2026-10-05");
  /* La voce del registro dice cosa è stato fatto e i conti detti ad Alice. */
  assert.equal(esito.voce.tipo, "elimina-programma");
  assert.equal(esito.voce.origine, "modifica-fatta-in-B");
  assert.equal(esito.voce.campo, "programma");
  assert.equal(esito.voce.programma, "program-v2-meta-prg-via");
  assert.equal(esito.voce.nome, "Blocco primavera");
  assert.equal(esito.voce.conta.schede, 2);
  assert.equal(esito.voce.conta.esercizi, 4);
  assert.equal(esito.voce.conta.serie, 128);
  assert.equal(esito.voce.versionePrima, 4);
  assert.equal(esito.voce.versioneDopo, 5);
  /* La voce NON è fra quelle che l'Annulla della pagina riprende in mano:
   * il documento resta, e un giro futuro lo recupera. */
  assert.equal(esito.voce.primaPiano, undefined);

  /* Il programma in uso si rifiuta, e il documento non cambia. */
  const uso = DOC_USO();
  const negato = eliminaProgrammaDocumento(uso, { idDocumento: "program-v2-meta-prg-uso" }, { quando: QUANDO, uid: "u1" });
  assert.equal(negato.ok, false);
  assert.match(String(negato.motivo), /programma in uso/);
  assert.equal(uso.eliminato, undefined, "il rifiuto ha scritto lo stesso");
  assert.equal(uso.versione, 2);
  /* E anche se la pagina dicesse «non è quello in uso», la funzione ricontrolla
   * il documento: basta `attivo: true` per fermarsi. */
  const negato2 = eliminaProgrammaDocumento(DOC_VIA(), { attivo: true }, { quando: QUANDO, uid: "u1" });
  assert.equal(negato2.ok, false);
  assert.match(String(negato2.motivo), /programma in uso/);

  /* Già marcato: non si rimarchia. */
  const gia = eliminaProgrammaDocumento(esito.dati, { idDocumento: "program-v2-meta-prg-via" }, { quando: QUANDO, uid: "u1" });
  assert.equal(gia.ok, false);
  assert.match(String(gia.motivo), /marcato eliminato/);
});

/* ---------- 176.2 · la lettura salta i programmi marcati ------------------- */

test("176.2 la lettura salta il programma marcato, anche con una copia v1 senza marchio", () => {
  const documenti = [
    { id: "program-v2-meta-prg-uso", dati: { programMeta: META("prg-uso", "Intensita ottobre-dicembre", true) } },
    /* Il programma eliminato: marchiato sul documento v2. */
    { id: "program-v2-meta-prg-via", dati: Object.assign({}, DOC_VIA(), { eliminato: true, eliminatoIl: QUANDO, eliminatoDa: "u1" }) },
    /* La sua copia vecchia v1, senza marchio: non deve farlo tornare. */
    { id: "prg-via", dati: { program: { id: "prg-via", name: "Blocco primavera", status: "available", versione: 3 } } }
  ];
  const letto = programmiDaDocumenti(documenti);
  const nomi = letto.programmi.map((p) => p.name);
  assert.deepEqual(nomi, ["Intensita ottobre-dicembre"], "il programma eliminato è ancora nella lettura: " + JSON.stringify(nomi));
  /* I documenti restano contati: nessuno è stato cancellato. */
  assert.equal(letto.documenti, 3, "la lettura non conta più i documenti che ci sono");

  /* Controprova: senza marchio il programma c'è — è il marchio a farlo sparire. */
  const senzaMarchio = documenti.map((d) => ({ id: d.id, dati: Object.assign({}, d.dati) }));
  delete senzaMarchio[1].dati.eliminato;
  delete senzaMarchio[1].dati.eliminatoIl;
  delete senzaMarchio[1].dati.eliminatoDa;
  assert.deepEqual(programmiDaDocumenti(senzaMarchio).programmi.map((p) => p.name).sort(),
    ["Blocco primavera", "Intensita ottobre-dicembre"]);
});

/* ---------- la pagina vera ----------------------------------------------- */

function montaPagina(dati) {
  const zona = creaZonaBFinta({ dati, latenzeLettura: [20, 8, 35], latenzaScrittura: 5 });
  return { zona };
}

async function carica(zona, numero) {
  const vc = new VirtualConsole();
  vc.on("jsdomError", () => {});
  const dom = new JSDOM(HTML, { runScripts: "outside-only", virtualConsole: vc });
  dom.window.BD_B = { nomeApp: "B", prefissoChiavi: "bd-b.prova176." + numero + ".", firebase: { projectId: "prova", apiKey: "prova", appId: "prova:prova" } };
  dom.window.firebase = creaSdkFinto(zona, { uid: "alice-prova" });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  await import("../desktop/app-v31.js?passo176=" + numero);
  return dom;
}

async function codaDi(zona) {
  let quieto = 0;
  await attendiFinche(() => {
    if (zona.inVolo() === 0) quieto += 10; else quieto = 0;
    return quieto >= 400;
  }, 20000, "la coda delle scritture non si è mai svuotata");
}

const clic = (win, el) => el.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
const vociRegistro = (zona, tipo) => zona.elencoDi("registro").filter((d) => d.dati && d.dati.tipo === tipo);
const rigaCon = (doc, nome) => [...doc.querySelectorAll("#archivio-corpo tr")]
  .find((tr) => String(tr.textContent || "").indexOf(nome) > -1) || null;
const cella = (tr, colonna) => {
  const c = tr ? tr.querySelector('[data-colonna="' + colonna + '"]') : null;
  return c ? String(c.textContent || "").trim() : "";
};
const tasto = (doc, parola) => [...doc.querySelectorAll("#programma-attivo .pr-acts button")]
  .find((b) => (b.textContent || "").trim() === parola) || null;

/* ---------- 176.3 · il programma eliminato sparisce da Archivio e Cambia --- */

test("176.3 eliminato dall'Archivio: sparisce da Archivio e «Cambia», il documento resta in B, il Logbook no", async () => {
  const { zona } = montaPagina(datiDueProgrammi());
  const dom = await carica(zona, 1);
  const doc = dom.window.document;
  await attendiFinche(() => rigaCon(doc, "Blocco primavera") && rigaCon(doc, "Intensita ottobre-dicembre"), 20000, "l'Archivio non si è montato");
  await attendiFinche(() => cella(rigaCon(doc, "Intensita ottobre-dicembre"), "sedute") === "1", 15000,
    "la seduta non è attribuita al programma in uso: " + JSON.stringify(cella(rigaCon(doc, "Intensita ottobre-dicembre"), "sedute")));
  assert.equal(cella(rigaCon(doc, "Intensita ottobre-dicembre"), "ultima"), "26/10/2026");

  const rigaVia = rigaCon(doc, "Blocco primavera");
  const cestinoVia = rigaVia.querySelector(".pg-cestino");
  assert.ok(cestinoVia, "la riga «Blocco primavera» non ha il cestino del programma");
  assert.match(String(cestinoVia.getAttribute("aria-label")), /^elimina il programma «Blocco primavera»/);
  /* Un cestino per riga, e nient'altro in giro. */
  assert.equal(doc.querySelectorAll("#archivio-corpo .pg-cestino").length, 2);
  assert.equal(doc.querySelectorAll(".pr-cestino").length, 0, "c'è ancora un cestino per scheda");

  clic(dom.window, cestinoVia);
  await attendiFinche(() => doc.querySelector(".cestino-programma-modale"), 10000, "la conferma non si è aperta");
  const conferma = doc.querySelector(".cestino-programma-modale");
  const domanda = String((conferma.querySelector(".cestino-domanda") || {}).textContent || "");
  assert.match(domanda, /2 schede/);
  assert.match(domanda, /4 esercizi/);
  assert.match(domanda, /serie programmate/);
  assert.match(String((conferma.querySelector(".cestino-nota") || {}).textContent || ""), /storico e gli scheletri/,
    "la conferma non dice cosa NON si tocca");
  assert.equal(zona.datiDi("programmi", "program-v2-meta-prg-via").eliminato, undefined, "la conferma ha scritto prima del sì");

  clic(dom.window, conferma.querySelector("[data-elimina-programma-conferma]"));
  await attendiFinche(() => Boolean(zona.datiDi("programmi", "program-v2-meta-prg-via").eliminato), 15000,
    "il programma non è stato marcato eliminato");
  await attendiFinche(() => vociRegistro(zona, "elimina-programma").length === 1, 15000, "manca la voce di registro dell'eliminazione");

  /* Il documento è ancora in B — marcato, non cancellato — con le sue schede
   * e la seduta. */
  const documentiProgrammi = zona.elencoDi("programmi").map((d) => d.id);
  assert.ok(documentiProgrammi.indexOf("program-v2-meta-prg-via") > -1, "il documento del programma è stato cancellato: " + JSON.stringify(documentiProgrammi));
  assert.equal(zona.datiDi("schede", "program-v2-sheet-prg-via__C").sheet.exercises.length, 2, "la scheda C ha perso gli esercizi");
  assert.equal(zona.datiDi("schede", "program-v2-sheet-prg-via__D").sheet.name, "Trazione");
  assert.equal(zona.datiDi("sedute", "sed-1").session.exercises.length, 1, "la seduta è stata toccata");

  /* Sparito dall'Archivio; il programma in uso è rimasto, con la sua seduta. */
  await codaDi(zona);
  await attendiFinche(() => !rigaCon(doc, "Blocco primavera"), 15000, "l'Archivio mostra ancora il programma eliminato");
  const rigaUso = rigaCon(doc, "Intensita ottobre-dicembre");
  assert.ok(rigaUso, "l'Archivio ha perso anche il programma in uso");
  assert.match(String(rigaUso.querySelector("td.pg-tdnome").textContent || ""), /\(attiva\)/);
  assert.equal(cella(rigaUso, "sedute"), "1", "il Logbook è stato toccato dall'eliminazione");
  assert.equal(cella(rigaUso, "ultima"), "26/10/2026");

  /* Sparito dal pannello «Cambia» — lo stesso elenco che apre il Confronto. */
  clic(dom.window, tasto(doc, "Cambia"));
  await attendiFinche(() => doc.querySelector(".pr-elenco-programmi"), 10000, "il pannello «Cambia» non si è aperto");
  const testoCambia = String(doc.querySelector(".pr-elenco-programmi").textContent || "");
  assert.ok(testoCambia.indexOf("Blocco primavera") === -1, "«Cambia» elenca ancora il programma eliminato: " + JSON.stringify(testoCambia));
  assert.match(testoCambia, /Intensita ottobre-dicembre/);
  clic(dom.window, tasto(doc, "Cambia"));

  clic(dom.window, tasto(doc, "Confronta con un altro programma"));
  await attendiFinche(() => doc.querySelector(".pr-elenco-programmi"), 10000, "l'elenco del Confronto non si è aperto");
  const testoConfronto = String(doc.querySelector(".pr-elenco-programmi").textContent || "");
  assert.ok(testoConfronto.indexOf("Blocco primavera") === -1, "il Confronto elenca ancora il programma eliminato");
  assert.equal(doc.querySelectorAll(".pr-elenco-programmi [data-guarda]").length, 0,
    "il Confronto offre ancora di aprire un programma: l'unico rimasto è quello in uso");
  clic(dom.window, tasto(doc, "Confronta con un altro programma"));
  await codaDi(zona);
});

/* ---------- 176.4 e 176.5 · il programma in uso (e l'ultimo) non si elimina - */

function datiUnProgramma() {
  const dati = datiDueProgrammi();
  dati.programmi = dati.programmi.filter((p) => p.id !== "program-v2-meta-prg-via");
  dati.schede = dati.schede.filter((s) => s.dati.programId !== "prg-via");
  return dati;
}

test("176.4 il programma in uso non si elimina: cestino spento, nessuna conferma, nessuna scrittura", async () => {
  const { zona } = montaPagina(datiUnProgramma());
  const dom = await carica(zona, 2);
  const doc = dom.window.document;
  await attendiFinche(() => rigaCon(doc, "Intensita ottobre-dicembre"), 20000, "l'Archivio non si è montato");
  const riga = rigaCon(doc, "Intensita ottobre-dicembre");
  const cestino = riga.querySelector(".pg-cestino");
  assert.ok(cestino, "manca il cestino della riga");
  assert.equal(cestino.disabled, true, "il cestino del programma in uso deve essere spento");
  assert.match(String(cestino.getAttribute("title")), /programma in uso/, "il cestino spento non dice perché");
  assert.match(String(cestino.getAttribute("title")), /aprine un altro/, "il cestino spento non dice cosa fare");
  clic(dom.window, cestino);
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(doc.querySelectorAll(".cestino-programma-modale").length, 0, "il cestino spento ha aperto la conferma");
  assert.equal(zona.datiDi("programmi", "program-v2-meta-prg-uso").eliminato, undefined, "il programma in uso è stato marcato");
  assert.equal(vociRegistro(zona, "elimina-programma").length, 0);
  /* La riga c'è ancora, con «(attiva)»: non si resta senza programma. */
  assert.match(String(riga.querySelector("td.pg-tdnome").textContent || ""), /\(attiva\)/);
  await codaDi(zona);
});

test("176.5 l'unico programma (l'attivo) non ha nessun tasto che elimina e non si perde", async () => {
  const { zona } = montaPagina(datiUnProgramma());
  const dom = await carica(zona, 3);
  const doc = dom.window.document;
  await attendiFinche(() => rigaCon(doc, "Intensita ottobre-dicembre"), 20000, "l'Archivio non si è montato");
  const righe = [...doc.querySelectorAll("#archivio-corpo tr")];
  assert.equal(righe.length, 1, "il programma di prova deve essere uno solo");
  const tasti = [...doc.querySelectorAll("#archivio-corpo .pg-cestino")];
  assert.equal(tasti.length, 1, "l'Archivio non ha il cestino della riga");
  assert.equal(tasti[0].disabled, true, "con un programma solo il cestino deve essere spento");
  /* Nessun altro modo di eliminarlo dalla pagina. */
  assert.equal(doc.querySelectorAll("[data-elimina-programma-conferma]").length, 0);
  clic(dom.window, tasti[0]);
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(doc.querySelectorAll(".cestino-programma-modale").length, 0, "si è aperta una conferma per l'unico programma");
  assert.equal(zona.datiDi("programmi", "program-v2-meta-prg-uso").eliminato, undefined);
  await codaDi(zona);
});
