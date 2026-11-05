/* Passo 1 · guardia: i conteggi e la fotografia, senza scritture e senza filtri.
 *
 * Cosa controlla:
 *  1. le tre famiglie (schede, programmi, logbook) si leggono con le query per
 *     intervallo di id, mai con una lettura integrale di nutritionPhotos;
 *  2. la fotografia contiene i documenti GREZZI, compresi quelli che A
 *     scarterebbe (v1 fuori da programIds, sedute senza id): un backup che
 *     filtra non è un backup;
 *  3. i conteggi dichiarano sia il numero valido sia il totale dei documenti;
 *  4. il confronto con quello che A dichiara nella radice è esplicito;
 *  5. il nome del file e il testo prodotto sono quelli attesi (timestamp
 *     convertiti, non persi);
 *  6. la pagina mostra i numeri e non tenta una sola scrittura.
 *
 * Dati di prova INVENTATI (mai dati veri).
 */

import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { creaFirebaseFinto } from "./finti/firebase-finto.mjs";
import { leggiSeduteGrezze, leggiProgrammiGrezzi, leggiSchedeGrezze } from "../comune/lettura-grezza.js";
import {
  contaSchede,
  contaProgrammi,
  contaSedute,
  confrontoConRadice,
  costruisciBackup,
  nomeFileBackup,
  righeConteggi,
  testoBackup,
  replacerTimestamp
} from "../comune/conteggi-copia.js";
import { renderConteggi } from "../desktop/conteggi.js";

const radiceRepo = join(dirname(fileURLToPath(import.meta.url)), "..");
const UID = "uid-di-prova";

const RADICE = {
  sessionStorage: "subcollection-v1",
  programStorage: "subcollection-v2",
  sessionCount: 3,
  programCount: 2,
  programIds: ["p1", "p2"],
  state: { metrics: {} }
};

const SEDUTE = [
  { id: "d1", dateInput: "2026-10-20", sessionCode: "A1", sessionName: "Seduta uno", source: "App", week: 3 },
  { id: "d2", dateInput: "2026-10-22", sessionCode: "B2", sessionName: "Seduta due", source: "App", week: 3 },
  { id: "d3", dateInput: "2026-10-24", sessionCode: "C3", sessionName: "Seduta tre", source: "App", week: 3 },
  { id: "d3", dateInput: "2026-10-24", sessionCode: "C3", sessionName: "Seduta tre (copia)", source: "App", week: 3 },
  { id: "d4", dateInput: "", sessionCode: "D4", sessionName: "Seduta senza data", source: "App" }
];

/* Il finto avvolge ogni seduta in { session }. La quinta è la stessa seduta
 * d3 (doppione da riconciliare) e una sesta non ha proprio id. */
const SEDUTE_FINTE = SEDUTE.concat([{ id: "", sessionCode: "X0" }]);

const NUTRIZIONE = [
  {
    id: "program-v2-meta-p1",
    data: () => ({ programId: "p1", updatedAt: "2026-10-01T00:00:00Z", programMeta: { id: "p1", name: "Programma Uno", status: "active" } })
  },
  {
    id: "program-v2-meta-p2",
    data: () => ({ programId: "p2", updatedAt: "2026-09-01T00:00:00Z", programMeta: { id: "p2", name: "Programma Due", status: "draft" } })
  },
  {
    id: "program-v1-p9",
    data: () => ({ program: { id: "p9", name: "Programma Cancellato", updatedAt: "2026-08-01T00:00:00Z" } })
  },
  { id: "program-v2-sheet-p1-s1", data: () => ({ programId: "p1", sheetId: "s1", sheet: { id: "s1", name: "Scheda A" } }) },
  { id: "program-v2-sheet-p1-s2", data: () => ({ programId: "p1", sheetId: "s2", sheet: { id: "s2", name: "Scheda B" } }) },
  { id: "program-v2-exercise-p1-s2-e1", data: () => ({ programId: "p1", sheetId: "s2", exercise: { id: "e1", nome: "Squat" } }) },
  { id: "program-v2-archived-p2-s0", data: () => ({ programId: "p2", sheetId: "s0", archivedAt: "2026-07-01" }) },
  { id: "foto-2026-10-01", data: () => ({ url: "https://example.invalid/foto.jpg" }) },
  { id: "a-foto-vecchia", data: () => ({ url: "https://example.invalid/altra.jpg" }) }
];

