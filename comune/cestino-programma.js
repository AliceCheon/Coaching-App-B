/* Barbell Diva B — PASS0 25: un cestino solo per programma, nell'Archivio.
 *
 * Alice (27/11/2026): «quel cestino accanto a ogni scheda è orrendo.. io volevo
 * 1 cestino solo per programma, e lo voglio solo nell'archivio che poi se lo
 * cancello da lì sparisce automaticamente da tutte le parti».
 *
 * Cosa fa, in chiaro:
 *  - UN tasto per riga della tabella dell'Archivio, discreto, e la sua
 *    `aria-label` dice il nome del programma («elimina il programma «…»»);
 *  - prima di scrivere c'è una conferma in chiaro: quante schede, quanti
 *    esercizi e quante serie programmate escono, e cosa NON si tocca (Logbook,
 *    sedute fatte, storico, scheletri);
 *  - il programma IN USO non si elimina: il tasto è spento e dice perché;
 *  - qui non c'è un solo verbo di Firestore e nessuna cancellazione: la
 *    scrittura la fa chi riceve `onConferma` (la pagina, con l'editor di B).
 *    Il documento del programma resta in B, marcato come eliminato: sparisce
 *    dalle viste e si può recuperare da un giro futuro.
 *
 * Questo modulo è solo DOM: si prova con jsdom come le altre viste.
 */

function el(doc, tag, classe, testo) {
  const e = doc.createElement(tag);
  if (classe) e.setAttribute("class", classe);
  if (testo != null) e.appendChild(doc.createTextNode(String(testo)));
  return e;
}

function testo(valore) {
  return valore == null ? "" : String(valore).trim();
}

function plurale(n, uno, molti) {
  const q = Number(n) || 0;
  return q + " " + (q === 1 ? uno : molti);
}

/* «elimina il programma «Intensità ottobre-dicembre»» — la stessa frase per
 * l'aria-label e per il suggerimento. */
export function etichettaEliminaProgramma(nomeProgramma) {
  const nome = testo(nomeProgramma);
  return "elimina il programma" + (nome ? " «" + nome + "»" : "");
}

/* Perché il tasto è spento sul programma in uso. La stessa frase che Alice ha
 * chiesto: non si inventa un «programma attivo» vuoto. */
export const MOTIVO_PROGRAMMA_IN_USO = "è il programma in uso: aprine un altro, poi eliminalo";

/* Il tasto della riga. `opzioni.attivo` lo spegne con il motivo; altrimenti
 * `opzioni.onChiedi(richiesta)` apre la conferma — qui non si scrive niente. */
export function pulsanteEliminaProgramma(doc, opzioni) {
  const o = opzioni || {};
  const b = el(doc, "button", "pg-guarda pg-cestino", "\uD83D\uDDD1");
  b.type = "button";
  b.setAttribute("data-elimina-programma", testo(o.idProgramma));
  const etichetta = etichettaEliminaProgramma(o.nomeProgramma);
  const motivo = testo(o.motivo) || MOTIVO_PROGRAMMA_IN_USO;
  if (o.attivo) {
    b.disabled = true;
    b.setAttribute("aria-disabled", "true");
    b.setAttribute("aria-label", (testo(o.nomeProgramma) ? "«" + testo(o.nomeProgramma) + "» " : "") + motivo);
    b.setAttribute("title", motivo);
    return b;
  }
  b.setAttribute("aria-label", etichetta);
  b.setAttribute("title", "elimina questo programma da tutte le viste: prima chiede conferma");
  b.addEventListener("click", (ev) => {
    if (ev && ev.preventDefault) ev.preventDefault();
    if (ev && ev.stopPropagation) ev.stopPropagation();
    if (typeof o.onChiedi === "function") o.onChiedi(o);
  });
  return b;
}

/* La finestrella della conferma. `opzioni`:
 *   { nomeProgramma, idProgramma, idDocumento,
 *     schede, esercizi, serie,   i conti della riga (null = non si leggono)
 *     onConferma,                (richiesta) => Promise<{ok, motivo?, testo?}>
 *     segnala,                   (testo, tono) per la riga di stato
 *     bottone }                  il tasto che l'ha aperta (il fuoco torna lì)
 * Ritorna l'elemento della finestra. */
