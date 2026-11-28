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

import { settimaneEsercizi } from "./piano-scheda.js";
import { chiavePrestazione, PROGRAMMA_NON_REGISTRATO as NON } from "./programma.js";

import { elencoTecniche, nomeTecnica, notaVisibile, recTecnica, eTecnica } from "./tecniche-b.js";
import { testoNota } from "./testo-nota.js";
import { codiceDistretto, nomeDistretto } from "./distretti-b.js";
import { esportaProgramma } from "./esporta-esercizi-b.js";
import { analisiProgrammazione, settimaneDelleSchede, tonnellaggioInParola } from "./analisi-programmazione.js";
import { settimanePerTabella, indiceScarico } from "./schede-v2.js";
import {
  separaRecupero, separaTempo, sostituisciRecupero, sostituisciTempo,
  recuperoInColonna, tempoInColonna, etichettaSpostata, recuperoVisibile,
  REC_TENDINA, TUT_TENDINA, passoRecupero, motivoPassoRecupero, intervalloSecondi,
  secondiRecupero, recuperoScrittoValido, tempoScrittoValido } from "./tut-rec.js";

import { nomePulito } from "./nome-pulito.js";
import { PROG, PRG, coppieRiga, coppieScheda, baseDaSettimane, baseMancante, PREFISSO_CUSTOM, SETTIMANE_CUSTOM } from "./progressioni-b.js";
import { coppieCustom, riassuntoCustom } from "./progressioni-custom-b.js";
import { creaSelettoreEserciziB } from "./selettore-esercizi-b.js";
import { supAttivi } from "./modifiche-b.js";
import { apriConsultabile } from "./vista-programma-consultabile.js";

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

/* PASSO 4a — un campo che si può scrivere. Questa vista resta di sola
 * lettura: qui si disegna il campo e si lascia il segnaposto `data-pr-c`;
 * chi lo trasforma in un controllo vero è comune/piano-vivo.js, che sa chi
 * è l'utente e come si scrive in B. */
function campoPiano(doc, etichetta, valore, chiave, tipo, scelte, extraClasse, opzioni) {
  const o = opzioni || {};
  const f = n(doc, "label", "pr-f" + (extraClasse ? " " + extraClasse : ""));
  const lab = n(doc, "span", "pr-lab", etichetta);
  if (o.titolo) lab.setAttribute("title", o.titolo);
  f.appendChild(lab);
  let controllo;
  if (tipo === "select") {
    controllo = n(doc, "select", "pr-sel pr-vivo");
    const vuota = n(doc, "option", "", o.vuota || "\u2014");
    vuota.value = "";
    controllo.appendChild(vuota);
    (Array.isArray(scelte) ? scelte : []).forEach((voce) => {
      const testoVoce = voce && typeof voce === "object" ? String(voce.testo) : String(voce);
      const valoreVoce = voce && typeof voce === "object" ? String(voce.valore) : String(voce);
      const op = n(doc, "option", "", testoVoce);
      op.value = valoreVoce;
      if (valoreVoce === valore) { op.selected = true; op.setAttribute("selected", ""); }
      controllo.appendChild(op);
    });
    if (!valore) { vuota.selected = true; vuota.setAttribute("selected", ""); }
    /* Difesa: se il valore non esiste tra le voci, si resta su «—» e non si
     * mostra S1 come se fosse un dato scritto. */
    controllo.value = valore ? String(valore) : "";
    if (String(controllo.value) !== (valore == null ? "" : String(valore))) controllo.selectedIndex = 0;
  } else if (tipo === "area") {
    /* Passo 16 — descrizione e messaggio per l'atleta: testo libero, con gli a
     * capo, senza la tastiera numerica che li rendeva scomodi sul telefono. */
    controllo = n(doc, "textarea", "pr-in pr-vivo pr-area");
    controllo.rows = o.righe || 3;
    controllo.value = valore == null ? "" : String(valore);
    controllo.placeholder = o.segnaposto || NON;
    if (o.massimo) controllo.setAttribute("maxlength", String(o.massimo));
    if (o.monoriga) controllo.setAttribute("wrap", "off");
  } else {
    controllo = n(doc, "input", "pr-in pr-vivo");
    controllo.type = "text";
    controllo.setAttribute("inputmode", "numeric");
    controllo.value = valore == null ? "" : String(valore);
    controllo.setAttribute("value", valore == null ? "" : String(valore));
    controllo.placeholder = o.segnaposto || NON;
  }
  if (o.titolo) controllo.setAttribute("title", o.titolo);
  if (o.disattivato) { controllo.disabled = true; controllo.setAttribute("disabled", ""); }
  controllo.setAttribute("data-pr-c", chiave);
  controllo.setAttribute("aria-label", etichetta);
  if (o.suffisso) {
    const coda = n(doc, "span", "pr-suf", o.suffisso);
    const guscio = n(doc, "span", "pr-suf-box");
    guscio.appendChild(controllo);
    guscio.appendChild(coda);
    f.appendChild(guscio);
  } else {
    f.appendChild(controllo);
  }
  return f;
}


/* Un pulsante del v31, spento: stessa forma, stessa parola, nessun effetto.
 * Tutti i pulsanti di questa pagina nascono da qui, così nessuno può scrivere
 * per distrazione. */
/* Un pulsante che fa qualcosa: e' il gemello di pulsanteSpento, e si usa solo
 * dove la pagina sa scrivere davvero. */
function pulsanteVivo(doc, classe, testo, titolo, alClic) {
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

/* --- Le progressioni (passo 20, cresciute ai passi 21 e 26) ---------------
 * Il pannello e' quello del v31 (r.7305-7345): si apre sotto il pulsante, con
 * l'etichetta in maiuscoletto e una voce per riga. Il clic sulla voce la
 * applica, come sempre. In piu', da ogni voce:
 *  - «Vedi» apre la tabella delle otto settimane (sola lettura);
 *  - «Modifica» apre la tabella modificabile (passo 26): le custom vere, le
 *    formule come copia; dentro ci sono «Aggiorna» e «Salva come»;
 *  - per le custom: «Elimina» (con conferma).
 * In fondo c'e' «Crea progressione custom»: tabella nuova, da compilare.
 * Si chiude al clic fuori o dopo la scelta. */
let pannelloProgressioni = null;

/* L'editor della scheda che si sta guardando: lo lascia qui la tabella, cosi'
 * la barra dei comandi puo' applicare una progressione a tutte le righe senza
 * doverlo ricevere per parametro. */
let modificaCorrente = null;

export function chiudiProgressioni() {
  if (pannelloProgressioni && pannelloProgressioni.parentNode) {
    pannelloProgressioni.parentNode.removeChild(pannelloProgressioni);
  }
  pannelloProgressioni = null;
}

function chiudiModaleProg(doc) {
  const gia = doc.querySelector(".prog-modal");
  if (gia && gia.parentNode) gia.parentNode.removeChild(gia);
}

/* Una finestra sopra la pagina, con lo stesso taglio delle Spiegazioni:
 * intestazione, ×, Esc e clic sullo sfondo per chiudere. */
function apriModaleProg(doc, titolo, nota) {
  chiudiModaleProg(doc);
  const modale = n(doc, "div", "pr-modal prog-modal");
  const scatola = n(doc, "div", "pr-mbox prog-mbox");
  const testa = doc.createElement("header");
  const b = doc.createElement("b");
  b.textContent = titolo;
  const conta = doc.createElement("span");
  conta.textContent = nota || "";
  const x = doc.createElement("button");
  x.type = "button";
  x.className = "pr-mx";
  x.setAttribute("aria-label", "Chiudi");
  x.textContent = "\u00d7";
  testa.appendChild(b);
  testa.appendChild(conta);
  testa.appendChild(x);
  scatola.appendChild(testa);
  modale.appendChild(scatola);
  doc.body.appendChild(modale);
  const chiudi = () => {
    if (modale.parentNode) modale.parentNode.removeChild(modale);
    doc.removeEventListener("keydown", suTasto, true);
  };
  function suTasto(ev) {
    if (ev.key === "Escape" || ev.key === "Esc") { ev.stopPropagation(); chiudi(); }
  }
  x.addEventListener("click", chiudi);
  modale.addEventListener("click", (ev) => { if (ev.target === modale) chiudi(); });
  doc.addEventListener("keydown", suTasto, true);
  return { modale: modale, scatola: scatola, chiudi: chiudi };
}

/* La tabella delle otto settimane: riga delle serie, riga delle ripetizioni.
 * Una cella che non c'e' si legge «—»: non si scrive uno zero che non c'e'. */
function tabellaOtto(doc, coppie) {
  const t = n(doc, "table", "prog-table");
  const thead = doc.createElement("thead");
  const trh = doc.createElement("tr");
  trh.appendChild(n(doc, "th", "prog-rh", "settimana"));
  for (let w = 0; w < SETTIMANE_CUSTOM; w += 1) trh.appendChild(n(doc, "th", "prog-th", "S" + (w + 1)));
  thead.appendChild(trh);
  t.appendChild(thead);
  const corpo = doc.createElement("tbody");
  [["serie", 0], ["ripetizioni", 1]].forEach((voce) => {
    const etichetta = voce[0];
    const k = voce[1];
    const tr = doc.createElement("tr");
    tr.appendChild(n(doc, "th", "prog-rh", etichetta));
    for (let w = 0; w < SETTIMANE_CUSTOM; w += 1) {
      const c = coppie && coppie[w] ? String(coppie[w][k] == null ? "" : coppie[w][k]).trim() : "";
      tr.appendChild(n(doc, "td", "prog-cell" + (c ? "" : " vuota"), c || "\u2014"));
    }
    corpo.appendChild(tr);
  });
  t.appendChild(corpo);
  return t;
}

/* La frase che dice da dove viene la tabella: una formula del v31 o una custom
 * salvata in questo programma. Mai una tabella senza dire la sua origine. */
function origineProgressione(voce) {
  const v = voce || {};
  if (v.tipo === "custom") {
    return "Progressione custom" + (v.da ? " (copiata da «" + nomePulito(v.da) + "»)" : "") +
      ": la tabella e' salvata in questo programma e si puo' modificare.";
  }
  if (v.origine === "scheda") {
    return "Formula «" + nomePulito(v.nome) + "» del v31, applicata a tutta la scheda. " + nomePulito(v.formula || "");
  }
  return "Formula «" + nomePulito(v.nome) + "» del v31: " + nomePulito(v.descrizione);
}

/* «Vedi»: la tabella in sola lettura, con la frase dell'origine. Da qui si
 * duplica (una formula non si modifica in loco: si copia e si cambia la copia). */
export function apriTabellaProgressione(doc, voce, o) {
  const opz = o || {};
  const v = voce || {};
  const coppie = Array.isArray(v.coppie) ? v.coppie : null;
  const finestra = apriModaleProg(doc,
    "\u00ab" + nomePulito(v.nome) + "\u00bb",
    v.tipo === "custom" ? "custom \u00b7 8 settimane" : "formula \u00b7 8 settimane");
  const scatola = finestra.scatola;
  scatola.appendChild(n(doc, "p", "prog-origine", origineProgressione(v)));
  if (coppie) {
    scatola.appendChild(tabellaOtto(doc, coppie));
  } else {
    scatola.appendChild(n(doc, "p", "prog-nota",
      "Questa voce non ha una tabella fissa: quando la applichi, ogni riga tiene la sua settimana 1 copiata su tutte le otto. Apri «Applica progressione» dalla riga per vedere i numeri di quella riga."));
  }
  if (opz.baseMancante && (opz.baseMancante.serie || opz.baseMancante.ripetizioni)) {
    const pezzi = [];
    if (opz.baseMancante.serie) pezzi.push("serie");
    if (opz.baseMancante.ripetizioni) pezzi.push("ripetizioni");
    scatola.appendChild(n(doc, "p", "prog-nota",
      "La settimana 1 di questa riga non ha " + pezzi.join(" e ") + " scritte: la formula parte dal ripiego del v31 (3 serie \u00d7 8-10 rip.), come farebbe quando la applichi."));
  }
  if (v.tipo === "custom") {
    scatola.appendChild(n(doc, "p", "prog-nota",
      "Le celle vuote (—) sono settimane senza valore: applicandola, quella settimana resta senza serie o ripetizioni."));
  }
  const piedi = n(doc, "div", "prog-piedi");
  const puoScrivere = Boolean(opz.idProgramma) && typeof opz.salvaCustom === "function";
  /* Il tasto principale è «Modifica»: sulle custom apre quella vera, sulle
   * formule la copia (le formule del v31 non si cambiano). Il vecchio
   * «Duplica in custom» non c'è più: si duplica con «Salva come». */
  const modifica = pulsanteVivo(doc, "prog-btn pri", "Modifica", v.tipo === "custom"
    ? "cambia nome e celle di questa progressione custom"
    : "apre la tabella con questi valori in una progressione custom: la formula non si cambia", () => {
    finestra.chiudi();
    apriModificaVoce(doc, v, opz);
  });
  modifica.setAttribute("data-prog-modifica", String(v.tipo === "custom" ? (v.idCustom || "") : v.id));
  if (!puoScrivere) {
    modifica.disabled = true;
    modifica.title = "apri un programma dalla zona B per salvare una progressione custom";
  } else if (!puoModificareVoce(v)) {
    modifica.disabled = true;
    modifica.title = "questa voce copia la settimana 1 di ogni riga: apri «Applica progressione» dalla riga e modificala lì";
  }
  piedi.appendChild(modifica);
  piedi.appendChild(pulsanteVivo(doc, "prog-btn", "Chiudi", "chiudi la tabella", () => finestra.chiudi()));
  scatola.appendChild(piedi);
}

/* Il messaggio d'errore dentro una finestra: si legge, non si inghiotte. */
function erroreModale(doc, scatola, testo) {
  let p = scatola.querySelector(".prog-err");
  if (!p) {
    p = n(doc, "p", "prog-err");
    scatola.appendChild(p);
  }
  p.textContent = String(testo || "");
  p.hidden = false;
}

/* «Modifica» di una voce della libreria: sulle CUSTOM apre quella vera, sulle
 * formule ne apre una COPIA (le formule del v31 non si cambiano: passo 21).
 * Ritorna false se la voce non porta una tabella da cui partire. */
export function apriModificaVoce(doc, voce, o) {
  const v = voce || {};
  const opz = o || {};
  if (v.tipo === "custom" && v.custom && typeof v.custom === "object") {
    apriEditorProgressione(doc, { azione: "modifica", custom: v.custom }, opz);
    return true;
  }
  if (!Array.isArray(v.coppie)) return false;
  apriEditorProgressione(doc, {
    azione: "crea",
    nome: "Copia di " + nomePulito(v.nome),
    coppie: v.coppie,
    da: v.id || ""
  }, opz);
  return true;
}

/* Una voce si modifica se è una custom o se porta una tabella da copiare. */
export function puoModificareVoce(voce) {
  const v = voce || {};
  return v.tipo === "custom" || Array.isArray(v.coppie);
}

/* Il nome di una copia senza doppio «Copia di». */
function nomeCopia(base) {
  const b = String(base == null ? "" : base).trim();
  if (!b) return "Copia";
  return /^copia di /i.test(b) ? b : "Copia di " + b;
}

/* «Salva come» non deve creare due voci con lo stesso nome: se il nome è già
 * in elenco si aggiunge 2, 3… (le progressioni si scelgono per nome). */
function nomeLibero(nome, usati) {
  const b = String(nome == null ? "" : nome).trim();
  if (!b) return b;
  const presi = Object.create(null);
  (Array.isArray(usati) ? usati : []).forEach((x) => { presi[String(x).toLowerCase()] = true; });
  if (!presi[b.toLowerCase()]) return b;
  for (let i = 2; i <= 99; i += 1) {
    const candidato = b + " " + i;
    if (!presi[candidato.toLowerCase()]) return candidato;
  }
  return b;
}

/* «Modifica»: nome + otto colonne di serie e ripetizioni, e in fondo i due
 * tasti che Alice ha chiesto (27/11/2026):
 *  - «Aggiorna» salva le modifiche sulla progressione che si sta modificando
 *    (se è una copia non ancora salvata, la crea: è quella la copia);
 *  - «Salva come» ne crea una nuova con il nome scritto, senza toccare
 *    l'originale: duplicare nasce dall'editing, non da un tasto a parte.
 * Ogni salvataggio è UNA scrittura, con la sua voce di registro e l'Annulla. */
export function apriEditorProgressione(doc, dati, o) {
  const d = dati || {};
  const opz = o || {};
  const custom = d.custom && typeof d.custom === "object" ? d.custom : null;
  const soloNome = d.soloNome === true;
  /* «corrente» = la custom che questa finestra sta modificando, se esiste già
   * in B. Su una formula (o su «Crea») parte a null: è una copia da salvare. */
  let corrente = d.azione === "modifica" && custom && custom.id
    ? { id: String(custom.id), nome: nomePulito(custom.nome) }
    : null;
  /* Le custom che conosciamo: la lista passata dalla pagina è una fotografia,
   * e dopo un salvataggio è vecchia. Si tiene aggiornata con l'elenco che
   * torna dalla scrittura, così «Salva come» non crea nomi doppi. */
  let elencoNoto = Array.isArray(opz.custom) ? opz.custom.slice() : [];
  const ricorda = (esito) => {
    if (esito && Array.isArray(esito.elenco)) elencoNoto = esito.elenco.slice();
    else if (esito && esito.custom) elencoNoto = elencoNoto.concat([esito.custom]);
  };
  const daFormula = !corrente && Boolean(String(d.da || "").trim());
  const base = custom ? coppieCustom(custom) : (Array.isArray(d.coppie) ? d.coppie : []);
  const titolo = soloNome ? "Rinomina la progressione"
    : (corrente ? "Modifica \u00ab" + nomePulito(corrente.nome) + "\u00bb" : "Nuova progressione custom");
  const finestra = apriModaleProg(doc, titolo, soloNome ? "custom \u00b7 si salva nella libreria" : (corrente ? "custom \u00b7 si salva nella libreria" : "8 settimane"));
  const scatola = finestra.scatola;
  const origine = n(doc, "p", "prog-origine", "");
  const notaOrigine = () => {
    if (soloNome) return "Il nome si vede nell'elenco delle progressioni e nel registro delle modifiche.";
    if (corrente) {
      return "\u00abAggiorna\u00bb salva le modifiche su \u00ab" + nomePulito(corrente.nome) + "\u00bb; \u00abSalva come\u00bb ne fa una nuova e lascia l'originale com'\u00e8.";
    }
    if (daFormula) {
      return "La formula del v31 non si cambia: qui stai creando una progressione custom con i suoi valori. \u00abAggiorna\u00bb salva questa copia; \u00abSalva come\u00bb ne fa un'altra con un nome nuovo.";
    }
    return "Scrivi serie e ripetizioni settimana per settimana. Una cella vuota resta vuota: applicando la progressione, quella settimana non avr\u00e0 n\u00e9 serie n\u00e9 ripetizioni.";
  };
  origine.textContent = notaOrigine();
  scatola.appendChild(origine);

  const forma = n(doc, "div", "prog-forma");
  const etichettaNome = n(doc, "label", "prog-lab", "Nome");
  const nome = doc.createElement("input");
  nome.type = "text";
  nome.className = "prog-in";
  nome.maxLength = 60;
  nome.value = nomePulito(custom ? custom.nome : d.nome);
  nome.setAttribute("aria-label", "nome della progressione custom");
  etichettaNome.appendChild(nome);
  forma.appendChild(etichettaNome);
  scatola.appendChild(forma);

  const celle = [];
  if (!soloNome) {
    const t = n(doc, "table", "prog-table prog-edit");
    const thead = doc.createElement("thead");
    const trh = doc.createElement("tr");
    trh.appendChild(n(doc, "th", "prog-rh", "settimana"));
    for (let w = 0; w < SETTIMANE_CUSTOM; w += 1) trh.appendChild(n(doc, "th", "prog-th", "S" + (w + 1)));
    thead.appendChild(trh);
    t.appendChild(thead);
    const corpo = doc.createElement("tbody");
    [["serie", 0], ["ripetizioni", 1]].forEach((riga) => {
      const etichetta = riga[0];
      const k = riga[1];
      const tr = doc.createElement("tr");
      tr.appendChild(n(doc, "th", "prog-rh", etichetta));
      for (let w = 0; w < SETTIMANE_CUSTOM; w += 1) {
        const td = doc.createElement("td");
        td.className = "prog-cell";
        const campo = doc.createElement("input");
        campo.type = "text";
        campo.className = "prog-in-cella";
        campo.maxLength = 24;
        campo.value = base && base[w] ? String(base[w][k] == null ? "" : base[w][k]) : "";
        campo.setAttribute("data-settimana", String(w + 1));
        campo.setAttribute("data-campo", etichetta);
        campo.setAttribute("aria-label", etichetta + " della settimana " + (w + 1));
        td.appendChild(campo);
        tr.appendChild(td);
        celle.push(campo);
      }
      corpo.appendChild(tr);
    });
    t.appendChild(corpo);
    scatola.appendChild(t);
  }

  const coppieDalleCelle = () => {
    const coppie = [];
    for (let w = 0; w < SETTIMANE_CUSTOM; w += 1) coppie.push(["", ""]);
    celle.forEach((campo) => {
      const w = Number(campo.getAttribute("data-settimana")) - 1;
      const k = campo.getAttribute("data-campo") === "serie" ? 0 : 1;
      coppie[w][k] = String(campo.value || "").trim();
    });
    return coppie;
  };

  const piedi = n(doc, "div", "prog-piedi");
  let inCorso = false;
  const spegni = (acceso) => {
    inCorso = !acceso;
    Array.from(piedi.querySelectorAll("button")).forEach((b) => { b.disabled = !acceso; });
  };
  const fallito = (motivo) => {
    spegni(true);
    erroreModale(doc, scatola, motivo || "non ho salvato niente");
  };
  const senzaProgramma = () => {
    if (!opz.idProgramma || typeof opz.salvaCustom !== "function") {
      erroreModale(doc, scatola, "Questa pagina non ha un programma aperto: non salvo niente.");
      return true;
    }
    return false;
  };
  /* Dopo che «Aggiorna» ha creato una copia, la finestra NON si chiude: da lì
   * «Aggiorna» modifica quella copia e «Salva come» ne fa un'altra. */
  const diventaModifica = (fatta, nomeScritto) => {
    if (!fatta || !String(fatta.id || "")) return false;
    corrente = { id: String(fatta.id), nome: nomePulito(fatta.nome || nomeScritto) };
    const testa = scatola.querySelector("header b");
    if (testa) testa.textContent = "Modifica \u00ab" + nomePulito(corrente.nome) + "\u00bb";
    origine.textContent = notaOrigine();
    const segno = scatola.querySelector(".prog-err");
    if (segno) segno.hidden = true;
    const avviso = n(doc, "p", "prog-nota-salvata", "Copia salvata: da qui \u00abAggiorna\u00bb la modifica, \u00abSalva come\u00bb ne fa un'altra.");
    scatola.insertBefore(avviso, piedi);
    return true;
  };

  const aggiorna = pulsanteVivo(doc, "prog-btn pri", "Aggiorna",
    soloNome ? "salva il nome" : (corrente ? "salva le modifiche su questa progressione" : "salva questa copia come progressione custom"),
    () => {
      if (inCorso || senzaProgramma()) return;
      const nomeScritto = String(nome.value || "").trim();
      let richiesta = null;
      if (soloNome) {
        richiesta = { idProgramma: opz.idProgramma, azione: "rinomina", id: custom ? custom.id : "", nome: nomeScritto };
      } else if (corrente) {
        richiesta = { idProgramma: opz.idProgramma, azione: "settimane", id: corrente.id, coppie: coppieDalleCelle(), nome: nomeScritto };
      } else {
        richiesta = {
          idProgramma: opz.idProgramma, azione: "crea", nome: nomeScritto,
          coppie: coppieDalleCelle(), da: String(d.da || "")
        };
      }
      spegni(false);
      Promise.resolve(opz.salvaCustom(richiesta)).then((esito) => {
        if (!esito || !esito.ok) { fallito((esito && esito.motivo) || "non ho salvato niente"); return; }
        if (soloNome || corrente || !diventaModifica(esito.custom, nomeScritto)) {
          ricorda(esito);
          spegni(true);
          finestra.chiudi();
          return;
        }
        ricorda(esito);
        spegni(true);
      }, (e) => {
        fallito("non ho salvato niente: " + (e && e.message ? e.message : "errore"));
      });
    });
  piedi.appendChild(aggiorna);

  const salvaCome = pulsanteVivo(doc, "prog-btn", "Salva come",
    "salva con un nome nuovo: l'originale resta com'\u00e8", () => {
      if (inCorso || senzaProgramma()) return;
      const baseNome = corrente ? corrente.nome : nomePulito(d.nome);
      const scritto = String(nome.value || "").trim();
      const usati = elencoNoto.map((c) => nomePulito(c && c.nome));
      const nuovoNome = nomeLibero(scritto && scritto !== baseNome ? scritto : nomeCopia(baseNome), usati);
      spegni(false);
      Promise.resolve(opz.salvaCustom({
        idProgramma: opz.idProgramma, azione: "crea", nome: nuovoNome,
        coppie: coppieDalleCelle(), da: corrente ? corrente.id : String(d.da || "")
      })).then((esito) => {
        if (!esito || !esito.ok) { fallito((esito && esito.motivo) || "non ho salvato niente"); return; }
        ricorda(esito);
        spegni(true);
        finestra.chiudi();
      }, (e) => {
        fallito("non ho salvato niente: " + (e && e.message ? e.message : "errore"));
      });
    });
  if (!soloNome) piedi.appendChild(salvaCome);
  piedi.appendChild(pulsanteVivo(doc, "prog-btn", "Annulla", "non salvare niente", () => finestra.chiudi()));
  scatola.appendChild(piedi);
  if (nome.focus) { try { nome.focus(); } catch (e) { /* senza fuoco si scrive lo stesso */ } }
}

/* L'eliminazione chiede sempre conferma: le schede già scritte non cambiano,
 * sparisce solo la ricetta. */
export function apriConfermaProgressione(doc, voce, o) {
  const opz = o || {};
  const v = voce || {};
  const finestra = apriModaleProg(doc, "Eliminare \u00ab" + nomePulito(v.nome) + "\u00bb?", "progressione custom");
  const scatola = finestra.scatola;
  scatola.appendChild(n(doc, "p", "prog-origine",
    "La progressione sparisce dalla libreria, quindi da tutti i programmi. Le schede gi\u00e0 scritte non cambiano: restano con le settimane che hanno. Si pu\u00f2 annullare subito dopo."));
  const piedi = n(doc, "div", "prog-piedi");
  const elimina = pulsanteVivo(doc, "prog-btn danger", "Elimina", "elimina la progressione custom", () => {
    if (!opz.idProgramma || typeof opz.salvaCustom !== "function") {
      erroreModale(doc, scatola, "Questa pagina non ha un programma aperto: non elimino niente.");
      return;
    }
    elimina.disabled = true;
    Promise.resolve(opz.salvaCustom({ idProgramma: opz.idProgramma, azione: "elimina", id: v.idCustom || "" })).then((esito) => {
      elimina.disabled = false;
      if (esito && esito.ok) { finestra.chiudi(); return; }
      erroreModale(doc, scatola, (esito && esito.motivo) || "non ho eliminato niente");
    }, (e) => {
      elimina.disabled = false;
      erroreModale(doc, scatola, "non ho eliminato niente: " + (e && e.message ? e.message : "errore"));
    });
  });
  piedi.appendChild(elimina);
  piedi.appendChild(pulsanteVivo(doc, "prog-btn", "Annulla", "lasciala dov'\u00e8", () => finestra.chiudi()));
  scatola.appendChild(piedi);
}

function apriProgressioni(doc, bottone, voci, etichetta, alScelta, opzioni) {
  chiudiProgressioni();
  const opz = opzioni || {};
  const pannello = n(doc, "div", "prog-panel prog-ricco");
  pannello.appendChild(n(doc, "span", "tec-lab", etichetta));
  /* Senza il documento del programma aperto non si salva niente: i tasti che
   * scrivono si spengono e dicono perché (non fingono di funzionare). */
  const puoScrivere = Boolean(opz.idProgramma) && typeof opz.salvaCustom === "function";
  voci.forEach((v) => {
    const riga = n(doc, "div", "prog-row" + (v.tipo === "custom" ? " prog-row-custom" : ""));
    const b = n(doc, "button", "prog-item");
    b.type = "button";
    if (v.tipo === "custom") b.appendChild(n(doc, "span", "prog-tag", "custom"));
    b.appendChild(n(doc, "b", "", nomePulito(v.nome)));
    b.appendChild(n(doc, "em", "", nomePulito(v.descrizione)));
    b.addEventListener("click", (ev) => {
      if (ev && ev.stopPropagation) ev.stopPropagation();
      chiudiProgressioni();
      alScelta(v);
    });
    riga.appendChild(b);
    const atti = n(doc, "span", "prog-acts");
    atti.appendChild(pulsanteVivo(doc, "prog-act", "Vedi", "la tabella delle otto settimane, in sola lettura", (ev) => {
      if (ev && ev.stopPropagation) ev.stopPropagation();
      apriTabellaProgressione(doc, v, opz);
    }));
    /* «Modifica» è il tasto principale (27/11/2026): sulle custom apre quella
     * vera, sulle formule la copia. «Aggiorna» e «Salva come» stanno dentro. */
    const modificaVoce = pulsanteVivo(doc, "prog-act", "Modifica", v.tipo === "custom"
      ? "cambia nome e celle di questa progressione custom"
      : "apre la tabella con questi valori in una progressione custom: la formula non si cambia", (ev) => {
      if (ev && ev.stopPropagation) ev.stopPropagation();
      apriModificaVoce(doc, v, opz);
    });
    modificaVoce.setAttribute("data-prog-modifica", String(v.tipo === "custom" ? (v.idCustom || "") : v.id));
    if (!puoScrivere) {
      modificaVoce.disabled = true;
      modificaVoce.title = "apri un programma dalla zona B per salvare una progressione custom";
    } else if (!puoModificareVoce(v)) {
      /* Le due voci della scheda senza tabella fissa copiano la S1 di ogni
       * riga: non c'è una tabella da cui partire senza sapere la riga. */
      modificaVoce.disabled = true;
      modificaVoce.title = "questa voce copia la settimana 1 di ogni riga: apri «Applica progressione» dalla riga e modificala lì";
    }
    atti.appendChild(modificaVoce);
    if (v.tipo === "custom") {
      const eliminaVoce = pulsanteVivo(doc, "prog-act danger", "Elimina", "elimina questa progressione custom (chiede conferma)", (ev) => {
        if (ev && ev.stopPropagation) ev.stopPropagation();
        apriConfermaProgressione(doc, v, opz);
      });
      if (!puoScrivere) eliminaVoce.disabled = true;
      atti.appendChild(eliminaVoce);
    }
    riga.appendChild(atti);
    pannello.appendChild(riga);
  });
  const nuova = pulsanteVivo(doc, "prog-nuova", "\uff0b Crea progressione custom",
    "una tabella nuova di otto settimane da compilare a mano", () => {
      const coppie = [];
      const base = opz.base || null;
      for (let w = 0; w < SETTIMANE_CUSTOM; w += 1) {
        coppie.push(base && !(opz.baseMancante && (opz.baseMancante.serie || opz.baseMancante.ripetizioni))
          ? [String(base.s), String(base.r)]
          : ["", ""]);
      }
      chiudiProgressioni();
      apriEditorProgressione(doc, { azione: "crea", nome: "", coppie: coppie, da: "" }, opz);
    });
  if (!puoScrivere) {
    nuova.disabled = true;
    nuova.title = "apri un programma dalla zona B per salvare una progressione custom";
  }
  pannello.appendChild(nuova);
  doc.body.appendChild(pannello);
  const win = doc.defaultView;
  const r = bottone && bottone.getBoundingClientRect ? bottone.getBoundingClientRect() : null;
  const sx = win ? win.scrollX : 0;
  const sy = win ? win.scrollY : 0;
  const larga = win ? win.innerWidth : 800;
  pannello.style.left = Math.max(10, Math.min((r ? r.left : 0) + sx, Math.max(10, larga - 300))) + "px";
  const cimaPannello = (r ? r.bottom : 0) + sy + 7;
  const altaPannello = pannello.offsetHeight || 0;
  const fondoPannello = sy + (win ? win.innerHeight : 600) - altaPannello - 10;
  pannello.style.top = Math.max(sy + 10, Math.min(cimaPannello, fondoPannello)) + "px";
  pannelloProgressioni = pannello;
  /* Passo 26: il v31 ascolta scroll sul document in cattura e nasconde
   * tutti i pannelli. Fermiamo SOLO gli eventi nati dentro questo pannello,
   * prima che raggiungano quel gestore. Nessun preventDefault: lo scorrimento
   * nativo (rotella, barra e tocco) deve continuare a funzionare. */
  if (win && !doc.__bdScrollInternoProgressioni) {
    doc.__bdScrollInternoProgressioni = true;
    const scorrimentoInterno = (ev) => {
      if (!pannelloProgressioni || !ev || !ev.target) return;
      if (pannelloProgressioni.contains(ev.target)) ev.stopPropagation();
    };
    win.addEventListener("scroll", scorrimentoInterno, { capture: true, passive: true });
    win.addEventListener("touchmove", scorrimentoInterno, { capture: true, passive: true });
  }
  if (!doc.__bdAntiscorrimento) {
    doc.__bdAntiscorrimento = true;
    doc.addEventListener("scroll", () => {
      if (!pannelloProgressioni) return;
      const adesso = Date.now();
      const quando = Number((doc.defaultView && doc.defaultView.__bdScorrimentoApp) || 0);
      if (adesso - quando < 1500 && pannelloProgressioni.hasAttribute("hidden")) pannelloProgressioni.removeAttribute("hidden");
    }, true);
  }
  if (!doc.__progFuori) {
    doc.__progFuori = true;
    doc.addEventListener("click", (ev) => {
      if (!pannelloProgressioni) return;
      if (ev && ev.target && pannelloProgressioni.contains(ev.target)) return;
      chiudiProgressioni();
    });
  }
  /* PASSO 23 — il pannello «Applica progressione» si chiude con Esc, come le
   * altre finestre della pagina. In cattura, così non arriva ai gestori che
   * stanno sotto; e solo quando il pannello c'è davvero. */
  if (!doc.__progEsc) {
    doc.__progEsc = true;
    doc.addEventListener("keydown", (ev) => {
      if (!pannelloProgressioni) return;
      if (ev && (ev.key === "Escape" || ev.key === "Esc" || ev.keyCode === 27)) {
        ev.stopPropagation();
        chiudiProgressioni();
      }
    }, true);
  }
}

/* Le liste, nella forma che serve al pannello. Le custom stanno in coda, con
 * la loro etichetta: si distinguono dalle formule a colpo d'occhio. */
/* Quello che serve al pannello per leggere e per scrivere: il programma aperto
 * (serve a sapere se i tasti possono scrivere), l'elenco delle custom — che
 * dal passo 31 arriva dalla raccolta condivisa, non dal documento del
 * programma —, la base della riga per la tabella e la strada di scrittura
 * dell'editor. */
function opzioniProgressione(r, base, mancante) {
  const prog = r && r.progressioni ? r.progressioni : null;
  const mod = r && r.modifica ? r.modifica : null;
  return {
    idProgramma: prog ? String(prog.id || "") : "",
    custom: prog && Array.isArray(prog.custom) ? prog.custom : [],
    base: base || null,
    baseMancante: mancante || null,
    salvaCustom: mod && typeof mod.onProgressioniCustom === "function" ? mod.onProgressioniCustom : null
  };
}

function vociCustom(custom) {
  return (Array.isArray(custom) ? custom : []).map((c) => ({
    id: PREFISSO_CUSTOM + String(c.id || ""),
    idCustom: String(c.id || ""),
    nome: nomePulito(c.nome),
    descrizione: "progressione custom \u00b7 " + riassuntoCustom(c),
    tipo: "custom",
    origine: "custom",
    coppie: coppieCustom(c),
    custom: c
  }));
}
/* Le custom stanno in cima: sono quelle che Alice ha scritto, e con ventuno
 * formule sotto resterebbero fuori dallo schermo. L'etichetta «custom» le
 * distingue comunque dalle formule. */
function vociRiga(base, custom) {
  const out = PROG.map((v) => ({
    id: v[0], nome: v[1], descrizione: v[2], tipo: "formula", origine: "riga",
    coppie: coppieRiga(v[0], base)
  }));
  return vociCustom(custom).concat(out);
}
function vociScheda(custom) {
  const out = PRG.map((v) => ({
    id: v.id, nome: v.n, descrizione: v.d, tipo: "formula", origine: "scheda",
    formula: v.d, coppie: v.w ? coppieScheda(v.id, null) : null
  }));
  return vociCustom(custom).concat(out);
}

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

/* B.21 PASSO 3 — la pillola «in arrivo»: sta DENTRO il tasto, a destra del
 * testo, con il taglio della pillola «demo» del v31. Il tasto resta spento;
 * il tooltip dice cosa fara' quando ci sara', cosi' nessuno aspetta un clic. */
function pulsanteInArrivo(doc, classe, testo, cosa) {
  const b = pulsanteSpento(doc, classe, testo, "in arrivo: " + cosa);
  b.appendChild(n(doc, "i", "pr-arrivo", "in arrivo"));
  return b;
}
/* Passo 9: un pulsante che si preme. Stessa classe, stesso aspetto; cambia solo
 * che non porta "spento" e risponde al clic. */

/* Una cella che si puo' scrivere: serie e ripetizioni (passo 9), recupero e
 * TUT (passo 10). L'aspetto e'
 * identico al v31: nessun bordo, nessun colore nuovo. Si entra col clic, si
 * conferma con Invio (o uscendo dalla cella), si rinuncia con Esc. Il valore
 * che parte da qui passa da mod.onCambia, che scrive SOLO nella zona B. */
function rendiCellaModificabile(doc, span, mod, info) {
  span.setAttribute("contenteditable", "true");
  span.setAttribute("spellcheck", "false");
  span.setAttribute("data-campo", info.campo);
  if (info.settimana != null) span.setAttribute("data-settimana", String(info.settimana));
  span.setAttribute("data-prima", info.prima);
  span.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); span.blur(); }
    else if (e.key === "Escape") {
      e.preventDefault();
      span.textContent = span.getAttribute("data-prima") || "—";
      span.blur();
    }
  });
  span.addEventListener("blur", () => {
    const testo = String(span.textContent || "").trim();
    const valore = testo === "—" ? "" : testo;
    /* il valore di partenza si legge dall'attributo: pulsantini e freccetta lo
     * aggiornano, cosi' l'uscita dalla cella non salva due volte. */
    if (valore === String(span.getAttribute("data-prima") || "")) return;
    if (typeof mod.onCambia === "function") {
      mod.onCambia({
        idScheda: info.idScheda, codice: info.codice,
        idEsercizio: info.idEsercizio,
        indiceEsercizio: info.indice,
        esercizio: info.esercizio,
        settimana: info.settimana == null ? null : info.settimana,
        campo: info.campo,
        campoCella: info.campoCella,
        valore: valore
      });
    }
  });
}

