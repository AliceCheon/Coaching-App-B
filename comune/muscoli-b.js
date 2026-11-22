/* Barbell Diva B — la mappa dei muscoli per esercizio (passo B.14d, 13/11/2026).
 *
 * Da dove viene, perche' conta:
 *  - dieci esercizi avevano gia' `primaryMuscles` e `secondaryMuscles` scritti
 *    in App A (backup barbell-diva-backup-A-2026-11-04.json, campo dentro
 *    `biomechanics`): da li' si copiano, senza toccarli;
 *  - gli altri li ha confermati Alice il 13/11/2026, famiglia per famiglia.
 * Fonte di ogni voce scritta accanto: la mappa non inventa niente e chi manca
 * resta senza secondari, cioe' conta solo come diretto, e la pagina lo dice.
 *
 * La regola dell'accosciata (Alice, 13/11/2026) e' CODICE, non una tabella:
 *  - se il nome dell'esercizio contiene «glutei», il primario e' glutei e il
 *    secondario e' quadricipiti;
 *  - se non lo contiene, il primario e' quadricipiti e il secondario e' glutei;
 *  - i femorali non sono MAI secondari in un esercizio di accosciata
 *    (questione biomeccanica, parole sue).
 * Cosi' un esercizio nuovo di squat, domani, segue la regola da solo.
 */

import {
  DISTRETTI_MUSCOLI, catalogoBase, distrettoDaParola, normalizzaNome, risolviEsercizio
} from "./riconoscimento-esercizio.js";

/* PASSO 10: la normalizzazione del nome, le parole di A e i distretti della
 * casa vivono in comune/riconoscimento-esercizio.js. Si riprendono qui per chi
 * li importava da questo file: una sola copia in tutto il progetto. */
export { DISTRETTI_MUSCOLI, distrettoDaParola, normalizzaNome };

/* Le parole che fanno di un esercizio un'accosciata. */
const PAROLE_ACCOSCIATA = ["squat", "affondo", "affondi", "bulgaro", "pressa", "pendulum", "goblet", "hack", "sissy", "front squat"];

export function eAccosciata(nome) {
  const t = " " + normalizzaNome(nome) + " ";
  for (let i = 0; i < PAROLE_ACCOSCIATA.length; i += 1) {
    if (t.indexOf(PAROLE_ACCOSCIATA[i]) !== -1) return true;
  }
  return false;
}

/* La regola, in un punto solo. Torna primari e secondari senza doppioni, e
 * senza femorali secondari quando l'esercizio e' un'accosciata. */
export function regolaAccosciata(nome, primari, secondari) {
  const unici = (elenco) => {
    const out = [];
    (Array.isArray(elenco) ? elenco : []).forEach((x) => {
      const d = distrettoDaParola(x) || String(x || "");
      if (d && out.indexOf(d) === -1) out.push(d);
    });
    return out;
  };
  let p = unici(primari);
  let s = unici(secondari);
  if (eAccosciata(nome)) {
    const conGlutei = normalizzaNome(nome).indexOf("glutei") !== -1;
    if (conGlutei) {
      /* il nome dice «glutei»: comanda il gluteo, il quadricipite va di sponda */
      s = s.concat(p);
      p = ["Glutei"];
      s = s.concat(["Quadricipiti"]);
    } else if (!p.length) {
      /* nessun dato: la regola decide per intero */
      p = ["Quadricipiti"];
      s = s.concat(["Glutei"]);
    } else if (p.length === 1 && p[0] === "Quadricipiti") {
      s = s.concat(["Glutei"]);
    }
    /* se il dato dichiara gia' i suoi distretti (la pressa: quadricipiti e
     * glutei insieme), comanda il dato: la regola non lo smonta. */
    s = s.filter((d) => d !== "Femorali");
  }
  s = s.filter((d, i) => p.indexOf(d) === -1 && s.indexOf(d) === i);
  return { primari: p, secondari: s };
}

