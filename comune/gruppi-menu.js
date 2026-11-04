/* Barbell Diva B — i tre gruppi del menu che si aprono e si chiudono (b0.35).
 *
 * Come nel v31: la freccina ruota, le voci spariscono, e lo stato resta nel
 * browser. Modulo a parte perché così si prova senza tirare dentro Firebase.
 * Se il browser non ha memoria — o non lascia scriverla — resta tutto aperto
 * e la pagina funziona lo stesso.
 */

/* I tre gruppi del menu si aprono e si chiudono come nel v31 — la freccina
 * ruota, le voci spariscono — e lo stato resta nel browser: chiave
 * `bd-b.v1.gruppi-chiusi`, con i nomi dei gruppi chiusi. Se il browser non ha
 * memoria, o non lascia scriverla, resta tutto aperto e la pagina funziona. */
export function gruppiApribili(doc, memoria) {
  const CHIAVE = "bd-b.v1.gruppi-chiusi";
  let chiusi = [];
  try {
    const letto = memoria && typeof memoria.getItem === "function" ? memoria.getItem(CHIAVE) : null;
    const dati = letto ? JSON.parse(letto) : [];
    if (Array.isArray(dati)) chiusi = dati.map(String);
  } catch (errore) {
    chiusi = [];
  }
  const salva = () => {
    if (!memoria || typeof memoria.setItem !== "function") return;
    try {
      const ora = Array.from(doc.querySelectorAll(".gruppo.chiuso[data-gruppo]")).map((g) => g.getAttribute("data-gruppo"));
      memoria.setItem(CHIAVE, JSON.stringify(ora));
    } catch (errore) { /* niente memoria: i gruppi restano come sono */ }
  };
  const applica = (gruppo, chiuso) => {
    gruppo.classList.toggle("chiuso", chiuso);
    const bottone = gruppo.querySelector(".etichetta");
    if (bottone) bottone.setAttribute("aria-expanded", chiuso ? "false" : "true");
  };
  doc.querySelectorAll(".gruppo.apribile[data-gruppo]").forEach((gruppo) => {
    const nome = gruppo.getAttribute("data-gruppo");
    applica(gruppo, chiusi.indexOf(nome) !== -1);
    const bottone = gruppo.querySelector(".etichetta");
    if (!bottone) return;
    bottone.addEventListener("click", () => {
      applica(gruppo, !gruppo.classList.contains("chiuso"));
      salva();
    });
  });
}