/* Il valore che parte da queste celle passa sempre da qui. */
function inviaModifica(mod, info, campo, valore, prima) {
  if (!mod || typeof mod.onCambia !== "function") return;
  mod.onCambia({
    idScheda: info.idScheda, codice: info.codice,
    idEsercizio: info.idEsercizio, indiceEsercizio: info.indice,
    esercizio: info.esercizio, settimana: null,
    campo: campo, valore: valore, prima: prima
  });
}

/* La freccetta: un pulsantino ▾ dentro la cella e un menu piccolo che si apre
 * fuori dalla tabella, in posizione fissa: si chiude scegliendo, cliccando
 * fuori o con Esc. Non resta mai sopra le colonne delle settimane. */
let menuAperto = null;
function chiudiMenu() { if (menuAperto) menuAperto(); }

function rendiFreccia(doc, classe, voci, titolo, suScelta) {
  const b = n(doc, "button", "freccia " + classe, "\u25be");
  b.type = "button";
  b.title = titolo;
  b.setAttribute("aria-label", titolo);
  b.setAttribute("aria-haspopup", "menu");
  b.setAttribute("aria-expanded", "false");
  b.addEventListener("mousedown", (e) => e.preventDefault());
  b.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (b.getAttribute("aria-expanded") === "true") { chiudiMenu(); return; }
    apriMenu(doc, b, voci, suScelta);
  });
  return b;
}

function apriMenu(doc, ancora, voci, suScelta) {
  chiudiMenu();
  const win = doc.defaultView || null;
  const menu = n(doc, "div", "menu-freccia");
  menu.setAttribute("role", "menu");
  voci.forEach((testo) => {
    const voce = n(doc, "button", "menu-voce", testo);
    voce.type = "button";
    voce.setAttribute("role", "menuitem");
    voce.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      chiudi();
      if (typeof suScelta === "function") suScelta(testo);
    });
    menu.appendChild(voce);
  });
  doc.body.appendChild(menu);
  /* sotto la freccia; se non c'e' posto si apre sopra; mai fuori dallo schermo */
  const r = ancora.getBoundingClientRect ? ancora.getBoundingClientRect() : { left: 0, top: 0, bottom: 0, width: 0 };
  const m = menu.getBoundingClientRect ? menu.getBoundingClientRect() : { width: 140, height: 200 };
  const larg = Math.round(m.width) || 140;
  const alt = Math.round(m.height) || 200;
  const largSchermo = (win && win.innerWidth) || 1200;
  const altSchermo = (win && win.innerHeight) || 800;
  let top = r.bottom + 4;
  if (top + alt > altSchermo - 8) top = Math.max(8, r.top - alt - 4);
  let left = Math.round(r.left) + Math.round(r.width || 0) - larg;
  if (left < 8) left = 8;
  if (left + larg > largSchermo - 8) left = Math.max(8, largSchermo - larg - 8);
  menu.style.top = Math.round(top) + "px";
  menu.style.left = Math.round(left) + "px";
  ancora.setAttribute("aria-expanded", "true");
  function fuori(ev) {
    if (menu.contains(ev.target) || ancora.contains(ev.target)) return;
    chiudi();
  }
  function tasto(ev) {
    if (ev.key !== "Escape") return;
    ev.preventDefault();
    chiudi();
    if (ancora.focus) ancora.focus();
  }
  function chiudi() {
    if (!menu.parentNode) return;
    menu.parentNode.removeChild(menu);
    ancora.setAttribute("aria-expanded", "false");
    doc.removeEventListener("mousedown", fuori, true);
    doc.removeEventListener("keydown", tasto, true);
    if (win) {
      win.removeEventListener("scroll", chiudi, true);
      win.removeEventListener("resize", chiudi, true);
    }
    menuAperto = null;
  }
  doc.addEventListener("mousedown", fuori, true);
  doc.addEventListener("keydown", tasto, true);
  if (win) {
    win.addEventListener("scroll", chiudi, true);
    win.addEventListener("resize", chiudi, true);
  }
  menuAperto = chiudi;
  const primo = menu.querySelector(".menu-voce");
  if (primo && primo.focus) primo.focus();
}

function pulsantePasso(doc, delta, titolo, suPasso) {
  const b = n(doc, "button", "stp", delta < 0 ? "−" : "+");
  b.type = "button";
  b.title = titolo;
  b.setAttribute("aria-label", titolo);
  b.addEventListener("click", (e) => {
    e.preventDefault();
    suPasso(delta);
  });
  return b;
}

/* Il valore della cella si scrive a mano, ma nel dato va il testo intero: la
 * frase di coach resta com'e' e cambia solo il valore (regola di Alice,
 * 8/11/2026). `componi` costruisce il testo intero e dice com'era prima. */
/* Le caselle Rec e TUT si allargano mentre si scrive (passo 12, 8/11/2026):
 * si misura il testo con il carattere della cella, si allarga la colonna e la
 * tabella prende la larghezza che serve; cosi' le celle vicine non si coprono
 * mai e, se non ci sta, la tabella scorre in orizzontale. Finita la scrittura
 * tornano le misure di sempre. */
const COLONNA_CAMPO = { recupero: "w-rec", tempo: "w-tut" };
const BASE_COLONNA = { recupero: 170, tempo: 124 };
const TABELLA_MIN = 1500;

function telaMisura(doc) {
  if (!telaMisura.tela) {
    telaMisura.tela = doc.createElement("canvas");
    telaMisura.tela.width = 8;
    telaMisura.tela.height = 8;
  }
  return typeof telaMisura.tela.getContext === "function" ? telaMisura.tela.getContext("2d") : null;
}

function larghezzaTesto(doc, span, testo) {
  const t = String(testo == null ? "" : testo).replace(/\u00a0/g, " ");
  const v = doc.defaultView;
  const c = telaMisura(doc);
  if (c && v && typeof v.getComputedStyle === "function") {
    const cs = v.getComputedStyle(span);
    c.font = (cs.fontStyle || "normal") + " " + (cs.fontWeight || "700") + " " +
      (cs.fontSize || "11px") + " " + (cs.fontFamily || "monospace");
    return Math.ceil(c.measureText(t + " ").width) + 6;
  }
  return Math.max(t.length * 8, 24);
}

function conTabella(span, classe) {
  const tab = span && typeof span.closest === "function" ? span.closest("table") : null;
  const td = span && typeof span.closest === "function" ? span.closest("td") : null;
  const col = tab && typeof tab.querySelector === "function" ? tab.querySelector("col." + classe) : null;
  return { tab, td, col };
}

function misuraScrittura(doc, span, campo) {
  const classe = COLONNA_CAMPO[campo] || "w-rec";
  const base = BASE_COLONNA[campo] || 136;
  const { tab, td, col } = conTabella(span, classe);
  const serve = larghezzaTesto(doc, span, span.textContent) + 48; /* pulsantini e freccetta */
  const larga = Math.max(base, serve);
  if (col && col.style) col.style.width = larga + "px";
  if (tab && tab.style) tab.style.minWidth = TABELLA_MIN + (larga - base) + "px";
  if (td && td.classList) td.classList.toggle("in-scrittura", true);
  if (span.style) span.style.whiteSpace = "nowrap";
}

function apriScrittura(doc, span, campo) {
  if (span.classList) span.classList.toggle("scrittura", true);
  misuraScrittura(doc, span, campo);
}

function chiudiScrittura(doc, span, campo) {
  const classe = COLONNA_CAMPO[campo] || "w-rec";
  const { tab, td, col } = conTabella(span, classe);
  if (span.classList) span.classList.toggle("scrittura", false);
  if (span.style) span.style.whiteSpace = "";
  if (col && col.style) col.style.width = "";
  if (tab && tab.style) tab.style.minWidth = "";
  if (td && td.classList) td.classList.toggle("in-scrittura", false);
}

/* L'errore di una scrittura si dice dove sta la cella, e la pagina non si
 * tocca: niente ridisegno, niente ritorno in cima (Alice, 10/11/2026). */
function mostraErroreCella(doc, span, motivo) {
  const td = span && typeof span.closest === "function" ? span.closest("td") : null;
  if (!td) return;
  let segno = td.querySelector(".errore-cella");
  if (!segno) {
    segno = n(doc, "div", "errore-cella");
    segno.setAttribute("style", "margin-top:2px;font-size:11px;line-height:1.3;color:#a11;white-space:normal;text-align:left;");
    td.appendChild(segno);
  }
  segno.textContent = String(motivo || "non ho scritto niente");
}

function togliErroreCella(span) {
  const td = span && typeof span.closest === "function" ? span.closest("td") : null;
  const segno = td ? td.querySelector(".errore-cella") : null;
  if (segno) segno.remove();
}

function rendiValoreModificabile(doc, span, mod, info, componi) {
  /* Rec e TUT: in cella solo il valore, e senza valore la cella e' vuota
   * (niente trattino: si scrive da zero). */
  const senzaTrattino = info.campo === "recupero" || info.campo === "tempo";
  const vuoto = senzaTrattino ? "" : "\u2014";
  span.setAttribute("contenteditable", "true");
  span.setAttribute("spellcheck", "false");
  span.setAttribute("data-campo", info.campo);

  span.setAttribute("data-prima", info.prima);
  span.addEventListener("focus", () => {
    /* Il testo com'e' quando si apre: se esce uguale, non si scrive niente. */
    span.setAttribute("data-aperto", String(span.textContent || ""));
    togliErroreCella(span);
    apriScrittura(doc, span, info.campo);
  });
  span.addEventListener("input", () => misuraScrittura(doc, span, info.campo));
  span.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); span.blur(); }
    else if (e.key === "Escape") {
      e.preventDefault();
      span.textContent = span.getAttribute("data-prima") || vuoto;
      span.blur();
    }
  });
  span.addEventListener("blur", () => {
    const testo = String(span.textContent || "").trim();
    const valore = testo === "\u2014" ? "" : testo;
    const apertoGrezzo = span.getAttribute("data-aperto");
    const aperto = String(apertoGrezzo == null ? (span.getAttribute("data-prima") || "") : apertoGrezzo).trim();
    /* Uscire da una cella che non ha cambiato niente e' un no-op: nessuna
     * scrittura, nessun ridisegno (Alice, 10/11/2026). */
    if (valore === aperto) {
      span.textContent = valore || vuoto;
      chiudiScrittura(doc, span, info.campo);
      return;
    }
    const valido = typeof info.valido === "function" ? info.valido(valore) : true;
    if (!valido) {
      /* non e' un valore: la cella torna com'era, il dato non si tocca */
      span.textContent = span.getAttribute("data-prima") || vuoto;
      chiudiScrittura(doc, span, info.campo);
      return;
    }
    if (typeof mod.onCambia === "function") {
      const esito = componi(valore);
      span.setAttribute("data-prima", valore);
      const attesa = mod.onCambia({
        idScheda: info.idScheda, codice: info.codice,
        idEsercizio: info.idEsercizio, indiceEsercizio: info.indice,
        esercizio: info.esercizio, settimana: null,
        campo: info.campo, valore: esito.dopo, prima: esito.prima
      });
      /* Se la scrittura viene rifiutata, il motivo si legge sotto la cella:
       * la pagina resta com'e', non si ridisegna e non torna in cima. */
      if (attesa && typeof attesa.then === "function") {
        attesa.then((r) => { if (r && r.ok === false) mostraErroreCella(doc, span, r.motivo); }, () => {});
      }
    }
    span.textContent = valore || vuoto;
    span.title = valore || "";
    chiudiScrittura(doc, span, info.campo);
  });
}

/* Il testo di una cella contenteditable, con gli a capo veri: `<br>` e i
 * blocchi del browser valgono una riga nuova. Così il testo salvato è quello
 * che si legge, non una riga lunga con le parole attaccate. */
export function testoDaCella(nodo) {
  if (!nodo) return "";
  let testo = "";
  const figli = nodo.childNodes || [];
  for (let i = 0; i < figli.length; i += 1) {
    const f = figli[i];
    if (!f) continue;
    if (f.nodeType === 3) { testo += String(f.nodeValue || ""); continue; }
    if (f.nodeType !== 1) continue;
    const tag = String(f.tagName || "").toLowerCase();
    if (tag === "br") { testo += "\n"; continue; }
    const dentro = testoDaCella(f);
    testo += dentro;
    if (/^(div|p|li|tr)$/.test(tag) && dentro && i < figli.length - 1) testo += "\n";
  }
  return testo;
}

/* Scrive un pezzo di testo dove sta il cursore, senza toccare il resto. */
function inserisciTesto(doc, span, testo) {
  const v = String(testo == null ? "" : testo);
  const win = doc && doc.defaultView ? doc.defaultView : null;
  const sel = win && typeof win.getSelection === "function" ? win.getSelection() : null;
  try {
    if (sel && sel.rangeCount) {
      const r = sel.getRangeAt(0);
      r.deleteContents();
      const nodo = doc.createTextNode(v);
      r.insertNode(nodo);
      r.setStartAfter(nodo);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
      return true;
    }
  } catch (e) { /* si prova la strada semplice */ }
  span.appendChild(doc.createTextNode(v));
  return false;
}

/* La colonna «Descr. / Setup»: si scrive dentro la cella, come nel v31
 * (`contenteditable`), ma il testo va sull'ESERCIZIO della scheda. Si salva
 * uscendo dal campo o con Ctrl+Invio; Invio da solo va a capo; Esc rimette
 * com'era. Mentre si scrive la pagina non si ridisegna: la classe `scrittura`
 * è quella che `cellaInModifica()` in desktop/app-v31.js già conosce. */
