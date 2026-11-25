/* ---- Le guide che non facevano niente (passo 19) -------------------------
 * Due tasti «? Guida» erano disegnati nella pagina e nessuno li ascoltava:
 * in Dati cliente e in Database esercizi. Non si toglie il tasto (chi non sa
 * cosa vuol dire «set base» o «sinergia» non ha dove chiederlo), si fa
 * comparire un riquadro con la spiegazione, e il secondo tocco lo chiude.
 * Il testo non promette niente che l'app non faccia davvero. */
export const GUIDE_VIVE = [
  {
    selettore: ".dc-guida",
    id: "dc-guida-box",
    dopo: ".dc-head",
    html: "<b>A cosa servono queste linguette.</b> Anagrafica e Anamnesi le compili tu, e restano scritte nel tuo profilo: "
      + "in Anamnesi, sotto «Patologie o infortuni», basta scrivere a parole dove ti fa male — «lombalgia cronica, fastidio al ginocchio destro» — "
      + "che le articolazioni si ricavano da sole e compaiono nelle carte Stress e RED-S. "
      + "<b>Biofeedback</b> e <b>Questionari</b> invece non hanno niente da compilare qui: aspettano i dati del check-in dal telefono, e finché non arrivano dicono cosa manca."
  },
  {
    selettore: "#db-guida",
    id: "db-guida-box",
    dopo: ".db-testa",
    html: "<b>Come si legge una riga.</b> <i>Distretto</i>: il gruppo muscolare principale. <i>Set base</i>: da quante serie parte l'esercizio quando entra in una scheda. "
      + "<i>Sovrapposizione</i>: quanto lo stesso esercizio lavora anche un altro distretto, cioè il lavoro che conta due volte. "
      + "<i>TUT</i>: il tempo sotto tensione, quanto dura una ripetizione. "
      + "<b>179 non sono tutti.</b> Sono quelli importati dal catalogo vero: nel gestionale sono più e i prehab qui mancano — non li inventiamo."
  },
  {
    selettore: "#sp-guida",
    id: "sp-guida-box",
    dopo: ".sp-testa",
    html: "<b>Come si legge.</b> Il volume è quello <i>programmato</i> nelle schede attive, diviso per distretto: la classifica dice chi prende più lavoro e in quale settimana. "
      + "Le <i>sinergie</i> sono i distretti secondari degli esercizi, cioè il lavoro che un esercizio fa anche altrove. "
      + "Se un esercizio non ha distretti secondari registrati, la sua sinergia non si vede — e non vuol dire che non ci sia."
  },
  {
    selettore: ".ck-guida",
    id: "ck-guida-box",
    dopo: ".ck-top",
    html: "<b>Come si legge la Dashboard.</b> <i>Readiness</i>: i cinque segnali del check-in di oggi; se il check-in non è arrivato restano cinque trattini, e la pagina lo dice. "
      + "<i>RED-S</i> e <i>Stress</i> leggono le tue schede e l'anamnesi: le articolazioni dichiarate portano il segno «dichiarata». "
      + "Quello che arriva dal telefono è dichiarato come tale: se manca, non si inventa."
  }
];


/* Le guide che nascono dai moduli (Dashboard, Overview, Pianificazione): il tasto
 * lo crea la vista, il testo sta qui. La chiave sta in `data-guida`. */
export const TESTI_GUIDA = {
  dashboard: "<b>Come si legge la Dashboard.</b> <i>Readiness</i>: i cinque segnali del check-in di oggi; se il check-in non è arrivato restano cinque trattini, e la pagina lo dice. "
    + "<i>RED-S</i> e <i>Stress</i> leggono le tue schede e l'anamnesi: le articolazioni dichiarate portano il segno «dichiarata». "
    + "Quello che arriva dal telefono è dichiarato come tale: se manca, non si inventa.",
  overview: "<b>Come si legge l'Overview.</b> Aderenza e carico vengono dal logbook: le sedute che hai registrato davvero, non quelle previste. "
    + "Se in una finestra non c'è nessuna seduta, la pagina dice «non registrato» invece di scrivere 0%: uno zero vorrebbe dire «non ti sei allenata», ed è un'altra cosa.",
  pianificazione: "<b>Come si legge la Pianificazione.</b> Otto settimane, lunedì in testa, e in ogni casella la scheda che risulta dalle sedute registrate. "
    + "Il piano futuro, lo scarico e il test non sono nei documenti che l'app legge: qui vedi il calendario che i logbook dimostrano, non quello che era previsto."
};

/* Attacca UNA guida a un tasto che il modulo ha appena creato. Si chiama
 * quando il tasto non e' ancora nel documento (la vista lo restituisce e la
 * pagina lo inserisce dopo): per questo non si cerca con querySelector. */
export function attaccaGuida(doc, tasto, chiave) {
  if (!tasto || !TESTI_GUIDA[chiave] || tasto.dataset.guidaViva === "1") return false;
  tasto.dataset.guidaViva = "1";
  tasto.dataset.guida = chiave;
  tasto.disabled = false;
  tasto.removeAttribute("title");
  tasto.type = "button";
  tasto.setAttribute("aria-expanded", "false");
  tasto.addEventListener("click", () => {
    const idBox = "guida-" + chiave + "-box";
    const aperto = doc.getElementById(idBox);
    if (aperto) { aperto.remove(); tasto.setAttribute("aria-expanded", "false"); return; }
    const box = doc.createElement("div");
    box.className = "v-guida-box";
    box.id = idBox;
    box.innerHTML = TESTI_GUIDA[chiave];
    const dove = tasto.closest(".v-testa") || tasto.closest(".ck-testa") || tasto.closest(".pz-testa");
    if (dove) dove.after(box); else tasto.after(box);
    tasto.setAttribute("aria-expanded", "true");
  });
  return true;
}

/* Attacca i tasti. Se un tasto non c'e' (pagina diversa, vista ridisegnata) si
 * salta: non e' un errore. Il tasto ricorda di essere gia' annodato, cosi'
 * chiamare due volte non fa aprire due riquadri. */
export function annodaGuideVive(doc) {
  const annodati = [];
  for (const guida of GUIDE_VIVE) {
    const tasto = doc.querySelector(guida.selettore);
    if (!tasto || tasto.dataset.guidaViva === "1") continue;
    tasto.dataset.guidaViva = "1";
    tasto.type = "button";
    /* Il «?» davanti al nome non serve: il tasto resta «Guida …», senza simbolo. */
    tasto.textContent = String(tasto.textContent || "").replace(/^\s*\?\s*/, "");
    tasto.setAttribute("aria-expanded", "false");
    tasto.addEventListener("click", () => {
      const aperto = doc.getElementById(guida.id);
      if (aperto) {
        aperto.remove();
        tasto.setAttribute("aria-expanded", "false");
        return;
      }
      const box = doc.createElement("div");
      box.className = "v-guida-box";
      box.id = guida.id;
      box.innerHTML = guida.html;
      const dove = tasto.closest(guida.dopo);
      if (dove) dove.after(box); else tasto.after(box);
      tasto.setAttribute("aria-expanded", "true");
    });
    annodati.push(guida.selettore);
  }
  return annodati;
}
