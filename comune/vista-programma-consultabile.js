/* comune/vista-programma-consultabile.js — PASSI 42-43: la vista di sola
 * lettura e il confronto fra due programmi.
 *
 * Alice (26/11/2026): «i programmi archiviati devono essere cliccabili e
 * consultabili e anche confrontabili con la scheda attuale». Da qui si guarda un
 * programma senza attivarlo, lo si confronta con quello in uso e se ne salva
 * una copia come programma nuovo.
 *
 * Passo 43 — il confronto è quello del mockup che Alice ha approvato: una
 * finestra alta quanto lo schermo (88vh, fino a 1080 px) che scorre DENTRO di
 * sé, con la barra delle settimane ferma in cima; i due programmi impilati, il
 * consultato sopra e quello in uso sotto; per ogni settimana scelta il volume
 * in una riga compatta, le schede vere (serie, ripetizioni e recuperi di QUELLA
 * settimana), i totali e le differenze per distretto.
 *
 * Regole che questa vista rispetta:
 *  - NON scrive niente e NON attiva niente: le uniche scritture possibili sono
 *    quelle di «Salva come nuovo programma», che crea documenti nuovi e passa
 *    dal servizio ricevuto (che usa comune/scritture-b.js);
 *  - ogni testo preso dai dati passa da `nomePulito` (la regola di casa, e la
 *    guardia 44.03);
 *  - un dato che manca si dichiara con il motivo: mai uno zero o un numero
 *    inventato. Un distretto che sta in un programma solo è «non registrato»; un
 *    esercizio senza progressione per la settimana scelta è «—»; l'intensità di
 *    carico non si calcola dal programma e la riga lo dice.
 *
 * Le finestre si aprono sul corpo della pagina (sopra, non dentro la carta): si
 * chiudono col ×, con «Chiudi», col clic fuori e con Esc, e non allungano la
 * pagina.
 */

import { nomePulito } from "./nome-pulito.js";
import {
  modelloConsultabile, grandezzeProgramma, confrontoSettimana, settimaneDelConfronto,
  valoriSettimana, FORMULA_DENSITA, MOTIVO_CARICO
} from "./programma-consultabile.js";
import { nomeCopia, fraseCopia } from "./salva-come-programma.js";

const NON = "non registrato";
const TRATTINO = "\u2014";

function el(doc, tag, classe, testo) {
  const e = doc.createElement(tag);
  if (classe) e.setAttribute("class", classe);
  if (testo != null) e.appendChild(doc.createTextNode(String(testo)));
  return e;
}

function testo(valore) {
  return valore == null ? "" : String(valore).trim();
}

function numeroInChiaro(valore, decimali) {
  const n = Number(valore);
  if (!Number.isFinite(n)) return NON;
  const fissi = n.toFixed(decimali == null ? 0 : decimali);
  return decimali ? fissi.replace(".", ",") : String(Math.round(n));
}

function variazioneInChiaro(valore) {
  if (valore == null) return TRATTINO;
  const segno = valore > 0 ? "+" : (valore < 0 ? "\u2212" : "");
  return segno + String(Math.abs(valore)).replace(".", ",") + "%";
}

/* La differenza fra due programmi, in serie: «+5», «−2», «=». */
function differenzaInChiaro(valore) {
  if (valore == null) return TRATTINO;
  const n = Math.round(Number(valore) * 100) / 100;
  if (!Number.isFinite(n)) return TRATTINO;
  if (n === 0) return "=";
  const segno = n > 0 ? "+" : "\u2212";
  return segno + String(Math.abs(n)).replace(".", ",");
}

function plurale(n, uno, molti) {
  return n + " " + (Number(n) === 1 ? uno : molti);
}

/* La finestra: sfondo, testa (titolo o testa fatta dal chiamante), × e la
 * scatola. `o.classeModale`/`o.classeBox` distinguono la finestra del
 * confronto; `o.testa(sinistra)` riempie la parte sinistra della testa.
 * Chiude con ×, clic sullo sfondo, Esc; il fuoco torna al tasto che l'ha
 * aperta. */
function impalcatura(doc, titolo, bottone, opzioni) {
  const o = opzioni || {};
  const modale = el(doc, "div", "pr-modal pc-modale" + (o.classeModale ? " " + o.classeModale : ""));
  modale.setAttribute("role", "dialog");
  modale.setAttribute("aria-modal", "true");
  modale.setAttribute("aria-label", titolo);
  const scatola = el(doc, "div", "pr-mbox pc-box" + (o.classeBox ? " " + o.classeBox : ""));
  const testa = el(doc, "header", "pc-finestra-testa");
  const sinistra = el(doc, "div", "pc-finestra-sinistra");
  testa.appendChild(sinistra);
  if (typeof o.testa === "function") o.testa(sinistra);
  else sinistra.appendChild(el(doc, "b", null, titolo));
  const x = el(doc, "button", "pr-mx pc-finestra-x", "\u00d7");
  x.type = "button";
  x.setAttribute("aria-label", "Chiudi");
  testa.appendChild(x);
  scatola.appendChild(testa);
  modale.appendChild(scatola);

  let chiuso = false;
  const chiudi = () => {
    if (chiuso) return;
    chiuso = true;
    modale.remove();
    doc.removeEventListener("keydown", suTasto, true);
    if (bottone && bottone.focus) { try { bottone.focus(); } catch (e) { /* il fuoco non c'è: pazienza */ } }
  };
  function suTasto(ev) {
    if (ev && (ev.key === "Escape" || ev.key === "Esc")) {
      if (ev.stopPropagation) ev.stopPropagation();
      chiudi();
    }
  }
  x.addEventListener("click", (ev) => { if (ev.preventDefault) ev.preventDefault(); chiudi(); });
  modale.addEventListener("click", (ev) => { if (ev.target === modale) chiudi(); });
  doc.addEventListener("keydown", suTasto, true);
  return { modale: modale, scatola: scatola, testa: testa, chiudi: chiudi };
}

/* La scheda vera di un programma per la settimana scelta: una riga per
 * esercizio, con serie, ripetizioni e recupero come sono scritti. Quello che la
 * progressione non scrive per quella settimana è «—», mai zero. Niente
 * carichi: non sono nelle schede. */
