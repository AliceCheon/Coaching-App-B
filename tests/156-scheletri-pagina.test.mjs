/* Guardia 156 (passo 34): la pagina Scheletri legge e scrive davvero.
 *
 *  156.1  le linguette dicono la verità: «Miei scheletri» accesa, Template e
 *         Libreria Coach spente col motivo, e senza i numeri 5 e 34 scritti a mano
 *  156.2  «Miei scheletri» mostra la raccolta letta dalla zona B (e la dice vuota
 *         quando è vuota, senza inventare righe)
 *  156.3  «Salva Scheletro» scrive uno scheletro vero in bdB_atleti/<uid>/scheletri
 *         e lo fa comparire nella raccolta
 *  156.4  la frase «ti ho portato in Programma 2» non esiste più, e la pagina non
 *         promette più un programma nuovo
 *  156.5  la scrittura rifiutata dice «Scheletro non salvato: motivo», mai «salvato»
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM } from "jsdom";
import { scheletroDaCostruttore, salvaScheletroCostruito, elencoScheletri } from "../comune/scheletri.js";
import { leggiScheletriB } from "../comune/scritture-b.js";
import { montaPaginaScheletri, testoRifiuto } from "../comune/vista-scheletri-pagina.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagina = readFileSync(join(radice, "desktop", "index.html"), "utf8");

function fintoDb(opzioni) {
  const o = opzioni || {};
  const scritture = [];
  const foglia = (pezzi) => ({
    get: () => Promise.resolve({ exists: Boolean(o.esiste), data: () => o.dati || {} }),
    set: (valore) => {
      if (o.errore) return Promise.reject(new Error(o.errore));
      scritture.push({ percorso: pezzi.join("/"), valore });
      return Promise.resolve();
    }
  });
  const sotto = (pezzi) => ({ doc: (id) => foglia(pezzi.concat([String(id)])) });
  const db = { collection: (r) => ({ doc: (uid) => ({ collection: (s) => sotto([r, String(uid), s]) }) }) };
  return { db, scritture };
}

const COSTRUTTORE = () => ({
  schede: [
    { lettera: "A", gruppo: "Push", righe: [{ nome: "Panca piana", serie: 4, k: "Petto" }, { nome: "Croci", serie: 3, k: "Petto" }] },
    { lettera: "B", gruppo: "Pull", righe: [{ nome: "Rematore bilanciere", serie: 4, k: "Dorsali" }] }
  ]
});

function paginaFinta(servizi) {
  const dom = new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
  const doc = dom.window.document;
  const p = montaPaginaScheletri(doc, Object.assign({ costruttore: COSTRUTTORE }, servizi));
  return { dom, doc, p };
}

/* La pagina lavora con promesse concatenate: si lasciano passare un paio di
 * giri veri, non solo microtask. */
const attesa = (n) => new Promise((r) => setTimeout(r, n || 30));
const tab = (doc, parola) => Array.from(doc.querySelectorAll("#pag-scheletri .sk-tab"))
  .filter((b) => String(b.textContent || "").trim().indexOf(parola) === 0)[0];

test("156.1 le linguette dicono la verità, senza numeri scritti a mano", () => {
  const { doc } = paginaFinta({ leggi: () => Promise.resolve([]) });
  const scheletri = tab(doc, "Scheletri");
  const template = tab(doc, "Template");
  const libreria = tab(doc, "Libreria Coach");
  const miei = tab(doc, "Miei scheletri");
  assert.ok(scheletri && template && libreria && miei, "le quattro linguette ci sono");
  assert.equal(scheletri.disabled, false);
  assert.equal(miei.disabled, false, "«Miei scheletri» è accesa: mostra la raccolta");
  assert.equal(template.disabled, true, "«Template» resta spenta");
  assert.equal(libreria.disabled, true, "«Libreria Coach» resta spenta");
  assert.match(template.title, /ancora in B/, "il motivo si legge: " + template.title);
  assert.match(libreria.title, /ancora in B/, "il motivo si legge: " + libreria.title);
  assert.equal(template.querySelector(".sk-cnt"), null, "via il «5» scritto a mano");
  assert.equal(libreria.querySelector(".sk-cnt"), null, "via il «34» scritto a mano");
});

