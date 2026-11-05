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