function bloccoSchedaIntera(doc, scheda, numero, opzioni) {
  const o = opzioni || {};
  const box = el(doc, "div", "pc-scheda");
  const testa = el(doc, "p", "pc-scheda-t");
  testa.appendChild(el(doc, "b", null, "Scheda " + nomePulito(scheda.codice)));
  if (testo(scheda.nome)) testa.appendChild(doc.createTextNode(" \u2014 " + nomePulito(scheda.nome)));
  box.appendChild(testa);
  if (!scheda.esercizi.length) {
    box.appendChild(el(doc, "p", "pc-vuoto", "Questa scheda non ha esercizi leggibili."));
    return box;
  }
  const tab = el(doc, "table", "pc-tab");
  const thead = el(doc, "thead");
  const trh = el(doc, "tr");
  ["Esercizio", "Distretto", "Serie", "Rip.", "Rec."].forEach((t) => trh.appendChild(el(doc, "th", null, t)));
  thead.appendChild(trh);
  tab.appendChild(thead);
  const corpo = el(doc, "tbody");
  scheda.esercizi.forEach((e) => {
    const v = valoriSettimana(e, numero);
    const tr = el(doc, "tr");
    tr.appendChild(el(doc, "td", "pc-ese", nomePulito(e.nome) || "(senza nome)"));
    tr.appendChild(el(doc, "td", null, e.distretto ? nomePulito(e.distretto) : TRATTINO));
    tr.appendChild(el(doc, "td", "pc-m", v.serie || TRATTINO));
    tr.appendChild(el(doc, "td", "pc-m", v.ripetizioni || TRATTINO));
    tr.appendChild(el(doc, "td", "pc-m", v.recupero || TRATTINO));
    corpo.appendChild(tr);
  });
  tab.appendChild(corpo);
  box.appendChild(tab);
  return box;
}

/* La riga compatta del volume di UNA scheda: una pastiglia per distretto con la
 * somma delle serie di quella settimana. `opzioni.etichetta` dice quale scheda e
 * quale settimana si stanno contando («Scheda D · settimana 3»): prima qui
 * c'erano i numeri del programma intero e non si capiva perché non cambiassero
 * cambiando scheda. Una settimana senza serie scritte non è una settimana a
 * zero: lo dice. */
function pastiglieVolume(doc, settimana, opzioni) {
  const o = opzioni || {};
  const box = el(doc, "div", "pc-volumi");
  if (o.etichetta) {
    const eti = el(doc, "p", "pc-vol-eti", o.etichetta);
    eti.setAttribute("data-vol-scheda", o.codice == null ? "" : String(o.codice));
    box.appendChild(eti);
  }
  const voci = settimana && Array.isArray(settimana.volume) ? settimana.volume : [];
  if (!voci.length) {
    const perche = settimana && settimana.serieSenzaNumero
      ? "serie non scritte in questa settimana"
      : "nessuna serie scritta in questa settimana";
    box.appendChild(el(doc, "span", "pc-vol-vuoto", perche));
    return box;
  }
  voci.forEach((v) => {
    const c = el(doc, "span", "pc-vol");
    c.setAttribute("data-vol-distretto", v.distretto);
    c.appendChild(el(doc, "span", null, nomePulito(v.distretto)));
    c.appendChild(el(doc, "b", null, numeroInChiaro(v.serie)));
    box.appendChild(c);
  });
  return box;
}

/* I totali della scheda scelta per la settimana scelta: serie, esercizi,
 * densità. Passo 44: sono della SCHEDA (prima erano del programma intero, ed è
 * per questo che non cambiavano). La densità è un numero solo quando i recuperi
 * ci sono tutti; altrimenti dice che non si calcola e il motivo sta sotto. */
function totaliProgramma(doc, scheda, settimana) {
  const box = el(doc, "div", "pc-totali");
  const voce = (etichetta, valore, piccolo, classe) => {
    const c = el(doc, "div", "pc-tot");
    c.appendChild(el(doc, "span", "pc-tot-k", etichetta));
    const v = el(doc, "span", "pc-tot-v" + (classe ? " " + classe : ""));
    v.appendChild(doc.createTextNode(valore));
    if (piccolo) v.appendChild(el(doc, "small", null, " " + piccolo));
    c.appendChild(v);
    box.appendChild(c);
  };

  let serie = TRATTINO;
  if (settimana) {
    const scritte = Number(settimana.serieSettimana) || 0;
    serie = scritte || !settimana.serieSenzaNumero ? numeroInChiaro(scritte) : TRATTINO;
  }
  voce("Serie della scheda", serie);
  voce("Esercizi", numeroInChiaro(scheda ? scheda.esercizi.length : 0));
  if (settimana && settimana.densita != null) voce("Densità", numeroInChiaro(settimana.densita, 2), "serie/min");
  else voce("Densità", "non calcolabile", null, "pc-tot-no");
  return box;
}

/* Le schede del confronto: tutte le lettere che compaiono in almeno uno dei due
 * programmi, in ordine alfabetico (una scheda senza lettera non si nasconde:
 * finisce in fondo come «Senza lettera»). Sono i tasti della seconda fila. */
export function schedeDelConfronto(modelli) {
  const voci = [];
  const aggiungi = (codice) => {
    if (!voci.some((v) => v.codice === codice)) voci.push({ codice: codice });
  };
  (modelli || []).forEach((m) => {
    ((m && m.schede) || []).forEach((s) => aggiungi(testo(s && s.codice) || NON));
  });
  voci.sort((a, b) => {
    if (a.codice === NON) return 1;
    if (b.codice === NON) return -1;
    return a.codice.localeCompare(b.codice, "it", { numeric: true });
  });
  return voci.map((v) => ({ codice: v.codice, etichetta: v.codice === NON ? "Senza lettera" : v.codice }));
}

function schedaConCodice(modello, codice) {
  if (codice == null || !modello) return null;
  return (modello.schede || []).filter((s) => testo(s.codice) === codice)[0] || null;
}

/* L'ordine unico delle righe del confronto esercizio per esercizio.
 *
 * Passo 44 — Alice: «gli esercizi delle due schede devono stare vicini, non
 * prima tutti quelli di una e poi tutti quelli dell'altra». Quindi:
 *  1. prima gli esercizi che stanno in TUTTE E DUE le schede, accoppiati per
 *     nome (il nome pulito e in minuscolo: «hip_thrust» è «Hip thrust»), e
 *     restano nell'ordine della scheda di sinistra;
 *  2. poi gli altri, accoppiati per POSIZIONE nella scheda (il primo che resta
 *     a sinistra col primo che resta a destra): due schede con esercizi
 *     diversi si leggono lo stesso riga per riga, ed è dichiarato che è un
 *     confronto per posizione (`posizione: true`);
 *  3. in fondo i pochi che avanzano da una parte sola: lì, e solo lì, la riga
 *     ha il trattino.
 */
