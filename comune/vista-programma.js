/* Barbell Diva B — la schermata Programma 1/2/3 (fase 2.5).
 *
 * L'aspetto è quello delle altre schermate (ck-testa, ck-sez, ck-card,
 * ck-mets, ck-due): stesse carte, stesso filo, stessi due temi. Le classi
 * pg-* sono solo i pezzi che questa schermata ha in più: la scheda d'identità
 * del programma, le linguette delle schede e la tabella «previsto / visto».
 *
 * Nel v31 questa pagina è un modulo da compilare (campi, menu a tendina,
 * pulsanti «Attiva», «Salva in Libreria», prospetto modificabile). B non
 * scrive: quindi gli stessi campi si mostrano in sola lettura, e i pulsanti
 * del v31 non ci sono — non spenti, proprio assenti, perché non hanno niente
 * da fare qui. Se un campo non è nel documento, la casella dice «non
 * registrato» invece di mostrare il valore del mockup.
 */

import { coseNonRegistrateProgramma, PROGRAMMA_NON_REGISTRATO as NON } from "./programma.js";

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

function testa(doc, r) {
  const c = n(doc, "div", "ck-testa");
  const d = n(doc, "div");
  d.appendChild(n(doc, "div", "pz-oc", "Programmi · Programma " + (r.indice + 1)));
  const h = n(doc, "h2");
  h.appendChild(doc.createTextNode("Il programma "));
  h.appendChild(n(doc, "i", "", "in chiaro"));
  d.appendChild(h);
  d.appendChild(n(doc, "p", "", "Quello che il documento del programma dice, campo per campo, e quello che i logbook dimostrano delle sue schede. Nel v31 questa pagina si compila: qui si legge e basta, e ciò che il documento non porta resta «" + NON + "» invece di essere riempito."));
  c.appendChild(d);
  const g = n(doc, "button", "ck-guida", "Guida Programma");
  g.type = "button";
  g.disabled = true;
  g.title = "arriva con la schermata Impostazioni (2.15)";
  c.appendChild(g);
  return c;
}

function sintesi(doc, r) {
  const c = n(doc, "section", "ck-ready pg-sint");
  const d = n(doc, "div", "pg-sint-testo");
  const riga = n(doc, "div", "ck-ready-testa");
  riga.appendChild(n(doc, "span", "", "Programma " + (r.indice + 1) + (r.totaleProgrammi ? " di " + r.totaleProgrammi : "")));
  const pillola = n(doc, "span", "pg-stato", r.profilo.stato);
  pillola.setAttribute("data-segno", r.profilo.segno || "vuoto");
  riga.appendChild(pillola);
  d.appendChild(riga);
  d.appendChild(n(doc, "h3", "", r.profilo.presente ? r.profilo.nome : "Nessun documento-programma leggibile"));
  d.appendChild(n(doc, "p", "ck-frase", r.profilo.presente
    ? (r.profilo.fase ? r.profilo.fase + " · " : "")
      + (r.profilo.durata != null ? r.profilo.durata + " settimane" : "durata " + NON)
      + (r.profilo.giorni != null ? " · " + r.profilo.giorni + " giorni a settimana" : " · giorni " + NON)
    : "La sottoraccolta non ha restituito il programma: nessun nome e nessun numero al posto suo."));
  d.appendChild(n(doc, "p", "ck-ready-nota pg-sint-nota", r.profilo.presente
    ? (r.profilo.inizio ? "Inizio registrato il " + r.profilo.inizio : "Data di inizio " + NON)
      + (r.profilo.aggiornato ? " · ultimo salvataggio " + r.profilo.aggiornato.slice(0, 16).replace("T", " ") : " · ultimo salvataggio " + NON)
      + " · sedute con un codice scheda nei logbook: " + r.osservato.conCodice
    : "Niente da contare: la schermata resta vuota e lo dichiara."));
  c.appendChild(d);
  const sigillo = n(doc, "div", "pg-sigillo");
  sigillo.appendChild(n(doc, "b", "", r.schede && r.schede.length ? String(r.schede.length) : "—"));
  sigillo.appendChild(n(doc, "span", "pg-sigillo-lab", "schede lette"));
  c.appendChild(sigillo);
  return c;
}