function rendiCellaNota(doc, pn, mod, info) {
  const prima = String(info.valore || "");
  pn.setAttribute("contenteditable", "true");
  pn.setAttribute("spellcheck", "false");
  pn.setAttribute("role", "textbox");
  pn.setAttribute("aria-multiline", "true");
  pn.setAttribute("data-campo", "nota-esercizio");
  pn.setAttribute("data-prima", prima);
  pn.setAttribute("title", "scrivi qui: si salva uscendo dal campo (o con Ctrl+Invio)");
  const td = typeof pn.closest === "function" ? pn.closest("td") : null;

  const apri = () => {
    if (pn.classList) pn.classList.toggle("scrittura", true);
    pn.setAttribute("data-aperto", testoDaCella(pn));
    if (td && td.classList) td.classList.toggle("in-scrittura", true);
    togliErroreCella(pn);
    /* Arrivando col tasto Tab il cursore finirebbe all'inizio del testo e si
     * scriverebbe al contrario. Si mette in fondo; un clic col mouse lo porta
     * dove si è cliccato, come sempre. */
    const win = doc.defaultView;
    const sel = win && typeof win.getSelection === "function" ? win.getSelection() : null;
    if (sel && doc.activeElement === pn) {
      try {
        const r = doc.createRange();
        r.selectNodeContents(pn);
        r.collapse(false);
        sel.removeAllRanges();
        sel.addRange(r);
      } catch (e) { /* senza selezione si scrive lo stesso */ }
    }
  };
  const chiudi = () => {
    if (pn.classList) pn.classList.toggle("scrittura", false);
    if (td && td.classList) td.classList.toggle("in-scrittura", false);
  };

  pn.addEventListener("focus", apri);
  pn.addEventListener("keydown", (ev) => {
    if (!ev) return;
    if (ev.key === "Enter" || ev.key === "Invio") {
      if (ev.ctrlKey || ev.metaKey) {
        ev.preventDefault();
        if (typeof pn.blur === "function") pn.blur();
        return;
      }
      /* Invio da solo va a capo: la nota è su più righe. */
      ev.preventDefault();
      inserisciTesto(doc, pn, "\n");
      return;
    }
    if (ev.key === "Escape" || ev.key === "Esc") {
      ev.preventDefault();
      pn.textContent = prima;
      if (typeof pn.blur === "function") pn.blur();
    }
  });
  /* Il testo incollato entra semplice: niente HTML dentro la cella. */
  pn.addEventListener("paste", (ev) => {
    if (!ev || typeof ev.preventDefault !== "function") return;
    const dati = ev.clipboardData || (ev.originalEvent && ev.originalEvent.clipboardData) || null;
    const testo = dati && typeof dati.getData === "function" ? dati.getData("text/plain") : "";
    if (!testo) return;
    ev.preventDefault();
    inserisciTesto(doc, pn, String(testo).replace(/\r\n?/g, "\n"));
  });
  pn.addEventListener("blur", () => {
    const valore = testoDaCella(pn).replace(/\r\n?/g, "\n").replace(/[ \t]+$/gm, "").replace(/\n{4,}/g, "\n\n\n").trim();
    const aperto = String(pn.getAttribute("data-aperto") == null ? prima : pn.getAttribute("data-aperto")).replace(/\r\n?/g, "\n").trim();
    /* Uscire senza cambiare niente è un no-op: nessuna scrittura. */
    if (valore === aperto) {
      pn.textContent = prima;
      pn.title = prima || "scrivi qui: si salva uscendo dal campo (o con Ctrl+Invio)";
      chiudi();
      return;
    }
    pn.textContent = valore;
    pn.title = valore || "scrivi qui: si salva uscendo dal campo (o con Ctrl+Invio)";
    if (typeof mod.onCambia === "function") {
      const attesa = mod.onCambia({
        idScheda: info.idScheda, codice: info.codice,
        idEsercizio: info.idEsercizio, indiceEsercizio: info.indice,
        esercizio: info.esercizio, settimana: null,
        campo: "nota-esercizio", valore: valore, prima: prima
      });
      pn.setAttribute("data-prima", valore);
      if (attesa && typeof attesa.then === "function") {
        attesa.then((r) => { if (r && r.ok === false) mostraErroreCella(doc, pn, r.motivo); }, () => {});
      }
    }
    chiudi();
  });
}

/* Il recupero: in cella il solo valore, i due pulsantini che vanno di 30" e la
 * freccetta con i valori di sempre. La frase del coach sta in Descr./Setup e
 * nel dato non si tocca: cambia solo il valore. */
function rendiCellaRecupero(doc, td, mod, info) {
  let intero = String(info.intero || "");
  const riga = n(doc, "div", "rec-riga");
  const span = n(doc, "span", "rec", info.valore || "");
  if (info.valore) span.title = info.valore;
  const componi = (nuovoValore) => {
    const prima = intero;
    intero = sostituisciRecupero(intero, nuovoValore);
    span.setAttribute("data-prima", nuovoValore);
    return { dopo: intero, prima: prima };
  };
  const scrivi = (scelto) => {
    const nuovoValore = separaRecupero(scelto).valore || String(scelto || "").trim();
    if (!nuovoValore) return;
    const esito = componi(nuovoValore);
    if (esito.dopo === esito.prima) return;
    span.textContent = nuovoValore;
    span.title = nuovoValore;
    inviaModifica(mod, info, "recupero", esito.dopo, esito.prima);
  };
  /* PASSO 3c (Alice, 17/11/2026): quando il valore non e' un tempo, o si e'
   * arrivati in fondo (0" o 10'), il pulsantino si spegne e il tooltip dice
   * perche'. Non si preme a vuoto e non si resta a chiedersi se ha preso. */
  const aggiornaPassi = () => {
    const attuale = String(span.getAttribute("data-prima") || "");
    [[meno, -30], [piu, 30]].forEach((coppia) => {
      const b = coppia[0];
      const motivo = motivoPassoRecupero(attuale, coppia[1]);
      b.disabled = !!motivo;
      if (motivo) b.setAttribute("aria-disabled", "true");
      else b.removeAttribute("aria-disabled");
      b.title = motivo || (coppia[1] < 0 ? "meno 30 secondi" : "pi\u00f9 30 secondi");
      b.setAttribute("aria-label", b.title);
    });
  };
  const passo = (delta) => {
    const attuale = String(span.getAttribute("data-prima") || "");
    const dopo = passoRecupero(attuale, delta);
    if (!dopo) return; /* non e' un tempo o limite raggiunto: non si tocca niente */
    scrivi(dopo);
    aggiornaPassi();
  };
  const meno = pulsantePasso(doc, -30, "meno 30 secondi", passo);
  const piu = pulsantePasso(doc, 30, "pi\u00f9 30 secondi", passo);
  rendiValoreModificabile(doc, span, mod, Object.assign({}, info, { campo: "recupero", prima: info.valore || "", valido: recuperoScrittoValido }), componi);
  /* anche il valore scritto a mano accende o spegne i pulsantini */
  span.addEventListener("blur", () => aggiornaPassi());
  riga.appendChild(meno);
  riga.appendChild(span);
  riga.appendChild(piu);
  aggiornaPassi();
  riga.appendChild(rendiFreccia(doc, "freccia-rec", REC_TENDINA, "recupero: scegli un valore", scrivi));
  td.appendChild(riga);
  return span;
}

/* Il TUT: in cella il solo schema, la freccetta con i valori, nessun pulsantino. */
function rendiCellaTut(doc, td, mod, info) {
  let intero = String(info.intero || "");
  const riga = n(doc, "div", "tut-riga");
  const span = n(doc, "span", "tut", info.valore || "");
  if (info.valore) span.title = info.valore;
  const componi = (nuovoValore) => {
    const prima = intero;
    intero = sostituisciTempo(intero, nuovoValore);
    span.setAttribute("data-prima", nuovoValore);
    return { dopo: intero, prima: prima };
  };
  const scrivi = (scelto) => {
    const nuovoValore = separaTempo(scelto).valore || String(scelto || "").trim();
    if (!nuovoValore) return;
    const esito = componi(nuovoValore);
    if (esito.dopo === esito.prima) return;
    span.textContent = nuovoValore;
    span.title = nuovoValore;
    inviaModifica(mod, info, "tempo", esito.dopo, esito.prima);
  };
  rendiValoreModificabile(doc, span, mod, Object.assign({}, info, { campo: "tempo", prima: info.valore || "", valido: tempoScrittoValido }), componi);
  riga.appendChild(span);
  riga.appendChild(rendiFreccia(doc, "freccia-tut", TUT_TENDINA, "TUT: scegli un valore", scrivi));
  td.appendChild(riga);
  return span;
}

/* ---------- la testa della pagina ---------------------------------------- */

function testata(doc, modifica) {
  const c = n(doc, "div", "pr-head");
  const top = n(doc, "div", "pg-top");

  /* L'ordine è quello del v31: il titolo con la frase di presentazione a
   * sinistra, «Annulla ctrl z» accanto al Database esercizi in alto a destra,
   * Libreria Coach che va a capo a sinistra sotto la presentazione. */
  const d = n(doc, "div", "pg-testa");
  d.appendChild(n(doc, "h2", "pg-tit", "Programmi"));
  d.appendChild(n(doc, "p", "pg-sub", "Una scheda alla volta con le linguette: rotazione, stato e libreria del programma stanno qui sopra, la tabella sotto."));
  top.appendChild(d);

  const mod = modifica || null;
  const annulla = mod && mod.attivo
    ? pulsanteVivo(doc, "pg-undo", "\u21b6 Annulla", "annulla l'ultima modifica")
    : pulsanteSpento(doc, "pg-undo spento", "\u21b6 Annulla", "annulla l'ultima modifica");
  annulla.appendChild(n(doc, "b", "", "ctrl z"));
  if (mod && mod.attivo) {
    annulla.disabled = !mod.annullabile;
    annulla.addEventListener("click", () => {
      if (typeof mod.onAnnulla === "function") mod.onAnnulla();
    });
  }
  top.appendChild(annulla);

  /* Passo B.2 (12/11/2026): il pulsante Database esercizi della testa e' stato
   * TOLTO da Alice: non serviva piu', ora che anche «+ Riga» apre il selettore.
   * B.21 passo 1 (16/11/2026): tolto anche il «📚 Libreria Coach» spento di qui:
   * il tasto vero e vivo sta in pg-top (Database esercizi / Libreria Coach).
   * La porta di aggiunta resta «+ Riga» nella barra strumenti. */
  c.appendChild(top);
  return c;
}

/* Passo B: «+ Riga» apre lo stesso selettore del Database esercizi della testa.
Alla scelta la riga nasce in fondo alla scheda aperta (aggiungiEsercizio in
modifiche-b.js); senza editor acceso la scelta resta sola lettura. */
function apriSelettoreRigaB(doc, bottone) {
  const mod = modificaCorrente;
  const idScheda = idSchedaVicino(bottone);
  creaSelettoreEserciziB(doc, {
    allaScelta: (scelta) => {
      if (!mod || typeof mod.onCambia !== "function") {
        senzaEditor(doc, bottone, {
          titolo: "Questa riga non si puo' ancora aggiungere",
          riga: "La pagina non ha un editor collegato a questa scheda: non ho aggiunto niente."
        });
        return;
      }
      if (!idScheda) {
        senzaEditor(doc, bottone, {
          titolo: "Non so a quale scheda appartiene questo tasto",
          riga: "Il tasto non sta dentro la tabella di una scheda: non ho aggiunto niente."
        });
        return;
      }
      mod.onCambia({ idScheda: idScheda, campo: "aggiunta-riga", esercizio: scelta.n, muscolo: scelta.g });
    }
  }).apri();
}

/* Passo B.15 (14/11/2026): il ⇄ della riga apre lo stesso selettore del
 * Database esercizi. Alla scelta la riga NON nasce nuova: tiene id, ordine e
 * carichi e cambia solo nome e distretto (sostituisciEsercizio in
 * modifiche-b.js). Le figlie tecniche restano attaccate: puntano a padreId. */
