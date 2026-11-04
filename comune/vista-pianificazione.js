/* Barbell Diva B — la schermata Pianificazione (fase 2.4).
 *
 * L'aspetto è quello della Dashboard e della Overview (ck-testa, ck-sez,
 * ck-card, ck-mets): stesse carte, stesso filo, stesso colore. Le classi pz-*
 * sono solo per i pezzi che le altre schermate non hanno: il prospetto delle
 * settimane e le pillole della rotazione.
 *
 * Regola: il prospetto mostra le sedute che ci sono, non il piano che
 * dovrebbe esserci. Le caselle vuote restano vuote e in fondo la card dice
 * perché — così un buco si vede invece di essere riempito con una previsione.
 */

import { coseNonRegistrate, PIANIFICAZIONE_NON_REGISTRATO as NON } from "./pianificazione.js";

function n(doc, tag, classe, testo) {
  const e = doc.createElement(tag);
  if (classe) e.className = classe;
  if (testo != null) e.textContent = String(testo);
  return e;
}

function icona(doc, percorso) {
  const s = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("class", "ck-ic");
  s.setAttribute("viewBox", "0 0 16 16");
  s.setAttribute("width", "13");
  s.setAttribute("height", "13");
  s.setAttribute("fill", "none");
  s.setAttribute("stroke", "currentColor");
  s.setAttribute("stroke-width", "1.4");
  s.setAttribute("stroke-linecap", "round");
  s.setAttribute("stroke-linejoin", "round");
  s.setAttribute("aria-hidden", "true");
  const p = doc.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", percorso);
  s.appendChild(p);
  return s;
}

function sezione(doc, percorso, testo) {
  const d = n(doc, "div", "ck-sez");
  d.appendChild(icona(doc, percorso));
  d.appendChild(n(doc, "span", "", testo));
  return d;
}

function testa(doc) {
  const c = n(doc, "div", "ck-testa");
  const d = n(doc, "div");
  d.appendChild(n(doc, "div", "pz-oc", "Programmi · Pianificazione"));
  const h = n(doc, "h2");
  h.appendChild(doc.createTextNode("Il calendario "));
  h.appendChild(n(doc, "i", "", "dei blocchi"));
  d.appendChild(h);
  d.appendChild(n(doc, "p", "", "Otto settimane, lunedì in testa, e in ogni casella la scheda che c'è stata davvero. La rotazione prevista, lo scarico e il test non sono nei documenti che l'app legge: qui si vede il calendario che i logbook dimostrano."));
  c.appendChild(d);
  const g = n(doc, "button", "ck-guida", "Guida Pianificazione");
  g.type = "button";
  g.disabled = true;
  g.title = "arriva con la schermata Impostazioni (2.15)";
  c.appendChild(g);
  return c;
}

function sintesi(doc, modello, r) {
  const c = n(doc, "section", "ck-ready pz-sint");
  const d = n(doc, "div", "pz-sint-testo");
  d.appendChild(n(doc, "div", "ck-ready-testa", "Blocco attivo"));
  const pr = modello.programma;
  d.appendChild(n(doc, "h3", "", pr && pr.nome ? pr.nome : "Programma attivo: " + NON));
  d.appendChild(n(doc, "p", "ck-frase", pr && pr.nome
    ? (pr.esplicito ? "marcato come attivo nel programma · " : "aggiornato più di recente, ripiego di A · ")
      + (pr.settimana != null ? "settimana " + pr.settimana + " secondo i logbook" : "settimana " + NON)
    : "Il documento-programma non c'è o non è leggibile: nessun nome inventato al posto suo."));
  d.appendChild(n(doc, "p", "ck-ready-nota pz-sint-nota",
    r.totale
      ? "Sedute con una data leggibile: " + r.totale + ", dal " + r.prima + " al " + r.ultima + ". " + (r.senzaData ? r.senzaData + " senza data restano fuori dal prospetto." : "Tutte hanno una data.")
      : "Nessuna seduta con una data leggibile: il prospetto resta vuoto invece di mostrare un piano finto."));
  c.appendChild(d);

  const cerchio = n(doc, "div", "pz-donut");
  const q = r.giorniGuardati > 0 ? Math.round((r.giorniCoperti / r.giorniGuardati) * 100) : 0;
  cerchio.style.setProperty("--q", String(q));
  cerchio.appendChild(n(doc, "b", "", r.giorniGuardati ? r.giorniCoperti + "/" + r.giorniGuardati : "—"));
  cerchio.appendChild(n(doc, "span", "pz-donut-lab", "giorni con seduta"));
  c.appendChild(cerchio);
  return c;
}

