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

import { coseNonRegistrateProgramma, chiavePrestazione, PROGRAMMA_NON_REGISTRATO as NON } from "./programma.js";
import { settimanePerTabella, indiceScarico } from "./schede-v2.js";

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

/* I codici del distretto sono quelli del Database esercizi del v31:
 * D Dorsali · CS Centro schiena · S Spalle · G Glutei · E Femorali ·
 * B Bicipiti · T Tricipiti · P Petto · Q Quadricipiti · C Polpacci ·
 * A Addominali · CA Cardio. Il documento di B porta il nome del gruppo, non la
 * lettera: si traduce con questa tabella, e quello che non si riconosce resta
 * un trattino invece di una lettera inventata. */
const DISTRETTI = [
  [["femorali", "femorale", "bicipiti femorali", "hamstring"], "E"],
  [["centro schiena", "schiena"], "CS"],
  [["dorsali", "dorsale", "dorso", "lat "], "D"],
  [["spalle", "spalla", "deltoidi", "deltoide"], "S"],
  [["glutei", "gluteo"], "G"],
  [["bicipiti", "bicipite", "brachiali", "brachiale"], "B"],
  [["tricipiti", "tricipite"], "T"],
  [["pettorali", "pettorale", "petto"], "P"],
  [["quadricipiti", "quadricipite", "gambe"], "Q"],
  [["polpacci", "polpaccio", "calf"], "C"],
  [["addominali", "addominale", "addome", "core"], "A"],
  [["cardio"], "CA"]
];

export function codiceDistretto(muscolo) {
  const t = " " + String(muscolo || "").toLowerCase().trim() + " ";
  if (t.trim() === "") return "\u2014";
  for (let i = 0; i < DISTRETTI.length; i += 1) {
    const chiavi = DISTRETTI[i][0];
    for (let k = 0; k < chiavi.length; k += 1) if (t.indexOf(chiavi[k]) !== -1) return DISTRETTI[i][1];
  }
  return "\u2014";
}

function pulsanteSpento(doc, classe, testo, titolo) {
  const b = n(doc, "button", classe, testo);
  b.type = "button";
  b.disabled = true;
  b.setAttribute("aria-disabled", "true");
  b.title = (titolo ? titolo + " · " : "") + "spento: questa pagina non scrive";
  return b;
}

function cerchioPiu(doc) {
  const s = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", "0 0 16 16");
  s.setAttribute("aria-hidden", "true");
  const c = doc.createElementNS("http://www.w3.org/2000/svg", "circle");
  c.setAttribute("cx", "8");
  c.setAttribute("cy", "8");
  c.setAttribute("r", "6.6");
  const p = doc.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", "M8 4.8v6.4M4.8 8h6.4");
  s.appendChild(c);
  s.appendChild(p);
  return s;
}

/* L'ultima volta che quell'esercizio è stato fatto, nella scheda giusta:
 * «26/10/2026 · 50 kg», come nel v31. Se il logbook non ha quella seduta resta
 * il trattino. */
function ultimaVolta(r, scheda, nome) {
  const mappa = (r && r.prestazioni) || {};
  const p = mappa[chiavePrestazione(scheda.codice, nome)];
  if (!p) return "\u2014";
  if (!p.data) return p.kg == null ? "\u2014" : p.kg + " kg";
  return p.kg == null ? p.data : p.data + " \u00b7 " + p.kg + " kg";
}

/* La tabella degli esercizi di una scheda: è quella del v31, riga per riga.
 * Stesse colonne e stesso ordine — JS · Dist. · Esercizio · Descr./Setup · Rec. ·
 * TUT · S1…S8 con le sotto-colonne ser e reps · Ultima — stesse classi, stesse
 * due righe di testa, stessi testi. Cambiano solo i dati, che sono quelli di B.
 *
 * I controlli che scrivono (×, ⇄, +, le tecniche T F R P, il +, i due −/+ del
 * recupero, «Applica progressione») stanno al loro posto ma spenti: questa
 * pagina non salva. Sotto la tabella non c'è nessuna frase: nel v31 non c'è.
 * Dove un dato manca si scrive il trattino, come fa il v31. */
