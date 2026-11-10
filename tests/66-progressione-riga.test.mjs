/* Passo 20 -- le progressioni del v31, riga per riga (10/11/2026).
 *
 * Alice: il tastino "+" della riga ("inserisci progressione sotto") deve fare
 * quello che fa nel v31, cioe' aprire le progressioni e applicarle alle otto
 * settimane di QUELLA riga. Niente righe nuove, niente campi inventati.
 *
 * Le voci sono copiate alla lettera da `pc/index.html` (r.7252-7298): la prima
 * prova confronta le due liste riga per riga, cosi' una modifica al v31 non
 * passa in silenzio.
 *
 *  66.1 le 21 voci sono identiche a quelle del v31 (id, nome, descrizione);
 *  66.2 ogni voce produce 8 coppie di testo, sempre;
 *  66.3 i numeri sono quelli del v31 (campione con i casi sporchi: cluster,
 *       rest-pause, picco, piramide, carico lineare che non tocca niente);
 *  66.4 si scrive UNA riga sola: le altre restano identiche, versione +1,
 *       marchio di B, e UNA voce di registro con prima e dopo di 8 coppie;
 *  66.5 una voce che non cambia nessuna cella viene rifiutata e non scrive;
 *  66.6 l'Annulla del v31 riporta indietro tutte le 8 settimane in un colpo;
 *  66.7 il "x" marca la riga con deletedAt e si annulla; le altre righe intatte;
 *  66.8 la pagina non ha piu' i due pulsanti spenti: sono collegati.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  PROG, PRG, P, nomeProgressione, baseDaSettimane, coppieRiga, coppieScheda, voceScheda
} from "../comune/progressioni-b.js";
import {
  applicaProgressione, applicaProgressioneScheda, cancellaEsercizio,
  annullaModifica, ultimaAnnullabile
} from "../comune/modifiche-b.js";
import { prescrizione } from "../comune/schede-v2.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const V31 = readFileSync(join(radice, "pc", "index.html"), "utf8");

/* Una settimana come la scrive A: numero, serie, reps, tipo, nota. */
const sett = (n, sets, reps) => ({ week: n, sets: sets, reps: reps, rest: { seconds: 90 }, type: "normal", note: "" });

function documentoDiProva() {
  return {
    id: "program-v2-sheet-p1__A",
    programId: "p1",
    sheetId: "A",
    versione: 3,
    sheet: {
      code: "A",
      name: "Spinta",
      exercises: [
        {
          id: "e1", name: "Panca piana", muscle: "petto", order: 0,
          prescription: { sets: 4, reps: "8-10", rest: { seconds: 90 }, tempo: "2-0-1" },
          progression: { weeks: [sett(1, 4, "8-10"), sett(2, 4, "8-10"), sett(3, 4, "8-10"), sett(4, 4, "8-10"), sett(5, 4, "8-10"), sett(6, 4, "8-10"), sett(7, 4, "8-10"), sett(8, 4, "8-10")] }
        },
        {
          id: "e2", name: "Croci ai cavi", muscle: "petto", order: 1,
          prescription: { sets: 3, reps: "12", rest: { seconds: 60 } },
          progression: { weeks: [sett(1, 3, "12"), sett(2, 3, "12")] }
        }
      ]
    }
  };
}

/* --- 66.1: le voci sono quelle del v31, alla lettera --------------------- */

function vociDalV31() {
  const righe = V31.split("\n");
  const inizio = righe.findIndex((r) => r.indexOf("var PROG=[") !== -1);
  assert.ok(inizio > 0, "nel v31 non ho trovato 'var PROG=['");
  const voci = [];
  for (let i = inizio + 1; i < righe.length; i += 1) {
    const riga = righe[i].trim();
    if (riga.indexOf("];") === 0) break;
    const m = /^\['([^']+)','([^']*)','([^']*)'\]/.exec(riga);
    if (m) voci.push([m[1], m[2], m[3]]);
  }
  return voci;
}

test("66.1 le 21 voci sono identiche a quelle del v31", () => {
  const v31 = vociDalV31();
  assert.equal(v31.length, 21, "il v31 ne ha 21: se sono cambiate, va rifatto il confronto");
  assert.equal(PROG.length, 21);
  for (let i = 0; i < 21; i += 1) {
    assert.equal(PROG[i][0], v31[i][0], "id della voce " + (i + 1));
    assert.equal(PROG[i][1], v31[i][1], "nome della voce " + (i + 1));
    assert.equal(PROG[i][2], v31[i][2], "descrizione della voce " + (i + 1));
  }
});

