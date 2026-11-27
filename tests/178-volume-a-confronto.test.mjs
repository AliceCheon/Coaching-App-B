/* Guardia 178 (passo 27): il blocco «Volume» del confronto rifatto sul mockup
 * nuovo di Alice — A sullo sfondo, B che ci balla sopra, e la griglia di calore.
 *
 *  178.1  il selettore W1…Wn ha le settimane del PROGRAMMA (durata, non otto
 *         scritte a mano) e cambiare settimana da lì muove anche il confronto
 *  178.2  il Δ c'è solo quando ci sono ENTRAMBI i valori: un distretto che sta
 *         da una parte sola è «n.d.» col motivo, mai uno zero; i riquadri
 *         contano chi sale, chi scende e chi non ha il dato
 *  178.3  la barra A prende i numeri dalla scheda scelta del programma
 *         consultato e la barra B da quella del programma in uso; con due
 *         schede accese la barra è la somma e la riga dice quali
 *  178.4  «Tutte le settimane» disegna una cella per settimana per ogni
 *         distretto e per ognuno dei due programmi, e la settimana che il dato
 *         non scrive è tratteggiata (non zero)
 *  178.5  l'ordinamento cambia l'ordine delle righe (Δ maggiore, Δ minore,
 *         volume della scheda B, A→Z)
 */

import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ricostruisciSchede } from "../comune/schede-v2.js";
import {
  modelloConsultabile, volumeDelleSchede, grandezzeProgramma
} from "../comune/programma-consultabile.js";
import { apriConfronto } from "../comune/vista-programma-consultabile.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagina = readFileSync(join(radice, "desktop", "index.html"), "utf8");

/* Una progressione come la scrive l'app: `serie` può essere un numero (tutte le
 * settimane uguali) o un elenco; `quante` ferma la progressione prima, come una
 * scheda che non scrive le ultime settimane. */
const settimane = (serie, rip, rec, quante) => Array.from({ length: quante == null ? 8 : quante }, (_, i) => ({
  week: i + 1,
  sets: Array.isArray(serie) ? serie[i] : serie,
  reps: rip == null ? "" : (Array.isArray(rip) ? rip[i] : String(rip)),
  rest: rec == null ? {} : { seconds: rec },
  type: "normal", note: "", source: "manual"
}));
const ESE = (nome, muscolo, serie, rip, rec, quante) => ({
  id: "ex-" + nome, name: nome, muscle: muscolo,
  prescription: {
    sets: Array.isArray(serie) ? serie[0] : serie,
    reps: { label: Array.isArray(rip) ? rip[0] : String(rip) },
    rest: rec == null ? {} : { seconds: rec }
  },
  progression: { weeks: settimane(serie, rip, rec, quante) }
});
const foglio = (pid, code, esercizi) => ({
  id: "program-v2-sheet-" + pid + "__sh-" + code,
  dati: { programId: pid, sheetId: "sh-" + code, kind: "sheet", versione: 1,
    sheet: { id: "sh-" + code, code: code, name: "Scheda " + code, exercises: esercizi } }
});
const programma = (id, nome, opzioni) => Object.assign({
  id: id, name: nome, status: "archived", startDate: "2026-05-04",
  durationWeeks: 8, daysPerWeek: 4, rotation: ["A", "B", "C", "D"]
}, opzioni || {});

const euro = (s) => String(s).replace(/\s+/g, " ").trim();
const righeVolume = (doc) => Array.from(doc.querySelectorAll(".pc-vol2-riga"));
const ordine = (doc) => righeVolume(doc).map((r) => r.getAttribute("data-distretto"));
const rigaDi = (doc, distretto) => doc.querySelector('.pc-vol2-riga[data-distretto="' + distretto + '"]');
const nomiRiga = (doc) => righeVolume(doc).map((r) => {
  const nome = r.querySelector(".pc-vol2-nome");
  return euro((nome.firstChild ? nome.firstChild.textContent : "") + " "
    + (nome.querySelector("small") ? nome.querySelector("small").textContent : ""));
});
const deltaDi = (doc, distretto) => {
  const cella = rigaDi(doc, distretto).querySelector(".pc-vol2-delta");
  return { stato: cella.getAttribute("data-stato"), testo: euro(cella.textContent) };
};
const larghezza = (elemento) => Number((/width:\s*([\d.]+)%/.exec(elemento.getAttribute("style") || "") || [])[1]);

