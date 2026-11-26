/* Passo 11 — la diagnosi degli esercizi: funzioni pure, sola lettura.
 * Le prove guardano le cose che Alice deve poter fidarsi di leggere: il nome
 * com'e' scritto (mai ripulito), la risposta del resolver con il motivo,
 * il distretto e le articolazioni, il «sì/no» del volume, e la provenienza
 * delle schede (v1 o v2, con l'id del programma). */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  indiceNomiGrezzi,
  origineSchede,
  righeDiagnosi,
  riepilogoDiagnosi,
  testoArticolazioni,
  testoDiagnosi,
  testoOrigine,
  fraseRiepilogoVolume,
  MOTIVO_AMBIGUO,
  MOTIVO_DA_RIGA,
  MOTIVO_NESSUNO
} from "../comune/diagnostica-esercizi.js";
import { FRASI_VUOTO_VOLUME } from "../comune/vista-volume.js";
import { righeDalleSchede, contaVolume } from "../comune/volume-b.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");

function schedaProva() {
  return {
    codice: "A",
    esercizi: [
      { id: "e1", n: "  PANCA   PIANA ", muscolo: "", settimane: [{ settimana: 1, serie: 4, ripetizioni: 8 }] },
      { id: "e2", n: "PULLEY   MONO", muscolo: "Dorsali", settimane: [{ settimana: 1, serie: 3, ripetizioni: 10 }] },
      { id: "e3", n: "Nome Fuori Catalogo 999", muscolo: "glutei", settimane: [{ settimana: 1, serie: 3, ripetizioni: 12 }] },
      { id: "e4", n: "Trazioni neutre supine", muscolo: "", settimane: [{ settimana: 1, serie: 3, ripetizioni: 6 }] },
      { id: "e5", n: "Cardio tapins + corsa", muscolo: "", contaVolume: false, settimane: [{ settimana: 1, serie: 1, ripetizioni: 10 }] }
    ]
  };
}

function origineV2() {
  return origineSchede({
    profilo: { id: "prg111" },
    fonteSchede: "documenti v2 \u00b7 program-v2-sheet- / -exercise- \u00b7 legame: id esatto",
    legameSchede: { come: "id esatto", idCercato: "prg111", gruppi: 2, lette: 7, legate: 3 }
  });
}

test("139.1 il nome resta com'e' scritto, e il documento vero vince sulla ricostruzione", () => {
  const righe = righeDiagnosi([schedaProva()], { origine: origineV2() });
  assert.equal(righe.length, 5);
  assert.equal(righe[0].nome, "  PANCA   PIANA ", "gli spazi ai bordi e i doppi spazi non si toccano");
  assert.equal(righe[1].nome, "PULLEY   MONO");
  assert.equal(righe[0].dalDocumento, false);

  const documenti = [
    { id: "doc-1", dati: { sheet: { exercises: [{ id: "e1", nome: "Panca   piana" }] } } },
    { id: "doc-2", dati: { exercise: { id: "e2", nome: "PULLEY  MONO" } } }
  ];
  const indice = indiceNomiGrezzi(documenti);
  assert.equal(indice.e1, "Panca   piana");
  assert.equal(indice.e2, "PULLEY  MONO");
  const dalVero = righeDiagnosi([schedaProva()], { nomiGrezzi: indice, origine: origineV2() });
  assert.equal(dalVero[0].nome, "Panca   piana");
  assert.equal(dalVero[0].dalDocumento, true);
  assert.equal(dalVero[2].nome, "Nome Fuori Catalogo 999", "chi non e' nei documenti resta come lo porta la scheda");
});

test("139.2 il resolver risponde i quattro passi, e chi non si riconosce dichiara il motivo", () => {
  const righe = righeDiagnosi([schedaProva()], { origine: origineV2() });
  assert.equal(righe[0].voce, "Panca piana");
  assert.equal(righe[0].passo, "esatto");
  assert.equal(righe[0].motivo, null);
  assert.deepEqual(righe[0].primari, ["Pettorali"]);

  assert.equal(righe[1].voce, "Pulley mono");
  assert.equal(righe[1].passo, "esatto");
  assert.deepEqual(righe[1].primari, ["Dorsali"]);

  assert.equal(righe[1].origine, testoOrigine(origineV2()));
  assert.match(righe[1].origine, /documenti v2/);
  assert.match(righe[1].origine, /id esatto/);
  assert.match(righe[1].origine, /prg111/);

  assert.equal(righe[2].voce, null);
  assert.equal(righe[2].motivo, MOTIVO_DA_RIGA);
  assert.deepEqual(righe[2].primari, ["Glutei"], "senza voce di catalogo vale il muscolo della riga");
  assert.equal(righe[2].fonte, "distretto della scheda");

  assert.equal(righe[3].voce, null);
  assert.equal(righe[3].motivo, MOTIVO_AMBIGUO);
  assert.ok(righe[3].candidati.length > 1, "ambiguo: i candidati si elencano");
  assert.deepEqual(righe[3].primari, []);

  assert.equal(righe[3].articolazioni.nonMappato, true);
  assert.match(testoArticolazioni(righe[3].articolazioni), /non mappato/);
  assert.equal(righe[0].articolazioni.principale, "spalla");
  assert.match(righe[0].articolazioniTesto, /spalla/);
});

