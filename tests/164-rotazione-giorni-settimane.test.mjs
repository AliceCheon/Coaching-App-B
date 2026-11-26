/* Guardia 164 (punto 15 della lista di Alice): nella carta «Programma» giorni a
 * settimana, settimane e rotazione si scrivono come Data inizio e Fase —
 * stessa strada (cambiaTestataProgramma), stesso registro, stesso Annulla.
 *
 *  164.1  giorni a settimana: intero 1..7, salvato come numero, voce con
 *         prima/dopo; 0, 8 e il testo libero si rifiutano
 *  164.2  settimane: intero 1..52; 0, 99 e il testo libero si rifiutano
 *  164.3  rotazione: «A B C D», «A,B,C,D» e «ABCD» sono lo stesso elenco;
 *         duplicati, più di 7 e caratteri non-lettera si rifiutano
 *  164.4  il campo vuoto toglie il valore (giorni, settimane, rotazione)
 *  164.5  l'Annulla rimette il valore di prima, rotazione compresa
 *  164.6  nella pagina: Gg/sett è una tendina 1..7, Settimane un campo
 *         numerico, la rotazione un campo scrivibile (le pastiglie restano
 *         come anteprima)
 *  164.7  i tre campi arrivano a cambiaTestataProgramma e producono la voce
 *         con prima/dopo; un rifiuto non scrive niente, dice il motivo in
 *         italiano e lascia nel campo quello che è stato scritto
 *  164.8  il «+» aggiunge la lettera successiva al campo (non è un tasto
 *         morto) e le pastiglie seguono quello che è scritto
 *  164.9  il prospetto segue durationWeeks: 8 settimane = 8 righe, 12 = 12;
 *         con 7 giorni la riga ha 7 colonne
 */

import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { ricostruisciSchede } from "../comune/schede-v2.js";
import { riepilogoProgramma } from "../comune/programma.js";
import { renderProgramma } from "../comune/vista-programma.js";
import { collegaPiano } from "../comune/piano-vivo.js";
import { cambiaTestataProgramma, annullaModifica, lettereRotazione } from "../comune/modifiche-b.js";

const QUANDO = "2026-11-26T15:00:00.000Z";
const meta = (extra) => Object.assign({
  id: "prg-15", name: "Blocco 15", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, rotation: ["A", "B", "C"],
  description: "", message: "", createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
}, extra || {});

const documento = () => ({
  id: "program-v2-meta-prg-15", versione: 2, startDate: "2026-10-05", phase: "Bulk",
  daysPerWeek: 4, durationWeeks: 8, rotation: ["A", "B", "C"]
});

const scrivi = (campo, valore) => cambiaTestataProgramma(documento(), {
  idProgramma: "program-v2-meta-prg-15", campo: campo, valore: valore
}, { quando: QUANDO, uid: "u1" });

/* Una scena nuda: la carta del programma senza i 5,6 MB della pagina intera. */
function scena(metaProgramma) {
  const scelta = meta(metaProgramma);
  const dom = new JSDOM("<!doctype html><html><body><div id=\"g\"></div></body></html>");
  const doc = dom.window.document;
  const r = riepilogoProgramma(scelta, [], {
    schedeV2: ricostruisciSchede([]), indice: 0, totaleProgrammi: 1,
    oggi: new Date(Date.UTC(2026, 10, 26)), quante: 8
  });
  renderProgramma(doc, doc.querySelector("#g"), { presente: true, numeroSedute: 0 }, r);
  return { dom, doc, r };
}

const attesa = () => new Promise((r) => setTimeout(r, 5));

/* L'editor finto fa passare le richieste dalla funzione pura vera: così la
 * prova misura quello che succede nella pagina, non un finto più permissivo. */
function collega(doc, stato, registri) {
  const editor = {
    modifica: () => Promise.resolve({ ok: true }),
    testataProgramma: (richiesta) => {
      const esito = cambiaTestataProgramma(stato.dati, richiesta, { quando: QUANDO, uid: "u1" });
      registri.richieste.push(richiesta);
      registri.esiti.push(esito);
      if (esito.ok) {
        stato.dati = esito.dati;
        registri.voci.push(esito.voce);
      }
      return Promise.resolve(esito.ok ? { ok: true, voce: esito.voce } : { ok: false, motivo: esito.motivo });
    }
  };
  collegaPiano(doc, {
    editor: editor,
    piani: {},
    programma: {
      id: "program-v2-meta-prg-15",
      inizio: stato.dati.startDate,
      fase: stato.dati.phase,
      giorni: stato.dati.daysPerWeek,
      settimane: stato.dati.durationWeeks,
      rotazione: (stato.dati.rotation || []).join(" ")
    },
    segnala: (testo, tono) => registri.messaggi.push({ testo: testo, tono: tono }),
    sincronizza: () => Promise.resolve()
  });
}

