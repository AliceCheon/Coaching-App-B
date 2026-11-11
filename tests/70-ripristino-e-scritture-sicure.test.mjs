/* tests/70-ripristino-e-scritture-sicure.test.mjs — il guasto del 10/11/2026
 * sul sito vero: la voce di registro che non arriva (rete appesa o rifiuto)
 * bloccava la pagina e l'Annulla diceva "niente da annullare".
 *
 *  70.1 una voce con campi undefined arriva su Firestore come null;
 *  70.2 la voce di registro che non risponde: il salvataggio resta valido e
 *       l'avviso torna a chi disegna (la pagina non si ghiaccia);
 *  70.3 la scrittura della scheda che non risponde: rifiuto con il motivo;
 *  70.4 la voce di registro rifiutata sempre: salvataggio valido + avviso;
 *  70.5 annullaVoce riporta ai valori di prima la voce DETTA, non l'ultima;
 *  70.6 annullaVoce rifiuta una voce gia' annullata o assente;
 *  70.7 l'annulla dopo la "ricarica": un editor nuovo legge il registro dal
 *       disco e riporta indietro l'ultima modifica.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { creaEditorSchede } from "../comune/editor-schede-b.js";
import { scriviVoceRegistro, senzaUndefined, leggiZonaB } from "../comune/scritture-b.js";
import { applicaProgressione, applicaProgressioneScheda } from "../comune/modifiche-b.js";
import { PROG } from "../comune/progressioni-b.js";

/* Un db finto con la superficie che l'editor usa, e le rotture richieste. */
function dbFinto(opzioni) {
  const o = opzioni || {};
  const memoria = { schede: {}, registro: {} };
  const scritture = [];
  /* La scheda e' gia' in B: senza il seme, l'editor rilegge e non la trova. */
  memoria.schede["program-v2-sheet-p1__A"] = JSON.parse(JSON.stringify(documento()));
  const pausa = () => new Promise(() => {});
  const db = {
    _memoria: memoria,
    _scritture: scritture,
    collection: (nome) => {
      if (nome !== "bdB_atleti") throw new Error("fuori dalla zona B: " + nome);
      return {
        doc: (uid) => ({
          collection: (sotto) => ({
            doc: (id) => ({
              get: async () => (memoria[sotto][id] != null
                ? { exists: true, data: () => JSON.parse(JSON.stringify(memoria[sotto][id])) }
                : { exists: false, data: () => null }),
              set: async (dati) => {
                scritture.push({ sotto, id });
                if (sotto === "schede" && o.schedaCheNonRisponde) return pausa();
                if (sotto === "registro" && o.registroCheNonRisponde) return pausa();
                if (sotto === "registro" && o.registroRifiutato) throw new Error(o.motivoRegistro || "scrittura rifiutata");
                memoria[sotto][id] = JSON.parse(JSON.stringify(dati || {}));
              }
            }),
            get: async () => ({ docs: Object.keys(memoria[sotto]).map((id) => ({
              id, data: () => JSON.parse(JSON.stringify(memoria[sotto][id]))
            })) })
          })
        })
      }
    }
  };
  return db;
}

const sett = (n, sets, reps) => ({ week: n, sets, reps, rest: { seconds: 90 }, type: "normal", note: "", rir: "2", source: "coach" });
const otto = (s, r) => [sett(1, s, r), sett(2, s, r), sett(3, s, r), sett(4, s, r), sett(5, s, r), sett(6, s, r), sett(7, s, r), sett(8, s, r)];

/* Scheda sintetica con un esercizio con id e uno SENZA.
 * Nel backup di Alice del 04/11/2026 il controllo del passo 32 trova zero righe senza id. */
