// tests/35-pianificazione-2-4.test.mjs — la Pianificazione (2.4).
// Il prospetto racconta le sedute che ci sono, non il piano che dovrebbe
// esserci: la rotazione prevista, lo scarico e il test non sono nel contratto.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  lunediDiData, codiceScheda, settimaneOsservate, rotazioneOsservata,
  riepilogoPianificazione, coseNonRegistrate
} from "../comune/pianificazione.js";

const oggi = new Date(Date.UTC(2026, 10, 4)); // mercoledì 4 novembre 2026

function seduta(data, codice, nome) {
  return { dateInput: data, sessionCode: codice, sessionName: nome || codice };
}

const sedute = [
  seduta("2026-10-13", "A"),
  seduta("2026-10-15", "B"),
  seduta("2026-10-20", "C"),
  seduta("2026-10-22", "D"),
  seduta("2026-10-27", "A"),
  seduta("2026-11-03", "B")
];

test("35.01 la settimana comincia di lunedì, non di domenica", () => {
  const lun = lunediDiData(new Date(Date.UTC(2026, 10, 4))); // mercoledì
  assert.equal(lun.toISOString().slice(0, 10), "2026-11-02");
  assert.equal(lunediDiData(new Date(Date.UTC(2026, 10, 8))).toISOString().slice(0, 10), "2026-11-02", "la domenica chiude la stessa settimana");
  assert.equal(lunediDiData(new Date(Date.UTC(2026, 10, 9))).toISOString().slice(0, 10), "2026-11-09", "il lunedì dopo apre una settimana nuova");
});

test("35.02 otto settimane, l'ultima è quella di oggi, e i giorni portano la scheda vera", () => {
  const sett = settimaneOsservate(sedute, 8, oggi);
  assert.equal(sett.length, 8);
  assert.equal(sett[7].corrente, true);
  assert.equal(sett[7].lunedi.toISOString().slice(0, 10), "2026-11-02");
  assert.equal(sett[0].lunedi.toISOString().slice(0, 10), "2026-09-14");
  const martedi = sett[7].giorni[1];
  assert.equal(martedi.codice, "B", "il 3 novembre è martedì ed è quello che c'è");
  assert.equal(martedi.numero, 1);
  assert.equal(sett[7].giorni[0].codice, "", "il lunedì vuoto resta vuoto");
  assert.equal(sett[7].sedute, 1);
});

test("35.03 le settimane vuote restano nell'elenco, non vengono saltate", () => {
  const sett = settimaneOsservate(sedute, 8, oggi);
  assert.equal(sett.filter((s) => !s.attiva).length, 4);
  assert.deepEqual(sett.filter((s) => !s.attiva).map((s) => s.etichetta),
    ["14/09–20/09", "21/09–27/09", "28/09–04/10", "05/10–11/10"]);
});

test("35.04 la rotazione è quella osservata: conteggi e ordine di comparsa", () => {
  const r = rotazioneOsservata(sedute);
  assert.equal(r.distinte, 4);
  assert.equal(r.conCodice, 6);
  assert.deepEqual(r.elenco.map((x) => x.codice + ":" + x.numero), ["A:2", "B:2", "C:1", "D:1"]);
  assert.deepEqual(r.sequenza.map((x) => x.codice), ["A", "B", "C", "D", "A", "B"]);
});

test("35.05 il riepilogo non inventa: senza date lo dice, e i vuoti sono elencati", () => {
  const pieno = riepilogoPianificazione(sedute, { oggi, settimane: 8 });
  assert.equal(pieno.totale, 6);
  assert.equal(pieno.senzaData, 0);
  assert.equal(pieno.settimaneCoperte, 4);
  assert.equal(pieno.giorniCoperti, 6);
  assert.equal(pieno.giorniGuardati, 56);
  assert.equal(pieno.mediaSettimana, 1.5);
  assert.equal(pieno.giorniDallUltima, 1);
  assert.equal(pieno.prima, "13/10");
  assert.deepEqual(pieno.settimaneVuote, ["14/09–20/09", "21/09–27/09", "28/09–04/10", "05/10–11/10"]);

  const vuoto = riepilogoPianificazione([{ sessionCode: "A" }], { oggi, settimane: 4 });
  assert.equal(vuoto.totale, 0);
  assert.equal(vuoto.senzaData, 1, "la seduta senza data è dichiarata, non contata nel prospetto");
  assert.equal(vuoto.mediaSettimana, null);
  assert.equal(vuoto.giorniDallUltima, null);
  assert.equal(vuoto.prima, null);
  assert.equal(vuoto.giorniGuardati, 28);
});

test("35.06 il codice della scheda si legge da sessionCode, senza inventarlo", () => {
  assert.equal(codiceScheda({ sessionCode: " S3 " }), "S3");
  assert.equal(codiceScheda({ sheetCode: "D" }), "D");
  assert.equal(codiceScheda({}), "");
  assert.equal(codiceScheda(null), "");
});

test("35.07 le cose non registrate sono dichiarate, non riempite", () => {
  const cose = coseNonRegistrate();
  assert.ok(cose.length >= 4);
  const testi = cose.map((c) => c[0] + " " + c[1]).join(" | ");
  for (const parola of ["Rotazione prevista", "Scarico e test", "Date del blocco", "Aderenza"]) {
    assert.ok(testi.includes(parola), "manca la dichiarazione su " + parola);
  }
  assert.ok(testi.includes("non registrato"));
});

test("35.08 la voce è accesa e il pannello esiste nella pagina", () => {
  const html = readFileSync(new URL("../desktop/index.html", import.meta.url), "utf8");
  const inizio = html.indexOf('<button class="voce" data-vista="pianificazione"');
  assert.ok(inizio > 0, "la voce della Pianificazione deve essere un pulsante vivo");
  assert.ok(!html.slice(inizio, inizio + 200).includes("disabled"));
  assert.ok(html.includes('id="vistaPianificazione"'));
  assert.ok(html.includes('id="pianificazioneGriglia"'));
});

test("35.09 il modulo non scrive e non tocca il DOM", () => {
  const src = readFileSync(new URL("../comune/pianificazione.js", import.meta.url), "utf8");
  assert.ok(!/\.set\(/.test(src), "niente .set( dentro il modulo");
  assert.ok(!/document\./.test(src), "il modulo dei conti non parla col DOM");
  assert.ok(src.includes("funzioni pure") || src.includes("Funzioni pure"));
});