function kpi(doc, r) {
  const griglia = n(doc, "div", "ck-mets pg-kpi");
  const voce = (etichetta, valore, unita, nota) => {
    const a = n(doc, "article", "ck-met");
    a.appendChild(n(doc, "div", "ck-met-t", etichetta));
    a.appendChild(n(doc, "div", "ck-met-v", valore));
    const u = n(doc, "div", "ck-met-u", unita);
    u.appendChild(n(doc, "span", "ck-met-n", nota));
    a.appendChild(u);
    return a;
  };
  griglia.appendChild(voce("Durata", r.profilo.durata == null ? "—" : String(r.profilo.durata), "settimane", "dal campo del programma"));
  griglia.appendChild(voce("Giorni a settimana", r.profilo.giorni == null ? "—" : String(r.profilo.giorni), "giorni", "quanti, non quali"));
  griglia.appendChild(voce("Schede lette", r.schede == null ? "—" : String(r.schede.length), "schede", r.schede == null ? "fuori dal documento v2" : "dal documento"));
  griglia.appendChild(voce("Esercizi", r.esercizi == null ? "—" : String(r.esercizi), "esercizi", r.esercizi == null ? "nelle schede non lette" : "sommando le schede lette"));
  griglia.appendChild(voce("Sedute viste", String(r.osservato.dentro), "sedute", "con un codice del programma"));
  return griglia;
}

function identita(doc, r) {
  const c = n(doc, "article", "ck-card pg-ident");
  const h = n(doc, "header", "ck-h");
  const d = n(doc, "div");
  d.appendChild(n(doc, "h4", "", "Identità del programma"));
  d.appendChild(n(doc, "p", "", "i campi del documento, in sola lettura · quello che manca è scritto, non riempito"));
  h.appendChild(d);
  c.appendChild(h);
  const griglia = n(doc, "div", "pg-campi");
  const campo = (etichetta, valore, nota) => {
    const f = n(doc, "div", "pg-f");
    f.appendChild(n(doc, "span", "pg-lab", etichetta));
    const v = n(doc, "span", "pg-val" + (valore ? "" : " vuoto"), valore || NON);
    f.appendChild(v);
    if (nota) f.appendChild(n(doc, "span", "pg-nota", nota));
    return f;
  };
  griglia.appendChild(campo("Nome", r.profilo.nome, r.profilo.presente ? null : "nessun documento letto"));
  griglia.appendChild(campo("Stato", null, "stato come lo scrive A: " + (r.profilo.segno === "vuoto" ? NON : r.profilo.stato)));
  griglia.appendChild(campo("Fase", r.profilo.fase, "periodizzazione: " + NON));
  griglia.appendChild(campo("Data di inizio", r.profilo.inizio, "AAAA-MM-GG come nel documento"));
  griglia.appendChild(campo("Durata", r.profilo.durata == null ? "" : r.profilo.durata + " settimane", "dal campo durationWeeks"));
  griglia.appendChild(campo("Giorni a settimana", r.profilo.giorni == null ? "" : String(r.profilo.giorni), "quanti giorni, non quali"));
  griglia.appendChild(campo("Identificativo", r.profilo.id, "l'id del documento, per ritrovarlo"));
  griglia.appendChild(campo("Ultimo salvataggio", r.profilo.aggiornato ? r.profilo.aggiornato.slice(0, 16).replace("T", " ") : "", "updatedAt del documento"));
  c.appendChild(griglia);
  // Lo stato si mostra una volta sola come parola: qui la casella resta
  // vuota di proposito, perché il valore vero è nella pillola in testa.
  const stato = griglia.children[1];
  if (stato && r.profilo.presente) {
    stato.querySelector(".pg-val").textContent = r.profilo.stato;
    stato.querySelector(".pg-val").className = "pg-val";
  }
  return c;
}

