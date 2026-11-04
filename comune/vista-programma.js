/* Barbell Diva B — la schermata Programma (fase 2.5, SOLA LETTURA).
 *
 * L'aspetto è quello della pagina Programma 1 del v31: la testa, le tre carte
 * in fila (programma · rotazione · stato), le linguette delle schede e la
 * tabella degli esercizi con serie, ripetizioni, recupero. Cambia una cosa
 * sola, ed è la ragione per cui la schermata esiste: **i campi sono bloccati**.
 * Le tendine sono chiuse, i campi non si scrivono, i pulsanti che salvano non
 * ci sono. Quando la scrittura si aprirà, si sbloccano gli stessi campi: non
 * si rifà il disegno.
 *
 * Le classi ck-* sono quelle delle altre schermate; le pr-* e le pg-* sono i
 * pezzi del v31 rifatti qui, con i gettoni dei due temi.
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

/* Le date si leggono all'italiana: giorno/mese/anno. Arrivano dai documenti
 * in forma ISO (2026-01-05) o già come Date; qui diventano 05/01/2026. Una
 * data che non si capisce resta com'era: non si inventa niente. */
function dataItaliana(valore) {
  if (valore instanceof Date && !Number.isNaN(valore.getTime())) {
    return String(valore.getUTCDate()).padStart(2, "0") + "/" +
      String(valore.getUTCMonth() + 1).padStart(2, "0") + "/" + valore.getUTCFullYear();
  }
  const testo = valore == null ? "" : String(valore).trim();
  if (!testo) return "";
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(testo);
  if (iso) return iso[3] + "/" + iso[2] + "/" + iso[1];
  const ita = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(testo);
  if (ita) return ita[1].padStart(2, "0") + "/" + ita[2].padStart(2, "0") + "/" + ita[3];
  return testo;
}

/* Un campo bloccato: etichetta sopra, valore dentro, nota sotto. È lo stesso
 * campo del v31, con readOnly addosso. */
function campo(doc, etichetta, valore, tipo, nota, scelte) {
  const f = n(doc, "label", "pr-f");
  f.appendChild(n(doc, "span", "pr-lab", etichetta));
  let controllo;
  if (tipo === "select") {
    controllo = n(doc, "select", "pr-sel");
    controllo.disabled = true;
    const opzioni = Array.isArray(scelte) ? scelte : [];
    if (!valore || opzioni.indexOf(valore) === -1) {
      const vuota = n(doc, "option", "", valore || NON);
      vuota.value = "";
      controllo.appendChild(vuota);
    }
    opzioni.forEach((o) => {
      const op = n(doc, "option", "", o);
      op.value = o;
      if (o === valore) op.selected = true;
      controllo.appendChild(op);
    });
  } else if (tipo === "area") {
    controllo = n(doc, "textarea", "pr-ta");
    controllo.rows = 3;
    controllo.readOnly = true;
    controllo.value = valore || "";
    if (!valore) controllo.placeholder = NON;
  } else if (tipo === "data") {
    /* Niente `type="date"`: il browser mostra le date come vuole lui, e in
     * inglese diventano mese/giorno/anno. Qui il formato è scritto da noi. */
    controllo = n(doc, "input", "pr-in pr-data");
    controllo.type = "text";
    controllo.readOnly = true;
    controllo.setAttribute("inputmode", "numeric");
    controllo.value = dataItaliana(valore);
    controllo.placeholder = "gg/mm/aaaa";
  } else {
    controllo = n(doc, "input", "pr-in");
    controllo.type = tipo || "text";
    controllo.readOnly = true;
    controllo.value = valore == null ? "" : String(valore);
    if (!valore) controllo.placeholder = NON;
  }
  controllo.setAttribute("tabindex", "-1");
  controllo.setAttribute("aria-readonly", "true");
  f.appendChild(controllo);
  if (nota) f.appendChild(n(doc, "span", "pr-hint", nota));
  return f;
}

