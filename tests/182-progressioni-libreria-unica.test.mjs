/* tests/182 — passo 31 (28/11/2026): le progressioni custom diventano una
 * libreria sola, visibile da ogni programma.
 *
 * Alice, il 28/11/2026, ha pubblicato la regola Firestore che apre
 * `bdB_atleti/{uid}/progressioni`. Prima una custom viveva DENTRO il documento
 * del programma in cui era stata scritta (limite dichiarato al passo 21), e
 * aprendo un altro programma non si vedeva. Le quattro pretese di questo
 * passo, sulla pagina vera con il finto Firestore:
 *
 *  1. una custom salvata dalla libreria si vede da un SECONDO programma (stessa
 *     utente, altro programma attivo);
 *  2. la migrazione copia le custom che stanno dentro i programmi e, al secondo
 *     giro, non ne crea una seconda;
 *  3. eliminare toglie il documento dalla raccolta e la voce dalla libreria;
 *  4. le 21 formule della riga e le 13 della scheda restano intatte.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";

import { creaZonaBFinta, creaSdkFinto } from "./finti/zona-b-finta.mjs";
import { attendiFinche } from "./finti/attesa.mjs";
import { PROG, PRG } from "../comune/progressioni-b.js";
import { elencoLibreria, pianoAnnulla } from "../comune/progressioni-libreria-b.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const HTML = readFileSync(join(radice, "desktop", "index.html"), "utf8");
const QUANTE_FORMULE = PROG.length + PRG.length;

/* ---------- la zona di prova: due programmi, una scheda, una seduta -------- */

const settimana = (n) => ({ week: n, sets: 4, reps: "10", rest: { seconds: 90 }, type: "normal", note: "", source: "manual" });
const otto = () => Array.from({ length: 8 }, (_, i) => settimana(i + 1));
const esercizio = (id, nome) => ({ id: id, name: nome, muscle: "dorsali", prescription: { rest: "1'" }, progression: { weeks: otto() } });
const coppie = (serie, reps) => Array.from({ length: 8 }, () => [String(serie), String(reps)]);
const settimaneCustom = (serie, reps) => coppie(serie, reps).map((c) => ({ serie: c[0], ripetizioni: c[1] }));

const META = (id, nome, stato, dentro) => Object.assign({
  id: id, name: nome, status: stato, phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, description: "", message: "",
  rotation: ["A"], createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
}, dentro || {});

const ID_META_A = "program-v2-meta-prg-lib-a";
const ID_META_B = "program-v2-meta-prg-lib-b";

/* La zona: `custom` sono le custom ancora dentro il programma A (vecchia
 * posizione), `libreria` sono i documenti gia' nella raccolta. */
function datiZona(opzioni) {
  const o = opzioni || {};
  const metaA = META("prg-lib-a", "Programma Alfa", o.statoA || "active",
    o.custom && o.custom.length ? { progressioniCustom: o.custom } : {});
  const metaB = META("prg-lib-b", "Programma Beta", o.statoB || "draft",
    o.customB && o.customB.length ? { progressioniCustom: o.customB } : {});
  return {
    radice: { quando: "2026-11-05T09:00:00.000Z", fonte: "prova 182" },
    programmi: [
      { id: ID_META_A, dati: { programMeta: metaA } },
      { id: ID_META_B, dati: { programMeta: metaB } }
    ],
    schede: [{
      id: "program-v2-sheet-prg-lib-a__sh-A",
      dati: {
        programId: "prg-lib-a", sheetId: "sh-A", kind: "sheet", versione: 1,
        sheet: { id: "sh-A", code: "A", name: "Dorsali", updatedAt: "2026-11-02T18:12:00.000Z", exercises: [esercizio("ex-1", "Trazioni assistite")] }
      }
    }],
    sedute: [{ id: "sed-1", dati: { session: { id: "sed-1", dateInput: "2026-10-26", sessionCode: "A", exercises: [{ name: "Trazioni assistite", kg: 40 }] } } }],
    esclusioni: [],
    registro: [],
    scheletri: [],
    progressioni: (o.libreria || []).map((v) => ({
      id: v.id,
      dati: {
        tipo: "progressione", id: v.id, nome: v.nome, da: v.da || "",
        settimane: v.settimane || settimaneCustom(4, "8-10"),
        creatoIl: "2026-11-20T10:00:00.000Z", versione: v.versione == null ? 1 : v.versione
      }
    }))
  };
}