function righeUnite(schedaUno, schedaDue) {
  const sinistra = (schedaUno && schedaUno.esercizi) || [];
  const destra = (schedaDue && schedaDue.esercizi) || [];
  const chiave = (e) => nomePulito(testo(e && e.nome)).toLowerCase();
  const presi = sinistra.map(() => -1);
  const usati = destra.map(() => false);

  /* 1. a parità di nome, accoppia. */
  sinistra.forEach((e, i) => {
    for (let j = 0; j < destra.length; j += 1) {
      if (usati[j]) continue;
      if (chiave(destra[j]) === chiave(e)) { presi[i] = j; usati[j] = true; break; }
    }
  });
  /* 2. i rimasti, a pari posto nella scheda. */
  const restanti = [];
  destra.forEach((e, j) => { if (!usati[j]) restanti.push(j); });
  const accoppiatePerPosizione = [];
  sinistra.forEach((e, i) => {
    if (presi[i] !== -1) return;
    if (!restanti.length) return;
    const j = restanti.shift();
    presi[i] = j;
    usati[j] = true;
    accoppiatePerPosizione.push(i);
  });

  const righe = [];
  /* 3a. prima le coppie per nome, nell'ordine di sinistra. */
  sinistra.forEach((e, i) => {
    if (presi[i] === -1 || accoppiatePerPosizione.indexOf(i) !== -1) return;
    righe.push({ uno: e, due: destra[presi[i]], posizione: false });
  });
  /* 3b. poi quelle per posizione. */
  accoppiatePerPosizione.forEach((i) => {
    righe.push({ uno: sinistra[i], due: destra[presi[i]], posizione: true });
  });
  /* 3c. quello che avanza sta in fondo, da solo, col trattino dall'altra parte. */
  sinistra.forEach((e, i) => { if (presi[i] === -1) righe.push({ uno: e, due: null, posizione: false }); });
  destra.forEach((e, j) => { if (!usati[j]) righe.push({ uno: null, due: e, posizione: false }); });
  return righe;
}

/* La tabella di una colonna per la scheda e la settimana scelte. Il distretto
 * sta su una riga piccola sotto il nome (a metà larghezza non c'è posto per una
 * colonna sua). Le righe sono quelle comuni: dove l'esercizio non c'è, il nome è
 * un trattino e le caselle restano vuote. */
function tabellaColonna(doc, righe, lato, numero) {
  const tab = el(doc, "table", "pc-tab pc-col-tab");
  const cg = doc.createElement("colgroup");
  /* Passo 44: la finestra è più larga, quindi le tre caselle dei numeri si
   * allargano e il testo non finisce più nei puntini appena è un filo lungo. */
  ["auto", "64px", "70px", "74px"].forEach((larghezza) => {
    const c = doc.createElement("col");
    c.setAttribute("style", "width:" + larghezza);
    cg.appendChild(c);
  });
  tab.appendChild(cg);
  const thead = el(doc, "thead");
  const trh = el(doc, "tr");
  ["Esercizio", "Serie", "Rip.", "Rec."].forEach((t, i) => trh.appendChild(el(doc, "th", i === 0 ? null : "pc-n", t)));
  thead.appendChild(trh);
  tab.appendChild(thead);
  const corpo = el(doc, "tbody");
  righe.forEach((r) => {
    const e = r[lato];
    const tr = el(doc, "tr");
    if (!e) {
      tr.className = "pc-riga-manca";
      tr.appendChild(el(doc, "td", "pc-nome pc-manca", TRATTINO));
      ["pc-n", "pc-n", "pc-n"].forEach((c) => tr.appendChild(el(doc, "td", c, "")));
    } else {
      /* Accoppiata per posizione e non per nome: si dice, così non sembra che i
       * due esercizi siano lo stesso. */
      if (r.posizione) {
        tr.className = "pc-riga-posizione";
        tr.setAttribute("title", "esercizio diverso dall'altra scheda: accoppiato per posizione");
      }
      const v = valoriSettimana(e, numero);
      const cella = el(doc, "td", "pc-nome");
      const nome = el(doc, "b", null, nomePulito(e.nome) || "(senza nome)");
      if (testo(e.nome)) cella.setAttribute("title", nomePulito(e.nome));
      cella.appendChild(nome);
      /* Lo spazio serve al testo letto e copiato («Hip thrust Glutei»): la riga
       * sotto è un blocco, quindi a schermo non lascia un buco. */
      cella.appendChild(doc.createTextNode(" "));
      cella.appendChild(el(doc, "small", "pc-dist", e.distretto ? nomePulito(e.distretto) : TRATTINO));
      tr.appendChild(cella);
      /* Le tre caselle strette: quando il testo è lungo si taglia con i puntini,
       * quindi il valore intero va nel suggerimento — altrimenti si perderebbe. */
      [v.serie || TRATTINO, v.ripetizioni || TRATTINO, v.recupero || TRATTINO].forEach((valore) => {
        const cella = el(doc, "td", "pc-n", valore);
        if (String(valore).length > 8) cella.setAttribute("title", String(valore));
        tr.appendChild(cella);
      });
    }
    corpo.appendChild(tr);
  });
  tab.appendChild(corpo);
  return tab;
}

/* Una colonna del confronto: nome del programma col pallino, il conto, le
 * pastiglie del volume DELLA SCHEDA (con scritto quale), la scheda scelta (o la
 * frase che dice che quel programma non ce l'ha) e i totali in fondo. */
function colonnaProgramma(doc, voci) {
  const o = voci;
  const col = el(doc, "div", "pc-col " + (o.lato === "uno" ? "pc-col-a" : "pc-col-b"));
  const testa = el(doc, "div", "pc-col-testa");
  testa.appendChild(rigaNome(doc, o.lato === "uno" ? "a" : "b",
    nomePulito(o.modello.nome) || "(senza nome)", o.etichetta));
  col.appendChild(testa);
  col.appendChild(el(doc, "p", "pc-col-conto",
    plurale(o.modello.numeroSchede, "scheda", "schede") + " \u00b7 "
    + plurale(o.modello.numeroEsercizi, "esercizio", "esercizi")));

  if (!o.modello.schedeLette) {
    col.appendChild(el(doc, "p", "pc-vuoto", o.modello.motivoSchede || "nessuna scheda letta"));
    return col;
  }

  if (!o.scheda) {
    /* Nessuna pastiglia quando la scheda non c'è: i numeri di un'altra scheda
     * non si mostrano al posto suo. */
    col.appendChild(el(doc, "p", "pc-vuoto pc-scheda-manca",
      "Scheda " + (o.codice === NON ? "senza lettera" : o.codice) + " non presente in questo programma"));
    return col;
  }

  const codice = o.codice === NON ? "senza lettera" : o.codice;
  col.appendChild(pastiglieVolume(doc, o.settimana, {
    etichetta: "Scheda " + codice + " \u00b7 settimana " + o.numero,
    codice: o.codice
  }));
  const titolo = el(doc, "p", "pc-col-scheda", "Scheda " + codice
    + (testo(o.scheda.nome) ? " \u2014 " + nomePulito(o.scheda.nome) : ""));
  col.appendChild(titolo);
  if (!o.scheda.esercizi.length) {
    col.appendChild(el(doc, "p", "pc-vuoto", "Questa scheda non ha esercizi leggibili."));
  } else {
    col.appendChild(tabellaColonna(doc, o.righe, o.lato, o.numero));
  }
  col.appendChild(totaliProgramma(doc, o.scheda, o.settimana));
  return col;
}

