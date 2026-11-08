/* tests/55-modifiche-schede.test.mjs — passo 9: le schede si modificano in B.
 *
 * Le prove che Alice ha chiesto, una per nome:
 *  55.1 una serie cambiata resta dopo la rilettura;
 *  55.2 due modifiche di fila -> una scrittura alla volta (mai in parallelo);
 *  55.3 versione diversa -> rifiuto con messaggio, e il disco non cambia;
 *  55.4 modifica in B, poi Copia da A -> la modifica e' ancora li';
 *  55.5 annulla -> torna il valore di prima e il registro cresce, non si svuota;
 *  55.6 il peso della radice si misura e si dichiara (limite 1 MiB);
 *  55.7 la coda di per se' non fa partire due lavori insieme.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  cambiaSerieRipetizioni,
  ultimaAnnullabile,
  protezioneCopia,
  differenzeScheda,
  creaCoda,
  misuraPeso,
  testoProtezione,
  versioneDi,
  eProtetta,
  MARCHIO_B,
  LIMITE_PESO
} from "../comune/modifiche-b.js";
import { prescrizione } from "../comune/schede-v2.js";
import { leggiSchedaB, salvaSchedaConVersione } from "../comune/scritture-b.js";
import { creaEditorSchede, mappaCodici } from "../comune/editor-schede-b.js";

/* --- il documento di una scheda, nella forma che B copia da A ------------- */
function documento(codice, seriePrimaSettimana) {
  return {
    programId: "p1",
    sheetId: "s-" + codice,
    sheet: {
      id: "s1",
      code: codice,
      name: "Spinta",
      exercises: [
        {
          id: "e1",
          name: "Panca piana",
          order: 0,
          progression: {
            weeks: [
              { sets: seriePrimaSettimana, reps: "8" },
              { sets: 3, reps: "6" }
            ]
          }
        },
        { id: "e2", name: "Croci", order: 1, progression: { weeks: [{ sets: 3, reps: "12" }] } }
      ]
    }
  };
}

function serieDi(dati, indiceEsercizio, indiceSettimana) {
  const sett = prescrizione(dati.sheet.exercises[indiceEsercizio]).elencoSettimane;
  return sett[indiceSettimana].serie;
}

/* --- un finto Firestore che conosce SOLO la zona B ----------------------- */
function fintoDb(iniziale) {
  const dati = { radice: null, sotto: {} };
  const partenza = iniziale || {};
  Object.keys(partenza).forEach((k) => { dati.sotto[k] = Object.assign({}, partenza[k]); });
  const letture = [];
  let dentro = 0;
  let massimo = 0;

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
                    async set(valore) {
                      dentro += 1;
                      massimo = Math.max(massimo, dentro);
                      await new Promise((r) => setTimeout(r, 5));
                      mappa[id] = valore;
                      dentro -= 1;
                    }
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
  return {
    db: db,
    dati: dati,
    sotto: dati.sotto,
    letture: letture,
    get massimo() { return massimo; }
  };
}

function orologio() {
  return (n) => new Date(Date.UTC(2026, 10, 8, 12, 31, n || 0)).toISOString();
}

/* --- 55.1 --------------------------------------------------------------- */
test("55.1 una serie cambiata resta dopo la rilettura", async () => {
  const partenza = documento("A", 4);
  const f = fintoDb({ schede: { doc1: partenza }, registro: {} });
  const editor = creaEditorSchede({
    db: f.db, uid: "u1", documenti: [{ id: "doc1", dati: partenza }], orologio: orologio()
  });

  const esito = await editor.modifica({
    idScheda: "s-A", codice: "A", idEsercizio: "e1", esercizio: "Panca piana", campo: "serie", settimana: 1, valore: "6"
  });
  assert.equal(esito.ok, true);

  const riletto = await leggiSchedaB(f.db, "u1", "doc1");
  assert.equal(riletto.esiste, true);
  assert.equal(serieDi(riletto.dati, 0, 0), "6");
  assert.equal(versioneDi(riletto.dati), 1);
  assert.equal(eProtetta(riletto.dati), true);
  assert.equal(riletto.dati[MARCHIO_B].da, "u1");
  /* il secondo esercizio e la seconda settimana non si sono mossi */
  assert.equal(serieDi(riletto.dati, 0, 1), "3");
  assert.equal(serieDi(riletto.dati, 1, 0), "3");
});

