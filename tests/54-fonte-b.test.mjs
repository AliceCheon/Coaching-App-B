/* tests/54-fonte-b.test.mjs — passo 8: le tre schermate leggono dalla zona B.
 *
 * Le prove principali sono due:
 *  - i numeri del Logbook NON cambiano passando dalla fonte A alla fonte B:
 *    126 sedute senza esclusioni, 121 con le cinque esclusioni di Alice;
 *  - la pagina non legge mai da `barbellDivaAccounts`: qui il finto Firestore
 *    lancia se qualcuno prova, e le letture registrate devono restare tutte
 *    dentro `bdB_atleti`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { leggiZonaBCompleta, programmiDaDocumenti, seduteDaDocumenti, statoZonaB } from "../comune/lettura-b.js";
import { seduteLogbook } from "../comune/logbook.js";
import { applicaEsclusioni } from "../comune/esclusioni.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");

/* Finto Firestore che conosce SOLO la zona B. Ogni lettura da A lancia: se la
 * pagina ci ripiegasse, la prova non passerebbe per caso. */
function fintoZonaB(zone) {
  const dati = zone || {};
  const letture = [];
  const db = {
    collection(nome) {
      if (nome !== "bdB_atleti") {
        letture.push("A:" + nome);
        throw new Error("letto da A: " + nome);
      }
      return {
        doc: (uid) => ({
          get: async () => {
            letture.push("fotografia:" + uid);
            const f = dati.fotografia;
            return f == null ? { exists: false, data: () => null } : { exists: true, data: () => f };
          },
          collection: (sotto) => ({
            get: async () => {
              letture.push(sotto);
              return { docs: (dati[sotto] || []).map((d) => ({ id: d.id, data: () => d.dati })) };
            }
          })
        })
      };
    }
  };
  return { db, letture };
}

function seduta(id, i, extra) {
  return Object.assign({
    id,
    dateInput: "2026-01-" + String((i % 28) + 1).padStart(2, "0"),
    sessionCode: "D" + i,
    sheetId: "D" + i,
    source: "Logbook",
    status: "completed",
    exercises: [{ name: "Esercizio " + i, completedSets: [{ reps: 8, weight: 40 + i }] }]
  }, extra || {});
}

/* La zona B com'e' dopo la copia: 129 documenti di seduta di cui 2 cancellati
 * e 1 doppione di contenuto (il caso vero che faceva 127 contro 126), piu' un
 * programma e una scheda. */
function zonaPiena() {
  const sedute = [];
  for (let i = 1; i <= 126; i += 1) sedute.push({ id: "sed-" + i, dati: { session: seduta("s" + i, i) } });
  sedute.push({ id: "sed-127", dati: { session: seduta("s127", 127, { deletedAt: "2026-10-01T10:00:00.000Z" }) } });
  sedute.push({ id: "sed-128", dati: { session: seduta("s128", 128, { deletedAt: "2026-10-02T10:00:00.000Z" }) } });
  /* il doppione: id diverso, contenuto identico alla s1 (data, scheda, esercizi, fonte) */
  sedute.push({
    id: "sed-129",
    dati: { session: seduta("s129", 129, { dateInput: "2026-01-02", sessionCode: "D1", sheetId: "D1", exercises: [{ name: "Esercizio 1", completedSets: [{ reps: 8, weight: 41 }] }] }) }
  });

  return {
    fotografia: { tipo: "fotografia-copia", creatoIl: "2026-11-06T18:00:00.000Z", copiati: { programmi: 1, schede: 1, esercizi: 0, sedute: 129 } },
    programmi: [{
      id: "program-v2-meta-p1",
      dati: { programId: "p1", programMeta: { id: "p1", name: "Programma di prova", status: "active", updatedAt: "2026-10-01T09:00:00.000Z" } }
    }],
    schede: [{
      id: "program-v2-sheet-p1__s1",
      dati: { programId: "p1", sheetId: "s1", sheet: { id: "s1", code: "D1", name: "Scheda di prova", exercises: [{ name: "Esercizio 1", sets: 4, reps: 8 }] } }
    }],
    esercizi: [],
    sedute,
    esclusioni: []
  };
}

const CINQUE_ESCLUSIONI = ["s2", "s3", "s4", "s5", "s6"].map((id) => ({
  id,
  dati: { idSeduta: id, motivo: "sbagliata", quando: "2026-11-07T10:00:00.000Z" }
}));

test("54.1 le tre schermate leggono solo da bdB_atleti, mai da A", async () => {
  const f = fintoZonaB(zonaPiena());
  const zona = await leggiZonaBCompleta(f.db, "uid-di-prova");
  assert.equal(zona.esito.completa, true, "la zona di prova deve risultare completa");
  assert.ok(f.letture.indexOf("A:barbellDivaAccounts") === -1, "nessuna lettura dai dati di A");
  assert.deepEqual(f.letture.slice().sort(), ["esclusioni", "fotografia:uid-di-prova", "programmi", "schede", "sedute"]);
});

