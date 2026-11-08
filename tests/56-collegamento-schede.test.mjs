/* tests/56-collegamento-schede.test.mjs — la tabella e la zona B si parlano per id.
 *
 * Il difetto visto da Alice l'8/11/2026: cambiando un numero di serie compariva
 * «scheda non riconosciuta in B: non ho scritto niente».
 *
 * Causa: la tabella passava la LETTERA del box («A») e l'editor la usava come
 * chiave per trovare il documento. In B la lettera non e' unica (una scheda
 * archiviata puo' portare la stessa), quindi la mappa per lettera si svuotava e
 * non restava nessun id da aprire.
 *
 * Qui si prova il legame giusto, con i documenti nel formato VERO della zona B:
 * id con il prefisso e le due parti legate da «__» (comune/schede-v2.js,
 * decodificaId r.86), dentro `sheetId`, `programId` e `sheet`.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { creaEditorSchede, mappaSchede } from "../comune/editor-schede-b.js";
import { prescrizione } from "../comune/schede-v2.js";
import { leggiSchedaB } from "../comune/scritture-b.js";

/* Gli id come li scrive la Copia in B: sono gli id di A, prefisso piu'
 * «pid__sid». La scheda attiva e quella archiviata portano la STESSA lettera:
 * e' esattamente il caso che faceva sbagliare la mappa per lettera. */
const ID_ATTIVA = "program-v2-sheet-p1__s1";
const ID_ARCHIVIATA = "program-v2-archived-p1__s1";
const ID_ESERCIZI = "program-v2-exercise-p1__s1__e1";

/* Il corpo di un documento `program-v2-sheet-…`: i campi che B legge davvero. */
function documento(opzioni) {
  const o = opzioni || {};
  const serie = o.serieS1 == null ? 4 : o.serieS1;
  return {
    programId: "p1",
    sheetId: "s1",
    kind: o.kind || "sheet",
    sheet: {
      id: "s1",
      code: o.code || "A",
      name: "Spinta",
      exercises: [
        {
          id: "e1",
          name: "Panca piana",
          order: 0,
          progression: {
            weeks: [
              { sets: serie, reps: "8" },
              { sets: 3, reps: "6" }
            ]
          }
        }
      ]
    }
  };
}

function esercizioSciolto() {
  return { programId: "p1", sheetId: "s1", exercise: { id: "e1", name: "Panca piana", order: 0 } };
}

function serieDi(dati) {
  return prescrizione(dati.sheet.exercises[0]).elencoSettimane[0].serie;
}

/* Un finto Firestore che conosce SOLO la zona B: se qualcuno legge altrove,
 * la prova lo dice invece di far finta di niente. */
function fintoDb(iniziale) {
  const dati = { radice: null, sotto: {} };
  const partenza = iniziale || {};
  Object.keys(partenza).forEach((k) => { dati.sotto[k] = Object.assign({}, partenza[k]); });
  const letture = [];
  const db = {
    collection(nome) {
      if (nome !== "bdB_atleti") throw new Error("letto fuori dalla zona B: " + nome);
      return {
        doc(uid) {
          return {
            async get() {
              letture.push("radice:" + uid);
              return dati.radice == null
                ? { exists: false, data: () => null }
                : { exists: true, data: () => dati.radice };
            },
            async set(valore) { dati.radice = valore; },
            collection(sotto) {
              const mappa = dati.sotto[sotto] || (dati.sotto[sotto] = {});
              return {
                doc(id) {
                  return {
                    async get() {
                      letture.push(sotto + "/" + id);
                      const d = mappa[id];
                      return d == null
                        ? { exists: false, data: () => null }
                        : { exists: true, data: () => d };
                    },
                    async set(valore) { mappa[id] = valore; }
                  };
                },
                async get() {
                  letture.push(sotto);
                  return { docs: Object.keys(mappa).map((id) => ({ id: id, data: () => mappa[id] })) };
                }
              };
            }
          };
        }
      };
    }
  };
  return { db: db, dati: dati, sotto: dati.sotto, letture: letture };
}

function orologio() {
  return (n) => new Date(Date.UTC(2026, 10, 8, 12, 41, n || 0)).toISOString();
}

