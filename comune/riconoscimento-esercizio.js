/* Barbell Diva B — PASSO 10: un solo riconoscimento dei nomi degli esercizi.
 *
 * Il problema. I nomi arrivano dall'Excel di Alice e il catalogo è congelato:
 * «PULLEY   MONO», «Affondo front squat machine», «leg  EXTENSION» sono lo
 * stesso esercizio scritto in un altro modo. Fino a ieri il riconoscimento era
 * scritto due volte — tollerante in articolazioni-b, rigido in muscoli-b (solo
 * nome normalizzato identico) — e Volume e Specializzazione passavano dal
 * secondo: con i nomi veri non trovavano distretti e la pagina diceva «le
 * schede non portano distretti riconoscibili».
 *
 * La cura. Un resolver solo, qui, con quattro passi in quest'ordine:
 *   1. esatto    — nome normalizzato identico a una chiave;
 *   2. alias     — il nome è un doppione che il catalogo scrive diverso
 *                  («Pulley mono», «Affondo front squat machine»): vale il
 *                  nome che si conta;
 *   3. contiene  — il nome scritto CONTIENE una chiave sola;
 *   4. contenuto — il nome scritto È CONTENUTO in una chiave sola.
 * Se un passo trova più d'una chiave non si indovina: null e il motivo
 * «ambiguo», con l'elenco dei candidati.
 *
 * Il ripiego quando il nome non si riconosce: il muscolo/distretto che la riga
 * porta già; altrimenti la voce della collezione esercizi della zona B (se chi
 * chiama la passa), cercata con lo stesso resolver. Quello che resta sconosciuto
 * torna null e chi chiama lo dichiara: nessun punto inventato.
 *
 * Nessun DOM, nessun Firestore: entra un nome, esce una voce.
 */

import { CATALOGO_ESERCIZI_B } from "./catalogo-esercizi-b.js";

/* I quattro passi, in ordine. Server al report e alle prove. */
export const PASSI_RICONOSCIMENTO = Object.freeze(["esatto", "alias", "contiene", "contenuto"]);

/* I doppioni: stesso esercizio, nome scritto due volte nel catalogo (carattere
 * rovinato, maiuscola, spazio). La destra e' il nome che si conta. */
export const ALIAS_NOMI = Object.freeze({
  "Alzata laterale su panca inclinata 30Â°": "Alzata laterale su panca inclinata 30°",
  "Alzate laterali + alzate frontali panca 70Â°": "Alzate laterali + alzate frontali panca 70°",
  "Crunch gambe 90Â°": "Crunch gambe 90°",
  "Curls martello panca inlinata 45Â°": "Curls martello panca inlinata 45°",
  "Curls panca 45Â°": "Curls panca 45°",
  "French press panca 40Â°": "French press panca 40°",
  "Military al multypower panca70Â°": "Military al multypower panca70°",
  "Pressa 45Â°": "Pressa 45°",
  "Pressa45Â° piedi alti schienale chiuso": "Pressa45° piedi alti schienale chiuso",
  "Rematore manubri panca 30Â°": "Rematore manubri panca 30°",
  "pulldown sbarra": "Pull down sbarra",
  "Stacco B stance con cavo": "Stacco B Stance cavo",
  "Push ups": "Push Up",
  /* PASSO 20: i tre nomi che stavano qui (Affondo front squat machine,
   * Pulley mono, Slanci laterali cavo basso) ora SONO esercizi del catalogo,
   * con il loro distretto: l'alias non serve piu' e, se restasse, li
   * riportare al nome vicino (sbagliato per Pendulum glutei, che finiva
   * Quadricipiti). Restano qui i nomi vicini, scritti in un altro modo. */
  "Pendulum glutei": "Pendulum focus glutei",
  "Pendulum focus gluteo": "Pendulum focus glutei",
  "Slancio laterale cavo basso": "Slanci laterali cavo basso",
  "Pulley mono braccio": "Pulley mono",
  "Lat machine presa neutra stretta": "Lat machine presa neutra"
});

