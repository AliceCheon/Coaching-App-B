/* Barbell Diva B — la robottina Diva Bot (regola fissa: resta e dà verdetti).
 *
 * In fase 0 i suoi verdetti sono di LETTURA: guarda i numeri e dichiara di non
 * toccare nulla. Niente logica pesante: poche frasi, scelte dai dati letti.
 */

const FRASI_BASE = [
  "Sto guardando i numeri, non tocco nulla 💜",
  "Solo occhi, zero mani: questa schermata non scrive niente.",
  "Rileggo i tuoi dati quando vuoi: il pulsante è lì per questo."
];

function fraseSedute(n) {
  if (n > 0) return "Ho letto " + n + " sedute e non ho scritto un byte.";
  return "Nessuna seduta qui per ora: mostro il vuoto con onestà.";
}

function frasePeso(presente) {
  return presente ? "Il peso arriva dalla tua app, io me lo guardo." : "Peso non registrato: nessun numero di riempimento, mai.";
}

/* Frasi per la bolla, derivate dai dati letti (nessun dato personale qui:
 * solo conteggi e presenza/assenza). */
export function frasiPerDati(riepilogo) {
  const r = riepilogo || {};
  return [
    FRASI_BASE[0],
    fraseSedute(Number(r.numeroSedute) || 0),
    frasePeso(Boolean(r.pesoPresente)),
    Boolean(r.checkinPresente)
      ? "Ho anche l'ultimo check-in: lo leggo e basta."
      : "Nessun check-in nel documento: pazienza, si mostra il vuoto.",
    FRASI_BASE[2]
  ];
}

/* Costruisce la robottina (bolla + pallino) dentro il contenitore dato.
 * Solo testo (textContent): i dati non diventano mai HTML. */
export function montaDivaBot(contenitore, frasi) {
  const bolla = contenitore.ownerDocument.createElement("div");
  bolla.className = "bd-bolla";
  const testo = contenitore.ownerDocument.createElement("p");
  testo.className = "bd-bolla-testo";
  bolla.appendChild(testo);
  const pallino = contenitore.ownerDocument.createElement("button");
  pallino.type = "button";
  pallino.className = "bd-diva";
  pallino.setAttribute("aria-label", "Diva Bot");
  pallino.textContent = "🤖";
  contenitore.appendChild(bolla);
  contenitore.appendChild(pallino);
  let indice = 0;
  const mostra = () => {
    testo.textContent = frasi[indice % frasi.length] || FRASI_BASE[0];
    indice += 1;
  };
  mostra();
  pallino.addEventListener("click", mostra);
  return { aggiungi: (nuove) => nuove && nuove.length && mostra(), bolla, pallino };
}