/* Le differenze per distretto DELLA SCHEDA E DELLA SETTIMANA scelte (passo 44:
 * prima erano del programma intero, e non cambiando scheda sembravano sbagliate
 * — lo erano). Δ è «questo meno quello in uso»: verde quando il consultato ne
 * ha di più, rosso quando ne ha di meno. Se un distretto c'è da una parte sola,
 * la riga dice «non registrato» e non calcola nessuna differenza: zero non si
 * inventa. Se una delle due schede non esiste, non si confronta niente e si
 * dice perché, invece di mostrare i numeri di un'altra scheda. */
function sezioneDifferenze(doc, confronto, nomeUno, nomeDue, etichetta, opzioni) {
  const o = opzioni || {};
  const box = el(doc, "section", "pc-differenze");
  box.setAttribute("aria-label", "Differenze della settimana");
  box.appendChild(el(doc, "h5", "pc-diff-t",
    "Differenze \u00b7 " + (etichetta || "settimana " + confronto.settimana)));
  if (o.schedaMancante) {
    box.appendChild(el(doc, "p", "pc-diff-vuoto",
      "\u00ab" + o.schedaMancante + "\u00bb non ha questa scheda: qui non c'è niente da confrontare, "
      + "e i numeri di un'altra scheda non si mostrano al posto suo."));
    return box;
  }
  if (!confronto.righe.length) {
    box.appendChild(el(doc, "p", "pc-diff-vuoto",
      "Nessun distretto con serie scritte in questa settimana, in nessuno dei due programmi."));
    return box;
  }
  const tab = el(doc, "table", "pc-tab pc-diff-tab");
  const thead = el(doc, "thead");
  const trh = el(doc, "tr", "pc-diff-int");
  ["Distretto", nomeUno, nomeDue, "\u0394"].forEach((t, i) => {
    const th = el(doc, "th", ["pc-dn", "pc-d1", "pc-d2", "pc-delta"][i], t);
    trh.appendChild(th);
  });
  thead.appendChild(trh);
  tab.appendChild(thead);
  const corpo = el(doc, "tbody");
  confronto.righe.forEach((r) => {
    const riga = el(doc, "tr", "pc-diff-riga");
    riga.setAttribute("data-distretto", r.distretto);
    riga.setAttribute("data-genere", r.genere);
    riga.appendChild(el(doc, "td", "pc-dn", nomePulito(r.distretto)));
    riga.appendChild(el(doc, "td", "pc-d1", r.uno == null ? TRATTINO : numeroInChiaro(r.uno)));
    riga.appendChild(el(doc, "td", "pc-d2", r.due == null ? TRATTINO : numeroInChiaro(r.due)));
    const delta = el(doc, "td", "pc-delta");
    if (r.genere !== "confronto") {
      delta.className = "pc-delta non";
      delta.textContent = NON;
      riga.setAttribute("title", "il distretto non è registrato in uno dei due programmi: la differenza non si calcola");
    } else {
      delta.className = "pc-delta " + (r.delta > 0 ? "su" : (r.delta < 0 ? "giu" : "pari"));
      delta.textContent = differenzaInChiaro(r.delta);
      if (r.variazione != null) delta.setAttribute("title", "variazione " + variazioneInChiaro(r.variazione));
    }
    riga.appendChild(delta);
    corpo.appendChild(riga);
  });
  tab.appendChild(corpo);
  box.appendChild(tab);
  return box;
}

/* I numeri di UNA scheda (o null se quella scheda non è nel programma): è la
 * lettura che alimenta pastiglie, totali e differenze del passo 44. */
function numeriSchedaDi(grandezze, codice, numero) {
  if (!grandezze || !Array.isArray(grandezze.perScheda)) return null;
  const voce = grandezze.perScheda.filter((s) => s.codice === codice)[0];
  if (!voce) return null;
  return voce.perSettimana[numero - 1] || null;
}

/* Perché una scheda non porta serie in questa settimana (o null se le porta). */
function motivoSettimanaVuota(numeri) {
  if (!numeri || !numeri.esercizi) return null;
  if (Number(numeri.serieSettimana) > 0) return null;
  if (numeri.serieSenzaNumero) return "la settimana non è scritta: nessuna serie";
  return "nessuna serie scritta";
}

/* «Volume della settimana» (passo 44): una riga per distretto e una colonna per
 * OGNI scheda accesa, più il totale delle schede accese. È la vista che risponde
 * alla richiesta di Alice («vedere il volume settimanale di tutte insieme»):
 * una lettura per programma, con lo stesso linguaggio del resto (le stesse
 * righe e pastiglie, non un'altra tabella di un'altra famiglia).
 * Una scheda che non scrive la settimana ha la colonna vuota e lo dichiara; il
 * totale somma solo quello che c'è. */