function kpi(doc, r) {
  const griglia = n(doc, "div", "ck-mets pz-kpi");
  const voce = (etichetta, valore, unita, nota) => {
    const a = n(doc, "article", "ck-met");
    a.appendChild(n(doc, "div", "ck-met-t", etichetta));
    a.appendChild(n(doc, "div", "ck-met-v", valore));
    const u = n(doc, "div", "ck-met-u", unita);
    u.appendChild(n(doc, "span", "ck-met-n", nota));
    a.appendChild(u);
    return a;
  };
  griglia.appendChild(voce("Settimane coperte", r.settimaneCoperte + "/" + r.settimaneGuardate, "settimane", "almeno una seduta dentro"));
  griglia.appendChild(voce("Sedute nel prospetto", String(r.totale), "sedute", "solo quelle con data leggibile"));
  griglia.appendChild(voce("Codici scheda", String(r.rotazione.distinte), "codici", "quelli comparsi nei logbook"));
  griglia.appendChild(voce("Media", r.mediaSettimana == null ? "—" : String(r.mediaSettimana), "sedute / sett.", "sulle sole settimane coperte"));
  griglia.appendChild(voce("Giorni dall'ultima", r.giorniDallUltima == null ? "—" : String(r.giorniDallUltima), "giorni", r.ultima ? "ultima il " + r.ultima : "nessuna data"));
  return griglia;
}

