/* Barbell Diva B — la schermata Programma (fase 2.5, SOLA LETTURA).
 *
 * L'aspetto è quello della pagina Programma 1 del v31, ricostruito pezzo per
 * pezzo sulla sua struttura: la testa con Annulla · Database esercizi ·
 * Libreria Coach, le tre carte in fila (Programma · Rotazione schede · stato),
 * le linguette delle schede con Stress · Scheletri · Analisi programmazione ·
 * Periodizzazione, la barra degli strumenti della scheda e la tabella con
 * serie, ripetizioni e recupero.
 *
 * Una cosa sola cambia: **i controlli sono spenti**. Le tendine sono chiuse, i
 * campi non si scrivono, i pulsanti che salvano si vedono ma non si premono.
 * Quando la scrittura si aprirà (passo 5, zona bdB_), si sbloccano gli stessi
 * campi: non si rifà il disegno.
 *
 * Le classi ck-* sono quelle delle altre schermate; le pr-* e le pg-* sono i
 * pezzi del v31 rifatti qui, con i gettoni dei due temi.
 */

import { chiavePrestazione, PROGRAMMA_NON_REGISTRATO as NON } from "./programma.js";
import { settimanePerTabella, indiceScarico } from "./schede-v2.js";
import { recuperoInColonna, tempoInColonna, etichettaSpostata, recuperoVisibile } from "./tut-rec.js";
import { nomePulito } from "./nome-pulito.js";

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

/* Un campo spento: etichetta sopra, valore dentro. È lo stesso campo del v31,
 * con readOnly addosso. */
function campo(doc, etichetta, valore, tipo, nota, scelte, extraClasse) {
  const f = n(doc, "label", "pr-f" + (extraClasse ? " " + extraClasse : ""));
  f.appendChild(n(doc, "span", "pr-lab", etichetta));
  let controllo;
  if (tipo === "select") {
    controllo = n(doc, "select", "pr-sel");
    controllo.disabled = true;
    const opzioni = Array.isArray(scelte) ? scelte : [];
    if (!valore || opzioni.indexOf(valore) === -1) {
      const vuota = n(doc, "option", "", nomePulito(valore) || NON);
      vuota.value = "";
      controllo.appendChild(vuota);
    }
    opzioni.forEach((o) => {
      const op = n(doc, "option", "", o);
      op.value = o;
      if (o === valore) { op.selected = true; op.setAttribute("selected", ""); }
      controllo.appendChild(op);
    });
  } else if (tipo === "area") {
    controllo = n(doc, "textarea", "pr-ta");
    controllo.rows = 2;
    controllo.readOnly = true;
    controllo.value = nomePulito(valore) || "";
    controllo.textContent = nomePulito(valore) || "";
    if (!valore) controllo.placeholder = NON;
  } else if (tipo === "data") {
    /* Niente `type="date"`: il browser mostra le date come vuole lui, e in
     * inglese diventano mese/giorno/anno. Qui il formato è scritto da noi. */
    controllo = n(doc, "input", "pr-in pr-data");
    controllo.type = "text";
    controllo.readOnly = true;
    controllo.setAttribute("inputmode", "numeric");
    controllo.value = nomePulito(dataItaliana(valore));
    controllo.setAttribute("value", nomePulito(dataItaliana(valore)));
    /* Data vuota = dato che non c'e': lo dice, come fanno gli altri campi. */
    controllo.placeholder = valore ? "gg/mm/aaaa" : NON;
  } else {
    controllo = n(doc, "input", "pr-in");
    controllo.type = tipo || "text";
    controllo.readOnly = true;
    controllo.value = nomePulito(valore);
    controllo.setAttribute("value", nomePulito(valore));
    if (!valore) controllo.placeholder = NON;
  }
  controllo.setAttribute("tabindex", "-1");
  controllo.setAttribute("aria-readonly", "true");
  f.appendChild(controllo);
  if (nota) f.appendChild(n(doc, "span", "pr-hint", nota));
  return f;
}

/* Un pulsante del v31, spento: stessa forma, stessa parola, nessun effetto.
 * Tutti i pulsanti di questa pagina nascono da qui, così nessuno può scrivere
 * per distrazione. */
function pulsanteSpento(doc, classe, testo, titolo) {
  const b = n(doc, "button", classe, testo);
  b.type = "button";
  b.disabled = true;
  b.setAttribute("aria-disabled", "true");
  b.title = (titolo ? titolo + " · " : "") + "spento: questa pagina non scrive";
  return b;
}

