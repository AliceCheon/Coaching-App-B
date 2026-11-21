/* Barbell Diva B - PASSO 6a: la mappa articolare e il conto dello stress.
 *
 * Perche' esiste. La proposta sta in docs/articolazioni-tabella.md: ogni
 * esercizio del catalogo con la sua articolazione principale, al massimo due
 * secondarie. Qui quella tabella diventa codice, con le decisioni di Alice:
 *   - il cardio resta elencato ma non da' punti;
 *   - «Triset glutei» e' UN esercizio, non tre (la riga vale una volta);
 *   - Ab Roll: principale la colonna lombare, secondaria la spalla;
 *   - i 13 doppioni del catalogo si uniscono con una mappa alias INTERNA a
 *     questo modulo: il catalogo resta congelato com'e'.
 *
 * Nessun DOM, nessun Firestore, nessun testo a schermo: entra una scheda,
 * esce il conto. Le serie passano SOLO da contaNelVolume(e), la stessa
 * funzione del Volume: un numero solo per la stessa riga.
 */

import { contaNelVolume } from "./tecniche-b.js";
import { settimaneDiEsercizio } from "./analisi-programmazione.js";
import { TOLLERANZE } from "./tolleranze-b.js";

/* Le articolazioni, nell'ordine in cui si leggono. Il collo non c'e': il
 * catalogo non ha un esercizio che lo carichi, e un'articolazione inventata
 * sarebbe un numero inventato. */
export const ARTICOLAZIONI = Object.freeze([
  "spalla", "gomito", "polso", "anca", "ginocchio", "caviglia",
  "colonna lombare", "colonna toracica"
]);

/* Un punto alla principale, mezzo alle secondarie, mai piu' di 2 in totale. */
export const PUNTI_PRINCIPALE = 1;
export const PUNTI_SECONDARIA = 0.5;
export const TETTO_ESERCIZIO = 2;

/* I nomi del catalogo restano quelli veri (anche quelli con il carattere
 * rovinato): qui sotto ci sono tutti e 179, nell'ordine del catalogo. */