/* La mappa. `p` = primari, `s` = secondari, `f` = fonte. */
const VOCI = [
  /* --- petto --- */
  { n: ["Panca piana", "Distensioni manubri su piana", "Distensione manubri su inclinata", "Push up", "Push Up"], p: ["Pettorali"], s: ["Tricipiti", "Spalle"], f: "Alice" },
  /* --- tirata verticale --- */
  { n: ["Lat machine", "Lat machine supina", "Lat machine triangolo"], p: ["Dorsali"], s: ["Bicipiti"], f: "App A" },
  { n: ["Lat mono braccio", "Pull down corda", "Pull down sbarra", "Trazioni", "Trazioni neutre"], p: ["Dorsali"], s: ["Bicipiti", "Spalle"], f: "Alice" },
  /* --- tirata orizzontale --- */
  { n: ["Pulley mono", "Pulley sbarra presa larga supina", "Pulley triangolo", "Row machine panatta", "Vertical row machine singolo presa neutra"], p: ["Dorsali"], s: ["Bicipiti", "Spalle"], f: "Alice" },
  { n: ["Rematore dead stop"], p: ["Dorsali"], s: ["Bicipiti"], f: "Alice" },
  /* --- spalle --- */
  { n: ["Alzate laterali", "Alzate laterali cavo basso cavigliera polso", "Alzate laterali macchinario", "Alzate laterali seduta"], p: ["Spalle"], s: [], f: "Alice" },
  { n: ["Lento avanti machine", "Lento avanti manubri", "Military al multypower panca70"], p: ["Spalle"], s: ["Tricipiti"], f: "Alice" },
  { n: ["Face pull"], p: ["Spalle"], s: ["Centro schiena"], f: "Alice" },
  /* --- braccia --- */
  { n: ["Curl cavo basso con bilancere piccolo", "Curl manubri", "Curls bilaciere z", "Curls martello panca", "Curls martello panca inlinata 45", "Curls panca 45", "Curls panca scoot"], p: ["Bicipiti"], s: [], f: "Alice" },
  { n: ["Tricipiti cavo alto in corda", "Tricipiti cavo basso dietro la testa", "Tricipiti manubrio dietro la testa", "French press manubri"], p: ["Tricipiti"], s: [], f: "Alice" },
  /* --- accosciate: la regola decide primario e secondario dal nome --- */
  { n: ["Affondo front squat machine", "Front squat machine", "Goblet squat", "Hack squat con elastico", "Affondo con rotazione busto triset"], p: ["Quadricipiti"], s: ["Glutei", "Addominali"], f: "Alice (regola accosciata)" },
  { n: ["Bulgaro focus glutei", "Affondo focus glutei", "Affondo pesante triset"], p: ["Glutei"], s: ["Quadricipiti"], f: "Alice (regola accosciata)" },
  { n: ["Leg extension", "Leg extension singola", "Sissy squat in piedi"], p: ["Quadricipiti"], s: [], f: "Alice" },
  { n: ["Pendulum"], p: ["Quadricipiti"], s: ["Glutei"], f: "Alice (regola accosciata)" },
  { n: ["Pendulum focus glutei"], p: ["Glutei"], s: ["Quadricipiti"], f: "Alice (regola accosciata)" },
  /* --- femorali e stacchi --- */
  { n: ["Leg curls", "Leg curls seduta", "Leg curls singolo"], p: ["Femorali"], s: [], f: "App A" },
  { n: ["Stacco gambe semi tese", "Stacco mono gamba"], p: ["Femorali", "Glutei"], s: ["Centro schiena"], f: "Alice" },
  { n: ["Stacco RDL", "Stacco Rumeno con manubri", "RDL Belt machine", "RDL focus Gluteo"], p: ["Femorali", "Glutei"], s: ["Centro schiena"], f: "App A" },
  { n: ["Pressa45 piedi alti schienale chiuso", "Pressa verticale panatta"], p: ["Quadricipiti", "Glutei"], s: [], f: "App A, corretto: femorali mai secondari in accosciata" },
  /* --- glutei --- */
  { n: ["Hip Thrust", "Hip Thrust statico"], p: ["Glutei"], s: ["Femorali"], f: "App A" },
  { n: ["Hip Trust mono", "Glutes machine"], p: ["Glutei"], s: ["Femorali"], f: "Alice" },
  { n: ["Abductor"], p: ["Glutei"], s: ["Femorali"], f: "Alice" },
  { n: ["Adductor"], p: ["Adduttori"], s: [], f: "Alice" },
  { n: ["Crab walk con elastico"], p: ["Glutei", "Adduttori"], s: [], f: "Alice" },
  { n: ["Slanci cavo basso", "Slanci laterali cavo basso", "Slancio laterale cavo basso triset"], p: ["Glutei"], s: ["Femorali"], f: "Alice" },
  { n: ["Hyperstension con cuscinetto"], p: ["Glutei"], s: ["Centro schiena"], f: "Alice" },
  /* --- core, polpacci, cardio --- */
  { n: ["Ab Roll", "Crunch machine", "Crunch obliqui", "Leg raise", "Rotazioni cavo medio"], p: ["Addominali"], s: [], f: "Alice" },
  { n: ["Calf machine", "Calf al multypower"], p: ["Polpacci"], s: [], f: "Alice" },
  { n: ["Cardio tapins + corsa"], p: ["Cardio"], s: [], f: "Alice" }
];