/* Un pulsante spento con la pillola «demo» accanto al testo: è il segno del
 * v31 per i comandi che mostrano come funzionerà la scrittura. */
function pulsanteConEtichetta(doc, classe, testo, etichetta, titolo) {
  const b = pulsanteSpento(doc, classe, testo, titolo);
  b.appendChild(n(doc, "i", "pr-demo", etichetta));
  return b;
}

/* ---------- la testa della pagina ---------------------------------------- */

function testata(doc) {
  const c = n(doc, "div", "pr-head");
  const top = n(doc, "div", "pg-top");

  /* L'ordine è quello del v31: il titolo con la frase di presentazione a
   * sinistra, «Annulla ctrl z» accanto al Database esercizi in alto a destra,
   * Libreria Coach che va a capo a sinistra sotto la presentazione. */
  const d = n(doc, "div", "pg-testa");
  d.appendChild(n(doc, "h2", "pg-tit", "Programmi"));
  d.appendChild(n(doc, "p", "pg-sub", "Una scheda alla volta con le linguette: rotazione, stato e libreria del programma stanno qui sopra, la tabella sotto."));
  top.appendChild(d);

  const annulla = pulsanteSpento(doc, "pg-undo spento", "\u21b6 Annulla", "annulla l'ultima modifica");
  annulla.appendChild(n(doc, "b", "", "ctrl z"));
  top.appendChild(annulla);

  top.appendChild(pulsanteSpento(doc, "pg-lib pg-lib-db", "\ud83d\uddc4 Database esercizi", "apre il Database esercizi"));
  top.appendChild(pulsanteSpento(doc, "pg-lib pg-lib-c", "\ud83d\udcda Libreria Coach", "apre la Libreria Coach"));
  c.appendChild(top);
  return c;
}

/* ---------- carta 1: il programma ---------------------------------------- */

function cartaProgramma(doc, r) {
  const c = n(doc, "section", "pr-card pr-c1");
  const h = n(doc, "header", "pr-ch");
  h.appendChild(n(doc, "h3", "", "Programma"));
  h.appendChild(n(doc, "span", "pr-meta", (r.schede ? r.schede.length : 0) + " schede · " + (r.esercizi == null ? "—" : r.esercizi) + " esercizi"));
  c.appendChild(h);

  const campi = n(doc, "div", "pr-fields");
  campi.appendChild(campo(doc, "Programma", nomePulito(r.profilo.nome), "text", null, null, "pr-f-full"));
  campi.appendChild(campo(doc, "Data inizio", r.profilo.inizio, "data"));
  campi.appendChild(campo(doc, "Fase", nomePulito(r.profilo.fase), "select", null, ["Bulk", "Cut", "Recomp", "Mantenimento"]));
  campi.appendChild(campo(doc, "Gg/sett", r.profilo.giorni == null ? "" : r.profilo.giorni + " gg/sett", "select", null, ["3 gg/sett", "4 gg/sett", "5 gg/sett", "6 gg/sett"]));
  campi.appendChild(campo(doc, "Settimane", r.profilo.durata == null ? "" : String(r.profilo.durata), "text"));
  c.appendChild(campi);

  const due = n(doc, "div", "pr-two");
  due.appendChild(campo(doc, "Descrizione programma", nomePulito(r.profilo.descrizione), "area"));
  due.appendChild(campo(doc, "Messaggio per l'atleta (all'apertura)", nomePulito(r.profilo.messaggio), "area"));
  c.appendChild(due);

  const fine = n(doc, "div", "pr-row-end");
  fine.appendChild(pulsanteSpento(doc, "pr-btn pr-pdf", "⬆ Importa da PDF", "un PDF di scheda diventa una scheda nuova"));
  fine.appendChild(n(doc, "span", "pr-hint", "Un PDF di scheda già fatta diventa una nuova scheda del programma."));
  c.appendChild(fine);
  return c;
}

/* ---------- carta 2: rotazione ------------------------------------------- */