function documento() {
  return {
    id: "program-v2-sheet-p1__A",
    programId: "p1",
    sheetId: "sh-A",
    versione: 5,
    sheet: {
      id: "sh-A", code: "A", name: "Dorsali",
      exercises: [
        { id: "ex-1", name: "Pulley_basso", muscle: "dorso", order: 0,
          prescription: { sets: 4, reps: "10", recupero: "90 sec", tempo: "2-0-1" },
          progression: { weeks: otto(4, "10") } },
        { name: "Curl_bilanciere", muscle: "bicipiti", order: 1,
          prescription: { sets: 3, reps: "10", recupero: "60 sec" },
          progression: { weeks: otto(3, "10") } }
      ]
    }
  };
}

function editorSu(db, opzioni) {
  return creaEditorSchede(Object.assign({
    db, uid: "alice-prova",
    documenti: [{ id: "program-v2-sheet-p1__A", dati: documento() }],
    fotografia: {},
    scadenzaVoceMs: 60
  }, opzioni || {}));
}

/* La voce che davvero scrive si CERCA, non si indovina: la prima di PROG
 * (Carico lineare) non cambia nessuna cella. */
const Q = { quando: "2026-11-10T20:00:00.000Z", uid: "alice-prova" };
const VOCE_SCRITTE = PROG.map((v) => v[0]).find((id) => {
  const copia = documento();
  const esito = applicaProgressione(copia, { idScheda: "sh-A", idEsercizio: "ex-1", esercizio: "Pulley basso", campo: "progressione", progressione: id }, Q);
  if (!esito.ok) return false;
  return JSON.stringify(esito.dati.sheet.exercises[0].progression.weeks) !== JSON.stringify(otto(4, "10"));
});
if (!VOCE_SCRITTE) { console.error("nessuna voce PROG scrive sulla scheda di prova"); process.exit(1); }
const RICHIESTA = { idScheda: "sh-A", idEsercizio: "ex-1", esercizio: "Pulley basso", campo: "progressione", progressione: VOCE_SCRITTE };

test("70.1 una voce con campi undefined arriva su Firestore come null", async () => {
  const db = dbFinto();
  const voce = { idVoce: "mod-prova", tipo: "modifica-progressione", scheda: "sh-A", prima: [["4", "10"], [undefined, "10"]] };
  await scriviVoceRegistro(db, "alice-prova", voce.idVoce, voce);
  const salvata = (await leggiZonaB(db, "alice-prova", "registro"))[0].dati;
  assert.equal(salvata.prima[1][0], null, "l'undefined e' diventato null");
  assert.equal(salvata.prima[0][0], "4", "il resto non si tocca");
  const pulita = senzaUndefined({ a: undefined, b: [1, undefined, 2] });
  assert.equal(pulita.a, null);
  assert.deepEqual(pulita.b, [1, null, 2]);
});

test("70.2 la voce di registro che non risponde: salvataggio valido e avviso", async () => {
  const db = dbFinto({ registroCheNonRisponde: true });
  const editor = editorSu(db);
  const esito = await editor.modifica(RICHIESTA);
  assert.equal(esito.ok, true, "la scheda e' scritta");
  assert.ok(esito.avvisoRegistro, "l'avviso torna a chi disegna: " + esito.avvisoRegistro);
  assert.match(esito.avvisoRegistro, /nessuna risposta/);
  const scheda = db._memoria.schede["program-v2-sheet-p1__A"];
  assert.notEqual(JSON.stringify(scheda.sheet.exercises[0].progression.weeks), JSON.stringify(otto(4, "10")), "le settimane sono scritte");
});

test("70.3 la scrittura della scheda che non risponde: rifiuto con il motivo", async () => {
  const db = dbFinto({ schedaCheNonRisponde: true });
  const editor = editorSu(db);
  const esito = await editor.modifica(RICHIESTA);
  assert.equal(esito.ok, false);
  assert.match(esito.motivo, /nessuna risposta/);
});

test("70.4 la voce di registro rifiutata sempre: salvataggio valido e avviso", async () => {
  const db = dbFinto({ registroRifiutato: true, motivoRegistro: "permessi negati" });
  const editor = editorSu(db);
  const esito = await editor.modifica(RICHIESTA);
  assert.equal(esito.ok, true);
  assert.match(esito.avvisoRegistro, /permessi negati/);
});

