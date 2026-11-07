/* Passo 3c — il Logbook dentro «Tutto insieme» con i dati veri (SOLA LETTURA).
 * Modulo puro: niente DOM, niente rete — solo la traduzione dichiarata. */

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { seduteLogbook } from "../comune/logbook.js";

const QUI = dirname(fileURLToPath(import.meta.url));
const legg = (p) => readFileSync(join(QUI, "..", p), "utf8");

const PROGRAMMI = [
  { id: "p-uno", name: "Intensita_ottobre_dicembre" },
  { id: "p-due", name: "Vecchio_agosto" }
];

/* Codice C solo in p-uno: l'attribuzione dal codice è possibile. */
const SCHEDE_UNE = {
  perProgramma: {
    "p-uno": {
      programId: "p-uno",
      schede: [
        {
          codice: "C",
          nome: "Scheda_C",
          esercizi: [
            {
              nome: "Panca_piana",
              prescrizione: { elencoSettimane: [{ numero: 1, serie: "3", ripetizioni: "8-10", registrata: true, etichettaTipo: "" }] }
            }
          ]
        }
      ],
      archiviate: []
    },
    "p-due": {
      programId: "p-due",
      schede: [{ codice: "D", nome: "Scheda_D", esercizi: [] }],
      archiviate: []
    }
  }
};

/* Lo stesso codice C in due programmi (archiviata compresa): ambiguo, non attribuisce. */
const SCHEDE_AMB = {
  perProgramma: {
    "p-uno": SCHEDE_UNE.perProgramma["p-uno"],
    "p-due": {
      programId: "p-due",
      schede: [{ codice: "D", nome: "Scheda_D", esercizi: [] }],
      archiviate: [{ codice: "C", nome: "Scheda_C_vecchia", esercizi: [] }]
    }
  }
};

const OGGI = new Date(2026, 10, 6);

function sedutaBase(pezzi) {
  return Object.assign(
    {
      id: "1793116406326",
      dateInput: "2026-10-27",
      sessionCode: "C", sessionName: "Scheda_C",
      week: 1,
      status: "completed",
      source: "App",
      totalDurationSeconds: 3600,
      journal: { energy: 8, rpe: 9, mood: "great", note: "tosta" },
      exercises: [
        {
          name: "Leg_raise",
          sets: [{ weight: 0, reps: 12 }, { kg: 20, reps: 10, rpe: 8, rir: 1 }]
        }
      ]
    },
    pezzi || {}
  );
}

const OPZ_UNE = { programmi: PROGRAMMI, schedeV2: SCHEDE_UNE, oggi: OGGI };
const OPZ_AMB = { programmi: PROGRAMMI, schedeV2: SCHEDE_AMB, oggi: OGGI };

test("46.1 — la seduta vera entra nella forma del v31: data, codice, stato, fonte, settimana, durata, journal", () => {
  const esito = seduteLogbook([sedutaBase()], OPZ_UNE);
  assert.equal(esito.sedute.length, 1);
  const s = esito.sedute[0];
  assert.equal(s.id, "1793116406326");
  assert.equal(s.d, "27/10/2026");
  assert.equal(s.sc, "C");
  assert.equal(s.st, "completed");
  assert.equal(s.so, "App");
  assert.equal(s.w, 1);
  assert.equal(s.dur, 3600);
  assert.deepEqual(s.jr, { e: 8, r: 9, m: "great", nt: "tosta" });
  assert.match(esito.fonte, /^\d{2}\/\d{2}\/\d{4}$/);
});

test("46.2 — le serie diventano [kg, reps, rpe, rir]: lo zero vero resta zero, il mancante vale null", () => {
  const esito = seduteLogbook([sedutaBase()], OPZ_UNE);
  assert.deepEqual(esito.sedute[0].ex[0].cs[0], [0, 12, null, null]);
  assert.deepEqual(esito.sedute[0].ex[0].cs[1], [20, 10, 8, 1]);
});

test("46.3 — i nomi: il vero resta in n, quello pulito in np", () => {
  const esito = seduteLogbook([sedutaBase()], OPZ_UNE);
  assert.equal(esito.sedute[0].ex[0].n, "Leg_raise");
  assert.equal(esito.sedute[0].ex[0].np, "Leg raise");
  assert.equal(esito.sedute[0].nm, "Scheda C");
});

test("46.4 — il programma si attribuisce SOLO se il codice della scheda è di un programma solo; altrimenti «—», dichiarato", () => {
  const unica = seduteLogbook([sedutaBase()], OPZ_UNE);
  assert.equal(unica.sedute[0].pn, "Intensita ottobre dicembre");
  assert.equal(unica.dichiarazioni.conProgramma, 1);
  assert.equal(unica.dichiarazioni.senzaProgramma, 0);

  const ambiguo = seduteLogbook([sedutaBase()], OPZ_AMB);
  assert.equal(ambiguo.sedute[0].pn, "");
  assert.equal(ambiguo.sedute[0].pg, null);
  assert.equal(ambiguo.dichiarazioni.conProgramma, 0);
  assert.equal(ambiguo.dichiarazioni.senzaProgramma, 1);

  const assente = seduteLogbook([sedutaBase({ sessionCode: "X" })], OPZ_UNE);
  assert.equal(assente.sedute[0].pn, "");
  assert.equal(assente.dichiarazioni.conProgramma, 0);
});