function testa(doc, r) {
  const c = n(doc, "div", "ck-testa");
  const d = n(doc, "div");
  d.appendChild(n(doc, "div", "r-oc", "Programmi · " + (r.profilo && r.profilo.nome ? r.profilo.nome : "non registrato")));
  const h = n(doc, "h2");
  h.appendChild(doc.createTextNode("Il programma "));
  h.appendChild(n(doc, "i", "", "che c'è"));
  d.appendChild(h);
  d.appendChild(n(doc, "p", "", "Il tuo programma con le schede e gli esercizi veri, in sola lettura: le tendine sono chiuse e i pulsanti che salvano non ci sono. Quando la scrittura si aprirà, questi stessi campi si sbloccheranno."));
  c.appendChild(d);
  const stato = n(doc, "span", "r-badge", "sola lettura · 0 scritture");
  c.appendChild(stato);
  return c;
}

function cartaProgramma(doc, r) {
  const c = n(doc, "section", "pr-card pr-c1");
  const h = n(doc, "header", "pr-ch");
  h.appendChild(n(doc, "h3", "", "Programma"));
  h.appendChild(n(doc, "span", "pr-meta", (r.schede ? r.schede.length : 0) + " schede · " + (r.esercizi == null ? "—" : r.esercizi) + " esercizi"));
  c.appendChild(h);

  const campi = n(doc, "div", "pr-fields");
  campi.appendChild(campo(doc, "Programma", r.profilo.nome, "text", null));
  campi.appendChild(campo(doc, "Data inizio", r.profilo.inizio, "data", null));
  campi.appendChild(campo(doc, "Fase", r.profilo.fase, "select", null, ["Bulk", "Cut", "Recomp", "Mantenimento"]));
  campi.appendChild(campo(doc, "Gg/sett", r.profilo.giorni == null ? "" : r.profilo.giorni + " gg/sett", "select", null, ["3 gg/sett", "4 gg/sett", "5 gg/sett", "6 gg/sett"]));
  campi.appendChild(campo(doc, "Settimane", r.profilo.durata == null ? "" : String(r.profilo.durata), "text", null));
  c.appendChild(campi);

  const due = n(doc, "div", "pr-two");
  due.appendChild(campo(doc, "Descrizione programma", r.profilo.descrizione, "area", null));
  due.appendChild(campo(doc, "Messaggio per l'atleta (all'apertura)", r.profilo.messaggio, "area", null));
  c.appendChild(due);

  const fine = n(doc, "div", "pr-row-end");
  fine.appendChild(n(doc, "span", "pr-hint", "Quello che il tuo programma non riporta resta «" + NON + "»: qui non si riempie."));
  c.appendChild(fine);
  return c;
}

function cartaRotazione(doc, r) {
  const c = n(doc, "section", "pr-card pr-c2");
  const h = n(doc, "header", "pr-ch");
  h.appendChild(n(doc, "h3", "", "Rotazione schede"));
  const interruttore = n(doc, "span", "pr-sw");
  interruttore.setAttribute("role", "switch");
  interruttore.setAttribute("aria-checked", "false");
  interruttore.setAttribute("aria-disabled", "true");
  interruttore.setAttribute("title", "la rotazione si accende quando B potrà scrivere");
  interruttore.appendChild(n(doc, "b", "", "OFF"));
  h.appendChild(interruttore);
  c.appendChild(h);

  const codici = r.rotazione && r.rotazione.registrata ? r.rotazione.codici : (r.codiciVisti || []);
  c.appendChild(n(doc, "div", "pr-meta pr-meta-sotto", codici.length
    ? codici.length + (r.rotazione && r.rotazione.registrata ? " in rotazione · dal campo del programma" : " codici visti nei logbook · rotazione prevista " + NON)
    : "nessun codice: né nel programma, né nei logbook"));
  if (r.rotazione && !r.rotazione.registrata) {
    c.appendChild(n(doc, "p", "pr-warn", "La rotazione prevista non è nel documento: sotto c'è il calendario delle sedute fatte, non un piano inventato."));
  }

  const chips = n(doc, "div", "pr-chips");
  codici.forEach((cod, i) => {
    const chip = n(doc, "span", "pr-rotchip" + (i > 4 ? " jolly" : ""), cod);
    chip.title = "sola lettura";
    chips.appendChild(chip);
  });
  c.appendChild(chips);
  c.appendChild(n(doc, "p", "pr-guide", "Le schede della rotazione qui sono etichette: non si accende e non si spegne niente."));

  const prosp = n(doc, "div", "pr-prosp");
  prosp.appendChild(n(doc, "div", "pr-prosp-h", "Prospetto · ultime 8 settimane, quello che i logbook dimostrano"));
  const corpo = n(doc, "div", "pr-prosp-b");
  (r.settimane || []).forEach((s) => {
    const riga = n(doc, "div", "pr-prow");
    riga.appendChild(n(doc, "span", "", "Sett " + s.numero));
    const caselle = s.codici && s.codici.length ? s.codici : [];
    for (let i = 0; i < 4; i += 1) {
      const cella = n(doc, "span", "pr-psel" + (caselle[i] ? "" : " vuota"), caselle[i] || "—");
      if (caselle[i] && caselle[i + 4]) cella.title = "altre sedute: " + caselle.slice(4).join(", ");
      riga.appendChild(cella);
    }
    corpo.appendChild(riga);
  });
  prosp.appendChild(corpo);
  c.appendChild(prosp);
  return c;
}