function volumeDellaSettimana(doc, o) {
  const box = el(doc, "section", "pc-volume-sett");
  box.setAttribute("aria-label", "Volume della settimana");
  box.setAttribute("data-settimana", String(o.numero));
  box.appendChild(el(doc, "h5", "pc-vol-t", "Volume della settimana \u00b7 settimana " + o.numero));
  box.appendChild(el(doc, "p", "pc-vol-guida", o.guida));

  o.programmi.forEach((p) => {
    const blocco = el(doc, "div", "pc-vol-blocco");
    const testa = el(doc, "p", "pc-vol-nome");
    testa.appendChild(rigaNome(doc, p.quale === "uno" ? "a" : "b",
      nomePulito(p.nome) || "(senza nome)", p.etichetta));
    blocco.appendChild(testa);

    const presenti = o.schede.filter((c) => schedaConCodice(p.modello, c));
    if (!p.modello.schedeLette) {
      blocco.appendChild(el(doc, "p", "pc-vuoto", p.modello.motivoSchede || "nessuna scheda letta"));
      box.appendChild(blocco);
      return;
    }
    if (!presenti.length) {
      blocco.appendChild(el(doc, "p", "pc-vuoto",
        "Nessuna delle schede accese è in questo programma: non c'è un volume da contare."));
      box.appendChild(blocco);
      return;
    }

    const colonne = presenti.map((codice) => ({
      codice: codice,
      numeri: numeriSchedaDi(p.grandezze, codice, o.numero)
    }));
    const distretti = [];
    colonne.forEach((c) => {
      (c.numeri && Array.isArray(c.numeri.volume) ? c.numeri.volume : []).forEach((v) => {
        if (distretti.indexOf(v.distretto) === -1) distretti.push(v.distretto);
      });
    });
    if (!distretti.length) {
      blocco.appendChild(el(doc, "p", "pc-vuoto",
        "Nessuna serie scritta nella settimana " + o.numero + " nelle schede accese di questo programma."));
      blocco.appendChild(el(doc, "p", "pc-vol-vuoto",
        "Non è una settimana a zero: è una settimana che i dati non scrivono."));
      box.appendChild(blocco);
      return;
    }

    const serieDi = (numeri, d) => {
      const voce = (numeri && Array.isArray(numeri.volume) ? numeri.volume : [])
        .filter((v) => v.distretto === d)[0];
      return voce ? voce.serie : null;
    };
    const righe = distretti.map((d) => {
      const celle = colonne.map((c) => serieDi(c.numeri, d));
      const totale = celle.reduce((a, v) => a + (v == null ? 0 : v), 0);
      return { distretto: d, celle: celle, totale: Math.round(totale * 100) / 100 };
    });
    righe.sort((a, b) => b.totale - a.totale || a.distretto.localeCompare(b.distretto, "it"));

    const tab = el(doc, "table", "pc-tab pc-vol-tab");
    const thead = el(doc, "thead");
    const trh = el(doc, "tr");
    const thDn = el(doc, "th", "pc-vol-dn", "Distretto");
    trh.appendChild(thDn);
    colonne.forEach((c) => {
      const th = el(doc, "th", "pc-vol-col", "Scheda " + (c.codice === NON ? "senza lettera" : c.codice));
      th.setAttribute("data-scheda", c.codice);
      trh.appendChild(th);
    });
    const thTot = el(doc, "th", "pc-vol-col pc-vol-tot", "Totale");
    trh.appendChild(thTot);
    thead.appendChild(trh);
    tab.appendChild(thead);
    const corpo = el(doc, "tbody");
    righe.forEach((r) => {
      const tr = el(doc, "tr", "pc-vol-riga");
      tr.setAttribute("data-distretto", r.distretto);
      tr.appendChild(el(doc, "td", "pc-vol-dn", nomePulito(r.distretto)));
      r.celle.forEach((valore, i) => {
        const td = el(doc, "td", "pc-vol-col", valore == null ? TRATTINO : numeroInChiaro(valore));
        td.setAttribute("data-scheda", colonne[i].codice);
        tr.appendChild(td);
      });
      tr.appendChild(el(doc, "td", "pc-vol-col pc-vol-tot", numeroInChiaro(r.totale)));
      corpo.appendChild(tr);
    });
    tab.appendChild(corpo);
    blocco.appendChild(tab);

    colonne.forEach((c) => {
      const perche = motivoSettimanaVuota(c.numeri);
      if (perche) {
        blocco.appendChild(el(doc, "p", "pc-vol-vuoto",
          "Scheda " + (c.codice === NON ? "senza lettera" : c.codice) + ": " + perche
          + " nella settimana " + o.numero + ", la colonna resta vuota."));
      }
    });
    box.appendChild(blocco);
  });
  return box;
}

/* Le dichiarazioni: cosa i dati non dicono e come si calcola ciò che si vede. */
function noteDichiarate(doc, voci) {
  const note = el(doc, "div", "pc-note");
  note.appendChild(el(doc, "p", "pc-nota",
    "Serie e ripetizioni sono quelle della settimana scelta, scheda per scheda; i recuperi quelli scritti nell'esercizio."));
  note.appendChild(el(doc, "p", "pc-nota", "Formula della densità: " + FORMULA_DENSITA));
  note.appendChild(el(doc, "p", "pc-nota", "Intensità di carico: non disponibile \u2014 " + MOTIVO_CARICO + "."));
  const motivi = [];
  voci.forEach((v) => {
    if (v.settimana && v.settimana.motivoDensita) motivi.push(v.nome + ": " + v.settimana.motivoDensita + ".");
    if (v.settimana && v.settimana.motivoVolume) motivi.push(v.nome + ": " + v.settimana.motivoVolume + ".");
  });
  motivi.forEach((m) => note.appendChild(el(doc, "p", "pc-nota male", m)));
  return note;
}

/* «Salva come nuovo programma»: il nome si chiede qui (proposto «… · copia») e
 * la scrittura la fa il servizio ricevuto. Dopo l'esito il programma nuovo resta
 * raggiungibile dal pannello «Cambia» col suo nome. */
function bloccoSalva(doc, opzioni, consultato) {
  const box = el(doc, "div", "pc-salva");
  const titolo = el(doc, "p", "pc-titolo2", "Salva come nuovo programma");
  box.appendChild(titolo);
  const etichetta = el(doc, "label", "pc-etichetta", "Nome del nuovo programma");
  const campo = doc.createElement("input");
  campo.type = "text";
  campo.className = "pc-campo";
  campo.value = nomeCopia(nomePulito(consultato.modello.nome));
  campo.setAttribute("aria-label", "Nome del nuovo programma");
  etichetta.appendChild(campo);
  box.appendChild(etichetta);
  box.appendChild(el(doc, "p", "pc-nota",
    "Nasce in bozza con le stesse schede, gli stessi esercizi, le stesse serie e gli stessi recuperi. "
    + "Niente che esista già viene toccato: non si attiva da qui."));

  const fila = el(doc, "div", "pc-fila");
  const crea = el(doc, "button", "pr-btn pri", "Crea il programma nuovo");
  crea.type = "button";
  const lascia = el(doc, "button", "pr-btn", "Lascia stare");
  lascia.type = "button";
  lascia.addEventListener("click", () => box.remove());
  const esito = el(doc, "div", "pc-esito");
  esito.setAttribute("role", "status");

  if (typeof opzioni.onSalvaCome !== "function") {
    crea.disabled = true;
    crea.title = "spento: questa pagina non sa ancora scrivere in B";
  }
  crea.addEventListener("click", () => {
    const nome = testo(campo.value);
    if (!nome) {
      campo.className = "pc-campo male";
      if (typeof campo.focus === "function") campo.focus();
      esito.textContent = "Scrivi un nome: senza nome non creo niente.";
      return;
    }
    if (typeof opzioni.onSalvaCome !== "function") return;
    crea.disabled = true;
    lascia.disabled = true;
    const prima = crea.textContent;
    crea.textContent = "Creo\u2026";
    esito.textContent = "";
    Promise.resolve()
      .then(() => opzioni.onSalvaCome(consultato.modello.id, nome))
      .then((ris) => {
        crea.disabled = false;
        lascia.disabled = false;
        crea.textContent = prima;
        if (!ris || ris.ok !== true) {
          esito.className = "pc-esito male";
          esito.textContent = (ris && ris.motivo) || "non ho scritto niente";
          return;
        }
        esito.className = "pc-esito ok";
        esito.textContent = fraseCopia(ris, opzioni.nomeInUso || "");
        campo.disabled = true;
        crea.disabled = true;
        crea.textContent = "Programma creato";
        lascia.disabled = true;
      }, (e) => {
        crea.disabled = false;
        lascia.disabled = false;
        crea.textContent = prima;
        esito.className = "pc-esito male";
        esito.textContent = "scrittura non riuscita: " + ((e && e.message) || "errore");
      });
  });
  fila.appendChild(crea);
  fila.appendChild(lascia);
  box.appendChild(fila);
  box.appendChild(esito);
  return { box: box, campo: campo, crea: crea };
}