/* Il prospetto del v31 è quello PREVISTO: riga per settimana, una casella per
 * slot. B lo riempie con la rotazione letta dal documento; se il documento non
 * la porta, le caselle restano vuote e la carta lo dichiara invece di dedurre
 * un piano dai logbook (quello è lo storico, e sta nella Pianificazione). */
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

  /* Quante schede ci sono lo dicono le schede lette, non l'elenco della
   * rotazione: se il documento dichiara A B C D e le schede presenti sono una,
   * qui si scrive una. Le lettere senza scheda si dichiarano, non si contano. */
  const presenti = (Array.isArray(r.schede) ? r.schede : [])
    .map((s) => String(s.codice || "").toUpperCase()).filter(Boolean);
  const dichiarate = ((r.rotazione && r.rotazione.codici) || []).map((c) => String(c).toUpperCase());
  const codici = presenti.length ? presenti : dichiarate;
  const mancanti = presenti.length ? dichiarate.filter((c) => presenti.indexOf(c) === -1) : [];
  const registrata = !!(r.rotazione && r.rotazione.registrata) || presenti.length > 0;
  const slot = Math.max(1, Math.min(6, r.profilo.giorni || codici.length || 4));
  const parti = [];
  parti.push(codici.length ? codici.length + " in rotazione" : "rotazione " + NON);
  parti.push(slot + "/sett");
  if (r.profilo.durata != null) parti.push(r.profilo.durata + " settimane");
  c.appendChild(n(doc, "div", "pr-meta", parti.join(" · ")));

  /* La riga del v31 «8 sett di progressione = 10 settimane reali»: il conto
   * delle settimane reali non sta nel documento, quindi si scrive il dato che
   * c'è e si dichiara quello che manca, senza calcolarlo a caso. */
  c.appendChild(n(doc, "p", "pr-warn",
    (r.profilo.durata == null ? "Settimane di progressione " + NON : r.profilo.durata + " sett di progressione") +
    " = settimane reali " + NON));

  if (mancanti.length) {
    c.appendChild(n(doc, "p", "pr-warn", "La rotazione dichiara " + dichiarate.join(", ") + ", ma le schede presenti sono " + presenti.join(", ") + ": le lettere senza scheda restano fuori, non si inventano schede."));
  } else if (!registrata) {
    c.appendChild(n(doc, "p", "pr-warn", "La rotazione prevista non è nel documento del programma: qui non si inventa. Il calendario delle sedute fatte sta nella Pianificazione."));
  }

  const chips = n(doc, "div", "pr-chips");
  codici.forEach((cod) => {
    const chip = n(doc, "span", "pr-rotchip", cod);
    chip.title = "sola lettura";
    chips.appendChild(chip);
  });
  /* La lettera E del v31 è la scheda jolly: tratteggiata, non ruota da sola. */
  if (codici.indexOf("E") === -1) {
    const jolly = n(doc, "span", "pr-rotchip jolly", "E");
    jolly.title = "scheda jolly: non ruota da sola";
    chips.appendChild(jolly);
  }
  c.appendChild(chips);

  const guida = n(doc, "p", "pr-guide");
  guida.appendChild(n(doc, "span", "", "Le schede "));
  guida.appendChild(n(doc, "b", "", "jolly"));
  guida.appendChild(n(doc, "span", "", " non ruotano da sole: le inserisci a mano nel giorno che vuoi qui sotto. Metti uno slot su "));
  guida.appendChild(n(doc, "b", "", "Riposo"));
  guida.appendChild(n(doc, "span", "", " per fare meno allenamenti quella settimana (es. 4 invece di 5)."));
  c.appendChild(guida);

  const prosp = n(doc, "div", "pr-prosp");
  prosp.appendChild(n(doc, "div", "pr-prosp-h", "Prospetto · " + (r.profilo.durata || slot) + " sett" + (codici.length ? " (ciclo base " + codici.length + ")" : "") + " — spento"));
  const corpo = n(doc, "div", "pr-prosp-b");
  const settimane = Math.max(1, Math.min(12, Number(r.profilo.durata) || codici.length || 4));
  for (let w = 0; w < settimane; w += 1) {
    const riga = n(doc, "div", "pr-prow");
    riga.appendChild(n(doc, "span", "", "Sett " + (w + 1)));
    for (let s = 0; s < slot; s += 1) {
      const valore = codici.length ? codici[(w + s) % codici.length] : "—";
      const cella = n(doc, "span", "pr-psel" + (codici.length ? "" : " vuota"), valore);
      cella.setAttribute("aria-label", "Sett " + (w + 1) + " slot " + (s + 1));
      riga.appendChild(cella);
    }
    corpo.appendChild(riga);
  }
  prosp.appendChild(corpo);
  c.appendChild(prosp);
  return c;
}

/* ---------- carta 3: stato e strumenti del programma --------------------- */

