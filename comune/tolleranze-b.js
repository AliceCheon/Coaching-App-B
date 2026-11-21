/* Barbell Diva B - PASSO 6b: le tolleranze di recupero per articolazione.
 *
 * Sono un VALORE DI PARTENZA deciso con Alice, non una misura: servono a dare
 * un metro alle serie equivalenti che escono da comune/articolazioni-b.js.
 * Si cambiano qui, in una riga, senza toccare nessun altro file.
 *
 * Unita': serie equivalenti a settimana che l'articolazione regge senza
 * accumulare stress (il "100%" della carta RED-S in Dashboard).
 */

export const TOLLERANZE = Object.freeze({
  "spalla": 20,
  "gomito": 16,
  "polso": 10,
  "anca": 22,
  "ginocchio": 22,
  "caviglia": 12,
  "colonna lombare": 18,
  "colonna toracica": 18
});

export function tolleranzaDi(articolazione) {
  const a = String(articolazione == null ? "" : articolazione).trim();
  const v = TOLLERANZE[a];
  return typeof v === "number" && v > 0 ? v : null;
}
