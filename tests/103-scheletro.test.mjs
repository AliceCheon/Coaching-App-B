/* tests/103-scheletro.test.mjs — B.21 commit 2: «Salva come scheletro».
 *
 * I primi tre test caricano la PAGINA VERA (desktop/index.html) e disegnano
 * dentro #programma-attivo, come fa app-v31.js: il tasto guardato e' quello che
 * Alice vede, il riquadro e' quello che si apre in pagina, e la riga dell'esito
 * e' quella che legge. Gli ultimi tre provano il modello: lista chiusa (nessun
 * carico, nessun Logbook, nessuna settimana), nome proposto, e la scrittura che
 * fallisce che NON deve dire «salvato».
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
import {
  scheletroDaScheda, salvaScheletroDaScheda, nomeProposto,
  messaggioSalvato, messaggioNonSalvato
} from "../comune/scheletri.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagina = readFileSync(join(radice, "desktop", "index.html"), "utf8");

const meta = {
  id: "prg103", name: "Scheletri", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, rotation: ["A", "B"],
  description: "", createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};
let seq = 0;
const sett = (serie, label) => Array.from({ length: 8 }, (_, i) => ({ week: i + 1, sets: serie, reps: { label: label }, rest: { seconds: 120 } }));
const ESE = (nome, sup) => ({ id: "ex-" + (++seq), name: nome, nome: nome, muscolo: "dorsali", nota: "", sup: sup || "", prescription: { sets: 4, rest: { seconds: 90 } }, progression: { weeks: sett(4, "10-8") } });
const schedaDoc = (cod, esercizi) => ({ id: "s-prg103-" + cod, dati: { programId: "prg103", sheetId: "sh-" + cod, kind: "sheet", sheet: { id: "sh-" + cod, code: cod, name: "Dorsali " + cod, exercises: esercizi } } });

const contoScheda = { codice: "A", esercizi: 2, tecniche: 1, righe: 3, modifiche: 2 };

function paginaVera(schede, risposta) {
  const dom = new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
  const doc = dom.window.document;
  const win = dom.window;
  win.setTimeout = () => 0;
  const chiamate = [];
  const mod = {
    attivo: true,
    annullabile: false,
    conta: () => contoScheda,
    onCambia: (r) => { chiamate.push(r); return Promise.resolve(typeof risposta === "function" ? risposta(r) : risposta || { ok: true }); },
    svuotaProgramma: () => Promise.resolve({ ok: true })
  };
  const contenitore = doc.querySelector("#programma-attivo");
  assert.ok(contenitore, "la pagina vera ha il contenitore #programma-attivo");
  const r = riepilogoProgramma(meta, [], { schedeV2: ricostruisciSchede(schede), indice: 0, totaleProgrammi: 1, oggi: new Date(Date.UTC(2026, 10, 4)), quante: 8 });
  renderProgramma(doc, contenitore, { presente: true, numeroSedute: 0 }, Object.assign({}, r, { modifica: mod }));
  return { doc, win, chiamate, contenitore };
}

const una = () => [schedaDoc("A", [ESE("Rematore bilanciere"), ESE("Trazioni")])];
const tasto = (s, parola) => Array.from(s.doc.querySelectorAll("#programma-attivo .pr-bar button")).filter((b) => b.textContent.trim() === parola)[0] || null;
const svuotaMicro = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

test("103.1 sulla pagina vera il tasto \u00abSalva come scheletro\u00bb c'e', e' acceso e non dice \u00abspento\u00bb", () => {
  const s = paginaVera(una());
  const b = tasto(s, "Salva come scheletro");
  assert.ok(b, "il tasto sta nella barra vera");
  assert.equal(b.disabled, false, "ed e' acceso");
  assert.ok(!/spento/.test(String(b.title || "")), "senza tooltip \u00abspento\u00bb: " + b.title);
});

test("103.2 il riquadro si apre in pagina col nome proposto, e il salvataggio riuscito dice \u00absalvato\u00bb", async () => {
  const s = paginaVera(una(), { ok: true, testo: "Scheletro \u00abSpinta A\u00bb salvato" });
  tasto(s, "Salva come scheletro").click();
  const box = s.doc.querySelector("#programma-attivo .pr-conf");
  assert.ok(box, "il riquadro sta dentro la pagina, non in una finestrella del browser");
  const campo = box.querySelector(".pr-conf-in");
  assert.ok(campo, "c'e' il campo del nome");
  assert.equal(s.doc.activeElement, campo, "il fuoco parte dal nome, non da un tasto");
  assert.match(campo.value, /^Scheletro dalla scheda A \u00b7 \d\d\/\d\d\/\d{4}$/, "il nome proposto: " + campo.value);
  campo.value = "Spinta A";
  box.querySelector('[data-igiene="salva-scheletro"]').click();
  assert.equal(s.chiamate.length, 1, "una chiamata sola");
  assert.equal(s.chiamate[0].campo, "salva-scheletro", "col campo giusto");
  assert.equal(s.chiamate[0].nome, "Spinta A", "col nome scelto da Alice");
  await svuotaMicro();
  const esito = s.doc.querySelector("#programma-attivo .pr-esito");
  assert.ok(esito, "la pagina mostra l'esito");
  assert.equal(esito.getAttribute("data-esito"), "salvato");
  assert.ok(/salvato/.test(esito.textContent) && !/non salvato/.test(esito.textContent), "e dice: " + esito.textContent);
});

test("103.3 se la scrittura fallisce la pagina dice \u00abnon salvato\u00bb col motivo, mai \u00absalvato\u00bb", async () => {
  const s = paginaVera(una(), { ok: false, motivo: "Scheletro non salvato: permesso negato dalle regole" });
  tasto(s, "Salva come scheletro").click();
  s.doc.querySelector('[data-igiene="salva-scheletro"]').click();
  await svuotaMicro();
  const esito = s.doc.querySelector("#programma-attivo .pr-esito");
  assert.ok(esito, "la pagina mostra l'esito");
  assert.equal(esito.getAttribute("data-esito"), "non-salvato");
  assert.ok(esito.textContent.indexOf("Scheletro non salvato: permesso negato dalle regole") === 0, "il testo vero: " + esito.textContent);
});

/* --- il modello ------------------------------------------------------------- */