function testi(doc, r) {
  const c = n(doc, "article", "ck-card pg-testi");
  const h = n(doc, "header", "ck-h");
  const d = n(doc, "div");
  d.appendChild(n(doc, "h4", "", "Descrizione e messaggio per l'atleta"));
  d.appendChild(n(doc, "p", "", "le due note che la coach scrive nel programma, come le ha scritte"));
  h.appendChild(d);
  c.appendChild(h);
  const blocco = (titolo, testo) => {
    const b = n(doc, "div", "pg-mess");
    b.appendChild(n(doc, "span", "pg-lab", titolo));
    b.appendChild(n(doc, "p", testo ? "" : "pg-val vuoto", testo || NON + ": il campo non è nel documento"));
    return b;
  };
  c.appendChild(blocco("Descrizione del programma", r.profilo.descrizione));
  c.appendChild(blocco("Messaggio per l'atleta", r.profilo.messaggio));
  return c;
}

function schede(doc, r) {
  const c = n(doc, "article", "ck-card pg-schede");
  const h = n(doc, "header", "ck-h");
  const d = n(doc, "div");
  d.appendChild(n(doc, "h4", "", "Le schede del programma"));
  d.appendChild(n(doc, "p", "", r.schede == null
    ? "il documento non porta le schede: qui non si inventano"
    : "una linguetta per scheda, con gli esercizi contati e le sedute che i logbook dimostrano"));
  h.appendChild(d);
  if (r.schede != null) {
    const t = n(doc, "span", "pr-cont", (r.schede.length ? r.schede.length : 0) + " schede");
    h.appendChild(t);
  }
  c.appendChild(h);

  if (r.schede == null) {
    c.appendChild(n(doc, "p", "ck-piede-card pg-vuoto", "Schede fuori dal documento — " + r.schedeMotivo + "."));
    if (r.viste.length) {
      const riga = n(doc, "div", "pg-chips");
      r.viste.forEach((v) => {
        const p = n(doc, "span", "pg-chip");
        p.appendChild(n(doc, "b", "", v.codice));
        p.appendChild(n(doc, "span", "", v.numero === 1 ? "1 seduta" : v.numero + " sedute"));
        riga.appendChild(p);
      });
      c.appendChild(n(doc, "p", "pg-lab pg-chips-lab", "I codici scheda che compaiono nei logbook (non le schede del programma)"));
      c.appendChild(riga);
    }
    return c;
  }

  if (!r.schede.length) {
    c.appendChild(n(doc, "p", "ck-piede-card pg-vuoto", "Il documento porta un elenco di schede vuoto: nessuna scheda da mostrare, e nessuna aggiunta per finta."));
    return c;
  }

  const linguette = n(doc, "div", "pg-tabs");
  r.schede.forEach((s) => {
    const t = n(doc, "span", "pg-tab");
    t.appendChild(doc.createTextNode("Scheda " + s.codice));
    t.appendChild(n(doc, "i", "", s.esercizi == null ? "—" : String(s.esercizi)));
    linguette.appendChild(t);
  });
  c.appendChild(linguette);

  const tabella = n(doc, "div", "pg-tabella");
  const testata = n(doc, "div", "pg-tr pg-th");
  ["scheda", "nome", "settimana", "esercizi", "sedute viste"].forEach((t) => testata.appendChild(n(doc, "span", "", t)));
  tabella.appendChild(testata);
  r.schede.forEach((s) => {
    const riga = n(doc, "div", "pg-tr");
    riga.appendChild(n(doc, "span", "pg-td-cod", s.codice));
    riga.appendChild(n(doc, "span", "", s.nome || NON));
    riga.appendChild(n(doc, "span", "pg-num", s.settimana == null ? "—" : String(s.settimana)));
    riga.appendChild(n(doc, "span", "pg-num", s.esercizi == null ? "—" : String(s.esercizi)));
    const vista = r.viste.find((v) => v.codice === s.codice);
    riga.appendChild(n(doc, "span", "pg-num", vista ? String(vista.numero) : "0"));
    tabella.appendChild(riga);
  });
  c.appendChild(tabella);
  c.appendChild(n(doc, "p", "ck-piede-card", "Nome e settimana delle schede non sono nel contratto di lettura di questa fase: quando ci sono si mostrano, quando mancano resta il trattino. Le «sedute viste» sono quelle dei logbook con lo stesso codice scheda — l'unico legame che A registra, perché la seduta non porta il programId."));
  return c;
}