function apriSelettoreSostituzioneB(doc, mod, scheda, riga, nomeVecchio) {
  creaSelettoreEserciziB(doc, {
    allaScelta: (scelta) => {
      const m = mod || null;
      if (!m || typeof m.onCambia !== "function") return;
      m.onCambia({
        idScheda: scheda.id,
        idEsercizio: riga.id,
        esercizio: nomeVecchio,
        campo: "sostituzione-riga",
        nuovo: scelta.n,
        muscolo: scelta.g
      });
    }
  }).apri();
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
  campi.appendChild(campoPiano(doc, "Data inizio", "", "programma-inizio", "text", null, "pr-f-sm", { titolo: "il giorno in cui comincia il programma: gg/mm/aaaa", segnaposto: "gg/mm/aaaa" }));
  campi.appendChild(campoPiano(doc, "Fase", "", "programma-fase", "select", ["Bulk", "Cut", "Recomp", "Mantenimento"], "pr-f-sm", { titolo: "la fase del blocco" }));
  /* Punto 15 — giorni, settimane e rotazione si scrivono come Data e Fase:
   * stesso segnaposto `data-pr-c`, stesso legame in comune/piano-vivo.js. */
  const scelteGiorni = [1, 2, 3, 4, 5, 6, 7].map((n) => ({ valore: String(n), testo: n + " gg/sett" }));
  campi.appendChild(campoPiano(doc, "Gg/sett", r.profilo.giorni == null ? "" : String(r.profilo.giorni), "programma-giorni", "select", scelteGiorni, "pr-f-sm", { titolo: "quanti giorni a settimana si allena" }));
  campi.appendChild(campoPiano(doc, "Settimane", r.profilo.durata == null ? "" : String(r.profilo.durata), "programma-settimane", "text", null, "pr-f-sm", { titolo: "quante settimane dura il programma", segnaposto: "es. 8" }));
  c.appendChild(campi);

  const due = n(doc, "div", "pr-two");
  /* Passo 16 — questi due erano testo da leggere: ora si scrivono e si salvano
   * nella stessa testata degli altri campi (voce di registro e Annulla). */
  due.appendChild(campoPiano(doc, "Descrizione programma",
    nomePulito(r.profilo.descrizione),
    "programma-descrizione", "area", null, "pr-f-aria pr-f-desc",
    { righe: 3, massimo: 2000, segnaposto: "a cosa serve questo programma", titolo: "si salva da solo quando esci dal campo" }));
  due.appendChild(campoPiano(doc, "Messaggio per l'atleta (all'apertura)",
    nomePulito(r.profilo.messaggio),
    "programma-messaggio", "area", null, "pr-f-aria pr-f-msg",
    { righe: 3, massimo: 1000, segnaposto: "cosa legge l'atleta aprendo il programma", titolo: "si salva da solo quando esci dal campo" }));
  c.appendChild(due);

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
  /* Punto 15 — la rotazione ora si scrive: l'interruttore dice che è accesa,
   * non «OFF» come quando la carta era solo da leggere. */
  /* Passo 16 — l'interruttore dice lo stato VERO della rotazione nel documento:
   * prima era sempre ON, quindi non si poteva spegnere. */
  const rotScritta = r.rotazione && r.rotazione.fonte === "campo del programma"
    ? (r.rotazione.codici || []).map((c) => String(c).toUpperCase()).join(" ")
    : "";
  const accesa = !!rotScritta;
  const interruttore = n(doc, "button", "pr-sw");
  interruttore.type = "button";
  interruttore.setAttribute("role", "switch");
  interruttore.setAttribute("aria-checked", accesa ? "true" : "false");
  interruttore.setAttribute("data-acceso", accesa ? "1" : "0");
  if (!accesa) interruttore.className = "pr-sw off";
  interruttore.setAttribute("data-pr-interruttore", "rotazione");
  interruttore.setAttribute("aria-label", "accendi o spegni la rotazione delle schede");
  interruttore.setAttribute("title", accesa
    ? "la rotazione \u00e8 accesa: premi per spegnerla"
    : "la rotazione \u00e8 spenta: premi per accenderla");
  interruttore.appendChild(n(doc, "b", "", accesa ? "ON" : "OFF"));
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
  const slot = Math.max(1, Math.min(7, r.profilo.giorni || codici.length || 4));
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

  /* Il campo scrivibile: mostra solo quello che sta DAVVERO nel documento.
   * Se la rotazione non c'è, il campo resta vuoto anche quando le schede
   * lette bastano a disegnare l'anteprima: qui non si inventa un ordine. */
  const scritta = rotScritta;
  c.appendChild(campoPiano(doc, "Rotazione schede", scritta, "programma-rotazione", "text", null, "pr-f-sm pr-f-rot", { titolo: "le lettere delle schede, nell'ordine in cui ruotano (es. A B C D)", segnaposto: "es. A B C D" }));

  const chips = n(doc, "div", "pr-chips");
  codici.forEach((cod) => {
    const chip = n(doc, "span", "pr-rotchip", cod);
    chip.setAttribute("data-pr-rotchip", cod);
    chip.title = "anteprima di quello che è scritto nel campo";
    chips.appendChild(chip);
  });
  /* La lettera E del v31 è la scheda jolly: tratteggiata, non ruota da sola. */
  if (codici.indexOf("E") === -1) {
    const jolly = n(doc, "span", "pr-rotchip jolly", "E");
    jolly.title = "scheda jolly: non ruota da sola";
    chips.appendChild(jolly);
  }
  /* Il «+» non è un tasto morto: aggiunge al campo la lettera successiva
   * (A, poi B, poi C…) e la salva con la stessa strada degli altri campi. */
  const piu = n(doc, "button", "pr-rotchip pr-rot-piu", "+");
  piu.type = "button";
  piu.setAttribute("data-pr-rot-piu", "1");
  piu.setAttribute("aria-label", "aggiungi la lettera successiva alla rotazione");
  piu.title = "aggiunge al campo la lettera successiva";
  chips.appendChild(piu);
  c.appendChild(chips);

  const guida = n(doc, "p", "pr-guide");
  guida.appendChild(n(doc, "span", "", "Le schede "));
  guida.appendChild(n(doc, "b", "", "jolly"));
  guida.appendChild(n(doc, "span", "", " non ruotano da sole: le inserisci a mano nel giorno che vuoi qui sotto. Metti uno slot su "));
  guida.appendChild(n(doc, "b", "", "Riposo"));
  guida.appendChild(n(doc, "span", "", " per fare meno allenamenti quella settimana (es. 4 invece di 5)."));
  c.appendChild(guida);

  const prosp = n(doc, "div", "pr-prosp");
  prosp.appendChild(n(doc, "div", "pr-prosp-h", "Prospetto · " + (r.profilo.durata || slot) + " sett" + (codici.length ? " (ciclo base " + codici.length + ")" : "") + " — previsto"));
  const corpo = n(doc, "div", "pr-prosp-b");
  const settimane = Math.max(1, Math.min(12, Number(r.profilo.durata) || codici.length || 4));
  for (let w = 0; w < settimane; w += 1) {
    const riga = n(doc, "div", "pr-prow");
    /* Le colonne seguono gli slot veri (da 1 a 7): il CSS ne dichiara 4, ma
     * con 5-7 giorni la riga deve restare su una linea sola. */
    riga.style.gridTemplateColumns = "52px repeat(" + slot + ",minmax(0,1fr))";
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
  /* B.21 PASSO 2c \u2014 la riga di stato dice lo stato, e solo lei: \u00abAttivo\u00bb o
   * \u00abIn bozza\u00bb, senza promettere cosa fara' il telefono. Il tasto accanto dice
   * l'azione (vedi tastoAttiva), mai lo stato. */
  const stato = n(doc, "div", "pr-stato");
  const punto = n(doc, "span", "pr-dot");
  punto.setAttribute("data-segno", r.profilo.segno || "vuoto");
  stato.appendChild(punto);
  stato.appendChild(n(doc, "b", "", etichettaStato(r.profilo)));
  c.appendChild(stato);
  if (etichettaStato(r.profilo) === "In bozza") {
    c.appendChild(n(doc, "p", "pr-guide", "Il telefono non la vede: si attiva da qui, con il tasto \u00abAttiva\u00bb."));
  }


  const atti = n(doc, "div", "pr-acts");
  atti.appendChild(tastoAttiva(doc, r));
  atti.appendChild(tastoCambia(doc, r));
  /* Passo 42 — «Confronta con…» è acceso: apre l'elenco dei programmi di B in
   * modo confronto; scelto uno, si affacciano le grandezze vere (volume,
   * esercizi, schede, densità) e si dichiara quello che non c'è. */
  atti.appendChild(tastoConfronta(doc, r));
  atti.appendChild(pulsanteInArrivo(doc, "pr-btn", "Copia da un altro programma", "copia gli esercizi di un altro programma dentro questo"));
  atti.appendChild(pulsanteInArrivo(doc, "pr-btn", "⭐ Salva in Libreria", "salva questo programma nella libreria, per riusarlo come base"));
  c.appendChild(atti);

  return c;
}

/* Passo 41 — «Cambia»: l'elenco dei programmi che stanno in B, con «Apri».
 * Il programma in uso resta segnato e non si riapre; gli altri si aprono dal
 * loro tasto, con la stessa conferma di «Attiva». Se la zona B ne ha uno solo,
 * il pannello lo dice invece di far finta di avere una scelta. */
function tastoCambia(doc, r) {
  const mod = modificaCorrente;
  const elenco = Array.isArray(r && r.altriProgrammi) ? r.altriProgrammi : [];
  if (!mod || typeof mod.onAttiva !== "function") {
    return pulsanteSpento(doc, "pr-btn", "Cambia", "apre l'elenco dei programmi presenti in B: si accende quando la pagina sa leggere la zona B");
  }
  const b = pulsanteVivo(doc, "pr-btn", "Cambia", "apre l'elenco dei programmi presenti in B e ti fa scegliere quale guardare", () => {
    apriElencoProgrammi(doc, b, elenco, r);
  });
  return b;
}

/* Passo 42 — «Confronta con…»: stesso elenco, in modo confronto. */
function tastoConfronta(doc, r) {
  const elenco = Array.isArray(r && r.altriProgrammi) ? r.altriProgrammi : [];
  /* Se la zona B non ha nessun altro programma, il pannello lo dice: il tasto
   * non si spegne, perché la pagina sa leggere (e il perché starebbe in un
   * tooltip invece che davanti agli occhi). */
  const b = pulsanteVivo(doc, "pr-btn", "Confronta con un altro programma", "sceglie un programma e lo affianca a quello in uso: volume, esercizi, schede e densità, con la variazione", () => {
    apriElencoProgrammi(doc, b, elenco, r);
  });
  b.setAttribute("data-confronta", "1");
  return b;
}

/* Passo 42 — il pannello di «Cambia» sta SOPRA la pagina, ancorato al tasto.
 *
 * Alice (26/11/2026): «non mi piace come diventa la pagina quando clicco
 * cambia: si allunga tutto». Prima il riquadro entrava nella carta e spingeva
 * in basso schede e tabella; adesso è una finestrella in posizione fissa,
 * agganciata al tasto, con z-index alto: non sposta niente.
 *
 * La posizione si calcola qui, in una funzione pura, così la prova la può
 * leggere: sotto il tasto se c'è spazio, altrimenti SOPRA il tasto (la parte
 * che serviva). La larghezza resta dentro la finestra: a 1280 px le voci si
 * leggono intere.
 */
export function posizionePannello(ancora, misura, vista) {
  const a = ancora || {};
  const m = misura || {};
  const v = vista || {};
  const larghezzaVista = Number(v.larghezza) > 0 ? Number(v.larghezza) : 1280;
  const altezzaVista = Number(v.altezza) > 0 ? Number(v.altezza) : 800;
  const margine = 8;
  const distacco = 6;
  const larghezza = Math.max(240, Math.min(Number(m.larghezza) || 360, larghezzaVista - margine * 2));
  const altezza = Math.max(0, Number(m.altezza) || 0);
  let left = Number(a.left) || 0;
  if (left + larghezza > larghezzaVista - margine) left = Math.max(margine, larghezzaVista - margine - larghezza);
  if (left < margine) left = margine;
  const sotto = altezzaVista - (Number(a.bottom) || 0) - margine;
  const sopra = (Number(a.top) || 0) - margine;
  /* Verso l'alto quando sotto non ci sta e sopra c'è più spazio. */
  const versoAlto = altezza > sotto && sopra > sotto;
  const top = versoAlto
    ? Math.max(margine, (Number(a.top) || 0) - distacco - Math.min(altezza, sopra))
    : Math.min(altezzaVista - margine, (Number(a.bottom) || 0) + distacco);
  return {
    left: Math.round(left),
    top: Math.round(top),
    larghezza: Math.round(larghezza),
    altezza: Math.round(Math.min(altezza, versoAlto ? sopra : sotto)),
    versoAlto: versoAlto,
    margine: margine
  };
}

let pannelloElenco = null;

/* Chiude il pannello e stacca i suoi ascoltatori: fuori restano la pagina e i
 * suoi tasti, com'erano. */
function chiudiPannelloElenco(doc) {
  const aperto = pannelloElenco;
  pannelloElenco = null;
  if (!aperto) return;
  if (aperto.togliAscoltatori) aperto.togliAscoltatori();
  if (aperto.scatola && aperto.scatola.parentNode) aperto.scatola.remove();
  if (aperto.bottone && aperto.bottone.setAttribute) aperto.bottone.setAttribute("aria-expanded", "false");
  if (doc) {
    const altri = doc.querySelectorAll("body > .pr-elenco-programmi");
    for (let i = 0; i < altri.length; i += 1) altri[i].remove();
  }
}

function apriElencoProgrammi(doc, bottone, elenco, r) {
  if (pannelloElenco && pannelloElenco.bottone === bottone) { chiudiPannelloElenco(doc); return; }
  chiudiPannelloElenco(doc);
  if (!doc || !doc.body) return;

  const scatola = n(doc, "div", "pr-elenco-programmi");
  scatola.setAttribute("role", "dialog");
  scatola.setAttribute("aria-label", "programmi in B");
  const titolo = n(doc, "p", "pr-elenco-t", "Programmi in B");
  scatola.appendChild(titolo);
  if (!elenco.length) {
    scatola.appendChild(n(doc, "p", "pr-guide", "La zona B non ha nessun programma da aprire."));
  } else if (elenco.length === 1) {
    scatola.appendChild(n(doc, "p", "pr-guide", "C'è un programma solo: «" + (nomePulito(elenco[0].nome) || "(senza nome)") + "». Quando ne avrai altri compariranno qui."));
  }

  /* Chi può essere guardato: chi ha le schede lette. Chi non le ha non si apre
   * a metà: il tasto lo dice. */
  const guardabile = (p) => Boolean(p && p.programma && typeof p.programma === "object");
  const inUso = elenco.filter((p) => p && p.attivo)[0] || null;

  const apriGuarda = (p, tasto, confrontaSubito) => {
    const attivo = inUso && guardabile(inUso) ? inUso : null;
    apriConsultabile(doc, {
      programma: p.programma,
      gruppo: p.gruppo || null,
      attivo: attivo ? { programma: attivo.programma, gruppo: attivo.gruppo || null } : null,
      bottone: tasto,
      nomeInUso: r && r.profilo ? nomePulito(r.profilo.nome) : "",
      confrontaSubito: confrontaSubito === true,
      onSalvaCome: r && typeof r.onSalvaCome === "function" ? r.onSalvaCome : null
    });
    chiudiPannelloElenco(doc);
  };

  elenco.forEach((p) => {
    const riga = n(doc, "div", "pr-elenco-riga");
    const testi = n(doc, "div", "pr-elenco-testi");
    testi.appendChild(n(doc, "b", "", nomePulito(p.nome) || "(senza nome)"));
    const stato = p.attivo ? "in uso" : (p.archiviato ? "archiviato" : (p.bozza ? "in bozza" : "disponibile"));
    testi.appendChild(n(doc, "span", "pr-elenco-stato", stato));
    if (p.dettaglio) testi.appendChild(n(doc, "span", "pr-elenco-dettaglio", p.dettaglio));
    /* Le schede di QUESTO programma: una pastiglia per lettera. Passo 25 —
     * il cestino per scheda è stato tolto da qui: si elimina un programma solo,
     * dall'Archivio. */
    const schedeDel = p.gruppo && Array.isArray(p.gruppo.schede) ? p.gruppo.schede : [];
    if (schedeDel.length) {
      const fila = n(doc, "div", "pr-elenco-schede");
      fila.appendChild(n(doc, "span", "pr-elenco-schede-t", "schede"));
      schedeDel.forEach((sc) => {
        const lettera = String((sc && sc.codice) || "").trim() || "—";
        const pastiglia = n(doc, "span", "pr-rotchip", lettera);
        pastiglia.setAttribute("data-elenco-scheda", lettera);
        fila.appendChild(pastiglia);
      });
      testi.appendChild(fila);
    }
    riga.appendChild(testi);
    const tasti = n(doc, "span", "pr-elenco-tasti");
    if (p.attivo) {
      tasti.appendChild(n(doc, "span", "pr-elenco-ora", "lo stai guardando"));
    } else {
      /* «Guarda»: la vista di sola lettura (passo 42). C'è su ogni programma
       * che non sia quello in uso, archiviato compreso. */
      if (guardabile(p)) {
        const guarda = pulsanteVivo(doc, "pr-btn", "Guarda", "apre questo programma in sola lettura: non lo attiva e non cambia niente", () => apriGuarda(p, guarda));
        guarda.setAttribute("data-guarda", String(p.id || ""));
        tasti.appendChild(guarda);
      } else {
        const spento = pulsanteSpento(doc, "pr-btn", "Guarda", "spento: la pagina non ha letto le schede di questo programma");
        spento.setAttribute("data-guarda", String(p.id || ""));
        tasti.appendChild(spento);
      }
      /* «Confronta con quello in uso»: dalla stessa finestra, senza passare
       * dalla vista. Se il programma in uso non si legge, il tasto dice perché. */
      if (inUso && guardabile(p) && guardabile(inUso)) {
        const confronta = pulsanteVivo(doc, "pr-btn", "Confronta", "affianca questo programma a quello in uso: volume, esercizi, schede e densità", () => apriGuarda(p, confronta, true));
        confronta.setAttribute("data-confronta-programma", String(p.id || ""));
        tasti.appendChild(confronta);
      } else {
        const spento = pulsanteSpento(doc, "pr-btn", "Confronta", "spento: mancano le schede di uno dei due programmi, non c'è niente da affiancare");
        spento.setAttribute("data-confronta-programma", String(p.id || ""));
        tasti.appendChild(spento);
      }
      if (p.archiviato) {
        tasti.appendChild(pulsanteSpento(doc, "pr-btn", "Apri", "questo programma è archiviato: prima lo riapri dall'Archivio"));
      } else {
        const apri = pulsanteVivo(doc, "pr-btn pri", "Apri", "rende attivo questo programma in B e lo mostra qui", () => {
          apriConfermaAttivaDalCambia(doc, apri, p);
        });
        tasti.appendChild(apri);
      }
    }
    riga.appendChild(tasti);
    scatola.appendChild(riga);
  });

  const chiudi = n(doc, "button", "pr-btn", "Chiudi");
  chiudi.type = "button";
  scatola.appendChild(chiudi);

  doc.body.appendChild(scatola);
  if (bottone && bottone.setAttribute) bottone.setAttribute("aria-expanded", "true");

  /* La posizione si ricalcola a ogni scorrimento: il pannello resta appiccicato
   * al tasto. Se il tasto non è più nella pagina (un ridisegno l'ha
   * sostituito), il pannello si chiude invece di restare a galleggiare. */
  const posiziona = () => {
    if (!bottone || !bottone.getBoundingClientRect) { chiudiPannelloElenco(doc); return; }
    if (bottone.isConnected === false) { chiudiPannelloElenco(doc); return; }
    const vista = { larghezza: (doc.defaultView && doc.defaultView.innerWidth) || 1280, altezza: (doc.defaultView && doc.defaultView.innerHeight) || 800 };
    const misura = { larghezza: 360, altezza: scatola.offsetHeight || scatola.scrollHeight || 0 };
    const pos = posizionePannello(bottone.getBoundingClientRect(), misura, vista);
    scatola.style.left = pos.left + "px";
    scatola.style.top = pos.top + "px";
    scatola.style.width = pos.larghezza + "px";
    scatola.setAttribute("data-verso-alto", pos.versoAlto ? "1" : "0");
    if (pos.altezza > 0) scatola.style.maxHeight = pos.altezza + "px";
  };
  const fuori = (ev) => {
    const dentro = scatola.contains ? scatola.contains(ev.target) : false;
    const sulTasto = bottone && (ev.target === bottone || (bottone.contains && bottone.contains(ev.target)));
    if (!dentro && !sulTasto) chiudiPannelloElenco(doc);
  };
  const suTasto = (ev) => {
    if (ev && (ev.key === "Escape" || ev.key === "Esc")) {
      if (ev.stopPropagation) ev.stopPropagation();
      chiudiPannelloElenco(doc);
    }
  };
  const suVista = () => posiziona();
  chiudi.addEventListener("click", () => { chiudiPannelloElenco(doc); });
  doc.addEventListener("click", fuori, true);
  doc.addEventListener("keydown", suTasto, true);
  const vistaFinestra = doc.defaultView;
  if (vistaFinestra && vistaFinestra.addEventListener) {
    vistaFinestra.addEventListener("scroll", suVista, true);
    vistaFinestra.addEventListener("resize", suVista);
  }
  const togliAscoltatori = () => {
    doc.removeEventListener("click", fuori, true);
    doc.removeEventListener("keydown", suTasto, true);
    if (vistaFinestra && vistaFinestra.removeEventListener) {
      vistaFinestra.removeEventListener("scroll", suVista, true);
      vistaFinestra.removeEventListener("resize", suVista);
    }
  };
  pannelloElenco = { scatola: scatola, bottone: bottone, togliAscoltatori: togliAscoltatori };
  posiziona();
  if (chiudi.focus) { try { chiudi.focus(); } catch (e) { /* senza fuoco si legge lo stesso */ } }
}

/* L'apertura da «Cambia»: stessa strada e stessa conferma di «Attiva», che
 * scrive solo in bdB_atleti e lascia la voce di registro con l'Annulla. */
function apriConfermaAttivaDalCambia(doc, bottone, programma) {
  const mod = modificaCorrente;
  const nome = nomePulito(programma && programma.nome) || "questo programma";
  chiediConferma(doc, {
    bottone: bottone,
    titolo: "Aprire un altro programma",
    righe: [
      "Aprire «" + nome + "» al posto di quello che stai guardando?",
      "Quello di adesso resta salvato com'è: si riapre da qui quando vuoi."
    ],
    avviso: "Scrive solo in bdB_atleti. In A non cambia niente.",
    conferma: "Sì, apri «" + nome + "»",
    segno: "attiva",
    onConferma: () => {
      const prima = bottone.textContent;
      bottone.disabled = true;
      bottone.textContent = "Apro…";
      const esito = mod.onAttiva(String(programma.id || ""));
      /* Il pannello si chiude quando la scrittura è finita: la pagina rilegge e
       * il tasto che l'ha aperto non esiste più, quindi restare aperti
       * vorrebbe dire galleggiare su dati vecchi. */
      const fine = () => {
        bottone.disabled = false;
        bottone.textContent = prima;
        chiudiPannelloElenco(doc);
      };
      if (esito && typeof esito.then === "function") esito.then(fine, fine);
      else fine();
    }
  });
}

/* B.21 PASSO 2a/2c — il tasto dice l'AZIONE, mai lo stato: «Attiva» se il
 * programma non e' attivo, «Metti in bozza» se lo e'. Lo stato lo dice la riga
 * col pallino, una volta sola (vedi cartaStato). Scrive SOLO in B (bdB_atleti).
 * Senza editor collegato (pagine non vive) resta il tasto spento di prima. */
function tastoAttiva(doc, r) {
  const mod = modificaCorrente;
  const gia = Boolean(r && r.profilo && r.profilo.segno === "vivo");
  if (gia) {
    if (!mod || typeof mod.onBozza !== "function") {
      return pulsanteSpento(doc, "pr-btn pri", "Metti in bozza", "questo e' il programma attivo: metterlo in bozza si fa quando la pagina sa scrivere");
    }
    const b = pulsanteVivo(doc, "pr-btn pri", "Metti in bozza", "mette questo programma in bozza in B", () => apriConfermaBozza(doc, b, r));
    return b;
  }
  if (!mod || typeof mod.onAttiva !== "function") {
    return pulsanteSpento(doc, "pr-btn pri", "Attiva", "mette il programma come attivo");
  }
  const t = pulsanteVivo(doc, "pr-btn pri", "Attiva", "rende attivo questo programma in B", () => apriConfermaAttiva(doc, t, r));
  return t;
}

/* Il nome che la riga di stato usa: «Attivo» e «In bozza» sono i due stati che
 * contano qui; gli altri restano le parole di sempre (disponibile, archiviato).
 */
function etichettaStato(profilo) {
  const p = profilo || {};
  if (p.segno === "vivo") return "Attivo";
  if (p.segno === "bozza" && p.bozza === true) return "In bozza";
  if (p.segno === "archivio") return "Archiviato";
  return nomePulito(p.stato) || NON;
}

/* La riga che Alice ha chiesto, parola per parola: si dice che si scrive in B
 * e che il telefono di oggi legge A. Niente promesse sul telefono di oggi. */
function apriConfermaAttiva(doc, bottone, r) {
  const mod = modificaCorrente;
  if (!mod || typeof mod.onAttiva !== "function") { senzaEditor(doc, bottone, { titolo: "Questo programma non si puo' ancora attivare", riga: "La pagina non ha un editor collegato a questo programma: non ho attivato niente." }); return; }
  const profilo = (r && r.profilo) || {};
  const nome = nomePulito(profilo.nome) || "questo programma";
  const righe = [
    "Rendi attivo «" + nome + "» in B?",
    "Il telefono di oggi legge ancora i programmi di A: lo vedrà dal giorno del cambio."
  ];
  if (profilo.segno === "bozza") righe.push("Era in bozza: da adesso, in B, e' il programma attivo.");
  chiediConferma(doc, {
    bottone: bottone,
    titolo: "Rendere attivo un programma",
    righe: righe,
    avviso: "Scrive solo in bdB_atleti. In A non cambia niente.",
    conferma: "Sì, rendi attivo",
    segno: "attiva",
    onConferma: () => {
      const esito = mod.onAttiva(String(profilo.id || ""));
      if (esito && typeof esito.then === "function") esito.then((e) => {
        if (e && e.ok === false && e.nonInB === true) apriNonInB(doc, bottone, profilo, e);
      });
    }
  });
}

/* B.21 PASSO 2c \u2014 \u00abMetti in bozza\u00bb: la conferma dice che il telefono di oggi
 * non cambia (legge A), e che la bozza resta visibile qui. */
function apriConfermaBozza(doc, bottone, r) {
  const mod = modificaCorrente;
  if (!mod || typeof mod.onBozza !== "function") { senzaEditor(doc, bottone, { titolo: "Questo programma non si puo' ancora mettere in bozza", riga: "La pagina non ha un editor collegato a questo programma: non ho messo in bozza niente." }); return; }
  const profilo = (r && r.profilo) || {};
  const nome = nomePulito(profilo.nome) || "questo programma";
  chiediConferma(doc, {
    bottone: bottone,
    titolo: "Mettere in bozza un programma",
    righe: [
      "Metto \u00ab" + nome + "\u00bb in bozza in B?",
      "Sul telefono di oggi non cambia niente: legge ancora A.",
      "In B resta visibile qui, e il telefono non lo vedr\u00e0 pi\u00f9 finch\u00e9 non lo riattivi."
    ],
    avviso: "Scrive solo in bdB_atleti. In A non cambia niente.",
    conferma: "S\u00ec, metti in bozza",
    segno: "bozza",
    onConferma: () => {
      const esito = mod.onBozza(String(profilo.id || ""));
      if (esito && typeof esito.then === "function") esito.then((e) => {
        if (e && e.ok === false && e.nonInB === true) apriNonInB(doc, bottone, profilo, e);
      });
    }
  });
}

/* ---------- il distretto ------------------------------------------------ */

/* I codici del distretto sono quelli del Database esercizi del v31:
 * D Dorsali · CS Centro schiena · S Spalle · G Glutei · E Femorali ·
 * B Bicipiti · T Tricipiti · P Petto · Q Quadricipiti e adduttori · Z Polpacci ·
 * A Addominali · CA Cardio. Il documento di B porta il nome del gruppo, non la
 * lettera: si traduce con questa tabella, e quello che non si riconosce resta
 * un trattino invece di una lettera inventata. */
/* La mappa dei distretti vive in comune/distretti-b.js (PASSO 4c): la usa
 * anche il conto dell Analisi, e due copie vorrebbero dire due conti diversi.
 * Qui si riesporta, cosi chi la importava da questa vista non cambia. */
export { codiceDistretto };

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
 * I controlli che scrivono (×, ⇄, +, le tecniche T F R, il +, i due −/+ del
 * recupero, «Applica progressione») stanno al loro posto ma spenti: questa
 * pagina non salva. Sotto la tabella non c'è nessuna frase: nel v31 non c'è.
 * Dove un dato manca si scrive il trattino, come fa il v31. */
/* L'anello rettangolare del tasto «ripeti» (passo B.16a): come il cerchio
 * del piu', SVG con currentColor, stessa misura degli altri tasti di riga. */
function anelloRipeti(doc) {
  /* Passo B.16a-2: il simbolo «ripeti» del Material (due frecce che formano
   * un rettangolo), come chiesto da Alice: 24x24, fill currentColor. */
  const s = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", "0 0 24 24");
  s.setAttribute("width", "14");
  s.setAttribute("height", "14");
  s.setAttribute("fill", "currentColor");
  s.setAttribute("aria-hidden", "true");
  const p = doc.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", "M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z");
  s.appendChild(p);
  return s;
}

function tabellaEsercizi(doc, scheda, r) {
  const mod = r && r.modifica && r.modifica.attivo === true ? r.modifica : null;
  const elenco = scheda.esercizi || [];
  /* Fase 1: le righe tecniche della scheda, per padre. */
  const tecnicheRiga = {};
  ((scheda && scheda.tecniche) || []).forEach((tt) => { if (tt && tt.padreId) tecnicheRiga[tt.padreId] = tt; });
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
  /* Passo 21: l'editor di questa scheda e il suo id, per la barra dei comandi. */
  modificaCorrente = mod;
  t.setAttribute("data-scheda", String((scheda && scheda.id) || ""));

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

  /* Passo B.16a: i gruppi delle superserie. Attivi = le righe di fila (al
   * meno due, esercizi vivi) con lo stesso campo sup: solo un tratto di
   * fila disegna, mai a buchi. L'ultimo esercizio vivo non ha il tasto vivo. */
  const supAttiviQui = supAttivi(elenco);
  let supUltimoId = "";
  elenco.forEach((e) => { if (e && typeof e === "object" && !e.deletedAt && !String(e.padreId || "")) supUltimoId = String(e.id || ""); });
  /* Passo B.16b: l'unita' che alterna e' l'esercizio SINGOLO o il GRUPPO di
   * fila (righe vive consecutive con lo stesso sup): la zebra del B.14h
   * conta il gruppo come UNA unita'. Le figlie tecniche portano il tono del
   * padre, come dal B.14h. */
  const unita = [];
  let contatoreUnita = -1;
  let supPrecedente = null;
  elenco.forEach((e) => {
    const viva = e && typeof e === "object" && !e.deletedAt && !String(e.padreId || "");
    if (!viva) { unita.push(null); return; }
    const sup = String(e.sup || "");
    if (sup && sup === supPrecedente) unita.push(contatoreUnita);
    else { contatoreUnita += 1; unita.push(contatoreUnita); }
    supPrecedente = sup;
  });
  const corpo = n(doc, "tbody");
  elenco.forEach((e, indice) => {
    /* Passo B.14h: l'unita' che alterna e' l'esercizio, non la riga: le figlie
     * delle tecniche portano il tono del padre. Quando nasceranno i gruppi
     * (B.16) bastera' calcolare il tono dall'indice del gruppo. */
    const tono = unita[indice] % 2 === 0 ? "z-a" : "z-b";
    const tr = n(doc, "tr", "p8-r " + tono + (supAttiviQui[String(e.id || "")] ? " z-gruppo" : ""));
    tr.setAttribute("data-sup", String(e.sup || ""));
    tr.setAttribute("data-sup", String((e && e.sup) || ""));
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
    ["F", "R"].forEach((lettera) => chips.appendChild(pulsanteSpento(doc, "chchip ch-" + lettera, lettera, "tecnica " + lettera)));
        const tecnicaQui = tecnicheRiga[String(e.id || "")] || null;
    const piu = mod
      ? pulsanteVivo(doc, "chplus", "", "tecniche di intensità", () => apriPannelloTecnica(doc, piu, scheda, e, tecnicaQui, mod))
      : pulsanteSpento(doc, "chplus", "", "tecniche di intensità");
    piu.appendChild(cerchioPiu(doc));
    chips.appendChild(piu);
    const gruppo = n(doc, "span", "abgroup");
    gruppo.appendChild(mod
      ? pulsanteVivo(doc, "ab", "\u2715", "cancella riga", () => mod.onCambia({
        idScheda: scheda.id, idEsercizio: e.id, esercizio: nomePulito(e.nome), campo: "riga"
      }))
      : pulsanteSpento(doc, "ab", "\u2715", "cancella riga"));
    gruppo.appendChild(mod
      ? pulsanteVivo(doc, "ab", "\u21c4", "sostituisci esercizio", () => apriSelettoreSostituzioneB(doc, mod, scheda, e, nomePulito(e.nome)))
      : pulsanteSpento(doc, "ab", "\u21c4", "sostituisci esercizio"));
    const eUltimo = String(e.id || "") === supUltimoId;
    /* Passo B.16a: l'anello delle superserie. Un clic collega o scollega
     * l'esercizio con quello sotto; sull'ultimo esercizio resta spento. */
    const bSup = mod && !eUltimo
      ? pulsanteVivo(doc, "ab ab-sup", "", "superserie: collega o scollega l'esercizio sotto", () => mod.onCambia({
        idScheda: scheda.id, idEsercizio: e.id, esercizio: nomePulito(e.nome), campo: "superserie"
      }))
      : pulsanteSpento(doc, "ab ab-sup", "", "superserie: collega o scollega l'esercizio sotto");
    bSup.appendChild(anelloRipeti(doc));
    gruppo.appendChild(bSup);
    // Passo 28: il + resta inattivo, riservato alle future superserie.
    /* Passo B.2: il ＋ grigio («inserisci progressione sotto» nel v31) e' stato
     * tolto da Alice: resta solo il ⊕ rotondo, spento, per le future tecniche
     * di intensita' (superserie, rest pause, myo reps, drop set). */
    chips.appendChild(gruppo);
    ese.appendChild(chips);

    const chips2 = n(doc, "div", "ese-chips2");
    /* Passo B.16a-2: la spia «Test» e' viva solo se nelle celle delle
     * settimane c'e' «test» (maiuscolo o minuscolo). Spia, non tasto. */
    /* PASSO 4c-anticipo: la stessa funzione del campo Test, cosi' spia e campo
     * non possono contraddirsi. */
    const settimaneTest = settimaneTestDiRiga(perRiga[indice]);
    if (settimaneTest.length) {
      const test = n(doc, "span", "tb-test on");
      test.appendChild(n(doc, "i"));
      test.appendChild(n(doc, "span", "tb-test-parola", "Test"));
      test.title = "Test in " + settimaneTest.map((x) => "S" + x).join(", ");
      chips2.appendChild(test);
    } else {
      /* la riga e' rimasta senza contenuti: niente spazio vuoto */
      chips2.style.display = "none";
    }
    ese.appendChild(chips2);

    /* Passo 21 — la tabella che «Vedi» mostra è quella di QUESTA riga: la base
     * è la S1 dell'esercizio, con il ripiego del v31 dichiarato a parte. */
    const settimaneRiga = (e.prescrizione && e.prescrizione.elencoSettimane) || [];
    const baseRiga = baseDaSettimane(settimaneRiga);
    const opzProg = opzioniProgressione(r, baseRiga, baseMancante(settimaneRiga));
    const applicaRiga = (voce) => mod.onCambia({
      idScheda: scheda.id, idEsercizio: e.id, esercizio: nomePulito(e.nome), campo: "progressione",
      progressione: voce.id,
      coppieCustom: voce.tipo === "custom" ? voce.coppie : null,
      nomeProgressione: voce.tipo === "custom" ? nomePulito(voce.nome) : ""
    });
    const prog = mod
      ? pulsanteVivo(doc, "tb-prog btn-prog", "", "applica progressione", () => apriProgressioni(doc, prog,
        vociRiga(baseRiga, opzProg.custom), "progressioni importate dalla tab Progressioni \u00b7 applica alle 8 settimane",
        applicaRiga, opzProg))
      : pulsanteSpento(doc, "tb-prog btn-prog", "", "applica progressione");
    /* Passo 28: il v31 intercetta .btn-prog sul document in cattura e
     * interrompe il clic prima del pulsante di B. Gestiamo solo questo
     * comando della vista B sulla finestra, prima del vecchio gestore. */
    if (mod) {
      prog.setAttribute("data-b-progressione", "true");
      prog.__bdApriProgressioni = () => apriProgressioni(doc, prog,
        vociRiga(baseRiga, opzProg.custom), "progressioni importate dalla tab Progressioni \u00b7 applica alle 8 settimane",
        applicaRiga, opzProg);
      const win = doc.defaultView;
      if (win && !doc.__bdClicProgressione) {
        doc.__bdClicProgressione = true;
        win.addEventListener("click", (ev) => {
          const b = ev.target && ev.target.closest ? ev.target.closest('button[data-b-progressione="true"]') : null;
          if (!b || b.disabled || typeof b.__bdApriProgressioni !== "function") return;
          ev.preventDefault();
          ev.stopPropagation();
          b.__bdApriProgressioni();
        }, true);
      }
    }
    prog.appendChild(n(doc, "span", "bp-ic", "\u25a4"));
    prog.appendChild(n(doc, "span", "", "Applica progressione"));
    ese.appendChild(prog);
    tr.appendChild(ese);

    /* I dati che ogni scrittura porta con sé: la scheda, l'esercizio, il suo
     * indice. Servono alla colonna Descr./Setup e a Rec/TUT. */
    const datiCella = {
      idScheda: scheda.id, codice: scheda.codice, esercizio: String(e.nome == null ? "" : e.nome).trim(),
      idEsercizio: e.id, indice: indice
    };
        /* La regola di colonna (solo a schermo, i dati non si toccano): REC resta
     * in colonna se e’ un recupero vero (cifre, intervalli, min/sec), TUT se e’
     * uno schema di cifre. Una frase di coach si sposta in Descr./Setup con
     * l’etichetta davanti ("REC: ..." / "TUT: ...") e in colonna va il trattino.
     * Il recupero lungo si mostra tagliato con … e il valore completo nel Title:
     * così i bottoni −/+ non gli finiscono sopra. */
    const recTesto = String((e.prescrizione && e.prescrizione.recupero) || "").trim();
    const tutTesto = String((e.prescrizione && e.prescrizione.tempo) || "").trim();
    /* Solo il valore in colonna, la frase del coach in Descr./Setup una volta
     * sola, anche con l'editor acceso (regola di Alice, 8/11/2026). */
    const recParti = separaRecupero(recTesto);
    const tutParti = separaTempo(tutTesto);
    const recMostrato = nomePulito(recParti.valore);
    const tutMostrato = nomePulito(tutParti.valore);
    const recFrase = nomePulito(recParti.frase);
    const tutFrase = nomePulito(tutParti.frase);
    /* La Descr./Setup è una frase, non un nome: niente maiuscola d'ufficio
     * (testoNota), altrimenti quello che si salva non è quello che si legge. */
    const notaTesto = testoNota(e.nota);

    const nota = n(doc, "td", "c-note");
    const pn = n(doc, "span", "p8-note", notaTesto);
    pn.setAttribute("data-ph", "nota coach\u2026");
    /* Passo 26 (Alice, 27/11/2026): «è in descrizione/setup che non mi fa
     * scrivere». La cella era un testo e basta: ora, con l'editor acceso, si
     * scrive DENTRO la cella (contenteditable + classe scrittura, la stessa
     * strada di serie/recupero/TUT) e il testo si salva sull'ESERCIZIO,
     * quello da cui nasce `e.nota`. Le righe REC/TUT spostate restano fuori
     * dal campo: sono della prescrizione, non della nota, e non si duplicano. */
    if (mod && typeof mod.onCambia === "function") {
      rendiCellaNota(doc, pn, mod, Object.assign({}, datiCella, { valore: notaTesto }));
    } else {
      pn.setAttribute("title", "si modifica dalla scheda in Programma");
    }
    nota.appendChild(pn);
    if (recFrase && notaTesto.indexOf(recFrase) === -1) {
      nota.appendChild(n(doc, "div", "p8-note spostata", etichettaSpostata("REC", recFrase)));
    }
    if (tutFrase && notaTesto.indexOf(tutFrase) === -1) {
      nota.appendChild(n(doc, "div", "p8-note spostata", etichettaSpostata("TUT", tutFrase)));
    }
    tr.appendChild(nota);

    /* Rec e TUT (passo 10): si scrivono a mano, la freccetta offre i valori di
     * sempre, i pulsantini del recupero vanno di 30". Sono campi dell'esercizio:
     * valgono per tutte le settimane. Con l'editor acceso la cella mostra il
     * testo intero, perche' e' quello che si modifica; in sola lettura la frase
     * di coach torna spostata in Descr./Setup come prima. */
    const rec = n(doc, "td", "c-rec");
    if (mod) {
      rendiCellaRecupero(doc, rec, mod, Object.assign({}, datiCella, { valore: recMostrato, intero: recTesto }));
    } else {
      rec.appendChild(pulsanteSpento(doc, "stp", "\u2212", "meno 30 secondi"));
      const recSpan = n(doc, "span", "rec", recMostrato ? recuperoVisibile(recMostrato).testo : "\u2014");
      if (recMostrato) recSpan.title = recMostrato;
      rec.appendChild(recSpan);
      rec.appendChild(pulsanteSpento(doc, "stp", "+", "pi\u00f9 30 secondi"));
    }
    tr.appendChild(rec);

    const tut = n(doc, "td", "c-tut");
    if (mod) rendiCellaTut(doc, tut, mod, Object.assign({}, datiCella, { valore: tutMostrato, intero: tutTesto }));
    else tut.appendChild(n(doc, "span", "tut", tutMostrato || "\u2014"));
    tr.appendChild(tut);


    perRiga[indice].forEach((s, k) => {
      const sc = inScarico(k) ? " sc-col" : "";
      const ser = n(doc, "td", "c-ser" + sc);
      const serSpan = n(doc, "span", "", nomePulito(s.serie) || "—");
      if (mod) rendiCellaModificabile(doc, serSpan, mod, {
        idScheda: scheda.id, codice: scheda.codice, esercizio: String(e.nome == null ? "" : e.nome).trim(), idEsercizio: e.id, indice: indice,
        settimana: k + 1, campo: "serie", prima: nomePulito(s.serie) || ""
      });
      ser.appendChild(serSpan);
      tr.appendChild(ser);
      const rip = n(doc, "td", "c-reps" + sc);
      const ripSpan = n(doc, "span", "", nomePulito(s.ripetizioni) || "—");
      if (mod) rendiCellaModificabile(doc, ripSpan, mod, {
        idScheda: scheda.id, codice: scheda.codice, esercizio: String(e.nome == null ? "" : e.nome).trim(), idEsercizio: e.id, indice: indice,
        settimana: k + 1, campo: "ripetizioni", prima: nomePulito(s.ripetizioni) || ""
      });
      rip.appendChild(ripSpan);
      tr.appendChild(rip);
    });

    tr.appendChild(n(doc, "td", "c-ult", ultimaVolta(r, scheda, e.nome)));
    if (supAttiviQui[String(e.id || "")]) tr.className = tr.className + " in-sup";
    corpo.appendChild(tr);
    const trTec = rigaTecnicaVista(doc, scheda, e, tecnicaQui, indice, mod, numero, inScarico, tono, supAttiviQui[String(e.id || "")] === true);
    if (trTec) corpo.appendChild(trTec);
  });
  t.appendChild(corpo);
  box.appendChild(t);
  return box;
}

/* ---------- la barra degli strumenti della scheda ----------------------- */

/* I due tasti di stampa come li vuole la barra vera: vivi, col segno data-stampa che il
 * gancio cerca, e gia' legati al loro foglio. Prima erano `pulsanteSpento`:
 * senza segno e col tooltip «spento: questa pagina non scrive», quindi il gancio
 * non li trovava e Alice vedeva la stampa spenta (passo B.20c). */
function pulsanteStampa(doc, testo, titolo, tipo) {
  const b = pulsanteVivo(doc, "pr-btn", testo, titolo, () => apriFinestraStampa(doc, tipo));
  b.setAttribute("data-stampa", tipo);
  return b;
}

/* PASSO 35 — «Esporta esercizi»: Alice non ha il backup di B, quindi il file
 * lo produce la pagina. Il clic scarica un JSON con TUTTI gli esercizi di
 * TUTTE le schede del programma aperto (non solo quella nella barra): nome,
 * distretto, scheda, serie della prima settimana, settimane, articolazioni.
 * Il contenuto lo costruisce `comune/esporta-esercizi-b.js` (funzione pura);
 * qui si costruisce solo il tasto e si dice com'e' andata. */
function pulsanteEsporta(doc, r, barra) {
  const letto = Boolean(r && r.profilo && r.profilo.presente && Array.isArray(r.schede));
  if (!letto || r.schede.length === 0) {
    /* Brief passo 35, punto 5: se il programma non e' letto il tasto e' spento
     * e dice perche'. Non si usa `pulsanteSpento`: il suo titolo parla di una
     * pagina che non scrive, che qui non c'entra. */
    const spento = n(doc, "button", "pr-btn", "Esporta esercizi");
    spento.type = "button";
    spento.disabled = true;
    spento.setAttribute("aria-disabled", "true");
    spento.setAttribute("data-esporta", "spento");
    const motivo = letto
      ? "spento: questo programma non ha schede attive, quindi non c'è niente da esportare"
      : "spento: il programma non è stato letto, quindi non c'è niente da esportare";
    spento.title = motivo;
    spento.setAttribute("aria-label", "Esporta esercizi — " + motivo);
    return spento;
  }
  const b = pulsanteVivo(doc, "pr-btn", "Esporta esercizi",
    "scarica un file con gli esercizi di tutte le schede del programma: nome, distretto, serie, settimane e articolazioni",
    () => {
      const esito = esportaProgramma(doc, r);
      if (esito.ok === true) {
        mostraEsitoCopia(doc, barra, "File scaricato: " + esito.esercizi + " esercizi da " + esito.schede + " schede \u00b7 " + esito.nomeFile, true);
      } else {
        mostraEsitoCopia(doc, barra, esito.motivo || "non ho potuto scaricare il file", false);
      }
    });
  b.setAttribute("data-esporta", "1");
  b.setAttribute("aria-label", "Esporta esercizi: scarica un file JSON con tutti gli esercizi delle schede, con distretto, serie, settimane e articolazioni");
  return b;
}

/* La fila del v31, nell'ordine del v31. Tutti spenti: sono comandi che
 * scrivono (o che aprono finestre di modifica), tranne le due stampe, che
 * sarebbero letture e si accenderanno quando Alice lo dice. */
/* 4d \u2014 \u00abApplica sett./scarico a tutte le schede\u00bb, vivo.
 * I valori si leggono dai campi che Alice vede nella scheda aperta: si applica
 * quello che c'e' scritto li'. Prima i numeri scheda per scheda, poi la
 * scrittura, poi UNA voce di registro e un solo Annulla. */
function valoriScaricoInPagina(doc, scheda) {
  const id = String((scheda && scheda.id) || "");
  const rq = (id ? doc.querySelector('[data-pr-scheda="' + id + '"]') : null) || doc.querySelector("[data-pr-scheda]");
  const s = rq ? rq.querySelector('[data-pr-c="scarico-settimana"]') : null;
  const v = rq ? rq.querySelector('[data-pr-c="scarico-volume"]') : null;
  return {
    settimana: s ? String(s.value || "").trim().replace(/^[Ss]\s*/, "") : "",
    volume: v ? String(v.value || "").trim().replace(/%/g, "") : ""
  };
}

function pulsanteScaricoTutte(doc, barra, scheda, r) {
  const b = pulsanteVivo(doc, "pr-btn", "Applica sett./scarico a tutte le schede",
    "guarda i numeri scheda per scheda, poi scrive",
    () => apriScaricoTutte(doc, barra, scheda, r));
  b.setAttribute("data-scarico-tutte", "1");
  return b;
}

function apriScaricoTutte(doc, barra, scheda, r) {
  const mod = modificaCorrente;
  if (!mod || typeof mod.proponiScaricoTutte !== "function" || typeof mod.applicaScaricoTutte !== "function") {
    senzaEditor(doc, null, {
      titolo: "Questa pagina non sa ancora applicare a tutte le schede",
      riga: "La pagina non ha un editor collegato a questa scheda: non ho fatto niente."
    });
    return null;
  }
  const valori = valoriScaricoInPagina(doc, scheda);
  const vecchio = barra.querySelector(".pr-conf");
  if (vecchio) chiudiConferma(vecchio);
  const box = n(doc, "div", "pr-conf");
  box.setAttribute("data-scarico-box", "1");
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-label", "applica a tutte le schede");
  box.appendChild(n(doc, "p", "pr-conf-titolo", "Applica a tutte le schede"));
  box.appendChild(n(doc, "p", "pr-hint", "Leggo le schede di B e conto quello che cambierebbe\u2026"));
  barra.appendChild(box);
  box.addEventListener("keydown", (ev) => {
    if (!ev) return;
    if (ev.key === "Escape" || ev.keyCode === 27) { if (ev.preventDefault) ev.preventDefault(); chiudiConferma(box); }
  });
  if (!valori.settimana || !valori.volume) {
    while (box.firstChild) box.removeChild(box.firstChild);
    box.appendChild(n(doc, "p", "pr-conf-titolo", "Manca lo scarico da applicare"));
    box.appendChild(n(doc, "p", "pr-conf-domanda", "Scegli la settimana e la percentuale di scarico nella scheda che stai guardando, poi riprova: non ho scritto niente."));
    const f0 = n(doc, "div", "pr-conf-fila");
    f0.appendChild(pulsanteVivo(doc, "pr-btn", "Chiudi", "chiudi", () => chiudiConferma(box)));
    box.appendChild(f0);
    return box;
  }
  Promise.resolve(mod.proponiScaricoTutte({ idPartenza: String(scheda && scheda.id || ""), settimana: valori.settimana, volume: valori.volume }))
    .then((piano) => {
      if (!box.parentNode) return;
      while (box.firstChild) box.removeChild(box.firstChild);
      if (!piano || !piano.ok) {
        box.appendChild(n(doc, "p", "pr-conf-titolo", "Non si puo' applicare"));
        box.appendChild(n(doc, "p", "pr-conf-domanda", String((piano && piano.motivo) || "non ho scritto niente")));
        const f1 = n(doc, "div", "pr-conf-fila");
        f1.appendChild(pulsanteVivo(doc, "pr-btn", "Chiudi", "chiudi", () => chiudiConferma(box)));
        box.appendChild(f1);
        return;
      }
      if (piano.gia) {
        box.appendChild(n(doc, "p", "pr-conf-titolo", "Niente da cambiare"));
        box.appendChild(n(doc, "p", "pr-conf-domanda", String(piano.testo || "")));
        (piano.righe || []).forEach((riga) => box.appendChild(n(doc, "p", "pr-conf-riga", riga.testo)));
        const f2 = n(doc, "div", "pr-conf-fila");
        f2.appendChild(pulsanteVivo(doc, "pr-btn", "Chiudi", "chiudi", () => chiudiConferma(box)));
        box.appendChild(f2);
        return;
      }
      box.appendChild(n(doc, "p", "pr-conf-domanda", String(piano.domanda || "")));
      (piano.righe || []).forEach((riga) => {
        const p = n(doc, "p", "pr-conf-riga" + (riga.esito === "salta" ? " salta" : ""), riga.testo);
        p.setAttribute("data-scarico-riga", String(riga.id || ""));
        box.appendChild(p);
      });
      box.appendChild(n(doc, "p", "pr-conf-avviso", "Il test non si copia: resta com'e' in ogni scheda. Logbook e zona A non si toccano. Si puo' annullare subito dopo, e l'Annulla rimette tutte le schede toccate."));
      const fila = n(doc, "div", "pr-conf-fila");
      fila.appendChild(pulsanteVivo(doc, "pr-btn", "Annulla", "non fare niente", () => chiudiConferma(box)));
      const ok = pulsanteVivo(doc, "pr-btn danger", "Applica", "scrive davvero, scheda per scheda", () => {
        chiudiConferma(box);
        eseguiScaricoTutte(doc, barra, mod, { idPartenza: String(scheda && scheda.id || ""), settimana: valori.settimana, volume: valori.volume });
      });
      ok.setAttribute("data-scarico-conferma", "1");
      fila.appendChild(ok);
      box.appendChild(fila);
    }, (e) => {
      if (!box.parentNode) return;
      while (box.firstChild) box.removeChild(box.firstChild);
      box.appendChild(n(doc, "p", "pr-conf-titolo", "Non si puo' applicare"));
      box.appendChild(n(doc, "p", "pr-conf-domanda", "lettura non riuscita: " + (e && e.message ? e.message : "errore") + " \u00b7 non ho scritto niente"));
      const f3 = n(doc, "div", "pr-conf-fila");
      f3.appendChild(pulsanteVivo(doc, "pr-btn", "Chiudi", "chiudi", () => chiudiConferma(box)));
      box.appendChild(f3);
    });
  return box;
}

function eseguiScaricoTutte(doc, barra, mod, richiesta) {
  return Promise.resolve(mod.applicaScaricoTutte(richiesta)).then((esito) => {
    if (esito && esito.ok === true) {
      let testo = String(esito.testo || "scarico applicato");
      if (Array.isArray(esito.saltate) && esito.saltate.length) testo += " \u00b7 saltate: " + esito.saltate.map((x) => x.codice).join(", ");
      mostraEsitoCopia(doc, barra, testo + (esito.avvisoRegistro ? " \u00b7 MA: " + esito.avvisoRegistro : ""), true);
      /* La colonna dello scarico la disegna B: senza rileggere, a schermo
       * resta il disegno di prima. */
      if (typeof mod.rilegge === "function") {
        try {
          const p = mod.rilegge();
          if (p && typeof p.then === "function") p.then(() => {}, () => {});
        } catch (e) { /* la scrittura e' andata: la rilettura si riprova da sola */ }
      }
      return;
    }
    const m = String((esito && (esito.motivo || esito.testo)) || "").trim() || "non ho scritto niente";
    mostraEsitoCopia(doc, barra, m, false);
  }).catch((e) => {
    mostraEsitoCopia(doc, barra, (e && e.message) || "errore", false);
  });
}

/* Le spiegazioni (passo 33). I quattro testi stanno scritti una volta sola
 * nello stampo #pr-mspiega, che pero' vive dentro un contenitore che non si
 * vede: aprire quello non mostrava niente. Ogni apertura costruisce una copia
 * viva sul corpo della pagina, con gli stessi testi e lo stesso stile; a
 * chiudere sono il ×, il clic sullo sfondo e Esc, e il fuoco torna al tasto. */
function apriSpiegazioni(doc, tasto) {
  const stampo = doc.getElementById("pr-mspiega");
  if (!stampo || !doc.body) return false;
  const gia = doc.querySelector(".bd-spiega");
  if (gia) gia.remove();

  const modale = doc.createElement("div");
  modale.className = "pr-modal bd-spiega";
  const scatola = doc.createElement("div");
  scatola.className = "pr-mbox";
  const testa = doc.createElement("header");
  const titolo = doc.createElement("b");
  titolo.textContent = "Spiegazioni";
  const voci = stampo.querySelectorAll(".pr-spiega > div");
  const conta = doc.createElement("span");
  conta.textContent = voci.length + (voci.length === 1 ? " voce" : " voci");
  const x = doc.createElement("button");
  x.type = "button";
  x.className = "pr-mx";
  x.setAttribute("aria-label", "Chiudi");
  x.textContent = "\u00d7";
  testa.appendChild(titolo);
  testa.appendChild(conta);
  testa.appendChild(x);
  scatola.appendChild(testa);

  const elenco = doc.createElement("div");
  elenco.className = "pr-spiega";
  voci.forEach((v) => elenco.appendChild(v.cloneNode(true)));
  scatola.appendChild(elenco);
  modale.appendChild(scatola);

  let finito = false;
  const chiudi = () => {
    if (finito) return;
    finito = true;
    modale.remove();
    doc.removeEventListener("keydown", suTasto, true);
    if (tasto && tasto.focus) { try { tasto.focus(); } catch (e) { /* il fuoco non c'e': pazienza */ } }
  };
  function suTasto(ev) {
    if (ev.key === "Escape" || ev.key === "Esc") { ev.stopPropagation(); chiudi(); }
  }
  x.addEventListener("click", (ev) => { ev.preventDefault(); chiudi(); });
  modale.addEventListener("click", (ev) => { if (ev.target === modale) chiudi(); });
  doc.addEventListener("keydown", suTasto, true);
  doc.body.appendChild(modale);
  if (x.focus) { try { x.focus(); } catch (e) { /* senza fuoco si legge lo stesso */ } }
  return true;
}

function barraStrumenti(doc, scheda, r) {
  const bar = n(doc, "div", "pr-bar");
  bar.appendChild(pulsanteScaricoTutte(doc, bar, scheda, r));
  const cerca = n(doc, "span", "pr-cerca-box");
  const input = n(doc, "input", "pr-in");
  input.type = "search";
  input.placeholder = "cerca esercizio…";
  input.disabled = true;
  input.setAttribute("aria-label", "cerca esercizio");
  cerca.appendChild(input);
  cerca.appendChild(n(doc, "span", "pr-hint", "🔍 Cerca"));
  bar.appendChild(cerca);
  const btRiga = modificaCorrente
    ? pulsanteVivo(doc, "pr-btn", "+ Riga", "aggiunge una riga alla scheda", () => apriSelettoreRigaB(doc, btRiga))
    : pulsanteSpento(doc, "pr-btn", "+ Riga", "aspetta che il programma sia caricato");
  bar.appendChild(btRiga);
  bar.appendChild(pulsanteInArrivo(doc, "pr-btn", "Periodizzazione", "apre il generatore di periodizzazione: costruisce le otto settimane dai carichi"));
  /* PASSO 4b — il tasto è vivo: la pillola «demo» se n'è andata con il
   * riquadro dentro la pagina. La copia vale dentro il programma attivo:
   * mai da un atleta all'altro, mai fuori dalle schede di questo programma. */
  const btCopia = modificaCorrente
    ? pulsanteVivo(doc, "pr-btn", "Copia/Sposta esercizi", "copia o sposta gli esercizi in un'altra scheda", () => apriCopiaEsercizi(doc, btCopia, scheda, r))
    : pulsanteSpento(doc, "pr-btn", "Copia/Sposta esercizi", "aspetta che il programma sia caricato");
  btCopia.setAttribute("data-copia", "1");
  bar.appendChild(btCopia);
  /* Passo 33: le quattro spiegazioni sono in pagina (#pr-mspiega) e si chiudono
   * col ×, col clic fuori o con Esc. Il tasto della barra viva non le apriva. */
  const btSpiega = pulsanteVivo(doc, "pr-btn", "Spiegazioni (4/4)",
    "apre le quattro spiegazioni: TUT, ondata 10-x, scarico, rotazione schede", () => apriSpiegazioni(doc, btSpiega));
  btSpiega.setAttribute("data-spiegazioni", "1");
  bar.appendChild(btSpiega);
  bar.appendChild(pulsanteStampa(doc, "Stampa Compatta", "stampa la scheda come sta adesso, tutte le settimane in fila", "compatta"));
  bar.appendChild(pulsanteStampa(doc, "Stampa da Compilare", "stampa una settimana con le caselle vuote da spuntare a mano", "compilare"));
  bar.appendChild(pulsanteEsporta(doc, r, bar));
  /* PASSO 23 — il tasto diceva «Suggerimenti: ON» ma non accendeva niente:
   * un motore di suggerimenti non c'è. Ora il testo dice che non sono
   * disponibili e il titolo dice perché, invece di far credere che siano
   * accesi. Il tasto resta (non si toglie): cambia la verità che mostra. */
  const sug = pulsanteSpento(doc, "pr-btn", "Suggerimenti: non disponibili", "i suggerimenti automatici non ci sono ancora");
  sug.title = "spento: i suggerimenti automatici non ci sono ancora — questa pagina non ne propone nessuno";
  sug.setAttribute("aria-label", "Suggerimenti non disponibili: i suggerimenti automatici non ci sono ancora");
  bar.appendChild(sug);
  const btProgScheda = pulsanteVivo(doc, "pr-btn", "Applica progressione a tutta la scheda",
    "applica la progressione alle 8 settimane di tutte le righe", () => {
    if (!modificaCorrente) return;
    const idScheda = idSchedaVicino(btProgScheda);
    const opzScheda = opzioniProgressione(r, null, null);
    apriProgressioni(doc, btProgScheda, vociScheda(opzScheda.custom),
      "Le 8 settimane di tutte le righe di questa scheda vengono riscritte. Puoi annullare subito dopo.",
      (voce) => modificaCorrente.onCambia({
        idScheda: idScheda, campo: "progressione-scheda", progressione: voce.id,
        coppieCustom: voce.tipo === "custom" ? voce.coppie : null,
        nomeProgressione: voce.tipo === "custom" ? nomePulito(voce.nome) : ""
      }), opzScheda);
  });
  bar.appendChild(btProgScheda);
  const btScheletro = modificaCorrente
    ? pulsanteVivo(doc, "pr-btn", "Salva come scheletro", "salva la struttura di questa scheda come scheletro", () => apriSalvaScheletro(doc, btScheletro))
    : pulsanteSpento(doc, "pr-btn", "Salva come scheletro", "aspetta che il programma sia caricato");
  bar.appendChild(btScheletro);
  /* B.21 — i tre comandi dell'igiene: vivi, ma nessuno scrive senza un
   * secondo clic nel riquadro qui sotto. */
  const btSvuota = modificaCorrente
    ? pulsanteVivo(doc, "pr-btn danger", "Svuota scheda", "svuota la scheda", () => apriSvuotaScheda(doc, btSvuota))
    : pulsanteSpento(doc, "pr-btn danger", "Svuota scheda", "aspetta che il programma sia caricato");
  bar.appendChild(btSvuota);
  const btSvuotaTutto = pulsanteVivo(doc, "pr-btn danger", "Svuota tutto il programma", "svuota tutto il programma", () => apriSvuotaProgramma(doc, btSvuotaTutto));
  bar.appendChild(btSvuotaTutto);
  const btRipristina = pulsanteVivo(doc, "pr-btn", "↺ ripristina scheda", "riporta la scheda a com'era all'apertura", () => apriRipristinaScheda(doc, btRipristina));
  bar.appendChild(btRipristina);
  return bar;
}

/* I filtri per distretto (passo 3b). Le pillole non sono piu la lista fissa
 * del v31: nascono dai distretti che la scheda aperta contiene davvero, in
 * ordine di prima comparsa, con la sigla della colonna DIST. (codiceDistretto).
 * Tutti e sempre la prima. La pillola con il trattino compare solo se in scheda
 * ce almeno una riga con un distretto che lapp non sa tradurre. La pillola Q
 * prende anche gli adduttori, che portano la sigla Q. */
const NOMI_DISTRETTO = {
  P: "Pettorali", D: "Dorsali", CS: "Centro schiena", Q: "Quadricipiti", E: "Femorali",
  S: "Spalle", G: "Glutei", B: "Bicipiti", T: "Tricipiti", A: "Addominali",
  Z: "Polpacci", CA: "Cardio", "—": "distretto non riconosciuto"
};

/* Dopo un filtro la zebra si ricalcola su quello che si vede, e la cornice
 * della superserie resta solo se il gruppo si vede tutto. Il tono si assegna
 * per UNITA: il gruppo di fila (righe consecutive con lo stesso data-sup) e
 * una sola unita, e la figlia tecnica porta il tono del padre. */
function rizebra(righe) {
  let indice = -1;
  let supPrima = "";
  righe.forEach((tr) => {
    const sup = tr.getAttribute("data-sup") || "";
    const tec = tr.classList.contains("p8-tec");
    if (tec) {
    } else if (sup && sup === supPrima) {
    } else {
      indice += 1;
      supPrima = sup;
    }
    const tonoNuovo = indice % 2 === 0 ? "z-a" : "z-b";
    tr.className = tr.className.split(" ").filter((c) => c && c !== "z-a" && c !== "z-b").join(" ") + " " + tonoNuovo;
  });
  const interi = Object.create(null);
  righe.forEach((tr) => {
    const sup = tr.getAttribute("data-sup") || "";
    if (!sup) return;
    if (interi[sup] === undefined) interi[sup] = true;
    if (tr.classList.contains("f-nascosta")) interi[sup] = false;
  });
  righe.forEach((tr) => {
    const sup = tr.getAttribute("data-sup") || "";
    if (!sup) return;
    const tutto = interi[sup] === true;
    const padre = !tr.classList.contains("p8-tec");
    tr.classList.toggle("in-sup", tutto);
    if (padre) tr.classList.toggle("z-gruppo", tutto);
  });
}

/* Mostra solo le righe di una sigla. Tutti non nasconde niente. */
function applicaFiltroDistretto(pannello, tasti, sigla) {
  tasti.forEach((b) => {
    b.className = b.getAttribute("data-f") === sigla ? "pr-fchip on" : "pr-fchip";
  });
  if (!pannello) return;
  const righe = Array.from(pannello.querySelectorAll("tbody tr.p8-r"));
  const tutte = sigla === "Tutti";
  righe.forEach((tr) => {
    const c = tr.querySelector("td.c-dist .dist");
    const sua = c ? String(c.textContent || "").trim() : "—";
    tr.classList.toggle("f-nascosta", !(tutte || sua === sigla));
  });
  rizebra(righe);
  const box = pannello.querySelector(".p8-scroll");
  if (box) {
    Array.from(box.querySelectorAll(".sup-cornice")).forEach((x) => x.remove());
    if (typeof corniciScheda === "function") corniciScheda(box);
  }
}

function filtriDistretti(doc, scheda, pannello) {
  const f = n(doc, "div", "pr-filtri");
  const sigle = [];
  ((scheda && scheda.esercizi) || []).forEach((e) => {
    if (!e || (e.padreId && e.tecnica)) return;
    const sigla = codiceDistretto(e.muscolo);
    if (sigle.indexOf(sigla) === -1) sigle.push(sigla);
  });
  const elenco = ["Tutti"].concat(sigle);
  const tasti = [];
  elenco.forEach((sigla, i) => {
    const b = n(doc, "button", "pr-fchip" + (i === 0 ? " on" : ""), sigla);
    b.type = "button";
    b.setAttribute("data-f", sigla);
    b.title = sigla === "Tutti" ? "mostra tutti gli esercizi della scheda" : (NOMI_DISTRETTO[sigla] || sigla);
    b.addEventListener("click", () => applicaFiltroDistretto(pannello, tasti, sigla));
    tasti.push(b);
    f.appendChild(b);
  });
  return f;
}

/* ---------- le schede ---------------------------------------------------- */

/* PASSO 4c-anticipo — il titolo: se il nome e' gia' «Scheda X» non si
 * ripete due volte; se e' diverso, «Scheda X — NOME». */
function suffissoNome(scheda) {
  const nome = nomePulito(scheda && scheda.nome);
  if (!nome) return "";
  const codice = "Scheda " + (scheda && scheda.codice != null ? scheda.codice : "");
  if (nome.toLowerCase() === codice.toLowerCase()) return "";
  return " — " + nome;
}

/* PASSO 4c-anticipo — il campo Test non e' piu' una tendina: e' un'etichetta
 * che riconosce da sola le settimane di test dalle celle della scheda. Non si
 * digita, non ha freccia, si aggiorna a ogni ridisegno (dopo ogni modifica
 * delle celle). */
function etichettaTest(doc, scheda) {
  const settimane = settimaneDiTest(scheda);
  const f = n(doc, "div", "pr-f pr-f-sm");
  const lab = n(doc, "span", "pr-lab", "Test");
  lab.setAttribute("title", "riconosciuto dalle celle della scheda");
  f.appendChild(lab);
  const c = n(doc, "span", "pr-in pr-val pr-vivo", testoTest(settimane));
  c.setAttribute("data-pr-c", "test-settimana");
  c.setAttribute("aria-label", "Test");
  c.setAttribute("title", "riconosciuto dalle celle della scheda");
  if (!settimane.length) c.setAttribute("data-vuoto", "1");
  f.appendChild(c);
  return f;
}

function pannelloScheda(doc, scheda, r) {
  const p = n(doc, "div", "pr-shell");
  /* Il segnaposto dei campi vivi: lega i controlli alla scheda giusta. */
  p.setAttribute("data-pr-scheda", String(scheda.id == null ? "" : scheda.id));

  const testata2 = n(doc, "div", "pr-shd");
  const t = n(doc, "div", "pr-shd-t");
  t.appendChild(n(doc, "h3", "", "Scheda " + scheda.codice + suffissoNome(scheda)));
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
  /* Le tendine delle settimane: S1...SN, con N = settimane scritte davvero
   * nella scheda. «—» vuol dire «non registrato». */
  const quantePiano = settimaneEsercizi(scheda.esercizi);
  const vociSettimane = Array.from({ length: quantePiano }, (_, i) => ({ valore: "S" + (i + 1), testo: "S" + (i + 1) }));
  f.appendChild(campo(doc, "Settimane", r.profilo.durata == null ? "" : String(r.profilo.durata), "text", null, null, "pr-f-sm"));
  /* PASSO 4a — scarico (settimana e percentuale) e test sono campi veri.
   * Il piano letto dal documento lo riempie comune/piano-vivo.js: qui si
   * disegna solo il campo, con «non registrato» quando non c'e'. Il «2°»
   * è stato tolto: nessun blocco lo legge e nessuno lo usava. */
  f.appendChild(campoPiano(doc, "Scarico", "", "scarico-settimana", "select", vociSettimane, "pr-f-sm", { titolo: "settimana dello scarico" }));
  f.appendChild(campoPiano(doc, "Vol −%", "", "scarico-volume", "text", null, "pr-f-sm", { titolo: "scegli prima la settimana dello scarico", segnaposto: "es. 40", suffisso: "%", disattivato: true }));
  f.appendChild(etichettaTest(doc, scheda));
  testata2.appendChild(f);
  p.appendChild(testata2);

  p.appendChild(barraStrumenti(doc, scheda, r));
  p.appendChild(filtriDistretti(doc, scheda, p));

  const note = n(doc, "div", "pr-note");
  note.appendChild(n(doc, "div", "pr-note-h", "📌 NOTE SCHEDA " + scheda.codice + " — si salvano uscendo dal campo, visibili nell'export/stampa"));
  /* PASSO 20 — la nota si scrive. Prima nasceva `readOnly = true`: si vedeva
   * e non si poteva toccare. Ora e' un campo vero: `data-pr-c` la lega alla
   * scheda, e la pagina non si ridisegna mentre il fuoco e' dentro (vedi
   * `cellaInModifica()` in desktop/app-v31.js). Il testo si salva al cambio,
   * nella scheda di B, con la voce di registro e l'Annulla. */
  const ta = n(doc, "textarea", "pr-ta pr-ta-note");
  ta.rows = 3;
  ta.value = scheda.note ? nomePulito(scheda.note) : "";
  ta.setAttribute("data-pr-c", "scheda-nota");
  ta.setAttribute("aria-label", "note della scheda " + scheda.codice);
  ta.setAttribute("title", "scrivi qui: la nota si salva quando esci dal campo (o premi Ctrl+Invio)");
  ta.setAttribute("placeholder", "Riscaldamento, prehab, note generali per l'atleta…");
  /* Il testo iniziale anche come contenuto: la textarea lo mostra dal `value`,
   * ma chi legge il documento (e le stampe) lo trova qui. */
  ta.textContent = scheda.note ? nomePulito(scheda.note) : "";
  note.appendChild(ta);
  p.appendChild(note);
  p.appendChild(rigaTempo(doc, scheda));

  p.appendChild(tabellaEsercizi(doc, scheda, r));
  return p;
}

/* ---------- analisi del programma: serie per distretto e sovrapposizione -- */

/* PASSO 4c: le due carte sotto la linguetta Analisi programmazione.
 * Il conto NON sta qui: sta in comune/analisi-programmazione.js. La vista
 * legge e disegna, e i due numeri non possono divergere. */
function analisi(doc, r) {
  const box = n(doc, "div", "t9-an");
  const schede = r.schede || [];
  const quante = settimaneDelleSchede(schede);
  /* La tendina della settimana e' stata tolta: con la sola carta della
   * sovrapposizione non cambierebbe un solo numero, e un comando che non
   * cambia niente e' un comando finto. Il conto guarda tutto il blocco. */
  const testa = n(doc, "div", "t9-an-scelta");
  testa.appendChild(n(doc, "span", "t9-sub", "Guarda tutto il blocco: qui sotto ogni distretto con le schede in cui compare."));
  box.appendChild(testa);
  const griglia = n(doc, "div", "t9-an-grid");
  box.appendChild(griglia);
  const disegna = () => {
    const conto = analisiProgrammazione(schede, { settimana: null });
    while (griglia.firstChild) griglia.removeChild(griglia.firstChild);
    /* Una carta sola: la "Serie per distretto" ripeteva il Riepilogo volume. */
    const c2 = n(doc, "div", "t9-card");
    c2.setAttribute("data-analisi-carta", "sovrapposizione");
    c2.appendChild(n(doc, "h4", "", "Sovrapposizione tra schede"));
    c2.appendChild(n(doc, "p", "t9-sub", "Ogni distretto con le schede in cui compare. Quelli lavorati in piu' di una scheda sono in evidenza: e' li' che il volume si somma."));
    const d2 = n(doc, "div", "t9-ov");
    if (!conto.distretti.length) {
      d2.appendChild(n(doc, "p", "pg-vuoto", "Nessun distretto riconosciuto negli esercizi letti."));
    } else {
      const ordine = conto.distretti.slice().sort((a, b) => (b.schede.length - a.schede.length) || nomeDistretto(a.codice).localeCompare(nomeDistretto(b.codice)));
      ordine.forEach((x) => {
        const riga = n(doc, "div", "t9-ov-r");
        riga.setAttribute("data-analisi-distretto", x.codice);
        riga.setAttribute("data-analisi-schede", String(x.schede.length));
        riga.setAttribute("data-analisi-evidenza", x.schede.length > 1 ? "piu" : "una");
        if (x.schede.length > 1) riga.style.fontWeight = "900";
        else riga.style.opacity = "0.55";
        riga.appendChild(n(doc, "b", "t9-dist-c", nomeDistretto(x.codice)));
        const chips = n(doc, "span", "t9-ov-s");
        x.schede.forEach((codice) => chips.appendChild(n(doc, "span", "pr-rotchip", "Scheda " + codice)));
        riga.appendChild(chips);
        d2.appendChild(riga);
      });
    }
    c2.appendChild(d2);
    griglia.appendChild(c2);
  };
  disegna();
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

/* Il recupero in secondi per la stima del tempo totale: un valore singolo
 * vale se stesso, un intervallo vale la media dei due estremi (2-3' -> 150").
 * Prima si prendeva il primo numero della cella: 1'30" contava 1 secondo e
 * 2-3' contava 2 secondi, e il tempo totale era sbagliato di un pezzo. */
function secondiRecuperoStima(testo) {
  const inter = intervalloSecondi(testo);
  if (inter) return Math.round((inter.da + inter.a) / 2);
  return secondiRecupero(testo);
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
    const grezzoRec = String((e.prescrizione && e.prescrizione.recupero) || "");
    const rec = !grezzoRec.trim() ? 0 : secondiRecuperoStima(grezzoRec);
    if (!Number.isFinite(serie) || serie <= 0 || !Number.isFinite(rip) || rip <= 0 || !Number.isFinite(tut) || tut <= 0) { manca = true; return; }
    if (rec == null || !Number.isFinite(rec)) { manca = true; return; }
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
    /* Passo 35: senza schede non c'è una barra dove mettere «Esporta
     * esercizi». Il tasto resta qui, spento, e dice perché: non sparisce
     * lasciando credere che l'esportazione non esista. */
    c.appendChild(pulsanteEsporta(doc, r, null));
    if (r.archiviate && r.archiviate.length) {
      c.appendChild(n(doc, "p", "pr-hint", "Schede archiviate di questo programma: " + r.archiviate.length + " — restano nei dati, la pagina non le disegna più."));
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
    const spenta = titolo !== "Analisi programmazione" && !(titolo === "Scheletri" && Array.isArray(r.scheletri));
    const COSA_ARRIVA = {
      Stress: "mostra lo stress percepito settimana per settimana (arriva col passo 6)",
      Scheletri: "apre la pagina Scheletri: la raccolta salvata in B, con Applica ed Elimina",
      Periodizzazione: "apre il generatore di periodizzazione: costruisce le otto settimane dai carichi",
    };
    const b = spenta
      ? pulsanteInArrivo(doc, "pr-ntab pr-ntab-extra", titolo, COSA_ARRIVA[titolo] || titolo)
      : n(doc, "button", "pr-ntab pr-ntab-extra", titolo);
    b.type = "button";
    b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", "false");
    if (!spenta) {
      b.addEventListener("click", () => accendi(titolo === "Scheletri" ? elenco.length + 1 : elenco.length));
      extra.push(b);
    }
    linguette.appendChild(b);
  });


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

  /* extra-3 — la linguetta Scheletri: si accende solo se la vista riceve
   * l'elenco degli scheletri (anche vuoto). Senza elenco resta spenta. */
  if (Array.isArray(r.scheletri)) {
    const paneScheletri = n(doc, "div", "pr-pannello");
    paneScheletri.hidden = true;
    paneScheletri.appendChild(pannelloScheletri(doc, r));
    pannelli.appendChild(paneScheletri);
  }

  c.appendChild(pannelli);
  accendi(0);

  return c;
}

/* La vista riceve il riepilogo già calcolato da comune/programma.js: schede ed
 * esercizi arrivano dai documenti v2, i numeri dai logbook. */
/* ---------- B.17: la cornice delle superserie ----------------------------- */

/* I tratti di fila della superserie, letti dalle righe della tabella: una
 * corsa di righe consecutive marcate in-sup con lo stesso sup. Contano solo
 * gli esercizi (le figlie tecniche stanno nella cornice del padre) e servono
 * almeno due: un tratto di una riga sola non ha cornice. */
function trattiCornice(corpo) {
  const tratti = [];
  let corrente = null;
  const chiudi = () => {
    if (corrente && corrente.padri >= 2) tratti.push(corrente);
    corrente = null;
  };
  for (let i = 0; i < corpo.children.length; i += 1) {
    const r = corpo.children[i];
    const nome = String(r.className || "");
    if (nome.indexOf("in-sup") === -1) { chiudi(); continue; }
    const sup = r.getAttribute("data-sup") || "";
    if (corrente && corrente.sup !== sup) chiudi();
    if (!corrente) corrente = { sup: sup, padri: 0, prima: r, ultima: r, giunzioni: [] };
    if (nome.indexOf("p8-tec") === -1) {
      if (corrente.padri > 0) corrente.giunzioni.push([corrente.ultima, r]);
      corrente.padri += 1;
    }
    corrente.ultima = r;
  }
  chiudi();
  return tratti;
}

/* L'icona «ripeti» del Material, quella del tasto: la usa il cerchietto
 * della giunzione, colorata dal CSS con var(--sup-cornice-a). */
function iconaRipeti(doc) {
  const s = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("class", "sup-giunzione-ic");
  s.setAttribute("viewBox", "0 0 24 24");
  s.setAttribute("width", "12");
  s.setAttribute("height", "12");
  s.setAttribute("aria-hidden", "true");
  s.setAttribute("fill", "currentColor");
  const p = doc.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", "M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z");
  s.appendChild(p);
  return s;
}

/* Ridisegna (o toglie) le cornici dentro il contenitore .p8-scroll: un
 * div.sup-cornice per tratto, misurato sulle righe vere, larga tutta la
 * tabella, con 2px di margine fra cornici vicine. Scheda non visibile o
 * riga non trovata: nessuna cornice, nessun errore. Restituisce quante
 * cornici ha disegnato. */
function aggiornaCornici(doc, box) {
  if (!box || typeof box.querySelector !== "function") return 0;
  const t = box.querySelector(".p8-tab");
  if (!t) return 0;
  const vecchie = [];
  for (let i = 0; i < box.children.length; i += 1) {
    const nome2 = String(box.children[i].className || "");
    if (nome2.indexOf("sup-cornice") !== -1 || nome2.indexOf("sup-giunzione") !== -1) vecchie.push(box.children[i]);
  }
  for (let i = 0; i < vecchie.length; i += 1) box.removeChild(vecchie[i]);
  const corpo = t.querySelector("tbody");
  if (!corpo) return 0;
  const tratti = trattiCornice(corpo);
  if (!tratti.length) return 0;
  if (!t.offsetWidth) return 0; /* scheda non visibile: niente cornici */
  const Vista = doc && doc.defaultView ? doc.defaultView : null;
  let grad = false;
  if (Vista && Vista.CSS && typeof Vista.CSS.supports === "function") {
    try {
      grad = Vista.CSS.supports("mask-composite", "exclude") || Vista.CSS.supports("-webkit-mask-composite", "xor");
    } catch (err) { grad = false; }
  }
  const topNelBox = (el) => {
    let y = 0;
    let x = el;
    while (x && x !== box) { y += Number(x.offsetTop) || 0; x = x.offsetParent; }
    return y;
  };
  const sinistraNelBox = (el) => {
    let x = 0;
    let q = el;
    while (q && q !== box) { x += Number(q.offsetLeft) || 0; q = q.offsetParent; }
    return x;
  };
  const larghezza = Number(t.offsetWidth) || 0;
  let quante = 0;
  for (let i = 0; i < tratti.length; i += 1) {
    const cima = topNelBox(tratti[i].prima) + 2;
    const fondo = topNelBox(tratti[i].ultima) + (Number(tratti[i].ultima.offsetHeight) || 0) - 2;
    if (fondo - cima <= 0) continue;
    const f = n(doc, "div", "sup-cornice" + (grad ? " sup-cornice-grad" : ""));
    f.style.top = cima + "px";
    f.style.left = "0px";
    f.style.width = larghezza + "px";
    f.style.height = (fondo - cima) + "px";
    f.style.pointerEvents = "none";
    box.appendChild(f);
    quante += 1;
    const giunzioni = tratti[i].giunzioni || [];
    for (let g = 0; g < giunzioni.length; g += 1) {
      const sopra = giunzioni[g][0];
      const sotto = giunzioni[g][1];
      const linea = topNelBox(sopra) + (Number(sopra.offsetHeight) || 0);
      const centro = (linea + topNelBox(sotto)) / 2;
      /* Passo B.19: il cerchio sta AL POSTO del bottone ab-sup della riga
       * di sopra (quello che collega e scollega), nascosto dal CSS quando
       * la sup e' attiva: centro orizzontale sul bottone, cliccabile come
       * lui. Bottone non misurabile: resta sul bordo sinistro. */
      const bSup = sopra.querySelector(".ab-sup");
      const centroX = bSup && (Number(bSup.offsetWidth) || 0) > 0
        ? sinistraNelBox(bSup) + (Number(bSup.offsetWidth) || 0) / 2
        : null;
      const c = n(doc, "div", "sup-giunzione" + (grad ? " sup-giunzione-grad" : ""));
      c.style.top = (centro - 10) + "px";
      c.style.left = (centroX == null ? 1 : centroX - 10) + "px";
      c.style.pointerEvents = "auto";
      c.setAttribute("role", "button");
      c.setAttribute("title", "superserie: collega o scollega l'esercizio sotto");
      c.addEventListener("click", () => { if (bSup && !bSup.disabled) bSup.click(); });
      c.appendChild(iconaRipeti(doc));
      box.appendChild(c);
    }
  }
  return quante;
}

/* La cornice si ricalcola da sola: la prima volta dopo il montaggio della
 * scheda, poi a ogni cambio di misura del contenitore (testo che va a capo,
 * tecnica aggiunta, finestra ridimensionata, scheda che si accende). */
export function corniciScheda(box) {
  if (!box || typeof box.querySelector !== "function") return 0;
  const doc = box.ownerDocument;
  const quante = aggiornaCornici(doc, box);
  const Vista = doc && doc.defaultView ? doc.defaultView : null;
  if (Vista && typeof Vista.ResizeObserver === "function" && !box.__supObs) {
    box.__supObs = new Vista.ResizeObserver(() => { aggiornaCornici(doc, box); });
    box.__supObs.observe(box);
  }
  return quante;
}

export function renderProgramma(doc, contenitore, modello, calcoli) {
  modificaCorrente = (calcoli && calcoli.modifica) || (modello && modello.modifica) || modificaCorrente;
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
    fonteSchede: r.fonteSchede || null,
    modifica: r.modifica || null,
    /* extra-3 — la raccolta degli scheletri: senza questa riga la linguetta
     * Scheletri resta spenta anche quando la raccolta c'e'. */
    scheletri: Array.isArray(r.scheletri) ? r.scheletri : null,
    /* Passo 41 — i programmi di B per il tasto «Cambia». */
    altriProgrammi: Array.isArray(r.altriProgrammi) ? r.altriProgrammi : [],
    /* Passo 21 — il programma aperto e le sue progressioni custom: senza
     * queste due righe il pannello non può né mostrarle né salvarle. */
    progressioni: r.progressioni && typeof r.progressioni === "object"
      ? { id: String(r.progressioni.id || ""), custom: Array.isArray(r.progressioni.custom) ? r.progressioni.custom : [] }
      : null
  };
  contenitore.appendChild(testata(doc, pieno.modifica));
  const tre = n(doc, "div", "pr-grid");
  tre.appendChild(cartaProgramma(doc, pieno));
  tre.appendChild(cartaRotazione(doc, pieno));
  contenitore.appendChild(tre);
  contenitore.appendChild(cartaStato(doc, pieno));
  contenitore.appendChild(schede(doc, Object.assign({}, pieno, { prestazioni: r.prestazioni })));
  const scatole = contenitore.querySelectorAll(".p8-scroll");
  for (let i = 0; i < scatole.length; i += 1) corniciScheda(scatole[i]);
  stampeCollegate(doc, r);
  return contenitore;
}

