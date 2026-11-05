/* Barbell Diva B — UNA sola funzione per i nomi e i testi dei dati a schermo.
 *
 * Regola ferma (Alice, 06/11): il trattino basso non si vede in NESSUN punto
 * dell'app — nomi di esercizi, schede, programmi, logbook, archivio, tendine,
 * ovunque venga disegnato un nome o un testo preso dai suoi dati. La pulizia
 * vale SOLO per il testo mostrato: il valore vero resta com'è nei dati e nei
 * confronti con il logbook (chiavi e ricerche usano l'originale, altrimenti i
 * collegamenti si rompono). Non si modifica mai il valore vero.
 *
 * Ogni schermata, adesso e in futuro, disegna i testi dei dati solo attraverso
 * questa funzione; la guardia in tests/44-nome-pulito.test.mjs fa fallire la
 * suite se un testo preso dai dati viene disegnato senza passare da qui.
 */

export function nomePulito(valore) {
  const t = String(valore == null ? "" : valore).trim();
  if (!t) return "";
  const pulito = t.replace(/_/g, " ");
  return pulito.charAt(0).toUpperCase() + pulito.slice(1);
}
