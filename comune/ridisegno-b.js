/* comune/ridisegno-b.js - quali scritture cambiano quello che si VEDE.
 *
 * Perche' esiste (19/11/2026): dopo una scrittura la pagina decide se rileggere
 * e ridisegnare guardando il campo della richiesta. Quella decisione stava in
 * una fila di `||` dentro desktop/app-v31.js: chi aggiungeva una scrittura nuova
 * doveva ricordarsi di aggiungere il nome anche li', e se lo dimenticava la
 * pagina scriveva in B e restava a schermo il disegno vecchio. E' esattamente
 * il difetto di "+ Riga": la riga era sul disco e la tabella no.
 *
 * Adesso la lista sta qui, in un posto solo, e chi scrive la usa. La prova
 * 119.3 non guarda piu' una regex nel sorgente: chiama questa funzione.
 *
 * Regola: qui dentro stanno i campi che cambiano le RIGHE disegnate o la loro
 * struttura (aggiungere, togliere, sostituire, spostare, legare, svuotare,
 * ripristinare, cambiare le settimane). Non ci stanno i campi che la cella
 * mostra gia' da sola mentre scrive (serie, ripetizioni, recupero, tempo):
 * quelli non devono far ridisegnare la pagina, altrimenti cancellano il campo
 * aperto sotto le dita.
 */

export const CAMPI_CHE_RIDISEGNANO = Object.freeze([
  "progressione",
  "progressione-scheda",
  "riga",
  "aggiunta-riga",
  "aggiunta-tecnica",
  "rimozione-tecnica",
  "tecnica-cambia",
  "tecnica-parametri",
  "tecnica-settimana",
  "tecnica-nota",
  "sostituzione-riga",
  "superserie",
  "svuota-scheda",
  "ripristina-scheda",
  "applica-scarico-tutte",
  "applica-scheletro",
  "elimina-scheletro",
  /* PASSO 14: il tasto «Dove ti fa male» scrive un documento suo: senza
   * rileggere, la carta resterebbe com'era prima del tocco. */
  "dolori"
]);

/* I campi che la cella mostra da sola: scrivono e NON ridisegnano. */
export const CAMPI_CHE_NON_RIDISEGNANO = Object.freeze([
  "serie",
  "ripetizioni",
  "recupero",
  "tempo"
]);

/* La domanda che fa la pagina dopo una scrittura riuscita. */
export function chiedeRilettura(richiesta) {
  if (!richiesta) return false;
  const campo = String(richiesta.campo == null ? "" : richiesta.campo);
  return CAMPI_CHE_RIDISEGNANO.indexOf(campo) !== -1;
}
