/* Barbell Diva B — Rec e TUT: in colonna solo il valore, la frase in Descr./Setup.
 *
 * Regola di Alice (8/11/2026): nelle celle Rec e TUT stanno SOLO i valori.
 *   TUT  2-0-1, 3-1-1, 2-1-0-1  -> tre o quattro numeri uniti da trattini
 *   REC  2-3', 120-180 sec, 90", 1'30", 2'30", 1'-2'
 * Tutto il resto del testo e' la frase del coach e va in Descr./Setup, sia in
 * sola lettura sia con l'editor acceso: mai nel Rec/TUT, mai due volte.
 *
 * Il valore si prende in fondo alla frase («No recupero tra le braccia e poi
 * 1,30'» -> valore 1'30", frase «No recupero tra le braccia e poi»): e' li' che
 * sta il recupero che si prescrive davvero. Senza valore la cella resta vuota e
 * la frase sta lo stesso in Descr./Setup.
 *
 * Quando si sceglie un valore dalla freccetta o si usano + e -, cambia SOLO il
 * valore: la frase resta intatta nel dato, perche' il valore nuovo si mette al
 * posto di quello vecchio dentro il testo di sempre.
 *
 * In lettura i dati non si toccano: la separazione e' solo a schermo.
 */

const NON = "non registrato";
const TRATTINO = "\u2014";

/* Un recupero vero: un intervallo (2-3', 120-180 sec), minuti e secondi
 * (1'30", 2'30"), i soli minuti (2'), la virgola del v31 (1,30'), i secondi
 * (90") o il numero con l'unita' (90 sec, 2 min). */