test("139.3 contaNelVolume: la riga fuori volume resta in tabella ma dichiarata", () => {
  const righe = righeDiagnosi([schedaProva()], { origine: origineV2() });
  assert.deepEqual(righe.map((r) => r.nelVolume), [true, true, true, true, false]);
});

test("139.4 la provenienza: v1 dal documento del programma, v2 dai documenti, con l'id", () => {
  const v1 = origineSchede({
    profilo: { id: "prg7" },
    fonteSchede: "documento del programma (v1)",
    legameSchede: { come: null, idCercato: "prg7", gruppi: 1, lette: 2, legate: 2 }
  });
  assert.equal(v1.tipo, "v1");
  assert.equal(v1.idProgramma, "prg7");
  assert.equal(testoOrigine(v1), "documento del programma (v1) \u00b7 prg7");

  const v2 = origineV2();
  assert.equal(v2.tipo, "v2");
  assert.equal(v2.come, "id esatto");
  assert.equal(testoOrigine(v2), "documenti v2 \u00b7 legame: id esatto \u00b7 prg111");

  const ignota = origineSchede({ profilo: {}, fonteSchede: null });
  assert.equal(ignota.tipo, null);
  assert.equal(ignota.fonte, null);
  assert.match(testoOrigine(ignota), /fonte non dichiarata/);

  const righe = righeDiagnosi([schedaProva()], { origine: v1 });
  assert.equal(righe[0].origine, "documento del programma (v1) \u00b7 prg7");
  assert.equal(righe[0].origineTipo, "v1");
  assert.equal(righe[0].programma, "prg7");
});

test("139.5 i numeri in testa e il testo copiabile portano «fonte schede:»", () => {
  const origine = origineV2();
  const righe = righeDiagnosi([schedaProva()], { origine });
  const numeri = riepilogoDiagnosi(righe);
  assert.equal(numeri.lette, 5);
  assert.equal(numeri.riconosciute, 4, "e1, e2, e3 (dal muscolo della riga) ed e5");
  assert.equal(numeri.senzaDistretto, 1, "solo l'ambiguo resta senza distretto");
  assert.ok(numeri.distretti.indexOf("Pettorali") !== -1);
  assert.ok(numeri.distretti.indexOf("Glutei") !== -1);
  assert.equal(numeri.fuoriVolume, 1);
  assert.deepEqual(numeri.origini, [testoOrigine(origine)]);

  const testo = testoDiagnosi({
    quando: "23/11/2026, 14:20:00",
    programma: "Forza A \u00b7 id prg111",
    fonteSchede: origine.fonte,
    origine,
    frase: "Nessun distretto riconosciuto: il documento non porta il gruppo muscolare e la mappa non conosce questi nomi. Il conto non lo inventa.",
    riepilogo: numeri,
    righe
  });
  assert.match(testo, /^fonte schede: documenti v2/m);
  assert.match(testo, /Righe lette: 5/);
  assert.match(testo, /\u00AB  PANCA   PIANA \u00BB/, "nel testo copiato il nome resta intatto");
  assert.match(testo, /prg111/);
  assert.match(testo, /ambiguo/);
  assert.match(testo, /Proviene da/);
  assert.equal(testo.split("\n").length >= 8, true);
});

test("139.6 la frase del Riepilogo volume e' la stessa stringa della vista", () => {
  const vuoto = contaVolume(righeDalleSchede([{ codice: "A", esercizi: [] }]), { quante: 8 });
  assert.equal(fraseRiepilogoVolume(vuoto), FRASI_VUOTO_VOLUME.nessunaRiga);

  const scheda = schedaProva();
  scheda.esercizi = [
    { id: "x1", n: "Trazioni neutre supine", muscolo: "", settimane: [{ settimana: 1, serie: 3, ripetizioni: 6 }] }
  ];
  const senzaDistretto = contaVolume(righeDalleSchede([scheda]), { quante: 8 });
  assert.equal(senzaDistretto.distretti.length, 0);
  assert.equal(fraseRiepilogoVolume(senzaDistretto), FRASI_VUOTO_VOLUME.nessunDistretto);

  const conDistretti = contaVolume(righeDalleSchede([schedaProva()]), { quante: 8 });
  assert.ok(conDistretti.distretti.length > 0);
  assert.match(fraseRiepilogoVolume(conDistretti), /^Serie per distretto: /);
});

test("139.7 la pagina e' sola lettura e non tocca desktop/index.html", () => {
  const html = readFileSync(join(radice, "desktop", "diagnosi-esercizi.html"), "utf8");
  const js = readFileSync(join(radice, "desktop", "diagnosi-esercizi.js"), "utf8");
  const vietati = [/\.set\s*\(/, /\.update\s*\(/, /\.delete\s*\(/, /\.add\s*\(/, /\b(setDoc|addDoc|updateDoc|deleteDoc)\s*\(/,
    /\b(writeBatch|runTransaction)\s*\(/, /!important/, /__BDSEED/];
  vietati.forEach((re) => {
    assert.equal(re.test(html), false, "html: vietato " + re);
    assert.equal(re.test(js), false, "js: vietato " + re);
  });
  assert.match(html, /id="copia-tutto"/);
  assert.match(html, /id="fonte-schede"/);
  assert.match(js, /leggiZonaBCompleta/);
  assert.match(js, /riepilogoProgramma/);
  assert.match(js, /origineSchede/);
});