const campo = (doc, chiave) => doc.querySelector('[data-pr-c="' + chiave + '"]');

/* --------------------------------------------------------- le regole pure */

test("164.1 giorni a settimana: intero 1..7, con la voce prima/dopo", () => {
  const e = scrivi("giorni", "5");
  assert.equal(e.ok, true, e.motivo);
  assert.equal(e.dati.daysPerWeek, 5, "i giorni si salvano come numero");
  assert.equal(e.dati.versione, 3, "la versione avanza di uno");
  assert.equal(e.dati.modificatoInB.ultima, "giorni");
  assert.equal(e.voce.tipo, "testata-programma");
  assert.equal(e.voce.campo, "giorni");
  assert.equal(e.voce.prima, "4");
  assert.equal(e.voce.dopo, "5");
  assert.equal(e.voce.versionePrima, 2);
  assert.equal(e.voce.versioneDopo, 3);

  ["0", "8", "-1", "4,5", "quattro", ""].forEach((v) => {
    if (v === "") return; /* il vuoto toglie: lo prova 164.4 */
    const rifiuto = scrivi("giorni", v);
    assert.equal(rifiuto.ok, false, "«" + v + "» non doveva passare");
    assert.match(rifiuto.motivo, /1 a 7/, "il motivo deve dire il range: " + rifiuto.motivo);
  });
});

test("164.2 settimane: intero 1..52, con la voce prima/dopo", () => {
  const e = scrivi("settimane", "10");
  assert.equal(e.ok, true, e.motivo);
  assert.equal(e.dati.durationWeeks, 10);
  assert.equal(e.voce.campo, "settimane");
  assert.equal(e.voce.prima, "8");
  assert.equal(e.voce.dopo, "10");

  ["0", "99", "cinque", "8.5"].forEach((v) => {
    const rifiuto = scrivi("settimane", v);
    assert.equal(rifiuto.ok, false, "«" + v + "» non doveva passare");
    assert.match(rifiuto.motivo, /1 a 52/, "il motivo deve dire il range: " + rifiuto.motivo);
  });
});

test("164.3 rotazione: spazi, virgole o lettere attaccate; duplicati e 8 lettere no", () => {
  ["A B C D", "A,B,C,D", "ABCD", "a,b,c,d", "A · B · C · D"].forEach((v) => {
    const e = scrivi("rotazione", v);
    assert.equal(e.ok, true, "«" + v + "» doveva passare: " + e.motivo);
    assert.deepEqual(e.dati.rotation, ["A", "B", "C", "D"], "«" + v + "» non è normalizzata");
    assert.equal(e.voce.dopo, "A \u00b7 B \u00b7 C \u00b7 D");
    assert.equal(e.voce.prima, "A \u00b7 B \u00b7 C");
  });

  const doppie = scrivi("rotazione", "A B A");
  assert.equal(doppie.ok, false);
  assert.match(doppie.motivo, /ripete A/, "il duplicato deve essere nominato: " + doppie.motivo);

  const otto = scrivi("rotazione", "A B C D E F G H");
  assert.equal(otto.ok, false);
  assert.match(otto.motivo, /massimo.*7|7 schede/i, "più di 7 schede va rifiutato: " + otto.motivo);

  const caratteri = scrivi("rotazione", "A1B");
  assert.equal(caratteri.ok, false, "i numeri non si ripuliscono di nascosto");
  assert.match(caratteri.motivo, /lettere/i);

  const minuscole = lettereRotazione("b a");
  assert.equal(minuscole.ok, true);
  assert.deepEqual(minuscole.lettere, ["B", "A"], "le minuscole si normalizzano in maiuscolo");
});

test("164.4 il campo vuoto toglie il valore, e lo dice", () => {
  const g = scrivi("giorni", "");
  assert.equal(g.ok, true, g.motivo);
  assert.equal("daysPerWeek" in g.dati, false, "giorni vuoti = campo tolto");
  assert.equal(g.voce.dopo, "");

  const s = scrivi("settimane", "");
  assert.equal(s.ok, true, s.motivo);
  assert.equal("durationWeeks" in s.dati, false);

  const r = scrivi("rotazione", "  ");
  assert.equal(r.ok, true, r.motivo);
  assert.equal("rotation" in r.dati, false);
  assert.equal(r.voce.dopo, "");
});