const PER_NOME = (() => {
  const mappa = Object.create(null);
  VOCI.forEach((voce) => {
    voce.n.forEach((nome) => {
      const k = normalizzaNome(nome);
      if (!k) return;
      const primari = voce.p.slice();
      const secondari = (voce.s || []).slice();
      const finale = regolaAccosciata(nome, primari, secondari);
      mappa[k] = Object.freeze({
        primari: Object.freeze(finale.primari.slice()),
        secondari: Object.freeze(finale.secondari.slice()),
        fonte: voce.f
      });
    });
  });
  return mappa;
})();

/* Le chiavi della mappa, per il resolver. */
let CHIAVI_MAPPA = null;
function chiaviMappa() {
  if (CHIAVI_MAPPA) return CHIAVI_MAPPA;
  CHIAVI_MAPPA = Object.keys(PER_NOME);
  return CHIAVI_MAPPA;
}

/* I muscoli di un esercizio, o null se non si riconosce in nessun modo.
 *
 * PASSO 10: il nome passa dal riconoscimento unico (esatto -> alias -> contiene
 * -> contenuto), quindi «PULLEY   MONO» e «Affondo front squat machine» danno
 * gli stessi muscoli del nome esatto. Se la mappa non ha il nome, la voce del
 * catalogo dei 179 dà almeno il distretto; se nemmeno quella, il distretto che
 * la riga porta già. Quello che resta sconosciuto torna null: chi chiama lo
 * dichiara, e nessun punto si inventa.
 *
 * `eserciziZonaB` è facoltativo: la collezione esercizi della zona B, se chi
 * chiama la ha letta. Serve solo per i nomi che né la mappa né il catalogo
 * conoscono. */
export function muscoliEsercizio(nome, distrettoNoto, eserciziZonaB) {
  const mappa = risolviEsercizio(nome, { voci: chiaviMappa() });
  const voce = mappa.chiave ? PER_NOME[normalizzaNome(mappa.chiave)] : null;
  if (voce) {
    const primari = voce.primari.slice();
    const noto = distrettoDaParola(distrettoNoto) || "";
    if (!primari.length && noto) primari.push(noto);
    return { primari, secondari: voce.secondari.slice(), fonte: voce.fonte, come: mappa.come, catalogo: mappa.chiave };
  }
  const catalogo = risolviEsercizio(nome, { voci: catalogoBase(), distretto: distrettoNoto, eserciziZonaB });
  if (catalogo.distretto) {
    return {
      primari: [catalogo.distretto],
      secondari: [],
      fonte: catalogo.fonte === "catalogo esercizi" ? "catalogo esercizi" : catalogo.fonte,
      come: catalogo.come,
      catalogo: catalogo.chiave || null
    };
  }
  return null;
}

export function inMappa(nome) {
  return Boolean(risolviEsercizio(nome, { voci: chiaviMappa() }).chiave);
}

/* Quanti esercizi la mappa conosce e quanti hanno i secondari. */
export function statisticheMappa() {
  const chiavi = Object.keys(PER_NOME);
  const conSecondari = chiavi.filter((k) => PER_NOME[k].secondari.length);
  return { esercizi: chiavi.length, conSecondari: conSecondari.length, senzaSecondari: chiavi.length - conSecondari.length };
}