const kg = {
  id: "ex-kg", nome: "Rematore bilanciere", distretto: "dorsali", muscolo: "dorsali",
  sup: "S1", nota: "fermo in basso, gomiti stretti",
  kg: 82.5, carico: "82,5 kg", carichi: [80, 82.5, 85],
  logbook: { ultimaSessione: "2026-11-10", serie: [{ kg: 82.5, reps: 8 }] },
  prescription: { sets: 4, rest: { seconds: 90 } },
  progression: { weeks: sett(4, "10-8").map((w) => Object.assign({}, w, { kg: 82.5 })) }
};
const tecnica = { id: "tec-1", tipo: "tecnica", padreId: "ex-kg", nota: "fermo in basso" };
const altra = { id: "ex-2", nome: "Trazioni", distretto: "dorsali", muscolo: "dorsali", prescription: { sets: 3 }, progression: { weeks: sett(3, "6-8") } };
const documento = () => ({ versione: 7, sheet: { id: "sh-A", code: "A", name: "Dorsali A", nota: "scheda di spinta", exercises: [kg, tecnica, altra] } });

test("103.4 lo scheletro porta la struttura e NIENTE carichi, niente Logbook, niente settimane", () => {
  const sk = scheletroDaScheda(documento(), { nome: "Spinta A", quando: new Date(Date.UTC(2026, 10, 16, 9, 0)) });
  const testo = JSON.stringify(sk);
  for (const parola of ["kg", "carico", "carichi", "logbook", "progression", "weeks", "82.5"]) {
    assert.equal(testo.indexOf(parola), -1, "nello scheletro non deve comparire \u00ab" + parola + "\u00bb: " + testo);
  }
  assert.equal(sk.tipo, "scheletro");
  assert.equal(sk.nome, "Spinta A");
  assert.equal(sk.nomeScheda, "Dorsali A");
  assert.equal(sk.notaScheda, "scheda di spinta");
  assert.equal(sk.creatoIl, "2026-11-16T09:00:00.000Z");
  assert.equal(sk.esercizi.length, 2, "due esercizi vivi (la riga tecnica non e' un esercizio)");
  assert.equal(sk.esercizi[0].nome, "Rematore bilanciere");
  assert.equal(sk.esercizi[0].distretto, "dorsali");
  assert.equal(sk.esercizi[0].serie, 4, "le serie si leggono dalla prima settimana");
  assert.equal(sk.esercizi[0].ripetizioni, "10-8");
  assert.equal(sk.esercizi[0].nota, "fermo in basso, gomiti stretti");
  assert.equal(sk.esercizi[0].superserie, "S1", "il legame di superserie serve a ricostruire la struttura");
  assert.equal(sk.esercizi[0].tecniche.length, 1, "la riga tecnica figlia c'e'");
  assert.equal(sk.esercizi[0].tecniche[0].tecnica, "tecnica");
  assert.equal(sk.esercizi[1].superserie, "");
  assert.deepEqual(Object.keys(sk.esercizi[0]).sort(), ["distretto", "nome", "nota", "ripetizioni", "serie", "superserie", "tecniche"], "la riga ha solo le chiavi della lista chiusa");
  assert.deepEqual(Object.keys(sk).sort(), ["creatoIl", "esercizi", "nome", "nomeScheda", "notaScheda", "tipo"], "e il documento pure");
});