test("164.5 l'Annulla rimette il valore di prima, rotazione compresa", () => {
  const giorni = scrivi("giorni", "6");
  const tornaGiorni = annullaModifica(giorni.dati, giorni.voce, { quando: QUANDO, uid: "u1" });
  assert.equal(tornaGiorni.ok, true, tornaGiorni.motivo);
  assert.equal(tornaGiorni.dati.daysPerWeek, 4);

  const settimane = scrivi("settimane", "12");
  const tornaSettimane = annullaModifica(settimane.dati, settimane.voce, { quando: QUANDO, uid: "u1" });
  assert.equal(tornaSettimane.ok, true, tornaSettimane.motivo);
  assert.equal(tornaSettimane.dati.durationWeeks, 8);

  const rotazione = scrivi("rotazione", "A B C D");
  assert.equal(rotazione.ok, true, rotazione.motivo);
  assert.deepEqual(rotazione.dati.rotation, ["A", "B", "C", "D"]);
  const tornaRotazione = annullaModifica(rotazione.dati, rotazione.voce, { quando: QUANDO, uid: "u1" });
  assert.equal(tornaRotazione.ok, true, tornaRotazione.motivo);
  assert.deepEqual(tornaRotazione.dati.rotation, ["A", "B", "C"], "l'Annulla deve rimettere l'elenco, non il testo");
  assert.equal(tornaRotazione.voce.tipo, "annulla-modifica");
});

/* -------------------------------------------------------- la pagina vera */

test("164.6 nella pagina: tendina 1..7, settimane numeriche, rotazione scrivibile", () => {
  const { doc } = scena();
  const gg = campo(doc, "programma-giorni");
  assert.ok(gg, "manca il campo dei giorni a settimana");
  assert.equal(gg.tagName, "SELECT");
  assert.deepEqual(Array.from(gg.options).map((o) => o.value), ["", "1", "2", "3", "4", "5", "6", "7"]);
  assert.deepEqual(Array.from(gg.options).slice(1).map((o) => o.textContent), ["1 gg/sett", "2 gg/sett", "3 gg/sett", "4 gg/sett", "5 gg/sett", "6 gg/sett", "7 gg/sett"]);
  assert.equal(gg.value, "4", "la tendina mostra il valore salvato");
  assert.equal(gg.disabled, false, "la tendina deve essere scrivibile");

  const sett = campo(doc, "programma-settimane");
  assert.ok(sett, "manca il campo delle settimane");
  assert.equal(sett.tagName, "INPUT");
  assert.equal(sett.value, "8");
  assert.equal(sett.readOnly, false, "le settimane devono essere scrivibili");

  const rot = campo(doc, "programma-rotazione");
  assert.ok(rot, "manca il campo della rotazione");
  assert.equal(rot.tagName, "INPUT");
  assert.equal(rot.value, "A B C", "il campo mostra la rotazione scritta nel documento");
  assert.equal(rot.readOnly, false);

  const chip = Array.from(doc.querySelectorAll("[data-pr-rotchip]")).map((c) => c.textContent.trim());
  assert.deepEqual(chip, ["A", "B", "C"], "le pastiglie sono l'anteprima di quello che è scritto");
  const piu = doc.querySelector("[data-pr-rot-piu]");
  assert.ok(piu, "manca il «+» della rotazione");
  assert.equal(piu.tagName, "BUTTON");
});

