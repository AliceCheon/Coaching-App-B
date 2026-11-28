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
  modelloConsultabile, grandezzeProgramma, settimaneDelConfronto,
  valoriSettimana, volumeDelleSchede, FORMULA_DENSITA, MOTIVO_CARICO
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
  /* Passo 29 — larghezze proporzionali, non px fissi: la colonna ESERCIZIO si
   * prende quasi tutto, SERIE/RIP./REC. restano strette ma sempre DENTRO la
   * finestra (la REC. veniva coperta dalla Diva ed era il taglio che Alice
   * vedeva). Con `table-layout:fixed` il contenuto non allarga la tabella. */
  ["62%", "11%", "12%", "15%"].forEach((larghezza) => {
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

/* Passo 28 — la tabella «Differenze» è stata tolta dalla finestra su richiesta
 * di Alice (27/11/2026). Passo 30 — anche la funzione pura che la alimentava
 * (le differenze per distretto di una settimana) è stata tolta da
 * comune/programma-consultabile.js: nessuno la chiamava più.
 * L'idea di «differenza per distretto» ora la racconta il blocco «Volume»:
 * due barre sulla stessa scala, il Δ a destra e «Tutte le settimane».
 */

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

/* Passo 27 — il blocco «Volume» del confronto è quello del mockup nuovo di
 * Alice (27/11/2026). Dentro il confronto A resta sullo sfondo e B ci balla
 * sopra: non è più una tabella per scheda, è una lettura per PROGRAMMA.
 *
 * Cosa c'è (e cosa vuol dire):
 *  - il selettore W1…Wn sulle settimane del programma e i due modi:
 *    «Settimana» (due barre per distretto e il Δ) e «Tutte le settimane»
 *    (griglia di calore distretto × settimana, una riga A e una B);
 *  - tre riquadri: serie della scheda A, serie della scheda B e variazione in
 *    % (verde se sale, rosa se scende, grigio se pari), più chi sale, chi
 *    scende e i distretti senza dato;
 *  - una riga per distretto con la barra A di sfondo e la barra B sopra, su una
 *    scala comune, e il Δ a destra;
 *  - l'ordinamento: Δ maggiore, Δ minore, volume della scheda B, A→Z;
 *  - la legenda con l'unità: serie dirette per distretto nella settimana.
 *
 * Le barre sommano le schede ACCESE di quel programma, e una riga in chiaro
 * dice quali («A · schede A+B»). «A» è il programma consultato (a sinistra),
 * «B» quello in uso (a destra), come nel resto del confronto.
 * Un dato mancante non diventa mai uno zero: la cella è tratteggiata e il Δ
 * scrive «n.d.» col motivo. Il Δ si calcola solo quando ci sono entrambi. */
function sezioneVolume(doc, o) {
  const quadro = o.quadro || { modo: "settimana", ordine: "delta-desc" };
  if (!quadro.modo) quadro.modo = "settimana";
  if (!quadro.ordine) quadro.ordine = "delta-desc";
  const settimane = (Array.isArray(o.settimane) ? o.settimane : []).slice();
  const schede = (Array.isArray(o.schede) ? o.schede : []).slice();
  const programmi = (Array.isArray(o.programmi) ? o.programmi : []).slice(0, 2);
  const nomeScheda = (c) => (c === NON || c == null || c === "" ? "senza lettera" : c);

  /* Per ogni programma: le schede accese che ci sono davvero e il volume per
   * distretto settimana per settimana (solo quelle schede). */
  const letture = programmi.map((p) => {
    const perScheda = p && p.grandezze && Array.isArray(p.grandezze.perScheda) ? p.grandezze.perScheda : [];
    const codici = schede.filter((c) => perScheda.some((s) => s.codice === c));
    return {
      nome: nomePulito(p && p.nome),
      etichetta: testo(p && p.etichetta),
      codici: codici,
      settimane: settimane.map((n) => (codici.length ? volumeDelleSchede(p.grandezze, codici, n) : Object.create(null)))
    };
  });
  while (letture.length < 2) {
    letture.push({ nome: "", etichetta: "", codici: [], settimane: settimane.map(() => Object.create(null)) });
  }

  const distretti = [];
  letture.forEach((l) => l.settimane.forEach((m) => {
    Object.keys(m).forEach((d) => { if (distretti.indexOf(d) === -1) distretti.push(d); });
  }));

  /* La scala comune alle due barre (e alla griglia): il valore più alto di tutti
   * quelli disegnati, arrotondato a un numero pari — la stessa scelta del
   * mockup, così le tacche cadono sui numeri tondi. */
  let massimo = 0;
  letture.forEach((l) => l.settimane.forEach((m) => Object.keys(m).forEach((d) => {
    if (m[d] > massimo) massimo = m[d];
  })));
  const scala = Math.max(2, Math.ceil(massimo / 2) * 2);

  const valore = (k, i, d) => {
    const m = letture[k] && letture[k].settimane[i] ? letture[k].settimane[i] : null;
    const v = m ? m[d] : null;
    return typeof v === "number" ? v : null;
  };
  const deltaDi = (i, d) => {
    const a = valore(0, i, d);
    const b = valore(1, i, d);
    return a == null || b == null ? null : Math.round((b - a) * 100) / 100;
  };

  const box = el(doc, "section", "pc-volume-sett pc-vol2");
  box.setAttribute("aria-label", "Volume per distretto");
  box.setAttribute("data-schede", schede.join(","));
  const titolo = el(doc, "h5", "pc-vol-t", "");
  box.appendChild(titolo);
  box.appendChild(el(doc, "p", "pc-vol-guida",
    "Scheda A = il programma consultato (a sinistra), scheda B = quello in uso (a destra). "
    + "Una riga per distretto: la barra A resta sullo sfondo, la B ci balla sopra, sulla stessa scala. "
    + "Le W sono le settimane del programma, e sono le stesse del confronto qui sopra: cambiando qui cambia anche quello."));

  /* ---------- i comandi: settimana, modo, ordinamento ---------- */
  const barra = el(doc, "div", "pc-vol2-barra");
  const settBox = el(doc, "div", "pc-vol2-settimane");
  settBox.setAttribute("role", "tablist");
  settBox.setAttribute("aria-label", "Settimana del volume");
  const tastiSett = settimane.map((n) => {
    const b = el(doc, "button", "pc-vol2-sett", "W" + n);
    b.type = "button";
    b.setAttribute("role", "tab");
    b.setAttribute("data-w", String(n));
    b.addEventListener("click", () => {
      if (typeof o.onSettimana === "function") o.onSettimana(n);
      else { quadro.settimana = n; render(); }
    });
    settBox.appendChild(b);
    return b;
  });
  const modi = el(doc, "div", "pc-vol2-modi");
  modi.setAttribute("role", "group");
  modi.setAttribute("aria-label", "Vista del volume");
  const tastiModo = [["settimana", "Settimana"], ["tutte", "Tutte le settimane"]].map((voce) => {
    const b = el(doc, "button", "pc-vol2-modo", voce[1]);
    b.type = "button";
    b.setAttribute("data-modo", voce[0]);
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => { quadro.modo = voce[0]; render(); });
    modi.appendChild(b);
    return b;
  });
  const ordina = el(doc, "label", "pc-vol2-ordina");
  ordina.appendChild(el(doc, "span", null, "Ordina"));
  const sel = doc.createElement("select");
  sel.className = "pc-vol2-ordine";
  sel.setAttribute("aria-label", "Ordina le righe");
  [["delta-desc", "\u0394 maggiore"], ["delta-asc", "\u0394 minore"],
    ["volume", "Volume scheda B"], ["az", "A \u2192 Z"]].forEach((voce) => {
    const opt = doc.createElement("option");
    opt.value = voce[0];
    opt.textContent = voce[1];
    sel.appendChild(opt);
  });
  sel.value = quadro.ordine;
  sel.addEventListener("change", () => { quadro.ordine = sel.value; render(); });
  ordina.appendChild(sel);
  barra.appendChild(settBox);
  barra.appendChild(modi);
  barra.appendChild(ordina);
  box.appendChild(barra);

  /* ---------- quali schede sommano, per programma ---------- */
  const chi = el(doc, "div", "pc-vol2-chi");
  letture.forEach((l, k) => {
    const riga = el(doc, "p", "pc-vol2-chi-riga");
    riga.setAttribute("data-quale", k === 0 ? "a" : "b");
    riga.appendChild(el(doc, "i", "pc-pallino " + (k === 0 ? "a" : "b")));
    riga.appendChild(el(doc, "b", null, k === 0 ? "A" : "B"));
    riga.appendChild(doc.createTextNode(" "));
    riga.appendChild(el(doc, "span", null, k === 0 ? (l.etichetta || "consultato") : "in uso"));
    riga.appendChild(doc.createTextNode(" \u00b7 "));
    riga.appendChild(el(doc, "span", "pc-vol2-chi-schede", l.codici.length
      ? "schede " + l.codici.map(nomeScheda).join("+")
      : "nessuna delle schede accese \u00e8 in questo programma"));
    if (l.nome) riga.appendChild(el(doc, "span", "pc-vol2-chi-nome", " \u2014 " + nomePulito(l.nome)));
    chi.appendChild(riga);
  });
  box.appendChild(chi);

  const kpi = el(doc, "div", "pc-vol2-kpi");
  const vuoto = el(doc, "p", "pc-vol2-vuoto", "");
  const vistaSett = el(doc, "div", "pc-vol2-vista");
  const vistaTutte = el(doc, "div", "pc-vol2-vista");
  box.appendChild(kpi);
  box.appendChild(vuoto);
  box.appendChild(vistaSett);
  box.appendChild(vistaTutte);

  const ordinati = (indice) => {
    const arr = distretti.slice();
    const confronta = (x, y) => nomePulito(x).localeCompare(nomePulito(y), "it");
    const sommaB = (d) => letture[1].settimane.reduce((s, m) => {
      const v = m[d];
      return s + (typeof v === "number" ? v : 0);
    }, 0);
    if (quadro.ordine === "az") {
      arr.sort(confronta);
    } else if (quadro.ordine === "volume") {
      arr.sort((x, y) => sommaB(y) - sommaB(x) || confronta(x, y));
    } else {
      arr.sort((x, y) => {
        const dx = deltaDi(indice, x);
        const dy = deltaDi(indice, y);
        if (dx == null && dy == null) return confronta(x, y);
        if (dx == null) return 1;
        if (dy == null) return -1;
        const d = quadro.ordine === "delta-asc" ? dx - dy : dy - dx;
        return d || confronta(x, y);
      });
    }
    return arr;
  };

  const legenda = (destinazione, unita, nota) => {
    const l = el(doc, "div", "pc-vol2-legenda");
    const voce = (classe, t) => {
      const s = el(doc, "span", null, "");
      s.appendChild(el(doc, "i", classe));
      s.appendChild(doc.createTextNode(t));
      l.appendChild(s);
    };
    voce("la", "scheda A \u00b7 " + (letture[0].nome ? nomePulito(letture[0].nome) : "consultato"));
    voce("lb", "scheda B \u00b7 " + (letture[1].nome ? nomePulito(letture[1].nome) : "in uso"));
    l.appendChild(el(doc, "span", null, unita));
    destinazione.appendChild(l);
    if (nota) destinazione.appendChild(el(doc, "p", "pc-vol2-nota", nota));
  };

  const cellaCalore = (v, quale, n) => {
    const td = el(doc, "td", "pc-vol2-cella");
    td.setAttribute("data-settimana", String(n));
    td.setAttribute("data-quale", quale);
    if (v == null) {
      td.className = "pc-vol2-cella manca";
      td.textContent = "\u2013";
      td.setAttribute("title", "dato non registrato: settimana " + n + ", scheda " + quale.toUpperCase());
      return td;
    }
    /* Il colore è il gettone della scheda (lav per A, pink per B), caricato
     * quanto serie ci sono: mai un colore nuovo. */
    const peso = Math.round(Math.max(10, Math.min(42, 10 + 32 * (v / scala))));
    td.setAttribute("style", "background:color-mix(in srgb, var("
      + (quale === "a" ? "--lav" : "--pink") + ") " + peso + "%, transparent)");
    td.textContent = numeroInChiaro(v);
    return td;
  };

  function render() {
    const indice = Math.max(0, settimane.indexOf(Number(quadro.settimana)));
    const numero = settimane.length ? settimane[indice] : 1;
    const tutte = quadro.modo === "tutte";
    box.setAttribute("data-vista", tutte ? "tutte" : "settimana");
    box.setAttribute("data-settimana", String(numero));
    box.setAttribute("data-ordine", quadro.ordine);
    titolo.textContent = "Volume per distretto \u00b7 "
      + (tutte ? "tutte le settimane" : "settimana " + numero);
    tastiSett.forEach((b) => {
      const suo = Number(b.getAttribute("data-w")) === numero;
      b.classList.toggle("on", suo);
      b.setAttribute("aria-selected", suo ? "true" : "false");
    });
    tastiModo.forEach((b) => {
      const suo = b.getAttribute("data-modo") === quadro.modo;
      b.classList.toggle("on", suo);
      b.setAttribute("aria-pressed", suo ? "true" : "false");
    });
    sel.value = quadro.ordine;

    /* ---------- i tre riquadri ---------- */
    const sommaDi = (k, i) => distretti.reduce((s, d) => {
      const v = valore(k, i, d);
      return s + (v == null ? 0 : v);
    }, 0);
    const totA = sommaDi(0, indice);
    const totB = sommaDi(1, indice);
    const pct = totA > 0 ? Math.round((totB - totA) / totA * 100) : null;
    let su = 0;
    let giu = 0;
    let pari = 0;
    let senza = 0;
    distretti.forEach((d) => {
      const a = valore(0, indice, d);
      const b = valore(1, indice, d);
      if (a == null || b == null) senza += 1;
      else if (b > a) su += 1;
      else if (b < a) giu += 1;
      else pari += 1;
    });
    kpi.textContent = "";
    const carta = (chiave, etichetta, testoValore, piccolo, classeValore) => {
      const c = el(doc, "div", "pc-vol2-kpi-c");
      c.setAttribute("data-kpi", chiave);
      c.appendChild(el(doc, "span", "pc-vol2-kpi-k", etichetta));
      const v = el(doc, "span", "pc-vol2-kpi-v" + (classeValore ? " " + classeValore : ""), testoValore);
      if (piccolo != null && piccolo !== "") v.appendChild(el(doc, "small", null, piccolo));
      c.appendChild(v);
      kpi.appendChild(c);
    };
    const classePct = pct == null ? "pari" : (pct > 0 ? "su" : (pct < 0 ? "giu" : "pari"));
    carta("a", "Serie \u00b7 scheda A", numeroInChiaro(totA), "W" + numero, null);
    carta("b", "Serie \u00b7 scheda B", numeroInChiaro(totB), "W" + numero, null);
    carta("pct", "Variazione volume",
      pct == null ? TRATTINO : (pct > 0 ? "+" : (pct < 0 ? "\u2212" : "")) + Math.abs(pct),
      pct == null ? "totale A a zero" : "% \u00b7 W" + numero + " " + numeroInChiaro(totA) + "\u2192" + numeroInChiaro(totB),
      classePct);
    carta("distretti", "Distretti", su + "\u2191 " + giu + "\u2193 ",
      (pari ? pari + " = \u00b7 " : "") + senza + " senza dato", null);

    const nessunDato = !distretti.length;
    kpi.hidden = nessunDato;
    vuoto.hidden = !nessunDato;
    if (nessunDato) {
      const perche = letture.map((l) => (l.codici.length || !l.nome ? ""
        : "\u00ab" + nomePulito(l.nome) + "\u00bb: nessuna delle schede accese \u00e8 in questo programma")).filter(Boolean);
      vuoto.textContent = "Nessuna serie scritta " + (tutte ? "in nessuna settimana" : "nella settimana " + numero)
        + " nelle schede accese. Non \u00e8 una settimana a zero: \u00e8 una settimana che i dati non scrivono."
        + (perche.length ? " " + perche.join(". ") + "." : "");
      vistaSett.textContent = "";
      vistaTutte.textContent = "";
      return;
    }
    vuoto.textContent = "";

    /* ---------- vista «Settimana»: due barre e il Δ ---------- */
    vistaSett.textContent = "";
    const assi = el(doc, "div", "pc-vol2-assi");
    assi.appendChild(el(doc, "div", null, ""));
    const ticks = el(doc, "div", "pc-vol2-ticks");
    for (let v = 0; v <= scala; v += 2) {
      const t = el(doc, "span", null, String(v));
      t.setAttribute("style", "left:" + (v / scala * 100) + "%");
      ticks.appendChild(t);
    }
    assi.appendChild(ticks);
    assi.appendChild(el(doc, "div", "pc-vol2-assi-v", "Variazione"));
    vistaSett.appendChild(assi);

    ordinati(indice).forEach((d) => {
      const a = valore(0, indice, d);
      const b = valore(1, indice, d);
      const delta = deltaDi(indice, d);
      const riga = el(doc, "div", "pc-vol2-riga");
      riga.setAttribute("data-distretto", d);
      const nome = el(doc, "p", "pc-vol2-nome", nomePulito(d));
      nome.appendChild(el(doc, "small", null,
        (a == null ? "\u2013" : numeroInChiaro(a)) + " \u2192 " + (b == null ? "\u2013" : numeroInChiaro(b))));
      riga.appendChild(nome);
      const pista = el(doc, "div", "pc-vol2-pista");
      if (a == null && b == null) {
        const fantasma = el(doc, "span", "pc-vol2-fantasma");
        fantasma.setAttribute("title", "dato non registrato in nessuno dei due programmi");
        pista.appendChild(fantasma);
      } else {
        if (a != null) {
          const barraA = el(doc, "span", "pc-vol2-bar-a");
          barraA.setAttribute("style", "width:" + (a / scala * 100) + "%");
          barraA.setAttribute("title", "scheda A: " + numeroInChiaro(a) + " serie");
          pista.appendChild(barraA);
        }
        if (b != null) {
          const barraB = el(doc, "span", "pc-vol2-bar-b");
          barraB.setAttribute("style", "width:" + (b / scala * 100) + "%");
          barraB.setAttribute("title", "scheda B: " + numeroInChiaro(b) + " serie");
          pista.appendChild(barraB);
        }
        if (a == null || b == null) pista.setAttribute("data-manca", a == null ? "a" : "b");
      }
      riga.appendChild(pista);
      const cella = el(doc, "div", "pc-vol2-delta");
      if (delta == null) {
        const manca = a == null && b == null ? "manca A e B" : (a == null ? "manca A" : "manca B");
        cella.setAttribute("data-stato", "nd");
        cella.setAttribute("title", "il \u0394 non si calcola: " + manca.toLowerCase());
        cella.appendChild(el(doc, "b", null, "n.d."));
        cella.appendChild(el(doc, "small", null, manca));
      } else if (delta > 0) {
        cella.setAttribute("data-stato", "su");
        cella.appendChild(el(doc, "b", null, "\u25b2 " + differenzaInChiaro(delta)));
        cella.appendChild(el(doc, "small", null,
          variazioneInChiaro(a > 0 ? Math.round((b - a) / a * 100) : null)));
      } else if (delta < 0) {
        cella.setAttribute("data-stato", "giu");
        cella.appendChild(el(doc, "b", null, "\u25bc " + differenzaInChiaro(delta)));
        cella.appendChild(el(doc, "small", null,
          variazioneInChiaro(a > 0 ? Math.round((b - a) / a * 100) : null)));
      } else {
        cella.setAttribute("data-stato", "pari");
        cella.appendChild(el(doc, "b", null, "= 0"));
        cella.appendChild(el(doc, "small", null, "identico"));
      }
      riga.appendChild(cella);
      vistaSett.appendChild(riga);
    });
    legenda(vistaSett, "Unit\u00e0: serie dirette per distretto nella settimana",
      "Cella tratteggiata = dato non registrato: mai uno zero al suo posto. "
      + "Il \u0394 si scrive solo quando ci sono entrambi i valori; altrimenti \u00abn.d.\u00bb e il motivo.");
    vistaSett.hidden = tutte;

    /* ---------- vista «Tutte le settimane»: griglia di calore ---------- */
    vistaTutte.textContent = "";
    const tab = el(doc, "table", "pc-vol2-calore");
    /* Le colonne: il nome stretto, la lettera A/B, e le settimane che si
     * dividono lo spazio che resta (con il layout fisso il nome non si mangia
     * metà della griglia). */
    const cg = doc.createElement("colgroup");
    [["150px"], ["24px"]].forEach((larghezza) => {
      const c = doc.createElement("col");
      c.setAttribute("style", "width:" + larghezza[0]);
      cg.appendChild(c);
    });
    settimane.forEach(() => cg.appendChild(doc.createElement("col")));
    tab.appendChild(cg);
    const thead = el(doc, "thead");
    const trh = el(doc, "tr");
    const thn = el(doc, "th", "pc-vol2-th-n", "Distretto");
    thn.setAttribute("colspan", "2");
    trh.appendChild(thn);
    settimane.forEach((n) => trh.appendChild(el(doc, "th", null, "W" + n)));
    thead.appendChild(trh);
    tab.appendChild(thead);
    const corpoTab = el(doc, "tbody");
    ordinati(indice).forEach((d) => {
      const diff = settimane.map((n, i) => deltaDi(i, d)).filter((x) => x != null);
      const media = diff.length ? diff.reduce((s, x) => s + x, 0) / diff.length : null;
      const nomeCella = el(doc, "td", "pc-vol2-nm");
      nomeCella.setAttribute("rowspan", "2");
      nomeCella.setAttribute("data-distretto", d);
      nomeCella.appendChild(doc.createTextNode(nomePulito(d)));
      const mediaTesto = media == null ? "n.d. in tutte le settimane"
        : (media > 0 ? "\u25b2 +" : (media < 0 ? "\u25bc \u2212" : "= "))
          + Math.abs(media).toFixed(1).replace(".", ",") + " media";
      nomeCella.appendChild(el(doc, "small", null, mediaTesto));
      const rigaA = el(doc, "tr", "pc-vol2-riga-a");
      rigaA.setAttribute("data-distretto", d);
      rigaA.appendChild(nomeCella);
      rigaA.appendChild(el(doc, "td", "pc-vol2-tag pc-vol2-tag-a", "A"));
      settimane.forEach((n, i) => rigaA.appendChild(cellaCalore(valore(0, i, d), "a", n)));
      corpoTab.appendChild(rigaA);
      const rigaB = el(doc, "tr", "pc-vol2-riga-b");
      rigaB.setAttribute("data-distretto", d);
      rigaB.appendChild(el(doc, "td", "pc-vol2-tag pc-vol2-tag-b", "B"));
      settimane.forEach((n, i) => rigaB.appendChild(cellaCalore(valore(1, i, d), "b", n)));
      corpoTab.appendChild(rigaB);
    });
    tab.appendChild(corpoTab);
    vistaTutte.appendChild(tab);
    legenda(vistaTutte, "Pi\u00f9 il colore \u00e8 carico, pi\u00f9 serie. Cella tratteggiata = dato non registrato.",
      "I riquadri in alto restano quelli della settimana scelta (W" + numero + "): la griglia invece le mostra tutte.");
    vistaTutte.hidden = !tutte;
  }

  render();
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
  /* Passo 27 — la vista del volume ha una settimana, una vista e un ordine
   * suoi; la settimana resta la stessa del confronto (cambiarla da lì muove
   * anche le colonne, così non si leggono due settimane diverse nello stesso
   * pannello), mentre vista e ordine vivono solo dentro il blocco. */
  const statoVolume = { settimana: 1, modo: "settimana", ordine: "delta-desc" };

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
        + ". Il volume per distretto di tutte le schede accese è nel blocco \u00abVolume\u00bb, pi\u00f9 sotto.";
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

    /* Passo 28 — la tabella «Differenze · scheda X · settimana Y» non c'è più:
     * Alice (27/11/2026) ha detto che non le serve, perché il blocco «Volume»
     * qui sotto fa lo stesso lavoro meglio (due barre sulla stessa scala, il Δ
     * per distretto e la griglia di tutte le settimane). Al suo posto non resta
     * niente da leggere: il volume è il primo blocco dopo le due colonne. */

    /* Passo 27 — il volume per distretto è il blocco del mockup nuovo: A di
     * sfondo e B sopra, le schede accese sommate, «Tutte le settimane» a
     * griglia di calore. */
    statoVolume.settimana = n;
    corpo.appendChild(sezioneVolume(doc, {
      settimane: tastiSettimana.map((s) => s.numero),
      schede: schedeAccese,
      quadro: statoVolume,
      onSettimana: (numero) => { settimanaScelta = numero; disegna(); },
      programmi: [
        { quale: "uno", nome: nomeUno, etichetta: etichettaUno, grandezze: grandezzeUno },
        { quale: "due", nome: nomeDue, etichetta: "in uso", grandezze: grandezzeDue }
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