test("70.5 annullaVoce riporta ai valori di prima la voce DETTA, non l'ultima", async () => {
  const db = dbFinto();
  const editor = editorSu(db);
  const prima = await editor.modifica({ idScheda: "sh-A", idEsercizio: "ex-1", esercizio: "Pulley basso", campo: "progressione", progressione: VOCE_SCRITTE });
  assert.equal(prima.ok, true);
  const seconda = await editor.modifica({ idScheda: "sh-A", idEsercizio: "ex-1", esercizio: "Pulley basso", campo: "recupero", valore: "45 sec" });
  assert.equal(seconda.ok, true);
  const idVocePrima = prima.voce.idVoce;
  const ripristino = await editor.annullaVoce(idVocePrima);
  assert.equal(ripristino.ok, true,ripristino.motivo || "ripristino riuscito");
  assert.equal(ripristino.voce.annullaDi, idVocePrima, "la voce nuova cita quella ripristinata");
  const scheda = db._memoria.schede["program-v2-sheet-p1__A"];
  assert.equal(JSON.stringify(scheda.sheet.exercises[0].progression.weeks), JSON.stringify(otto(4, "10")), "le settimane tornano quelle di prima");
  assert.equal(scheda.sheet.exercises[0].prescription.recupero, "45 sec", "il recupero della seconda modifica resta");
  assert.equal(scheda.sheet.exercises[1].progression.weeks[0].sets, 3, "l'altro esercizio non si tocca");
});

