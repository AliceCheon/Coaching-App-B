/* Barbell Diva B — la pagina «Progressioni» (passo 21).
 *
 * La pagina esisteva dal v31 con tredici schede e i tasti «Applica alla
 * scheda»: quei tasti agivano su una tabella statica, non sulla scheda vera di
 * B. Alice (26/11/2026): «dentro la scheda di progressioni ogni progressione
 * deve essere visualizzabile, modificabile e duplicabile, più il tasto "crea
 * progressione custom"».
 *
 * Qui la pagina diventa la LIBRERIA: le 21 formule della riga, le 13 della
 * scheda e le custom del programma aperto, tutte con «Vedi» e «Duplica» (e le
 * custom con «Modifica» ed «Elimina»). Applicare resta dove si sa su che riga:
 * «Applica progressione» dentro Programma, o «Applica progressione a tutta la
 * scheda». Così la pagina non finge di scrivere su una tabella che non c'è.
 *
 * Le finestre (tabella, modifica, conferma) sono le stesse del pannello: vivono
 * in vista-programma.js, qui si richiamano soltanto.
 */
import { PROG, PRG, coppieRiga, coppieScheda } from "./progressioni-b.js";
import { coppieCustom, riassuntoCustom } from "./progressioni-custom-b.js";
import { apriTabellaProgressione, apriEditorProgressione, apriConfermaProgressione } from "./vista-programma.js";
import { nomePulito } from "./nome-pulito.js";

/* La base d'esempio per le formule della riga: la pagina non sa quale riga
 * guarderà Alice, quindi la tabella parte dal ripiego del v31 (3 × 8-10) e lo
 * DICHIARA. I numeri veri li mostra «Vedi» dalla riga. */
const BASE_ESEMPIO = Object.freeze({ s: 3, r: "8-10" });

function n(doc, tag, classe, testo) {
  const e = doc.createElement(tag);
  if (classe) e.className = classe;
  if (testo != null) e.textContent = String(testo);
  return e;
}

function tasto(doc, classe, testo, titolo, alClic) {
  const b = n(doc, "button", classe, testo);
  b.type = "button";
  if (titolo) b.title = titolo;
  b.addEventListener("click", (ev) => {
    if (ev && ev.preventDefault) ev.preventDefault();
    if (ev && ev.stopPropagation) ev.stopPropagation();
    if (typeof alClic === "function") alClic(ev);
  });
  return b;
}

/* Tutte le voci della libreria: prima le custom (sono di Alice), poi le 21
 * formule della riga, poi le 13 della scheda. */
export function vociLibreria(custom) {
  const voci = [];
  (Array.isArray(custom) ? custom : []).forEach((c) => {
    voci.push({
      id: "custom:" + String(c.id || ""), idCustom: String(c.id || ""),
      nome: nomePulito(c.nome), descrizione: riassuntoCustom(c),
      tipo: "custom", origine: "custom", gruppo: "Custom",
      coppie: coppieCustom(c), custom: c
    });
  });
  PROG.forEach((v) => {
    voci.push({
      id: v[0], nome: v[1], descrizione: v[2],
      tipo: "formula", origine: "riga", gruppo: "Riga",
      coppie: coppieRiga(v[0], BASE_ESEMPIO), esempio: true
    });
  });
  PRG.forEach((v) => {
    voci.push({
      id: v.id, nome: v.n, descrizione: v.d,
      tipo: "formula", origine: "scheda", gruppo: v.g || "Scheda",
      formula: v.d, coppie: v.w ? coppieScheda(v.id, null) : null
    });
  });
  return voci;
}

/* Disegna la pagina dentro #pag-progressioni. Ritorna quante voci ha scritto.
 * Si richiama a ogni rilettura: le custom cambiano, la pagina si aggiorna. */