export const MAPPA_ARTICOLARE = Object.freeze({
  "Ab Roll": { p: "colonna lombare", s: ["spalla"] },
  "Abductor": { p: "anca", s: [] },
  "Addominali livello 1": { p: "colonna lombare", s: ["anca"] },
  "Adductor": { p: "anca", s: [] },
  "Affondi al multypower": { p: "anca", s: ["ginocchio", "caviglia"] },
  "Affondi forntali manubri": { p: "anca", s: ["ginocchio", "caviglia"] },
  "Affondo con rotazione busto triset": { p: "anca", s: ["ginocchio", "colonna lombare"] },
  "Affondo pesante triset": { p: "anca", s: ["ginocchio", "caviglia"] },
  "Alzata laterale su panca inclinata 30°": { p: "spalla", s: [] },
  "Alzata laterale su panca inclinata 30Â°": { p: "spalla", s: [] },
  "Alzate deltoidi posteriori": { p: "spalla", s: ["colonna toracica"] },
  "Alzate laterali": { p: "spalla", s: [] },
  "Alzate laterali + alzate frontali panca 70°": { p: "spalla", s: ["colonna toracica"] },
  "Alzate laterali + alzate frontali panca 70Â°": { p: "spalla", s: ["colonna toracica"] },
  "Alzate laterali cavo basso cavigliera polso": { p: "spalla", s: [] },
  "Alzate laterali macchinario": { p: "spalla", s: [] },
  "Alzate laterali Seduta": { p: "spalla", s: [] },
  "Arnold Press": { p: "spalla", s: ["gomito"] },
  "Bulgaro focus glutei": { p: "anca", s: ["ginocchio", "caviglia"] },
  "Burbees": { p: null, s: [] },
  "Calf al multypower": { p: "caviglia", s: ["ginocchio"] },
  "Calf Frog": { p: "caviglia", s: ["ginocchio"] },
  "Calf machine": { p: "caviglia", s: [] },
  "Cardio tapins + corsa": { p: null, s: [] },
  "Chest press": { p: "spalla", s: ["gomito"] },
  "Clam shell side plank": { p: "anca", s: ["colonna lombare"] },
  "Croci ai cavi": { p: "spalla", s: ["gomito"] },
  "Croci inverse con uso delle scapole": { p: "spalla", s: ["colonna toracica"] },
  "Croci inverse manubri": { p: "spalla", s: ["colonna toracica"] },
  "Croci manubri": { p: "spalla", s: ["gomito"] },
  "Croci manubri su panca inclinata": { p: "spalla", s: ["gomito"] },
  "Cross over ai cavi": { p: "spalla", s: ["gomito"] },
  "Crunch classici": { p: "colonna lombare", s: ["colonna toracica"] },
  "Crunch gambe 90°": { p: "colonna lombare", s: ["colonna toracica"] },
  "Crunch gambe 90Â°": { p: "colonna lombare", s: ["colonna toracica"] },
  "Crunch machine": { p: "colonna lombare", s: ["colonna toracica"] },
  "crunch obliqui": { p: "colonna lombare", s: ["colonna toracica"] },
  "Curl cavo basso con bilancere piccolo": { p: "gomito", s: ["polso"] },
  "Curl manubri": { p: "gomito", s: ["polso"] },
  "Curls Bilaciere Z": { p: "gomito", s: ["polso"] },
  "Curls manubri schiena al muro": { p: "gomito", s: ["polso"] },
  "Curls martello in piedi": { p: "gomito", s: ["polso"] },
  "Curls martello panca": { p: "gomito", s: [] },
  "Curls martello panca inlinata 45°": { p: "gomito", s: [] },
  "Curls martello panca inlinata 45Â°": { p: "gomito", s: [] },
  "Curls panca 45°": { p: "gomito", s: [] },
  "Curls panca 45Â°": { p: "gomito", s: [] },
  "Curls panca scoot": { p: "gomito", s: [] },
  "Curls trx": { p: "gomito", s: ["spalla"] },
  "Dead bug dinamico": { p: "colonna lombare", s: ["anca"] },
  "Dips inclinato in avanti": { p: "spalla", s: ["gomito"] },
  "Dips stretti": { p: "gomito", s: ["spalla"] },
  "Distensione manubri su inclinata": { p: "spalla", s: ["gomito"] },
  "Distensioni manubri su piana": { p: "spalla", s: ["gomito"] },
  "Donkey calf": { p: "caviglia", s: ["ginocchio"] },
  "Dragon Flag": { p: "colonna lombare", s: ["spalla"] },
  "Dragon Flag mono": { p: "colonna lombare", s: ["spalla"] },
  "Ellittica": { p: null, s: [] },
  "Face Pull": { p: "spalla", s: ["gomito", "colonna toracica"] },
  "Face pull reverse pec": { p: "spalla", s: ["colonna toracica"] },
  "Farmer Walk": { p: "colonna lombare", s: ["polso"] },
  "Floor press bilanciere": { p: "spalla", s: ["gomito"] },
  "Floor press manubri": { p: "spalla", s: ["gomito"] },
  "French press bilanciere Z": { p: "gomito", s: ["spalla"] },
  "French press manubri": { p: "gomito", s: ["spalla"] },
  "French press panca 40°": { p: "gomito", s: [] },
  "French press panca 40Â°": { p: "gomito", s: [] },
  "Frog Pump con elastico": { p: "anca", s: [] },
  "Front squat machine": { p: "ginocchio", s: ["anca", "colonna lombare"] },
  "Gentlemen row": { p: "colonna toracica", s: ["gomito", "spalla"] },
  "Ghd": { p: "ginocchio", s: ["anca"] },
  "GHD lateral crunch": { p: "colonna lombare", s: [] },
  "GHD sit up crunch": { p: "colonna lombare", s: ["anca"] },
  "Glutes machine": { p: "anca", s: [] },
  "Goblet squat": { p: "ginocchio", s: ["anca", "colonna toracica"] },
  "Hack Squat con elastico": { p: "ginocchio", s: ["anca"] },
  "Hamstring Destroyers": { p: "ginocchio", s: ["anca"] },
  "Hip Thrust": { p: "anca", s: ["ginocchio"] },
  "Hip Thrust statico": { p: "anca", s: ["ginocchio"] },
  "Hip Trust mono": { p: "anca", s: ["ginocchio"] },
  "Hollow position": { p: "colonna lombare", s: ["anca"] },
  "Hypersetensioni con cuscino": { p: "colonna lombare", s: ["anca"] },
  "Hyperstension con cuscinetto": { p: "colonna lombare", s: ["anca"] },
  "Jefferson Culs": { p: "colonna lombare", s: ["anca", "ginocchio"] },
  "Kick back": { p: "gomito", s: ["spalla"] },
  "Krock Row": { p: "colonna toracica", s: ["gomito", "spalla"] },
  "Lat machine": { p: "spalla", s: ["gomito", "colonna toracica"] },
  "Lat Machine supina": { p: "spalla", s: ["gomito", "colonna toracica"] },
  "Lat machine Triangolo": { p: "spalla", s: ["gomito"] },
  "Lat mono braccio": { p: "spalla", s: ["gomito"] },
  "Leg curls": { p: "ginocchio", s: ["anca"] },
  "Leg curls seduta": { p: "ginocchio", s: ["anca"] },
  "Leg curls singolo": { p: "ginocchio", s: [] },
  "Leg Curs Fitbal": { p: "ginocchio", s: ["anca", "colonna lombare"] },
  "Leg Extension": { p: "ginocchio", s: [] },
  "Leg extension singola": { p: "ginocchio", s: [] },
  "Leg press steso": { p: "ginocchio", s: ["anca", "caviglia"] },
  "Leg raise": { p: "anca", s: ["colonna lombare"] },
  "Lento avanti machine": { p: "spalla", s: ["gomito"] },
  "Lento avanti manubri": { p: "spalla", s: ["gomito"] },
  "Military al multypower panca70°": { p: "spalla", s: ["gomito", "colonna toracica"] },
  "Military al multypower panca70Â°": { p: "spalla", s: ["gomito", "colonna toracica"] },
  "Military press": { p: "spalla", s: ["gomito"] },
  "Panca inclinata": { p: "spalla", s: ["gomito"] },
  "Panca piana": { p: "spalla", s: ["gomito"] },
  "Passo del granchio": { p: "anca", s: ["colonna lombare"] },
  "Peck deck": { p: "spalla", s: ["colonna toracica"] },
  "Pendaly Row": { p: "colonna toracica", s: ["gomito", "spalla"] },
  "Pendulum": { p: "ginocchio", s: ["anca"] },
  "Piegamenti sulle braccia": { p: "spalla", s: ["gomito", "colonna lombare"] },
  "Plank statico": { p: "colonna lombare", s: ["spalla"] },
  "Polpacci in piedi": { p: "caviglia", s: ["ginocchio"] },
  "Polpacci seduto": { p: "caviglia", s: [] },
  "Pressa 45°": { p: "ginocchio", s: ["anca", "caviglia"] },
  "Pressa 45Â°": { p: "ginocchio", s: ["anca", "caviglia"] },
  "Pressa mono gamba": { p: "ginocchio", s: ["anca", "caviglia"] },
  "Pressa verticale panatta": { p: "ginocchio", s: ["anca"] },
  "Pressa45° piedi alti schienale chiuso": { p: "anca", s: ["ginocchio"] },
  "Pressa45Â° piedi alti schienale chiuso": { p: "anca", s: ["ginocchio"] },
  "Pull Down corda": { p: "spalla", s: ["gomito"] },
  "Pull down sbarra": { p: "spalla", s: ["gomito", "colonna toracica"] },
  "pulldown sbarra": { p: "spalla", s: ["gomito", "colonna toracica"] },
  "Pulley sbarra presa larga supina": { p: "colonna toracica", s: ["gomito", "spalla"] },
  "Pulley triangolo": { p: "colonna toracica", s: ["gomito", "spalla"] },
  "Pullover bilanciere": { p: "spalla", s: ["gomito", "colonna lombare"] },
  "Pullover manubrio": { p: "spalla", s: ["gomito"] },
  "Push Press Ktb": { p: "spalla", s: ["gomito", "ginocchio"] },
  "Push Up": { p: "spalla", s: ["gomito", "colonna lombare"] },
  "Push ups": { p: "gomito", s: ["spalla"] },
  "RDL Belt machine": { p: "anca", s: ["ginocchio", "colonna lombare"] },
  "RDL focus Gluteo": { p: "anca", s: ["ginocchio", "colonna lombare"] },
  "RDL focus Gluteo Belt machine": { p: "anca", s: ["ginocchio", "colonna lombare"] },
  "Reamtore mono braccio corda bassa": { p: "colonna toracica", s: ["gomito", "spalla"] },
  "Rematore  Dead Stop": { p: "colonna toracica", s: ["gomito", "anca"] },
  "Rematore bilanciere": { p: "colonna toracica", s: ["gomito", "anca"] },
  "Rematore Bilanciere Z": { p: "colonna toracica", s: ["gomito"] },
  "Rematore manubri panca 30°": { p: "colonna toracica", s: ["gomito"] },
  "Rematore manubri panca 30Â°": { p: "colonna toracica", s: ["gomito"] },
  "Rematore supino": { p: "colonna toracica", s: ["gomito"] },
  "Renegade row": { p: "colonna lombare", s: ["gomito", "spalla"] },
  "Rotazioni cavo medio": { p: "colonna toracica", s: ["anca"] },
  "Row machine panatta": { p: "colonna toracica", s: ["gomito"] },
  "Scrollate con manubri": { p: "colonna toracica", s: ["spalla"] },
  "Side Plank": { p: "colonna lombare", s: ["spalla"] },
  "Sissy squat in piedi": { p: "ginocchio", s: ["anca"] },
  "Slanci cavo basso": { p: "anca", s: [] },
  "Slancio laterale cavo basso triset": { p: "anca", s: ["ginocchio"] },
  "Spider curls": { p: "gomito", s: ["spalla"] },
  "Sprawl": { p: null, s: [] },
  "Squat": { p: "ginocchio", s: ["anca", "colonna lombare"] },
  "Squat al multypower": { p: "ginocchio", s: ["anca", "colonna lombare"] },
  "Squat Bulgaro focus quads": { p: "ginocchio", s: ["anca", "caviglia"] },
  "Squez Press": { p: "spalla", s: ["gomito"] },
  "Stacco B Stance cavo": { p: "anca", s: ["ginocchio", "colonna lombare"] },
  "Stacco B stance con cavo": { p: "anca", s: ["ginocchio", "colonna lombare"] },
  "Stacco da rialzi": { p: "anca", s: ["ginocchio", "colonna lombare"] },
  "Stacco gambe semi tese": { p: "anca", s: ["colonna lombare", "ginocchio"] },
  "Stacco mono gamba": { p: "anca", s: ["ginocchio", "colonna lombare"] },
  "Stacco RDL": { p: "anca", s: ["colonna lombare", "ginocchio"] },
  "Stacco Regular": { p: "anca", s: ["colonna lombare", "ginocchio"] },
  "Stacco Sumo": { p: "anca", s: ["ginocchio", "colonna lombare"] },
  "Stretchers": { p: "spalla", s: ["colonna toracica"] },
  "T bar": { p: "colonna toracica", s: ["gomito", "anca"] },
  "Tabata": { p: null, s: [] },
  "Tapins Roulant": { p: null, s: [] },
  "Trazioni": { p: "spalla", s: ["gomito", "colonna toracica"] },
  "Trazioni assistite": { p: "spalla", s: ["gomito"] },
  "Trazioni gironda": { p: "spalla", s: ["gomito"] },
  "Trazioni neutre": { p: "spalla", s: ["gomito"] },
  "Trazioni supine": { p: "spalla", s: ["gomito"] },
  "Tricipiti cavo alto in corda": { p: "gomito", s: ["spalla"] },
  "Tricipiti cavo basso dietro la testa": { p: "gomito", s: ["spalla"] },
  "Tricipiti manubrio dietro la testa": { p: "gomito", s: ["spalla"] },
  "Tricipiti mono braccio cavo alto": { p: "gomito", s: ["spalla"] },
  "Tricipiti Pullover": { p: "gomito", s: ["spalla"] },
  "Triset glutei": { p: "anca", s: ["colonna lombare"] },
  "Vertical Traction": { p: "spalla", s: ["gomito", "colonna toracica"] },
  "Vogatore": { p: null, s: [] },
  "Y raises cavo alto": { p: "spalla", s: ["colonna toracica"] }
});