/* --- 55.2 --------------------------------------------------------------- */
test("55.2 due modifiche di fila: una scrittura alla volta e tutte e due salvate", async () => {
  const partenza = documento("A", 4);
  const f = fintoDb({ schede: { doc1: partenza }, registro: {} });
  const editor = creaEditorSchede({
    db: f.db, uid: "u1", documenti: [{ id: "doc1", dati: partenza }], orologio: orologio()
  });

  const [uno, due] = await Promise.all([
    editor.modifica({ idScheda: "s-A", codice: "A", idEsercizio: "e1", campo: "serie", settimana: 1, valore: "5" }),
    editor.modifica({ idScheda: "s-A", codice: "A", idEsercizio: "e1", campo: "serie", settimana: 2, valore: "7" })
  ]);
  assert.equal(uno.ok, true);
  assert.equal(due.ok, true);
  /* una sola scrittura in volo per volta */
  assert.equal(f.massimo, 1);

  const riletto = await leggiSchedaB(f.db, "u1", "doc1");
  assert.equal(serieDi(riletto.dati, 0, 0), "5");
  assert.equal(serieDi(riletto.dati, 0, 1), "7");
  assert.equal(Object.keys(f.sotto.registro).length, 2);
});

/* --- 55.3 --------------------------------------------------------------- */
test("55.3 versione diversa: rifiuto con messaggio e disco intatto", async () => {
  const partenza = documento("A", 4);
  const f = fintoDb({ schede: { doc1: partenza }, registro: {} });
  const editor = creaEditorSchede({
    db: f.db, uid: "u1", documenti: [{ id: "doc1", dati: partenza }], orologio: orologio()
  });

  /* qualcun altro ha scritto nel frattempo: la scheda ora e' alla versione 3 */
  f.sotto.schede.doc1 = Object.assign({}, f.sotto.schede.doc1, { versione: 3 });

  const esito = await editor.modifica({
    idScheda: "s-A", codice: "A", idEsercizio: "e1", campo: "serie", settimana: 1, valore: "6"
  });
  assert.equal(esito.ok, false);
  assert.match(esito.motivo, /cambiata nel frattempo/);
  assert.equal(serieDi(f.sotto.schede.doc1, 0, 0), "4");

  /* e la scrittura diretta, con la versione sbagliata, non passa */
  await assert.rejects(
    () => salvaSchedaConVersione(f.db, "u1", "doc1", { versione: 4 }, 0),
    (e) => e.name === "ErroreVersione"
  );
  assert.equal(serieDi(f.sotto.schede.doc1, 0, 0), "4");
});

/* --- 55.4 --------------------------------------------------------------- */
test("55.4 modifica in B, poi Copia da A: la modifica e' ancora li'", async () => {
  const inA = documento("A", 4);
  const inB = cambiaSerieRipetizioni(
    documento("A", 4),
    { idScheda: "doc1", idEsercizio: "e1", campo: "serie", settimana: 1, valore: "6" },
    { quando: "2026-11-08T12:31:05.000Z", uid: "u1" }
  );
  assert.equal(inB.ok, true);

  const voci = [{ famiglia: "schede", id: "doc1", dati: inA }];
  const presenti = [{ id: "doc1", dati: inB.dati }];
  const esito = protezioneCopia(voci, presenti);

  assert.equal(esito.protette.length, 1);
  assert.equal(esito.protette[0].codice, "A");
  assert.equal(esito.protette[0].diversa, true);
  assert.match(esito.protette[0].cambia.join(" "), /S1/);
  assert.equal(esito.daScrivere.length, 0);

  /* la copia scrive SOLO daScrivere: qui non scrive niente */
  const f = fintoDb({ schede: { doc1: inB.dati }, registro: {} });
  esito.daScrivere.forEach((v) => { f.sotto.schede[v.id] = v.dati; });
  assert.equal(serieDi(f.sotto.schede.doc1, 0, 0), "6");

  /* una scheda che in A c'e' e in B non porta il marchio si copia lo stesso */
  const libera = protezioneCopia(
    [{ famiglia: "schede", id: "doc2", dati: inA }],
    [{ id: "doc2", dati: documento("B", 3) }]
  );
  assert.equal(libera.protette.length, 0);
  assert.equal(libera.daScrivere.length, 1);
});