function scena(opzioni) {
  const o = opzioni || {};
  const docs = o.docs;
  const s = ricostruisciSchede(docs);
  const dom = new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
  const doc = dom.window.document;
  apriConfronto(doc, {
    consultato: {
      modello: modelloConsultabile(o.a || programma("prg-a", "Consultato"),
        s.perProgramma[(o.a || {}).id || "prg-a"]),
      gruppo: s.perProgramma[(o.a || {}).id || "prg-a"]
    },
    inUso: {
      modello: modelloConsultabile(o.b || programma("prg-b", "In uso", { status: "active", active: true }),
        s.perProgramma[(o.b || {}).id || "prg-b"]),
      gruppo: s.perProgramma[(o.b || {}).id || "prg-b"]
    },
    onSalvaCome: null
  });
  return { dom, doc };
}

test("178.1 il selettore del volume ha le settimane del programma, e da lì si cambia settimana", () => {
  const docs = [
    foglio("prg-a", "A", [ESE("Hip thrust", "Glutei", 4, "10", 120)]),
    foglio("prg-b", "A", [ESE("Hip thrust", "Glutei", 5, "10", 120)])
  ];
  /* Il programma consultato dura 10 settimane: i tasti devono essere dieci, non
   * otto scritti a mano. */
  const { doc } = scena({
    docs: docs,
    a: programma("prg-a", "Lungo", { durationWeeks: 10 })
  });
  const tasti = Array.from(doc.querySelectorAll(".pc-vol2-sett")).map((b) => b.getAttribute("data-w"));
  assert.deepEqual(tasti, ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    "una W per ogni settimana del programma");
  assert.equal(doc.querySelectorAll(".pc-sett").length, 10, "anche la barra in cima ha le stesse settimane");

  /* Scegliendo W6 dal blocco, anche il confronto si sposta: non si leggono due
   * settimane diverse nello stesso pannello. */
  doc.querySelector('.pc-vol2-sett[data-w="6"]').click();
  assert.equal(doc.querySelector(".pc-confronto").getAttribute("data-settimana"), "6");
  assert.match(euro(doc.querySelector(".pc-vol-t").textContent), /Volume per distretto · settimana 6/);
  const acceso = doc.querySelector(".pc-vol2-sett.on");
  assert.equal(acceso.getAttribute("data-w"), "6", "il tasto acceso è quello scelto");
});

test("178.2 il Δ solo quando ci sono entrambi: il dato mancante non è zero", () => {
  const docs = [
    /* A ha Glutei e Femorali; B ha Glutei e Polpacci: nessuno dei due ha tutto. */
    foglio("prg-a", "A", [
      ESE("Hip thrust", "Glutei", 4, "10", 120),
      ESE("Leg curl", "Femorali", 3, "12", 90)
    ]),
    foglio("prg-b", "A", [
      ESE("Hip thrust", "Glutei", 6, "10", 120),
      ESE("Calf raise", "Polpacci", 5, "15", 60)
    ])
  ];
  const { doc } = scena({ docs: docs });

  const glutei = deltaDi(doc, "Glutei");
  assert.equal(glutei.stato, "su");
  assert.match(glutei.testo, /\+2/, "B ha 6 e A 4: il Δ è +2");
  assert.match(glutei.testo, /\+50%/, "e la variazione è sul valore di A");

  const femorali = deltaDi(doc, "Femorali");
  assert.equal(femorali.stato, "nd", "Femorali c'è solo nel consultato: il Δ non si calcola");
  assert.match(femorali.testo, /n\.d\./);
  assert.match(femorali.testo, /manca B/);
  assert.doesNotMatch(femorali.testo, /\+0|−0|= 0/, "un dato mancante non diventa zero");

  const polpacci = deltaDi(doc, "Polpacci");
  assert.equal(polpacci.stato, "nd");
  assert.match(polpacci.testo, /manca A/);

  /* Le barre: dove il valore non c'è, la barra non c'è (nessuna barra a zero). */
  assert.ok(rigaDi(doc, "Femorali").querySelector(".pc-vol2-bar-a"), "la barra A di Femorali c'è");
  assert.equal(rigaDi(doc, "Femorali").querySelector(".pc-vol2-bar-b"), null, "la barra B non c'è: il dato manca");
  assert.equal(rigaDi(doc, "Polpacci").querySelector(".pc-vol2-bar-a"), null);

  /* I riquadri: uno sale, due sono senza dato; i totali sommano solo quello che
   * c'è, e la variazione si calcola su quel totale. */
  const kpi = (chiave) => euro(doc.querySelector('.pc-vol2-kpi-c[data-kpi="' + chiave + '"]').textContent);
  assert.match(kpi("a"), /^Serie · scheda A7/);
  assert.match(kpi("b"), /^Serie · scheda B11/);
  assert.match(kpi("pct"), /\+57%/, "11 contro 7 è +57%");
  assert.match(kpi("distretti"), /1↑ 0↓ 2 senza dato/, "chi sale, chi scende, chi non ha il dato");
});