/* I doppioni: stesso esercizio, nome scritto due volte nel catalogo (carattere
 * rovinato, maiuscola, spazio). La destra e' il nome che si conta. */
export const ALIAS = Object.freeze({
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
  /* PASSO 6f: tre nomi che l'Excel scrive e il catalogo non ha */
  "Affondo front squat machine": "Front squat machine",
  "Pulley mono": "Pulley triangolo",
  "Slanci laterali cavo basso": "Slanci cavo basso"
});

/* Il cardio: elencato, zero punti. Non e' un gesto articolare unico. */
export const CARDIO = Object.freeze([
  "Burbees", "Cardio tapins + corsa", "Ellittica", "Sprawl", "Tabata",
  "Tapins Roulant", "Vogatore"
]);

/* Il nome che si conta davvero: se e' un doppione, il suo nome canonico. */
export function nomeCanonico(nome) {
  const n = String(nome == null ? "" : nome).trim();
  const a = ALIAS[n];
  return a ? a : n;
}

export function eCardio(nome) {
  return CARDIO.indexOf(nomeCanonico(nome)) > -1;
}

/* ---------- PASSO 6c-fix-3: il nome puo' essere scritto un po' diverso -----
 *
 * Il catalogo e' congelato, ma i nomi arrivano da un file Excel e possono
 * avere la maiuscola sbagliata, due spazi, un accento, un «1x» attaccato.
 * La ricerca va in quest'ordine, e si ferma al primo passo che trova:
 *   1. nome esatto (o alias dei doppioni) — come sempre;
 *   2. nome NORMALIZZATO: minuscole, spazi compattati, accenti e punteggiatura
 *      tolti, «1x» e simili ignorati — ma solo se la corrispondenza e' UNA;
 *   3. il nome scritto CONTIENE una chiave del catalogo — ancora solo se e'
 *      una sola.
 * Se resta piu' d'un candidato non si indovina: «nonMappato», cosi' la carta
 * puo' dirlo con i numeri invece di contare punti a caso.
 * ------------------------------------------------------------------------- */