function cartaStato(doc, r) {
  const c = n(doc, "section", "pr-card pr-c3");
  const stato = n(doc, "div", "pr-stato");
  const punto = n(doc, "span", "pr-dot");
  punto.setAttribute("data-segno", r.profilo.segno || "vuoto");
  stato.appendChild(punto);
  stato.appendChild(n(doc, "b", "", nomePulito(r.profilo.stato) || NON));
  c.appendChild(stato);

  const vis = n(doc, "div", "pr-vis");
  vis.appendChild(campo(doc, "Visibile all'atleta dal", "", "data"));
  vis.appendChild(pulsanteSpento(doc, "pr-btn", "Cambia", "cambia la data di visibilità"));
  c.appendChild(vis);

  const atti = n(doc, "div", "pr-acts");
  atti.appendChild(pulsanteSpento(doc, "pr-btn pri", "Attiva", "mette il programma come attivo"));
  atti.appendChild(pulsanteSpento(doc, "pr-btn", "Cambia", "cambia il programma"));
  atti.appendChild(pulsanteSpento(doc, "pr-btn", "Confronta con…", "confronta con un altro programma"));
  atti.appendChild(pulsanteSpento(doc, "pr-btn", "Copia da Prog…", "copia da un altro programma"));
  atti.appendChild(pulsanteSpento(doc, "pr-btn", "⭐ Salva in Libreria", "salva il programma in libreria"));
  c.appendChild(atti);

  return c;
}

/* ---------- il distretto ------------------------------------------------ */

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

/* L'ultima volta che quell'esercizio è stato fatto, nella scheda giusta:
 * «26/10/2026 · 50 kg», come nel v31. Se il logbook non ha quella seduta resta
 * il trattino. */
function ultimaVolta(r, scheda, nome) {
  const mappa = (r && r.prestazioni) || {};
  const p = mappa[chiavePrestazione(scheda.codice, nome)];
  if (!p) return "\u2014";
  if (!p.data) return p.kg == null ? "\u2014" : p.kg + " kg";
  return p.kg == null ? p.data : p.data + " · " + p.kg + " kg";
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
    p8ese.appendChild(n(doc, "span", "p8-t", nomePulito(e.nome)));
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

        /* La regola di colonna (solo a schermo, i dati non si toccano): REC resta
     * in colonna se e’ un recupero vero (cifre, intervalli, min/sec), TUT se e’
     * uno schema di cifre. Una frase di coach si sposta in Descr./Setup con
     * l’etichetta davanti ("REC: ..." / "TUT: ...") e in colonna va il trattino.
     * Il recupero lungo si mostra tagliato con … e il valore completo nel Title:
     * così i bottoni −/+ non gli finiscono sopra. */
    const recTesto = String((e.prescrizione && e.prescrizione.recupero) || "").trim();
    const tutTesto = String((e.prescrizione && e.prescrizione.tempo) || "").trim();
    const recInColonna = recuperoInColonna(recTesto);
    const tutInColonna = tempoInColonna(tutTesto);
    const recMostrato = nomePulito(recTesto);
    const tutMostrato = nomePulito(tutTesto);

    const nota = n(doc, "td", "c-note");
    const pn = n(doc, "span", "p8-note", nomePulito(e.nota) || "");
    pn.setAttribute("data-ph", "nota coach…");
    nota.appendChild(pn);
    if (!recInColonna) nota.appendChild(n(doc, "div", "p8-note spostata", etichettaSpostata("REC", nomePulito(recTesto))));
    if (!tutInColonna) nota.appendChild(n(doc, "div", "p8-note spostata", etichettaSpostata("TUT", nomePulito(tutTesto))));
    tr.appendChild(nota);

    const rec = n(doc, "td", "c-rec");
    rec.appendChild(pulsanteSpento(doc, "stp", "−", "meno 15 secondi"));
    const recSpan = n(doc, "span", "rec", recInColonna && recTesto ? recuperoVisibile(recMostrato).testo : "—");
    if (recInColonna && recTesto) recSpan.title = recMostrato;
    rec.appendChild(recSpan);
    rec.appendChild(pulsanteSpento(doc, "stp", "+", "più 15 secondi"));
    tr.appendChild(rec);

    const tut = n(doc, "td", "c-tut");
    tut.appendChild(n(doc, "span", "tut", tutInColonna && tutTesto ? tutMostrato : "—"));
    tr.appendChild(tut);

    perRiga[indice].forEach((s, k) => {
      const sc = inScarico(k) ? " sc-col" : "";
      const ser = n(doc, "td", "c-ser" + sc);
      ser.appendChild(n(doc, "span", "", nomePulito(s.serie) || "—"));
      tr.appendChild(ser);
      const rip = n(doc, "td", "c-reps" + sc);
      rip.appendChild(n(doc, "span", "", nomePulito(s.ripetizioni) || "—"));
      tr.appendChild(rip);
    });

    tr.appendChild(n(doc, "td", "c-ult", ultimaVolta(r, scheda, e.nome)));
    corpo.appendChild(tr);
  });
  t.appendChild(corpo);
  box.appendChild(t);
  return box;
}

