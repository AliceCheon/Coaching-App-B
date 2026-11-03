/* Barbell Diva B — intervalli validi e direzioni delle scale.
 *
 * Le direzioni sono quelle del mockup telefono v1.2 (già confermate dalla coach)
 * e del piano collegamento telefono→PC. In fase 0 servono alle schermate di
 * lettura per etichettare i valori (e ai test); nessuna scrittura passa da qui.
 */

export const CHECKIN_GIORNALIERO = Object.freeze({
  segnali: {
    energia: { min: 1, max: 5, direzione: "1 = esausta · 5 = al top" },
    sonno: { min: 1, max: 5, direzione: "1 = pessimo · 5 = profondo" },
    doms: { min: 1, max: 5, direzione: "1 = niente · 5 = gambe distrutte" },
    stress: { min: 1, max: 5, direzione: "1 = calma · 5 = tantissimo" },
    fame: { min: 1, max: 5, direzione: "1 = nulla · 5 = lupi al guinzaglio" }
  }
});

export const CHECKIN_SETTIMANALE = Object.freeze({
  q9: { min: 1, max: 10, direzione: "alto = peggio" },
  q10: { min: 1, max: 10, direzione: "alto = peggio" },
  q11: { min: 1, max: 10, direzione: "alto = peggio" },
  q12: { min: 1, max: 10, direzione: "alto = peggio" },
  q13: { min: 1, max: 10, direzione: "alto = meglio" },
  q14: { min: 1, max: 10, direzione: "alto = meglio" },
  q15: { min: 1, max: 10, direzione: "alto = meglio" },
  q16: { min: 1, max: 10, direzione: "alto = meglio" },
  nutrizione: {
    min: 1, max: 10,
    direzione: "10 = peggio per fame, voglie, pensiero del cibo, gonfiore, pesantezza, difficoltà a finire i pasti; sostenibilità 10 = meglio; compliance pasti 0-100 (100 = tutti i pasti rispettati)"
  }
});

export const PESO = Object.freeze({ min: 30, max: 250, unita: "kg" });
export const PASSI = Object.freeze({ min: 0, max: 100000, intero: true });
export const SONNO = Object.freeze({
  ore: { min: 0, max: 24 },
  qualita: { min: 1, max: 5, direzione: "1 = pessima · 5 = ottima" }
});
export const CIRCONFERENZE = Object.freeze({ min: 5, max: 250, unita: "cm" });
export const PLICHE = Object.freeze({ min: 1, max: 80, unita: "mm", prese: 3, siti: 7, aggregazione: "mediana (la calcola il PC)" });
export const CICLO = Object.freeze({ durataGiorni: { min: 3, max: 7 }, nota: "giorno e fase del ciclo li calcola il PC" });
export const QUIZ_MANGIATO = Object.freeze({
  campi: ["fame", "voglie", "pensiero_cibo", "gonfiore", "pesantezza", "difficolta_pasti"],
  min: 1, max: 10, direzione: "10 = peggio", notaLibera: true
});

/* Funzione di comodo: valore dentro [min, max]? (nessun effetto collaterale) */
export function entroLimite(limite, valore) {
  const n = Number(valore);
  if (!Number.isFinite(n)) return false;
  if (limite.intero && !Number.isInteger(n)) return false;
  return n >= limite.min && n <= limite.max;
}