function rigaNome(doc, quale, nome, etichetta) {
  const riga = el(doc, "span", "pc-nome-riga");
  riga.appendChild(el(doc, "i", "pc-pallino " + quale));
  riga.appendChild(el(doc, "b", null, nome));
  if (etichetta) riga.appendChild(el(doc, "span", "pc-etichetta", etichetta));
  return riga;
}

/* La finestra del confronto (passo 43). `opzioni`:
 *   { consultato: {modello, gruppo}, inUso: {modello, gruppo},
 *     bottone, onSalvaCome, nomeInUso }.
 * I due programmi sono impilati — consultato sopra, in uso sotto — e la barra
 * delle settimane resta ferma in cima mentre il corpo scorre dentro la finestra.
 * Ritorna l'elemento della finestra (utile alle prove). */
export function apriConfronto(doc, opzioni) {
  const o = opzioni || {};
  if (!doc || !doc.body) return null;
  if (!o.consultato || !o.inUso || !o.consultato.modello || !o.inUso.modello) return null;
  const gia = doc.querySelector(".pc-modale");
  if (gia) gia.remove();

  const modelloUno = o.consultato.modello;
  const modelloDue = o.inUso.modello;
  const gruppi = [o.consultato.gruppo || null, o.inUso.gruppo || null];
  const tastiSettimana = settimaneDelConfronto(gruppi, { durate: [modelloUno.durata, modelloDue.durata] });
  const quante = tastiSettimana.length;
  const grandezzeUno = grandezzeProgramma(gruppi[0], { quanteSettimane: quante });
  const grandezzeDue = grandezzeProgramma(gruppi[1], { quanteSettimane: quante });
  const nomeUno = nomePulito(modelloUno.nome) || "(senza nome)";
  const nomeDue = nomePulito(modelloDue.nome) || "(senza nome)";
  const etichettaUno = modelloUno.archiviato ? "archiviato" : "consultato";

  const vociScheda = schedeDelConfronto([modelloUno, modelloDue]);
  let settimanaScelta = 1;
  /* Passo 44 — le schede si accendono e si spengono (multi-selezione): con una
   * sola accesa il comportamento è quello di sempre; con più di una, il
   * confronto esercizio per esercizio resta su UNA (l'ultima accesa) e la vista
   * «Volume della settimana» le conta tutte. */
  let schedeAccese = vociScheda.length ? [vociScheda[0].codice] : [];
  let schedaScelta = vociScheda.length ? vociScheda[0].codice : null;
  let sottoTitolo = null;

  const nomeDiScheda = (codice) => (codice === NON || codice == null ? "senza lettera" : codice);

  const { modale, scatola, chiudi } = impalcatura(doc, "Confronto programmi", o.bottone, {
    classeModale: "pc-modale-confronto",
    classeBox: "pc-box-confronto",
    testa: (sinistra) => {
      sinistra.appendChild(el(doc, "b", "pc-finestra-t", "Confronto programmi"));
      /* I due nomi stanno nell'intestazione ferma: chi è a sinistra e chi a
       * destra si sa prima di scorrere (e le colonne lo ripetono in cima). */
      const nomi = el(doc, "div", "pc-nomi");
      nomi.appendChild(rigaNome(doc, "a", nomeUno, etichettaUno));
      nomi.appendChild(rigaNome(doc, "b", nomeDue, "in uso"));
      sinistra.appendChild(nomi);
      sottoTitolo = el(doc, "span", "pc-finestra-sotto", "");
      sinistra.appendChild(sottoTitolo);
    }
  });

  const barra = el(doc, "div", "pc-settimane");
  barra.setAttribute("role", "tablist");
  barra.setAttribute("aria-label", "Settimana");
  barra.appendChild(el(doc, "span", "pc-sett-davanti", "Settimana"));
  const tasti = tastiSettimana.map((s) => {
    const b = el(doc, "button", "pc-sett");
    b.type = "button";
    b.setAttribute("role", "tab");
    b.setAttribute("data-s", String(s.numero));
    b.appendChild(doc.createTextNode("S" + s.numero));
    const sotto = s.scarico ? "scarico" : s.ripetizioni;
    /* Lo spazio serve al testo letto e copiato («S4 scarico»): la pastiglia
     * sotto è un blocco, quindi a schermo non lascia un buco. */
    if (sotto) {
      b.appendChild(doc.createTextNode(" "));
      b.appendChild(el(doc, "span", "pc-sett-sc", sotto));
    }
    if (s.scarico) {
      const inQuale = [grandezzeUno, grandezzeDue].filter((g) => {
        const sett = g.perSettimana[s.numero - 1];
        return sett && sett.scarico;
      }).length;
      b.setAttribute("title", "la settimana è segnata come scarico nei dati"
        + (inQuale === 1 ? " di uno dei due programmi" : " di tutti e due i programmi"));
    } else if (s.ripetizioni) {
      b.setAttribute("title", "ripetizioni scritte: " + s.ripetizioni);
    }
    b.addEventListener("click", () => { settimanaScelta = s.numero; disegna(); });
    barra.appendChild(b);
    return b;
  });

  /* La seconda fila: le schede. Una tab per ogni lettera presente in almeno uno
   * dei due programmi. Passo 44: si accendono a più di una — clic = accendo o
   * spengo; l'ultima accesa è quella che il confronto esercizio per esercizio
   * mostra, e almeno una resta sempre accesa. */
  const barraSchede = el(doc, "div", "pc-schede-tab");
  barraSchede.setAttribute("role", "group");
  barraSchede.setAttribute("aria-label", "Scheda");
  barraSchede.appendChild(el(doc, "span", "pc-sett-davanti", "Scheda"));
  const tastiScheda = vociScheda.map((v) => {
    const b = el(doc, "button", "pc-st");
    b.type = "button";
    b.setAttribute("data-scheda", v.codice);
    b.appendChild(doc.createTextNode(v.etichetta));
    b.addEventListener("click", () => {
      if (schedeAccese.indexOf(v.codice) !== -1) {
        /* l'ultima accesa non si spegne: almeno una scheda resta */
        if (schedeAccese.length === 1) return;
        schedeAccese = schedeAccese.filter((c) => c !== v.codice);
        if (schedaScelta === v.codice) schedaScelta = schedeAccese[schedeAccese.length - 1];
      } else {
        schedeAccese = vociScheda.map((x) => x.codice).filter((c) => c === v.codice || schedeAccese.indexOf(c) !== -1);
        schedaScelta = v.codice;
      }
      disegna();
    });
    barraSchede.appendChild(b);
    return b;
  });
  /* La frase che dice quante schede sono accese e quale si confronta: sta fuori
   * dal corpo che scorre, così si legge prima di scendere. */
  const notaScelta = el(doc, "p", "pc-scelta-nota", "");

  const corpo = el(doc, "div", "pc-corpo pc-corpo-confronto pc-confronto");
  const piazzaSalva = el(doc, "div", "pc-piazza-salva");

  /* Disegna tutto quello che dipende da settimana e schede accese. */
  function disegna() {
    const n = settimanaScelta;
    tasti.forEach((b) => {
      const suo = Number(b.getAttribute("data-s")) === n;
      b.classList.toggle("on", suo);
      b.setAttribute("aria-selected", suo ? "true" : "false");
    });
    tastiScheda.forEach((b) => {
      const acceso = schedeAccese.indexOf(b.getAttribute("data-scheda")) !== -1;
      b.classList.toggle("on", acceso);
      /* Multi-selezione: `aria-pressed` dice acceso/spento (l'ultima accesa è
       * quella in confronto, e la frase sotto le colonne lo dice a parole). */
      b.setAttribute("aria-pressed", acceso ? "true" : "false");
      b.setAttribute("title", acceso
        ? "accesa: clic per spegnerla (almeno una resta accesa)"
        : "spenta: clic per accenderla");
    });

    const schedaUno = schedaConCodice(modelloUno, schedaScelta);
    const schedaDue = schedaConCodice(modelloDue, schedaScelta);
    const righe = righeUnite(schedaUno, schedaDue);
    /* I numeri della SCHEDA in confronto, non del programma intero. */
    const settUno = numeriSchedaDi(grandezzeUno, schedaScelta, n);
    const settDue = numeriSchedaDi(grandezzeDue, schedaScelta, n);
    const accese = schedeAccese.map(nomeDiScheda);
    if (sottoTitolo) {
      sottoTitolo.textContent = "Settimana " + n
        + (schedaScelta == null ? "" : " \u00b7 Scheda " + nomeDiScheda(schedaScelta))
        + (schedeAccese.length > 1 ? " \u00b7 accese: " + accese.join(", ") : "");
    }

    corpo.textContent = "";
    /* Con più schede accese il confronto riga per riga è su una sola: si dice
     * in chiaro, e si dice dove stanno le altre. */
    if (schedeAccese.length > 1) {
      notaScelta.textContent = "Sono accese " + schedeAccese.length + " schede (" + accese.join(", ") + "): "
        + "il confronto esercizio per esercizio qui sotto è sulla scheda " + nomeDiScheda(schedaScelta)
        + ". Il volume di tutte le schede accese è nella vista \u00abVolume della settimana\u00bb, pi\u00f9 sotto.";
      notaScelta.setAttribute("data-schede-accese", schedeAccese.join(","));
      corpo.appendChild(notaScelta);
    }

    const duetto = el(doc, "div", "pc-duetto");
    duetto.setAttribute("data-settimana", String(n));
    duetto.setAttribute("data-scheda", schedaScelta == null ? "" : schedaScelta);
    duetto.appendChild(colonnaProgramma(doc, {
      modello: modelloUno, settimana: settUno, righe: righe, lato: "uno",
      numero: n, codice: schedaScelta, scheda: schedaUno, etichetta: etichettaUno
    }));
    duetto.appendChild(colonnaProgramma(doc, {
      modello: modelloDue, settimana: settDue, righe: righe, lato: "due",
      numero: n, codice: schedaScelta, scheda: schedaDue, etichetta: "in uso"
    }));
    corpo.appendChild(duetto);
    /* Se qualche riga è accoppiata per posizione, lo si dice una volta sola:
     * due esercizi con nomi diversi non sono lo stesso esercizio. */
    if (righe.some((r) => r.posizione)) {
      corpo.appendChild(el(doc, "p", "pc-nota pc-nota-posizione",
        "Righe con nomi diversi: sono accoppiate per posizione nella scheda, non è lo stesso esercizio."));
    }

    /* Le differenze per distretto: gli stessi numeri della scheda in confronto,
     * e il titolo dice quale scheda e quale settimana. */
    const etichettaDiff = "Scheda " + nomeDiScheda(schedaScelta) + " \u00b7 settimana " + n;
    if (!schedaUno || !schedaDue) {
      const mancante = !schedaUno ? nomeUno : nomeDue;
      corpo.appendChild(sezioneDifferenze(doc, { settimana: n, righe: [] }, nomeUno, nomeDue,
        etichettaDiff, { schedaMancante: mancante }));
    } else {
      const conf = confrontoSettimana(
        { perSettimana: [settUno] }, { perSettimana: [settDue] }, 1,
        { nomeUno: nomeUno, nomeDue: nomeDue });
      conf.settimana = n;
      corpo.appendChild(sezioneDifferenze(doc, conf, nomeUno, nomeDue, etichettaDiff));
    }

    /* Il volume di tutte le schede accese: una riga per distretto, una colonna
     * per scheda più il totale. */
    corpo.appendChild(volumeDellaSettimana(doc, {
      numero: n,
      schede: schedeAccese,
      guida: schedeAccese.length > 1
        ? "Una riga per distretto, una colonna per ogni scheda accesa, pi\u00f9 il totale delle schede accese. "
          + "Una casella vuota vuol dire che quella scheda non ha serie di quel distretto in questa settimana."
        : "Una riga per distretto, con la scheda accesa e il totale. "
          + "Accendi altre schede dai tasti sopra per vederle tutte insieme: il totale somma le colonne accese.",
      programmi: [
        { quale: "uno", nome: nomeUno, etichetta: etichettaUno, modello: modelloUno, grandezze: grandezzeUno },
        { quale: "due", nome: nomeDue, etichetta: "in uso", modello: modelloDue, grandezze: grandezzeDue }
      ]
    }));

    corpo.appendChild(noteDichiarate(doc, [
      { nome: nomeUno, settimana: settUno },
      { nome: nomeDue, settimana: settDue }
    ]));
    corpo.appendChild(piazzaSalva);
    corpo.setAttribute("data-settimana", String(n));
    corpo.setAttribute("data-schede-accese", schedeAccese.join(","));
  }

  const piede = el(doc, "footer", "pc-piede");
  piede.appendChild(el(doc, "span", "pc-suggerimento",
    "Clicca un'altra settimana: la scheda cambia con lei. I tasti Scheda si accendono a più di una."));
  const tastiPiede = el(doc, "div", "pc-piede-tasti");
  const chiudiBtn = el(doc, "button", "pr-btn", "Chiudi");
  chiudiBtn.type = "button";
  chiudiBtn.addEventListener("click", chiudi);
  const salva = el(doc, "button", "pr-btn pri", "Salva come nuovo programma");
  salva.type = "button";
  salva.addEventListener("click", () => {
    const giaAperto = piazzaSalva.querySelector(".pc-salva");
    if (giaAperto) { giaAperto.remove(); return; }
    const fatto = bloccoSalva(doc, {
      onSalvaCome: o.onSalvaCome,
      nomeInUso: o.nomeInUso || nomeDue
    }, o.consultato);
    piazzaSalva.appendChild(fatto.box);
    if (fatto.campo.focus) { try { fatto.campo.focus(); } catch (e) { /* il fuoco non c'è: si scrive lo stesso */ } }
    if (fatto.box.scrollIntoView) { try { fatto.box.scrollIntoView({ block: "nearest" }); } catch (e) { /* senza scorrimento si legge lo stesso */ } }
  });
  tastiPiede.appendChild(chiudiBtn);
  tastiPiede.appendChild(salva);
  piede.appendChild(tastiPiede);

  scatola.appendChild(barra);
  if (vociScheda.length) scatola.appendChild(barraSchede);
  scatola.appendChild(corpo);
  scatola.appendChild(piede);
  doc.body.appendChild(modale);
  disegna();
  if (chiudiBtn.focus) { try { chiudiBtn.focus(); } catch (e) { /* senza fuoco si legge lo stesso */ } }
  return modale;
}