export function nomeNormalizzato(nome) {
  let s = String(nome == null ? "" : nome).toLowerCase();
  /* gli accenti: "classìci" e "classici" sono la stessa parola */
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  /* «1x», «x10», «3x12»: un conto di serie non fa parte del nome */
  s = s.replace(/\b\d+\s*[x×]\s*\d*\b/g, " ").replace(/\b[x×]\s*\d+\b/g, " ");
  /* punteggiatura via (il grado di «45°» resta come numero), spazi compattati */
  s = s.replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
  return s;
}

/* Una chiave per nome canonico: i doppioni non devono contarsi due volte. */
let CHIAVI_CATALOGO = null;
function chiaviCatalogo() {
  if (CHIAVI_CATALOGO) return CHIAVI_CATALOGO;
  const viste = Object.create(null);
  const elenco = [];
  Object.keys(MAPPA_ARTICOLARE).forEach((chiave) => {
    const canonico = nomeCanonico(chiave);
    if (viste[canonico]) return;
    viste[canonico] = true;
    elenco.push(canonico);
  });
  CHIAVI_CATALOGO = elenco;
  return CHIAVI_CATALOGO;
}

/* Nome normalizzato -> nomi canonici che lo producono (di solito uno). */
let INDICE_NORMALIZZATO = null;
function indiceNormalizzato() {
  if (INDICE_NORMALIZZATO) return INDICE_NORMALIZZATO;
  const indice = Object.create(null);
  chiaviCatalogo().forEach((canonico) => {
    const n = nomeNormalizzato(canonico);
    if (!n) return;
    const elenco = indice[n] || (indice[n] = []);
    if (elenco.indexOf(canonico) === -1) elenco.push(canonico);
  });
  INDICE_NORMALIZZATO = indice;
  return INDICE_NORMALIZZATO;
}