/* --- 66.2 e 66.3: le otto coppie, e i numeri del v31 ---------------------- */

test("66.2 ogni voce produce otto coppie di testo", () => {
  PROG.forEach((v) => {
    const coppie = coppieRiga(v[0], { s: 4, r: "8-10" });
    assert.equal(coppie.length, 8, v[0] + " deve dare 8 settimane");
    coppie.forEach((c) => {
      assert.equal(c.length, 2);
      assert.equal(typeof c[0], "string");
      assert.equal(typeof c[1], "string");
    });
    /* e la base sporca non deve far saltare niente */
    assert.equal(coppieRiga(v[0], { s: 3, r: "AMRAP" }).length, 8, v[0] + " con base AMRAP");
  });
  assert.equal(coppieRiga("non-esiste", { s: 3, r: "8" }), null);
});

test("66.3 i numeri sono quelli del v31", () => {
  const b = { s: 4, r: "8-10" };
  const riga = (id, coppia) => coppieRiga(id, b)[coppia - 1];
  /* doppia progressione: 8, 9, 10, poi resta al tetto */
  assert.deepEqual(coppieRiga("double-progression", b).map((c) => c[1]), ["8", "9", "10", "10", "10", "10", "10", "10"]);
  /* volume: +1 serie ogni 2 settimane */
  assert.deepEqual(coppieRiga("volume-progression", b).map((c) => c[0]), ["4", "4", "5", "5", "6", "6", "7", "7"]);
  /* scarico in S4 e S8: una serie in meno */
  assert.deepEqual(riga("deload-cycle", 4)[0], "3");
  assert.deepEqual(riga("deload-cycle", 8)[0], "3");
  /* cluster: i valori fissi di r.7145 */
  assert.deepEqual(riga("heavy-cluster", 1), ["3", "\u00d73 /12\""]);
  assert.deepEqual(riga("rest-pause", 1), ["1+3", "8-10 ced +3\u00d73"]);
  /* picco: dalla S7 una serie in meno */
  assert.equal(riga("peak-taper", 6)[0], "4");
  assert.equal(riga("peak-taper", 7)[0], "3");
  /* piramide ascendente: si parte alti e si scende */
  assert.equal(riga("ascending-pyramid", 1)[1], "15");
  assert.equal(riga("ascending-pyramid", 8)[1], "8");
  /* autoregolato: +1 rip ogni 3 settimane */
  assert.equal(riga("rpe-progression", 4)[1], "9");
  /* top set: la serie diventa "2+N" */
  assert.equal(riga("top-set-backoff", 3)[0], "2+4");
  /* le quattro che non toccano le celle restano identiche, come nel v31 */
  ["linear-load", "rir-progression", "density-progression", "micro-loading"].forEach((id) => {
    assert.deepEqual(coppieRiga(id, b), [["4", "8-10"], ["4", "8-10"], ["4", "8-10"], ["4", "8-10"], ["4", "8-10"], ["4", "8-10"], ["4", "8-10"], ["4", "8-10"]], id);
  });
  /* i valori fissi sono quelli dichiarati a r.7145 */
  assert.deepEqual(P, { mini: 3, pausa: 15, drop: 20, blocchi: 3, bloccoRip: 3, pausaBlocco: 12 });
});

test("66.3b la base si legge dalla settimana 1, coi ripieghi del v31", () => {
  assert.deepEqual(baseDaSettimane(prescrizione(documentoDiProva().sheet.exercises[0]).elencoSettimane), { s: 4, r: "8-10" });
  /* senza settimane: serie 3 e reps 8-10, come r.7173-7174 */
  assert.deepEqual(baseDaSettimane([]), { s: 3, r: "8-10" });
  /* serie fuori misura (13) ricade su 3 */
  assert.deepEqual(baseDaSettimane([{ serie: "13", ripetizioni: "5" }]), { s: 3, r: "5" });
});

/* --- 66.4: una riga sola, una voce sola ---------------------------------- */