/* Un caricamento della pagina come lo fa il browser. */
async function carica(zona, numero) {
  const vc = new VirtualConsole();
  vc.on("jsdomError", () => {});
  const dom = new JSDOM(HTML, { runScripts: "outside-only", virtualConsole: vc });
  dom.window.BD_B = { nomeAppAuth: "B", prefissoChiavi: "bd-b.prova" + numero + ".", firebase: { projectId: "prova", apiKey: "prova", appId: "prova:prova" } };
  dom.window.firebase = creaSdkFinto(zona, { uid: "alice-prova" });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  await import("../desktop/app-v31.js?libreria=" + numero);
  return dom;
}

const clic = (win, el) => { el.dispatchEvent(new win.MouseEvent("click", { bubbles: true })); };

async function coda(zona) {
  let quieto = 0;
  await attendiFinche(() => {
    if (zona.inVolo() === 0) quieto += 10; else quieto = 0;
    return quieto >= 300;
  }, 20000, "la coda delle scritture non si è mai svuotata");
}

const carte = (doc) => Array.from(doc.querySelectorAll("#pag-progressioni .pr-card"));
const nomiCarte = (doc) => carte(doc).map((c) => String((c.querySelector("h3") || {}).textContent || "").replace(/\s+/g, " ").trim());
const cartaDi = (doc, nome) => carte(doc).filter((c) => String(c.querySelector("h3").textContent || "").indexOf(nome) !== -1)[0] || null;
const tastoIn = (dentro, parola) => Array.from(dentro.querySelectorAll("button"))
  .filter((b) => String(b.textContent || "").trim() === parola)[0] || null;

async function paginaPronta(doc, quante) {
  await attendiFinche(() => carte(doc).length >= (quante == null ? QUANTE_FORMULE : quante), 20000,
    "la pagina Progressioni non ha montato le sue carte (ne attendo " + (quante == null ? QUANTE_FORMULE : quante) + ")");
}

/* La pagina si monta vuota prima dell'accesso: i tasti che scrivono sono
 * spenti finché la zona B non è letta. Qui si aspetta che siano accesi. */
const creaDellaPagina = (doc) => tastoIn(doc.getElementById("pag-progressioni"), "\uff0b Crea progressione custom");
async function scritturaPronta(doc) {
  await attendiFinche(() => {
    const b = creaDellaPagina(doc);
    return Boolean(b) && b.disabled === false;
  }, 20000, "i tasti della libreria sono rimasti spenti: la zona B non è stata letta");
}

/* ======================================================================== */
/* 1. una custom salvata dalla libreria si vede da un secondo programma      */
/* ======================================================================== */

