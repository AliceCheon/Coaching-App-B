/* tests/129-articolazioni.test.mjs — PASSO 6a, il motore della mappa articolare.
 *
 * Numeri scelti a mano, totali calcolati a mano qui nel test: la scheda finta
 * ha cinque righe che contano, una che non conta nel volume, una di cardio, e
 * una riga con il nome doppio del catalogo. Non si monta nessuna pagina: il
 * modulo e' puro e la prova lo guarda dal di fuori.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  ARTICOLAZIONI, MAPPA_ARTICOLARE, ALIAS, TETTO_ESERCIZIO,
  articolazioniDi, nomeCanonico, stressArticolazioni
} from "../comune/articolazioni-b.js";
import { CATALOGO_ESERCIZI_B } from "../comune/catalogo-esercizi-b.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");

/* Otto settimane con le serie scritte a mano, cosi' il totale si conta a occhio. */
const settimane = (serie) => Array.from({ length: 8 }, (_, i) => ({
  week: i + 1,
  sets: Array.isArray(serie) ? serie[i] : serie,
  reps: "10",
  rest: { seconds: 90 }
}));
const ESE = (nome, serie, extra) => Object.assign({
  id: "ex-" + nome, nome: nome, muscolo: "x", prescrizione: { elencoSettimane: settimane(serie) }
}, extra || {});

/* La scheda di prova.
 *  Panca piana     4 serie  -> spalla 4/sett, gomito 2/sett
 *  Curl manubri    3 serie  -> gomito 3/sett, polso 1,5/sett
 *  Triset glutei   2,3,3,4,4,4,5,5 -> anca (totale 30), colonna lombare (15)
 *  Alzata ... 30Â° 5 serie  -> e' l'alias di 30°: spalla 5/sett
 *  Leg press steso 6 serie, ma contaVolume: false -> zero punti
 *  Tabata          2 serie  -> cardio: elencato, zero punti
 */
const scheda = {
  codice: "A",
  esercizi: [
    ESE("Panca piana", 4),
    ESE("Curl manubri", 3),
    ESE("Triset glutei", [2, 3, 3, 4, 4, 4, 5, 5]),
    ESE("Alzata laterale su panca inclinata 30Â°", 5),
    ESE("Leg press steso", 6, { contaVolume: false }),
    ESE("Tabata", 2)
  ]
};

const voce = (conto, nome) => conto.articolazioni.filter((a) => a.articolazione === nome)[0] || null;
const somma = (a) => a.reduce((acc, v) => acc + v, 0);

