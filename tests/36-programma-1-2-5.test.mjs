// tests/36-programma-1-2-5.test.mjs — Programma 1 (2.5).
// Il documento v2 porta solo i metadati: le schede stanno altrove. La
// schermata mostra quello che c'è e dichiara quello che non c'è.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CAMPI_PROGRAMMA, statoInChiaro, schedeDelProgramma, rotazionePrevista,
  seduteOsservate, elencoProgrammiOrdinato, profiloProgramma,
  riepilogoProgramma, coseNonRegistrateProgramma, PROGRAMMA_NON_REGISTRATO
} from "../comune/programma.js";

const v1 = {
  id: "p1",
  name: "Split A–D · test 12RM",
  status: "active",
  phase: "Bulk",
  startDate: "2026-10-24",
  durationWeeks: 8,
  daysPerWeek: 4,
  description: "Rotazione A–D su 4 giorni.",
  message: "Benvenuta nel blocco nuovo.",
  createdAt: "2026-10-20T09:00:00.000Z",
  updatedAt: "2026-10-30T18:12:00.000Z",
  sheets: [
    { id: "s2", code: "B", name: "Scheda B", week: 1, order: 1, exercises: [{ name: "Panca" }, { name: "Rematore" }] },
    { id: "s1", code: "A", name: "Scheda A", week: 1, order: 0, exercises: [{ name: "Squat" }, { name: "Stacco" }, { name: "Lento" }] },
    { id: "s3", code: "X", order: 2, deletedAt: "2026-10-25T10:00:00.000Z", exercises: [{ name: "Cancellato" }] }
  ]
};

const v2 = { id: "p2", name: "Blocco forza", status: "draft", createdAt: "2026-11-01T08:00:00.000Z", updatedAt: "2026-11-02T08:00:00.000Z" };

const sedute = [
  { dateInput: "2026-10-27", sessionCode: "A" },
  { dateInput: "2026-10-29", sessionCode: "B" },
  { dateInput: "2026-11-03", sessionCode: "A" },
  { dateInput: "2026-11-03", sessionCode: "Z" },
  { sessionCode: "B" },
  { dateInput: "2026-11-01" }
];

test("36.01 il profilo legge i campi con i nomi accettati, e il vuoto resta vuoto", () => {
  const p = profiloProgramma(v1);
  assert.equal(p.presente, true);
  assert.equal(p.nome, "Split A–D · test 12RM");
  assert.equal(p.stato, "attivo");
  assert.equal(p.fase, "Bulk");
  assert.equal(p.inizio, "2026-10-24");
  assert.equal(p.durata, 8);
  assert.equal(p.giorni, 4);
  assert.equal(p.descrizione, "Rotazione A–D su 4 giorni.");
  assert.equal(p.messaggio, "Benvenuta nel blocco nuovo.");

  const vuoto = profiloProgramma(v2);
  assert.equal(vuoto.fase, "", "la fase non c'è: stringa vuota, non un valore del mockup");
  assert.equal(vuoto.durata, null);
  assert.equal(vuoto.descrizione, "");
  assert.equal(vuoto.presente, true);

  const niente = profiloProgramma(null);
  assert.equal(niente.presente, false);
  assert.equal(niente.nome, PROGRAMMA_NON_REGISTRATO);
  assert.ok(CAMPI_PROGRAMMA.nome.includes("name"));
});

test("36.02 lo stato di A diventa una parola leggibile, senza inventare quelli ignoti", () => {
  assert.deepEqual(statoInChiaro("active"), { parola: "attivo", segno: "vivo" });
  assert.equal(statoInChiaro("draft").parola, "in bozza");
  assert.equal(statoInChiaro("available").parola, "disponibile");
  assert.equal(statoInChiaro("archived").parola, "archiviato");
  assert.equal(statoInChiaro("").parola, PROGRAMMA_NON_REGISTRATO);
  assert.equal(statoInChiaro("strano").parola, "strano", "uno stato sconosciuto si mostra com'è");
});

test("36.03 le schede: elenco quando il documento le porta, null quando stanno altrove", () => {
  const s = schedeDelProgramma(v1);
  assert.equal(s.length, 3 - 1, "la scheda cancellata non si conta");
  assert.deepEqual(s.map((x) => x.codice), ["A", "B"], "ordinate per order, non per arrivo");
  assert.equal(s[0].esercizi, 3);
  assert.equal(s[1].nome, "Scheda B");
  assert.equal(schedeDelProgramma(v2), null, "v2: le schede non sono nel documento");
  assert.equal(schedeDelProgramma({ sheets: [] }).length, 0, "elenco vuoto è diverso da assente");
});