test("70.6 annullaVoce rifiuta una voce gia' annullata o assente", async () => {
  const db = dbFinto();
  const editor = editorSu(db);
  const scritta = await editor.modifica(RICHIESTA);
  const prima = await editor.annullaVoce(scritta.voce.idVoce);
  assert.equal(prima.ok, true);
  const diNuovo = await editor.annullaVoce(scritta.voce.idVoce);
  assert.equal(diNuovo.ok, false);
  assert.match(diNuovo.motivo, /gia' stata annullata/);
  const assente = await editor.annullaVoce("mod-non-esiste");
  assert.equal(assente.ok, false);
  assert.match(assente.motivo, /non c'e' la voce/);
});

test("70.7 l'annulla dopo la ricarica: un editor nuovo legge il registro dal disco", async () => {
  const db = dbFinto();
  const primo = editorSu(db);
  const scritta = await primo.modifica({ idScheda: "sh-A", idEsercizio: "ex-1", esercizio: "Pulley basso", campo: "progressione", progressione: VOCE_SCRITTE });
  assert.equal(scritta.ok, true);
  /* "Ricarica": niente memoria di sessione, l'editor nuovo nasce dai documenti
   * letti dal disco, con il registro che c'e' adesso. */
  const schedaSulDisco = db._memoria.schede["program-v2-sheet-p1__A"];
  const registroSulDisco = Object.keys(db._memoria.registro).map((id) => ({ id, dati: db._memoria.registro[id] }));
  const secondo = creaEditorSchede({
    db, uid: "alice-prova",
    documenti: [{ id: "program-v2-sheet-p1__A", dati: schedaSulDisco }],
    fotografia: {},
    scadenzaVoceMs: 60
  });
  const esito = await secondo.annulla();
  assert.equal(esito.ok, true, esito.motivo || "l'annulla trova la voce anche dopo la ricarica");
  const scheda = db._memoria.schede["program-v2-sheet-p1__A"];
  assert.equal(JSON.stringify(scheda.sheet.exercises[0].progression.weeks), JSON.stringify(otto(4, "10")), "i valori di prima sono tornati");
});

/* Passo 32 B: banco sintetico, tutte le righe e tutte le otto settimane. */
function schedaCompleta32() {
  const d = documento();
  d.sheet.exercises = Array.from({ length: 6 }, (_, i) => ({
    id: "riga-" + i, name: "Esercizio di prova " + i,
    progression: { weeks: Array.from({ length: 8 }, (_, k) => sett(k + 1, i + 2, String(k + 6))) }
  }));
  return d;
}
for (const modo of ["assente-prima", "assente-meta", "assente-ultima", "vuoto", "spazi", "null", "non-trovato", "senza-settimane"]) {
  test("70.8 ripristino intero rifiutato senza scritture: " + modo, async () => {
    const iniziale = schedaCompleta32();
    const indice = modo === "assente-prima" ? 0 : modo === "assente-ultima" ? 5 : 3;
    if (modo.startsWith("assente")) delete iniziale.sheet.exercises[indice].id;
    if (modo === "vuoto") iniziale.sheet.exercises[indice].id = "";
    if (modo === "spazi") iniziale.sheet.exercises[indice].id = "   ";
    if (modo === "null") iniziale.sheet.exercises[indice].id = null;
    const applicata = applicaProgressioneScheda(iniziale, { idScheda: "sh-A", progressione: "0" }, Q);
    assert.equal(applicata.ok, true, applicata.motivo);
    const db = dbFinto();
    const sulDisco = JSON.parse(JSON.stringify(applicata.dati));
    if (modo === "non-trovato") sulDisco.sheet.exercises[indice].id = "id-diverso";
    if (modo === "senza-settimane") sulDisco.sheet.exercises[indice].progression = {};
    db._memoria.schede["program-v2-sheet-p1__A"] = sulDisco;
    await scriviVoceRegistro(db, "alice-prova", applicata.voce.idVoce, applicata.voce);
    const prima = JSON.parse(JSON.stringify(db._memoria));
    const quante = db._scritture.length;
    const editor = creaEditorSchede({ db, uid: "alice-prova", documenti: [{ id: "program-v2-sheet-p1__A", dati: sulDisco }], fotografia: {} });
    const esito = await editor.annullaVoce(applicata.voce.idVoce);
    /* Prima tutte le righe/settimane: intercetta il salvataggio parziale. */
    assert.deepEqual(db._memoria.schede, prima.schede, "nessuna riga o settimana deve cambiare sul rifiuto");
    assert.deepEqual(db._memoria.registro, prima.registro, "nessuna voce di falso successo");
    assert.equal(db._scritture.length, quante, "zero tentativi di scrittura, scheda e registro");
    assert.equal(esito.ok, false, "mai dichiarare un ripristino parziale riuscito");
    assert.equal(esito.dati, undefined);
    assert.match(esito.motivo, /non.*ripristinat|non ho scritto niente/);
    if (["assente-prima", "assente-meta", "assente-ultima", "vuoto", "spazi", "null"].includes(modo)) assert.match(esito.motivo, /identificativo/);
  });
}
test("70.9 con identificativi validi ripristina tutte le righe e tutte le settimane dopo rilettura", async () => {
  const iniziale = schedaCompleta32();
  const applicata = applicaProgressioneScheda(iniziale, { idScheda: "sh-A", progressione: "0" }, Q);
  assert.equal(applicata.ok, true);
  const db = dbFinto();
  db._memoria.schede["program-v2-sheet-p1__A"] = applicata.dati;
  await scriviVoceRegistro(db, "alice-prova", applicata.voce.idVoce, applicata.voce);
  const editor = creaEditorSchede({ db, uid: "alice-prova", documenti: [{ id: "program-v2-sheet-p1__A", dati: applicata.dati }], fotografia: {} });
  const esito = await editor.annullaVoce(applicata.voce.idVoce);
  assert.equal(esito.ok, true, esito.motivo);
  const rilette = await leggiZonaB(db, "alice-prova", "schede");
  assert.deepEqual(rilette[0].dati.sheet.exercises, iniziale.sheet.exercises, "tutte le sei righe con tutte le otto settimane e gli altri campi");
});