test("129.1 la mappa copre tutti gli esercizi che descrive, e chi manca è dichiarato non mappato", () => {
  assert.ok(Object.keys(MAPPA_ARTICOLARE).length >= 176, "la mappa ha almeno i 176 esercizi veri");
  /* PASSO 32: i 370 esercizi arrivati dal backup di A non hanno una riga nella
   * tabella articolare di Alice, e non se la inventa nessuno: la mappa copre
   * quelli che descrive, gli altri escono da articolazioniDi() come
   * «nonMappato», senza punti. */
  const senzaRiga = CATALOGO_ESERCIZI_B.filter((v) => !MAPPA_ARTICOLARE[v.n]);
  assert.equal(CATALOGO_ESERCIZI_B.length, 551);
  /* 372 = 375 (370 di A + 5 del 28/11) meno le tre che Alice ha confermato in
   * chat il 28/11: Hip thrust (anca; ginocchio e caviglia), Crunch inverso
   * (colonna lombare; anca) e Crab walk con elastico (anca; ginocchio). */
  /* 373: le 375 meno «Crunch inverso» e «Crab walk con elastico», le due
   * confermate in chat che hanno una voce propria nel catalogo. «Hip thrust»
   * nel catalogo si chiama «Hip Thrust» (parola sua, non una voce nuova): la
   * riga aggiornata è quella, con anca principale e ginocchio + caviglia. */
  assert.equal(senzaRiga.length, 373, "le voci senza riga sono 373: le 375 meno le due con voce propria");
  senzaRiga.forEach((v) => {
    const a = articolazioniDi(v.n);
    if (a.nonMappato) {
      /* nessuna riga e nessun nome vicino: niente punti, dichiarato */
      assert.equal(Object.keys(a.punti).length, 0, "una voce non mappata non dà punti: " + v.n);
      assert.equal(a.principale, null, "una voce non mappata non ha principale: " + v.n);
    } else {
      /* il nome si riconduce a un esercizio della tabella (la stessa regola che
       * l'app usa da sempre): eredita le sue articolazioni, non se le inventa */
      assert.ok(MAPPA_ARTICOLARE[a.catalogo], "la voce " + v.n + " rimanda a un esercizio senza riga: " + a.catalogo);
      assert.equal(a.principale, MAPPA_ARTICOLARE[a.catalogo].p, "articolazioni diverse da quelle della riga: " + v.n);
    }
  });
  assert.deepEqual(ARTICOLAZIONI.slice(), [
    "spalla", "gomito", "polso", "anca", "ginocchio", "caviglia", "colonna lombare", "colonna toracica"
  ]);
  /* Il collo non esiste nel catalogo e non deve comparire nella mappa. */
  assert.equal(ARTICOLAZIONI.indexOf("collo"), -1);
});

test("129.2 una principale e due secondarie danno 1 + 0,5 + 0,5 = 2, mai di piu'", () => {
  /* PASSO 6f: nell'affondo la colonna lombare PORTA carico (1 punto), quindi
   * le due secondarie a 0,5 escono e il tetto resta a 2. */
  const a = articolazioniDi("Affondi al multypower");
  assert.equal(a.principale, "anca");
  assert.deepEqual(a.secondiPrincipali, ["colonna lombare"]);
  assert.deepEqual(a.secondarie.slice().sort(), []);
  const totale = Object.keys(a.punti).reduce((acc, k) => acc + a.punti[k], 0);
  assert.equal(totale, 2);
  /* una principale piu' due secondarie resta 2 quando non c'e' il carico */
  const panca = articolazioniDi("Panca piana");
  assert.deepEqual(Object.assign({}, panca.punti), { spalla: 1, gomito: 0.5 });
  Object.keys(MAPPA_ARTICOLARE).forEach((n) => {
    const art = articolazioniDi(n);
    const t = Object.keys(art.punti).reduce((acc, k) => acc + art.punti[k], 0);
    assert.ok(t <= TETTO_ESERCIZIO, n + " passa il tetto: " + t);
    assert.ok(art.secondarie.length <= 2, n + " ha troppe secondarie");
    assert.ok(!art.secondarie.some((s) => s === art.principale), n + " ripete la principale");
  });
});

test("129.3 Triset glutei e' UN esercizio: la riga vale una volta, non tre", () => {
  const a = articolazioniDi("Triset glutei");
  assert.equal(a.principale, "anca");
  assert.equal(Object.keys(a.punti).length, 2);
  const conto = stressArticolazioni({ codice: "A", esercizi: [ESE("Triset glutei", 4)] });
  assert.equal(voce(conto, "anca").totale, 32, "4 serie x 8 settimane x 1 punto");
  assert.equal(voce(conto, "colonna lombare").totale, 16, "4 serie x 8 x 0,5");
  assert.deepEqual(voce(conto, "anca").esercizi, ["Triset glutei"]);
});