function prospetto(doc, r) {
  const c = n(doc, "article", "ck-card pz-prospetto");
  const h = n(doc, "header", "ck-h");
  const d = n(doc, "div");
  d.appendChild(n(doc, "h4", "", "Prospetto settimane · la rotazione che i logbook dimostrano"));
  d.appendChild(n(doc, "p", "", "una riga per settimana, sette caselle da lunedì a domenica · dentro c'è il codice della scheda, non un previsto"));
  h.appendChild(d);
  c.appendChild(h);

  const testata = n(doc, "div", "pz-riga pz-intestazione");
  testata.appendChild(n(doc, "span", "pz-sett", "settimana"));
  ["L", "M", "M", "G", "V", "S", "D"].forEach((g, i) => {
    const cella = n(doc, "span", "pz-giorno", g);
    cella.setAttribute("aria-label", ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"][i]);
    testata.appendChild(cella);
  });
  testata.appendChild(n(doc, "span", "pz-conteggio", "sedute"));
  c.appendChild(testata);

  r.settimane.forEach((s) => {
    const riga = n(doc, "div", "pz-riga" + (s.corrente ? " corrente" : "") + (s.attiva ? "" : " vuota"));
    riga.appendChild(n(doc, "span", "pz-sett", s.etichetta));
    s.giorni.forEach((g) => {
      const cella = n(doc, "span", "pz-cella" + (g.numero ? " piena" : " vuota") + (g.oggi ? " oggi" : ""));
      if (g.codice) {
        cella.appendChild(n(doc, "b", "", g.codice));
        if (g.numero > 1) cella.appendChild(n(doc, "i", "", "×" + g.numero));
        cella.title = (g.nome ? g.nome + " · " : "") + g.codice + (g.numero > 1 ? " · " + g.numero + " sedute" : "");
      } else {
        cella.textContent = "—";
      }
      riga.appendChild(cella);
    });
    riga.appendChild(n(doc, "span", "pz-conteggio", String(s.sedute)));
    c.appendChild(riga);
  });

  const legenda = n(doc, "p", "ck-piede-card pz-legenda",
    r.settimaneVuote.length
      ? "Settimane senza nessuna seduta: " + r.settimaneVuote.join(" · ") + ". Restano visibili invece di essere saltate."
      : "Tutte le " + r.settimaneGuardate + " settimane hanno almeno una seduta. Le caselle con il trattino sono giorni di riposo o non registrati: qui non li distinguo, perché A non lo dice.");
  c.appendChild(legenda);
  return c;
}

function rotazione(doc, r) {
  const c = n(doc, "article", "ck-card pz-rotazione");
  const h = n(doc, "header", "ck-h");
  const d = n(doc, "div");
  d.appendChild(n(doc, "h4", "", "Rotazione osservata"));
  d.appendChild(n(doc, "p", "", "i codici in ordine di comparsa, e quante volte ciascuno è tornato"));
  h.appendChild(d);
  c.appendChild(h);
  if (!r.rotazione.conCodice) {
    c.appendChild(n(doc, "p", "ck-piede-card", "Nessuna seduta porta un codice di scheda: la rotazione resta vuota invece di essere dedotta dal nome."));
    return c;
  }
  const catena = n(doc, "div", "pz-catena");
  r.rotazione.sequenza.forEach((x, i) => {
    if (i) catena.appendChild(n(doc, "span", "pz-freccia", "→"));
    catena.appendChild(n(doc, "span", "pz-passo", x.codice));
  });
  c.appendChild(catena);
  const lista = n(doc, "div", "pz-conteggi");
  r.rotazione.elenco.forEach((x) => {
    const p = n(doc, "span", "pz-pillola");
    p.appendChild(n(doc, "b", "", x.codice));
    p.appendChild(n(doc, "span", "", x.numero + (x.numero === 1 ? " volta" : " volte")));
    lista.appendChild(p);
  });
  c.appendChild(lista);
  return c;
}

function cosaManca(doc) {
  const c = n(doc, "article", "ck-card pz-manca");
  const h = n(doc, "header", "ck-h");
  const d = n(doc, "div");
  d.appendChild(n(doc, "h4", "", "Cosa non c'è, e perché"));
  d.appendChild(n(doc, "p", "", "il piano vero non è nei documenti letti: qui si dichiara invece di riempirlo"));
  h.appendChild(d);
  c.appendChild(h);
  const lista = n(doc, "div", "pz-manca-lista");
  coseNonRegistrate().forEach(([titolo, testo]) => {
    const riga = n(doc, "div", "pz-manca-r");
    riga.appendChild(n(doc, "b", "", titolo));
    riga.appendChild(n(doc, "span", "", testo));
    lista.appendChild(riga);
  });
  c.appendChild(lista);
  return c;
}

/* La vista riceve il modello della pagina (programma attivo) e i conti già
 * calcolati da comune/pianificazione.js. */
export function renderPianificazione(doc, contenitore, modello, calcoli) {
  while (contenitore.firstChild) contenitore.firstChild.remove();
  const r = calcoli || {
    settimane: [], rotazione: { elenco: [], sequenza: [], distinte: 0, conCodice: 0 },
    totale: 0, senzaData: 0, settimaneCoperte: 0, settimaneGuardate: 0, settimaneVuote: [],
    giorniCoperti: 0, giorniGuardati: 0, mediaSettimana: null, giorniDallUltima: null, prima: null, ultima: null
  };
  contenitore.appendChild(testa(doc));
  contenitore.appendChild(sintesi(doc, modello || {}, r));
  contenitore.appendChild(sezione(doc, "M2 6.5L8 2l6 4.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z", "I numeri del calendario"));
  contenitore.appendChild(kpi(doc, r));
  contenitore.appendChild(sezione(doc, "M3 4h10v9H3zM3 7h10M6.5 2.5v3M9.5 2.5v3", "Il prospetto · otto settimane, sette giorni per riga"));
  contenitore.appendChild(prospetto(doc, r));
  contenitore.appendChild(sezione(doc, "M4 12V6m4 6V3m4 9V8", "Rotazione e vuoti dichiarati"));
  const due = n(doc, "div", "ck-due");
  due.appendChild(rotazione(doc, r));
  due.appendChild(cosaManca(doc));
  contenitore.appendChild(due);
  return contenitore;
}