test("36.04 la rotazione prevista viene dal campo, poi dalle schede, altrimenti non è registrata", () => {
  const dalCampo = rotazionePrevista({ rotation: ["A", "B", { code: "C" }, "A"] }, []);
  assert.deepEqual(dalCampo.codici, ["A", "B", "C"], "ordine di comparsa, senza doppioni");
  assert.equal(dalCampo.registrata, true);
  const dalleSchede = rotazionePrevista(v2, schedeDelProgramma(v1));
  assert.deepEqual(dalleSchede.codici, ["A", "B"]);
  const niente = rotazionePrevista(v2, null);
  assert.equal(niente.registrata, false);
  assert.equal(niente.fonte, PROGRAMMA_NON_REGISTRATO);
});

test("36.05 le sedute osservate si contano per codice, e si dice quante restano fuori", () => {
  const o = seduteOsservate(sedute, ["A", "B", "C", "D"]);
  assert.equal(o.totale, 6);
  assert.equal(o.conCodice, 5);
  assert.equal(o.dentro, 4, "A, B, A, B");
  assert.equal(o.fuori, 1, "la Z è di un altro programma");
  assert.equal(o.senzaData, 1);
  assert.deepEqual(o.righe.map((r) => r.codice + ":" + r.numero), ["A:2", "B:2", "Z:1"]);
  const senzaElenco = seduteOsservate(sedute, []);
  assert.equal(senzaElenco.fuori, 0, "senza codici di riferimento niente è «fuori»");
});

test("36.06 il riepilogo somma gli esercizi, conta le visite per scheda e dichiara il motivo del vuoto", () => {
  const r = riepilogoProgramma(v1, sedute, { indice: 0, totaleProgrammi: 3 });
  assert.equal(r.indice, 0);
  assert.equal(r.totaleProgrammi, 3);
  assert.equal(r.esercizi, 5);
  assert.equal(r.schedeMotivo, null);
  assert.deepEqual(r.viste.map((v) => v.codice + ":" + v.numero), ["A:2", "B:2"]);
  assert.equal(r.viste[0].ultima, "03/11/2026");

  const meta = riepilogoProgramma(v2, sedute, { indice: 1 });
  assert.equal(meta.schede, null);
  assert.ok(meta.schedeMotivo.includes("scheda"), "il vuoto dice che non ha trovato schede");
  assert.equal(meta.esercizi, null);
  assert.equal(meta.rotazione.registrata, false);
  assert.ok(meta.viste.length === 0);

  const vuoto = riepilogoProgramma(null, [], {});
  assert.equal(vuoto.profilo.presente, false);
  assert.equal(vuoto.osservato.conCodice, 0);
});

test("36.07 l'ordine dei programmi è dichiarato: creati prima, poi id", () => {
  const ordinati = elencoProgrammiOrdinato([v2, v1, { id: "p3", createdAt: "2026-10-20T09:00:00.000Z" }]);
  assert.deepEqual(ordinati.map((p) => p.id), ["p1", "p3", "p2"]);
});

test("36.08 la voce è accesa, il pannello c'è e la build è la 2.5", () => {
  const html = readFileSync(new URL("../desktop/index.html", import.meta.url), "utf8");
  const inizio = html.indexOf('data-vista="programma-1"');
  assert.ok(inizio > 0, "la voce di Programma 1 deve essere un pulsante vivo");
  assert.ok(!html.slice(inizio, inizio + 160).includes("disabled"));
  assert.ok(html.includes('id="vistaProgramma1"'));
  assert.ok(html.includes('id="programma1Griglia"'));
  const config = readFileSync(new URL("../app-config-b.js", import.meta.url), "utf8");
  assert.match(config, /b0\.39-passo2-12-due/);
});

test("36.09 il modulo dei conti non scrive e non tocca il DOM; la vista non usa HTML grezzo", () => {
  const src = readFileSync(new URL("../comune/programma.js", import.meta.url), "utf8");
  assert.ok(!/\.set\(/.test(src));
  assert.ok(!/document\./.test(src));
  assert.ok(!/innerHTML/.test(src));
  const vista = readFileSync(new URL("../comune/vista-programma.js", import.meta.url), "utf8");
  assert.ok(!/innerHTML/.test(vista), "la vista costruisce nodi, non HTML");
  for (const classe of ["pg-top", "pr-grid", "pr-card", "pr-bar", "pr-filtri", "p8-tab"]) {
    assert.ok(vista.includes(classe), "manca " + classe + " nella vista");
  }
  const cose = coseNonRegistrateProgramma();
  assert.ok(cose.length >= 4);
  assert.ok(!cose.map((c) => c[0] + " " + c[1]).join(" | ").includes("Progressione settimana per settimana"));
});