/* ---------- la barra degli strumenti della scheda ----------------------- */

/* La fila del v31, nell'ordine del v31. Tutti spenti: sono comandi che
 * scrivono (o che aprono finestre di modifica), tranne le due stampe, che
 * sarebbero letture e si accenderanno quando Alice lo dice. */
function barraStrumenti(doc) {
  const bar = n(doc, "div", "pr-bar");
  bar.appendChild(pulsanteSpento(doc, "pr-btn", "Applica sett./scarico a tutte le schede", "applica settimane e scarico a tutte le schede"));
  const cerca = n(doc, "span", "pr-cerca-box");
  const input = n(doc, "input", "pr-in");
  input.type = "search";
  input.placeholder = "cerca esercizio…";
  input.disabled = true;
  input.setAttribute("aria-label", "cerca esercizio");
  cerca.appendChild(input);
  cerca.appendChild(n(doc, "span", "pr-hint", "🔍 Cerca"));
  bar.appendChild(cerca);
  bar.appendChild(pulsanteSpento(doc, "pr-btn", "+ Riga", "aggiunge una riga alla scheda"));
  bar.appendChild(pulsanteConEtichetta(doc, "pr-btn", "+ Nuova progressione", "demo", "nuova progressione"));
  bar.appendChild(pulsanteSpento(doc, "pr-btn", "Progressioni", "apre le progressioni"));
  bar.appendChild(pulsanteSpento(doc, "pr-btn", "Periodizzazione", "apre la periodizzazione"));
  bar.appendChild(pulsanteConEtichetta(doc, "pr-btn", "Copia/Sposta esercizi", "demo", "copia o sposta esercizi"));
  bar.appendChild(pulsanteSpento(doc, "pr-btn", "Spiegazioni (4/4)", "apre le spiegazioni"));
  bar.appendChild(pulsanteSpento(doc, "pr-btn", "Stampa Compatta", "stampa la scheda così com'è"));
  bar.appendChild(pulsanteSpento(doc, "pr-btn", "Stampa da Compilare", "stampa la scheda con le caselle vuote"));
  const sug = pulsanteSpento(doc, "pr-btn on", "Suggerimenti: ON", "accende o spegne i suggerimenti");
  bar.appendChild(sug);
  bar.appendChild(pulsanteSpento(doc, "pr-btn", "Applica progressione a tutta la scheda", "applica la progressione a tutte le righe"));
  bar.appendChild(pulsanteSpento(doc, "pr-btn", "Salva come scheletro", "salva la scheda come scheletro"));
  bar.appendChild(pulsanteSpento(doc, "pr-btn danger", "Svuota scheda", "svuota la scheda"));
  bar.appendChild(pulsanteSpento(doc, "pr-btn danger", "Svuota tutto il programma", "svuota tutto il programma"));
  bar.appendChild(pulsanteSpento(doc, "pr-btn", "↺ ripristina scheda", "riporta la scheda a com'era"));
  return bar;
}

/* I filtri per distretto del v31: si vedono, non filtrano. */
function filtriDistretti(doc) {
  const f = n(doc, "div", "pr-filtri");
  ["Tutti", "Q", "G", "E", "D", "S", "T", "B", "TB", "P", "A", "Z", "Cardio"].forEach((sigla, i) => {
    f.appendChild(pulsanteSpento(doc, "pr-fchip" + (i === 0 ? " on" : ""), sigla, "filtro " + sigla));
  });
  return f;
}

/* ---------- le schede ---------------------------------------------------- */