/* { chiave, come }: la chiave del catalogo che corrisponde a `nome`, e per
 * quale strada. chiave null = non riconosciuto (o ambiguo: non si indovina). */
export function nomeDelCatalogo(nome) {
  const canonico = nomeCanonico(nome);
  if (MAPPA_ARTICOLARE[canonico]) return { chiave: canonico, come: "esatto" };
  const n = nomeNormalizzato(nome);
  if (!n) return { chiave: null, come: null };
  const perNorma = indiceNormalizzato()[n];
  if (perNorma && perNorma.length === 1) return { chiave: perNorma[0], come: "normalizzato" };
  if (perNorma && perNorma.length > 1) return { chiave: null, come: "ambiguo" };
  /* ultimo passo: il nome scritto contiene UNA chiave del catalogo */
  let candidate = [];
  chiaviCatalogo().forEach((chiave) => {
    const nk = nomeNormalizzato(chiave);
    if (nk.length < 3 || n === nk) return;
    if (n.indexOf(nk) > -1) candidate.push(chiave);
  });
  if (candidate.length === 1) return { chiave: candidate[0], come: "contiene" };
  return { chiave: null, come: candidate.length > 1 ? "ambiguo" : null };
}

/* ---------- PASSO 6f: la schiena che PORTA carico ------------------------
 *
 * Un esercizio ha una principale (il muscolo che si muove) e delle secondarie.
 * Ma nei modelli sotto la colonna lombare non «aiuta»: porta il carico con il
 * resto del corpo. In quei casi vale 1 punto come una principale, non 0,5.
 *
 * I modelli, uno per uno, con il nome che finisce nel report:
 *   squat (squat, goblet, pendulum, front squat) — non pressa, hack, sissy,
 *   che sostengono la schiena (passo 6g),
 *   affondo (affondi, bulgaro),
 *   stacco/hip hinge (stacco, RDL),
 *   rematore (rematore, row, pendaly, krock, t bar, pulley, gentlemen),
 *   military IN PIEDI (military, push press, lento avanti — non seduto).
 *
 * Il tetto di 2 punti per esercizio non si tocca: se la riga ha gia'
 * principale + due secondarie, la seconda secondaria esce.
 * ------------------------------------------------------------------------- */
export const MODELLI_LOMBARE = Object.freeze([
  /* PASSO 6g: pressa, hack e sissy NON caricano la schiena in piedi (la schiena
   * e' sostenuta): la lombare resta com'era prima del 6f. */
  { modello: "squat", prova: (n) => /squat|goblet|pendulum/.test(n) && !/hack|sissy|pressa/.test(n) },
  { modello: "affondo", prova: (n) => /affond|bulgar/.test(n) },
  { modello: "stacco", prova: (n) => /stacco|rdl/.test(n) },
  /* i rematori appoggiati alla panca non portano carico sulla schiena */
  { modello: "rematore", prova: (n) => /remator|reator|row|pendaly|krock|t bar|pulley|gentlemen/.test(n) && !/panca/.test(n) },
  { modello: "military in piedi", prova: (n) => (/military|push press|lento avanti/.test(n) && !/panca ?70/.test(n)) }
]);

/* Il modello di carico di un nome del catalogo (null se non ne ha uno). */
export function modelloDiCarico(nome) {
  const n = nomeNormalizzato(nome);
  if (!n) return null;
  const trovato = MODELLI_LOMBARE.filter((m) => m.prova(n))[0];
  return trovato ? trovato.modello : null;
}

/* Gli esercizi del catalogo che hanno preso il secondo principale: serve al
 * report, perche' Alice deve vedere chi ha guadagnato peso. */
export function eserciziConSecondoPrincipale() {
  return chiaviCatalogo().map((chiave) => {
    const art = articolazioniDi(chiave);
    return {
      catalogo: chiave,
      modello: art.modello,
      principale: art.principale,
      secondarie: art.secondarie.slice(),
      secondiPrincipali: (art.secondiPrincipali || []).slice(),
      punti: Object.assign({}, art.punti)
    };
  }).filter((x) => x.secondiPrincipali.length > 0)
    .sort((a, b) => a.catalogo.localeCompare(b.catalogo));
}