test("182.1 una custom salvata dalla libreria si vede da un secondo programma", async () => {
  const zona = creaZonaBFinta({ dati: datiZona(), latenzeLettura: [25, 15, 40], latenzaScrittura: 5 });
  const dom = await carica(zona, 1);
  const doc = dom.window.document;
  await paginaPronta(doc);
  assert.equal(carte(doc).length, QUANTE_FORMULE, "senza custom la libreria ha solo le formule");

  /* «＋ Crea progressione custom» dalla pagina (non dal pannello). */
  await scritturaPronta(doc);
  const crea = creaDellaPagina(doc);
  assert.ok(crea, "manca il tasto per creare una progressione custom");
  assert.equal(crea.disabled, false, "col programma aperto il tasto è acceso");
  clic(dom.window, crea);
  const modale = doc.querySelector(".prog-modal");
  assert.ok(modale, "non si è aperta la finestra della nuova progressione");
  modale.querySelector("input.prog-in").value = "Panca pesante";
  modale.querySelector('input[data-settimana="1"][data-campo="serie"]').value = "5";
  modale.querySelector('input[data-settimana="1"][data-campo="ripetizioni"]').value = "6";
  tastoIn(modale, "Aggiorna").click();

  await attendiFinche(() => zona.elencoDi("progressioni").length === 1, 20000, "la custom non è finita nella raccolta");
  await coda(zona);
  const salvata = zona.elencoDi("progressioni")[0];
  assert.equal(salvata.dati.nome, "Panca pesante", "il nome salvato non è quello");
  assert.equal(salvata.dati.tipo, "progressione", "il documento della raccolta ha il suo tipo");
  assert.equal(salvata.dati.versione, 1, "la prima scrittura parte da versione 1");
  assert.equal(salvata.dati.settimane[0].serie, "5", "S1 serie salvata");
  assert.equal(salvata.dati.settimane[0].ripetizioni, "6", "S1 ripetizioni salvate");
  assert.equal(String(salvata.dati.modificatoInB && salvata.dati.modificatoInB.ultima), "progressione", "manca il marchio di B");
  assert.ok(zona.elencoDi("registro").some((v) => v.dati && v.dati.tipo === "progressioni-libreria"),
    "manca la voce di registro della scrittura");

  await attendiFinche(() => cartaDi(doc, "Panca pesante"), 20000, "la custom non compare nella libreria della pagina");
  assert.equal(carte(doc).length, QUANTE_FORMULE + 1, "la libreria conta anche la custom");

  /* Il secondo programma: Beta diventa attivo, Alfa va in archivio. La pagina
   * rilegge dallo stesso finto Firestore, come farebbe Alice aprendo l'altro
   * programma. */
  zona.scrivi("programmi", ID_META_A, { programMeta: META("prg-lib-a", "Programma Alfa", "archived",
    { progressioniCustom: [] }) });
  zona.scrivi("programmi", ID_META_B, { programMeta: META("prg-lib-b", "Programma Beta", "active") });
  globalThis.BD_RICARICA("secondo programma");
  await attendiFinche(() => {
    const nome = doc.getElementById("nomeProgrammaAttivo");
    return nome && /Programma Beta/.test(String(nome.textContent || ""));
  }, 20000, "la pagina non è passata al programma Beta");
  await attendiFinche(() => cartaDi(doc, "Panca pesante"), 20000, "la custom non si vede dal secondo programma");
  assert.equal(carte(doc).length, QUANTE_FORMULE + 1, "dal secondo programma la libreria è la stessa");
});

test("182.1b «Annulla» toglie dalla raccolta la custom appena creata", async () => {
  const zona = creaZonaBFinta({ dati: datiZona(), latenzeLettura: [25, 15, 40], latenzaScrittura: 5 });
  const dom = await carica(zona, 6);
  const doc = dom.window.document;
  await paginaPronta(doc);
  await scritturaPronta(doc);
  const crea = creaDellaPagina(doc);
  clic(dom.window, crea);
  const modale = doc.querySelector(".prog-modal");
  modale.querySelector("input.prog-in").value = "Da annullare";
  modale.querySelector('input[data-settimana="1"][data-campo="serie"]').value = "4";
  modale.querySelector('input[data-settimana="1"][data-campo="ripetizioni"]').value = "8";
  tastoIn(modale, "Aggiorna").click();
  await attendiFinche(() => zona.elencoDi("progressioni").length === 1, 20000, "la custom non è stata creata");
  await coda(zona);
  await attendiFinche(() => {
    const b = doc.querySelector("#programma-attivo button.pg-undo");
    return b && b.disabled === false;
  }, 20000, "il tasto Annulla è rimasto spento dopo la scrittura");
  const annulla = doc.querySelector("#programma-attivo button.pg-undo");
  clic(dom.window, annulla);
  await attendiFinche(() => zona.elencoDi("progressioni").length === 0, 20000, "l'Annulla non ha tolto la custom dalla raccolta");
  await coda(zona);
  await attendiFinche(() => !cartaDi(doc, "Da annullare"), 20000, "la custom annullata è ancora nella libreria");
  const voci = zona.elencoDi("registro").filter((v) => v.dati && v.dati.tipo === "annulla-modifica" && v.dati.campo === "progressioni-libreria");
  assert.equal(voci.length, 1, "manca la voce di registro dell'Annulla");
});