test("66.4 si scrive una riga sola e le altre non si toccano", () => {
  const dati = documentoDiProva();
  const primaDellAltro = JSON.stringify(dati.sheet.exercises[1]);
  const esito = applicaProgressione(dati, { idScheda: "A", idEsercizio: "e1", campo: "progressione", progressione: "double-progression" }, { quando: "2026-11-10T21:00:00.000Z", uid: "u1" });
  assert.equal(esito.ok, true, esito.motivo);
  const dopo = esito.dati.sheet.exercises[0].progression.weeks;
  assert.equal(dopo.length, 8);
  assert.deepEqual(dopo.map((w) => w.sets), [4, 4, 4, 4, 4, 4, 4, 4]);
  assert.deepEqual(dopo.map((w) => w.reps), ["8", "9", "10", "10", "10", "10", "10", "10"]);
  /* le altre settimane portano ancora il loro riposo e il loro tipo */
  dopo.forEach((w) => { assert.equal(w.type, "normal"); assert.deepEqual(w.rest, { seconds: 90 }); });
  /* l'altra riga e' identica, byte per byte */
  assert.equal(JSON.stringify(esito.dati.sheet.exercises[1]), primaDellAltro);
  /* versione e marchio */
  assert.equal(esito.dati.versione, 4);
  assert.equal(esito.dati.modificatoInB.ultima, "progressione");
  /* una voce sola, con prima e dopo di 8 coppie */
  assert.equal(esito.voce.tipo, "modifica-progressione");
  assert.equal(esito.voce.progressione, "double-progression");
  assert.equal(esito.voce.nomeProgressione, "Doppia progressione");
  assert.equal(esito.voce.prima.length, 8);
  assert.equal(esito.voce.dopo.length, 8);
  assert.deepEqual(esito.voce.prima[0], ["4", "8-10"]);
  assert.deepEqual(esito.voce.dopo[0], ["4", "8"]);
  assert.equal(esito.voce.versionePrima, 3);
  assert.equal(esito.voce.versioneDopo, 4);
});

test("66.4b una voce che non cambia niente viene rifiutata e non scrive", () => {
  const dati = documentoDiProva();
  const esito = applicaProgressione(dati, { idScheda: "A", idEsercizio: "e1", campo: "progressione", progressione: "linear-load" }, { quando: "2026-11-10T21:00:00.000Z", uid: "u1" });
  assert.equal(esito.ok, false);
  assert.match(esito.motivo, /non cambia nessuna cella/);
  assert.equal(esito.dati, undefined);
  /* e una voce inesistente non passa */
  const falso = applicaProgressione(dati, { idScheda: "A", idEsercizio: "e1", campo: "progressione", progressione: "inventata" }, { quando: "2026-11-10T21:00:00.000Z", uid: "u1" });
  assert.equal(falso.ok, false);
});

/* --- 66.6: l'Annulla del v31, in un colpo -------------------------------- */

test("66.6 l'Annulla riporta indietro tutte le otto settimane", () => {
  const dati = documentoDiProva();
  const esito = applicaProgressione(dati, { idScheda: "A", idEsercizio: "e1", campo: "progressione", progressione: "volume-progression" }, { quando: "2026-11-10T21:00:00.000Z", uid: "u1" });
  assert.equal(esito.ok, true, esito.motivo);
  /* l'Annulla la trova fra le voci annullabili */
  const registro = [{ id: esito.voce.idVoce, dati: esito.voce }];
  assert.equal(ultimaAnnullabile(registro).idVoce, esito.voce.idVoce);
  const indietro = annullaModifica(esito.dati, esito.voce, { quando: "2026-11-10T21:01:00.000Z", uid: "u1" });
  assert.equal(indietro.ok, true, indietro.motivo);
  const weeks = indietro.dati.sheet.exercises[0].progression.weeks;
  /* tutti e otto i valori di prima: le serie numeriche, le reps com'erano */
  assert.deepEqual(weeks.map((w) => w.sets), [4, 4, 4, 4, 4, 4, 4, 4]);
  assert.deepEqual(weeks.map((w) => w.reps), ["8-10", "8-10", "8-10", "8-10", "8-10", "8-10", "8-10", "8-10"]);
  /* la voce dell'Annulla cita quella che ha annullato, e non la cancella */
  assert.equal(indietro.voce.tipo, "annulla-modifica");
  assert.equal(indietro.voce.annullaDi, esito.voce.idVoce);
  /* una volta annullata non e' piu' annullabile */
  const dopo = registro.concat([{ id: indietro.voce.idVoce, dati: indietro.voce }]);
  assert.equal(ultimaAnnullabile(dopo), null);
});