/* Il nome che si conta davvero: se è un doppione, il suo nome canonico. */
export function nomeCanonico(nome) {
  const n = String(nome == null ? "" : nome).trim();
  const a = ALIAS_NOMI[n];
  return a ? a : n;
}

/* Come si legge un nome: minuscole, senza accenti, «1x» via (un conto di serie
 * non fa parte del nome), punteggiatura via, spazi compattati. È UNA sola
 * normalizzazione per tutto il progetto: «Pressa45°_piedi_alti» e
 * «pressa45 piedi alti» sono lo stesso esercizio. */
export function normalizzaNome(nome) {
  let s = String(nome == null ? "" : nome).toLowerCase();
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/\b\d+\s*[x×]\s*\d*\b/g, " ").replace(/\b[x×]\s*\d+\b/g, " ");
  s = s.replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
  return s;
}

/* Lo stesso nome, chiamato come prima: i file che lo importavano da
 * articolazioni-b o da muscoli-b prendono questa funzione. */
export const nomeNormalizzato = normalizzaNome;

/* I distretti come li scrive la casa (le stesse etichette della scheda). */
export const DISTRETTI_MUSCOLI = Object.freeze([
  "Pettorali", "Dorsali", "Spalle", "Bicipiti", "Tricipiti",
  "Quadricipiti", "Femorali", "Glutei", "Adduttori",
  "Centro schiena", "Addominali", "Polpacci", "Cardio"
]);

/* Le parole di App A tradotte nei nostri distretti: A scrive «deltoidi
 * laterali», noi contiamo «Spalle»; A scrive «erettori spinali», noi contiamo
 * «Centro schiena». Quello che non si riconosce resta vuoto, mai indovinato. */
export const DA_PAROLA_A_DISTRETTO = Object.freeze([
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
]);

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

/* Gli alias indicizzati sul nome normalizzato: «PULLEY  MONO» deve trovare
 * «Pulley triangolo» come lo trova «Pulley mono». */
const ALIAS_NORMALIZZATI = (() => {
  const indice = Object.create(null);
  Object.keys(ALIAS_NOMI).forEach((alias) => {
    const k = normalizzaNome(alias);
    if (!k) return;
    const canonico = ALIAS_NOMI[alias];
    /* se due alias normalizzati collidono vince quello scritto per esteso */
    if (!indice[k] || alias === nomeCanonico(alias)) indice[k] = canonico;
  });
  return indice;
})();

/* Il catalogo dei 186 esercizi, con il distretto tradotto. È la voce di
 * catalogo che risponde anche quando la mappa dei muscoli non ha il nome. */
let CATALOGO_BASE = null;
export function catalogoBase() {
  if (CATALOGO_BASE) return CATALOGO_BASE;
  CATALOGO_BASE = CATALOGO_ESERCIZI_B.map((v) => Object.freeze({
    nome: v.n,
    distretto: distrettoDaParola(v.g)
  }));
  return CATALOGO_BASE;
}

/* Una voce di qualsiasi forma: stringa, {nome, distretto}, {n, g}. */
function voceDa(v) {
  if (typeof v === "string") return { nome: v, distretto: "" };
  if (!v || typeof v !== "object") return null;
  const nome = v.nome != null ? v.nome : (v.n != null ? v.n : v.name);
  const distretto = v.distretto != null ? v.distretto : (v.g != null ? v.g : (v.muscolo != null ? v.muscolo : ""));
  return { nome: String(nome == null ? "" : nome), distretto: String(distretto == null ? "" : distretto) };
}

function uniche(voci) {
  const viste = Object.create(null);
  const out = [];
  voci.forEach((v) => {
    const k = v && v.nome ? v.nome : "";
    if (!k || viste[k]) return;
    viste[k] = true;
    out.push(v);
  });
  return out;
}

function niente(come, candidati) {
  return { nome: null, chiave: null, distretto: "", come: come || null, candidati: candidati || [] };
}

/* I quattro passi su un elenco qualunque di voci. È il cuore del resolver:
 * quello che cambia fra un modulo e l'altro è solo l'elenco che si passa. */