function pannelloScheda(doc, scheda, r) {
  const p = n(doc, "div", "pr-shell");

  const testata2 = n(doc, "div", "pr-shd");
  const t = n(doc, "div", "pr-shd-t");
  t.appendChild(n(doc, "h3", "", "Scheda " + scheda.codice + (scheda.nome ? " — " + nomePulito(scheda.nome) : "")));
  t.appendChild(n(doc, "span", "pr-shd-c", scheda.numeroEsercizi + (scheda.numeroEsercizi === 1 ? " esercizio" : " esercizi") + (scheda.focus ? " · " + nomePulito(scheda.focus) : "")));
  testata2.appendChild(t);

  /* Lo scarico si legge dalle settimane scritte nella scheda: è la settimana
   * segnata «deload». Se non c'è, il campo resta vuoto e il chip del volume
   * dice che la percentuale non è registrata. */
  const quante = Math.max(8, ...(scheda.esercizi || []).map((e) => ((e.prescrizione && e.prescrizione.elencoSettimane) || []).length));
  const indiceScar = (scheda.esercizi || []).reduce((acc, e) => {
    if (acc >= 0) return acc;
    const sett = settimanePerTabella((e.prescrizione && e.prescrizione.elencoSettimane) || [], quante);
    return indiceScarico(sett);
  }, -1);

  const f = n(doc, "div", "pr-shd-f");
  f.appendChild(campo(doc, "Settimane", r.profilo.durata == null ? "" : String(r.profilo.durata), "text", null, null, "pr-f-sm"));
  f.appendChild(campo(doc, "Scarico", indiceScar >= 0 ? "S" + (indiceScar + 1) : "", "text", null, null, "pr-f-sm"));
  f.appendChild(campo(doc, "2°", "", "text", null, null, "pr-f-sm"));
  f.appendChild(n(doc, "span", "pr-chip-s4", (indiceScar >= 0 ? "S" + (indiceScar + 1) : "S—") + " vol " + NON));
  f.appendChild(campo(doc, "Test", "", "text", null, null, "pr-f-sm"));
  testata2.appendChild(f);
  p.appendChild(testata2);

  p.appendChild(barraStrumenti(doc));
  p.appendChild(filtriDistretti(doc));

  const note = n(doc, "div", "pr-note");
  note.appendChild(n(doc, "div", "pr-note-h", "📌 NOTE SCHEDA " + scheda.codice + " — visibili nell'export/stampa"));
  const ta = n(doc, "textarea", "pr-ta pr-ta-note");
  ta.rows = 3;
  ta.readOnly = true;
  ta.value = nomePulito(scheda.note) || "";
  ta.setAttribute("placeholder", "Riscaldamento, prehab, note generali per l'atleta…");
  if (scheda.note) ta.textContent = nomePulito(scheda.note);
  note.appendChild(ta);
  p.appendChild(note);
  p.appendChild(rigaTempo(doc, scheda));

  p.appendChild(tabellaEsercizi(doc, scheda, r));
  return p;
}

/* ---------- analisi del programma: serie per distretto e sovrapposizione -- */

/* Due carte che nel v31 vivono sotto la linguetta «Analisi programmazione».
 * Formula del v31, dichiarata nella carta: somma delle serie della settimana 1
 * di tutte le schede; la sovrapposizione dice in quali schede compare ogni
 * distretto. Si contano le serie scritte nel programma, non le sedute. */