test("156.2 «Miei scheletri» mostra la raccolta letta, e sa dire vuota", async () => {
  const vuota = paginaFinta({ leggi: () => Promise.resolve([]) });
  await attesa();
  vuota.doc.querySelector("#pag-scheletri .sk-tabbar").querySelectorAll(".sk-tab")[3].click();
  await attesa();
  assert.match(vuota.doc.querySelector("#sk-raccolta").textContent, /Nessuno scheletro salvato/);

  const piena = paginaFinta({
    leggi: () => Promise.resolve([
      { id: "sk-b", nome: "Push Pull", data: "25/11/2026", esercizi: 8, schede: 2, serie: 24 },
      { id: "sk-a", nome: "Gambe", data: "18/11/2026", esercizi: 5, schede: 1, serie: 15 }
    ])
  });
  await attesa();
  piena.doc.querySelector("#pag-scheletri .sk-tabbar").querySelectorAll(".sk-tab")[3].click();
  await attesa();
  const righe = piena.doc.querySelectorAll("#sk-raccolta .skp-riga");
  assert.equal(righe.length, 2, "due scheletri, due righe");
  assert.match(righe[0].textContent, /Push Pull/);
  assert.match(righe[0].textContent, /8 esercizi · 2 schede/, "conto vero: " + righe[0].textContent);
  assert.equal(piena.doc.getElementById("sk-miei").textContent, "2", "il numero nella linguetta è quello letto");
  assert.equal(piena.doc.querySelector("#pag-scheletri .sk-grid").style.display, "none", "il costruttore lascia il posto alla raccolta");
});

test("156.3 «Salva Scheletro» scrive in B e compare nella raccolta", async () => {
  const finto = fintoDb();
  let letta = [];
  const { doc } = paginaFinta({
    leggi: () => Promise.resolve(letta),
    salva: (documento) => salvaScheletroCostruito(documento, { db: finto.db, uid: "u1", seme: "t1", quando: new Date(Date.UTC(2026, 10, 25, 10, 0)) })
      .then((esito) => {
        if (esito.ok) letta = [{ id: esito.id, nome: esito.nome, data: "25/11/2026", esercizi: 3, schede: 2, serie: 11 }];
        return esito;
      })
  });
  doc.getElementById("sk-nome").value = "Push Pull";
  doc.getElementById("sk-salva").click();
  await attesa(60);

  assert.equal(finto.scritture.length, 1, "una scrittura sola");
  const scritto = finto.scritture[0];
  assert.match(scritto.percorso, /^bdB_atleti\/u1\/scheletri\/sk-/, "nella raccolta della zona B: " + scritto.percorso);
  assert.equal(scritto.valore.tipo, "scheletro");
  assert.equal(scritto.valore.nome, "Push Pull");
  assert.equal(scritto.valore.esercizi.length, 3, "i tre esercizi scritti, senza righe vuote");
  assert.deepEqual(scritto.valore.esercizi.map((e) => e.nome), ["Panca piana", "Croci", "Rematore bilanciere"]);
  assert.deepEqual(scritto.valore.esercizi.map((e) => e.distretto), ["Petto", "Petto", "Dorsali"]);
  assert.equal(scritto.valore.schede.length, 2, "la struttura A/B resta scritta accanto");
  assert.equal(scritto.valore.esercizi[0].carico, undefined, "nessun carico: la lista chiusa regge");

  assert.match(doc.getElementById("sk-esito").textContent, /Scheletro «Push Pull» salvato/);
  assert.equal(doc.querySelectorAll("#sk-raccolta .skp-riga").length, 1, "compare subito in «Miei scheletri»");
  assert.equal(doc.querySelector("#pag-scheletri .sk-grid").style.display, "none", "e la raccolta è quella che si vede");
  assert.equal(doc.getElementById("sk-miei").textContent, "1");
});