test("129.4 il doppione conta col nome vero: l'alias resta, il doppione non è più nel catalogo", () => {
  assert.equal(ALIAS["Pressa 45Â°"], "Pressa 45°");
  assert.equal(nomeCanonico("Pressa 45Â°"), "Pressa 45°");
  assert.deepEqual(articolazioniDi("Pressa 45Â°").punti, articolazioniDi("Pressa 45°").punti);
  assert.equal(ALIAS["Push ups"], "Push Up");
  /* Passo 23: il doppione rovinato non è più nel catalogo, ma il suo nome
   * resta come alias e conta lo stesso esercizio. */
  assert.equal(CATALOGO_ESERCIZI_B.length, 551);
  assert.equal(CATALOGO_ESERCIZI_B.some((v) => v.n === "Pressa 45Â°"), false);
  assert.ok(CATALOGO_ESERCIZI_B.some((v) => v.n === "Pressa 45°"));
});

test("129.5 la riga che non conta nel volume non da' punti, e nemmeno il cardio", () => {
  const conto = stressArticolazioni(scheda);
  /* Ginocchio sarebbe 6 serie x 8 = 48 se la riga contasse: non c'e'. */
  assert.equal(voce(conto, "ginocchio"), null);
  assert.deepEqual(conto.senzaPunti, [{ nome: "Tabata", motivo: "cardio" }]);
  assert.equal(conto.righeSaltate, 1);
  assert.equal(conto.righeContate, 5);
});

test("129.6 il conto settimana per settimana e' quello scritto a mano", () => {
  const conto = stressArticolazioni(scheda);
  assert.equal(conto.quante, 8);

  const spalla = voce(conto, "spalla");
  assert.deepEqual(spalla.settimane, [9, 9, 9, 9, 9, 9, 9, 9]);
  assert.equal(spalla.totale, somma([4, 4, 4, 4, 4, 4, 4, 4].map((v) => v + 5)));
  assert.equal(spalla.totale, 72);

  const gomito = voce(conto, "gomito");
  assert.deepEqual(gomito.settimane, [5, 5, 5, 5, 5, 5, 5, 5]);
  assert.equal(gomito.totale, 40);

  const polso = voce(conto, "polso");
  assert.deepEqual(polso.settimane, [1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5]);
  assert.equal(polso.totale, 12);

  const anca = voce(conto, "anca");
  assert.deepEqual(anca.settimane, [2, 3, 3, 4, 4, 4, 5, 5]);
  assert.equal(anca.totale, 30);

  const lombare = voce(conto, "colonna lombare");
  assert.deepEqual(lombare.settimane, [1, 1.5, 1.5, 2, 2, 2, 2.5, 2.5]);
  assert.equal(lombare.totale, 15);

  /* Solo chi ha esercizi compare; le altre tre restano fuori. */
  assert.deepEqual(conto.articolazioni.map((a) => a.articolazione),
    ["spalla", "gomito", "polso", "anca", "colonna lombare"]);
});

test("129.7 l'elenco degli esercizi dice chi carica quell'articolazione", () => {
  const conto = stressArticolazioni(scheda);
  assert.deepEqual(voce(conto, "spalla").esercizi,
    ["Panca piana", "Alzata laterale su panca inclinata 30Â°"]);
  assert.deepEqual(voce(conto, "gomito").esercizi, ["Panca piana", "Curl manubri"]);
  assert.deepEqual(voce(conto, "polso").esercizi, ["Curl manubri"]);
  assert.deepEqual(voce(conto, "colonna lombare").esercizi, ["Triset glutei"]);
});

test("129.8 il modulo e' puro: niente Firestore, niente pagina, niente schermo", () => {
  const sorgente = readFileSync(join(radice, "comune", "articolazioni-b.js"), "utf8");
  ["firebase", "firestore", "document.", "window.", "innerHTML"].forEach((parola) => {
    assert.equal(sorgente.indexOf(parola), -1, "il modulo nomina " + parola);
  });
  /* Una scheda vuota non lancia e non inventa numeri. */
  const vuoto = stressArticolazioni({ codice: "A", esercizi: [] });
  assert.equal(vuoto.righeContate, 0);
  assert.deepEqual(vuoto.articolazioni, []);
  assert.deepEqual(vuoto.senzaPunti, []);
});