function rotazione(doc, r) {
  const c = n(doc, "article", "ck-card pg-rot");
  const h = n(doc, "header", "ck-h");
  const d = n(doc, "div");
  d.appendChild(n(doc, "h4", "", "Rotazione: previsto contro visto"));
  d.appendChild(n(doc, "p", "", r.rotazione.registrata
    ? "la sequenza scritta nel programma (" + r.rotazione.fonte + ") e quante volte ciascuna scheda compare nei logbook"
    : "la sequenza scritta non è nel documento: resta non registrata, e sotto c'è solo quello che i logbook dimostrano"));
  h.appendChild(d);
  c.appendChild(h);

  if (r.rotazione.registrata) {
    const catena = n(doc, "div", "pg-catena");
    r.rotazione.codici.forEach((c2, i) => {
      if (i) catena.appendChild(n(doc, "span", "pg-freccia", "→"));
      catena.appendChild(n(doc, "span", "pg-passo", c2));
    });
    c.appendChild(catena);

    const tabella = n(doc, "div", "pg-tabella");
    const testata = n(doc, "div", "pg-tr pg-th");
    ["codice", "osservate", "ultima volta"].forEach((t) => testata.appendChild(n(doc, "span", "", t)));
    tabella.appendChild(testata);
    r.viste.forEach((v) => {
      const riga = n(doc, "div", "pg-tr" + (v.numero ? "" : " pg-mai"));
      riga.appendChild(n(doc, "span", "pg-td-cod", v.codice));
      riga.appendChild(n(doc, "span", "pg-num", String(v.numero)));
      riga.appendChild(n(doc, "span", "", v.ultima || NON));
      tabella.appendChild(riga);
    });
    c.appendChild(tabella);
  } else {
    c.appendChild(n(doc, "p", "ck-piede-card pg-vuoto", "Rotazione prevista: " + NON + ". Nel v31 è un prospetto da compilare settimana per settimana; qui non esiste un previsto da confrontare, e un previsto inventato sarebbe peggio del vuoto."));
  }

  if (r.osservato.fuori) {
    c.appendChild(n(doc, "p", "ck-piede-card", r.osservato.fuori + (r.osservato.fuori === 1 ? " seduta porta" : " sedute portano") + " un codice che non è tra quelli del programma: sono fuori da questo confronto, non cancellate."));
  }
  return c;
}

function cosaManca(doc) {
  const c = n(doc, "article", "ck-card pg-manca");
  const h = n(doc, "header", "ck-h");
  const d = n(doc, "div");
  d.appendChild(n(doc, "h4", "", "Cosa non c'è, e perché"));
  d.appendChild(n(doc, "p", "", "il documento letto non porta tutto: qui si dichiara invece di riempirlo"));
  h.appendChild(d);
  c.appendChild(h);
  const lista = n(doc, "div", "pz-manca-lista");
  coseNonRegistrateProgramma().forEach(([titolo, testo]) => {
    const riga = n(doc, "div", "pz-manca-r");
    riga.appendChild(n(doc, "b", "", titolo));
    riga.appendChild(n(doc, "span", "", testo));
    lista.appendChild(riga);
  });
  c.appendChild(lista);
  return c;
}