test("54.2 le sedute si leggono dal campo session, con i due scarti dichiarati", async () => {
  const f = fintoZonaB(zonaPiena());
  const zona = await leggiZonaBCompleta(f.db, "uid-di-prova");
  assert.equal(zona.sedute.documenti, 129);
  assert.equal(zona.sedute.sedute.length, 129);
  assert.equal(zona.sedute.senzaId, 0);
  assert.equal(zona.sedute.duplicati, 0);
});

test("54.3 il Logbook dalla zona B da' 126 sedute, senza esclusioni", async () => {
  const f = fintoZonaB(zonaPiena());
  const zona = await leggiZonaBCompleta(f.db, "uid-di-prova");
  const pulite = applicaEsclusioni(zona.sedute.sedute, zona.esclusioni);
  const lb = seduteLogbook(pulite.sedute, { infoSedute: zona.sedute });
  assert.equal(lb.sedute.length, 126, "le stesse 126 che mostra A");
  assert.equal(lb.dichiarazioni.cancellate, 2);
  assert.equal(lb.dichiarazioni.doppioniContenuto, 1);
  assert.equal(lb.dichiarazioni.escluseDaAlice, 0);
});

test("54.4 con le cinque esclusioni il Logbook da' 121", async () => {
  const zonaB = zonaPiena();
  zonaB.esclusioni = CINQUE_ESCLUSIONI;
  const f = fintoZonaB(zonaB);
  const zona = await leggiZonaBCompleta(f.db, "uid-di-prova");
  const pulite = applicaEsclusioni(zona.sedute.sedute, zona.esclusioni);
  const lb = seduteLogbook(pulite.sedute, { escluse: pulite.escluse, infoSedute: zona.sedute });
  assert.equal(lb.sedute.length, 121, "126 meno le cinque di Alice");
  assert.equal(lb.dichiarazioni.escluseDaAlice, 5);
});

test("54.5 i programmi: i metadati v2 vincono, un v1 con il suo v2 non raddoppia", () => {
  const r = programmiDaDocumenti([
    { id: "program-v2-meta-p1", dati: { programId: "p1", programMeta: { id: "p1", name: "Attuale" } } },
    { id: "program-v1-p1", dati: { programId: "p1", program: { id: "p1", name: "Vecchio" } } },
    { id: "program-v1-p2", dati: { programId: "p2", program: { id: "p2", name: "Solo v1" } } }
  ]);
  assert.equal(r.programmi.length, 2);
  assert.equal(r.v1Doppioni, 1);
  assert.equal(r.programmi.map((p) => p.name).sort().join(","), "Attuale,Solo v1");
});

test("54.6 una zona vuota dice «fai prima la copia» e non ripiega su A", () => {
  const s = statoZonaB({ fotografia: null, programmi: [], schede: 0, sedute: 0 });
  assert.equal(s.vuota, true);
  assert.equal(s.completa, false);
  assert.ok(/fai prima la copia/i.test(s.avviso), "il messaggio deve dire cosa fare: " + s.avviso);
  assert.ok(/A/.test(s.avviso), "il messaggio deve dire che A non viene letto");
});

test("54.7 una zona senza un pezzo si dichiara incompleta, col pezzo mancante", () => {
  const s = statoZonaB({ fotografia: { creatoIl: "2026-11-06T18:00:00.000Z" }, programmi: [{ id: "p1" }], schede: 2, sedute: 0 });
  assert.equal(s.vuota, false);
  assert.equal(s.completa, false);
  assert.deepEqual(s.mancanti, ["le sedute"]);
  assert.ok(/manca le sedute/.test(s.avviso), s.avviso);
  assert.ok(/non ripiega/.test(s.avviso), "deve dire che non si ripiega su A");
});

test("54.8 una zona senza fotografia ma con i dati resta utilizzabile, e lo dichiara", () => {
  const s = statoZonaB({ fotografia: null, programmi: [{ id: "p1" }], schede: 1, sedute: 3 });
  assert.equal(s.completa, true);
  assert.equal(s.avviso, null);
});

test("54.9 la pagina non importa piu' le letture di A: usa leggiZonaBCompleta", () => {
  const pagina = readFileSync(join(radice, "desktop", "app-v31.js"), "utf8");
  assert.ok(pagina.indexOf("leggiZonaBCompleta") >= 0, "la pagina non chiede la zona B");
  ["leggiDocumentoAtleta", "leggiSedute(", "leggiProgrammi(", "leggiSchedeProgrammi("].forEach((nome) => {
    assert.equal(pagina.indexOf(nome), -1, "la pagina importa ancora da A: " + nome);
  });
  assert.ok(pagina.indexOf("mostraZonaBIncompleta") >= 0, "manca il messaggio per la zona incompleta");
});

test("54.10 il modulo della zona B non scrive niente", () => {
  const src = readFileSync(join(radice, "comune", "lettura-b.js"), "utf8");
  [".set(", ".update(", ".delete(", ".add(", "writeBatch", "runTransaction", "onSnapshot"].forEach((vietato) => {
    assert.equal(src.indexOf(vietato), -1, "scrittura vietata in lettura-b.js: " + vietato);
  });
});
