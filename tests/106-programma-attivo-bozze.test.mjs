/* tests/106-programma-attivo-bozze.test.mjs — B.21 PASSO 2b.
 *
 * La regola in una riga: una bozza esplicita (status "draft") non e' un
 * programma attivo per il telefono; per il desktop non cambia niente.
 *
 * Quattro test, le due modalita' sempre confrontate:
 *  1. bozza sola: telefono -> nessun programma, desktop -> ripiego come prima;
 *  2. bozza piu' recente di un attivo esplicito: la bozza non vince mai, e una
 *     bozza con active===true (dato incoerente di A) non passa comunque;
 *  3. status assente e "available" non sono bozze; l'archiviato resta fuori;
 *  4. riepilogoDati: il telefono dice «nessun programma attivo» senza errore,
 *     e l'opzione la chiede solo mobile/app.js.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { programmaAttivo, riepilogoDati } from "../comune/lettura-dati.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");

const nonBozza = (id, extra) => Object.assign(
  { id: id, name: "P " + id, status: "available", updatedAt: "2026-11-01T10:00:00.000Z" },
  extra || {}
);
const bozza = (id, extra) => Object.assign(
  { id: id, name: "Bozza " + id, status: "draft", updatedAt: "2026-11-15T10:00:00.000Z" },
  extra || {}
);

test("106.01 bozza sola: il telefono non ha programma, il desktop ripiega come prima", () => {
  const lista = [bozza("p1")];

  const telefono = programmaAttivo(lista, { escludiBozze: true });
  assert.equal(telefono, null, "il telefono non deve inventare un attivo: la bozza non e' un candidato");

  const desktop = programmaAttivo(lista);
  assert.equal(desktop.programma.id, "p1", "il desktop la bozza la vede ancora");
  assert.equal(desktop.esplicito, false);
  assert.equal(desktop.ripiego, true);
});

test("106.02 bozza piu' recente di un attivo esplicito: non vince mai, nemmeno con active===true", () => {
  const lista = [bozza("p1"), nonBozza("p2", { status: "active", updatedAt: "2026-10-01T10:00:00.000Z" })];
  for (const opz of [{ escludiBozze: true }, {}]) {
    const r = programmaAttivo(lista, opz);
    assert.equal(r.programma.id, "p2", "vince l'attivo esplicito, non la bozza aggiornata piu' di recente");
    assert.equal(r.esplicito, true);
    assert.equal(r.ripiego, false);
  }

  /* Dato incoerente di A: status "draft" ma active===true. Il telefono non lo
   * mostra (l'attivo si spegne sempre in due modi, mai uno solo). */
  const strano = [bozza("p3", { active: true })];
  assert.equal(programmaAttivo(strano, { escludiBozze: true }), null);
  assert.equal(programmaAttivo(strano).programma.id, "p3");
});

test("106.03 status assente e \"available\" non sono bozze; l'archiviato resta fuori", () => {
  const senzaStato = [{ id: "p1", name: "Senza stato", updatedAt: "2026-11-10T10:00:00.000Z" }];
  assert.equal(programmaAttivo(senzaStato, { escludiBozze: true }).programma.id, "p1");

  const disponibile = [nonBozza("p2")];
  assert.equal(programmaAttivo(disponibile, { escludiBozze: true }).programma.id, "p2");

  const conArchiviato = [nonBozza("p3", { status: "archived" }), nonBozza("p4")];
  assert.equal(programmaAttivo(conArchiviato, { escludiBozze: true }).programma.id, "p4");
  assert.equal(programmaAttivo(conArchiviato).programma.id, "p4");

  /* Solo una bozza accanto a un archiviato: senza bozze ammesse non resta
   * niente, e il ripiego finale non deve riesumare la bozza. */
  const niente = [bozza("p5"), nonBozza("p6", { status: "archived" })];
  assert.equal(programmaAttivo(niente, { escludiBozze: true }), null);
});

test("106.04 riepilogoDati: «nessun programma attivo» senza errore, e l'opzione la chiede solo il telefono", () => {
  const letture = { presente: true, stato: {}, sedute: [], programmi: [bozza("p1")] };

  const telefono = riepilogoDati(Object.assign({}, letture, { escludiBozze: true }));
  assert.equal(telefono.programma, null, "nessun attivo: la carta dice il vuoto, non un nome inventato");
  assert.equal(telefono.numeroProgrammi, 1, "il documento esiste e si conta: manca solo l'attivo");
  assert.equal(telefono.programmiNonLetti, false);

  const desktop = riepilogoDati(letture);
  assert.equal(desktop.programma.nome, "Bozza p1");
  assert.equal(desktop.programma.ripiego, true);

  const mobile = readFileSync(join(radice, "mobile", "app.js"), "utf8");
  assert.match(mobile, /escludiBozze: true/);
  assert.match(mobile, /nessun programma attivo/);
  assert.equal(readFileSync(join(radice, "desktop", "app-v31.js"), "utf8").includes("escludiBozze"), false,
    "il desktop non chiede l'esclusione: per lui non cambia niente");
});