/* Apre la vista di sola lettura di un programma.
 * `opzioni`: { programma, gruppo, attivo:{programma, gruppo}|null, onSalvaCome,
 *             bottone, nomeInUso, confrontaSubito }.
 * Ritorna l'elemento della finestra (utile alle prove). */
export function apriConsultabile(doc, opzioni) {
  const o = opzioni || {};
  if (!doc || !doc.body) return null;
  const gia = doc.querySelector(".pc-modale");
  if (gia) gia.remove();
  const modello = modelloConsultabile(o.programma, o.gruppo);
  const consultato = { modello: modello, gruppo: o.gruppo, grandezze: grandezzeProgramma(o.gruppo) };

  const { modale, scatola, chiudi } = impalcatura(doc, "Programma \u00b7 sola lettura", o.bottone);
  const corpo = el(doc, "div", "pc-corpo");

  const testa = el(doc, "div", "pc-testa");
  testa.appendChild(el(doc, "h4", "pc-nome", nomePulito(modello.nome) || "(senza nome)"));
  testa.appendChild(el(doc, "span", "pc-stato", nomePulito(modello.stato) || NON));
  corpo.appendChild(testa);
  corpo.appendChild(el(doc, "p", "pc-meta", "Periodo: " + modello.periodo));
  corpo.appendChild(el(doc, "p", "pc-meta", "Fase: " + (modello.fase === NON ? NON : nomePulito(modello.fase))));
  corpo.appendChild(el(doc, "p", "pc-meta", "Rotazione: " + modello.rotazione));
  corpo.appendChild(el(doc, "p", "pc-guide",
    "Sola lettura: da qui non si attiva e non si cambia niente. "
    + "Le schede sono quelle lette in B: qui le serie e i recuperi sono quelli della settimana 1, e il confronto ti fa scegliere la settimana."));

  if (!modello.schedeLette) {
    corpo.appendChild(el(doc, "p", "pc-vuoto", modello.motivoSchede || "nessuna scheda letta"));
  } else {
    const schede = el(doc, "div", "pc-schede");
    modello.schede.forEach((s) => schede.appendChild(bloccoSchedaIntera(doc, s, 1, {})));
    corpo.appendChild(schede);
  }

  const azioni = el(doc, "div", "pc-azioni");
  const confronta = el(doc, "button", "pr-btn", "Confronta con quello in uso");
  confronta.type = "button";
  const salva = el(doc, "button", "pr-btn pri", "Salva come nuovo programma");
  salva.type = "button";
  const chiudiBtn = el(doc, "button", "pr-btn", "Chiudi");
  chiudiBtn.type = "button";
  chiudiBtn.addEventListener("click", chiudi);
  azioni.appendChild(confronta);
  azioni.appendChild(salva);
  azioni.appendChild(chiudiBtn);
  corpo.appendChild(azioni);

  const inUso = o.attivo && o.attivo.programma ? o.attivo : null;
  if (!inUso) {
    confronta.disabled = true;
    confronta.title = "spento: non c'è un programma in uso da confrontare";
  } else if (String(inUso.modello ? inUso.modello.id : "") === modello.id) {
    confronta.disabled = true;
    confronta.title = "spento: questo è il programma in uso";
  }

  /* Il confronto si apre in una finestra sua, larga e alta, che scorre dentro:
   * questa vista si chiude e lascia il posto a quella (non si impilano due
   * finestre, e Esc ne chiude una sola). */
  const apriIlConfronto = () => {
    if (!inUso || confronta.disabled) return null;
    const modelloInUso = inUso.modello || modelloConsultabile(inUso.programma, inUso.gruppo);
    chiudi();
    return apriConfronto(doc, {
      consultato: { modello: modello, gruppo: o.gruppo },
      inUso: { modello: modelloInUso, gruppo: inUso.gruppo || null },
      bottone: o.bottone,
      onSalvaCome: o.onSalvaCome,
      nomeInUso: o.nomeInUso || ""
    });
  };
  confronta.addEventListener("click", apriIlConfronto);

  const piazzaSalva = el(doc, "div", "pc-piazza-salva");
  corpo.appendChild(piazzaSalva);
  salva.addEventListener("click", () => {
    const giaAperto = piazzaSalva.querySelector(".pc-salva");
    if (giaAperto) { giaAperto.remove(); return; }
    const fatto = bloccoSalva(doc, {
      onSalvaCome: o.onSalvaCome,
      nomeInUso: o.nomeInUso || (inUso && inUso.modello ? nomePulito(inUso.modello.nome) : "")
    }, consultato);
    piazzaSalva.appendChild(fatto.box);
    if (fatto.campo.focus) { try { fatto.campo.focus(); } catch (e) { /* il fuoco non c'è: si scrive lo stesso */ } }
  });

  scatola.appendChild(corpo);
  doc.body.appendChild(modale);
  /* Arrivando da «Confronta con…» si va dritti alla finestra del confronto. */
  if (o.confrontaSubito === true) apriIlConfronto();
  else if (chiudiBtn.focus) { try { chiudiBtn.focus(); } catch (e) { /* senza fuoco si legge lo stesso */ } }
  return modale;
}
