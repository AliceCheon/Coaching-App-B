/* Barbell Diva B — PASS0 20: il cestino delle schede.
 *
 * Alice (26/11/2026): «aggiungere pulsante elimina accanto alle schede così le
 * posso eliminare (piccolo cestino sia nell'archivio sia in confronta e cambia
 * dentro programmi)».
 *
 * Cosa fa, in chiaro:
 *  - il tasto e' piccolo e discreto, e la sua `aria-label` dice cosa toglie e
 *    da quale programma («elimina la scheda A dal programma «…»»);
 *  - prima di scrivere c'e' una conferma in chiaro: quanti esercizi e quante
 *    serie programmate escono dal programma, e cosa NON si tocca (Logbook,
 *    sedute fatte, storico: restano dove sono);
 *  - l'ultima scheda di un programma non si toglie: la finestrella lo spiega e
 *    non c'e' nessun tasto che scrive. Un programma senza schede non si usa;
 *  - la scrittura la fa chi riceve `onConferma` (la pagina, con l'editor di B):
 *    qui non c'e' un solo verbo di Firestore, e nessuna cancellazione: la
 *    scheda esce dal programma e il documento resta, con la voce di registro e
 *    l'Annulla.
 *
 * Questo modulo e' solo DOM: si prova con jsdom come le altre viste.
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

/* «elimina la scheda A dal programma «Intensità»» — la stessa frase per
 * l'aria-label e per il suggerimento. */
export function etichettaCestino(codice, nomeProgramma) {
  const lettera = testo(codice) || "senza lettera";
  const nome = testo(nomeProgramma);
  return "elimina la scheda " + lettera + (nome ? " dal programma «" + nome + "»" : " dal programma");
}

/* Il tasto. `opzioni.onChiedi(richiesta)` apre la conferma: qui non si scrive
 * niente. `opzioni.spento` (con `motivo`) lo spegne e dice perche'. */
export function pulsanteCestino(doc, opzioni) {
  const o = opzioni || {};
  const b = el(doc, "button", "pr-cestino", "\uD83D\uDDD1");
  b.type = "button";
  b.setAttribute("data-cestino", String(o.idScheda == null ? "" : o.idScheda));
  b.setAttribute("data-cestino-scheda", testo(o.codice));
  const etichetta = etichettaCestino(o.codice, o.nomeProgramma);
  b.setAttribute("aria-label", etichetta);
  b.setAttribute("title", o.spento ? (testo(o.motivo) || etichetta) : (o.titolo || "toglie questa scheda dal programma: prima chiede conferma"));
  if (o.spento) {
    b.disabled = true;
    b.setAttribute("aria-disabled", "true");
    return b;
  }
  b.addEventListener("click", (ev) => {
    if (ev && ev.preventDefault) ev.preventDefault();
    if (ev && ev.stopPropagation) ev.stopPropagation();
    if (typeof o.onChiedi === "function") o.onChiedi(o);
  });
  return b;
}

/* La finestrella della conferma. `opzioni`:
 *   { codice, nomeScheda, nomeProgramma, idScheda, idProgramma,
 *     schedeAttive,       quante schede ATTIVE ha il programma adesso
 *     conta,              {esercizi, righe, serie} oppure null
 *     onConferma,         () => Promise<esito {ok, motivo?, testo?}>
 *     segnala,            (testo, tono) per la riga di stato
 *     chiudiDopo,         () => void: chiude la finestra che l'ha aperta
 *     bottone }           il tasto che l'ha aperta (il fuoco torna li')
 * Ritorna l'elemento della finestra. */