/* ---------- Fase 1: la riga della tecnica e il suo pannello --------------- */

/* Passo B.11, spostato in capsula dal B.13: il nome della tecnica come si legge
/* dentro la bolla: "REST-PAUSE" diventa "Rest pause", "MYO-REPS" "Myo reps". */
function nomeTecnicaCorsivo(id) {
  const chiave = String(id == null ? "" : id).trim();
  if (!chiave) return "";
  const parole = String(nomeTecnica(chiave) || chiave).toLowerCase().split(/[\s\-_]+/).filter(Boolean);
  if (!parole.length) return "";
  return parole.map(function (p, i) { return i === 0 ? p.charAt(0).toUpperCase() + p.slice(1) : p; }).join(" ");
}
function rigaTecnicaVista(doc, scheda, padre, riga, indice, mod, numero, inScarico, tono, nelGruppo) {
  if (!riga || riga.padreId !== String(padre.id || "") || !riga.tecnica) return null;
  const tr = n(doc, "tr", "p8-r p8-tec " + tono);
  if (nelGruppo === true) tr.className = tr.className + " in-sup";
  tr.setAttribute("data-sup", String((padre && padre.sup) || ""));
  tr.setAttribute("data-js", String(indice + 1));
  tr.setAttribute("data-tecnica", String(riga.id || ""));
  tr.appendChild(n(doc, "td", "c-js", "\u21b3"));

  /* Passo B.11: la lettera del distretto, la stessa del padre: da sola, la  */
  /* riga figlia non diceva piu' a quale esercizio apparteneva.              */
  const dist = n(doc, "td", "c-dist");
  dist.appendChild(n(doc, "span", "dist", codiceDistretto(padre.muscolo)));
  tr.appendChild(dist);

  const ese = n(doc, "td", "c-ese");
  const nome = n(doc, "div", "ese-name");
  const p8ese = n(doc, "span", "p8-ese");
  /* Passo B.11: prima il nome dell'esercizio a cui la tecnica appartiene. */
  p8ese.appendChild(n(doc, "span", "p8-t tec-padre", nomePulito(padre["nome"])));
  /* Passo B.13: la tecnica si legge UNA volta sola, in corsivo dentro la capsula. */
  const badge = mod
    ? pulsanteVivo(doc, "tec-badge", nomeTecnicaCorsivo(riga.tecnica), "parametri della tecnica", () => apriPannelloTecnica(doc, badge, scheda, padre, riga, mod))
    : pulsanteSpento(doc, "tec-badge", nomeTecnicaCorsivo(riga.tecnica), "parametri della tecnica");
  p8ese.appendChild(badge);
  /* Passo B.6: la X della figlia. Cancella la sola tecnica con la voce di
   * registro «cancella-riga» (la stessa del pannello), quindi Annulla la
   * rimette; con l'editor spento la X e' spenta e non scrive. */
  p8ese.appendChild(mod
    ? pulsanteVivo(doc, "tec-x", "✕", "cancella la riga della tecnica", () => mod.onCambia({
      idScheda: scheda.id, idEsercizio: riga.id,
      esercizio: "↳ " + nomeTecnica(riga.tecnica), campo: "rimozione-tecnica"
    }))
    : pulsanteSpento(doc, "tec-x", "✕", "cancella la riga della tecnica"));
  nome.appendChild(p8ese);
  ese.appendChild(nome);

  const chips = n(doc, "div", "ese-chips");
  ese.appendChild(chips);
  const chips2 = n(doc, "div", "ese-chips2");
  chips2.style.display = "none";
  ese.appendChild(chips2);
  tr.appendChild(ese);

  /* La nota: quella scritta a mano vince; il link la rimette automatica. */
  const nota = n(doc, "td", "c-note");
  nota.appendChild(n(doc, "span", "p8-note", nomePulito(notaVisibile(riga))));
  tr.appendChild(nota);

  /* REC dai parametri, solo vista: "3 resp." non e' un recupero scrivibile
   * e non deve passare dal validatore delle celle. Niente freccette. */
  const rec = n(doc, "td", "c-rec");
  rec.appendChild(n(doc, "span", "rec", recTecnica(riga) || "\u2014"));
  tr.appendChild(rec);

  const tut = n(doc, "td", "c-tut");
  tut.appendChild(n(doc, "span", "tut", "\u2014"));
  tr.appendChild(tut);

  const settimane = Array.isArray(riga.settimane) ? riga.settimane : [];
  for (let k = 0; k < numero; k += 1) {
    const sc = inScarico(k) ? " sc-col" : "";
    const sett = settimane[k] || {};
    const ser = n(doc, "td", "c-ser" + sc);
    const serSpan = n(doc, "span", "", sett.serie == null ? "\u2014" : nomePulito(sett.serie));
    if (mod) rendiCellaModificabile(doc, serSpan, mod, {
      idScheda: scheda.id, codice: scheda.codice, esercizio: "\u21b3 " + nomeTecnica(riga.tecnica),
      idEsercizio: riga.id, indice: indice, settimana: k + 1,
      campo: "tecnica-settimana", campoCella: "serie", prima: sett.serie == null ? "" : String(sett.serie)
    });
    ser.appendChild(serSpan);
    tr.appendChild(ser);
    const rip = n(doc, "td", "c-reps" + sc);
    const ripSpan = n(doc, "span", "", sett.reps == null ? "\u2014" : nomePulito(sett.reps));
    if (mod) rendiCellaModificabile(doc, ripSpan, mod, {
      idScheda: scheda.id, codice: scheda.codice, esercizio: "\u21b3 " + nomeTecnica(riga.tecnica),
      idEsercizio: riga.id, indice: indice, settimana: k + 1,
      campo: "tecnica-settimana", campoCella: "reps", prima: sett.reps == null ? "" : String(sett.reps)
    });
    rip.appendChild(ripSpan);
    tr.appendChild(rip);
  }
  tr.appendChild(n(doc, "td", "c-ult", "\u2014"));
  return tr;
}

