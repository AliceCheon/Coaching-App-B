/* Guardia della fase 2b: il quadro strutturale deve contare, non inventare.
 * Nessuna rete, nessun DOM: si provano direttamente le funzioni pure.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  SOGLIE,
  DATI_SEMAFORO,
  dataSeduta,
  lunediDi,
  quadroStrutturale,
  righeQuadro,
  righeSemaforo,
  righeDatiMancanti
} from "../comune/struttura.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const oggi = new Date(Date.UTC(2026, 10, 3)); // martedì 3 novembre 2026
const giovedi29 = new Date(Date.UTC(2026, 9, 29)); // giovedì 29 ottobre 2026

function seduta(dataInput, sessionCode) {
  return { dateInput: dataInput, sessionCode: sessionCode || "Scheda A" };
}

test("dataSeduta accetta solo date reali e non inventa", () => {
  assert.equal(dataSeduta("2026-11-03").toISOString().slice(0, 10), "2026-11-03");
  assert.equal(dataSeduta("2026-11-03T18:30:00").toISOString(), "2026-11-03T00:00:00.000Z");
  assert.equal(dataSeduta("2026-02-30"), null, "30 febbraio non esiste");
  assert.equal(dataSeduta("2026-13-01"), null, "mese 13 non esiste");
  assert.equal(dataSeduta(""), null);
  assert.equal(dataSeduta(null), null);
  assert.equal(dataSeduta("boh"), null);
});

test("lunediDi porta sempre al lunedì della settimana", () => {
  const lunedi = lunediDi(new Date(Date.UTC(2026, 10, 3))); // martedì
  assert.equal(lunedi.toISOString().slice(0, 10), "2026-11-02");
  const domenica = lunediDi(new Date(Date.UTC(2026, 10, 8)));
  assert.equal(domenica.toISOString().slice(0, 10), "2026-11-02");
});

test("nessuna seduta: tutto null, mai zero inventato", () => {
  const q = quadroStrutturale([], { oggi });
  assert.equal(q.numeroSedute, 0);
  assert.equal(q.mediaSettimanale, null);
  assert.equal(q.giorniDallUltima, null);
  assert.equal(q.bucoMassimo, null);
  const righe = righeQuadro(q);
  assert.equal(righe.length, 1);
  assert.equal(righe[0].testo, "non registrato");
});

test("sedute senza data non entrano nei conteggi ma vengono dichiarate", () => {
  const q = quadroStrutturale([seduta(""), seduta("boh"), seduta("2026-11-02")], { oggi });
  assert.equal(q.numeroSedute, 1);
  assert.equal(q.senzaData, 2);
  const righe = righeQuadro(q);
  assert.ok(righe.some((r) => /senza data leggibile: 2/.test(r.testo)));
});

test("media settimanale e ultimi 7 giorni su un caso noto", () => {
  // Due sedute a settimana per 8 settimane: 16 sedute.
  const sedute = [];
  for (let s = 0; s < 8; s += 1) {
    const lunedi = new Date(Date.UTC(2026, 9, 26) - s * 7 * 86400000);
    sedute.push(seduta(lunedi.toISOString().slice(0, 10)));
    sedute.push(seduta(new Date(lunedi.getTime() + 3 * 86400000).toISOString().slice(0, 10)));
  }
  const q = quadroStrutturale(sedute, { oggi: giovedi29, settimane: 8 });
  assert.equal(q.numeroSedute, 16);
  assert.equal(q.mediaSettimanale, 2);
  assert.equal(q.settimane.length, 8);
  assert.equal(q.settimaneVuote, 0);
  assert.equal(q.giorniDallUltima, 0); // ultima seduta = giovedì 29/10, cioè oggi
});

test("pausa lunga e settimane vuote di fila producono segnali rossi", () => {
  const q = quadroStrutturale([seduta("2026-09-10"), seduta("2026-09-12")], { oggi, settimane: 8 });
  assert.ok(q.giorniDallUltima >= SOGLIE.giorniPausaLunga);
  const segnali = righeSemaforo(q);
  assert.ok(segnali.some((s) => /Pausa lunga/.test(s.testo) && s.classe === "errore"));
  assert.ok(segnali.some((s) => /settimane di fila senza sedute/.test(s.testo)));
});

test("distribuzione sbilanciata segnalata, distribuzione equa no", () => {
  const sbilanciate = [];
  for (let i = 0; i < 10; i += 1) sbilanciate.push(seduta("2026-10-0" + ((i % 8) + 1), "Scheda A"));
  for (let i = 0; i < 2; i += 1) sbilanciate.push(seduta("2026-10-1" + i, "Scheda B"));
  const qs = quadroStrutturale(sbilanciate, { oggi });
  assert.ok(righeSemaforo(qs).some((s) => /sbilanciata/.test(s.testo)));

  const eque = [];
  ["Scheda A", "Scheda B", "Scheda C"].forEach((codice) => {
    for (let i = 0; i < 4; i += 1) eque.push(seduta("2026-10-0" + ((i % 8) + 1), codice));
  });
  const qe = quadroStrutturale(eque, { oggi });
  assert.ok(righeSemaforo(qe).some((s) => /equilibrata/.test(s.testo)));
});

test("ogni riga del semaforo dichiara che non è una diagnosi", () => {
  const q = quadroStrutturale([seduta("2026-11-02")], { oggi });
  const segnali = righeSemaforo(q);
  assert.ok(segnali.some((s) => /non una diagnosi/.test(s.testo)));
});

test("i dati mancanti sono elencati, non simulati", () => {
  const righe = righeDatiMancanti();
  assert.equal(righe.length, DATI_SEMAFORO.length);
  assert.ok(righe.some((r) => /disponibilità energetica/.test(r.testo)));
  assert.ok(righe.every((r) => /in A (esiste|non è registrato)/.test(r.testo)));
});

test("il modulo resta di sola lettura: nessuna scrittura, nessun DOM", () => {
  const sorgente = readFileSync(join(radice, "comune", "struttura.js"), "utf8");
  assert.ok(!/\.set\(|\.add\(|\.update\(|\.delete\(/.test(sorgente), "nessun metodo di scrittura Firestore");
  assert.ok(!/document\.|window\.|fetch\(/.test(sorgente), "nessun DOM, nessuna rete");
  assert.ok(!/!important/.test(sorgente));
});