async function leggiTutto() {
  const { firestoreFinto, registri } = creaFirebaseFinto({
    datiRadice: RADICE,
    sedute: SEDUTE_FINTE,
    documentiNutrizione: NUTRIZIONE
  });
  const sedute = await leggiSeduteGrezze(firestoreFinto, UID);
  const programmi = await leggiProgrammiGrezzi(firestoreFinto, UID);
  const schede = await leggiSchedeGrezze(firestoreFinto, UID);
  return { registri, sedute, programmi, schede };
}

test("27.01 le tre famiglie si leggono per intervallo, mai con una lettura integrale", async () => {
  const { registri, sedute, programmi, schede } = await leggiTutto();
  assert.equal(sedute.length, SEDUTE_FINTE.length, "le sedute si leggono tutte, senza filtri");
  assert.equal(programmi.length, 3, "due metadati v2 + un programma v1");
  assert.equal(schede.length, 4, "due schede, un esercizio sciolto, una archiviata");
  assert.ok(!registri.letture.includes("nutritionPhotos:integrale"), "lettura integrale vietata: contiene le foto");
  assert.equal(registri.letture.filter((l) => l === "nutritionPhotos:query").length, 5, "due intervalli programmi + tre intervalli schede");
  const foto = programmi.concat(schede).filter((d) => d.id.indexOf("foto") >= 0);
  assert.equal(foto.length, 0, "le foto di nutrizione non entrano né nei programmi né nelle schede");
  assert.deepEqual(registri.scritture, [], "scritture: " + JSON.stringify(registri.scritture));
});

test("27.02 i conteggi separano il valido dal totale, come A", async () => {
  const { sedute, programmi, schede } = await leggiTutto();
  const c = {
    schede: contaSchede(schede),
    programmi: contaProgrammi(programmi, RADICE),
    sedute: contaSedute(sedute)
  };
  assert.equal(c.schede.schede, 2);
  assert.equal(c.schede.esercizi, 1);
  assert.equal(c.schede.archiviate, 1);
  assert.equal(c.schede.programmi, 2, "le schede appartengono a due programmi");
  assert.equal(c.programmi.distinti, 2, "p9 è fuori da programIds: programma cancellato");
  assert.equal(c.programmi.fuoriElenco, 1);
  assert.equal(c.programmi.documenti, 3, "ma il documento resta nella fotografia");
  assert.equal(c.sedute.documenti, 6);
  assert.equal(c.sedute.valide, 4, "cinque id distinti, uno senza id e uno doppione");
  assert.equal(c.sedute.senzaId, 1);
  assert.equal(c.sedute.duplicate, 1);
  assert.equal(c.sedute.primaData, "2026-10-20");
  assert.equal(c.sedute.ultimaData, "2026-10-24");
});

test("27.03 il confronto con A è esplicito, anche quando non coincide", async () => {
  const { sedute, programmi, schede } = await leggiTutto();
  const conteggi = {
    schede: contaSchede(schede),
    programmi: contaProgrammi(programmi, RADICE),
    sedute: contaSedute(sedute)
  };
  const confronto = confrontoConRadice(conteggi, RADICE);
  assert.equal(confronto.sessioni.dichiarato, 3);
  assert.equal(confronto.sessioni.letto, 4);
  assert.equal(confronto.sessioni.coincide, false, "3 dichiarate, 4 lette: la pagina deve dirlo");
  assert.equal(confronto.programmi.coincide, true);
  assert.equal(confrontoConRadice(conteggi, {}).sessioni, null, "senza dichiarazione non si inventa un confronto");
});