/* Il pannello del piu' rotondo: le tre voci, i parametri, la nota. Piccolo,
 * ancorato al bottone, si chiude cliccando fuori. */
function apriPannelloTecnica(doc, ancora, scheda, padre, riga, mod) {
  const win = doc.defaultView;
  const vecchio = doc.querySelector(".tec-panel-b");
  if (vecchio) vecchio.remove();
  const p = n(doc, "div", "tec-panel-b");
  p.setAttribute("data-tecnica-panel", "true");

  const titolo = n(doc, "div", "tec-titolo", "Tecniche di intensit\u00e0");
  p.appendChild(titolo);
  const ricarica = function () { apriPannelloTecnica(doc, ancora, scheda, padre, null, mod); };

  elencoTecniche().forEach((v) => {
    const scelta = riga && riga.tecnica === v.id;
    const voce = n(doc, "button", "tec-voce" + (scelta ? " on" : ""));
    voce.type = "button";
    voce.textContent = (scelta ? "\u2713 " : "") + v.id;
    voce.addEventListener("click", () => {
      p.remove();
      if (scelta) return;
      if (!riga) {
        mod.onCambia({ idScheda: scheda.id, campo: "aggiunta-tecnica", idEsercizio: padre.id, esercizio: nomePulito(padre["nome"]), tecnica: v.id });
      } else {
        mod.onCambia({ idScheda: scheda.id, campo: "tecnica-cambia", idEsercizio: riga.id, tecnica: v.id });
      }
    });
    p.appendChild(voce);
  });

  if (riga) {
    /* i parametri, un campo per riga */
    const pp = riga.parametri && typeof riga.parametri === "object" ? riga.parametri : {};
    const scatola = n(doc, "div", "tec-parametri");
    const campi = riga.tecnica === "drop-set"
      ? [{ chiave: "scalate", etichetta: "Scalate (%)", valore: (pp.scalate || []).join(", ") }]
      : riga.tecnica === "rest-pause"
        ? [
          { chiave: "riprese", etichetta: "Riprese", valore: pp.riprese },
          { chiave: "recuperoSec", etichetta: "Recupero (″)", valore: pp.recuperoSec },
          { chiave: "maxRiprese", etichetta: "Max riprese", valore: pp.maxRiprese }
        ]
        : [
          { chiave: "attivazione", etichetta: "Attivazione", valore: pp.attivazione },
          { chiave: "rir", etichetta: "RIR", valore: pp.rir },
          { chiave: "ripMini", etichetta: "Mini-serie", valore: pp.ripMini },
          { chiave: "recupero.respiri", etichetta: "Recupero (respiri)", valore: pp.recupero ? pp.recupero.respiri : 3 },
          { chiave: "maxMini", etichetta: "Max mini-serie", valore: pp.maxMini }
        ];
    campi.forEach((c) => {
      const rigaC = n(doc, "label", "tec-campo");
      rigaC.appendChild(n(doc, "span", "tec-lab", c.etichetta));
      const inp = doc.createElement("input");
      inp.type = "text";
      inp.value = c.valore == null ? "" : String(c.valore);
      inp.className = "tec-in";
      inp.setAttribute("data-chiave", c.chiave);
      rigaC.appendChild(inp);
      scatola.appendChild(rigaC);
    });
    const salvaPar = n(doc, "button", "tec-salva");
    salvaPar.type = "button";
    salvaPar.textContent = "Salva parametri";
    salvaPar.addEventListener("click", () => {
      const parametri = {};
      if (riga.tecnica === "drop-set") {
        parametri.scalate = [];
        scatola.querySelectorAll("input").forEach((inp) => {
          String(inp.value || "").split(",").forEach((pez) => {
            const nn = Number(pez.trim());
            if (Number.isFinite(nn) && nn > 0) parametri.scalate.push(nn);
          });
        });
      } else {
        scatola.querySelectorAll("input").forEach((inp) => {
          const chiave = inp.getAttribute("data-chiave");
          const grezzo = inp.value.trim();
          const valore = grezzo === "" ? null : (Number.isFinite(Number(grezzo)) && grezzo !== "" ? Number(grezzo) : grezzo);
          if (chiave.indexOf(".") !== -1) {
            const parti = chiave.split(".");
            if (!parametri[parti[0]]) parametri[parti[0]] = {};
            parametri[parti[0]][parti[1]] = valore;
          } else {
            parametri[chiave] = valore;
          }
        });
      }
      p.remove();
      mod.onCambia({ idScheda: scheda.id, campo: "tecnica-parametri", idEsercizio: riga.id, parametri: parametri });
    });
    scatola.appendChild(salvaPar);
    p.appendChild(scatola);

    /* la nota: manuale vincente, con il ripristino */
    const etNota = n(doc, "div", "tec-lab", "Nota");
    p.appendChild(etNota);
    const ta = doc.createElement("textarea");
    ta.className = "tec-nota";
    ta.value = notaVisibile(riga);
    p.appendChild(ta);
    const salvaNota = n(doc, "button", "tec-salva");
    salvaNota.type = "button";
    salvaNota.textContent = "Salva nota";
    salvaNota.addEventListener("click", () => {
      p.remove();
      mod.onCambia({ idScheda: scheda.id, campo: "tecnica-nota", idEsercizio: riga.id, manuale: ta.value });
    });
    p.appendChild(salvaNota);

    const via = n(doc, "button", "tec-voce tec-via");
    via.type = "button";
    via.textContent = "\u2715 Rimuovi tecnica";
    via.addEventListener("click", () => {
      p.remove();
      mod.onCambia({ idScheda: scheda.id, campo: "rimozione-tecnica", idEsercizio: riga.id });
    });
    p.appendChild(via);
  }

  doc.body.appendChild(p);
  if (ancora && ancora.getBoundingClientRect && win) {
    const r = ancora.getBoundingClientRect();
    p.style.left = Math.round(r.left) + "px";
    p.style.top = Math.round(r.bottom + 6 + (win.pageYOffset || 0)) + "px";
  }
  const chiudi = (ev) => {
    if (p.contains(ev.target) || (ev.target === ancora) || (ancora && ancora.contains(ev.target))) return;
    p.remove();
    doc.removeEventListener("mousedown", chiudi, true);
  };
  doc.addEventListener("mousedown", chiudi, true);
  return p;
}

