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
import { applicaProgressione } from "../comune/modifiche-b.js";
import { PROG } from "../comune/progressioni-b.js";

/* Un db finto con la superficie che l'editor usa, e le rotture richieste. */
function dbFinto(opzioni) {
  const o = opzioni || {};
  const memoria = { schede: {}, registro: {} };
  /* La scheda e' gia' in B: senza il seme, l'editor rilegge e non la trova. */
  memoria.schede["program-v2-sheet-p1__A"] = JSON.parse(JSON.stringify(documento()));
  const pausa = () => new Promise(() => {});
  const db = {
    _memoria: memoria,
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
                if (sotto === "schede" && o.schedaCheNonRisponde) return pausa();
                if (sotto === "registro" && o.registroCheNonRisponde) return pausa();
                if (sotto === "registro" && o.registroRifiutato) throw new Error(o.motivoRegistro || "scrittura rifiutata");
                controlla(dati);
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

/* Una scheda con un esercizio con id e uno SENZA (come i dati veri di Alice:
 * "Curl_bilanciere" non porta id). */
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


function controlla(v) {
  if (v === undefined) throw new Error('undefined');
  if (Array.isArray(v)) { for(const x of v) { if(Array.isArray(x)) throw new Error('Nested arrays are not supported'); controlla(x); } }
  else if(v && typeof v === 'object') Object.values(v).forEach(controlla);
}

test('75.1 il finto rifiuta davvero gli array annidati', () => {
  assert.throws(() => controlla({prima: [['1','10-x']]}), /Nested arrays/);
});

test('75.2 progressione esatta di Alice: scheda, registro, rilettura e Annulla dopo ricarica', async () => {
  const db=dbFinto(); const originale=documento(); const editor=editorSu(db);
  const r=await editor.modifica({...RICHIESTA, progressione:'intensity-test12-wave'});
  assert.equal(r.ok,true,r.motivo); assert.equal(r.avvisoRegistro,null,'registro scritto senza avvisi');
  const scritto=db._memoria.schede['program-v2-sheet-p1__A'];
  const settimane=scritto.sheet.exercises[0].progression.weeks;
  assert.deepEqual(settimane.map(w=>[String(w.sets),w.reps]), [['1','test 12rm → 8'],...Array.from({length:7},()=>['1','10-8-x'])]);
  assert.deepEqual(scritto.sheet.exercises[1],originale.sheet.exercises[1],'altro esercizio intatto');
  const registro=await leggiZonaB(db,'alice-prova','registro');
  assert.deepEqual(registro[0].dati,r.voce,'il registro riletto conserva tutti i valori prima/dopo');
  const nuovo=editorSu(db,{documenti:[{id:'program-v2-sheet-p1__A',dati:scritto}]});
  const annulla=await nuovo.annulla();
  assert.equal(annulla.ok,true,annulla.motivo);assert.equal(annulla.avvisoRegistro,null);
  assert.deepEqual(db._memoria.schede['program-v2-sheet-p1__A'].sheet.exercises,originale.sheet.exercises);
  assert.equal(Object.keys(db._memoria.registro).length,2);
});

test('75.3 coppie anche dentro righe, undefined e vecchie voci: andata e ritorno', async () => {
  const db=dbFinto();const v={idVoce:'prova',righe:[{prima:[['2','10-x'],[undefined,'Test 12rm, poi 1x8']],dopo:[['3','10-8-x']]}]};
  await scriviVoceRegistro(db,'alice-prova','prova',v);
  const r=await leggiZonaB(db,'alice-prova','registro');
  assert.deepEqual(r[0].dati,senzaUndefined(v));
  db._memoria.registro.vecchia={idVoce:'vecchia',prima:[['1','8']]};
  assert.deepEqual((await leggiZonaB(db,'alice-prova','registro')).find(d=>d.id==='vecchia').dati,db._memoria.registro.vecchia);
});
