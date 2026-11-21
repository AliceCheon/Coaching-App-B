/* comune/vista-scheletri.js — extra-3: la pagina «Scheletri» (zona B).
 *
 * La linguetta si accende solo se la vista riceve r.scheletri (un elenco, anche
 * vuoto): senza elenco la pagina non ha niente da mostrare e la linguetta resta
 * spenta, come prima. Qui si legge e si disegna soltanto: ogni scrittura passa
 * da mod.onCambia, che scrive SOLO nella zona B.
 *
 * I tasti sono due, per ogni scheletro:
 *  - «Applica a una scheda»: si sceglie la scheda di destinazione e la conferma
 *    dice i numeri esatti (esercizi dello scheletro, righe che sostituisce);
 *  - «Elimina»: la conferma lo dice chiaro, dalla raccolta sparisce e la scheda
 *    non si tocca.
 * Se le regole Firestore rifiutano, la riga dell'esito lo dice con quelle
 * parole: non si finge che sia passata.
 */

import { fraseApplica, fraseElimina } from "./scheletri.js";
import { nomePulito } from "./nome-pulito.js";

function el(doc, tag, classe, testo) {
  const e = doc.createElement(tag);
  if (classe) e.setAttribute("class", classe);
  if (testo != null) e.appendChild(doc.createTextNode(String(testo)));
  return e;
}

function tasto(doc, classe, testo, titolo) {
  const b = el(doc, "button", classe, testo);
  b.type = "button";
  if (titolo) b.title = titolo;
  return b;
}

/* Le regole di Firestore parlano in inglese e con nomi tecnici: la riga
 * dell'esito lo dice in chiaro, cosi' si capisce che non e' un tasto rotto. */
export function regoleHannoRifiutato(motivo) {
  const m = String(motivo == null ? "" : motivo).toLowerCase();
  return m.indexOf("permission") !== -1
    || m.indexOf("insufficient") !== -1
    || m.indexOf("missing or insufficient permissions") !== -1
    || m.indexOf("unauthorized") !== -1;
}

export function testoEsitoScheletro(esito, azione) {
  const e = esito || {};
  if (e.ok === true) return String(e.testo || "").trim() || (azione === "elimina" ? "scheletro eliminato dalla raccolta" : "scheletro applicato: righe senza carichi");
  const motivo = String(e.motivo || e.testo || "").trim() || "motivo non dichiarato";
  if (regoleHannoRifiutato(motivo)) {
    return "Le regole Firestore hanno rifiutato la scrittura: " + motivo + " (la raccolta degli scheletri vive in bdB_atleti: non ho toccato la scheda)";
  }
  return (azione === "elimina" ? "Scheletro non eliminato: " : "Scheletro non applicato: ") + motivo;
}

/* Un riquadro di conferma dentro la pagina, sotto la riga dello scheletro:
 * niente finestrelle del browser. Torna il nodo, cosi' la prova lo legge. */
function chiediConferma(doc, riga, opzioni) {
  const o = opzioni || {};
  const vecchio = riga.querySelector(".skp-conf");
  if (vecchio) riga.removeChild(vecchio);
  const box = el(doc, "div", "skp-conf");
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-label", o.titolo || "conferma");
  if (o.titolo) box.appendChild(el(doc, "p", "skp-conf-titolo", o.titolo));
  (Array.isArray(o.righe) ? o.righe : []).forEach((t) => box.appendChild(el(doc, "p", "skp-conf-riga", t)));
  if (o.avviso) box.appendChild(el(doc, "p", "skp-conf-avviso", o.avviso));
  const fila = el(doc, "div", "skp-conf-fila");
  const no = tasto(doc, "skp-btn skp-btn-no", "Annulla", "non fare niente");
  no.addEventListener("click", () => { if (box.parentNode) box.parentNode.removeChild(box); });
  fila.appendChild(no);
  const si = tasto(doc, "skp-btn skp-btn-si" + (o.rosso ? " danger" : ""), o.conferma || "Conferma", o.titolo || "conferma");
  si.addEventListener("click", () => {
    if (box.parentNode) box.parentNode.removeChild(box);
    if (typeof o.onConferma === "function") o.onConferma();
  });
  fila.appendChild(si);
  box.appendChild(fila);
  riga.appendChild(box);
  return box;
}

/* La riga dell'esito: una sola per scheletro, si riusa. */
function scriviEsito(doc, riga, testo, ok) {
  let r = riga.querySelector(".skp-esito");
  if (!r) { r = el(doc, "p", "skp-esito"); riga.appendChild(r); }
  r.textContent = String(testo || "");
  r.setAttribute("data-ok", ok === true ? "si" : "no");
  return r;
}

function esegui(riga, promessa, azione) {
  const volta = (esito) => scriviEsito(riga.ownerDocument, riga, testoEsitoScheletro(esito, azione), esito && esito.ok === true);
  try {
    Promise.resolve(promessa).then(volta, (e) => volta({ ok: false, motivo: (e && e.message) || "errore" }));
  } catch (e) {
    volta({ ok: false, motivo: (e && e.message) || "errore" });
  }
}