/* --- 55.5 --------------------------------------------------------------- */
test("55.5 annulla: torna il valore di prima e il registro cresce", async () => {
  const partenza = documento("A", 4);
  const f = fintoDb({ schede: { doc1: partenza }, registro: {} });
  const editor = creaEditorSchede({
    db: f.db, uid: "u1", documenti: [{ id: "doc1", dati: partenza }], orologio: orologio()
  });

  await editor.modifica({ idScheda: "s-A", codice: "A", idEsercizio: "e1", campo: "serie", settimana: 1, valore: "6" });
  assert.equal(editor.annullabile, true);

  const esito = await editor.annulla();
  assert.equal(esito.ok, true);

  const riletto = await leggiSchedaB(f.db, "u1", "doc1");
  assert.equal(serieDi(riletto.dati, 0, 0), "4");
  assert.equal(versioneDi(riletto.dati), 2);

  const voci = Object.keys(f.sotto.registro).map((id) => ({ id: id, dati: f.sotto.registro[id] }));
  assert.equal(voci.length, 2, "il registro non si svuota: la modifica resta, si aggiunge l'annulla");
  const annulla = voci.filter((v) => v.dati.tipo === "annulla-modifica");
  assert.equal(annulla.length, 1);
  assert.ok(annulla[0].dati.annullaDi, "l'annulla cita la voce che annulla");
  assert.equal(ultimaAnnullabile(voci), null, "non si annulla due volte la stessa modifica");
  assert.equal(editor.annullabile, false);
});

/* --- 55.6 --------------------------------------------------------------- */
test("55.6 il peso si misura e si dichiara, con il limite di 1 MiB", () => {
  const piccolo = misuraPeso({ creatoIl: "2026-11-08T12:00:00.000Z" }, [{ dati: documento("A", 4) }]);
  assert.ok(piccolo.radice > 0);
  assert.ok(piccolo.scheda > piccolo.radice);
  assert.equal(piccolo.sotto, true);
  assert.equal(piccolo.avviso, "");
  assert.equal(piccolo.limite, LIMITE_PESO);

  const grande = misuraPeso(null, [{ dati: { testo: "a".repeat(LIMITE_PESO + 10) } }]);
  assert.equal(grande.sotto, false);
  assert.match(grande.avviso, /1 MiB/);
});

/* --- 55.7 --------------------------------------------------------------- */
test("55.7 la coda non fa partire due lavori insieme sulla stessa chiave", async () => {
  const coda = creaCoda();
  let dentro = 0;
  let massimo = 0;
  const lavoro = () => coda.esegui("x", async () => {
    dentro += 1;
    massimo = Math.max(massimo, dentro);
    await new Promise((r) => setTimeout(r, 5));
    dentro -= 1;
  });
  await Promise.all([lavoro(), lavoro(), lavoro()]);
  assert.equal(massimo, 1);

  /* chiavi diverse non si aspettano: due schede diverse possono procedere */
  let insieme = 0;
  let picco = 0;
  const due = (k) => coda.esegui(k, async () => {
    insieme += 1;
    picco = Math.max(picco, insieme);
    await new Promise((r) => setTimeout(r, 10));
    insieme -= 1;
  });
  await Promise.all([due("a"), due("b")]);
  assert.equal(picco, 2);
});

/* --- 55.8 --------------------------------------------------------------- */
test("55.8 la frase delle protette non mostra trattini bassi e i codici doppi restano fuori", () => {
  const esito = protezioneCopia(
    [{ famiglia: "schede", id: "doc1", dati: documento("A", 4) }],
    [{ id: "doc1", dati: cambiaSerieRipetizioni(
      documento("A", 4),
      { idScheda: "doc1", idEsercizio: "e1", campo: "serie", settimana: 1, valore: "9" },
      { quando: "2026-11-08T12:31:05.000Z" }
    ).dati }]
  );
  const frase = testoProtezione(esito, () => "8 novembre 2026 alle 12:31");
  assert.equal(frase.indexOf("_"), -1, "niente trattini bassi nel testo a schermo");
  assert.match(frase, /1 scheda protetta/);
  assert.match(frase, /diversa da A/);

  const mappa = mappaCodici([
    { id: "doc1", dati: documento("A", 4) },
    { id: "doc2", dati: documento("A", 5) },
    { id: "doc3", dati: documento("C", 3) }
  ]);
  assert.equal(mappa.A, undefined, "un codice che compare due volte non si sceglie a caso");
  assert.equal(mappa.C, "doc3", "un codice solo si ritrova");
});