/* ======================================================================== */
/* 2. la migrazione copia una volta sola                                     */
/* ======================================================================== */

test("182.2 la migrazione copia le custom dei programmi e al secondo giro non duplica", async () => {
  const zona = creaZonaBFinta({
    dati: datiZona({
      custom: [
        { id: "pc-1", nome: "Mia doppia", da: "double-progression", settimane: settimaneCustom(3, "8-10") },
        { id: "pc-2", nome: "Mia volume", da: "volume-progression", settimane: settimaneCustom(4, "10") }
      ]
    }),
    latenzeLettura: [25, 15, 40], latenzaScrittura: 5
  });
  const dom = await carica(zona, 2);
  const doc = dom.window.document;
  await paginaPronta(doc, QUANTE_FORMULE + 2);

  await attendiFinche(() => zona.elencoDi("progressioni").length === 2, 20000, "la migrazione non ha copiato le due custom");
  await coda(zona);
  const nomi = zona.elencoDi("progressioni").map((d) => d.dati.nome).sort();
  assert.deepEqual(nomi, ["Mia doppia", "Mia volume"], "nomi copiati: " + JSON.stringify(nomi));
  const alfa = zona.datiDi("programmi", ID_META_A);
  assert.equal(alfa.programMeta.progressioniCustom, undefined, "il campo vecchio deve sparire dal programma copiato");

  /* La stessa pagina riletta: la libreria ha ancora due custom, una per nome. */
  await attendiFinche(() => cartaDi(doc, "Mia doppia") && cartaDi(doc, "Mia volume"), 20000, "la libreria non mostra le due custom migrate");

  /* Il secondo giro: una pagina nuova sullo stesso Firestore. */
  const dom2 = await carica(zona, 3);
  const doc2 = dom2.window.document;
  await paginaPronta(doc2, QUANTE_FORMULE + 2);
  await coda(zona);
  assert.equal(zona.elencoDi("progressioni").length, 2, "il secondo giro ha creato un doppione");
  const doppie = nomiCarte(doc2).filter((n) => /Mia doppia|Mia volume/.test(n));
  assert.equal(doppie.length, 2, "la libreria mostra la stessa custom due volte: " + JSON.stringify(nomiCarte(doc2)));
});

test("182.2b la stessa custom in due programmi si copia una volta sola e sparisce da tutti e due", async () => {
  const stessa = () => ({ id: "pc-1", nome: "Uguale nei due", da: "volume-progression", settimane: settimaneCustom(4, "10") });
  const zona = creaZonaBFinta({
    dati: datiZona({ custom: [stessa()], customB: [Object.assign(stessa(), { id: "pc-9" })] }),
    latenzeLettura: [25, 15, 40], latenzaScrittura: 5
  });
  const dom = await carica(zona, 5);
  const doc = dom.window.document;
  await paginaPronta(doc, QUANTE_FORMULE + 1);
  await attendiFinche(() => zona.elencoDi("progressioni").length === 1, 20000, "la stessa custom è stata copiata due volte");
  await coda(zona);
  assert.equal(zona.elencoDi("progressioni").length, 1, "una copy per contenuto basta");
  const a = zona.datiDi("programmi", ID_META_A);
  const b = zona.datiDi("programmi", ID_META_B);
  assert.equal(a.programMeta.progressioniCustom, undefined, "il primo programma deve perdere il campo vecchio");
  assert.equal(b.programMeta.progressioniCustom, undefined, "anche il secondo: era la stessa custom");
  const carteUguali = nomiCarte(doc).filter((n) => /Uguale nei due/.test(n));
  assert.equal(carteUguali.length, 1, "la libreria mostra la stessa custom due volte: " + JSON.stringify(nomiCarte(doc)));
});

