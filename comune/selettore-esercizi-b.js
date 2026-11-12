/* Barbell Diva B — il selettore del Database esercizi (passo 35, SOLA LETTURA).
 *
 * Il modal e' quello della libreria del v31 (pg-lib: pc/index.html r.6865 e
 * JS r.7377-7399): testa con titolo, contatore e chiudi, casella di ricerca,
 * griglia di voci nome + distretto. Copiato com'e' nel comportamento, con una
 * cosa sola in piu': alla scelta RESTITUISCE l'esercizio a chi ascolta, perche'
 * da qui nascerà l'Aggiungi riga. Non scrive niente: ne Firestore, ne storage,
 * ne documento. Il catalogo e' la copia verbatim dei 179 esercizi del v31
 * (comune/catalogo-esercizi-b.js).
 *
 * Passo B.3 (12/11/2026): dentro il popup nasce la fila di filtri per gruppo
 * muscolare (richiesta di Alice). I chip sono i gruppi del catalogo, nello
 * stesso ordine in cui compaiono; «Tutti» in testa, un gruppo attivo per
 * volta, riclick per azzerare, combinati con la ricerca per nome e azzerati
 * alla riapertura. Sempre sola lettura: nessuna scrittura.
 *
 * Le classi bdsel-* sono nuove: nessun tocco al CSS esistente di B. I colori
 * sono quelli del modal del v31 (#221531, bordi #C9A7FF, accento #FF4FA3). */

import { CATALOGO_ESERCIZI_B, cercaNelCatalogoB, conteggioCatalogoB } from "./catalogo-esercizi-b.js";

/* Un documento ha il suo selettore, una volta sola: come il pannello delle
 * progressioni, si crea al primo uso e si riusa. */
let giaCostruito = null;

const STILE =
  ".bdsel-velo{position:fixed;left:0;top:0;right:0;bottom:0;z-index:9999;" +
  "background:rgba(10,4,18,.62);display:flex;align-items:flex-start;justify-content:center;padding:6vh 16px}" +
  ".bdsel-velo[hidden]{display:none}" +
  ".bdsel-card{width:min(760px,94vw);max-height:82vh;display:flex;flex-direction:column;" +
  "background:#221531;border:1px solid rgba(201,167,255,.25);border-radius:16px;overflow:hidden}" +
  ".bdsel-testa{display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid rgba(201,167,255,.18)}" +
  ".bdsel-testa b{font:800 15px/1.2 'Nunito Sans',sans-serif;color:#FFF7FC}" +
  ".bdsel-n{font:700 11px/1 'JetBrains Mono',monospace;color:#C9A7FF;margin-left:auto}" +
  ".bdsel-x{border:0;background:rgba(255,255,255,.07);color:#E7D8F5;width:28px;height:28px;" +
  "border-radius:9px;cursor:pointer;font-size:13px;line-height:1}" +
  ".bdsel-x:hover{background:#FF4FA3;color:#fff}" +
  ".bdsel-q{margin:12px 18px 0;padding:10px 13px;border-radius:11px;border:1px solid rgba(201,167,255,.26);" +
  "background:#180d24;color:#FFF7FC;font:700 13px/1.3 'Nunito Sans',sans-serif;outline:none}" +
  ".bdsel-q:focus{border-color:#FF4FA3;box-shadow:0 0 0 3px rgba(255,79,163,.16)}" +
  ".bdsel-filtri{display:flex;flex-wrap:wrap;gap:6px;margin:10px 18px 0}" +
  ".bdsel-fchip{border:1px solid rgba(201,167,255,.26);background:#180d24;color:#C9A7FF;" +
  "font:700 10.5px/1 'Nunito Sans',sans-serif;letter-spacing:.04em;text-transform:uppercase;" +
  "border-radius:999px;padding:6px 11px;cursor:pointer}" +
  ".bdsel-fchip:hover{border-color:#FF4FA3;color:#FFF7FC}" +
  ".bdsel-fchip.on{background:#FF4FA3;border-color:#FF4FA3;color:#fff}" +
  ".bdsel-griglia{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;padding:14px 18px 18px;overflow:auto}" +
  ".bdsel-it{display:block;text-align:left;border:1px solid rgba(201,167,255,.18);" +
  "background:rgba(53,33,69,.55);border-radius:10px;padding:9px 11px;cursor:pointer}" +
  ".bdsel-it:hover{border-color:#FF4FA3;background:rgba(255,79,163,.18)}" +
  ".bdsel-it b{display:block;font:800 12px/1.25 'Nunito Sans',sans-serif;color:#FFF7FC}" +
  ".bdsel-it em{display:block;margin-top:2px;font:700 9.5px/1 'Nunito Sans',sans-serif;font-style:normal;" +
  "color:#A98FC4;letter-spacing:.04em;text-transform:uppercase}" +
  ".bdsel-vuoto{grid-column:1/-1;color:#A98FC4;font:700 12px/1.5 'Nunito Sans',sans-serif;padding:10px}";

