/* tests/138-riconoscimento-esercizio.test.mjs — PASSO 10.
 *
 * Un solo riconoscimento dei nomi, usato da tutti: articolazioni-b, muscoli-b,
 * quindi Volume e Specializzazione. I nomi veri delle schede (maiuscole, spazi
 * doppi, «Pulley mono», «Affondo front squat machine») devono dare distretti e
 * numeri veri; una riga davvero sconosciuta resta dichiarata e senza punti.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  normalizzaNome, nomeCanonico, risolviEsercizio, risolviInElenco, catalogoBase
} from "../comune/riconoscimento-esercizio.js";
import { muscoliEsercizio } from "../comune/muscoli-b.js";
import { articolazioniDi } from "../comune/articolazioni-b.js";
import { contaVolume, righeDalleSchede } from "../comune/volume-b.js";
import { renderVolume } from "../comune/vista-volume.js";
import { renderSpecializzazione } from "../comune/vista-specializzazione.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagina = readFileSync(join(radice, "desktop", "index.html"), "utf8");
const doc = () => new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" }).window.document;

const sett = (serie) => Array.from({ length: 8 }, (_, i) => ({ numero: i + 1, serie, ripetizioni: 10 }));

/* I nomi come li scrive il file di Alice: maiuscole sparse, spazi doppi, i due
 * nomi che il catalogo non ha (li traduce l'alias), un accento. */
const schedaVera = {
  codice: "A",
  esercizi: [
    { nome: "PULLEY   MONO", muscolo: "", settimane: sett(4) },
    { nome: "Affondo front squat machine", muscolo: "", settimane: sett(3) },
    { nome: "  panca   PIANA ", muscolo: "", settimane: sett(4) },
    { nome: "LEG  EXTENSìON", muscolo: "", settimane: sett(3) }
  ]
};
const schedaIgnota = {
  codice: "B",
  esercizi: [
    { nome: "Esercizio Inventato 3000", muscolo: "", settimane: sett(4) },
    { nome: "Macchina Misteriosa Xyz", muscolo: "", settimane: sett(2) }
  ]
};

test("138.1 i quattro passi del resolver, e l'ambiguità dichiarata", () => {
  /* 1. esatto: maiuscole, spazi doppi, accento */
  const esatto = risolviEsercizio("  PANCA   PIANA ");
  assert.equal(esatto.come, "esatto");
  assert.equal(esatto.chiave, "Panca piana");
  assert.equal(esatto.distretto, "Pettorali");

  /* 2. due nomi che fino al passo 20 erano SOLO alias e ora sono esercizi del
   * catalogo, col loro distretto: si riconoscono al passo esatto */
  const mono = risolviEsercizio("PULLEY   MONO");
  assert.equal(mono.come, "esatto");
  assert.equal(mono.chiave, "Pulley mono");
  assert.equal(mono.distretto, "Centro schiena");
  const affondo = risolviEsercizio("Affondo front squat machine");
  assert.equal(affondo.come, "esatto");
  assert.equal(affondo.chiave, "Affondo front squat machine");
  assert.equal(affondo.distretto, "Quadricipiti");
  /* gli alias restano per i nomi vicini, scritti in un altro modo */
  const vicino = risolviEsercizio("Pendulum glutei");
  assert.equal(vicino.come, "alias");
  assert.equal(vicino.chiave, "Pendulum focus glutei");

  /* 3. contiene una chiave sola */
  const dentro = risolviEsercizio("Panca piana con bilanciere");
  assert.equal(dentro.come, "contiene");
  assert.equal(dentro.chiave, "Panca piana");

  /* 4. contenuto in una chiave sola */
  const fuori = risolviEsercizio("Tricipiti cavo alto");
  assert.equal(fuori.come, "contenuto");
  assert.equal(fuori.chiave, "Tricipiti cavo alto in corda");

  /* ambiguo: due chiavi, non si indovina */
  const ambiguo = risolviEsercizio("Trazioni neutre supine");
  assert.equal(ambiguo.come, "ambiguo");
  assert.equal(ambiguo.chiave, null);
  assert.ok(ambiguo.candidati.length > 1, "l'ambiguità porta i candidati con sé");

  /* il catalogo di base è quello vero: 176 voci (i dieci doppioni da codifica
   * sono uniti al passo 23), distretti della casa */
  assert.equal(catalogoBase().length, 176);
  assert.equal(catalogoBase().filter((v) => !v.distretto).length, 0, "ogni voce ha un distretto tradotto");
});

test("138.2 muscoli-b: i nomi veri danno gli stessi muscoli del nome esatto", () => {
  const coppie = [
    ["PULLEY   MONO", "Pulley mono"],
    ["AFFONDO FRONT SQUAT MACHINE", "Affondo front squat machine"],
    ["leg  EXTENSìON", "Leg extension"],
    ["  Panca   piana ", "Panca piana"]
  ];
  coppie.forEach(([storto, giusto]) => {
    const a = muscoliEsercizio(storto, "");
    const b = muscoliEsercizio(giusto, "");
    assert.ok(a, "non riconosciuto: " + storto);
    assert.deepEqual(a.primari, b.primari, "primari diversi per " + storto);
    assert.deepEqual(a.secondari, b.secondari, "secondari diversi per " + storto);
  });

  /* il ripiego: la voce del catalogo dà il distretto a un nome che la mappa
   * dei muscoli non ha */
  const arnold = muscoliEsercizio("Arnold Press", "");
  assert.deepEqual(arnold.primari, ["Spalle"]);
  assert.equal(arnold.fonte, "catalogo esercizi");

  /* la riga porta il distretto: quello, dichiarato */
  const senzaNome = muscoliEsercizio("Nome Fuori Catalogo 999", "glutei");
  assert.deepEqual(senzaNome.primari, ["Glutei"]);
  assert.equal(senzaNome.fonte, "distretto della scheda");
});

