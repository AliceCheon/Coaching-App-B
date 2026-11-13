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

/* Le parole che fanno di un esercizio un'accosciata. */
const PAROLE_ACCOSCIATA = ["squat", "affondo", "affondi", "bulgaro", "pressa", "pendulum", "goblet", "hack", "sissy", "front squat"];

/* I distretti come li scrive la casa (le stesse etichette della scheda). */
export const DISTRETTI_MUSCOLI = Object.freeze([
  "Pettorali", "Dorsali", "Spalle", "Bicipiti", "Tricipiti",
  "Quadricipiti", "Femorali", "Glutei", "Adduttori",
  "Centro schiena", "Addominali", "Polpacci", "Cardio"
]);

/* Le parole di App A tradotte nei nostri distretti: A scrive «deltoidi
 * laterali», noi contiamo «Spalle»; A scrive «erettori spinali», noi contiamo
 * «Centro schiena». Quello che non si riconosce resta vuoto, mai indovinato. */
const DA_PAROLA_A_DISTRETTO = [
  [["pettorali", "pettorale", "petto", "chest"], "Pettorali"],
  [["dorsali", "dorsale", "dorso", "lat", "gran dorsale"], "Dorsali"],
  [["deltoidi", "deltoide", "spalle", "spalla"], "Spalle"],
  [["bicipiti", "bicipite", "brachiali", "brachiale"], "Bicipiti"],
  [["tricipiti", "tricipite"], "Tricipiti"],
  [["quadricipiti", "quadricipite", "quads"], "Quadricipiti"],
  [["femorali", "femorale", "hamstring", "ischio"], "Femorali"],
  [["glutei", "gluteo"], "Glutei"],
  [["adduttori", "adduttore"], "Adduttori"],
  [["erettori", "lombari", "centro schiena", "schiena", "trapezio"], "Centro schiena"],
  [["addominali", "addome", "obliqui", "core"], "Addominali"],
  [["polpacci", "polpaccio", "calf"], "Polpacci"],
  [["cardio", "corsa"], "Cardio"]
];

/* Come si legge un nome di esercizio: minuscolo, senza accenti, con gli spazi
 * al posto di trattini e trattini bassi. «Pressa45°_piedi_alti» e
 * «pressa45 piedi alti» sono lo stesso esercizio. */
export function normalizzaNome(nome) {
  return String(nome == null ? "" : nome)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\u00b0\u00ba]/g, "")
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* Una parola di A, il nostro distretto (o stringa vuota). */
export function distrettoDaParola(parola) {
  const t = " " + normalizzaNome(parola) + " ";
  if (t.trim() === "") return "";
  for (let i = 0; i < DA_PAROLA_A_DISTRETTO.length; i += 1) {
    const chiavi = DA_PAROLA_A_DISTRETTO[i][0];
    for (let k = 0; k < chiavi.length; k += 1) {
      if (t.indexOf(chiavi[k]) !== -1) return DA_PAROLA_A_DISTRETTO[i][1];
    }
  }
  return "";
}

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

/* I muscoli di un esercizio, o null se non e' in mappa. `distrettoNoto` e' il
 * gruppo che la scheda porta gia': serve da primario quando la mappa non c'e',
 * cosi' un esercizio senza secondari conta comunque come diretto. */
export function muscoliEsercizio(nome, distrettoNoto) {
  const k = normalizzaNome(nome);
  const voce = k ? PER_NOME[k] : null;
  const noto = distrettoDaParola(distrettoNoto) || "";
  if (voce) {
    const primari = voce.primari.slice();
    if (!primari.length && noto) primari.push(noto);
    return { primari, secondari: voce.secondari.slice(), fonte: voce.fonte };
  }
  if (noto) return { primari: [noto], secondari: [], fonte: "distretto della scheda" };
  return null;
}

export function inMappa(nome) {
  const k = normalizzaNome(nome);
  return Boolean(k && PER_NOME[k]);
}

/* Quanti esercizi la mappa conosce e quanti hanno i secondari. */
export function statisticheMappa() {
  const chiavi = Object.keys(PER_NOME);
  const conSecondari = chiavi.filter((k) => PER_NOME[k].secondari.length);
  return { esercizi: chiavi.length, conSecondari: conSecondari.length, senzaSecondari: chiavi.length - conSecondari.length };
}