/* L'articolazione di un esercizio: { principale, secondarie, punti, cardio }.
 * Un nome che il catalogo non ha non inventa niente: resta senza articolazione
 * e lo si dice con "nonMappato". `catalogo` dice quale nome del catalogo ha
 * risposto, `come` per quale strada: servono alla nota della carta. */
export function articolazioniDi(nome) {
  const canonico = nomeCanonico(nome);
  const trovato = nomeDelCatalogo(nome);
  const voce = trovato.chiave ? MAPPA_ARTICOLARE[trovato.chiave] : null;
  if (!voce) return { nome: canonico, catalogo: null, come: trovato.come, principale: null, secondarie: [], punti: Object.create(null), cardio: false, nonMappato: true };
  if (!voce.p) return { nome: canonico, catalogo: trovato.chiave, come: trovato.come, principale: null, secondarie: [], punti: Object.create(null), cardio: true, nonMappato: false };
  const punti = Object.create(null);
  punti[voce.p] = PUNTI_PRINCIPALE;
  voce.s.forEach((a) => { if (!punti[a]) punti[a] = PUNTI_SECONDARIA; });
  /* PASSO 6f: la colonna lombare che PORTA carico sale a 1 punto. */
  const modello = modelloDiCarico(trovato.chiave);
  const secondiPrincipali = [];
  if (modello && punti["colonna lombare"] !== PUNTI_PRINCIPALE) {
    punti["colonna lombare"] = PUNTI_PRINCIPALE;
    secondiPrincipali.push("colonna lombare");
  }
  /* Il tetto: se si passa 2 punti, escono le secondarie piu' leggere (0,5). */
  const chiavi = Object.keys(punti);
  let somma = chiavi.reduce((acc, k) => acc + punti[k], 0);
  chiavi.sort((a, b) => punti[a] - punti[b]);
  for (let i = 0; i < chiavi.length && somma > TETTO_ESERCIZIO; i += 1) {
    somma -= punti[chiavi[i]];
    delete punti[chiavi[i]];
  }
  return {
    nome: canonico,
    catalogo: trovato.chiave,
    come: trovato.come,
    modello: modello,
    principale: punti[voce.p] ? voce.p : null,
    secondarie: voce.s.filter((a) => punti[a] === PUNTI_SECONDARIA),
    secondiPrincipali: secondiPrincipali,
    punti: punti,
    cardio: false,
    nonMappato: false
  };
}

function numero(testo) {
  if (testo == null || testo === "") return null;
  const n = Number(String(testo).replace(",", ".").trim());
  return Number.isFinite(n) ? n : null;
}

function serieDi(w) {
  if (!w || typeof w !== "object") return null;
  const v = numero(w.serie != null ? w.serie : w.sets);
  return v != null && v >= 0 ? v : null;
}

/* Il conto. Entra una scheda ({ codice, esercizi: [...] }), esce per ogni
 * articolazione: le serie equivalenti settimana per settimana (serie x punti),
 * il totale del blocco e l'elenco degli esercizi che la caricano.
 *
 * - conta solo le righe che contano nel volume (contaNelVolume);
 * - una riga vale una volta: il triset non si moltiplica per tre;
 * - il cardio non da' punti ma resta nell'elenco "senzaPunti";
 * - il blocco e' sempre di 8 settimane (la tabella ne mostra otto), di piu'
 *   solo se una riga ne porta davvero di piu'. */
export function stressArticolazioni(scheda, opzioni) {
  const o = opzioni || {};
  const esercizi = (scheda && Array.isArray(scheda.esercizi) ? scheda.esercizi : []);
  const perArticolazione = Object.create(null);
  const senzaPunti = [];
  const nonMappati = [];
  let quante = 8;
  let righeContate = 0;
  let righeSaltate = 0;
  let righeConArticolazione = 0;
  let righeCardio = 0;
  let righeNonMappate = 0;

  ARTICOLAZIONI.forEach((a) => {
    perArticolazione[a] = { articolazione: a, settimane: [], totale: 0, esercizi: [] };
  });

  esercizi.forEach((e) => {
    if (!e || typeof e !== "object" || e.deletedAt) { righeSaltate += 1; return; }
    if (!contaNelVolume(e)) { righeSaltate += 1; return; }
    const nome = String((e.nome != null ? e.nome : e.name) || "").trim();
    if (!nome) { righeSaltate += 1; return; }
    const sett = settimaneDiEsercizio(e);
    if (!sett.length) { righeSaltate += 1; return; }
    righeContate += 1;
    if (sett.length > quante) quante = sett.length;

    const art = articolazioniDi(nome);
    if (art.cardio) { senzaPunti.push({ nome: nome, motivo: "cardio" }); righeCardio += 1; return; }
    if (art.nonMappato) { senzaPunti.push({ nome: nome, motivo: "nonMappato" }); nonMappati.push(nome); righeNonMappate += 1; return; }
    righeConArticolazione += 1;

    sett.forEach((w, indice) => {
      const serie = serieDi(w);
      if (serie == null) return;
      Object.keys(art.punti).forEach((a) => {
        const voce = perArticolazione[a];
        if (!voce) return;
        voce.settimane[indice] = (voce.settimane[indice] || 0) + serie * art.punti[a];
      });
    });

    Object.keys(art.punti).forEach((a) => {
      const voce = perArticolazione[a];
      if (!voce) return;
      if (voce.esercizi.indexOf(nome) === -1) voce.esercizi.push(nome);
    });
  });

  const articolazioni = ARTICOLAZIONI.map((a) => {
    const voce = perArticolazione[a];
    const settimane = [];
    let totale = 0;
    for (let i = 0; i < quante; i += 1) {
      const v = voce.settimane[i] || 0;
      settimane.push(v);
      totale += v;
    }
    return { articolazione: a, settimane: settimane, totale: totale, esercizi: voce.esercizi };
  }).filter((v) => v.esercizi.length > 0 || o.tutte === true);

  return {
    quante: quante,
    articolazioni: articolazioni,
    senzaPunti: senzaPunti,
    nonMappati: nonMappati,
    righeContate: righeContate,
    righeSaltate: righeSaltate,
    righeConArticolazione: righeConArticolazione,
    righeCardio: righeCardio,
    righeNonMappate: righeNonMappate
  };
}