function cartaStato(doc, r) {
  const c = n(doc, "section", "pr-card pr-c3");
  const stato = n(doc, "div", "pr-stato");
  const punto = n(doc, "span", "pr-dot");
  punto.setAttribute("data-segno", r.profilo.segno || "vuoto");
  stato.appendChild(punto);
  stato.appendChild(n(doc, "b", "", (r.profilo.stato || NON) + " · sola lettura: nessun pulsante che salva"));
  c.appendChild(stato);
  const vis = n(doc, "div", "pr-vis");
  vis.appendChild(campo(doc, "Visibile all'atleta dal", "", "data", "questo dato non è ancora letto: resta vuoto"));
  c.appendChild(vis);
  const atti = n(doc, "p", "pr-hint pr-acts-vuoto", "I pulsanti che salvano — confronta, copia, salva in libreria — non ci sono: questa pagina non scrive.");
  c.appendChild(atti);
  const meta = n(doc, "p", "pr-hint", "Ultimo salvataggio " + (r.profilo.aggiornato ? r.profilo.aggiornato.slice(0, 16).replace("T", " ") : NON) + "");
  c.appendChild(meta);
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
  griglia.appendChild(voce("Schede", r.schede ? String(r.schede.length) : "—", "schede", "lette dal tuo programma"));
  griglia.appendChild(voce("Esercizi", r.esercizi == null ? "—" : String(r.esercizi), "esercizi", "dentro le schede attive"));
  griglia.appendChild(voce("Archiviate", String(r.archiviate ? r.archiviate.length : 0), "schede", "messe da parte"));
  griglia.appendChild(voce("Codici scheda", String(r.codiciVisti ? r.codiciVisti.length : 0), "codici", "visti nei tuoi logbook"));
  griglia.appendChild(voce("Sedute viste", String(r.osservato ? r.osservato.dentro : 0), "sedute", "con un codice di questo programma"));
  return griglia;
}

/* La tabella degli esercizi di una scheda, come nel v31: numero, nome, gruppo,
 * serie, ripetizioni, recupero, nota. */
function tabellaEsercizi(doc, scheda) {
  const t = n(doc, "div", "pg-tabella pr-tb");
  const testata = n(doc, "div", "pg-tr pg-th pr-tb-row");
  ["#", "esercizio", "gruppo", "serie", "rip.", "rec.", "sett.", "nota"].forEach((x) => testata.appendChild(n(doc, "span", "", x)));
  t.appendChild(testata);
  if (!scheda.esercizi.length) {
    t.appendChild(n(doc, "p", "pg-vuoto", "Questa scheda non ha esercizi leggibili: il documento non li porta, e qui non si inventano."));
    return t;
  }
  scheda.esercizi.forEach((e, i) => {
    const riga = n(doc, "div", "pg-tr pr-tb-row");
    riga.appendChild(n(doc, "span", "pg-num", String(i + 1)));
    riga.appendChild(n(doc, "span", "pr-ex-nome", e.nome));
    riga.appendChild(n(doc, "span", "", e.muscolo || NON));
    riga.appendChild(n(doc, "span", "pg-num", e.prescrizione.serie || "—"));
    riga.appendChild(n(doc, "span", "pg-num", e.prescrizione.ripetizioni || "—"));
    riga.appendChild(n(doc, "span", "pg-num", e.prescrizione.recupero || "—"));
    riga.appendChild(n(doc, "span", "pg-num", e.prescrizione.settimane ? String(e.prescrizione.settimane) : "—"));
    riga.appendChild(n(doc, "span", "pr-ex-nota", e.nota || ""));
    t.appendChild(riga);
  });
  return t;
}