function tabellaEsercizi(doc, scheda, r) {
  const elenco = scheda.esercizi || [];
  const quante = (r && r.profilo && r.profilo.durata) || 8;
  const scritte = elenco.map((e) => (e.prescrizione && e.prescrizione.elencoSettimane) || []);
  const numero = Math.max(Number(quante) || 8, ...scritte.map((x) => x.length), 8);
  const perRiga = scritte.map((x) => settimanePerTabella(x, numero));
  const scarico = [];
  perRiga.forEach((sett) => {
    const i = indiceScarico(sett);
    if (i >= 0 && scarico.indexOf(i) === -1) scarico.push(i);
  });
  const inScarico = (k) => scarico.indexOf(k) !== -1;

  const box = n(doc, "div", "p8-scroll");
  const t = n(doc, "table", "p8-tab");

  const cg = n(doc, "colgroup");
  ["w-js", "w-dist", "w-ese", "w-note", "w-rec", "w-tut"].forEach((cl) => cg.appendChild(n(doc, "col", cl)));
  for (let i = 0; i < numero; i += 1) {
    cg.appendChild(n(doc, "col", "w-ser"));
    cg.appendChild(n(doc, "col", "w-reps"));
  }
  cg.appendChild(n(doc, "col", "w-ult"));
  t.appendChild(cg);

  const thead = n(doc, "thead");
  const r1 = n(doc, "tr");
  [["c-js", "JS"], ["c-dist", "Dist."], ["c-ese", "Esercizio"], ["c-note", "Descr. / Setup"], ["c-rec", "Rec."], ["c-tut", "TUT"]]
    .forEach(([classe, testo]) => {
      const th = n(doc, "th", "p8h " + classe, testo);
      th.rowSpan = 2;
      r1.appendChild(th);
    });
  for (let i = 0; i < numero; i += 1) {
    const th = n(doc, "th", "p8h wk" + (inScarico(i) ? " ph-scar" : ""), "S" + (i + 1));
    th.colSpan = 2;
    r1.appendChild(th);
  }
  const ult = n(doc, "th", "p8h c-ult", "Ultima");
  ult.rowSpan = 2;
  r1.appendChild(ult);
  thead.appendChild(r1);

  const r2 = n(doc, "tr");
  for (let i = 0; i < numero; i += 1) {
    r2.appendChild(n(doc, "th", "p8h sub w-ser", "ser"));
    r2.appendChild(n(doc, "th", "p8h sub w-reps", "reps"));
  }
  thead.appendChild(r2);
  t.appendChild(thead);

  const corpo = n(doc, "tbody");
  elenco.forEach((e, indice) => {
    const tr = n(doc, "tr", "p8-r");
    tr.setAttribute("data-js", String(indice + 1));
    tr.appendChild(n(doc, "td", "c-js", (scheda.codice || "") + (indice + 1)));

    const dist = n(doc, "td", "c-dist");
    dist.appendChild(n(doc, "span", "dist", codiceDistretto(e.muscolo)));
    tr.appendChild(dist);

    const ese = n(doc, "td", "c-ese");
    const nome = n(doc, "div", "ese-name");
    const p8ese = n(doc, "span", "p8-ese");
    p8ese.appendChild(n(doc, "span", "p8-t", e.nome));
    nome.appendChild(p8ese);
    ese.appendChild(nome);

    const chips = n(doc, "div", "ese-chips");
    ["T", "F", "R", "P"].forEach((lettera) => chips.appendChild(pulsanteSpento(doc, "chchip ch-" + lettera, lettera, "tecnica " + lettera)));
    const piu = pulsanteSpento(doc, "chplus", "", "tecniche di intensità");
    piu.appendChild(cerchioPiu(doc));
    chips.appendChild(piu);
    const gruppo = n(doc, "span", "abgroup");
    gruppo.appendChild(pulsanteSpento(doc, "ab", "\u2715", "cancella riga"));
    gruppo.appendChild(pulsanteSpento(doc, "ab", "\u21c4", "sostituisci esercizio"));
    gruppo.appendChild(pulsanteSpento(doc, "ab", "\uff0b", "inserisci progressione sotto"));
    chips.appendChild(gruppo);
    ese.appendChild(chips);

    const chips2 = n(doc, "div", "ese-chips2");
    chips2.appendChild(n(doc, "span", "chlat", "\u21c4 DX/SX"));
    const test = n(doc, "span", "tb-test");
    test.appendChild(n(doc, "i"));
    test.appendChild(n(doc, "span", "", "Test"));
    chips2.appendChild(test);
    ese.appendChild(chips2);

    const prog = pulsanteSpento(doc, "tb-prog btn-prog", "", "applica progressione");
    prog.appendChild(n(doc, "span", "bp-ic", "\u25a4"));
    prog.appendChild(n(doc, "span", "", "Applica progressione"));
    ese.appendChild(prog);
    tr.appendChild(ese);

    const nota = n(doc, "td", "c-note");
    const pn = n(doc, "span", "p8-note", e.nota || "");
    pn.setAttribute("data-ph", "nota coach\u2026");
    nota.appendChild(pn);
    tr.appendChild(nota);

    const rec = n(doc, "td", "c-rec");
    rec.appendChild(pulsanteSpento(doc, "stp", "\u2212", "meno 15 secondi"));
    rec.appendChild(n(doc, "span", "rec", e.prescrizione.recupero || "\u2014"));
    rec.appendChild(pulsanteSpento(doc, "stp", "+", "più 15 secondi"));
    tr.appendChild(rec);

    const tut = n(doc, "td", "c-tut");
    tut.appendChild(n(doc, "span", "tut", e.prescrizione.tempo || "\u2014"));
    tr.appendChild(tut);

    perRiga[indice].forEach((s, k) => {
      const sc = inScarico(k) ? " sc-col" : "";
      const ser = n(doc, "td", "c-ser" + sc);
      ser.appendChild(n(doc, "span", "", s.serie || "\u2014"));
      tr.appendChild(ser);
      const rip = n(doc, "td", "c-reps" + sc);
      rip.appendChild(n(doc, "span", "", s.ripetizioni || "\u2014"));
      tr.appendChild(rip);
    });

    tr.appendChild(n(doc, "td", "c-ult", ultimaVolta(r, scheda, e.nome)));
    corpo.appendChild(tr);
  });
  t.appendChild(corpo);
  box.appendChild(t);
  return box;
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
    p.appendChild(tabellaEsercizi(doc, s, r));
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
  contenitore.appendChild(schede(doc, Object.assign({}, pieno, { prestazioni: r.prestazioni })));
  const due = n(doc, "div", "ck-due");
  due.appendChild(osservato(doc, pieno));
  due.appendChild(cosaManca(doc));
  contenitore.appendChild(due);
  return contenitore;
}