/* --- 56.1 --------------------------------------------------------------- */
test("56.1 con l'id della scheda la modifica arriva al documento giusto, non all'archiviata", async () => {
  const attiva = documento({ code: "A", serieS1: 4 });
  const archiviata = documento({ code: "A", serieS1: 9, kind: "archived" });
  const f = fintoDb({
    schede: { [ID_ATTIVA]: attiva, [ID_ARCHIVIATA]: archiviata, [ID_ESERCIZI]: esercizioSciolto() },
    registro: {}
  });
  const editor = creaEditorSchede({
    db: f.db,
    uid: "u1",
    documenti: [
      { id: ID_ATTIVA, dati: attiva },
      { id: ID_ARCHIVIATA, dati: archiviata },
      { id: ID_ESERCIZI, dati: esercizioSciolto() }
    ],
    orologio: orologio()
  });

  const esito = await editor.modifica({
    idScheda: "s1",
    codice: "A",
    idEsercizio: "e1",
    esercizio: "Panca piana",
    campo: "serie",
    settimana: 1,
    valore: "5"
  });
  assert.equal(esito.ok, true, esito.motivo || "");

  const riletta = await leggiSchedaB(f.db, "u1", ID_ATTIVA);
  assert.equal(serieDi(riletta.dati), "5");
  /* l'archiviata non si tocca, anche se porta la lettera A come la attiva */
  assert.equal(serieDi(f.sotto.schede[ID_ARCHIVIATA]), "9");
  /* la voce del registro nomina la scheda con il suo id, non con la lettera */
  assert.equal(esito.voce.scheda, "s1");
});

/* --- 56.2 --------------------------------------------------------------- */
test("56.2 la lettera da sola non basta piu': senza id la modifica si rifiuta", async () => {
  const attiva = documento({ code: "A", serieS1: 4 });
  const f = fintoDb({ schede: { [ID_ATTIVA]: attiva }, registro: {} });
  const editor = creaEditorSchede({
    db: f.db, uid: "u1", documenti: [{ id: ID_ATTIVA, dati: attiva }], orologio: orologio()
  });

  const esito = await editor.modifica({
    codice: "A", idEsercizio: "e1", campo: "serie", settimana: 1, valore: "5"
  });
  assert.equal(esito.ok, false);
  assert.match(esito.motivo, /id/);
  assert.equal(serieDi(f.sotto.schede[ID_ATTIVA]), "4", "il disco non si tocca");
});

/* --- 56.3 --------------------------------------------------------------- */
test("56.3 se la scheda non c'e', il messaggio dice quale id ha cercato", async () => {
  const attiva = documento({ code: "A", serieS1: 4 });
  const f = fintoDb({ schede: { [ID_ATTIVA]: attiva }, registro: {} });
  const editor = creaEditorSchede({
    db: f.db, uid: "u1", documenti: [{ id: ID_ATTIVA, dati: attiva }], orologio: orologio()
  });

  const esito = await editor.modifica({
    idScheda: "s9", codice: "Z", idEsercizio: "e1", campo: "serie", settimana: 1, valore: "5"
  });
  assert.equal(esito.ok, false);
  assert.match(esito.motivo, /s9/, "il messaggio dice l'id cercato");
  assert.match(esito.motivo, /non ho scritto niente/);
  assert.equal(serieDi(f.sotto.schede[ID_ATTIVA]), "4");
});

/* --- 56.4 --------------------------------------------------------------- */
test("56.4 mappaSchede: l'archiviata non ruba l'id della scheda attiva", () => {
  const attiva = documento({ code: "A" });
  const archiviata = documento({ code: "A", kind: "archived" });
  const sciolto = esercizioSciolto();

  const mappa = mappaSchede([
    { id: ID_ATTIVA, dati: attiva },
    { id: ID_ARCHIVIATA, dati: archiviata },
    { id: ID_ESERCIZI, dati: sciolto }
  ]);
  assert.equal(mappa.perId.s1, ID_ATTIVA);
  assert.equal(mappa.doppi.s1, undefined);
  /* i documenti degli esercizi sciolti non sono schede: non entrano nella mappa */
  assert.equal(mappa.perId.e1, undefined);

  /* con la sola archiviata non si apre niente: meglio un rifiuto che la scheda
   * sbagliata */
  const soloArchivio = mappaSchede([{ id: ID_ARCHIVIATA, dati: archiviata }]);
  assert.equal(soloArchivio.perId.s1, undefined);
});

/* --- 56.5 --------------------------------------------------------------- */
test("56.5 il documento e' quello che Programma attivo legge: la ricostruzione trova la scheda", async () => {
  const attiva = documento({ code: "A", serieS1: 4 });
  const f = fintoDb({ schede: { [ID_ATTIVA]: attiva }, registro: {} });
  const editor = creaEditorSchede({
    db: f.db, uid: "u1", documenti: [{ id: ID_ATTIVA, dati: attiva }], orologio: orologio()
  });

  const esito = await editor.modifica({
    idScheda: "s1", idEsercizio: "e1", campo: "ripetizioni", settimana: 1, valore: "10-12"
  });
  assert.equal(esito.ok, true, esito.motivo || "");
  const riletta = await leggiSchedaB(f.db, "u1", ID_ATTIVA);
  assert.equal(prescrizione(riletta.dati.sheet.exercises[0]).elencoSettimane[0].ripetizioni, "10-12");
  /* il legame scritto nel documento resta quello di A */
  assert.equal(riletta.dati.sheetId, "s1");
  assert.equal(riletta.dati.programId, "p1");
});