/* Linguette e pannelli: la scheda si sceglie cliccando, come nel v31. Nessun
 * dato esce dalla pagina, nessuna scrittura: si mostra una scheda alla volta. */
function schede(doc, r) {
  const c = n(doc, "article", "ck-card pg-schede pr-shell");
  const elenco = r.schede || [];
  const linguette = n(doc, "nav", "pr-tabs");
  linguette.setAttribute("role", "tablist");
  const pannelli = n(doc, "div", "pr-pannelli");
  const bottoni = [];

  const accendi = (indice) => {
    bottoni.forEach((b, i) => {
      const suo = i === indice;
      b.classList.toggle("on", suo);
      b.setAttribute("aria-selected", suo ? "true" : "false");
    });
    Array.prototype.forEach.call(pannelli.children, (p, i) => { p.hidden = i !== indice; });
  };

  if (!elenco.length) {
    c.appendChild(n(doc, "p", "pg-vuoto", r.schede === null
      ? "Nessuna scheda per questo programma nei dati letti" + (r.schedeMotivo ? " — " + r.schedeMotivo : "") + "."
      : "Il programma non ha schede attive: nessun pannello da mostrare."));
    if (r.archiviate && r.archiviate.length) {
      c.appendChild(n(doc, "p", "pr-hint", "Schede archiviate di questo programma: " + r.archiviate.length + " — si vedono nella tabella qui sotto."));
    }
    return c;
  }

  elenco.forEach((s, i) => {
    const b = n(doc, "button", "pr-ntab", "Scheda " + s.codice);
    b.type = "button";
    b.setAttribute("role", "tab");
    b.appendChild(n(doc, "i", "", String(s.numeroEsercizi)));
    b.addEventListener("click", () => accendi(i));
    bottoni.push(b);
    linguette.appendChild(b);
  });
  if (r.archiviate && r.archiviate.length) {
    const sep = n(doc, "span", "pr-tabs-sep");
    linguette.appendChild(sep);
    linguette.appendChild(n(doc, "span", "pr-ntab spenta", "Archiviate " + r.archiviate.length));
  }
  c.appendChild(linguette);

  elenco.forEach((s, i) => {
    const p = n(doc, "div", "pr-pannello");
    p.hidden = i !== 0;
    const testata = n(doc, "div", "pr-shd");
    const t = n(doc, "div", "pr-shd-t");
    t.appendChild(n(doc, "h3", "", "Scheda " + s.codice + (s.nome ? " — " + s.nome : "")));
    t.appendChild(n(doc, "span", "pr-shd-c", s.numeroEsercizi + (s.numeroEsercizi === 1 ? " esercizio" : " esercizi") + (s.focus ? " · " + s.focus : "")));
    testata.appendChild(t);
    const f = n(doc, "div", "pr-shd-f");
    f.appendChild(campo(doc, "Settimana", s.settimana == null ? "" : String(s.settimana), "text", null));
    f.appendChild(campo(doc, "Giorno", s.giorno == null ? "" : String(s.giorno), "text", null));
    f.appendChild(campo(doc, "Aggiornata", s.aggiornata ? s.aggiornata.slice(0, 10) : "", "text", null));
    testata.appendChild(f);
    p.appendChild(testata);
    if (s.note) p.appendChild(n(doc, "p", "pr-nota-ex", s.note));
    p.appendChild(tabellaEsercizi(doc, s));
    pannelli.appendChild(p);
  });
  c.appendChild(pannelli);

  if (r.archiviate && r.archiviate.length) {
    const arch = n(doc, "div", "pr-archiviate");
    arch.appendChild(n(doc, "div", "pr-lab", "Schede archiviate · " + r.archiviate.length + ", in sola lettura"));
    const riga = n(doc, "div", "pr-chips");
    r.archiviate.forEach((s) => {
      const chip = n(doc, "span", "pr-chip-arch", "Scheda " + s.codice + " · " + s.numeroEsercizi);
      arch.appendChild(chip);
      riga.appendChild(n(doc, "span", "", ""));
    });
    c.appendChild(arch);
  }
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
  if (!r.osservato || !r.osservato.righe.length) {
    c.appendChild(n(doc, "p", "pg-vuoto", "Nessuna seduta porta un codice scheda: non c'è niente da contare."));
    return c;
  }
  const t = n(doc, "div", "pg-tabella");
  const testata = n(doc, "div", "pg-tr pg-th");
  ["codice", "sedute", "del programma", "ultima"].forEach((x) => testata.appendChild(n(doc, "span", "", x)));
  t.appendChild(testata);
  r.osservato.righe.forEach((x) => {
    const riga = n(doc, "div", "pg-tr");
    riga.appendChild(n(doc, "span", "pg-td-cod", x.codice));
    riga.appendChild(n(doc, "span", "pg-num", String(x.numero)));
    riga.appendChild(n(doc, "span", "pg-num", x.dentro ? "sì" : "no"));
    riga.appendChild(n(doc, "span", "", x.ultima ? String(x.ultima.getUTCDate()).padStart(2, "0") + "/" + String(x.ultima.getUTCMonth() + 1).padStart(2, "0") + "/" + x.ultima.getUTCFullYear() : NON));
    t.appendChild(riga);
  });
  c.appendChild(t);
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

/* La vista riceve il riepilogo già calcolato da comune/programma.js: schede ed
 * esercizi arrivano dai documenti v2, i numeri dai logbook. */
export function renderProgramma(doc, contenitore, modello, calcoli) {
  while (contenitore.firstChild) contenitore.firstChild.remove();
  const r = calcoli || {};
  const pieno = {
    indice: Number.isFinite(Number(r.indice)) ? Number(r.indice) : 0,
    totaleProgrammi: r.totaleProgrammi == null ? null : Number(r.totaleProgrammi),
    profilo: r.profilo || { presente: false, nome: NON, stato: NON, segno: "vuoto", fase: "", inizio: "", durata: null, giorni: null, descrizione: "", messaggio: "", aggiornato: "", id: "" },
    schede: r.schede === undefined ? null : r.schede,
    archiviate: r.archiviate || [],
    schedeMotivo: r.schedeMotivo || null,
    rotazione: r.rotazione || { codici: [], registrata: false, fonte: NON },
    codiciVisti: r.codiciVisti || [],
    osservato: r.osservato || { righe: [], conCodice: 0, dentro: 0, fuori: 0, senzaData: 0, totale: 0 },
    settimane: r.settimane || [],
    esercizi: r.esercizi == null ? null : r.esercizi,
    fonteSchede: r.fonteSchede || null
  };
  contenitore.appendChild(testa(doc, pieno));
  contenitore.appendChild(sezione(doc, "M2 6.5L8 2l6 4.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z", "Il programma"));
  const tre = n(doc, "div", "pr-grid");
  tre.appendChild(cartaProgramma(doc, pieno));
  tre.appendChild(cartaRotazione(doc, pieno));
  tre.appendChild(cartaStato(doc, pieno));
  contenitore.appendChild(tre);
  contenitore.appendChild(sezione(doc, "M4 12V6m4 6V3m4 9V8", "I conti delle schede"));
  contenitore.appendChild(kpi(doc, pieno));
  contenitore.appendChild(sezione(doc, "M3 4h10v9H3zM3 7h10M6.5 2.5v3M9.5 2.5v3", "Le schede e i loro esercizi · una linguetta alla volta"));
  contenitore.appendChild(schede(doc, pieno));
  const due = n(doc, "div", "ck-due");
  due.appendChild(osservato(doc, pieno));
  due.appendChild(cosaManca(doc));
  contenitore.appendChild(due);
  return contenitore;
}