function osservato(doc, r) {
  const c = n(doc, "article", "ck-card pg-osservato");
  const h = n(doc, "header", "ck-h");
  const d = n(doc, "div");
  d.appendChild(n(doc, "h4", "", "Quello che i logbook dicono"));
  d.appendChild(n(doc, "p", "", "tutte le sedute con un codice, comprese quelle di altri programmi"));
  h.appendChild(d);
  c.appendChild(h);
  if (!r.osservato.righe.length) {
    c.appendChild(n(doc, "p", "ck-piede-card pg-vuoto", "Nessuna seduta porta un codice scheda: non c'è niente da contare."));
    return c;
  }
  const tabella = n(doc, "div", "pg-tabella");
  const testata = n(doc, "div", "pg-tr pg-th");
  ["codice", "sedute", "del programma", "ultima"].forEach((t) => testata.appendChild(n(doc, "span", "", t)));
  tabella.appendChild(testata);
  r.osservato.righe.forEach((x) => {
    const riga = n(doc, "div", "pg-tr");
    riga.appendChild(n(doc, "span", "pg-td-cod", x.codice));
    riga.appendChild(n(doc, "span", "pg-num", String(x.numero)));
    riga.appendChild(n(doc, "span", "pg-num", x.dentro ? "sì" : "no"));
    riga.appendChild(n(doc, "span", "", x.ultima ? String(x.ultima.getUTCDate()).padStart(2, "0") + "/" + String(x.ultima.getUTCMonth() + 1).padStart(2, "0") + "/" + x.ultima.getUTCFullYear() : NON));
    tabella.appendChild(riga);
  });
  c.appendChild(tabella);
  if (r.osservato.senzaData) {
    c.appendChild(n(doc, "p", "ck-piede-card", r.osservato.senzaData + (r.osservato.senzaData === 1 ? " seduta senza data" : " sedute senza data") + ": contate nel numero, senza giorno nella colonna «ultima»."));
  }
  return c;
}

/* La vista riceve il riepilogo già calcolato da comune/programma.js. */
export function renderProgramma(doc, contenitore, modello, calcoli) {
  while (contenitore.firstChild) contenitore.firstChild.remove();
  const r = calcoli || {
    indice: 0, totaleProgrammi: null,
    profilo: { presente: false, nome: NON, stato: NON, segno: "vuoto", fase: "", inizio: "", durata: null, giorni: null, descrizione: "", messaggio: "", aggiornato: "", id: "", archiviato: false },
    schede: null, schedeMotivo: null, rotazione: { codici: [], registrata: false, fonte: NON },
    osservato: { righe: [], conCodice: 0, dentro: 0, fuori: 0, senzaData: 0, totale: 0 },
    viste: [], esercizi: null, senzaData: 0
  };
  contenitore.appendChild(testa(doc, r));
  contenitore.appendChild(sintesi(doc, r));
  contenitore.appendChild(sezione(doc, "M2 6.5L8 2l6 4.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z", "I numeri del programma"));
  contenitore.appendChild(kpi(doc, r));
  contenitore.appendChild(sezione(doc, "M3 4h10v9H3zM3 7h10M6.5 2.5v3M9.5 2.5v3", "Com'è fatto, e cosa dice"));
  const due = n(doc, "div", "ck-due pg-due-uno");
  due.appendChild(identita(doc, r));
  due.appendChild(testi(doc, r));
  contenitore.appendChild(due);
  contenitore.appendChild(sezione(doc, "M4 12V6m4 6V3m4 9V8", "Le schede e la rotazione"));
  contenitore.appendChild(schede(doc, r));
  const dueB = n(doc, "div", "ck-due");
  dueB.appendChild(rotazione(doc, r));
  dueB.appendChild(osservato(doc, r));
  contenitore.appendChild(dueB);
  contenitore.appendChild(sezione(doc, "M8 2v12M2 8h12", "Il vuoto dichiarato"));
  contenitore.appendChild(cosaManca(doc));
  return contenitore;
}