test("178.3 le due barre prendono i numeri dalle due schede giuste; accese, si sommano", () => {
  const docs = [
    foglio("prg-a", "A", [ESE("Hip thrust", "Glutei", 4, "10", 120)]),
    foglio("prg-a", "D", [ESE("Pressa45", "Glutei", 9, "12", 120)]),
    foglio("prg-b", "A", [ESE("Hip thrust", "Glutei", 7, "10", 120)]),
    foglio("prg-b", "D", [ESE("Bulgaro", "Glutei", 2, "8", 150)])
  ];
  const { doc } = scena({ docs: docs });

  /* Con la scheda A accesa in tutti e due: A = 4, B = 7. */
  assert.equal(nomiRiga(doc)[0], "Glutei 4 → 7", "la barra A è la scheda A del consultato, la B quella in uso");
  assert.equal(larghezza(rigaDi(doc, "Glutei").querySelector(".pc-vol2-bar-a")), 50,
    "4 su una scala di 8 è metà");
  assert.equal(larghezza(rigaDi(doc, "Glutei").querySelector(".pc-vol2-bar-b")), 87.5,
    "7 su 8 è l'87,5%");
  const schedeDi = (quale) => euro(doc.querySelector(
    '.pc-vol2-chi-riga[data-quale="' + quale + '"] .pc-vol2-chi-schede').textContent);
  assert.equal(schedeDi("a"), "schede A", "il consultato conta la scheda A");
  assert.equal(schedeDi("b"), "schede A", "e l'in uso anche");

  /* Accendendo la D, le barre sommano le schede accese di CIASCUN programma
   * (A: 4+9=13; B: 7+2=9) e la riga dice quali sta sommando. */
  doc.querySelector('.pc-st[data-scheda="D"]').click();
  assert.equal(nomiRiga(doc)[0], "Glutei 13 → 9");
  assert.equal(schedeDi("a"), "schede A+D", "la riga dice che somma A e D");
  assert.equal(schedeDi("b"), "schede A+D");
  const a = rigaDi(doc, "Glutei").querySelector(".pc-vol2-bar-a");
  const b = rigaDi(doc, "Glutei").querySelector(".pc-vol2-bar-b");
  assert.ok(Math.abs(larghezza(a) - 13 / 14 * 100) < 0.01, "la barra A è la somma delle due schede: " + larghezza(a) + "%");
  assert.ok(Math.abs(larghezza(b) - 9 / 14 * 100) < 0.01, "e la B la somma delle due schede in uso: " + larghezza(b) + "%");
  assert.equal(deltaDi(doc, "Glutei").stato, "giu", "13 → 9: scende");
  assert.match(deltaDi(doc, "Glutei").testo, /−4/, "il Δ è −4");

  /* Il modulo puro, da solo: le stesse somme, e null per chi non c'è. */
  const grandi = grandezzeProgramma(ricostruisciSchede(docs).perProgramma["prg-a"]);
  const volume = (codici) => Object.assign({}, volumeDelleSchede(grandi, codici, 1));
  assert.deepEqual(volume(["A"]), { Glutei: 4 });
  assert.deepEqual(volume(["A", "D"]), { Glutei: 13 });
  assert.deepEqual(volume(["B"]), {}, "una scheda che non c'è non porta numeri");
});