export function apriConfermaEliminazioneProgramma(doc, opzioni) {
  const o = opzioni || {};
  if (!doc || !doc.body) return null;
  const gia = doc.querySelector(".cestino-programma-modale");
  if (gia) gia.remove();

  const nome = testo(o.nomeProgramma);
  const modale = el(doc, "div", "pr-modal cestino-programma-modale");
  modale.setAttribute("role", "dialog");
  modale.setAttribute("aria-modal", "true");
  modale.setAttribute("aria-label", "eliminare un programma");
  const scatola = el(doc, "div", "pr-mbox");

  const testa = el(doc, "header");
  testa.appendChild(el(doc, "b", null, "Eliminare il programma" + (nome ? " «" + nome + "»" : "") + "?"));
  const x = el(doc, "button", "pr-mx", "\u00d7");
  x.type = "button";
  x.setAttribute("aria-label", "Chiudi");
  testa.appendChild(x);
  scatola.appendChild(testa);

  let chiuso = false;
  const chiudi = () => {
    if (chiuso) return;
    chiuso = true;
    if (modale.parentNode) modale.remove();
    doc.removeEventListener("keydown", suTasto, true);
    if (o.bottone && o.bottone.isConnected !== false && o.bottone.focus) {
      try { o.bottone.focus(); } catch (e) { /* senza fuoco si legge lo stesso */ }
    }
  };
  function suTasto(ev) {
    if (ev && (ev.key === "Escape" || ev.key === "Esc")) {
      if (ev.stopPropagation) ev.stopPropagation();
      chiudi();
    }
  }
  x.addEventListener("click", (ev) => { if (ev.preventDefault) ev.preventDefault(); chiudi(); });
  modale.addEventListener("click", (ev) => { if (ev.target === modale) chiudi(); });

  const corpo = el(doc, "div");
  const pezzi = [];
  if (o.schede != null) pezzi.push(plurale(o.schede, "scheda", "schede"));
  if (o.esercizi != null) pezzi.push(plurale(o.esercizi, "esercizio", "esercizi"));
  if (o.serie != null) pezzi.push(plurale(o.serie, "serie programmata", "serie programmate"));
  corpo.appendChild(el(doc, "p", "cestino-domanda",
    "Se confermi, il programma sparisce da Archivio, Cambia, Confronto e Prospetto"
    + (pezzi.length ? ": escono " + pezzi.join(", ") : "")
    + "."));
  corpo.appendChild(el(doc, "p", "cestino-nota",
    "Non si tocca niente d'altro: il Logbook, le sedute fatte, lo storico e gli scheletri restano dove sono. "
    + "Il documento del programma non si cancella: resta in B, marcato come eliminato, e si può recuperare."));

  const esito = el(doc, "p", "cestino-esito");
  esito.setAttribute("role", "status");

  const fila = el(doc, "div", "pr-mfoot");
  const lascia = el(doc, "button", "pr-btn", "Lascia stare");
  lascia.type = "button";
  lascia.addEventListener("click", chiudi);
  const elimina = el(doc, "button", "pr-btn danger pr-btn-rosso", "Elimina il programma");
  elimina.type = "button";
  elimina.setAttribute("data-elimina-programma-conferma", "1");

  const scrivi = () => {
    if (typeof o.onConferma !== "function") {
      esito.textContent = "Questa pagina non ha un editor collegato: non ho scritto niente.";
      esito.setAttribute("data-tono", "errore");
      return Promise.resolve();
    }
    elimina.disabled = true;
    lascia.disabled = true;
    esito.textContent = "Scrivo nel documento del programma…";
    esito.setAttribute("data-tono", "attesa");
    return Promise.resolve(o.onConferma({
      idProgramma: testo(o.idProgramma),
      idDocumento: testo(o.idDocumento),
      nomeProgramma: nome,
      conta: { schede: o.schede, esercizi: o.esercizi, serie: o.serie }
    })).then((r) => {
      const es = r || {};
      if (es.ok) {
        esito.textContent = String(es.testo || ("programma «" + nome + "» eliminato"))
          + (es.avvisoRegistro ? " · MA: " + es.avvisoRegistro : "");
        esito.setAttribute("data-tono", "ok");
        if (typeof o.segnala === "function") o.segnala(esito.textContent, "ok");
        chiudi();
        return es;
      }
      esito.textContent = "Non ho eliminato il programma: " + String(es.motivo || "non ho scritto niente");
      esito.setAttribute("data-tono", "errore");
      if (typeof o.segnala === "function") o.segnala(esito.textContent, "errore");
      elimina.disabled = false;
      lascia.disabled = false;
      return es;
    }, (e) => {
      esito.textContent = "Non ho eliminato il programma: " + (e && e.message ? e.message : "scrittura non riuscita");
      esito.setAttribute("data-tono", "errore");
      elimina.disabled = false;
      lascia.disabled = false;
      return { ok: false };
    });
  };
  elimina.addEventListener("click", scrivi);

  fila.appendChild(lascia);
  fila.appendChild(elimina);
  scatola.appendChild(corpo);
  scatola.appendChild(esito);
  scatola.appendChild(fila);
  modale.appendChild(scatola);
  doc.body.appendChild(modale);
  doc.addEventListener("keydown", suTasto, true);
  if (elimina.focus) { try { elimina.focus(); } catch (e) { /* pazienza */ } }
  return modale;
}