/* ---------- Stampa compatta (passo B.20, richiesta di Alice) -------------- */

/* La stampa NON scrive niente nei dati: legge il programma attivo e costruisce
 * un contenitore di stampa al clic, tolto dopo (afterprint con ripiego a tempo).
 * Il CSS vive in desktop/index.html (#bd-stampa + @media print): a schermo il
 * contenitore non si vede, in stampa escono fogli A4 ORIZZONTALI in bianco e
 * nero, una pagina per scheda, tutte le settimane in fila. */

const ST_LIMITE_PX = 718; /* A4 orizzontale: 190mm stampabili a 96dpi */
const ST_CORPO_MAX = 11;  /* corpo iniziale dei fogli, in pt */
const ST_CORPO_MIN = 7;   /* minimo prima di passare a una seconda pagina */
const ST_SETUP_MAX = 60;  /* la Descr./Setup si accorcia a 60 caratteri */

/* La Descr./Setup accorciata: conteggio dei caratteri (String.length), taglio
 * a 60 con ecmds finale sulla parola; se entra, resta intatta. */
function accorciaSetup(testo, massima) {
  const t = nomePulito(testo);
  const max = massima || ST_SETUP_MAX;
  if (t.length <= max) return t;
  return t.slice(0, max - 1).replace(/\s+\S*$/, "") + "\u2026";
}

/* Le etichette delle superserie sulla carta: gruppi di almeno due esercizi vivi
 * di fila con lo stesso campo sup = SS1, SS2... nell'ordine dello schermo. */
function etichetteSup(elenco) {
  const etichette = Object.create(null);
  const vive = (elenco || []).filter((e) => e && typeof e === "object" && !e.deletedAt && !String(e.padreId || ""));
  let numero = 0;
  let k = 0;
  while (k < vive.length) {
    const sup = String(vive[k].sup || "");
    let fine = k + 1;
    while (fine < vive.length && sup && String(vive[fine].sup || "") === sup) fine += 1;
    if (sup && fine - k >= 2) {
      numero += 1;
      for (let i = k; i < fine; i += 1) etichette[String(vive[i].id || "")] = "SS" + numero;
    }
    k = fine;
  }
  return etichette;
}

/* Quante serie prescritte in una cella: il primo numero della cella (3 serie =
 * 3 caselle); senza numero, una sola. */
function serieDaCella(testo) {
  const m = String(testo == null ? "" : testo).match(/\d+/);
  if (!m) return 1;
  return Math.min(10, Math.max(1, parseInt(m[0], 10)));
}

function haTest(perRiga) {
  return settimaneTestDiRiga(perRiga).length > 0;
}

/* Un foglio deve stare in UNA pagina: si abbassa il corpo per gradi fino al
 * minimo di 7pt prima di mandare niente in seconda pagina. */
function tagliaCorpo(pagina, limite) {
  let corpo = ST_CORPO_MAX;
  pagina.style.fontSize = corpo + "pt";
  while (pagina.scrollHeight > (limite || ST_LIMITE_PX) && corpo > ST_CORPO_MIN) {
    corpo = Math.max(ST_CORPO_MIN, corpo - 0.5);
    pagina.style.fontSize = corpo + "pt";
  }
  return corpo;
}

function numeroSettimane(scheda) {
  return Math.max(8, ...(scheda.esercizi || []).map((e) => ((e.prescrizione && e.prescrizione.elencoSettimane) || []).length));
}