test("156.4 niente più Programma 2: la pagina non promette un programma nuovo", () => {
  assert.equal(/ti ho portato/i.test(pagina), false, "la frase «ti ho portato lì» non c'è più");
  assert.equal(/diventa un programma nuovo/i.test(pagina), false, "la pagina non dice più che lo scheletro diventa un programma");
  assert.equal(/PROGRAMMI\[/.test(pagina), false, "non esiste più il magazzino dei programmi finti");
  assert.equal(/I tre posti Programma sono occupati/i.test(pagina), false, "via anche quel rifiuto che non voleva dire niente");
});

test("156.5 la scrittura rifiutata non finge di aver salvato", async () => {
  const rotto = fintoDb({ errore: "Missing or insufficient permissions" });
  const esito = await salvaScheletroCostruito(scheletroDaCostruttore(COSTRUTTORE(), { nome: "Push Pull" }), { db: rotto.db, uid: "u1", seme: "t9" });
  assert.equal(esito.ok, false);
  assert.match(esito.messaggio, /^Scheletro non salvato: Missing or insufficient permissions/);
  assert.equal(rotto.scritture.length, 0);

  const doc = { id: "sk-x", dati: { tipo: "scheletro", nome: "Vuoto", creatoIl: "2026-11-25T10:00:00.000Z", esercizi: [] } };
  assert.equal(elencoScheletri([doc])[0].schede, 0, "senza schede resta zero, non undefined");
  assert.equal(elencoScheletri([doc])[0].esercizi, 0, "uno scheletro senza esercizi resta leggibile");
  assert.equal(elencoScheletri([doc])[0].serie, 0);
});

/* La lettura dell'intera raccolta: prima passava da un riferimento con id e
 * senza id rifiutava il percorso, quindi l'elenco non si poteva leggere.
 * Qui si guarda la funzione vera di scritture-b, con uno snapshot come quello
 * del finto (docs) e uno come quello di Firestore (forEach). */
test("156.6 la raccolta si legge intera, con i due tipi di elenco", async () => {
  const dati = [
    { id: "sk-1", dati: { tipo: "scheletro", nome: "Push Pull", creatoIl: "2026-11-25T10:00:00.000Z", esercizi: [{ nome: "Panca", serie: 4 }] } },
    { id: "sk-2", dati: { tipo: "scheletro", nome: "Gambe", creatoIl: "2026-11-18T10:00:00.000Z", esercizi: [{ nome: "Squat", serie: 5 }] } }
  ];
  const conDocs = {
    collection: () => ({ doc: () => ({ collection: () => ({ get: () => Promise.resolve({ docs: dati.map((d) => ({ id: d.id, data: () => d.dati })) }) }) }) })
  };
  const conForEach = {
    collection: () => ({ doc: () => ({ collection: () => ({ get: () => Promise.resolve({ forEach: (cb) => dati.forEach((d) => cb({ id: d.id, data: () => d.dati })) }) }) }) })
  };
  for (const db of [conDocs, conForEach]) {
    const letti = await leggiScheletriB(db, "u1");
    assert.equal(letti.length, 2, "due scheletri letti");
    const elenco = elencoScheletri(letti);
    assert.deepEqual(elenco.map((s) => s.nome), ["Push Pull", "Gambe"], "dal più recente");
    assert.equal(elenco[0].esercizi, 1);
    assert.equal(elenco[0].serie, 4);
  }
});

/* Il rifiuto del database si legge in italiano: non è un tasto rotto, è un
 * permesso che manca (successo in produzione il 26/11 con la raccolta nuova). */
test("156.7 il permesso mancante si spiega, e la linguetta lo dice", async () => {
  assert.match(testoRifiuto("Missing or insufficient permissions"), /regole del database/);
  assert.match(testoRifiuto("PERMISSION_DENIED"), /permesso in più/);

  const { doc } = paginaFinta({ leggi: () => Promise.reject(new Error("Missing or insufficient permissions")) });
  await attesa();
  doc.querySelector("#pag-scheletri .sk-tabbar").querySelectorAll(".sk-tab")[3].click();
  await attesa();
  const riga = doc.getElementById("sk-esito-raccolta");
  assert.match(riga.textContent, /Le regole del database non permettono/);
  assert.equal(/Missing or insufficient/.test(riga.textContent), false, "niente messaggio grezzo del database");
});

/* L'elenco degli esercizi che esce sotto la riga veniva tagliato dalla scheda
 * (overflow:hidden): sulle ultime righe non si poteva scegliere niente.
 * Qui si guarda la regola di stile e la funzione che apre la lista. */
test("156.8 l'elenco degli esercizi non resta tagliato dalla scheda", () => {
  const css = pagina;
  const scheda = (css.match(/\.sk-scheda\{[^}]*\}/) || [""])[0];
  assert.ok(scheda, "la regola .sk-scheda c'è");
  assert.equal(/overflow\s*:\s*hidden/.test(scheda), false, "la scheda non taglia più quello che esce: " + scheda);
  const sug = (css.match(/\.sk-sug\{[^}]*\}/) || [""])[0];
  assert.match(sug, /z-index\s*:\s*(\d+)/, "l'elenco sta sopra il resto della pagina");
  assert.match(css, /\.sk-sug\.su\{[^}]*bottom/, "esiste la variante che si apre verso l'alto");
  assert.match(css, /function apriSug\(/, "esiste la funzione che sceglie sopra o sotto");
  assert.match(css, /sotto < 200/, "e decide guardando lo spazio che resta sotto la riga");
});