/* Il totale in parola per una settimana: serve a chi scrive una frase, non al
 * conto. Mai uno zero al posto di un dato che manca. */
export function serieInParola(v) {
  const n = Number(v) || 0;
  return (Math.round(n * 100) / 100).toString().replace(".", ",");
}

/* ---------- PASSO 6b: il riepilogo per la carta RED-S --------------------- */

/* stressRiepilogo(scheda): parte da stressArticolazioni e restituisce, per ogni
 * articolazione con una tolleranza, il carico massimo settimanale, quanto pesa
 * sulla tolleranza (in percentuale) e in che settimana arriva il massimo.
 * Piu' il riepilogo generale: media delle percentuali, articolazione piu'
 * sollecitata ed elenco di quelle sopra il 100%.
 *
 * Se la scheda non e' leggibile non inventa zeri: leggebile = false e il
 * motivo scritto, cosi' la carta puo' dirlo con parole sue. */
export function stressRiepilogo(scheda) {
  const conto = stressArticolazioni(scheda);
  const righe = Array.isArray(scheda && scheda.esercizi) ? scheda.esercizi.length : 0;
  if (conto.righeContate === 0) {
    return {
      leggibile: false,
      motivo: righe === 0 ? "la scheda non ha esercizi da leggere" : "nessuna riga della scheda entra nel volume",
      articolazioni: [],
      media: null,
      mediaIntera: null,
      piuSollecitata: null,
      sopraCento: [],
      righeContate: 0,
      righeConArticolazione: 0,
      righeSenza: 0,
      righeCardio: 0,
      righeNonMappate: 0,
      nomiNonRiconosciuti: [],
      tutteAZero: false
    };
  }

  const articolazioni = ARTICOLAZIONI.filter((a) => TOLLERANZE[a] != null).map((a) => {
    const trovata = conto.articolazioni.filter((x) => x.articolazione === a)[0] || null;
    const settimane = trovata ? trovata.settimane : [];
    let massimo = 0;
    let massimoSettimana = 0;
    settimane.forEach((v, i) => {
      if (v > massimo) { massimo = v; massimoSettimana = i + 1; }
    });
    const tolleranza = TOLLERANZE[a];
    const percentuale = (massimo / tolleranza) * 100;
    return {
      articolazione: a,
      tolleranza: tolleranza,
      massimo: massimo,
      massimoSettimana: massimoSettimana,
      percentuale: percentuale,
      sopraCento: percentuale > 100
    };
  });

  const somma = articolazioni.reduce((acc, x) => acc + x.percentuale, 0);
  const media = articolazioni.length ? somma / articolazioni.length : null;
  let piuSollecitata = null;
  articolazioni.forEach((x) => {
    if (!piuSollecitata || x.percentuale > piuSollecitata.percentuale) piuSollecitata = x;
  });

  return {
    leggibile: true,
    motivo: "",
    articolazioni: articolazioni,
    media: media,
    mediaIntera: media == null ? null : Math.round(media),
    piuSollecitata: piuSollecitata,
    sopraCento: articolazioni.filter((x) => x.sopraCento).map((x) => x.articolazione),
    righeContate: conto.righeContate,
    righeConArticolazione: conto.righeConArticolazione,
    righeSenza: conto.righeCardio + conto.righeNonMappate,
    righeCardio: conto.righeCardio,
    righeNonMappate: conto.righeNonMappate,
    /* i primi tre nomi che non ha riconosciuto: bastano per capire se e' il nome */
    nomiNonRiconosciuti: conto.nonMappati.slice(0, 3),
    nomiNonRiconosciutiTotale: conto.nonMappati.length,
    /* tutte a zero: nessun esercizio ha dato punti (e la carta lo dice) */
    tutteAZero: articolazioni.length > 0 && articolazioni.every((x) => x.massimo === 0)
  };
}