export function montaPaginaProgressioni(doc, opzioni) {
  const o = opzioni || {};
  const pagina = doc && doc.getElementById ? doc.getElementById("pag-progressioni") : null;
  if (!pagina) return 0;
  const griglia = pagina.querySelector(".pr-libgrid");
  const barra = pagina.querySelector(".pr-libbar");
  if (!griglia) return 0;

  const opz = {
    idProgramma: String(o.idProgramma || ""),
    custom: Array.isArray(o.custom) ? o.custom : [],
    base: BASE_ESEMPIO,
    baseMancante: null,
    salvaCustom: typeof o.salvaCustom === "function" ? o.salvaCustom : null
  };
  const puoScrivere = Boolean(opz.idProgramma) && typeof opz.salvaCustom === "function";
  const voci = vociLibreria(opz.custom);

  /* La barra: conteggio vero e il tasto per crearne una. */
  if (barra) {
    while (barra.firstChild) barra.firstChild.remove();
    const conta = n(doc, "span", "pr-libn", voci.length + (voci.length === 1 ? " progressione" : " progressioni") +
      (opz.custom.length ? " · " + opz.custom.length + " custom" : ""));
    conta.id = "pr-libn";
    barra.appendChild(conta);
    barra.appendChild(n(doc, "span", "pr-libhint",
      "Ogni voce si vede (le otto settimane) e si duplica in una progressione custom."));
    const nuova = tasto(doc, "pr-btn pri", "\uff0b Crea progressione custom", "una tabella nuova di otto settimane da compilare a mano", () => {
      apriEditorProgressione(doc, { azione: "crea", nome: "", coppie: [], da: "" }, opz);
    });
    if (!puoScrivere) {
      nuova.disabled = true;
      nuova.title = "apri un programma dalla zona B per salvare una progressione custom";
    }
    barra.appendChild(nuova);
  }

  while (griglia.firstChild) griglia.firstChild.remove();
  voci.forEach((v) => {
    const carta = n(doc, "article", "pr-card" + (v.tipo === "custom" ? " custom" : ""));
    const h = n(doc, "h3");
    h.appendChild(n(doc, "span", "", v.tipo === "custom" ? "custom" : v.gruppo));
    h.appendChild(doc.createTextNode(nomePulito(v.nome)));
    carta.appendChild(h);
    carta.appendChild(n(doc, "p", "", nomePulito(v.descrizione)));
    if (v.esempio) {
      carta.appendChild(n(doc, "p", "pr-esempio",
        "Tabella d'esempio su 3 serie \u00d7 8-10: i numeri veri dipendono dalla riga."));
    }
    const piedi = n(doc, "div", "pr-cfoot");
    const vedi = tasto(doc, "pr-btn", "Vedi la tabella", "la tabella delle otto settimane, in sola lettura", () => {
      apriTabellaProgressione(doc, v, opz);
    });
    vedi.setAttribute("data-lib-vedi", v.id);
    piedi.appendChild(vedi);
    const duplica = tasto(doc, "pr-btn", v.tipo === "custom" ? "Duplica" : "Duplica in custom",
      "crea una progressione custom con questi valori", () => {
        apriEditorProgressione(doc, {
          azione: "crea",
          nome: "Copia di " + nomePulito(v.nome),
          coppie: Array.isArray(v.coppie) ? v.coppie : [],
          da: v.tipo === "custom" ? (v.idCustom || "") : v.id
        }, opz);
      });
    duplica.setAttribute("data-lib-duplica", v.id);
    if (!puoScrivere || !Array.isArray(v.coppie)) {
      duplica.disabled = true;
      duplica.title = !puoScrivere
        ? "apri un programma dalla zona B per salvare una progressione custom"
        : "questa voce copia la settimana 1 di ogni riga: duplicala dalla riga, in Programma";
    }
    piedi.appendChild(duplica);
    if (v.tipo === "custom") {
      const modifica = tasto(doc, "pr-btn", "Modifica", "cambia nome e celle di questa progressione custom", () => {
        apriEditorProgressione(doc, { azione: "modifica", custom: v.custom }, opz);
      });
      modifica.setAttribute("data-lib-modifica", v.idCustom);
      if (!puoScrivere) modifica.disabled = true;
      piedi.appendChild(modifica);
      const elimina = tasto(doc, "pr-btn danger", "Elimina", "elimina questa progressione custom (chiede conferma)", () => {
        apriConfermaProgressione(doc, v, opz);
      });
      elimina.setAttribute("data-lib-elimina", v.idCustom);
      if (!puoScrivere) elimina.disabled = true;
      piedi.appendChild(elimina);
    }
    piedi.appendChild(n(doc, "span", "pr-cmeta", v.tipo === "custom" ? "salvata nel programma" : "formula del v31"));
    carta.appendChild(piedi);
    griglia.appendChild(carta);
  });
  return voci.length;
}