test("46.5 — lo stato arriva da status, e se manca da done (true→completed, false→bozza); senza niente, spento", () => {
  const daDone = seduteLogbook(
    [sedutaBase({ status: undefined, done: true }), sedutaBase({ status: undefined, done: false, id: "2", exercises: [{ name: "Leg_raise_seconda", sets: [{ kg: 20, reps: 10 }] }] })],
    OPZ_UNE
  );
  assert.equal(daDone.sedute[0].st, "completed");
  assert.ok(daDone.sedute.some((s) => s.st === "bozza"));
  assert.equal(daDone.dichiarazioni.haStato, true);
  assert.deepEqual(daDone.dichiarazioni.statiValori, ["bozza", "completed"]);

  const niente = seduteLogbook([sedutaBase({ status: undefined })], OPZ_UNE);
  assert.equal(niente.sedute[0].st, "");
  assert.equal(niente.dichiarazioni.haStato, false);
});

test("46.6 — la provenienza: con source acceso e valori veri, senza source spento", () => {
  const con = seduteLogbook([sedutaBase(), sedutaBase({ id: "1758000000001", source: "Excel" })], OPZ_UNE);
  assert.equal(con.dichiarazioni.haFonte, true);
  assert.deepEqual(con.dichiarazioni.fontiValori, ["App", "Excel"]);
  const senza = seduteLogbook([sedutaBase({ source: undefined })], OPZ_UNE);
  assert.equal(senza.dichiarazioni.haFonte, false);
  assert.equal(senza.sedute[0].so, "");
});

test("46.7 — la colonna Programmato: righe dalla settimana vera della scheda attribuita, niente settimana inventata", () => {
  const esito = seduteLogbook([sedutaBase()], OPZ_UNE);
  assert.ok(esito.sedute[0].pg);
  assert.equal(esito.sedute[0].pg.scheda, "Scheda C");
  assert.equal(esito.sedute[0].pg.settimana, 1);
  assert.deepEqual(esito.sedute[0].pg.righe[0], { n: "Panca piana", tec: "", sets: "3", reps: "8-10", kg: "" });
  /* settimana che il documento della scheda non porta: colonna a «—», mai presa da un'altra */
  const altra = seduteLogbook([sedutaBase({ week: 7 })], OPZ_UNE);
  assert.equal(altra.sedute[0].pg.righe[0].sets, "");
  assert.equal(altra.sedute[0].pg.righe[0].reps, "");
});

test("46.8 — l'ordine: le più recenti in cima; una seduta senza data va in fondo, contata, non buttata", () => {
  const esito = seduteLogbook(
    [sedutaBase({ dateInput: "2026-09-01", id: "100" }), sedutaBase({ dateInput: "" }), sedutaBase({ id: "200" })],
    OPZ_UNE
  );
  assert.equal(esito.sedute[0].d, "27/10/2026");
  assert.equal(esito.sedute[1].d, "01/09/2026");
  assert.equal(esito.sedute[2].d, "");
  assert.equal(esito.dichiarazioni.senzaData, 1);
  assert.equal(esito.dichiarazioni.tenute, 3);
});

test("46.9 — niente valori inventati: esercizi illeggibili restano cs vuoto e la carta lo dichiara", () => {
  const esito = seduteLogbook([sedutaBase({ exercises: [{ nome: "" }] })], OPZ_UNE);
  assert.deepEqual(esito.sedute[0].ex, []);
});

test("46.10 — il file del v31 non ha più il seme di esempio e la carta porta la dichiarazione; app-v31 lo alimenta", () => {
  const pagina = legg("desktop/index.html");
  assert.ok(!pagina.includes('window.BD_LB_SEED = {"fonte"'), "il seme di esempio deve essere tolto");
  assert.ok(pagina.includes('id="lb-nota-b"'), "manca la riga di dichiarazione nella carta");
  assert.ok(pagina.includes("sc(e.np || e.n)"), "il cassetto deve mostrare il nome pulito");
  const app = legg("desktop/app-v31.js");
  assert.ok(app.includes('from "../comune/logbook.js"'), "manca l'import del modulo logbook");
  assert.ok(app.includes("BD_LB._prende"), "manca il caricamento delle sedute vere in BD_LB");
  assert.ok(app.includes('getElementById("lb-importa")'), "manca lo spegnimento di Importa backup");
});
