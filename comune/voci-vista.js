/* Barbell Diva B — le voci di vista (fase 2i).
 *
 * B non ha navigazione: ha una colonna di carte che si scorre. «Cambiare
 * schermata», qui, vuol dire cambiare quello che stai guardando: la Diva non
 * parla solo al tocco, commenta la carta che hai davanti.
 *
 * Regola di casa, la stessa di sempre: qui non si inventa niente.
 *  - ogni voce parla del SIGNIFICATO della carta, mai di un numero (le cifre
 *    vivono nei dati, non in questa tabella: la guardia 22 lo verifica);
 *  - la tabella copre tutte le carte che il telefono disegna (guardia 22.01):
 *    se domani nasce una carta senza voce, il test cade prima dell'utente;
 *  - il tono di una voce non può MAI migliorare quello principale: se il
 *    quadro dice «attenzione», scorrere su una carta serena non fa verde la
 *    bolla. Può solo peggiorare — come i brutti voti, si sommano.
 */

import { tonoPeggiore } from "./diva-bot.js";

/* La chiave è il titolo esatto della carta (`carta(doc, "…")` in mobile/app.js). */
export const VOCI_VISTA = Object.freeze({
  "Sedute registrate": Object.freeze({
    testo: "Qui conto le sedute una per una. Quello che manca resta scritto come manca.",
    tono: "neutro"
  }),
  "Ultima seduta": Object.freeze({
    testo: "L'ultima volta che il ferro si è mosso: la data è quella, non una media.",
    tono: "neutro"
  }),
  "Peso corrente": Object.freeze({
    testo: "Il peso lo dice la tua app. Io lo leggo e non lo commento: non sono una bilancia con opinioni.",
    tono: "neutro"
  }),
  "Ultimo check-in": Object.freeze({
    testo: "Il check-in è l'unica cosa che ti chiede come stai. Io lo leggo: il come stai non me lo invento.",
    tono: "neutro"
  }),
  "Programma attivo": Object.freeze({
    testo: "Il programma attivo è quello marcato. Se non è marcato te lo dico, invece di scegliere per te.",
    tono: "neutro"
  }),
  "Documento di A": Object.freeze({
    testo: "Questa carta compare solo quando il documento non c'è. Non la nascondo: il vuoto si guarda in faccia.",
    tono: "attenzione"
  }),
  "Quadro strutturale": Object.freeze({
    testo: "Otto settimane, soglie dichiarate prima. Questo quadro non è un giudizio: è un conto.",
    tono: "neutro"
  }),
  "Semaforo strutturale": Object.freeze({
    testo: "Conto carichi e continuità, non muscoli. La diagnosi non è roba mia.",
    tono: "neutro"
  }),
  "Cosa manca per il semaforo completo": Object.freeze({
    testo: "Qui elenco quello che in A non è registrato. Meglio un buco dichiarato che un numero finto.",
    tono: "attenzione"
  }),
  "Carichi per esercizio": Object.freeze({
    testo: "I chili per esercizio: salgono, calano o stanno fermi. Tutte e tre sono informazioni.",
    tono: "neutro"
  })
});

/** La voce di una carta, o null se il titolo non è in tabella. */
export function voceDellaVista(titolo) {
  if (titolo == null) return null;
  const chiave = String(titolo).trim();
  if (!Object.prototype.hasOwnProperty.call(VOCI_VISTA, chiave)) return null;
  return VOCI_VISTA[chiave];
}

/** Il titolo di una carta: il suo `h2`. Stringa vuota se non c'è. */
export function titoloSezione(nodo) {
  if (!nodo || typeof nodo.querySelector !== "function") return "";
  const h2 = nodo.querySelector("h2");
  return h2 && h2.textContent ? String(h2.textContent).trim() : "";
}

/* Collega le carte della griglia alla Diva già montata.
 *
 * Vince la carta più visibile; la frase cambia solo quando cambia la carta,
 * così una passata di pollice non fa balbettare la bolla. Se nessuna carta è
 * visibile, resta l'ultima frase: meglio ferma che vuota.
 *
 * Ritorna { osservatore, stacca } oppure null quando non c'è niente da
 * osservare (o il browser non sa osservare: la pagina resta viva lo stesso).
 */
export function collegaVociDiVista(doc, win, bot, tonoBase) {
  if (!doc || !win || !bot || typeof bot.mostra !== "function") return null;
  const Osservatore = win.IntersectionObserver;
  if (typeof Osservatore !== "function") return null;
  if (typeof doc.querySelectorAll !== "function") return null;
  const elenco = doc.querySelectorAll("#griglia .carta");
  if (!elenco || !elenco.length) return null;

  const stato = [];
  let attiva = "";
  let osservatore = null;

  const scegli = () => {
    let migliore = null;
    for (let i = 0; i < stato.length; i += 1) {
      const voce = stato[i];
      if (!voce.visibile) continue;
      if (!migliore || voce.rapporto > migliore.rapporto) migliore = voce;
    }
    if (!migliore) return;
    const titolo = titoloSezione(migliore.nodo);
    if (!titolo || titolo === attiva) return;
    const voce = voceDellaVista(titolo);
    if (!voce) return;
    attiva = titolo;
    bot.mostra(voce.testo, tonoPeggiore(tonoBase, voce.tono));
  };

  osservatore = new Osservatore((voci) => {
    for (let i = 0; i < voci.length; i += 1) {
      const voce = voci[i];
      let trovata = null;
      for (let j = 0; j < stato.length; j += 1) {
        if (stato[j].nodo === voce.target) trovata = stato[j];
      }
      if (!trovata) {
        trovata = { nodo: voce.target, visibile: false, rapporto: 0 };
        stato.push(trovata);
      }
      trovata.rapporto = Number(voce.intersectionRatio) || 0;
      trovata.visibile = voce.isIntersecting === true && trovata.rapporto > 0;
    }
    scegli();
  }, { threshold: [0.25, 0.5, 0.75] });

  for (let i = 0; i < elenco.length; i += 1) {
    stato.push({ nodo: elenco[i], visibile: false, rapporto: 0 });
    osservatore.observe(elenco[i]);
  }

  return {
    osservatore,
    stacca: () => {
      if (osservatore && typeof osservatore.disconnect === "function") osservatore.disconnect();
      attiva = "";
    }
  };
}