test("27.04 la fotografia contiene i documenti grezzi, compresi quelli scartati da A", async () => {
  const { sedute, programmi, schede } = await leggiTutto();
  const quando = new Date("2026-11-04T00:10:00Z");
  const backup = costruisciBackup({
    creatoIl: quando,
    build: "b0.19-passo1-conteggi",
    progetto: "barbell-diva",
    uid: UID,
    radice: RADICE,
    sedute,
    programmi,
    schede
  });
  assert.equal(backup.tipo, "barbell-diva-backup");
  assert.equal(backup.scopo, "schede, programmi e logbook dell'app A");
  assert.equal(backup.documenti.sedute.length, 6, "anche la seduta senza id");
  assert.equal(backup.documenti.programmi.length, 3, "anche il programma cancellato");
  assert.equal(backup.documenti.schede.length, 4);
  assert.equal(backup.dichiaratoDaA.sessionCount, 3);
  assert.deepEqual(backup.dichiaratoDaA.programIds, ["p1", "p2"]);
  assert.ok(backup.avvertenza.includes("resta sul tuo computer"));
  // Il contenuto è quello originale, non una ricostruzione.
  const scheda = backup.documenti.schede.find((d) => d.id === "program-v2-sheet-p1-s1");
  assert.equal(scheda.dati.sheet.name, "Scheda A");
  assert.equal(backup.conteggi.sedute.valide, 4);
});

test("27.05 nome del file e testo prodotto: timestamp leggibili, niente date perse", () => {
  assert.equal(nomeFileBackup(new Date("2026-11-04T09:05:00Z")), "barbell-diva-backup-A-2026-11-04.json");
  const finto = { toMillis: () => 1762300000000 };
  const testo = testoBackup({ quando: finto, nota: "prova" });
  assert.ok(testo.includes('"tipo": "timestamp"'));
  assert.ok(testo.includes("1762300000000"));
  assert.ok(testo.includes(new Date(1762300000000).toISOString().slice(0, 13)), "la data ISO viene scritta accanto ai millisecondi");
  assert.equal(replacerTimestamp("x", "testo"), "testo");
});

test("27.06 la tabella a schermo mostra i numeri, la zona nuova e le note oneste", async () => {
  const { sedute, programmi, schede } = await leggiTutto();
  const letto = {
    radice: RADICE,
    schede: contaSchede(schede),
    programmi: contaProgrammi(programmi, RADICE),
    sedute: contaSedute(sedute)
  };
  letto.confronto = confrontoConRadice(letto, RADICE);
  const righe = righeConteggi(letto);
  assert.equal(righe.length, 3);
  assert.equal(righe[0].cosa, "Schede");
  assert.ok(righe[0].lettoOra.includes("2 schede"));
  assert.ok(righe[0].lettoOra.includes("1 esercizio sciolto"));
  assert.ok(righe[2].lettoOra.includes("4 sedute valide"));
  assert.ok(righe[2].lettoOra.includes("dal 2026-10-20 al 2026-10-24"));
  assert.ok(righe[2].inA.includes("3"));
  assert.ok(righe.every((r) => r.zonaNuova.includes("passo 3")), "la zona nuova non esiste: la colonna lo dice");

  const dom = new JSDOM(readFileSync(join(radiceRepo, "desktop", "conteggi.html"), "utf8"));
  const corpo = dom.window.document.querySelector("#righeConteggi");
  renderConteggi(dom.window.document, corpo, letto, []);
  const testo = corpo.textContent;
  assert.ok(testo.includes("Schede"));
  assert.ok(testo.includes("Logbook"));
  assert.ok(testo.includes("2026-10-24"));
  assert.ok(testo.includes("program-v2-meta-"));
  assert.equal(corpo.querySelectorAll("tr").length, 3);
});

test("27.07 la pagina esiste, si apre dal PC e dichiara dove finisce il file", () => {
  const html = readFileSync(join(radiceRepo, "desktop", "conteggi.html"), "utf8");
  assert.ok(html.includes('src="../app-config-b.js"'), "legge la build dalla fonte unica");
  assert.ok(html.includes('type="module"'), "un solo modulo, come le altre pagine");
  assert.equal(html.split("<style>").length - 1, 1, "un solo blocco di stile");
  assert.ok(html.includes("Il file resta tuo"), "l'avviso sul file deve stare in pagina");
  assert.ok(html.includes("non va su GitHub"), "il divieto esplicito di metterlo in GitHub");
  assert.ok(!html.includes("!important"), "niente forzature di stile");
  const indice = readFileSync(join(radiceRepo, "desktop", "index.html"), "utf8");
  assert.ok(indice.includes("./conteggi.html"), "la dashboard deve portare alla pagina dei conteggi");
});
