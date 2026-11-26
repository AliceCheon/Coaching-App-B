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
function bloccoSchedaIntera(doc, scheda, numero) {
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

/* La riga compatta del volume: una pastiglia per distretto con la somma delle
 * serie di quella settimana. Una settimana senza serie scritte non è una
 * settimana a zero: lo dice. */
function pastiglieVolume(doc, settimana) {
  const box = el(doc, "div", "pc-volumi");
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

/* I totali del programma per la settimana scelta: serie, esercizi, densità. La
 * densità è un numero solo quando i recuperi ci sono tutti; altrimenti dice che
 * non si calcola e il motivo sta sotto, scheda per scheda. */
function totaliProgramma(doc, modello, settimana) {
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
  voce("Serie a settimana", serie);
  voce("Esercizi", numeroInChiaro(modello.numeroEsercizi));
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

/* L'ordine unico delle righe: prima gli esercizi del programma di sinistra nel
 * loro ordine, poi quelli che stanno solo a destra. Così le due colonne hanno le
 * stesse righe, e riga per riga si legge il confronto. Il legame fra i due è il
 * nome dell'esercizio (gli id sono diversi da un programma all'altro). */
function righeUnite(schedaUno, schedaDue) {
  const sinistra = (schedaUno && schedaUno.esercizi) || [];
  const destra = (schedaDue && schedaDue.esercizi) || [];
  /* Il nome pulito da tutte e due le parti: «hip_thrust» e «Hip thrust» sono lo
   * stesso esercizio, e il confronto non si rompe per un trattino basso. */
  const chiave = (e) => nomePulito(testo(e && e.nome)).toLowerCase();
  const presi = [];
  const righe = [];
  sinistra.forEach((e) => {
    let trovato = -1;
    for (let i = 0; i < destra.length; i += 1) {
      if (presi.indexOf(i) !== -1) continue;
      if (chiave(destra[i]) === chiave(e)) { trovato = i; break; }
    }
    if (trovato >= 0) presi.push(trovato);
    righe.push({ uno: e, due: trovato >= 0 ? destra[trovato] : null });
  });
  destra.forEach((e, i) => {
    if (presi.indexOf(i) === -1) righe.push({ uno: null, due: e });
  });
  return righe;
}

/* La tabella di una colonna per la scheda e la settimana scelte. Il distretto
 * sta su una riga piccola sotto il nome (a metà larghezza non c'è posto per una
 * colonna sua). Le righe sono quelle comuni: dove l'esercizio non c'è, il nome è
 * un trattino e le caselle restano vuote. */
function tabellaColonna(doc, righe, lato, numero) {
  const tab = el(doc, "table", "pc-tab pc-col-tab");
  const cg = doc.createElement("colgroup");
  ["auto", "52px", "58px", "62px"].forEach((larghezza) => {
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
      tr.appendChild(el(doc, "td", "pc-n", v.serie || TRATTINO));
      tr.appendChild(el(doc, "td", "pc-n", v.ripetizioni || TRATTINO));
      tr.appendChild(el(doc, "td", "pc-n", v.recupero || TRATTINO));
    }
    corpo.appendChild(tr);
  });
  tab.appendChild(corpo);
  return tab;
}

/* Una colonna del confronto: nome del programma col pallino, il conto, le
 * pastiglie del volume della settimana, la scheda scelta (o la frase che dice
 * che quel programma non ce l'ha) e i totali in fondo. */
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
  col.appendChild(pastiglieVolume(doc, o.settimana));

  if (!o.scheda) {
    col.appendChild(el(doc, "p", "pc-vuoto pc-scheda-manca",
      "Scheda " + (o.codice === NON ? "senza lettera" : o.codice) + " non presente in questo programma"));
  } else {
    const titolo = "Scheda " + (o.codice === NON ? "senza lettera" : o.codice)
      + (testo(o.scheda.nome) ? " \u2014 " + nomePulito(o.scheda.nome) : "");
    col.appendChild(el(doc, "p", "pc-col-scheda", titolo));
    if (!o.scheda.esercizi.length) {
      col.appendChild(el(doc, "p", "pc-vuoto", "Questa scheda non ha esercizi leggibili."));
    } else {
      col.appendChild(tabellaColonna(doc, o.righe, o.lato, o.numero));
    }
  }
  col.appendChild(totaliProgramma(doc, o.modello, o.settimana));
  return col;
}

/* Le differenze per distretto della settimana scelta. Δ è «questo meno quello in
 * uso»: verde quando il consultato ne ha di più, rosso quando ne ha di meno. Se
 * un distretto c'è da una parte sola, la riga dice «non registrato» e non
 * calcola nessuna differenza: zero non si inventa. */
function sezioneDifferenze(doc, confronto, nomeUno, nomeDue) {
  const box = el(doc, "section", "pc-differenze");
  box.setAttribute("aria-label", "Differenze della settimana");
  box.appendChild(el(doc, "h5", "pc-diff-t", "Differenze \u00b7 settimana " + confronto.settimana));
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
  let schedaScelta = vociScheda.length ? vociScheda[0].codice : null;
  let sottoTitolo = null;

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
   * dei due programmi; la scelta vale per tutte e due le colonne. */
  const barraSchede = el(doc, "div", "pc-schede-tab");
  barraSchede.setAttribute("role", "tablist");
  barraSchede.setAttribute("aria-label", "Scheda");
  barraSchede.appendChild(el(doc, "span", "pc-sett-davanti", "Scheda"));
  const tastiScheda = vociScheda.map((v) => {
    const b = el(doc, "button", "pc-st");
    b.type = "button";
    b.setAttribute("role", "tab");
    b.setAttribute("data-scheda", v.codice);
    b.appendChild(doc.createTextNode(v.etichetta));
    b.addEventListener("click", () => { schedaScelta = v.codice; disegna(); });
    barraSchede.appendChild(b);
    return b;
  });

  const corpo = el(doc, "div", "pc-corpo pc-corpo-confronto pc-confronto");
  const piazzaSalva = el(doc, "div", "pc-piazza-salva");

  /* Disegna tutto quello che dipende da settimana e scheda scelte. */
  function disegna() {
    const n = settimanaScelta;
    tasti.forEach((b) => {
      const suo = Number(b.getAttribute("data-s")) === n;
      b.classList.toggle("on", suo);
      b.setAttribute("aria-selected", suo ? "true" : "false");
    });
    tastiScheda.forEach((b) => {
      const suo = b.getAttribute("data-scheda") === schedaScelta;
      b.classList.toggle("on", suo);
      b.setAttribute("aria-selected", suo ? "true" : "false");
    });

    const schedaUno = schedaConCodice(modelloUno, schedaScelta);
    const schedaDue = schedaConCodice(modelloDue, schedaScelta);
    const righe = righeUnite(schedaUno, schedaDue);
    const settUno = grandezzeUno.perSettimana[n - 1];
    const settDue = grandezzeDue.perSettimana[n - 1];
    if (sottoTitolo) {
      sottoTitolo.textContent = "Settimana " + n
        + (schedaScelta == null ? "" : " \u00b7 Scheda " + (schedaScelta === NON ? "senza lettera" : schedaScelta));
    }

    corpo.textContent = "";
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
    corpo.appendChild(sezioneDifferenze(doc,
      confrontoSettimana(grandezzeUno, grandezzeDue, n, { nomeUno: nomeUno, nomeDue: nomeDue }),
      nomeUno, nomeDue));
    corpo.appendChild(noteDichiarate(doc, [
      { nome: nomeUno, settimana: settUno },
      { nome: nomeDue, settimana: settDue }
    ]));
    corpo.appendChild(piazzaSalva);
    corpo.setAttribute("data-settimana", String(n));
  }

  const piede = el(doc, "footer", "pc-piede");
  piede.appendChild(el(doc, "span", "pc-suggerimento", "Clicca un'altra settimana: la scheda cambia con lei."));
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
    modello.schede.forEach((s) => schede.appendChild(bloccoSchedaIntera(doc, s, 1)));
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
