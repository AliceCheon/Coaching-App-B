/* Barbell Diva B — la regola di colonna per TUT e REC (sola lettura).
 *
 * Perche' questo modulo esiste: in alcune celle di TUT e REC il documento porta
 * frasi di coach (istruzioni di esecuzione) invece del valore tecnico, e la
 * tabella si rompe. La regola approvata da Alice, SOLO a schermo (i dati non
 * si toccano): se il valore non e' un recupero / un tempo veri, si sposta
 * nella cella Descr./Setup con l'etichetta davanti ("REC: ..." / "TUT: ...")
 * e in colonna va un trattino.
 *
 * Qui sta il giudizio, in un posto solo: la pagina dell'elenco e la vista lo
 * usano uguale, cosi' l'elenco approvato e quello che poi si vede a schermo
 * non possono divergere.
 *
 * REC resta in colonna se e' un recupero vero: cifre (con eventuali virgole /
 * punti), trattini (intervalli), apostrofi o primi (minuti), la parola sec /
 * secondi / min / minuti, barre e due punti. Serve almeno una cifra: una
 * frase senza numeri non e' un recupero.
 *
 * TUT resta in colonna se e' vuoto, un trattino, oppure uno schema di cifre
 * con i separatori del tempo: 2-0-2, 3-1-1-0, 2/0/1/0, 30X1, 3010.
 */

const NON = "non registrato";

/* I caratteri che un recupero vero puo' contenere: cifre, separatori e unita'. */
const REC_AMMESSI = /^[\d.,:\s\-\u2013\u2014'’\u2032"″\/]*(?:sec(?:ondi)?|min(?:uti)?)?['’\u2032]?$/i;

export function recuperoInColonna(valore) {
  const t = String(valore == null ? "" : valore).trim();
  if (!t || t === "\u2014") return true; /* vuoto o trattino: in colonna, sara' — */
  if (!/\d/.test(t)) return false; /* nessuna cifra: e' una frase */
  return REC_AMMESSI.test(t);
}

export function tempoInColonna(valore) {
  const t = String(valore == null ? "" : valore).trim();
  if (!t || t === "\u2014") return true; /* vuoto o trattino: in colonna, sara' — */
  const compatto = t.replace(/\s+/g, "");
  return /^\d+(?:[\-\/xX.,]\d+)*$/.test(compatto);
}

/* Il testo spostato in Descr./Setup, con l'etichetta davanti. */
export function etichettaSpostata(colonna, valore) {
  const t = String(valore == null ? "" : valore).trim();
  return colonna + ": " + t;
}

export const TUT_REC_NON_REGISTRATO = NON;

/* La colonna REC è stretta: quando il valore vero non ci sta, i bottoni −/+ li
 * finiscono addosso. Lo si mostra tagliato con i puntini e il valore completo
 * sta nel Title (il palloncino che esce al passaggio del mouse). */
export const REC_LIMITE = 8;

export function recuperoVisibile(valore) {
  const t = String(valore == null ? "" : valore).trim();
  if (t.length <= REC_LIMITE) return { testo: t, intero: t };
  return { testo: t.slice(0, REC_LIMITE).replace(/\s+$/, "") + "\u2026", intero: t };
}

/* --- Le tendine e i pulsantini (passo 10, 8/11/2026) ---------------------
 * Il recupero e il TUT restano testo libero: la freccetta offre i valori di
 * sempre, non li impone. I pulsantini del recupero vanno di 30" e si fermano a
 * 30" e 3'. Se nella cella c'e' una frase di coach, non la toccano.
 */

export const REC_TENDINA = Object.freeze([
  "30\"", "1'", "1'30\"", "2'", "2'30\"", "3'",
  "1'30\" e cambio gamba", "1'30\" e cambio braccio"
]);

export const TUT_TENDINA = Object.freeze(["2-0-2", "2-1-0", "0-1-2", "3-0-1", "3-1-1", "4-0-1"]);

export const REC_PASSO = 30;
export const REC_MIN = 30;
export const REC_MAX = 180;

/* Un recupero scritto come tempo, in secondi. Vale solo se il testo e' TUTTO un
 * tempo: una frase («1'30" e cambio gamba») vale null, cosi' i pulsantini la
 * lasciano stare invece di rovinarla. */
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
 * deve toccare niente: testo che non e' un tempo, oppure limite raggiunto. */
export function passoRecupero(valore, delta) {
  const secondi = secondiRecupero(valore);
  if (secondi == null) return "";
  const verso = Number(delta) < 0 ? -1 : 1;
  const dopo = secondi + verso * REC_PASSO;
  if (dopo < REC_MIN || dopo > REC_MAX) return "";
  return testoSecondi(dopo);
}