test("103.5 il nome proposto e' \u00abScheletro dalla scheda A \u00b7 16/11/2026\u00bb", () => {
  assert.equal(nomeProposto("A", new Date(Date.UTC(2026, 10, 16, 12, 0))), "Scheletro dalla scheda A \u00b7 16/11/2026");
  assert.equal(nomeProposto("", new Date(Date.UTC(2026, 0, 5, 12, 0))), "Scheletro dalla scheda \u00b7 05/01/2026");
  assert.equal(messaggioSalvato("Spinta A"), "Scheletro \u00abSpinta A\u00bb salvato");
  assert.equal(messaggioNonSalvato("permesso negato"), "Scheletro non salvato: permesso negato");
  assert.equal(messaggioNonSalvato(""), "Scheletro non salvato: motivo non dichiarato");
});

/* Un finto Firestore: la catena vera e' db.collection(radice).doc(uid)
 * .collection(sotto).doc(id) -> get/set. */
function fintoDb(opzioni) {
  const o = opzioni || {};
  const scritture = [];
  const percorso = (pezzi) => pezzi.join("/");
  const foglia = (pezzi) => ({
    get: () => Promise.resolve({ exists: Boolean(o.esiste), data: () => o.dati || {} }),
    set: (valore) => {
      if (o.errore) return Promise.reject(new Error(o.errore));
      scritture.push({ percorso: percorso(pezzi), valore: valore });
      return Promise.resolve();
    }
  });
  const sotto = (pezzi) => ({ doc: (id) => foglia(pezzi.concat([String(id)])) });
  const db = {
    collection: (radice) => ({
      doc: (uid) => ({ collection: (s) => sotto([radice, String(uid), s]) })
    })
  };
  return { db: db, scritture: scritture };
}

test("103.6 la scrittura rifiutata dice \u00abScheletro non salvato: motivo\u00bb e non finge di aver salvato", async () => {
  const rotto = fintoDb({ errore: "Missing or insufficient permissions" });
  const no = await salvaScheletroDaScheda(documento(), { nome: "Spinta A", seme: "t1" }, { db: rotto.db, uid: "u1", quando: new Date(Date.UTC(2026, 10, 16, 9, 0)) });
  assert.equal(no.ok, false, "non e' andata");
  assert.equal(no.messaggio, "Scheletro non salvato: Missing or insufficient permissions", "il messaggio vero: " + no.messaggio);
  assert.equal(/salvato\b/.test(no.messaggio) && !/non salvato/.test(no.messaggio), false, "mai un \u00absalvato\u00bb da solo");
  assert.equal(rotto.scritture.length, 0, "non e' passato niente");

  const buono = fintoDb({ esiste: false });
  const si = await salvaScheletroDaScheda(documento(), { nome: "Spinta A", seme: "t2" }, { db: buono.db, uid: "u1", quando: new Date(Date.UTC(2026, 10, 16, 9, 0)) });
  assert.equal(si.ok, true, si.motivo);
  assert.equal(si.messaggio, "Scheletro \u00abSpinta A\u00bb salvato");
  assert.equal(si.versione, 1, "primo salvataggio: versione 1");
  assert.equal(buono.scritture.length, 1, "una scrittura sola");
  assert.match(buono.scritture[0].percorso, /^bdB_atleti\/u1\/scheletri\/sk-/, "nella collezione scheletri della zona B: " + buono.scritture[0].percorso);
  assert.equal(buono.scritture[0].valore.versione, 1);

  const gia = fintoDb({ esiste: true, dati: { versione: 3 } });
  const ancora = await salvaScheletroDaScheda(documento(), { nome: "Spinta A", seme: "t3" }, { db: gia.db, uid: "u1", quando: new Date(Date.UTC(2026, 10, 16, 10, 0)) });
  assert.equal(ancora.versione, 4, "la versione avanza: 3 -> 4");
});
