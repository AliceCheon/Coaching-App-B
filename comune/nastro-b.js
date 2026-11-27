/* Barbell Diva B — il testo del nastro in alto.
 *
 * PASSO 23 (giro di controllo). Il nastro diceva «35 esercizi» su ogni pagina
 * perché leggeva il costruttore d'esempio del v31 (`lav`), non il programma
 * letto. La carta del Programma, invece, conta i veri esercizi del programma
 * aperto («1 scheda · 6 esercizi»). Adesso il nastro usa lo stesso conto.
 *
 * La data «ultima seduta» era già vera: resta com'è, presa dal logbook. Se un
 * programma non c'è, il nastro lo dice invece di mostrare un numero vecchio.
 *
 * Funzione pura: nessun DOM. La usa desktop/app-v31.js.
 */

/* opzioni:
 *   programmaPresente  false = nessun programma letto;
 *   esercizi           numero del programma letto, oppure null;
 *   ultima             «26/10/2026» oppure "".
 * Ritorna la frase del pezzo destro del nastro. */
export function testoNastro(opzioni) {
  const o = opzioni && typeof opzioni === "object" ? opzioni : {};
  let pezzo;
  if (!o.programmaPresente) pezzo = "nessun programma letto";
  else if (o.esercizi == null) pezzo = "esercizi non registrati";
  else {
    const n = Number(o.esercizi);
    pezzo = n + (n === 1 ? " esercizio" : " esercizi");
  }
  const ultima = o.ultima == null ? "" : String(o.ultima).trim();
  return pezzo + (ultima ? " · ultima seduta " + ultima : "");
}