const REC_VALORE = /(?:\d{1,2}\s*'\s*[-\u2013]\s*\d{1,2}\s*'?)|(?:\d{1,3}\s*[-\u2013]\s*\d{1,3}\s*(?:['\u2019\u2032"\u2033]|sec(?:ondi)?|min(?:uti)?)?)|(?:\d{1,2}\s*'\s*\d{1,2}\s*(?:"|\u2033)?)|(?:\d{1,2}\s*'(?!\d))|(?:\d{1,3}\s*[.,]\s*\d{2}\s*'?)|(?:\d{2,3}\s*(?:"|\u2033))|(?:\d{1,3}\s*(?:sec(?:ondi)?|min(?:uti)?)\b)/gi;

/* Un TUT vero: tre o quattro numeri uniti da trattini (anche con gli spazi,
 * anche con la barra: 2/0/1). */
const TUT_VALORE = /\d(?:\s*[-\u2013/]\s*\d){2,3}/g;

/* L'ultimo valore dentro la frase. */
function ultimo(espressione, testo) {
  const re = new RegExp(espressione.source, "gi");
  let m;
  let trovato = null;
  while ((m = re.exec(testo)) !== null) {
    trovato = m;
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return trovato;
}

/* La frase, senza i separatori rimasti orfani davanti o dietro al valore. */
function pulisciFrase(testo) {
  let t = String(testo == null ? "" : testo).replace(/\s+/g, " ").trim();
  t = t.replace(/^[\s\u00b7\u2022,;:.\-\u2013\u2014]+/, "");
  t = t.replace(/[\s\u00b7\u2022,;:.\-\u2013\u2014]+$/, "");
  return t.trim();
}

/* Il valore come lo scrive il v31: 1'30", 90", 2-3', 120-180 sec. */
export function normalizzaValoreRecupero(valore) {
  let t = String(valore == null ? "" : valore).trim()
    .replace(/\u2019/g, "'")
    .replace(/\u2032/g, "'")
    .replace(/\u2033/g, '"');
  const conVirgola = /^(\d{1,2})\s*[.,]\s*(\d{2})\s*'?$/.exec(t);
  if (conVirgola) return conVirgola[1] + "'" + conVirgola[2] + '"';
  return t.replace(/\s*'\s*/g, "'").replace(/\s*"\s*/g, '"').replace(/\s+/g, " ").trim();
}

export function normalizzaValoreTempo(valore) {
  return String(valore == null ? "" : valore).trim().replace(/\s*[-\u2013/]\s*/g, "-").replace(/\s+/g, "");
}

/* Il valore e la frase, separati. `intero` e' il testo di partenza, quello che
 * resta nel dato finche' lei non cambia il valore. */
export function separaRecupero(valore) {
  const intero = String(valore == null ? "" : valore).trim();
  if (!intero || intero === TRATTINO) return { valore: "", frase: "", intero };
  const m = ultimo(REC_VALORE, intero);
  if (!m) {
    if (/^\d{1,3}$/.test(intero)) return { valore: intero, frase: "", intero };
    return { valore: "", frase: intero, intero };
  }
  return {
    valore: normalizzaValoreRecupero(m[0]),
    frase: pulisciFrase(intero.slice(0, m.index) + " " + intero.slice(m.index + m[0].length)),
    intero
  };
}

export function separaTempo(valore) {
  const intero = String(valore == null ? "" : valore).trim();
  if (!intero || intero === TRATTINO) return { valore: "", frase: "", intero };
  const m = ultimo(TUT_VALORE, intero);
  if (!m) return { valore: "", frase: intero, intero };
  return {
    valore: normalizzaValoreTempo(m[0]),
    frase: pulisciFrase(intero.slice(0, m.index) + " " + intero.slice(m.index + m[0].length)),
    intero
  };
}

/* Il testo da salvare quando cambia il valore: si sostituisce solo il pezzo del
 * valore, la frase resta parola per parola com'era. Se un valore non c'era, il
 * valore nuovo va in fondo alla frase (la stessa posizione che si legge). */
export function sostituisciRecupero(valore, nuovo) {
  const intero = String(valore == null ? "" : valore);
  const v = normalizzaValoreRecupero(nuovo);
  if (!v) return intero;
  const m = ultimo(REC_VALORE, intero);
  if (!m) {
    const frase = pulisciFrase(intero);
    return frase ? frase + " " + v : v;
  }
  return (intero.slice(0, m.index) + v + intero.slice(m.index + m[0].length)).replace(/\s{2,}/g, " ");
}

export function sostituisciTempo(valore, nuovo) {
  const intero = String(valore == null ? "" : valore);
  const v = normalizzaValoreTempo(nuovo);
  if (!v) return intero;
  const m = ultimo(TUT_VALORE, intero);
  if (!m) {
    const frase = pulisciFrase(intero);
    return frase ? frase + " " + v : v;
  }
  return (intero.slice(0, m.index) + v + intero.slice(m.index + m[0].length)).replace(/\s{2,}/g, " ");
}

/* Come prima, per chi chiede solo «questo va in colonna?»: in colonna ci va il
 * valore; il vuoto e' una cella vuota (trattino), non una frase. */
export function recuperoInColonna(valore) {
  const p = separaRecupero(valore);
  return p.valore !== "" || !p.frase;
}

export function tempoInColonna(valore) {
  const p = separaTempo(valore);
  return p.valore !== "" || !p.frase;
}

/* Scritto a mano nella cella (passo 12, 8/11/2026). Vale solo se quello che si
 * scrive e' tutto un valore: TUT tre o quattro numeri con i trattini, REC un
 * tempo o un intervallo. Una frase, o la X che Alice non vuole (30X1), non
 * passa: la cella torna com'era e nel dato non entra niente. */
export function recuperoScrittoValido(testo) {
  const p = separaRecupero(testo);
  return p.valore !== "" && p.frase === "";
}

export function tempoScrittoValido(testo) {
  const p = separaTempo(testo);
  return p.valore !== "" && p.frase === "";
}

/* Il testo spostato in Descr./Setup, con l'etichetta davanti. */
export function etichettaSpostata(colonna, valore) {
  const t = String(valore == null ? "" : valore).trim();
  return colonna + ": " + t;
}

export const TUT_REC_NON_REGISTRATO = NON;

/* La colonna REC e' stretta: quando il valore vero non ci sta, lo si mostra
 * tagliato con i puntini e il valore completo sta nel Title. */
export const REC_LIMITE = 8;

export function recuperoVisibile(valore) {
  const t = String(valore == null ? "" : valore).trim();
  if (t.length <= REC_LIMITE) return { testo: t, intero: t };
  return { testo: t.slice(0, REC_LIMITE).replace(/\s+$/, "") + "\u2026", intero: t };
}

/* --- Le tendine e i pulsantini (passo 10, 8/11/2026) ---------------------
 * Il valore si sceglie dalla freccetta o si sposta di 30": la frase di coach
 * nel dato non si tocca.
 */

/* Alice, 8/11/2026: niente «cambio gamba» e «cambio braccio», in cella solo
 * il numero. La tendina ha sei voci e basta. */
export const REC_TENDINA = Object.freeze(["30\"", "1'", "1'30\"", "2'", "2'30\"", "3'"]);

export const TUT_TENDINA = Object.freeze(["2-0-2", "2-1-0", "0-1-2", "3-0-1", "3-1-1", "4-0-1"]);

export const REC_PASSO = 30;
export const REC_MIN = 30;
export const REC_MAX = 180;

/* Un recupero scritto come tempo, in secondi. Vale solo se il testo e' TUTTO un
 * tempo: una frase vale null, cosi' i pulsantini la lasciano stare. */
export function secondiRecupero(valore) {
  const t = String(valore == null ? "" : valore).trim()
    .replace(/\u2033/g, "\"")
    .replace(/[\u2019\u2032]/g, "'");
  if (!t) return null;
  let m = /^(\d{1,2})\s*'\s*(\d{0,2})\s*"?$/.exec(t);
  if (m) {
    const secondi = Number(m[2] || 0);
    if (secondi >= 60) return null;
    return Number(m[1]) * 60 + secondi;
  }
  m = /^(\d{1,3})\s*"?$/.exec(t);
  if (m) return Number(m[1]);
  m = /^(\d{1,3})\s*(?:sec|secondi)$/i.exec(t);
  if (m) return Number(m[1]);
  return null;
}

/* Il tempo come lo scrive il v31: 90" oppure 1'30". */
export function testoSecondi(secondi) {
  const n = Math.round(Number(secondi));
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n < 60) return n + "\"";
  const minuti = Math.floor(n / 60);
  const resto = n % 60;
  return resto === 0 ? minuti + "'" : minuti + "'" + String(resto).padStart(2, "0") + "\"";
}

/* Un passo di 30" avanti o indietro, dentro 30" e 3'. Torna "" quando non si
 * deve toccare niente: valore che non e' un tempo, oppure limite raggiunto. */
export function passoRecupero(valore, delta) {
  const secondi = secondiRecupero(valore);
  if (secondi == null) return "";
  const verso = Number(delta) < 0 ? -1 : 1;
  const dopo = secondi + verso * REC_PASSO;
  if (dopo < REC_MIN || dopo > REC_MAX) return "";
  return testoSecondi(dopo);
}