function dataStampa() {
  return new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function testaStampa(doc, r, titolo) {
  const testa = n(doc, "div", "st-testa", "");
  testa.appendChild(n(doc, "h1", "st-prog", nomePulito(r.profilo && r.profilo.nome) || NON));
  testa.appendChild(n(doc, "h2", "st-scheda", titolo));
  testa.appendChild(n(doc, "span", "st-data", "Stampa del " + dataStampa()));
  return testa;
}

function rigaCompatta(doc, scheda, e, perRiga, numero, etichettaJs, figlia) {
  const tr = n(doc, "tr", figlia ? "st-riga st-figlia" : "st-riga", "");
  tr.appendChild(n(doc, "td", "st-js", etichettaJs));
  tr.appendChild(n(doc, "td", "st-dist", figlia ? codiceDistretto(e.muscolo) : codiceDistretto(e.muscolo)));
  const ese = n(doc, "td", "st-ese", "");
  if (figlia) {
    ese.appendChild(n(doc, "span", "st-tecnica", "\u21b3 " + nomeTecnicaCorsivo(e.tecnica)));
  } else {
    ese.appendChild(n(doc, "span", "st-nome", nomePulito(e.nome)));
    const setup = accorciaSetup(nomePulito(e.nota));
    if (setup) ese.appendChild(n(doc, "div", "st-setup", setup));
    if (haTest(perRiga)) ese.appendChild(n(doc, "span", "st-test", "")).appendChild(n(doc, "i", "", "")).parentNode.appendChild(n(doc, "span", "st-test-parola", "Test"));
  }
  tr.appendChild(ese);
  const recTesto = String((e.prescrizione && e.prescrizione.recupero) || "").trim();
  const tutTesto = String((e.prescrizione && e.prescrizione.tempo) || "").trim();
  const recParti = separaRecupero(recTesto);
  const tutParti = separaTempo(tutTesto);
  const recMostrato = nomePulito(recParti.valore);
  const tutMostrato = nomePulito(tutParti.valore);
  tr.appendChild(n(doc, "td", "st-rec", recMostrato ? recuperoVisibile(recMostrato).testo : "\u2014"));
  tr.appendChild(n(doc, "td", "st-tut", tutMostrato || "\u2014"));
  (perRiga || []).forEach((s) => {
    tr.appendChild(n(doc, "td", "st-ser", nomePulito(s.serie) || "\u2014"));
    tr.appendChild(n(doc, "td", "st-reps", nomePulito(s.ripetizioni) || "\u2014"));
  });
  return tr;
}

function costruisciCompatta(doc, r, codici) {
  if (!r || !(r.schede || []).length) return null;
  const box = n(doc, "div", "st-box", "");
  (r.schede || []).forEach((scheda) => {
    if (!scheda || !scheda.codice || codici.indexOf(scheda.codice) === -1) return;
    const numero = numeroSettimane(scheda);
    const pagina = n(doc, "div", "st-pagina", "");
    pagina.appendChild(testaStampa(doc, r, "Scheda " + scheda.codice + suffissoNome(scheda)));
    const t = n(doc, "table", "st-tab st-compatta", "");
    const cg = n(doc, "colgroup", "", "");
    ["st-w-js", "st-w-dist", "st-w-ese", "st-w-rec", "st-w-tut"].forEach(() => cg.appendChild(n(doc, "col", "", "")));
    for (let i = 0; i < numero; i += 1) { cg.appendChild(n(doc, "col", "", "")); cg.appendChild(n(doc, "col", "", "")); }
    t.appendChild(cg);
    const thead = n(doc, "thead", "", "");
    const rigaH = n(doc, "tr", "", "");
    ["JS", "DIST.", "ESERCIZIO", "REC.", "TUT"].forEach((testo) => rigaH.appendChild(n(doc, "th", "", testo)));
    for (let i = 0; i < numero; i += 1) {
      const th = n(doc, "th", "st-wk", "S" + (i + 1));
      th.colSpan = 2;
      rigaH.appendChild(th);
    }
    thead.appendChild(rigaH);
    const rigaH2 = n(doc, "tr", "", "");
    for (let i = 0; i < numero; i += 1) { rigaH2.appendChild(n(doc, "th", "st-sub", "ser")); rigaH2.appendChild(n(doc, "th", "st-sub", "reps")); }
    thead.appendChild(rigaH2);
    t.appendChild(thead);
    const corpo = n(doc, "tbody", "", "");
    const etichette = etichetteSup(scheda.esercizi || []);
    let indice = 0;
    const tecniche = scheda.tecniche || [];
    (scheda.esercizi || []).forEach((e) => {
      if (!e || typeof e !== "object" || e.deletedAt) return;
      indice += 1;
      const sett = settimanePerTabella((e.prescrizione && e.prescrizione.elencoSettimane) || [], numero);
      corpo.appendChild(rigaCompatta(doc, scheda, e, sett, numero, etichette[String(e.id || "")] || (scheda.codice || "") + indice, false));
      /* le figlie tecniche del padre, sotto il padre, col nome in corsivo */
      tecniche.forEach((riga) => {
        if (!riga || String(riga.padreId || "") !== String(e.id || "")) return;
        const settTecnica = settimanePerTabella(riga.settimane || [], numero);
        corpo.appendChild(rigaCompatta(doc, scheda, { muscolo: e.muscolo, tecnica: riga.tecnica, prescrizione: { recupero: "", tempo: "", elencoSettimane: riga.settimane || [] } }, settTecnica, numero, "\u21b3", true));
      });
    });
    t.appendChild(corpo);
    pagina.appendChild(t);
    box.appendChild(pagina);
  });
  return box.children.length ? box : null;
}

/* ---------- Stampa da compilare (passo B.20b, richiesta di Alice) -------- */

/* Il foglio da portare in palestra: UNA settimana (quella scelta nella
 * finestrella), una pagina per scheda, e per ogni riga una fila di caselle
 * VUOTE da spuntare a mano (una per serie prescritta, mai meno di 14x8 mm)
 * piu' una colonna Note da scrivere di pugno. Come la compatta legge soltanto:
 * il contenitore si costruisce al clic e si toglie dopo la stampa. */
const ST_CASELLA_MAX = 10; /* oltre dieci serie la fila va a capo invece di stringersi */

/* La prescrizione della settimana scelta, in forma corta: 4x10-8. */
function prescrizioneSettimana(sett) {
  const serie = nomePulito(sett && sett.serie);
  const reps = nomePulito(sett && sett.ripetizioni);
  if (!serie && !reps) return "";
  if (!serie) return reps;
  if (!reps) return serie;
  return serie + "\u00d7" + reps;
}

/* Le caselle da spuntare: una per serie, tutte vuote. */
/* Quante caselle: le serie della settimana scelta; una tecnica che non le
 * porta eredita quelle del padre (e' una variante della stessa serie). */
function quanteSerie(sett, seriePadre) {
  const scritto = String((sett && sett.serie) || "").trim();
  if (scritto) return serieDaCella(scritto);
  return Math.max(1, Number(seriePadre) || 1);
}

function caselleDaCompilare(doc, quante) {
  const cella = n(doc, "td", "st-caselle", "");
  const numero = Math.min(ST_CASELLA_MAX, Math.max(1, Number(quante) || 1));
  for (let i = 0; i < numero; i += 1) cella.appendChild(n(doc, "span", "st-casella", ""));
  return cella;
}

function rigaCompilare(doc, e, perRiga, etichettaJs, figlia, settimana, seriePadre) {
  const tr = n(doc, "tr", figlia ? "st-riga st-figlia" : "st-riga", "");
  tr.appendChild(n(doc, "td", "st-js", etichettaJs));
  tr.appendChild(n(doc, "td", "st-dist", codiceDistretto(e.muscolo)));
  const ese = n(doc, "td", "st-ese", "");
  if (figlia) {
    ese.appendChild(n(doc, "span", "st-tecnica", "\u21b3 " + nomeTecnicaCorsivo(e.tecnica)));
  } else {
    ese.appendChild(n(doc, "span", "st-nome", nomePulito(e.nome)));
    const setup = accorciaSetup(nomePulito(e.nota));
    if (setup) ese.appendChild(n(doc, "div", "st-setup", setup));
  }
  tr.appendChild(ese);
  const recTesto = String((e.prescrizione && e.prescrizione.recupero) || "").trim();
  const tutTesto = String((e.prescrizione && e.prescrizione.tempo) || "").trim();
  const recMostrato = nomePulito(separaRecupero(recTesto).valore);
  const tutMostrato = nomePulito(separaTempo(tutTesto).valore);
  tr.appendChild(n(doc, "td", "st-rec", recMostrato ? recuperoVisibile(recMostrato).testo : "\u2014"));
  tr.appendChild(n(doc, "td", "st-tut", tutMostrato || "\u2014"));
  const sett = (perRiga || [])[settimana - 1] || {};
  const presc = n(doc, "td", "st-presc", "");
  const testoPresc = prescrizioneSettimana(sett);
  presc.appendChild(n(doc, "span", "st-presc-testo", testoPresc || "\u2014"));
  if (haTest([sett])) {
    presc.appendChild(n(doc, "span", "st-test", "")).appendChild(n(doc, "i", "", "")).parentNode.appendChild(n(doc, "span", "st-test-parola", "Test"));
  }
  tr.appendChild(presc);
  tr.appendChild(caselleDaCompilare(doc, quanteSerie(sett, seriePadre)));
  tr.appendChild(n(doc, "td", "st-note-cella", ""));
  return tr;
}

function costruisciCompilare(doc, r, codici, settimana) {
  if (!r || !(r.schede || []).length) return null;
  const scelta = Math.min(8, Math.max(1, Number(settimana) || 1));
  const box = n(doc, "div", "st-box", "");
  (r.schede || []).forEach((scheda) => {
    if (!scheda || !scheda.codice || codici.indexOf(scheda.codice) === -1) return;
    const numero = numeroSettimane(scheda);
    const pagina = n(doc, "div", "st-pagina st-compilare", "");
    pagina.appendChild(testaStampa(doc, r, "Scheda " + scheda.codice + suffissoNome(scheda) + " \u00b7 Settimana S" + scelta));
    const t = n(doc, "table", "st-tab st-tab-compilare", "");
    const cg = n(doc, "colgroup", "", "");
    ["11mm", "13mm", "46mm", "11mm", "10mm", "18mm"].forEach((larghezza) => {
      const c = n(doc, "col", "", "");
      c.style.width = larghezza;
      cg.appendChild(c);
    });
    cg.appendChild(n(doc, "col", "", "")); /* le caselle prendono lo spazio che resta */
    const cn = n(doc, "col", "", "");
    cn.style.width = "22mm";
    cg.appendChild(cn);
    t.appendChild(cg);
    const thead = n(doc, "thead", "", "");
    const rigaH = n(doc, "tr", "", "");
    ["JS", "DIST.", "ESERCIZIO", "REC.", "TUT", "PRESCR. S" + scelta, "SERIE FATTE (spunta a mano)", "NOTE"].forEach((testo) => rigaH.appendChild(n(doc, "th", "", testo)));
    thead.appendChild(rigaH);
    t.appendChild(thead);
    const corpo = n(doc, "tbody", "", "");
    const etichette = etichetteSup(scheda.esercizi || []);
    let indice = 0;
    const tecniche = scheda.tecniche || [];
    (scheda.esercizi || []).forEach((e) => {
      if (!e || typeof e !== "object" || e.deletedAt) return;
      indice += 1;
      const sett = settimanePerTabella((e.prescrizione && e.prescrizione.elencoSettimane) || [], numero);
      const seriePadre = serieDaCella((sett[scelta - 1] || {}).serie);
      corpo.appendChild(rigaCompilare(doc, e, sett, etichette[String(e.id || "")] || (scheda.codice || "") + indice, false, scelta, seriePadre));
      /* le figlie tecniche del padre, sotto il padre, col nome in corsivo */
      tecniche.forEach((riga) => {
        if (!riga || String(riga.padreId || "") !== String(e.id || "")) return;
        const settTecnica = settimanePerTabella(riga.settimane || [], numero);
        corpo.appendChild(rigaCompilare(doc, { muscolo: e.muscolo, tecnica: riga.tecnica, prescrizione: { recupero: "", tempo: "", elencoSettimane: riga.settimane || [] } }, settTecnica, "\u21b3", true, scelta, seriePadre));
      });
    });
    t.appendChild(corpo);
    pagina.appendChild(t);
    pagina.appendChild(n(doc, "div", "st-nota-modulo", "Una casella per serie prescritta: si spunta a penna a serie fatta. La colonna Note serve per carico, sensazioni e recuperi."));
    box.appendChild(pagina);
  });
  return box.children.length ? box : null;
}

/* Il contenitore di stampa: costruito, attaccato al corpo, ridotto per stare
 * in pagina, dato in pasto a window.print(), tolto dopo. I dati non cambiano. */
function eseguiStampa(doc, win, tipo, codici, settimana) {
  const vecchio = doc.getElementById("bd-stampa");
  if (vecchio) vecchio.remove();
  const box = tipo === "compilare"
    ? costruisciCompilare(doc, stampaRiepilogo, codici, settimana)
    : costruisciCompatta(doc, stampaRiepilogo, codici);
  if (!box) return;
  box.id = "bd-stampa";
  doc.body.appendChild(box);
  Array.from(box.querySelectorAll(".st-pagina")).forEach((p) => tagliaCorpo(p, ST_LIMITE_PX));
  const via = () => {
    const v = doc.getElementById("bd-stampa");
    if (v) v.remove();
    if (win.removeEventListener) win.removeEventListener("afterprint", via);
  };
  if (win.addEventListener) win.addEventListener("afterprint", via);
  if (typeof win.print === "function") win.print();
  if (win.setTimeout) win.setTimeout(via, 5000);
}

/* La finestrella di scelta: solo le schede esistenti, spuntata quella aperta
 * in quel momento; Stampa spento se nessuna spuntata; Annulla chiude (Esc). */
let stampaRiepilogo = null;
function apriFinestraStampa(doc, tipo) {
  const r = stampaRiepilogo;
  if (!r || !r.profilo || !r.profilo.presente || !(r.schede || []).length) return null;
  const vecchia = doc.querySelector(".st-finestra");
  if (vecchia) vecchia.remove();
  const win = doc.defaultView;
  const f = n(doc, "div", "st-finestra", "");
  const carta = n(doc, "div", "st-finestra-carta", "");
  f.appendChild(carta);
  carta.appendChild(n(doc, "h3", "st-titolo", tipo === "compilare" ? "Stampa da compilare" : "Stampa compatta"));
  const aperta = doc.querySelector(".pr-ntab.on");
  const schedaAperta = aperta && aperta.getAttribute ? String(aperta.getAttribute("data-tab") || "") : "";
  const scelte = n(doc, "div", "st-scelte", "");
  (r.schede || []).forEach((scheda) => {
    if (!scheda || !scheda.codice) return;
    const et = n(doc, "label", "st-scelta", "");
    const cb = doc.createElement("input");
    cb.type = "checkbox";
    cb.value = scheda.codice;
    cb.checked = scheda.codice === schedaAperta;
    et.appendChild(cb);
    et.appendChild(doc.createTextNode("Scheda " + scheda.codice));
    scelte.appendChild(et);
  });
  if (!scelte.querySelector("input:checked")) { const prima = scelte.querySelector("input"); if (prima) prima.checked = true; }
  carta.appendChild(scelte);
  let settimana = 1;
  if (tipo === "compilare") {
    const et = n(doc, "label", "st-scelta st-settimana", "");
    et.appendChild(doc.createTextNode("Settimana "));
    const sel = doc.createElement("select");
    for (let s = 1; s <= 8; s += 1) {
      const op = doc.createElement("option");
      op.value = String(s);
      op.textContent = "S" + s;
      sel.appendChild(op);
    }
    sel.addEventListener("change", () => { settimana = Number(sel.value); });
    et.appendChild(sel);
    carta.appendChild(et);
  }
  const azioni = n(doc, "div", "st-azioni", "");
  const stampa = doc.createElement("button");
  stampa.type = "button";
  stampa.className = "st-bottone";
  stampa.textContent = "Stampa";
  const annulla = doc.createElement("button");
  annulla.type = "button";
  annulla.className = "st-bottone st-annulla";
  annulla.textContent = "Annulla";
  const aggiorna = () => { stampa.disabled = Array.from(scelte.querySelectorAll("input")).filter((cb) => cb.checked).length === 0; };
  scelte.addEventListener("change", aggiorna);
  aggiorna();
  stampa.addEventListener("click", () => {
    const codici = Array.from(scelte.querySelectorAll("input:checked")).map((cb) => cb.value);
    if (!codici.length) return;
    f.remove();
    eseguiStampa(doc, win, tipo, codici, settimana);
  });
  annulla.addEventListener("click", () => f.remove());
  azioni.appendChild(stampa);
  azioni.appendChild(annulla);
  carta.appendChild(azioni);
  doc.body.appendChild(f);
  return f;
}

/* Il gancio a fine renderProgramma: tiene l'ultimo riepilogo e collega i due
 * tasti UNA volta sola per documento. Senza programma attivo i tasti lo dicono
 * e non aprono niente. */
function tastoStampaPerTesto(doc, etichetta) {
  const tasti = doc.querySelectorAll("button");
  for (let i = 0; i < tasti.length; i += 1) {
    const testo = String(tasti[i].textContent || "").trim();
    if (testo === etichetta || testo.indexOf(etichetta + " —") === 0) return tasti[i];
  }
  return null;
}

function stampeCollegate(doc, r) {
  stampaRiepilogo = r;
  const attivo = Boolean(r && r.profilo && r.profilo.presente && (r.schede || []).length);
  const titoli = { compatta: "stampa la scheda come sta adesso, tutte le settimane in fila", compilare: "stampa una settimana con le caselle vuote da spuntare a mano" };
  const dove = [["pr-print1", "Stampa Compatta", "compatta"], ["pr-print2", "Stampa da Compilare", "compilare"]];
  dove.forEach(([id, etichetta, tipo]) => {
    /* Ogni scheda ha la sua barra: i tasti col segno data-stampa possono essere
     * piu' d'uno e si accendono TUTTI. Il ripiego per id regge i documenti
     * vecchi (e i test), quello per parola e' l'ultima spiaggia. */
    const tasti = Array.from(doc.querySelectorAll('[data-stampa="' + tipo + '"]'));
    const perId = doc.getElementById(id);
    if (perId && tasti.indexOf(perId) === -1) tasti.push(perId);
    if (!tasti.length) {
      const perTesto = tastoStampaPerTesto(doc, etichetta);
      if (perTesto) tasti.push(perTesto);
    }
    tasti.forEach((b) => {
      b.textContent = attivo ? etichetta : etichetta + " \u2014 nessun programma attivo";
      b.disabled = !attivo;
      if (attivo) b.removeAttribute("aria-disabled");
      b.title = attivo ? titoli[tipo] : "nessun programma attivo";
      if (!b.__bdStampaTipo) {
        b.__bdStampaTipo = tipo;
        b.addEventListener("click", () => apriFinestraStampa(doc, tipo));
      }
    });
  });
  if (doc.__bdStampeVive) return;
  doc.__bdStampeVive = true;
  const win = doc.defaultView;
  if (win && win.addEventListener) {
    win.addEventListener("keydown", (ev) => {
      if (ev.key !== "Escape" && ev.key !== "Esc") return;
      const f = doc.querySelector(".st-finestra");
      if (f) f.remove();
    });
  }
}

export { accorciaSetup, etichetteSup, serieDaCella, tagliaCorpo, apriFinestraStampa, stampeCollegate, apriSpiegazioni };

/* ---------- B.21 · l'igiene della scheda -------------------------------- */

/* L'id della scheda a cui appartiene un tasto: si cerca la tabella più
 * vicina salendo, così nessuno deve passare l'id dalla barra. */
function idSchedaVicino(bottone) {
  let nodo = bottone;
  for (let i = 0; i < 8 && nodo; i += 1) {
    if (nodo.querySelector) {
      const t = nodo.querySelector(".p8-tab[data-scheda]");
      if (t) return String(t.getAttribute("data-scheda") || "");
    }
    nodo = nodo.parentNode;
  }
  return "";
}

function quanti(n, singolare, plurale) {
  return (Number(n) === 1 ? "1 " + singolare : String(n) + " " + plurale);
}

function chiudiConferma(box) {
  if (box && box.parentNode) box.parentNode.removeChild(box);
}

/* Il riquadro di conferma DENTRO la pagina: niente window.confirm. Il fuoco
 * parte da «Annulla» e Invio non conferma niente: si conferma solo col
 * clic sul tasto rosso. Esc chiude. */
function chiediConferma(doc, opzioni) {
  const o = opzioni || {};
  const bottone = o.bottone;
  const barra = bottone && bottone.parentNode ? bottone.parentNode : null;
  if (!barra) return null;
  const vecchio = barra.querySelector(".pr-conf");
  if (vecchio) chiudiConferma(vecchio);
  const box = n(doc, "div", "pr-conf");
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-label", o.titolo || "conferma");
  if (o.titolo) box.appendChild(n(doc, "p", "pr-conf-titolo", o.titolo));
  (Array.isArray(o.righe) ? o.righe : []).forEach((riga) => box.appendChild(n(doc, "p", "", riga)));
  if (o.avviso) box.appendChild(n(doc, "p", "pr-conf-avviso", o.avviso));
  /* Un solo campo di testo, quando serve un nome (B.21: lo scheletro).
   * Sta dentro la pagina, non in una finestrella del browser. */
  let campoNome = null;
  if (o.campo) {
    box.appendChild(n(doc, "span", "pr-conf-etichetta", o.campo.etichetta || "nome"));
    campoNome = n(doc, "input", "pr-conf-in");
    campoNome.type = "text";
    campoNome.value = String(o.campo.valore == null ? "" : o.campo.valore);
    campoNome.setAttribute("aria-label", o.campo.etichetta || "nome");
    box.appendChild(campoNome);
  }
  const fila = n(doc, "div", "pr-conf-fila");
  const annulla = pulsanteVivo(doc, "pr-btn", "Annulla", "non fare niente", () => {
    chiudiConferma(box);
    if (typeof o.onAnnulla === "function") o.onAnnulla();
  });
  annulla.setAttribute("data-igiene", "annulla");
  fila.appendChild(annulla);
  if (o.conferma) {
    const conferma = pulsanteVivo(doc, "pr-btn" + (o.rosso ? " danger" : ""), o.conferma, o.titolo || "conferma", () => {
      chiudiConferma(box);
      if (typeof o.onConferma === "function") o.onConferma(campoNome ? String(campoNome.value == null ? "" : campoNome.value).trim() : undefined);
    });
    conferma.setAttribute("data-igiene", o.segno || "conferma");
    fila.appendChild(conferma);
  }
  box.appendChild(fila);
  box.addEventListener("keydown", (ev) => {
    if (!ev) return;
    if (ev.key === "Enter" || ev.keyCode === 13) { if (ev.preventDefault) ev.preventDefault(); if (ev.stopPropagation) ev.stopPropagation(); return; }
    if (ev.key === "Escape" || ev.keyCode === 27) { if (ev.preventDefault) ev.preventDefault(); chiudiConferma(box); }
  });
  barra.appendChild(box);
  if (campoNome && campoNome.focus) campoNome.focus();
  else if (annulla.focus) annulla.focus();
  return box;
}

/* PASSO 3d — il rifiuto che non si capiva. Quando il programma che la
 * pagina mostra non e' fra i documenti di B, il motivo lo dice nome e numero:
 * «Il programma «X» non e' fra i documenti di B (in B ce ne sono N)».
 * Il tasto «Porta in B» arriva col port da un programma alla volta: qui non
 * si finge che sia gia' possibile. Il riquadro sta nella pagina, niente
 * finestrelle del browser.
 */
function apriNonInB(doc, bottone, profilo, esito) {
  const nome = nomePulito((profilo || {}).nome) || "questo programma";
  let ancora = bottone;
  if (!ancora || !ancora.parentNode) ancora = doc.querySelector(".pr-acts");
  if (!ancora || !ancora.parentNode) return null;
  const quanti = Number(esito && esito.quantiB);
  const n = Number.isFinite(quanti) ? String(quanti) : "—";
  return chiediConferma(doc, {
    bottone: ancora,
    titolo: "Non ho scritto niente",
    righe: [
      "Il programma «" + nome + "» non e' fra i documenti di B (in B ce ne sono " + n + ").",
      "Lo stato si cambia solo su un programma che sta in B, quindi qui non ho toccato niente.",
      "Per portarlo in B serve la pagina Copia, che legge A: si copia un programma alla volta, e in A non cambia niente."
    ],
    avviso: "In A non si scrive mai.",
    conferma: "Ho capito",
    segno: "non-in-b"
  });
}

import { nomeProposto } from "./scheletri.js";
import { pannelloScheletri } from "./vista-scheletri.js";
import { settimaneDiTest, settimaneTestDiRiga, testoTest } from "./settimane-test.js";

/* B.21 commit 2 — «Salva come scheletro»: la struttura di QUESTA scheda,
 * senza lettera e senza carichi. Il nome lo sceglie Alice qui dentro.
 * Se la scrittura non passa, la pagina lo dice: mai «salvato» per sbaglio. */
function apriSalvaScheletro(doc, bottone) {
  const mod = modificaCorrente;
  if (!mod || typeof mod.onCambia !== "function") { senzaEditor(doc, bottone, { titolo: "Questa scheda non si puo' ancora salvare come scheletro", riga: "La pagina non ha un editor collegato a questa scheda: non ho salvato niente." }); return; }
  const id = idSchedaVicino(bottone);
  const c = typeof mod.conta === "function" ? mod.conta(id) : null;
  const proposto = nomeProposto((c && c.codice) || "", new Date());
  chiediConferma(doc, {
    bottone: bottone,
    titolo: "Salva come scheletro",
    righe: ["Prendo la struttura di questa scheda: esercizi, distretto, serie, ripetizioni, nota, righe tecniche e superserie. Niente carichi e niente Logbook. Non porta la lettera: si potrà applicare a qualunque scheda."],
    campo: { etichetta: "Nome dello scheletro", valore: proposto },
    avviso: "Lo scheletro va nella pagina Scheletri, in B: da lì lo applichi a una scheda quando vuoi.",
    conferma: "Salva",
    segno: "salva-scheletro",
    onConferma: (scelto) => {
      const nome = String(scelto == null ? "" : scelto).trim() || proposto;
            /* La chiamata parte SUBITO (la prova 103.2 conta una chiamata sola al
       * clic), ma un errore sincrono non deve piu' sparire nel nulla: prima
       * la finestrella si chiudeva e non succedeva niente. */
      try {
        const attesa = mod.onCambia({ idScheda: id, campo: "salva-scheletro", nome: nome });
        Promise.resolve(attesa)
          .then((esito) => mostraEsitoScheletro(doc, bottone, esito, nome))
          .catch((e) => mostraEsitoScheletro(doc, bottone, { ok: false, motivo: (e && e.message) || "errore" }, nome));
      } catch (e) {
        mostraEsitoScheletro(doc, bottone, { ok: false, motivo: (e && e.message) || "errore" }, nome);
      }
    }
  });
}

function mostraEsitoScheletro(doc, bottone, esito, nome) {
  const barra = bottone && bottone.parentNode ? bottone.parentNode : null;
  if (!barra) return null;
  let riga = barra.querySelector(".pr-esito");
  if (!riga) { riga = n(doc, "p", "pr-esito"); barra.appendChild(riga); }
  let testo;
  if (esito && esito.ok === true) {
    testo = String(esito.testo || "").trim() || ("Scheletro «" + nome + "» salvato");
  } else {
    const m = String((esito && (esito.motivo || esito.testo)) || "").trim();
    testo = /^Scheletro non salvato/.test(m) ? m : ("Scheletro non salvato: " + (m || "motivo non dichiarato"));
  }
  riga.textContent = testo;
  riga.setAttribute("data-esito", esito && esito.ok === true ? "salvato" : "non-salvato");
  return riga;
}

/* ---------- PASSO 4b \u00b7 copia e sposta esercizi ---------------------------- */

/* Le spunte del riquadro: solo le righe scelte, nell'ordine dell'elenco. */
function eserciziSpuntati(box) {
  return Array.from(box.querySelectorAll("input[data-copia-es]"))
    .filter((i) => i.checked === true)
    .map((i) => String(i.value || ""))
    .filter(Boolean);
}

/* Le righe tecniche che seguono i padri scelti: si contano per la domanda. */
function tecnicheSpuntate(scheda, scelti) {
  const presi = {};
  scelti.forEach((id) => { presi[id] = true; });
  return ((scheda && scheda.tecniche) || []).filter((t) => t && presi[String(t.padreId || "")]).length;
}

function messaggioGruppiTagliati(gruppi) {
  const pezzi = (Array.isArray(gruppi) ? gruppi : []).filter((g) => Array.isArray(g) && g.length).map((g) => "[" + g.join(" + ") + "]");
  if (!pezzi.length) return "";
  return "le superserie spuntate solo in parte arrivano senza legame: " + pezzi.join(", ");
}

function mostraEsitoCopia(doc, barra, testo, salvato) {
  if (!barra) return null;
  let riga = barra.querySelector(".pr-esito");
  if (!riga) { riga = n(doc, "p", "pr-esito"); barra.appendChild(riga); }
  doc.__bdUltimoEsito = String(testo == null ? "" : testo);
  riga.textContent = String(testo == null ? "" : testo);
  riga.setAttribute("data-esito", salvato === true ? "salvato" : "non-salvato");
  return riga;
}

function eseguiCopia(doc, barra, mod, richiesta) {
  return Promise.resolve(mod.copiaEsercizi(richiesta)).then((esito) => {
    if (esito && esito.ok === true) {
      let testo = String(esito.testo || "esercizi copiati");
      const gruppi = messaggioGruppiTagliati(esito.gruppiTagliati);
      if (gruppi) testo += " \u00b7 " + gruppi;
      mostraEsitoCopia(doc, barra, testo, true);
      return;
    }
    if (esito && Array.isArray(esito.doppioni) && esito.doppioni.length) {
      apriDoppioni(doc, barra, mod, richiesta, esito.doppioni);
      return;
    }
    const m = String((esito && (esito.motivo || esito.testo)) || "").trim() || "non ho scritto niente";
    mostraEsitoCopia(doc, barra, m, false);
  }).catch((e) => {
    mostraEsitoCopia(doc, barra, (e && e.message) || "errore", false);
  });
}

/* I doppioni: la pagina mostra QUALI sono e offre due strade valide per tutti
 * i doppioni di questa operazione. Nessuna aggiunta silenziosa, mai. */
function apriDoppioni(doc, barra, mod, richiesta, doppioni) {
  const vecchio = barra.querySelector(".pr-conf");
  if (vecchio) chiudiConferma(vecchio);
  const box = n(doc, "div", "pr-conf");
  box.setAttribute("data-copia-box", "1");
  box.setAttribute("data-doppioni", "1");
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-label", "esercizi gia presenti");
  box.appendChild(n(doc, "p", "pr-conf-titolo", "Ci sono gia', nella scheda di destinazione"));
  box.appendChild(n(doc, "p", "", doppioni.length === 1
    ? "Nella scheda di destinazione c'e' gia' questo esercizio:"
    : "Nella scheda di destinazione ci sono gia' questi esercizi:"));
  const elenco = n(doc, "ul", "pr-conf-doppioni");
  doppioni.forEach((nome) => elenco.appendChild(n(doc, "li", "", nome)));
  box.appendChild(elenco);
  box.appendChild(n(doc, "p", "pr-conf-avviso", "Non ho scritto niente. La scelta vale per tutti i doppioni di questa operazione."));
  const fila = n(doc, "div", "pr-conf-fila");
  fila.appendChild(pulsanteVivo(doc, "pr-btn", "Annulla", "non fare niente", () => chiudiConferma(box)));
  const sost = pulsanteVivo(doc, "pr-btn danger", "Sostituisci", "l'esistente esce e la copia prende il suo posto", () => {
    chiudiConferma(box);
    eseguiCopia(doc, barra, mod, Object.assign({}, richiesta, { doppioni: "sostituisci" }));
  });
  sost.setAttribute("data-copia-scelta", "sostituisci");
  fila.appendChild(sost);
  const agg = pulsanteVivo(doc, "pr-btn", "Aggiungi ugualmente", "resta anche l'esistente", () => {
    chiudiConferma(box);
    eseguiCopia(doc, barra, mod, Object.assign({}, richiesta, { doppioni: "aggiungi" }));
  });
  agg.setAttribute("data-copia-scelta", "aggiungi");
  fila.appendChild(agg);
  box.appendChild(fila);
  box.addEventListener("keydown", (ev) => {
    if (!ev) return;
    if (ev.key === "Escape" || ev.keyCode === 27) { if (ev.preventDefault) ev.preventDefault(); chiudiConferma(box); }
  });
  barra.appendChild(box);
  return box;
}

/* Il riquadro dentro la pagina, in due passi: prima scegli, poi leggi il
 * conto esatto e confermi. Niente finestre del browser, niente Invio che
 * scrive: si conferma solo col clic sul tasto. */
function apriCopiaEsercizi(doc, bottone, scheda, r) {
  const mod = modificaCorrente;
  if (!mod || typeof mod.copiaEsercizi !== "function") { senzaEditor(doc, bottone, { titolo: "Questi esercizi non si possono ancora copiare", riga: "La pagina non ha un editor collegato a questa scheda: non ho copiato niente." }); return null; }
  const barra = bottone && bottone.parentNode ? bottone.parentNode : null;
  if (!barra) return null;
  const aperto = barra.querySelector(".pr-conf");
  if (aperto) chiudiConferma(aperto);

  const box = n(doc, "div", "pr-conf");
  box.setAttribute("data-copia-box", "1");
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-label", "copia esercizi");
  box.appendChild(n(doc, "p", "pr-conf-titolo", "Copia / Sposta esercizi"));
  box.appendChild(n(doc, "p", "pr-conf-partenza", "Dalla Scheda " + scheda.codice + suffissoNome(scheda)));

  const altre = (Array.isArray(r && r.schede) ? r.schede : []).filter((s) => s && String(s.id || "") !== String(scheda.id || ""));
  if (!altre.length) {
    box.appendChild(n(doc, "p", "pr-conf-avviso", "Questo programma non ha altre schede: non c'e' dove copiare."));
    const f0 = n(doc, "div", "pr-conf-fila");
    f0.appendChild(pulsanteVivo(doc, "pr-btn", "Chiudi", "chiudi", () => chiudiConferma(box)));
    box.appendChild(f0);
    barra.appendChild(box);
    return box;
  }

  box.appendChild(n(doc, "span", "pr-conf-etichetta", "Scheda di destinazione"));
  const dest = n(doc, "select", "pr-sel");
  dest.setAttribute("data-pr-c", "copia-destinazione");
  dest.setAttribute("aria-label", "scheda di destinazione");
  altre.forEach((s) => {
    const o = doc.createElement("option");
    o.value = String(s.id || "");
    o.textContent = "Scheda " + s.codice + suffissoNome(s);
    dest.appendChild(o);
  });
  box.appendChild(dest);

  box.appendChild(n(doc, "span", "pr-conf-etichetta", "Esercizi da copiare"));
  const elenco = n(doc, "div", "pr-conf-elenco");
  (scheda.esercizi || []).forEach((e) => {
    const riga = n(doc, "label", "pr-conf-es");
    const c = n(doc, "input", "");
    c.type = "checkbox";
    c.value = String(e.id || ""); c.setAttribute("data-copia-es", String(e.id || ""));
    riga.appendChild(c);
    riga.appendChild(n(doc, "span", "", nomePulito(e.nome || e.name || "")));
    elenco.appendChild(riga);
  });
  box.appendChild(elenco);
  /* Copia o sposta: una scelta sola per tutta l'operazione. Senza scelta
   * esplicita il modo e' «copia», che non toglie niente da dove parte. */
  box.appendChild(n(doc, "span", "pr-conf-etichetta", "Cosa fare"));
  const modi = n(doc, "div", "pr-conf-modi");
  [["copia", "Copia", "l'esercizio resta dov'e' e nasce una copia nell'altra scheda"],
   ["sposta", "Sposta", "l'esercizio esce da questa scheda e va nell'altra"]].forEach((m) => {
    const riga = n(doc, "label", "pr-conf-modo");
    const r = n(doc, "input", "");
    r.type = "radio";
    r.name = "copia-modo";
    r.value = m[0];
    r.setAttribute("data-copia-modo", m[0]);
    if (m[0] === "copia") r.checked = true;
    riga.appendChild(r);
    riga.appendChild(n(doc, "b", "", m[1]));
    riga.appendChild(n(doc, "span", "pr-conf-modo-nota", m[2]));
    modi.appendChild(riga);
  });
  box.appendChild(modi);
  box.appendChild(n(doc, "p", "pr-hint", "Le righe tecniche seguono il loro esercizio."));

  const fila = n(doc, "div", "pr-conf-fila");
  fila.appendChild(pulsanteVivo(doc, "pr-btn", "Annulla", "non fare niente", () => chiudiConferma(box)));
  const avanti = pulsanteVivo(doc, "pr-btn", "Avanti", "guarda il conto prima di scrivere", () => {
    const scelti = eserciziSpuntati(box);
    if (!scelti.length) { mostraEsitoCopia(doc, barra, "Spunta almeno un esercizio: non ho scritto niente.", false); return; }
    const scelta = altre.filter((s) => String(s.id || "") === String(dest.value || ""))[0] || null;
    if (!scelta) { mostraEsitoCopia(doc, barra, "Scegli la scheda di destinazione: non ho scritto niente.", false); return; }
    const tec = tecnicheSpuntate(scheda, scelti);
    const pezzi = [quanti(scelti.length, "esercizio", "esercizi")];
    if (tec) pezzi.push(quanti(tec, "riga tecnica", "righe tecniche"));
    const codici = {};
    (scheda.esercizi || []).forEach((e) => { codici[String(e.id || "")] = true; });
    const radio = box.querySelector('input[data-copia-modo]:checked');
    const sceltoModo = radio && String(radio.value || "") === "sposta" ? "sposta" : "copia";
    const domanda = (sceltoModo === "sposta" ? "Sposti " : "Copi ") + pezzi.join(" e ") +
      " dalla Scheda " + scheda.codice + " alla Scheda " + scelta.codice + "?";
    passoConferma(doc, box, barra, mod, {
      idSchedaPartenza: String(scheda.id || ""),
      idSchedaDestinazione: String(scelta.id || ""),
      idEsercizi: scelti,
      modo: sceltoModo,
      codiceDestinazione: String(scelta.codice || "")
    }, domanda);
  });
  avanti.setAttribute("data-copia-avanti", "1");
  fila.appendChild(avanti);
  box.appendChild(fila);
  box.addEventListener("keydown", (ev) => {
    if (!ev) return;
    if (ev.key === "Escape" || ev.keyCode === 27) { if (ev.preventDefault) ev.preventDefault(); chiudiConferma(box); }
  });
  barra.appendChild(box);
  return box;
}

/* Il secondo passo: il conto esatto e il tasto che scrive. */
function passoConferma(doc, box, barra, mod, richiesta, domanda) {
  while (box.firstChild) box.removeChild(box.firstChild);
  box.appendChild(n(doc, "p", "pr-conf-titolo", "Conferma"));
  box.appendChild(n(doc, "p", "pr-conf-domanda", domanda));
  box.appendChild(n(doc, "p", "pr-conf-avviso", String(richiesta.modo || "copia") === "sposta"
    ? "Si puo' annullare subito dopo, e l'Annulla rimette com'erano tutte e due le schede."
    : "Si puo' annullare subito dopo, e l'Annulla rimette la scheda di destinazione com'era."));
  const fila = n(doc, "div", "pr-conf-fila");
  fila.appendChild(pulsanteVivo(doc, "pr-btn", "Annulla", "non fare niente", () => chiudiConferma(box)));
  const verboConferma = String(richiesta.modo || "copia") === "sposta" ? "Sposta" : "Copia";
  const ok = pulsanteVivo(doc, "pr-btn danger", verboConferma, "scrive davvero: prima la destinazione, poi la partenza", () => {
    chiudiConferma(box);
    eseguiCopia(doc, barra, mod, richiesta);
  });
  ok.setAttribute("data-copia-conferma", "1");
  fila.appendChild(ok);
  box.appendChild(fila);
  return box;
}

function senzaEditor(doc, bottone, azione) {
  const a = azione || {};
  chiediConferma(doc, {
    bottone: bottone,
    titolo: a.titolo || "Questa pagina non sa ancora scrivere",
    righe: [a.riga || "La pagina non ha un editor collegato a questa scheda: non ho fatto niente."],
    conferma: "Chiudi"
  });
}

function apriSvuotaScheda(doc, bottone) {
  const mod = modificaCorrente;
  if (!mod || typeof mod.onCambia !== "function") { senzaEditor(doc, bottone, { titolo: "Questa scheda non si puo' ancora svuotare", riga: "La pagina non ha un editor collegato a questa scheda: non ho fatto niente." }); return; }
  const id = idSchedaVicino(bottone);
  const c = typeof mod.conta === "function" ? mod.conta(id) : null;
  if (c && !c.righe) {
    chiediConferma(doc, {
      bottone: bottone,
      titolo: "Scheda già vuota",
      righe: ["La scheda " + (c.codice || "") + " non ha nessun esercizio da togliere: non ho scritto niente."],
      conferma: "Chiudi"
    });
    return;
  }
  const codice = (c && c.codice) || "questa scheda";
  const conto = c ? (quanti(c.esercizi, "esercizio", "esercizi") + " e " + quanti(c.tecniche, "riga tecnica", "righe tecnica")) : "";
  chiediConferma(doc, {
    bottone: bottone,
    titolo: "Svuota la scheda",
    righe: ["Svuoti la scheda " + codice + (conto ? ": " + conto : "") + "?"],
    avviso: "Puoi annullare solo finché questa pagina resta aperta.",
    conferma: "Svuota",
    rosso: true,
    segno: "svuota",
    onConferma: () => mod.onCambia({ idScheda: id, campo: "svuota-scheda" })
  });
}

function apriSvuotaProgramma(doc, bottone) {
  const mod = modificaCorrente;
  if (!mod || typeof mod.svuotaProgramma !== "function") { senzaEditor(doc, bottone, { titolo: "Il programma non si puo' ancora svuotare", riga: "La pagina non ha un editor collegato a questo programma: non ho svuotato niente." }); return; }
  const c = typeof mod.conta === "function" ? mod.conta("") : null;
  if (c && !c.schede) {
    chiediConferma(doc, {
      bottone: bottone,
      titolo: "Programma già vuoto",
      righe: ["Nessuna scheda ha esercizi da togliere: non ho scritto niente."],
      conferma: "Chiudi"
    });
    return;
  }
  chiediConferma(doc, {
    bottone: bottone,
    titolo: "Svuota tutto il programma",
    righe: ["Svuoti il programma: " + (c ? (quanti(c.schede, "scheda", "schede") + ", " + quanti(c.esercizi, "esercizio", "esercizi") + ", " + quanti(c.tecniche, "riga tecnica", "righe tecnica")) : "") + "?"],
    avviso: "Puoi annullare solo finché questa pagina resta aperta.",
    conferma: "Svuota",
    rosso: true,
    segno: "svuota-programma",
    onConferma: () => mod.svuotaProgramma()
  });
}

function apriRipristinaScheda(doc, bottone) {
  const mod = modificaCorrente;
  if (!mod || typeof mod.onCambia !== "function") { senzaEditor(doc, bottone, { titolo: "Questa scheda non si puo' ancora ripristinare", riga: "La pagina non ha un editor collegato a questa scheda: non ho rimesso niente com'era." }); return; }
  const id = idSchedaVicino(bottone);
  const c = typeof mod.conta === "function" ? mod.conta(id) : null;
  const codice = (c && c.codice) || "questa scheda";
  chiediConferma(doc, {
    bottone: bottone,
    titolo: "Ripristina la scheda",
    righe: ["Riporti la scheda " + codice + " a com'era quando hai aperto la pagina? " + (c ? ("Perdi " + quanti(c.modifiche, "modifica", "modifiche") + ".") : "")],
    avviso: "Puoi annullare solo finché questa pagina resta aperta.",
    conferma: "Ripristina",
    segno: "ripristina",
    onConferma: () => mod.onCambia({ idScheda: id, campo: "ripristina-scheda" })
  });
}