function scampa(testo) {
  return String(testo == null ? "" : testo)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function creaSelettoreEserciziB(doc, opzioni) {
  const scelte = opzioni || {};
  if (giaCostruito && giaCostruito.doc === doc) {
    if (typeof scelte.allaScelta === "function") giaCostruito.allaScelta = scelte.allaScelta;
    return giaCostruito.selettore;
  }

  const steso = doc.createElement("style");
  steso.setAttribute("data-fonte", "passo-35");
  steso.textContent = STILE;
  doc.head.appendChild(steso);

  const velo = doc.createElement("div");
  velo.className = "bdsel-velo";
  velo.hidden = true;
  velo.innerHTML =
    '<div class="bdsel-card" role="dialog" aria-label="Database esercizi">' +
    '<div class="bdsel-testa"><b>\ud83d\uddc4 Database esercizi</b>' +
    '<span class="bdsel-n"></span>' +
    '<button type="button" class="bdsel-x" title="chiudi">\u00d7</button></div>' +
    '<input type="search" class="bdsel-q" placeholder="Cerca per nome o distretto\u2026" autocomplete="off">' +
    '<div class="bdsel-filtri"></div>' +
    '<div class="bdsel-griglia"></div>' +
    "</div>";
  doc.body.appendChild(velo);

  const contatore = velo.querySelector(".bdsel-n");
  const griglia = velo.querySelector(".bdsel-griglia");
  const casella = velo.querySelector(".bdsel-q");
  const fila = velo.querySelector(".bdsel-filtri");

  /* I gruppi del filtro: quelli VERI del catalogo, nell'ordine in cui
   * compaiono (prima occorrenza). Nessun gruppo inventato. */
  const gruppi = [];
  CATALOGO_ESERCIZI_B.forEach((v) => {
    if (gruppi.indexOf(v.g) === -1) gruppi.push(v.g);
  });
  ["Tutti"].concat(gruppi).forEach((g) => {
    const b = doc.createElement("button");
    b.type = "button";
    b.className = "bdsel-fchip" + (g === "Tutti" ? " on" : "");
    b.setAttribute("data-g", g === "Tutti" ? "" : g);
    b.textContent = g;
    fila.appendChild(b);
  });

  /* Il filtro di gruppo: uno solo per volta, null = tutti. */
  let gruppoAttivo = null;

  function aggiornaFiltri() {
    Array.prototype.forEach.call(fila.querySelectorAll(".bdsel-fchip"), (c) => {
      const g = c.getAttribute("data-g") || "";
      c.classList.toggle("on", g === "" ? gruppoAttivo == null : g === gruppoAttivo);
    });
  }

  /* Il disegno della griglia, identico alla filtra del v31 (swRender): il
   * testo cerca sta nel nome o nel distretto, senza maiuscole. Il gruppo
   * attivo, se c'e', restringe il risultato della ricerca. */
  function disegna(domanda) {
    let voci = cercaNelCatalogoB(domanda);
    if (gruppoAttivo) voci = voci.filter((v) => v.g === gruppoAttivo);
    let html = "";
    voci.forEach((v) => {
      html += '<button type="button" class="bdsel-it" data-n="' + scampa(v.n) +
        '" data-g="' + scampa(v.g) + '"><b>' + scampa(v.n) + "</b><em>" + scampa(v.g) + "</em></button>";
    });
    griglia.innerHTML = html || '<p class="bdsel-vuoto">nessun esercizio trovato</p>';
    contatore.textContent = String(voci.length) + (voci.length === 1 ? " esercizio" : " esercizi");
  }

  function apri() {
    gruppoAttivo = null;
    aggiornaFiltri();
    velo.hidden = false;
    casella.value = "";
    disegna("");
    casella.focus();
  }

  function chiudi() {
    velo.hidden = true;
  }

  velo.addEventListener("click", (ev) => {
    if (ev.target === velo) chiudi();
  });
  velo.querySelector(".bdsel-x").addEventListener("click", chiudi);
  casella.addEventListener("input", () => disegna(casella.value));
  casella.addEventListener("keydown", (ev) => {
    if (ev && ev.key === "Escape") chiudi();
  });

  /* Il click su un chip: «Tutti» azzera, il gruppo attivo si spegne al
   * riclick, un gruppo nuovo si accende e ridisegna la griglia. */
  fila.addEventListener("click", (ev) => {
    const chip = ev.target.closest(".bdsel-fchip");
    if (!chip) return;
    const g = chip.getAttribute("data-g") || "";
    gruppoAttivo = g === "" || g === gruppoAttivo ? null : g;
    aggiornaFiltri();
    disegna(casella.value);
  });

  /* Il clic su una voce chiude e RESTITUISCE nome e distretto a chi ascolta.
   * Se nessuno ascolta (per ora e' cosi' in Programma), resta solo la chiusura:
   * comunque nessuna scrittura. */
  griglia.addEventListener("click", (ev) => {
    const voce = ev.target.closest(".bdsel-it");
    if (!voce) return;
    const scelta = { n: voce.getAttribute("data-n"), g: voce.getAttribute("data-g") };
    chiudi();
    if (typeof giaCostruito.allaScelta === "function") giaCostruito.allaScelta(scelta);
  });

  const stato = {
    doc: doc,
    allaScelta: typeof scelte.allaScelta === "function" ? scelte.allaScelta : null,
    selettore: {
      apri: apri,
      chiudi: chiudi,
      velo: velo,
      input: casella,
      griglia: griglia,
      filtri: fila
    }
  };
  giaCostruito = stato;
  return stato.selettore;
}
