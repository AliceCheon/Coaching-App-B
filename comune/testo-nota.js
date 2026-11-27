/* Barbell Diva B — il testo di una nota, come l'ha scritto Alice (passo 26).
 *
 * `nomePulito` è per i NOMI: toglie il trattino basso e mette la maiuscola
 * alla prima lettera. Su una nota no: la nota è una frase, e «prima riga» non
 * deve diventare «Prima riga» solo perché si è passati dallo schermo. Il
 * trattino basso però resta vietato anche qui (regola di Alice, 06/11): un
 * testo dei dati non si mostra con dentro «_».
 *
 * Il valore vero non si tocca mai: questa funzione serve solo a disegnare.
 */
export function testoNota(valore) {
  return String(valore == null ? "" : valore).trim().replace(/_/g, " ");
}