/* ======================================================================== */
/* 3. eliminare toglie dalla raccolta e dalla libreria                       */
/* ======================================================================== */

test("182.3 eliminare toglie la custom dalla raccolta e dalla libreria", async () => {
  const zona = creaZonaBFinta({
    dati: datiZona({
      libreria: [
        { id: "pm-uno", nome: "Da eliminare", settimane: settimaneCustom(4, "8-10") },
        { id: "pm-due", nome: "Da tenere", settimane: settimaneCustom(3, "12") }
      ]
    }),
    latenzeLettura: [25, 15, 40], latenzaScrittura: 5
  });
  const dom = await carica(zona, 4);
  const doc = dom.window.document;
  await paginaPronta(doc, QUANTE_FORMULE + 2);

  await scritturaPronta(doc);
  const carta = cartaDi(doc, "Da eliminare");
  assert.ok(carta, "manca la custom da eliminare");
  const elimina = carta.querySelector("[data-lib-elimina]");
  assert.ok(elimina, "manca il tasto Elimina");
  clic(dom.window, elimina);
  const conferma = doc.querySelector(".prog-modal");
  assert.ok(conferma, "Elimina non chiede conferma");
  tastoIn(conferma, "Elimina").click();

  await attendiFinche(() => zona.elencoDi("progressioni").length === 1, 20000, "la custom non è stata tolta dalla raccolta");
  await coda(zona);
  assert.equal(zona.elencoDi("progressioni")[0].dati.nome, "Da tenere", "è sparita la custom sbagliata");
  await attendiFinche(() => !cartaDi(doc, "Da eliminare"), 20000, "la custom eliminata è ancora nella libreria");
  assert.ok(cartaDi(doc, "Da tenere"), "l'altra custom deve restare");
  assert.equal(carte(doc).length, QUANTE_FORMULE + 1, "le formule non si toccano con l'eliminazione");
});

/* ======================================================================== */
/* 4. le formule restano intatte                                            */
/* ======================================================================== */

test("182.4 le formule della riga e della scheda restano intatte", () => {
  assert.equal(PROG.length, 21, "le 21 formule della riga");
  assert.equal(PRG.length, 13, "le 13 formule della scheda");
  assert.equal(QUANTE_FORMULE, 34, "senza custom la libreria ha 34 voci");
});

/* ======================================================================== */
/* 5. l'Annulla riporta la raccolta com'era (una eliminazione e una modifica) */
/* ======================================================================== */

test("182.5 l'Annulla rimette in raccolta la custom eliminata, con la sua versione", () => {
  const voce = {
    id: "pm-uno", nome: "Mia", da: "volume-progression",
    settimane: settimaneCustom(4, "8-10"), creatoIl: "2026-11-20T10:00:00.000Z"
  };
  const documento = {
    id: "pm-uno",
    dati: Object.assign({ tipo: "progressione", versione: 3 }, voce)
  };
  const elenco = elencoLibreria([documento]);
  /* La voce del registro di un'eliminazione porta l'elenco di prima: qui la
   * stessa forma, cosi' il piano e' quello vero. */
  const pianifica = pianoAnnulla([voce], [], { quando: "2026-11-28T10:00:00.000Z", uid: "u1" });
  assert.equal(pianifica.vuoto, false, "l'Annulla deve avere qualcosa da rimettere");
  assert.equal(pianifica.crea.length, 1, "la custom eliminata si ricrea");
  assert.equal(pianifica.crea[0].id, "pm-uno");
  assert.equal(pianifica.crea[0].versioneAttesa, 0, "la raccolta non la ha piu': si riparte da zero");
  assert.equal(pianifica.crea[0].documento.nome, "Mia");
  assert.equal(pianifica.crea[0].documento.settimane[0].serie, "4");
  assert.equal(pianifica.elimina.length, 0);
  assert.equal(elenco.length, 1, "il piano non tocca l'elenco letto");
});