/* ---------- PASSO 6e: NON una scheda, ma la SETTIMANA intera ---------------
 *
 * Lo sbaglio da correggere: la carta guardava una scheda sola (la prima della
 * settimana), quindi con A/B/C/D il carico era quello di UNA seduta. Qui si
 * sommano tutte le schede che arrivano: per ogni articolazione, settimana per
 * settimana, si sommano le serie equivalenti; il massimo settimanale e' il
 * picco della settimana intera.
 *
 * Il numero grande non e' piu' la media delle otto percentuali (una media
 * nasconde proprio l'articolazione che si fa male): e' la percentuale della
 * struttura PIU' CARICATA, con la classifica di tutte e otto, dalla piu'
 * caricata alla meno.
 * ------------------------------------------------------------------------- */
export function stressSettimana(schede) {
  const elenco = (Array.isArray(schede) ? schede : [schede]).filter((s) => s && typeof s === "object");
  const perArticolazione = Object.create(null);
  ARTICOLAZIONI.forEach((a) => { perArticolazione[a] = { settimane: [], esercizi: [] }; });
  let quante = 0;
  let righeContate = 0;
  let righeSaltate = 0;
  let righeConArticolazione = 0;
  let righeCardio = 0;
  let righeNonMappate = 0;
  const nonMappati = [];

  elenco.forEach((scheda) => {
    const conto = stressArticolazioni(scheda);
    if (conto.quante > quante) quante = conto.quante;
    righeContate += conto.righeContate;
    righeSaltate += conto.righeSaltate;
    righeConArticolazione += conto.righeConArticolazione;
    righeCardio += conto.righeCardio;
    righeNonMappate += conto.righeNonMappate;
    conto.nonMappati.forEach((n) => nonMappati.push(n));
    conto.articolazioni.forEach((v) => {
      const voce = perArticolazione[v.articolazione];
      if (!voce) return;
      v.settimane.forEach((val, i) => { voce.settimane[i] = (voce.settimane[i] || 0) + val; });
      v.esercizi.forEach((nome) => { if (voce.esercizi.indexOf(nome) === -1) voce.esercizi.push(nome); });
    });
  });

  const nomiNonRiconosciuti = nonMappati.slice(0, 3);
  const base = {
    righeContate: righeContate,
    righeSaltate: righeSaltate,
    righeConArticolazione: righeConArticolazione,
    righeSenza: righeCardio + righeNonMappate,
    righeCardio: righeCardio,
    righeNonMappate: righeNonMappate,
    nomiNonRiconosciuti: nomiNonRiconosciuti,
    nomiNonRiconosciutiTotale: nonMappati.length,
    quante: quante,
    schedeLette: elenco.length
  };

  if (!righeContate) {
    return Object.assign({}, base, {
      leggibile: false,
      motivo: !elenco.length
        ? "la scheda non ha esercizi da leggere"
        : (elenco.every((s) => !Array.isArray(s.esercizi) || !s.esercizi.length)
          ? "la scheda non ha esercizi da leggere"
          : "nessuna riga della scheda entra nel volume"),
      articolazioni: [],
      classifica: [],
      piuCaricata: null,
      sopraCento: [],
      tutteAZero: false
    });
  }

  const articolazioni = ARTICOLAZIONI.filter((a) => TOLLERANZE[a] != null).map((a) => {
    const voce = perArticolazione[a];
    let massimo = 0;
    let massimoSettimana = 0;
    for (let i = 0; i < quante; i += 1) {
      const v = voce.settimane[i] || 0;
      if (v > massimo) { massimo = v; massimoSettimana = i + 1; }
    }
    const tolleranza = TOLLERANZE[a];
    const percentuale = (massimo / tolleranza) * 100;
    return {
      articolazione: a,
      tolleranza: tolleranza,
      massimo: massimo,
      massimoSettimana: massimoSettimana,
      percentuale: percentuale,
      sopraCento: percentuale > 100,
      esercizi: voce.esercizi.slice()
    };
  });

  /* La classifica: dalla piu' caricata alla meno. A pari carico resta
   * l'ordine del corpo (spalla, gomito, ...), cosi' due letture uguali
   * danno la stessa lista. */
  const classifica = articolazioni.slice().sort((a, b) => b.percentuale - a.percentuale);
  const piuCaricata = classifica.length ? classifica[0] : null;

  return Object.assign({}, base, {
    leggibile: true,
    motivo: "",
    articolazioni: articolazioni,
    classifica: classifica,
    piuCaricata: piuCaricata,
    sopraCento: articolazioni.filter((x) => x.sopraCento).map((x) => x.articolazione),
    tutteAZero: articolazioni.length > 0 && articolazioni.every((x) => x.massimo === 0)
  });
}
