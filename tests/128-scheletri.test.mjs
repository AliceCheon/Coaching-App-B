/* tests/128-scheletri.test.mjs — extra-3: la pagina «Scheletri».
 *
 * Ogni prova si prepara la sua pagina da sola (una JSDOM, un riepilogo, un
 * editor finto): si puo' lanciare per nome, con --test-name-pattern="128.3",
 * e non dipende da quello che ha fatto la prova prima.
 *
 * Si guarda la PAGINA VERA (desktop/index.html) disegnata da
 * comune/vista-programma.js: l'elenco, i due tasti, la conferma coi numeri
 * esatti, e cosa arriva all'editor quando si conferma. Le scritture vere in B
 * (editor + finta zona) hanno le loro prove nella 121/124.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { riepilogoProgramma } from "../comune/programma.js";
import { ricostruisciSchede } from "../comune/schede-v2.js";
import { renderProgramma } from "../comune/vista-programma.js";
import { elencoScheletri, fraseApplica, fraseElimina } from "../comune/scheletri.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagina = readFileSync(join(radice, "desktop", "index.html"), "utf8");

const meta = {
  id: "prg128", name: "Scheletri", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, rotation: ["A", "B"],
  description: "", createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};
let seq = 0;
const sett = (serie) => Array.from({ length: 8 }, (_, i) => ({ week: i + 1, sets: serie, reps: "10", rest: { seconds: 120 } }));
const ESE = (nome) => ({ id: "ex-128-" + (++seq), name: nome, muscle: "dorsali", prescription: { sets: 4, rest: { seconds: 90 } }, progression: { weeks: sett(4) } });
const schedaDoc = (cod, esercizi) => ({
  id: "s-prg128-" + cod,
  dati: { programId: "prg128", sheetId: "sh-" + cod, kind: "sheet", sheet: { id: "sh-" + cod, code: cod, name: "Dorsali " + cod, exercises: esercizi } }
});
const contoScheda = { codice: "A", esercizi: 2, tecniche: 0, righe: 2, modifiche: 0 };

/* Gli scheletri arrivano alla vista gia' letti da elencoScheletri: nome, data,
 * numero di esercizi, dal piu' recente. Qui si usano documenti veri passati a
 * quella funzione, cosi' la prova non inventa la forma. */
const docScheletro = (id, nome, creatoIl, quanti) => ({
  id: id,
  dati: {
    tipo: "scheletro", nome: nome, creatoIl: creatoIl,
    esercizi: Array.from({ length: quanti }, (_, i) => ({ nome: nome + " " + (i + 1), distretto: "dorsali", serie: 4, ripetizioni: "10", nota: "", superserie: "", tecniche: [] }))
  }
});
const scheletri = () => [
  docScheletro("sk-vecchio", "Dorsali base", "2026-09-20T10:00:00.000Z", 2),
  docScheletro("sk-nuovo", "Spinta completa", "2026-11-10T10:00:00.000Z", 3)
];

/* La pagina, disegnata una volta per prova. `conEditor: false` serve alla prova
 * del rifiuto: la pagina senza editor non deve fingere di aver scritto. */
function paginaVera(opzioni) {
  const o = opzioni || {};
  const dom = new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
  const doc = dom.window.document;
  dom.window.setTimeout = () => 0;
  const chiamate = [];
  const mod = {
    attivo: true,
    annullabile: false,
    conta: () => contoScheda,
    onCambia: (richiesta) => { chiamate.push(richiesta); return Promise.resolve(o.risposta || { ok: true, testo: "fatto" }); },
    svuotaProgramma: () => Promise.resolve({ ok: true })
  };
  const contenitore = doc.querySelector("#programma-attivo");
  assert.ok(contenitore, "la pagina vera ha il contenitore #programma-attivo");
  const schede = o.schede || [schedaDoc("A", [ESE("Rematore"), ESE("Trazioni")])];
  const r = riepilogoProgramma(meta, [], {
    schedeV2: ricostruisciSchede(schede), indice: 0, totaleProgrammi: 1,
    oggi: new Date(Date.UTC(2026, 10, 4)), quante: 8
  });
  if (o.conScheletri !== false) r.scheletri = elencoScheletri(o.testoScheletri || scheletri());
  const extra = { modifica: o.conEditor === false ? null : mod };
  renderProgramma(doc, contenitore, { presente: true, numeroSedute: 0 }, Object.assign(r, extra));
  return { dom, doc, chiamate, contenitore };
}

const righe = (s) => Array.from(s.doc.querySelectorAll("#programma-attivo .sk-carta .sk-riga"));
const tastoIn = (s, dentro, parola) => Array.from(dentro.querySelectorAll("button")).filter((b) => String(b.textContent || "").trim() === parola)[0] || null;
const carta = (s) => s.doc.querySelector("#programma-attivo .sk-carta");

test("128.1 la linguetta Scheletri si accende solo se la vista riceve l'elenco", () => {
  const senza = paginaVera({ conScheletri: false });
  assert.equal(carta(senza), null, "senza r.scheletri la pagina Scheletri non deve esistere");
  const con = paginaVera();
  assert.ok(carta(con), "con r.scheletri la pagina Scheletri c'e'");
  const linguetta = Array.from(con.doc.querySelectorAll("#programma-attivo .pr-ntab-extra")).filter((b) => String(b.textContent || "").trim() === "Scheletri")[0];
  assert.ok(linguetta, "la linguetta Scheletri c'e'");
  assert.equal(carta(con).parentNode.hidden, true, "appena disegnata, la pagina Scheletri resta nascosta");
  linguetta.dispatchEvent(new con.dom.window.Event("click"));
  assert.equal(carta(con).parentNode.hidden, false, "il pannello degli scheletri si vede");
});