export function apriConfermaEliminazione(doc, opzioni) {
  const o = opzioni || {};
  if (!doc || !doc.body) return null;
  const gia = doc.querySelector(".cestino-modale");
  if (gia) gia.remove();

  const modale = el(doc, "div", "pr-modal cestino-modale");
  modale.setAttribute("role", "dialog");
  modale.setAttribute("aria-modal", "true");
  modale.setAttribute("aria-label", "togliere una scheda dal programma");
  const scatola = el(doc, "div", "pr-mbox cestino-box");

  const lettera = testo(o.codice) || "senza lettera";
  const nomeProgramma = testo(o.nomeProgramma);
  const testa = el(doc, "header");
  testa.appendChild(el(doc, "b", null, "Togliere la scheda " + lettera + " dal programma" + (nomeProgramma ? " «" + nomeProgramma + "»" : "") + "?"));
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
  x.addEventListener("click", chiudi);
  modale.addEventListener("click", (ev) => { if (ev.target === modale) chiudi(); });

  const corpo = el(doc, "div", "cestino-corpo");
  const fila = el(doc, "div", "cestino-fila");
  const attive = o.schedeAttive == null ? null : Number(o.schedeAttive);

  /* L'ULTIMA SCHEDA: si spiega e si chiude. Nessun tasto che scrive. */
  if (attive != null && attive <= 1) {
    corpo.appendChild(el(doc, "p", "cestino-domanda",
      "La scheda " + lettera + " è l'ultima di questo programma: toglierla lascerebbe un programma senza schede, e un programma senza schede non si può usare."));
    corpo.appendChild(el(doc, "p", "cestino-nota",
      "Non ho toccato niente. Se vuoi un programma più corto, aggiungi prima un'altra scheda (o usane una archiviata), poi togli questa."));
    const chiudiBtn = el(doc, "button", "pr-btn", "Chiudi");
    chiudiBtn.type = "button";
    chiudiBtn.addEventListener("click", chiudi);
    fila.appendChild(chiudiBtn);
    scatola.appendChild(corpo);
    scatola.appendChild(fila);
    modale.appendChild(scatola);
    doc.body.appendChild(modale);
    doc.addEventListener("keydown", suTasto, true);
    if (chiudiBtn.focus) { try { chiudiBtn.focus(); } catch (e) { /* pazienza */ } }
    return modale;
  }

  const conta = o.conta && typeof o.conta === "object" ? o.conta : null;
  if (conta) {
    const pezzi = [plurale(conta.esercizi, "esercizio", "esercizi")];
    if (conta.serie) pezzi.push(plurale(conta.serie, "serie programmata", "serie programmate"));
    corpo.appendChild(el(doc, "p", "cestino-domanda",
      "Dalla scheda " + lettera + (testo(o.nomeScheda) ? " «" + testo(o.nomeScheda) + "»" : "") + " escono "
      + pezzi.join(" e ") + "."));
  } else {
    corpo.appendChild(el(doc, "p", "cestino-domanda",
      "La scheda " + lettera + (testo(o.nomeScheda) ? " «" + testo(o.nomeScheda) + "»" : "") + " esce dal programma."));
  }
  corpo.appendChild(el(doc, "p", "cestino-nota",
    "Non si tocca niente d'altro: il Logbook, le sedute fatte e lo storico restano dove sono. "
    + "La scheda si può rimettere subito con Annulla."));

  const esito = el(doc, "p", "cestino-esito");
  esito.setAttribute("role", "status");

  const lascia = el(doc, "button", "pr-btn", "Lascia stare");
  lascia.type = "button";
  lascia.addEventListener("click", chiudi);
  const togli = el(doc, "button", "pr-btn danger", "Togli la scheda " + lettera);
  togli.type = "button";
  togli.setAttribute("data-cestino-conferma", "1");

  const scrivi = () => {
    if (typeof o.onConferma !== "function") {
      esito.textContent = "Questa pagina non ha un editor collegato: non ho scritto niente.";
      esito.setAttribute("data-tono", "errore");
      return Promise.resolve();
    }
    togli.disabled = true;
    lascia.disabled = true;
    esito.textContent = "Scrivo nella scheda di B…";
    esito.setAttribute("data-tono", "attesa");
    return Promise.resolve(o.onConferma({
      codice: lettera,
      idScheda: o.idScheda,
      idProgramma: o.idProgramma
    })).then((r) => {
      const es = r || {};
      if (es.ok) {
        esito.textContent = String(es.testo || ("scheda " + lettera + " tolta dal programma"))
          + (es.avvisoRegistro ? " · MA: " + es.avvisoRegistro : "");
        esito.setAttribute("data-tono", "ok");
        if (typeof o.segnala === "function") o.segnala(esito.textContent, "ok");
        chiudi();
        if (typeof o.chiudiDopo === "function") o.chiudiDopo();
        return es;
      }
      esito.textContent = "Non ho tolto la scheda: " + String(es.motivo || "non ho scritto niente");
      esito.setAttribute("data-tono", "errore");
      if (typeof o.segnala === "function") o.segnala(esito.textContent, "errore");
      togli.disabled = false;
      lascia.disabled = false;
      return es;
    }, (e) => {
      esito.textContent = "Non ho tolto la scheda: " + (e && e.message ? e.message : "scrittura non riuscita");
      esito.setAttribute("data-tono", "errore");
      togli.disabled = false;
      lascia.disabled = false;
      return { ok: false };
    });
  };
  togli.addEventListener("click", scrivi);

  fila.appendChild(lascia);
  fila.appendChild(togli);
  scatola.appendChild(corpo);
  scatola.appendChild(esito);
  scatola.appendChild(fila);
  modale.appendChild(scatola);
  doc.body.appendChild(modale);
  doc.addEventListener("keydown", suTasto, true);
  if (togli.focus) { try { togli.focus(); } catch (e) { /* pazienza */ } }
  return modale;
}
