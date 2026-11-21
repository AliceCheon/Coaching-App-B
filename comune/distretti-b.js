/* Barbell Diva B - PASSO 4c: la mappa dei distretti, in un posto solo.
 * 
 * Prima viveva dentro vista-programma.js. Il 4c porta il conto fuori dalla
 * vista (comune/analisi-programmazione.js), e due copie della stessa mappa
 * vorrebbero dire due conti diversi per lo stesso esercizio: la regola della
 * funzione unica dice che la risposta sta in una funzione sola. La vista
 * continua a riesportarla, cosi chi la importava da li non cambia.
 */

export const DISTRETTI = [
  [["femorali", "femorale", "bicipiti femorali", "hamstring"], "E"],
  [["centro schiena", "schiena"], "CS"],
  [["dorsali", "dorsale", "dorso", "lat "], "D"],
  [["spalle", "spalla", "deltoidi", "deltoide"], "S"],
  [["glutei", "gluteo"], "G"],
  [["bicipiti", "bicipite", "brachiali", "brachiale"], "B"],
  [["tricipiti", "tricipite"], "T"],
  [["pettorali", "pettorale", "petto"], "P"],
  [["adduttori", "adduttore"], "Q"],
  [["quadricipiti", "quadricipite", "gambe"], "Q"],
  [["polpacci", "polpaccio", "calf"], "Z"],
  [["addominali", "addominale", "addome", "core"], "A"],
  [["cardio"], "CA"]
];

export function codiceDistretto(muscolo) {
  const t = " " + String(muscolo || "").toLowerCase().trim() + " ";
  if (t.trim() === "") return "\u2014";
  for (let i = 0; i < DISTRETTI.length; i += 1) {
    const chiavi = DISTRETTI[i][0];
    for (let k = 0; k < chiavi.length; k += 1) if (t.indexOf(chiavi[k]) !== -1) return DISTRETTI[i][1];
  }
  return "\u2014";
}

/* I nomi interi dei distretti: servono a chi LEGGE una carta, non a chi conta.
 * Stanno accanto ai codici perche' un codice con il suo nome in due posti
 * diversi e' la strada per due nomi diversi. */
export const NOMI_DISTRETTI = {
  E: "Femorali", CS: "Centro schiena", D: "Dorsali", S: "Spalle", G: "Glutei",
  B: "Bicipiti", T: "Tricipiti", P: "Pettorali", Q: "Quadricipiti e adduttori",
  Z: "Polpacci", A: "Addominali", CA: "Cardio"
};

export function nomeDistretto(codice) {
  const c = String(codice == null ? "" : codice).trim();
  if (!c || c === "—") return "Muscolo non riconosciuto";
  return NOMI_DISTRETTI[c] || c;
}
