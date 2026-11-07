/* Passo 4 — il piano di copia (funzioni pure) e i due momenti della pagina.
 *
 * Perche' esiste: la correzione del 7/11/2026. Gli esercizi sciolti
 * (program-v2-exercise-) DEVONO essere copiati, altrimenti le schede grandi in
 * B sono monche. E la pagina deve avere due momenti separati: «Conta (sola
 * lettura)» che non scrive, e «Copia in B» spento finche' non si e' contato.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  FAMIGLIE,
  pianoDiCopia,
  riepilogo,
  confrontaCopia,
  fotografia,
  descriviFotografia
} from "../comune/copia-b.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");

const schedeFinte = [
  { id: "program-v2-sheet-aaa", dati: { nome: "Scheda A" } },
  { id: "program-v2-sheet-bbb", dati: { nome: "Scheda B" } },
  { id: "program-v2-exercise-e1", dati: { nome: "Esercizio 1" } },
  { id: "program-v2-exercise-e2", dati: { nome: "Esercizio 2" } },
  { id: "program-v2-archived-zzz", dati: { nome: "Vecchia" } }
];

const programmiFinti = [
  { id: "program-v2-meta-p1", dati: { nome: "Programma 1" } },
  { id: "program-v1-intero", dati: { nome: "Programma intero" } }
];

const seduteFinte = [
  { id: "s1", dati: { data: "2026-01-01" } },
  { id: "s2", dati: { data: "2026-01-02" } },
  { id: "s3", dati: { data: "2026-01-03" } }
];

test("48.1 le quattro famiglie ci sono tutte, esercizi compresa", () => {
  assert.deepEqual(FAMIGLIE.map((f) => f.chiave), ["programmi", "schede", "esercizi", "sedute"]);
  const esercizi = FAMIGLIE.find((f) => f.chiave === "esercizi");
  assert.equal(esercizi.sottoraccolta, "esercizi");
});

test("48.2 gli esercizi sciolti entrano nel piano, con la loro sottoraccolta", () => {
  const piano = pianoDiCopia({ programmi: programmiFinti, schede: schedeFinte, sedute: seduteFinte });
  assert.equal(piano.conteggi.esercizi, 2);
  const voci = piano.voci.filter((v) => v.famiglia === "esercizi");
  assert.deepEqual(voci.map((v) => v.id), ["program-v2-exercise-e1", "program-v2-exercise-e2"]);
  assert.deepEqual(voci.map((v) => v.sottoraccolta), ["esercizi", "esercizi"]);
  assert.deepEqual(voci.map((v) => v.dati.nome), ["Esercizio 1", "Esercizio 2"]);
});

test("48.3 i conteggi sono esatti e il totale è la somma delle voci", () => {
  const piano = pianoDiCopia({ programmi: programmiFinti, schede: schedeFinte, sedute: seduteFinte });
  assert.deepEqual(piano.conteggi, { programmi: 2, schede: 2, esercizi: 2, sedute: 3, seduteEscluse: 0, v1DoppioniSaltati: 0 });
  assert.equal(piano.totaleScritture, 9);
  assert.equal(piano.voci.length, 9);
});

test("48.4 le archiviate restano fuori ma vengono contate, le schede non si confondono", () => {
  const piano = pianoDiCopia({ programmi: programmiFinti, schede: schedeFinte, sedute: seduteFinte });
  assert.equal(piano.esclusi.archiviate, 1);
  assert.equal(piano.voci.filter((v) => v.famiglia === "archiviate").length, 0);
  assert.equal(piano.conteggi.schede, 2, "un archivio non deve finire fra le schede attive");
});

test("48.5 se in A non ci sono esercizi il numero è 0, non manca", () => {
  const schedeSenzaEsercizi = schedeFinte.filter((d) => !d.id.startsWith("program-v2-exercise-"));
  const piano = pianoDiCopia({ programmi: [], schede: schedeSenzaEsercizi, sedute: [] });
  assert.equal(piano.conteggi.esercizi, 0);
  const riga = riepilogo(piano).find((r) => r.chiave === "esercizi");
  assert.ok(riga, "la famiglia deve comparire anche a zero");
  assert.equal(riga.quante, 0);
});

test("48.6 il confronto copre anche gli esercizi", () => {
  const piano = pianoDiCopia({ programmi: [], schede: schedeFinte, sedute: [] });
  const confronto = confrontaCopia(piano, {
    schede: piano.voci.filter((v) => v.famiglia === "schede").map((v) => ({ id: v.id, dati: v.dati })),
    esercizi: piano.voci.filter((v) => v.famiglia === "esercizi").map((v) => ({ id: v.id, dati: v.dati })),
    programmi: [],
    sedute: []
  });
  const riga = confronto.find((c) => c.chiave === "esercizi");
  assert.equal(riga.atteso, 2);
  assert.equal(riga.scritto, 2);
  assert.equal(riga.esito, "coincide");

  const bucato = confrontaCopia(piano, { schede: [], esercizi: [], programmi: [], sedute: [] });
  assert.equal(bucato.find((c) => c.chiave === "esercizi").esito, "no");
  assert.equal(bucato.find((c) => c.chiave === "esercizi").mancanti.length, 2);
});

test("48.7 la fotografia dichiara gli esercizi copiati", () => {
  const piano = pianoDiCopia({ programmi: [], schede: schedeFinte, sedute: [] });
  const doc = fotografia({ uid: "u1", quando: new Date("2026-11-07T10:30:00"), conteggi: piano.conteggi, esclusi: piano.esclusi });
  assert.equal(doc.copiati.esercizi, 2);
  const riga = descriviFotografia(doc);
  assert.ok(riga.indexOf("esercizi 2") !== -1, "la riga a schermo deve dire quanti esercizi: " + riga);
  assert.ok(riga.indexOf("7 novembre 2026") !== -1, "la data deve essere leggibile: " + riga);
});

test("48.8 la pagina ha i due momenti separati e la copia parte spenta", () => {
  const html = readFileSync(join(radice, "desktop", "copia-b.html"), "utf8");
  assert.ok(/id=" conta"/.test(html) === false, "controllo di sanità sul test stesso");
  assert.ok(html.indexOf('id="conta"') !== -1, "manca il pulsante del conteggio");
  assert.ok(html.indexOf('id="copia"') !== -1, "manca il pulsante della copia");
  assert.ok(/<button id="copia" disabled>/.test(html), "la copia deve nascere disabilitata");
  assert.ok(/<button id="conta">/.test(html), "il conteggio deve essere utilizzabile subito");

  const pagina = readFileSync(join(radice, "desktop", "copia-b.js"), "utf8");
  assert.ok(pagina.indexOf("copiaEsercizio") !== -1, "la pagina deve copiare anche gli esercizi");
  assert.ok(pagina.indexOf('el("copia").disabled = true') !== -1, "la copia va spenta durante il conteggio");
  assert.ok(pagina.indexOf("Prima conta") !== -1, "senza piano la copia deve rifiutarsi");
});
