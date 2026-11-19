/* tests/finti/attesa.mjs - l'attesa condivisa dei test (regola del 19/11/2026).
 *
 * Perche' esiste: i test della pagina viva aspettavano il tempo che passasse
 * (`setTimeout(..., 40)`), e quando il computer rallentava la prova diventava
 * rossa senza che il prodotto avesse niente di rotto. Un test non deve
 * indovinare quanto ci mette il prodotto: deve aspettare il FATTO, con un tetto.
 *
 * Regola d'uso:
 *   - per sincronizzare un test si usa attendiFinche(condizione, tetto, cosa);
 *   - setTimeout resta solo per simulare una latenza DENTRO un finto
 *     (per esempio la latenza di scrittura del finto Firestore);
 *   - il messaggio `cosa` deve dire che fatto si aspettava, cosi' la rossa
 *     si legge senza aprire il test.
 */

export async function attendiFinche(condizione, massimoMs, cosa) {
  const tetto = massimoMs == null ? 15000 : Number(massimoMs);
  const atteso = cosa == null ? "la condizione attesa" : String(cosa);
  const t0 = Date.now();
  while (!condizione()) {
    if (Date.now() - t0 > tetto) throw new Error("attesa scaduta: " + atteso);
    await new Promise((risolvi) => setTimeout(risolvi, 10));
  }
}