test("178.4 «Tutte le settimane»: una cella per settimana, le mancanti tratteggiate", () => {
  const docs = [
    /* Femorali scritto solo per 3 settimane: dalla 4 in poi il dato non c'è. */
    foglio("prg-a", "A", [
      ESE("Hip thrust", "Glutei", 4, "10", 120),
      ESE("Leg curl", "Femorali", 3, "12", 90, 3)
    ]),
    foglio("prg-b", "A", [ESE("Hip thrust", "Glutei", 5, "10", 120)])
  ];
  const { doc } = scena({ docs: docs });
  doc.querySelector('.pc-vol2-modo[data-modo="tutte"]').click();
  const sezione = doc.querySelector(".pc-volume-sett");
  assert.equal(sezione.getAttribute("data-vista"), "tutte");
  assert.match(euro(sezione.querySelector(".pc-vol-t").textContent), /tutte le settimane/);

  /* Una riga A e una riga B per distretto: due righe per distretto. */
  const righe = Array.from(sezione.querySelectorAll(".pc-vol2-calore tbody tr"));
  assert.equal(righe.length, 4, "Glutei e Femorali, ognuno con la sua riga A e la sua B");
  righe.forEach((tr) => {
    assert.equal(tr.querySelectorAll(".pc-vol2-cella").length, 8, "una cella per settimana");
  });
  const cella = (quale, settimana, distretto) => sezione.querySelector(
    'tr.pc-vol2-riga-' + quale + '[data-distretto="' + distretto + '"]'
    + ' .pc-vol2-cella[data-settimana="' + settimana + '"]');

  assert.match(cella("a", 3, "Femorali").textContent, /3/, "la settimana scritta ha il numero");
  assert.doesNotMatch(cella("a", 3, "Femorali").className, /manca/);
  const mancante = cella("a", 4, "Femorali");
  assert.match(mancante.className, /manca/, "la settimana 4 non è scritta: cella tratteggiata");
  assert.match(mancante.textContent, /–/, "e non mostra uno zero");
  assert.equal(mancante.getAttribute("title"), "dato non registrato: settimana 4, scheda A");
  assert.match(cella("a", 8, "Femorali").className, /manca/);
  assert.doesNotMatch(cella("a", 8, "Glutei").className, /manca/, "Glutei è scritto per tutte le settimane");
  assert.match(cella("b", 1, "Femorali").className, /manca/, "il programma in uso non ha Femorali affatto");

  /* I riquadri restano quelli della settimana scelta, e lo dicono. */
  assert.match(euro(sezione.textContent), /I riquadri in alto restano quelli della settimana scelta \(W1\)/);
});

test("178.5 l'ordinamento cambia l'ordine delle righe", () => {
  const docs = [
    foglio("prg-a", "A", [
      ESE("Hip thrust", "Glutei", 4, "10", 120),
      ESE("Leg curl", "Femorali", 3, "12", 90),
      ESE("Alzate laterali", "Spalle", 9, "12", 60),
      ESE("Calf raise", "Polpacci", 1, "15", 45)
    ]),
    foglio("prg-b", "A", [
      ESE("Hip thrust", "Glutei", 6, "10", 120),
      ESE("Leg curl", "Femorali", 1, "12", 90),
      ESE("Alzate laterali", "Spalle", 9, "12", 60),
      ESE("Calf raise", "Polpacci", 5, "15", 45)
    ])
  ];
  const { doc } = scena({ docs: docs });
  const sel = doc.querySelector(".pc-vol2-ordine");
  const cambia = (valore) => {
    sel.value = valore;
    sel.dispatchEvent(new doc.defaultView.Event("change"));
  };

  cambia("delta-desc");
  assert.deepEqual(ordine(doc), ["Polpacci", "Glutei", "Spalle", "Femorali"],
    "Δ maggiore: +4, +2, 0, −2");

  cambia("delta-asc");
  assert.deepEqual(ordine(doc), ["Femorali", "Spalle", "Glutei", "Polpacci"],
    "Δ minore: −2, 0, +2, +4");

  cambia("volume");
  assert.deepEqual(ordine(doc), ["Spalle", "Glutei", "Polpacci", "Femorali"],
    "volume della scheda B: 9, 6, 5, 1");

  cambia("az");
  assert.deepEqual(ordine(doc), ["Femorali", "Glutei", "Polpacci", "Spalle"], "A → Z");

  /* Anche la griglia segue lo stesso ordine: le due viste non si contraddicono. */
  doc.querySelector('.pc-vol2-modo[data-modo="tutte"]').click();
  const primoNome = doc.querySelector(".pc-vol2-calore tbody tr .pc-vol2-nm").getAttribute("data-distretto");
  assert.equal(primoNome, "Femorali", "la griglia parte dallo stesso ordine");
});