function analisi(doc, r) {
  const box = n(doc, "div", "t9-an");
  const perDistretto = Object.create(null);
  const schedePerDistretto = Object.create(null);
  (r.schede || []).forEach((s) => {
    (s.esercizi || []).forEach((e) => {
      const cod = codiceDistretto(e.muscolo);
      if (cod === "\u2014") return;
      const sett = (e.prescrizione && e.prescrizione.elencoSettimane) || [];
      const prima = settimanePerTabella(sett, 1)[0] || {};
      const serie = Number(String(prima.serie || "").replace(",", "."));
      perDistretto[cod] = (perDistretto[cod] || 0) + (Number.isFinite(serie) ? serie : 0);
      if (!schedePerDistretto[cod]) schedePerDistretto[cod] = [];
      if (schedePerDistretto[cod].indexOf(s.codice) === -1) schedePerDistretto[cod].push(s.codice);
    });
  });

  const griglia = n(doc, "div", "t9-an-grid");

  const c1 = n(doc, "div", "t9-card");
  c1.appendChild(n(doc, "h4", "", "Serie per distretto"));
  c1.appendChild(n(doc, "p", "t9-sub", "Somma delle serie della settimana 1 di tutte le schede."));
  const d1 = n(doc, "div", "t9-dist");
  const voci = Object.keys(perDistretto).sort((a, b) => perDistretto[b] - perDistretto[a] || a.localeCompare(b));
  if (!voci.length) {
    d1.appendChild(n(doc, "p", "pg-vuoto", "Nessuna serie leggibile nelle schede: non si contano zeri al posto loro."));
  } else {
    const massimo = Math.max(...voci.map((k) => perDistretto[k]), 1);
    voci.forEach((k) => {
      const riga = n(doc, "div", "t9-dist-r");
      riga.appendChild(n(doc, "b", "t9-dist-c", k));
      const barra = n(doc, "i", "t9-dist-b");
      barra.style.width = Math.round((perDistretto[k] / massimo) * 100) + "%";
      riga.appendChild(barra);
      riga.appendChild(n(doc, "span", "t9-dist-n", String(perDistretto[k])));
      d1.appendChild(riga);
    });
  }
  c1.appendChild(d1);
  griglia.appendChild(c1);

  const c2 = n(doc, "div", "t9-card");
  c2.appendChild(n(doc, "h4", "", "Sovrapposizione tra schede"));
  c2.appendChild(n(doc, "p", "t9-sub", "In quali schede compare ogni distretto: due o più lettere = il gruppo è lavorato più volte nel ciclo."));
  const d2 = n(doc, "div", "t9-ov");
  const chiavi = Object.keys(schedePerDistretto).sort();
  if (!chiavi.length) {
    d2.appendChild(n(doc, "p", "pg-vuoto", "Nessun distretto riconosciuto negli esercizi letti."));
  } else {
    chiavi.forEach((k) => {
      const riga = n(doc, "div", "t9-ov-r");
      riga.appendChild(n(doc, "b", "t9-dist-c", k));
      const chips = n(doc, "span", "t9-ov-s");
      schedePerDistretto[k].forEach((codice) => chips.appendChild(n(doc, "span", "pr-rotchip", codice)));
      riga.appendChild(chips);
      d2.appendChild(riga);
    });
  }
  c2.appendChild(d2);
  griglia.appendChild(c2);

  box.appendChild(griglia);
  return box;
}

/* Il tempo del v31 è una stima, e la formula è scritta nella riga stessa:
 * «S1 × serie × TUT + recuperi». S1 sono le ripetizioni della settimana 1,
 * TUT i secondi di esecuzione per ripetizione, i recuperi stanno tra una serie
 * e l'altra. Se anche un solo numero manca, la riga dice «non registrato»:
 * una durata inventata sarebbe peggio di un buco. */
function minutiSecondi(secondi) {
  const s = Math.round(secondi);
  return Math.floor(s / 60) + "'" + String(s % 60).padStart(2, "0") + "\"";
}

function tempoScheda(scheda) {
  let attivo = 0;
  let totale = 0;
  let manca = false;
  (scheda.esercizi || []).forEach((e) => {
    const sett = (e.prescrizione && e.prescrizione.elencoSettimane) || [];
    const prima = settimanePerTabella(sett, 1)[0] || {};
    const serie = Number(String(prima.serie == null ? "" : prima.serie).replace(",", "."));
    const rip = Number((String(prima.ripetizioni == null ? "" : prima.ripetizioni).match(/\d+/) || [null])[0]);
    const tut = Number(String((e.prescrizione && e.prescrizione.tempo) || "").replace(",", "."));
    const rec = Number((String((e.prescrizione && e.prescrizione.recupero) || "").match(/\d+/) || [null])[0]);
    if (!Number.isFinite(serie) || serie <= 0 || !Number.isFinite(rip) || rip <= 0 || !Number.isFinite(tut) || tut <= 0) { manca = true; return; }
    if (!Number.isFinite(rec)) { manca = true; return; }
    attivo += serie * rip * tut;
    totale += serie * rip * tut + rec * Math.max(0, serie - 1);
  });
  if (manca || !attivo) return null;
  return { attivo, totale };
}

function rigaTempo(doc, scheda) {
  const t = tempoScheda(scheda);
  const box = n(doc, "div", "pr-tempo");
  const a = n(doc, "span", "", "\u26a1 Tempo attivo ");
  a.appendChild(n(doc, "b", "", t ? "~" + minutiSecondi(t.attivo) : NON));
  const b = n(doc, "span", "", "\u23f1 Tempo totale ");
  b.appendChild(n(doc, "b", "", t ? "~" + minutiSecondi(t.totale) : NON));
  box.appendChild(a);
  box.appendChild(b);
  box.appendChild(n(doc, "span", "pr-tempo-n", "*stima da S1 × serie × TUT + recuperi"));
  return box;
}

/* ---------- linguette e pannelli ---------------------------------------- */

