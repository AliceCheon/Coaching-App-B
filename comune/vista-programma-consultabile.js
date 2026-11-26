/* comune/vista-programma-consultabile.js — PASSO 42: la vista di sola lettura.
 *
 * Alice (26/11/2026): «i programmi archiviati devono essere cliccabili e
 * consultabili e anche confrontabili con la scheda attuale». Da qui si guarda un
 * programma senza attivarlo, lo si confronta con quello in uso e se ne salva
 * una copia come programma nuovo.
 *
 * Regole che questa vista rispetta:
 *  - NON scrive niente e NON attiva niente: le uniche scritture possibili sono
 *    quelle di «Salva come nuovo programma», che crea documenti nuovi e passa
 *    dal servizio ricevuto (che usa comune/scritture-b.js);
 *  - ogni testo preso dai dati passa da `nomePulito` (la regola di casa, e la
 *    guardia 44.03);
 *  - un dato che manca si dichiara con il motivo: mai uno zero o un numero
 *    inventato. L'intensità di carico non si calcola dal programma e la riga lo
 *    dice.
 *
 * Il pannello si apre sul corpo della pagina (una finestra sopra, non dentro la
 * carta): si chiude col ×, con «Chiudi», col clic fuori e con Esc.
 */

import { nomePulito } from "./nome-pulito.js";
import { modelloConsultabile, grandezzeProgramma, confrontoProgrammi, FORMULA_DENSITA } from "./programma-consultabile.js";
import { nomeCopia, fraseCopia } from "./salva-come-programma.js";

const NON = "non registrato";

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
  if (valore == null) return "—";
  const segno = valore > 0 ? "+" : (valore < 0 ? "−" : "");
  return segno + String(Math.abs(valore)).replace(".", ",") + "%";
}

/* La finestra si chiude con ×, «Chiudi», clic sullo sfondo e Esc; il fuoco
 * torna al tasto che l'ha aperta. */
function impalcatura(doc, titolo, bottone) {
  const modale = el(doc, "div", "pr-modal pc-modale");
  modale.setAttribute("role", "dialog");
  modale.setAttribute("aria-modal", "true");
  modale.setAttribute("aria-label", titolo);
  const scatola = el(doc, "div", "pr-mbox pc-box");
  const testa = doc.createElement("header");
  const b = el(doc, "b", null, titolo);
  const x = el(doc, "button", "pr-mx", "\u00d7");
  x.type = "button";
  x.setAttribute("aria-label", "Chiudi");
  testa.appendChild(b);
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
  return { modale: modale, scatola: scatola, chiudi: chiudi };
}

/* La scheda di un programma: una riga per esercizio, con serie, ripetizioni e
 * recupero come sono scritte. Niente carichi: non sono nelle schede. */
function bloccoSchedaIntera(doc, scheda) {
  const box = el(doc, "div", "pc-scheda");
  const testa = el(doc, "p", "pc-scheda-t");
  testa.appendChild(el(doc, "b", null, "Scheda " + nomePulito(scheda.codice)));
  if (testo(scheda.nome)) testa.appendChild(doc.createTextNode(" — " + nomePulito(scheda.nome)));
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
    const tr = el(doc, "tr");
    tr.appendChild(el(doc, "td", "pc-ese", nomePulito(e.nome) || "(senza nome)"));
    tr.appendChild(el(doc, "td", null, e.distretto ? nomePulito(e.distretto) : "—"));
    tr.appendChild(el(doc, "td", "pc-m", e.serie));
    tr.appendChild(el(doc, "td", "pc-m", e.ripetizioni));
    tr.appendChild(el(doc, "td", "pc-m", e.recupero));
    corpo.appendChild(tr);
  });
  tab.appendChild(corpo);
  box.appendChild(tab);
  return box;
}

function righaConfronto(doc, riga) {
  const tr = el(doc, "tr");
  tr.setAttribute("data-riga", riga.chiave);
  tr.appendChild(el(doc, "td", "pc-g", riga.etichetta));
  const celle = [];
  const nonDisp = riga.genere === "non-disponibile";
  const valore = (v, decimali) => {
    if (v == null) return NON;
    return decimali ? numeroInChiaro(v, decimali) : numeroInChiaro(v);
  };
  const decimali = riga.chiave === "densita" ? 2 : 0;
  [riga.uno, riga.due].forEach((v) => {
    const td = el(doc, "td", "pc-m");
    if (nonDisp) td.appendChild(el(doc, "span", "pc-non", "non disponibile"));
    else td.appendChild(doc.createTextNode(valore(v, decimali)));
    tr.appendChild(td);
    celle.push(td);
  });
  const tdVar = el(doc, "td", "pc-m");
  tdVar.appendChild(doc.createTextNode(nonDisp ? "—" : variazioneInChiaro(riga.variazione)));
  tr.appendChild(tdVar);
  if (riga.genere === "solo-uno" && riga.chiave.indexOf("distretto:") === 0) {
    tr.setAttribute("data-solo-uno", "1");
  }
  if (riga.motivo) tr.setAttribute("title", riga.motivo);
  return tr;
}