/* La pagina intera: si aggancia alla linguetta come gli altri pannelli. */
export function pannelloScheletri(doc, r) {
  const c = el(doc, "article", "ck-card skp-carta");
  const elenco = Array.isArray(r && r.scheletri) ? r.scheletri : [];
  const schede = Array.isArray(r && r.schede) ? r.schede.filter((s) => s && s.id) : [];
  const mod = r && r.modifica ? r.modifica : null;

  c.appendChild(el(doc, "h3", "skp-titolo", "Scheletri in B"));
  if (!elenco.length) {
    c.appendChild(el(doc, "p", "skp-vuoto", "Nessuno scheletro salvato: si crea da un tasto \u00abSalva come scheletro\u00bb nella scheda, e da qui si applica a qualunque scheda."));
    return c;
  }
  c.appendChild(el(doc, "p", "skp-sub", elenco.length + (elenco.length === 1 ? " scheletro" : " scheletri") + " \u00b7 dal pi\u00f9 recente. Applicare non copia i carichi: le righe restano senza serie e ripetizioni."));

  elenco.forEach((s) => {
    const riga = el(doc, "div", "skp-riga");
    riga.setAttribute("data-sk", String(s.id == null ? "" : s.id));
    const testa = el(doc, "div", "skp-testa");
    testa.appendChild(el(doc, "b", "skp-nome", nomePulito(s.nome)));
    testa.appendChild(el(doc, "span", "skp-data", s.data || "data non registrata"));
    testa.appendChild(el(doc, "span", "skp-conto", s.esercizi + (s.esercizi === 1 ? " esercizio" : " esercizi")));
    riga.appendChild(testa);

    const atti = el(doc, "div", "skp-atti");
    const scelta = el(doc, "select", "skp-scelta");
    scelta.setAttribute("aria-label", "scheda di destinazione per lo scheletro " + nomePulito(s.nome));
    if (!schede.length) {
      const v = el(doc, "option", "", "nessuna scheda in B");
      v.value = "";
      scelta.appendChild(v);
      scelta.disabled = true;
    } else {
      schede.forEach((sh) => {
        const v = el(doc, "option", "", "Scheda " + sh.codice);
        v.value = String(sh.id);
        scelta.appendChild(v);
      });
    }
    atti.appendChild(scelta);

    const applica = tasto(doc, "skp-btn skp-applica", "Applica a una scheda", "sostituisce le righe della scheda con quelle dello scheletro, senza carichi");
    applica.addEventListener("click", () => {
      const idScheda = String(scelta.value || "");
      const sh = schede.filter((x) => String(x.id) === idScheda)[0];
      if (!mod || typeof mod.onCambia !== "function") {
        scriviEsito(doc, riga, "Questa pagina non ha un editor collegato: non ho scritto niente.", false);
        return;
      }
      if (!sh) {
        scriviEsito(doc, riga, "Scheletro non applicato: in B non c'\u00e8 una scheda su cui applicarlo.", false);
        return;
      }
      const sostituite = Number(sh.numeroEsercizi) >= 0 ? Number(sh.numeroEsercizi) : 0;
      chiediConferma(doc, riga, {
        titolo: "Applica lo scheletro",
        righe: [fraseApplica(nomePulito(s.nome), Number(s.esercizi), sh.codice, sostituite)],
        avviso: "Annulla rimette la scheda com'era: la pagina la rilegge da B.",
        conferma: "Applica",
        segno: "applica-scheletro",
        onConferma: () => esegui(riga, mod.onCambia({ idScheda: String(sh.id), campo: "applica-scheletro", idScheletro: String(s.id), nome: nomePulito(s.nome) }), "applica")
      });
    });
    atti.appendChild(applica);

    const elimina = tasto(doc, "skp-btn skp-elimina", "Elimina", "toglie lo scheletro dalla raccolta, non dalla scheda");
    elimina.addEventListener("click", () => {
      if (!mod || typeof mod.onCambia !== "function") {
        scriviEsito(doc, riga, "Questa pagina non ha un editor collegato: non ho scritto niente.", false);
        return;
      }
      chiediConferma(doc, riga, {
        titolo: "Elimina lo scheletro",
        righe: [fraseElimina(nomePulito(s.nome), Number(s.esercizi))],
        avviso: "Le schede su cui l'hai gi\u00e0 applicato non cambiano.",
        conferma: "Elimina",
        rosso: true,
        segno: "elimina-scheletro",
        onConferma: () => esegui(riga, mod.onCambia({ campo: "elimina-scheletro", idScheletro: String(s.id), nome: nomePulito(s.nome) }), "elimina")
      });
    });
    atti.appendChild(elimina);

    riga.appendChild(atti);
    c.appendChild(riga);
  });

  return c;
}
