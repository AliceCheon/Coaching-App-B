/* Barbell Diva B — i nomi degli esercizi come si mostrano (sola lettura).
 *
 * Nel database alcuni nomi portano il trattino basso al posto degli spazi
 * (es. "lat_machine_triangolo"): a schermo diventa "Lat machine triangolo" —
 * niente underscore, iniziale maiuscola. Solo il disegno: il nome originale
 * resta nel documento e nelle chiavi del logbook, quindi l'«Ultima volta»
 * continua a trovare le sedute vero nome.
 */

export function nomeEsercizioASchermo(nome) {
  const t = String(nome == null ? "" : nome).trim();
  if (!t) return "";
  const pulito = t.replace(/_/g, " ");
  return pulito.charAt(0).toUpperCase() + pulito.slice(1);
}