test("128.2 l'elenco mostra nome, data e numero di esercizi, dal piu' recente", () => {
  const s = paginaVera();
  const rr = righe(s);
  assert.equal(rr.length, 2, "due scheletri, due righe");
  assert.equal(rr[0].getAttribute("data-sk"), "sk-nuovo", "il piu' recente sta in cima");
  assert.equal(rr[1].getAttribute("data-sk"), "sk-vecchio");
  const testo = rr[0].textContent;
  assert.ok(testo.indexOf("Spinta completa") !== -1, "il nome si legge");
  assert.ok(testo.indexOf("3 esercizi") !== -1, "il numero di esercizi si legge: " + testo);
  assert.ok(/\d{2}\/\d{2}\/\d{4}/.test(testo), "la data si legge: " + testo);
});

test("128.3 Applica: la conferma dice i numeri esatti e passa la scheda scelta", () => {
  const s = paginaVera();
  const riga = righe(s)[0];
  const scelta = riga.querySelector("select");
  assert.ok(scelta, "ogni scheletro ha la scelta della scheda");
  scelta.value = scelta.querySelector("option").value;
  tastoIn(s, riga, "Applica a una scheda").dispatchEvent(new s.dom.window.Event("click"));
  const conf = riga.querySelector(".sk-conf");
  assert.ok(conf, "la conferma si apre dentro la pagina");
  const atteso = fraseApplica("Spinta completa", 3, "A", 2);
  assert.ok(conf.textContent.indexOf("Spinta completa") !== -1, "la conferma nomina lo scheletro");
  assert.ok(conf.textContent.indexOf("3 esercizi") !== -1, "la conferma dice quanti esercizi");
  assert.ok(conf.textContent.indexOf("sostituisce 2 righe") !== -1, "la conferma dice quante righe sostituisce: " + conf.textContent);
  assert.ok(conf.textContent.indexOf("senza carichi") !== -1, "la conferma dice che i carichi non si copiano");
  assert.ok(conf.textContent.indexOf(atteso) !== -1, "la frase e' quella di scheletri.js");
  assert.equal(s.chiamate.length, 0, "prima della conferma non si scrive niente");
  tastoIn(s, conf, "Applica").dispatchEvent(new s.dom.window.Event("click"));
  assert.equal(s.chiamate.length, 1, "confermando parte una sola scrittura");
  assert.equal(s.chiamate[0].campo, "applica-scheletro");
  assert.equal(s.chiamate[0].idScheletro, "sk-nuovo");
  assert.equal(s.chiamate[0].idScheda, String(scelta.value));
});

test("128.4 Elimina: la conferma lo dice chiaro e la scrittura e' una sola", () => {
  const s = paginaVera();
  const riga = righe(s)[1];
  tastoIn(s, riga, "Elimina").dispatchEvent(new s.dom.window.Event("click"));
  const conf = riga.querySelector(".sk-conf");
  assert.ok(conf, "la conferma di Elimina si apre dentro la pagina");
  assert.ok(conf.textContent.indexOf(fraseElimina("Dorsali base", 2)) !== -1, "la frase e' quella di scheletri.js: " + conf.textContent);
  assert.ok(conf.textContent.indexOf("la scheda non si tocca") !== -1, "la conferma dice che la scheda non si tocca");
  assert.equal(s.chiamate.length, 0, "prima della conferma non si cancella niente");
  const si = Array.from(conf.querySelectorAll("button")).filter((b) => String(b.textContent || "").trim() === "Elimina")[0];
  assert.ok(si, "il tasto che conferma c'e'");
  si.dispatchEvent(new s.dom.window.Event("click"));
  assert.equal(s.chiamate.length, 1, "confermando parte una sola scrittura");
  assert.equal(s.chiamate[0].campo, "elimina-scheletro");
  assert.equal(s.chiamate[0].idScheletro, "sk-vecchio");
});

test("128.5 senza editor la pagina dice che non ha scritto niente", () => {
  const s = paginaVera({ conEditor: false });
  const riga = righe(s)[0];
  tastoIn(s, riga, "Applica a una scheda").dispatchEvent(new s.dom.window.Event("click"));
  assert.equal(riga.querySelector(".sk-conf"), null, "senza editor non si apre nessuna conferma");
  const esito = riga.querySelector(".sk-esito");
  assert.ok(esito, "la riga dell'esito c'e'");
  assert.ok(esito.textContent.indexOf("non ho scritto niente") !== -1, "l'esito lo dice: " + esito.textContent);
  assert.equal(esito.getAttribute("data-ok"), "no");
});

test("128.6 se le regole Firestore rifiutano, l'esito lo dice con quelle parole", async () => {
  const s = paginaVera({ risposta: { ok: false, motivo: "Missing or insufficient permissions." } });
  const riga = righe(s)[0];
  tastoIn(s, riga, "Elimina").dispatchEvent(new s.dom.window.Event("click"));
  const conf = riga.querySelector(".sk-conf");
  const si = Array.from(conf.querySelectorAll("button")).filter((b) => String(b.textContent || "").trim() === "Elimina")[0];
  si.dispatchEvent(new s.dom.window.Event("click"));
  await new Promise((r) => setImmediate(r));
  const esito = riga.querySelector(".sk-esito");
  assert.ok(esito, "la riga dell'esito c'e'");
  assert.ok(esito.textContent.indexOf("Le regole Firestore hanno rifiutato") !== -1, "il rifiuto si legge: " + esito.textContent);
  assert.ok(esito.textContent.indexOf("non ho toccato la scheda") !== -1);
  assert.equal(esito.getAttribute("data-ok"), "no");
});