test("138.3 le schede con nomi veri: Volume e Specializzazione mostrano distretti e numeri", () => {
  const righe = righeDalleSchede([schedaVera]);
  assert.equal(righe.length, 4);
  assert.ok(righe.every((r) => r.primari.length > 0), "nessuna riga deve restare senza distretto");

  const conto = contaVolume(righe, { quante: 8 });
  const per = Object.fromEntries(conto.distretti.map((d) => [d.distretto, d]));
  /* 4 serie di pulley per otto settimane: 32 dirette sui dorsali; leg extension
   * e affondo insieme: 6 serie per settimana, 48 sui quadricipiti */
  assert.equal(per.Dorsali.dirette, 32);
  assert.equal(per.Quadricipiti.dirette, 48);
  assert.equal(conto.righeSenzaDistretto, 0);
  assert.equal(conto.settimaneContate, 8);

  const documento = doc();
  const box = documento.querySelector("#rv-vivo");
  renderVolume(documento, box, [schedaVera], { quante: 8 });
  const testoVolume = box.textContent;
  assert.doesNotMatch(testoVolume, /Nessun distretto attribuito/);
  assert.match(testoVolume, /Dorsali/);
  assert.match(testoVolume, /Quadricipiti/);
  assert.ok(box.querySelectorAll(".rv-hl").length >= 3, "la mappa deve avere le righe dei distretti");

  const sp = documento.querySelector("#sp-corpo");
  renderSpecializzazione(documento, sp, [schedaVera], { quante: 8 });
  const testoSp = sp.textContent;
  assert.doesNotMatch(testoSp, /distretti riconoscibili/);
  assert.ok(sp.querySelectorAll(".sp-r").length >= 3, "la classifica deve avere i distretti");
  const kpi = [...sp.querySelectorAll(".sp-k b")].map((x) => x.textContent);
  assert.ok(kpi.length >= 5);
  assert.ok(kpi.every((v) => v && v !== "—"), "nessun KPI a trattino: i numeri sono veri");
});

test("138.4 una riga davvero sconosciuta resta dichiarata e non dà punti", () => {
  const righe = righeDalleSchede([schedaIgnota]);
  assert.equal(righe.length, 2);
  assert.ok(righe.every((r) => r.primari.length === 0), "nessun distretto inventato");

  const conto = contaVolume(righe, { quante: 8 });
  assert.equal(conto.distretti.length, 0);
  assert.equal(conto.righeSenzaDistretto, 2);
  assert.equal(conto.totale.totale, 0);

  const documento = doc();
  const sp = documento.querySelector("#sp-corpo");
  renderSpecializzazione(documento, sp, [schedaIgnota], { quante: 8 });
  assert.match(sp.textContent, /le schede non portano distretti riconoscibili/);

  const box = documento.querySelector("#rv-vivo");
  renderVolume(documento, box, [schedaIgnota], { quante: 8 });
  assert.match(box.textContent, /nessun distretto attribuito/i);

  /* e la carta RED-S non inventa articolazioni per lo stesso nome */
  const art = articolazioniDi("Esercizio Inventato 3000");
  assert.equal(art.nonMappato, true);
  assert.deepEqual(Object.keys(art.punti), []);
});

test("138.5 un solo riconoscimento: nessuna seconda copia nei moduli", () => {
  const reds = readFileSync(join(radice, "comune", "articolazioni-b.js"), "utf8");
  const muscoli = readFileSync(join(radice, "comune", "muscoli-b.js"), "utf8");
  const riconoscimento = readFileSync(join(radice, "comune", "riconoscimento-esercizio.js"), "utf8");

  assert.doesNotMatch(reds, /export const ALIAS =/, "articolazioni-b non deve avere la sua mappa alias");
  assert.doesNotMatch(reds, /function nomeNormalizzato\(/, "articolazioni-b non deve avere la sua normalizzazione");
  assert.match(reds, /from "\.\/riconoscimento-esercizio\.js"/);
  assert.doesNotMatch(muscoli, /function normalizzaNome\(/, "muscoli-b non deve avere la sua normalizzazione");
  assert.doesNotMatch(muscoli, /const DA_PAROLA_A_DISTRETTO/, "muscoli-b non deve avere la sua tabella delle parole");
  assert.match(muscoli, /from "\.\/riconoscimento-esercizio\.js"/);

  /* una sola definizione in tutto il progetto */
  const definizioni = ["comune/articolazioni-b.js", "comune/muscoli-b.js", "comune/volume-b.js",
    "comune/vista-volume.js", "comune/vista-specializzazione.js"]
    .map((f) => (readFileSync(join(radice, f), "utf8").match(/function normalizzaNome\(/g) || []).length)
    .reduce((a, b) => a + b, 0);
  assert.equal(definizioni, 0, "la normalizzazione non si riscrive nei moduli");
  assert.equal((riconoscimento.match(/function normalizzaNome\(/g) || []).length, 1);

  /* il nome normalizzato che esporta muscoli-b è la stessa funzione, non una copia */
  assert.equal(normalizzaNome("Leg  Extensìon"), "leg extension");
  assert.equal(nomeCanonico("Pulley mono"), "Pulley mono");
  assert.equal(risolviInElenco("Leg extension", ["Leg Extension"]).come, "esatto");
});