export function risolviInElenco(nome, voci) {
  const scritto = String(nome == null ? "" : nome).trim();
  const elenco = (Array.isArray(voci) ? voci : []).map(voceDa).filter((v) => v && v.nome);
  const n = normalizzaNome(scritto);
  if (!elenco.length || !n) return niente(null);

  /* l'indice: una voce per nome canonico normalizzato, così i doppioni del
   * catalogo (30° / 30Â°) non diventano due candidati */
  const perNorma = Object.create(null);
  elenco.forEach((v) => {
    const k = normalizzaNome(nomeCanonico(v.nome));
    if (!k) return;
    if (!perNorma[k]) perNorma[k] = v;
  });

  /* 1. esatto */
  const esatto = perNorma[n];
  if (esatto) return { nome: esatto.nome, chiave: esatto.nome, distretto: esatto.distretto, come: "esatto", candidati: [esatto.nome] };

  /* 2. alias */
  const canonico = ALIAS_NORMALIZZATI[n];
  if (canonico && perNorma[normalizzaNome(canonico)]) {
    const v = perNorma[normalizzaNome(canonico)];
    return { nome: v.nome, chiave: v.nome, distretto: v.distretto, come: "alias", candidati: [v.nome] };
  }

  /* 3. il nome scritto contiene UNA chiave sola */
  const dentro = [];
  Object.keys(perNorma).forEach((k) => {
    if (k.length >= 3 && k !== n && n.indexOf(k) > -1) dentro.push(perNorma[k]);
  });
  const unicheDentro = uniche(dentro);
  if (unicheDentro.length === 1) {
    return { nome: unicheDentro[0].nome, chiave: unicheDentro[0].nome, distretto: unicheDentro[0].distretto, come: "contiene", candidati: [unicheDentro[0].nome] };
  }
  if (unicheDentro.length > 1) return niente("ambiguo", unicheDentro.map((v) => v.nome));

  /* 4. il nome scritto è contenuto in UNA chiave sola */
  if (n.length >= 3) {
    const fuori = [];
    Object.keys(perNorma).forEach((k) => {
      if (k.length > n.length && k.indexOf(n) > -1) fuori.push(perNorma[k]);
    });
    const unicheFuori = uniche(fuori);
    if (unicheFuori.length === 1) {
      return { nome: unicheFuori[0].nome, chiave: unicheFuori[0].nome, distretto: unicheFuori[0].distretto, come: "contenuto", candidati: [unicheFuori[0].nome] };
    }
    if (unicheFuori.length > 1) return niente("ambiguo", unicheFuori.map((v) => v.nome));
  }

  return niente(null);
}

/* IL RESOLVER. Dato il nome (e, se c'è, il distretto/muscolo della riga):
 *   - i quattro passi sul catalogo che il chiamante gli dà (`voci`);
 *   - se non si riconosce, il distretto che la riga porta già;
 *   - altrimenti la collezione esercizi della zona B (`eserciziZonaB`), con
 *     gli stessi quattro passi.
 * `fonte` dice quale delle tre strade ha risposto: «catalogo esercizi»,
 * «distretto della scheda», «catalogo della zona B»; null se nessuna. */
export function risolviEsercizio(nome, opzioni) {
  const o = opzioni && typeof opzioni === "object" ? opzioni : {};
  const voci = Array.isArray(o.voci) && o.voci.length ? o.voci : catalogoBase();
  const trovato = risolviInElenco(nome, voci);
  if (trovato.chiave) return Object.assign({}, trovato, { fonte: "catalogo esercizi" });

  const noto = distrettoDaParola(o.distretto);
  if (noto) {
    return { nome: null, chiave: null, distretto: noto, come: "distretto", candidati: [], fonte: "distretto della scheda" };
  }

  if (Array.isArray(o.eserciziZonaB) && o.eserciziZonaB.length) {
    const zb = risolviInElenco(nome, o.eserciziZonaB);
    if (zb.chiave) return Object.assign({}, zb, { fonte: "catalogo della zona B" });
    if (zb.come === "ambiguo") return Object.assign({}, zb, { fonte: null });
  }

  return { nome: null, chiave: null, distretto: "", come: trovato.come, candidati: trovato.candidati, fonte: null };
}