test("164.7 i tre campi arrivano a cambiaTestataProgramma; un rifiuto non scrive", async () => {
  const { dom, doc } = scena();
  const stato = { dati: documento() };
  const registri = { richieste: [], esiti: [], voci: [], messaggi: [] };
  collega(doc, stato, registri);

  const gg = campo(doc, "programma-giorni");
  gg.value = "5";
  gg.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  await attesa();
  assert.equal(registri.richieste[registri.richieste.length - 1].campo, "giorni");
  assert.equal(stato.dati.daysPerWeek, 5);
  assert.equal(registri.voci[registri.voci.length - 1].prima, "4");
  assert.equal(registri.voci[registri.voci.length - 1].dopo, "5");
  assert.match(registri.messaggi[registri.messaggi.length - 1].testo, /giorni a settimana: 5/);

  const sett = campo(doc, "programma-settimane");
  sett.value = "10";
  sett.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  await attesa();
  assert.equal(stato.dati.durationWeeks, 10);
  assert.equal(registri.voci[registri.voci.length - 1].campo, "settimane");
  assert.match(registri.messaggi[registri.messaggi.length - 1].testo, /settimane: 10/);

  const rot = campo(doc, "programma-rotazione");
  rot.value = "A B C D";
  rot.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  await attesa();
  assert.deepEqual(stato.dati.rotation, ["A", "B", "C", "D"]);
  assert.equal(registri.voci[registri.voci.length - 1].campo, "rotazione");
  assert.match(registri.messaggi[registri.messaggi.length - 1].testo, /rotazione: A · B · C · D/);

  /* Un rifiuto: 99 settimane non scrive niente, lo dice in italiano e il
   * numero scritto resta nel campo per correggerlo. */
  const primaDelRifiuto = stato.dati.durationWeeks;
  const quanteRichieste = registri.richieste.length;
  sett.value = "99";
  sett.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  await attesa();
  assert.equal(registri.richieste.length, quanteRichieste + 1, "la richiesta parte, ma...");
  assert.equal(registri.esiti[registri.esiti.length - 1].ok, false, "...viene rifiutata");
  assert.equal(stato.dati.durationWeeks, primaDelRifiuto, "il documento non cambia");
  assert.equal(sett.value, "99", "il valore scritto resta nel campo");
  const ultimo = registri.messaggi[registri.messaggi.length - 1];
  assert.equal(ultimo.tono, "errore");
  assert.match(ultimo.testo, /Settimane non salvate: .*1 a 52/);

  /* Anche la rotazione con un doppione: motivo in chiaro, niente scrittura. */
  const rotazionePrima = stato.dati.rotation.slice();
  rot.value = "A A";
  rot.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  await attesa();
  assert.deepEqual(stato.dati.rotation, rotazionePrima);
  assert.match(registri.messaggi[registri.messaggi.length - 1].testo, /Rotazione non salvata: .*ripete A/);

  /* La tendina vuota toglie i giorni: è il modo onesto di dire «non
   * registrato», e il messaggio lo dice. */
  gg.value = "";
  gg.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  await attesa();
  assert.equal("daysPerWeek" in stato.dati, false, "la scelta vuota toglie i giorni");
  assert.match(registri.messaggi[registri.messaggi.length - 1].testo, /giorni a settimana tolti dal programma/);
});

test("164.8 il «+» aggiunge la lettera successiva e le pastiglie seguono il campo", async () => {
  const { dom, doc } = scena();
  const stato = { dati: documento() };
  const registri = { richieste: [], esiti: [], voci: [], messaggi: [] };
  collega(doc, stato, registri);

  const rot = campo(doc, "programma-rotazione");
  const piu = doc.querySelector("[data-pr-rot-piu]");

  /* L'anteprima si aggiorna mentre si scrive, senza aspettare il salvataggio. */
  rot.value = "A B C D";
  rot.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  assert.deepEqual(Array.from(doc.querySelectorAll("[data-pr-rotchip]")).map((c) => c.textContent.trim()), ["A", "B", "C", "D"]);

  /* Il «+» scrive davvero: la lettera dopo C è D. */
  rot.value = "A B C";
  piu.click();
  await attesa();
  assert.equal(rot.value, "A B C D", "il «+» deve aggiungere la lettera al campo");
  assert.deepEqual(stato.dati.rotation, ["A", "B", "C", "D"]);
  assert.equal(registri.richieste[registri.richieste.length - 1].campo, "rotazione");

  /* Con 7 schede il «+» non inventa l'ottava: lo dice. */
  const quante = registri.richieste.length;
  rot.value = "A B C D E F G";
  rot.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  piu.click();
  await attesa();
  assert.equal(registri.richieste.length, quante, "a 7 schede non deve partire un'altra scrittura");
  assert.match(registri.messaggi[registri.messaggi.length - 1].testo, /già 7 schede/);
});

test("164.9 il prospetto segue durationWeeks, e con 7 giorni ha 7 colonne", () => {
  const otto = scena({ durationWeeks: 8 });
  assert.equal(otto.doc.querySelectorAll(".pr-prosp .pr-prow").length, 8, "con 8 settimane il prospetto ha 8 righe");

  const dodici = scena({ durationWeeks: 12 });
  assert.equal(dodici.doc.querySelectorAll(".pr-prosp .pr-prow").length, 12, "con 12 settimane il prospetto ha 12 righe");

  const sette = scena({ daysPerWeek: 7, durationWeeks: 8 });
  const primaRiga = sette.doc.querySelector(".pr-prosp .pr-prow");
  assert.equal(primaRiga.querySelectorAll(".pr-psel").length, 7, "7 giorni a settimana = 7 caselle");
  assert.match(String(primaRiga.style.gridTemplateColumns), /repeat\(7,/, "la riga deve avere 7 colonne vere, non 4");
  const meta = sette.doc.querySelector(".pr-c2 .pr-meta");
  assert.match(String(meta.textContent), /7\/sett/, "la riga di testa deve dire 7 al giorno");
});