function schede(doc, r) {
  const c = n(doc, "article", "ck-card pg-schede pr-shell-carta");
  const elenco = r.schede || [];

  if (!elenco.length) {
    c.appendChild(n(doc, "p", "pg-vuoto", r.schede === null
      ? "Nessuna scheda per questo programma nei dati letti" + (r.schedeMotivo ? " — " + r.schedeMotivo : "") + "."
      : "Il programma non ha schede attive: nessun pannello da mostrare."));
    if (r.archiviate && r.archiviate.length) {
      c.appendChild(n(doc, "p", "pr-hint", "Schede archiviate di questo programma: " + r.archiviate.length + " — si vedono nella tabella qui sotto."));
    }
    return c;
  }

  const linguette = n(doc, "nav", "pr-tabs");
  linguette.setAttribute("role", "tablist");
  const pannelli = n(doc, "div", "pr-pannelli");
  const bottoni = [];

  const accendi = (indice) => {
    bottoni.forEach((b, i) => {
      if (!b.classList.contains("pr-ntab-extra")) {
        const suo = i === indice;
        b.classList.toggle("on", suo);
        b.setAttribute("aria-selected", suo ? "true" : "false");
      }
    });
    /* Il v31 accende i pannelli con la classe .on (il CSS di .pr-pannello e'
     * display:none finche' non arriva .on): con solo hidden il pannello resta
     * invisibile e le linguette sembrano morte. */
    Array.prototype.forEach.call(pannelli.children, (p, i) => {
      p.hidden = i !== indice;
      p.classList.toggle("on", i === indice);
    });
  };

  elenco.forEach((s, i) => {
    const b = n(doc, "button", "pr-ntab", "Scheda " + s.codice);
    b.type = "button";
    b.setAttribute("role", "tab");
    b.appendChild(n(doc, "i", "", String(s.numeroEsercizi)));
    b.addEventListener("click", () => accendi(i));
    bottoni.push(b);
    linguette.appendChild(b);
  });

  /* Le linguette che nel v31 stanno accanto alle schede. «Analisi
   * programmazione» mostra le due carte che stanno qui sotto (sono letture);
   * Stress, Scheletri e Periodizzazione si vedono e non si aprono. */
  /* La barretta del v31: separa le schede dai pannelli di lettura. */
  linguette.appendChild(n(doc, "span", "pr-tabs-sep"));

  const extra = [];
  ["Stress", "Scheletri", "Analisi programmazione", "Periodizzazione"].forEach((titolo) => {
    const spenta = titolo !== "Analisi programmazione";
    const b = spenta
      ? pulsanteSpento(doc, "pr-ntab pr-ntab-extra", titolo, titolo)
      : n(doc, "button", "pr-ntab pr-ntab-extra", titolo);
    b.type = "button";
    b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", "false");
    if (!spenta) {
      b.addEventListener("click", () => accendi(elenco.length));
      extra.push(b);
    }
    linguette.appendChild(b);
  });

  if (r.archiviate && r.archiviate.length) {
    linguette.appendChild(n(doc, "span", "pr-tabs-sep"));
    linguette.appendChild(n(doc, "span", "pr-ntab spenta", "Archiviate " + r.archiviate.length));
  }
  c.appendChild(linguette);

  elenco.forEach((s, i) => {
    const p = n(doc, "div", "pr-pannello");
    p.hidden = i !== 0;
    p.appendChild(pannelloScheda(doc, s, r));
    pannelli.appendChild(p);
  });

  const paneAnalisi = n(doc, "div", "pr-pannello");
  paneAnalisi.hidden = true;
  paneAnalisi.appendChild(analisi(doc, r));
  pannelli.appendChild(paneAnalisi);

  c.appendChild(pannelli);
  accendi(0);

  if (r.archiviate && r.archiviate.length) {
    const arch = n(doc, "div", "pr-archiviate");
    arch.appendChild(n(doc, "div", "pr-lab", "Schede archiviate · " + r.archiviate.length + ", in sola lettura"));
    r.archiviate.forEach((s) => {
      arch.appendChild(n(doc, "span", "pr-chip-arch", "Scheda " + s.codice + " · " + s.numeroEsercizi));
    });
    c.appendChild(arch);
  }
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
  contenitore.appendChild(testata(doc));
  const tre = n(doc, "div", "pr-grid");
  tre.appendChild(cartaProgramma(doc, pieno));
  tre.appendChild(cartaRotazione(doc, pieno));
  contenitore.appendChild(tre);
  contenitore.appendChild(cartaStato(doc, pieno));
  contenitore.appendChild(schede(doc, Object.assign({}, pieno, { prestazioni: r.prestazioni })));
  return contenitore;
}