/* Il confronto con il programma in uso: due colonne e la variazione, SOLO dove
 * il valore c'è da entrambe le parti. Sotto, la formula della densità e le righe
 * dichiarate non calcolabili, col motivo. */
function bloccoConfronto(doc, consultato, inUso) {
  const box = el(doc, "div", "pc-confronto");
  const uno = Object.assign({}, consultato.grandezze);
  const due = Object.assign({}, inUso.grandezze);
  const confronto = confrontoProgrammi(uno, due, {
    nomeUno: nomePulito(consultato.modello.nome), idUno: consultato.modello.id,
    nomeDue: nomePulito(inUso.modello.nome), idDue: inUso.modello.id
  });
  box.appendChild(el(doc, "p", "pc-titolo2", "Confronto con il programma in uso"));
  const tab = el(doc, "table", "pc-tab pc-tab-confronto");
  const thead = el(doc, "thead");
  const trh = el(doc, "tr");
  [
    ["Grandezza", ""],
    ["Questo · " + nomePulito(consultato.modello.nome), ""],
    ["In uso · " + nomePulito(inUso.modello.nome), ""],
    ["Variazione", ""]
  ].forEach(([t]) => trh.appendChild(el(doc, "th", null, t)));
  thead.appendChild(trh);
  tab.appendChild(thead);
  const corpo = el(doc, "tbody");
  confronto.righe.forEach((riga) => corpo.appendChild(righaConfronto(doc, riga)));
  tab.appendChild(corpo);
  box.appendChild(tab);

  const note = el(doc, "div", "pc-note");
  note.appendChild(el(doc, "p", "pc-nota", "Formula della densità: " + FORMULA_DENSITA));
  note.appendChild(el(doc, "p", "pc-nota", "Volume: le serie della settimana 1, contate sul distretto scritto nell'esercizio."));
  const motivi = [];
  if (consultato.grandezze.motivoDensita) motivi.push("Questo: " + consultato.grandezze.motivoDensita + ".");
  if (inUso.grandezze.motivoDensita) motivi.push("In uso: " + inUso.grandezze.motivoDensita + ".");
  if (consultato.grandezze.motivoVolume) motivi.push("Questo: " + consultato.grandezze.motivoVolume + ".");
  if (inUso.grandezze.motivoVolume) motivi.push("In uso: " + inUso.grandezze.motivoVolume + ".");
  motivi.forEach((m) => note.appendChild(el(doc, "p", "pc-nota male", m)));
  note.appendChild(el(doc, "p", "pc-nota", "Intensità di carico: non disponibile — i carichi non stanno nelle schede, vivono nel logbook."));
  box.appendChild(note);
  return box;
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
    crea.textContent = "Creo…";
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

/* Apre la vista di sola lettura di un programma.
 * `opzioni`: { programma, gruppo, attivo:{programma, gruppo}|null, onSalvaCome,
 *             bottone, nomeInUso }.
 * Ritorna l'elemento della finestra (utile alle prove). */
export function apriConsultabile(doc, opzioni) {
  const o = opzioni || {};
  if (!doc || !doc.body) return null;
  const gia = doc.querySelector(".pc-modale");
  if (gia) gia.remove();
  const modello = modelloConsultabile(o.programma, o.gruppo);
  const consultato = { modello: modello, gruppo: o.gruppo, grandezze: grandezzeProgramma(o.gruppo) };

  const { modale, scatola, chiudi } = impalcatura(doc, "Programma · sola lettura", o.bottone);
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
    + "Le schede sono quelle lette in B, con le serie e i recuperi scritti."));

  if (!modello.schedeLette) {
    corpo.appendChild(el(doc, "p", "pc-vuoto", modello.motivoSchede || "nessuna scheda letta"));
  } else {
    const schede = el(doc, "div", "pc-schede");
    modello.schede.forEach((s) => schede.appendChild(bloccoSchedaIntera(doc, s)));
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

  const piazzaConfronto = el(doc, "div", "pc-piazza-confronto");
  corpo.appendChild(piazzaConfronto);
  confronta.addEventListener("click", () => {
    if (!inUso) return;
    const giaAperto = piazzaConfronto.querySelector(".pc-confronto");
    if (giaAperto) { giaAperto.remove(); return; }
    const modelloInUso = inUso.modello || modelloConsultabile(inUso.programma, inUso.gruppo);
    const blocco = bloccoConfronto(doc, consultato,
      { modello: modelloInUso, grandezze: grandezzeProgramma(inUso.gruppo) });
    piazzaConfronto.appendChild(blocco);
    if (blocco.scrollIntoView) { try { blocco.scrollIntoView({ block: "nearest" }); } catch (e) { /* senza scorrimento si legge lo stesso */ } }
  });

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
  /* Arrivando da «Confronta con…» il confronto è già aperto: il tasto resta
   * per chiuderlo, non per aprirlo una seconda volta. */
  if (o.confrontaSubito === true && confronta.disabled !== true) confronta.click();
  if (chiudiBtn.focus) { try { chiudiBtn.focus(); } catch (e) { /* senza fuoco si legge lo stesso */ } }
  return modale;
}