/* --- 66.7: il "x" marca e si annulla ------------------------------------- */

test("66.7 il x marca la riga con deletedAt e si annulla", () => {
  const dati = documentoDiProva();
  const esito = cancellaEsercizio(dati, { idScheda: "A", idEsercizio: "e1", campo: "riga" }, { quando: "2026-11-10T21:00:00.000Z", uid: "u1" });
  assert.equal(esito.ok, true, esito.motivo);
  assert.equal(esito.dati.sheet.exercises[0].deletedAt, "2026-11-10T21:00:00.000Z");
  /* l'altra riga resta: il documento non si svuota */
  assert.equal(esito.dati.sheet.exercises.length, 2);
  assert.equal(esito.dati.sheet.exercises[1].deletedAt, undefined);
  /* le settimane restano scritte nel documento: non si buttano via i dati */
  assert.equal(esito.dati.sheet.exercises[0].progression.weeks.length, 8);
  assert.equal(esito.voce.tipo, "cancella-riga");
  assert.equal(esito.dati.versione, 4);

  /* l'Annulla la rimette, e il campo sparisce davvero */
  const registro = [{ id: esito.voce.idVoce, dati: esito.voce }];
  assert.equal(ultimaAnnullabile(registro).tipo, "cancella-riga");
  const indietro = annullaModifica(esito.dati, esito.voce, { quando: "2026-11-10T21:01:00.000Z", uid: "u1" });
  assert.equal(indietro.ok, true, indietro.motivo);
  assert.equal(Object.prototype.hasOwnProperty.call(indietro.dati.sheet.exercises[0], "deletedAt"), false);
  assert.equal(indietro.dati.sheet.exercises[0].name, "Panca piana");
});

/* --- 66.8: la pagina e' collegata ---------------------------------------- */

test("66.8 i due pulsanti della riga non sono piu' spenti", () => {
  const vista = readFileSync(join(radice, "comune", "vista-programma.js"), "utf8");
  assert.match(vista, /pulsanteVivo\(doc, "ab", "\\u2715"/, "il x deve essere un pulsante vero");
  assert.match(vista, /pulsanteVivo\(doc, "ab", "\\uff0b"/, "il + deve essere un pulsante vero");
  assert.match(vista, /campo: "progressione"/, "il + deve chiedere una progressione alla riga");
  assert.match(vista, /campo: "riga"/, "il x deve chiedere la cancellazione della riga");
  /* le liste vengono dal modulo copiato dal v31, non da una copia in pagina */
  assert.match(vista, /from "\.\/progressioni-b\.js"/);
});

/* --- le regole di casa ---------------------------------------------------- */

test("66.9 niente Map e niente Set nei moduli toccati", () => {
  ["progressioni-b.js", "modifiche-b.js", "vista-programma.js", "editor-schede-b.js"].forEach((f) => {
    const t = readFileSync(join(radice, "comune", f), "utf8");
    assert.equal(/new\s+Map\s*\(/.test(t), false, f + " usa new Map");
    assert.equal(/new\s+Set\s*\(/.test(t), false, f + " usa new Set");
  });
});

test("66.10 la scheda intera ha 13 voci e Custom copia la settimana 1", () => {
  assert.equal(PRG.length, 13);
  const custom = voceScheda("5");
  assert.equal(custom.n, "Custom");
  assert.equal(custom.w, null);
  /* Custom: la base della riga su tutte e otto le settimane */
  assert.deepEqual(coppieScheda("5", { s: 4, r: "10-12" }), [["4", "10-12"], ["4", "10-12"], ["4", "10-12"], ["4", "10-12"], ["4", "10-12"], ["4", "10-12"], ["4", "10-12"], ["4", "10-12"]]);
  /* una voce con tabella propria: S1 e S8 di "Attivazione 10-2" */
  assert.deepEqual(coppieScheda("9", { s: 4, r: "10" })[0], ["1", "10"]);
  assert.deepEqual(coppieScheda("9", { s: 4, r: "10" })[7], ["2", "2"]);
});
