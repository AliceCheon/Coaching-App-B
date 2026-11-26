/* comune/vista-scheletri-pagina.js — passo 34: la pagina Scheletri parla con B.
 *
 * Cosa fa, e cosa non fa:
 *  - le quattro linguette si accendono per davvero: «Scheletri» è il
 *    costruttore, «Miei scheletri» è la raccolta letta dalla zona B;
 *  - «Template» e «Libreria Coach» restano SPENTE e dicono perché. I numeri
 *    5 e 34 scritti a mano sono via: non erano un dato, erano un disegno;
 *  - «Salva Scheletro» scrive lo scheletro nella raccolta vera e lo fa
 *    comparire in «Miei scheletri». Niente «ti ho portato in Programma 2»:
 *    uno scheletro non diventa un programma da solo.
 *
 * Qui si legge e si disegna soltanto: la scrittura arriva dal servizio che
 * riceve (db e uid stanno nell'app, non nella pagina).
 */

import { scheletroDaCostruttore, messaggioNonSalvato, elencoScheletri } from "./scheletri.js";
import { fraseNuovoProgramma } from "./nuovo-programma-b.js";
import { nomePulito } from "./nome-pulito.js";

function el(doc, tag, classe, testo) {
  const e = doc.createElement(tag);
  if (classe) e.setAttribute("class", classe);
  if (testo != null) e.appendChild(doc.createTextNode(String(testo)));
  return e;
}

function testo(v) {
  return String(v == null ? "" : v).trim();
}

/* Nascondere con `hidden` non basta: le regole della pagina (`.sk-grid` è
 * `display:grid`) vincono sull'attributo. Qui si spegne il display e si tiene
 * `hidden` per chi legge la pagina con un lettore di schermo. */
function mostra(nodo, si) {
  if (!nodo) return;
  nodo.hidden = !si;
  nodo.style.display = si ? "" : "none";
}

/* Le due linguette che restano spente, con il motivo scritto nel tooltip.
 * Non si tolgono (regola di Alice): dicono a cosa serviranno. */
export const LINGUETTE_SPENTE = {
  Template: "spento: i template della libreria non sono ancora in B — nessun elenco da leggere",
  "Libreria Coach": "spento: la libreria del coach non è ancora in B — nessun elenco da leggere"
};

/* Il rifiuto del database non deve sembrare un tasto rotto: si dice in chiaro
 * che è un permesso che manca, così si sa cosa chiedere. */
export function testoRifiuto(motivo) {
  const m = String(motivo == null ? "" : motivo).toLowerCase();
  const permesso = m.indexOf("permission") !== -1 || m.indexOf("insufficient") !== -1 || m.indexOf("unauthorized") !== -1;
  if (permesso) {
    return "Le regole del database non permettono ancora la raccolta degli scheletri: serve un permesso in più su \u00abscheletri\u00bb. "
      + "Fino ad allora questa linguetta non può né leggere né salvare (il resto della pagina funziona).";
  }
  return "La raccolta non si legge: " + (String(motivo || "").trim() || "motivo non dichiarato");
}


/* Il contenuto di uno scheletro, letto dal documento vero: le schede con i
 * loro esercizi e le serie scritte. Niente conteggi inventati. */
function riempiDettaglio(doc, box, s) {
  const dati = (s && s.dati) || null;
  if (!dati) {
    box.appendChild(el(doc, "p", "skp-vuoto", "Il dettaglio non è arrivato con l'elenco: riapri la linguetta e riprova."));
    return;
  }
  const gruppi = Array.isArray(dati.schede) && dati.schede.length
    ? dati.schede
    : [{ lettera: "A", gruppo: "", esercizi: Array.isArray(dati.esercizi) ? dati.esercizi : [] }];
  gruppi.forEach((g) => {
    const blocco = el(doc, "div", "skp-gruppo");
    const nome = "Scheda " + (testo(g.lettera) || "A") + (testo(g.gruppo) ? " — " + testo(g.gruppo) : "");
    blocco.appendChild(el(doc, "p", "skp-gruppo-t", nome));
    const ul = el(doc, "ul", "skp-esercizi");
    const esercizi = Array.isArray(g.esercizi) ? g.esercizi : [];
    esercizi.forEach((e) => {
      const li = el(doc, "li");
      li.appendChild(el(doc, "span", "skp-ex", nomePulito(e.nome) || "(senza nome)"));
      li.appendChild(el(doc, "span", "skp-set", e.serie == null ? "serie non indicate" : e.serie + (Number(e.serie) === 1 ? " serie" : " serie")));
      ul.appendChild(li);
    });
    if (!esercizi.length) ul.appendChild(el(doc, "li", "skp-vuoto", "scheda senza esercizi"));
    blocco.appendChild(ul);
    box.appendChild(blocco);
  });
  if (testo(dati.notaScheda)) box.appendChild(el(doc, "p", "skp-nota", "Nota: " + nomePulito(dati.notaScheda)));
}

/* Il nome si cambia da qui: una riga con il campo, Salva e Annulla. La
 * scrittura la fa il servizio (versione + raccolta), non la pagina. */
function apriRinomina(doc, rinomina, s, riga) {
  const gia = riga.querySelector(".skp-rinomina");
  if (gia) { gia.remove(); return; }
  const box = el(doc, "div", "skp-rinomina");
  const campo = doc.createElement("input");
  campo.type = "text";
  campo.className = "skp-campo";
  campo.value = nomePulito(s.nome);
  campo.setAttribute("aria-label", "Nuovo nome dello scheletro");
  const salva = el(doc, "button", "skp-btn", "Salva il nome");
  salva.type = "button";
  const no = el(doc, "button", "skp-btn", "Annulla");
  no.type = "button";
  no.addEventListener("click", () => box.remove());
  salva.addEventListener("click", () => {
    const nuovo = testo(campo.value);
    if (!nuovo) { campo.className = "skp-campo male"; campo.focus(); return; }
    salva.disabled = true;
    Promise.resolve()
      .then(() => rinomina(s, nuovo))
      .then((ris) => {
        if (!ris || ris.ok !== true) throw new Error((ris && ris.motivo) || "rinomina non riuscita");
        box.remove();
        s["nome"] = nuovo;
        if (s.dati) s.dati["nome"] = nuovo;
        const b = riga.querySelector(".skp-nome");
        if (b) b.textContent = nomePulito(nuovo) || nuovo;
      }, (e) => {
        salva.disabled = false;
        box.appendChild(el(doc, "p", "skp-errore", "Non ho rinominato: " + ((e && e.message) || "motivo non dichiarato")));
      });
  });
  box.appendChild(campo);
  box.appendChild(salva);
  box.appendChild(no);
  riga.appendChild(box);
  if (campo.focus) campo.focus();
}

/* Il pannello della raccolta: una riga per scheletro, letta dalla zona B. */
export function pannelloRaccolta(doc, elenco, opzioni) {
  const o = opzioni || {};
  const c = el(doc, "div", "skp-raccolta");
  const lista = Array.isArray(elenco) ? elenco : [];
  if (!lista.length) {
    c.appendChild(el(doc, "div", "sk-vuoto",
      "Nessuno scheletro salvato: costruiscilo nella linguetta «Scheletri» e premi «Salva Scheletro». La raccolta è la tua: si legge dalla zona B."));
    return c;
  }
  c.appendChild(el(doc, "p", "skp-sottotitolo",
    lista.length + (lista.length === 1 ? " scheletro" : " scheletri") + " · dal più recente. Si applicano da Programma 1, linguetta «Scheletri»."));
  lista.forEach((s) => {
    const riga = el(doc, "div", "skp-riga");
    riga.setAttribute("data-sk", testo(s.id));
    const testa = el(doc, "div", "skp-testa");
    testa.appendChild(el(doc, "b", "skp-nome", nomePulito(s.nome) || "(senza nome)"));
    testa.appendChild(el(doc, "span", "skp-data", testo(s.data) || "data non registrata"));
    const quante = Number(s.esercizi) || 0;
    let conto = quante + (quante === 1 ? " esercizio" : " esercizi");
    if (Number(s.schede) > 0) conto += " · " + Number(s.schede) + (Number(s.schede) === 1 ? " scheda" : " schede");
    testa.appendChild(el(doc, "span", "skp-conto", conto));
    riga.appendChild(testa);

    /* Le serie dello scheletro si vedono una volta sola: sono quelle scritte
     * qui, non un carico. */
    const serie = Number(s.serie) || 0;
    if (serie > 0) riga.appendChild(el(doc, "p", "skp-serie", "serie in tutto: " + serie));

    /* Passo 37: la riga si apre. Dentro si legge davvero com'è fatto lo
     * scheletro (schede, esercizi, serie) e ci sono i tasti per rinominarlo,
     * eliminarlo o riprenderlo nel costruttore. */
    const dettaglio = el(doc, "div", "skp-dettaglio");
    dettaglio.hidden = true;
    const atti = el(doc, "div", "skp-atti");
    const btApri = el(doc, "button", "skp-btn", "Vedi gli esercizi");
    btApri.type = "button";
    btApri.setAttribute("aria-expanded", "false");
    btApri.addEventListener("click", () => {
      const aperto = dettaglio.hidden === false;
      dettaglio.hidden = aperto;
      btApri.setAttribute("aria-expanded", String(!aperto));
      btApri.textContent = aperto ? "Vedi gli esercizi" : "Chiudi gli esercizi";
      if (!aperto && !dettaglio.__bdRiempi) {
        riempiDettaglio(doc, dettaglio, s);
        dettaglio.__bdRiempi = true;
      }
    });
    atti.appendChild(btApri);

    if (typeof o.rinomina === "function") {
      const btRin = el(doc, "button", "skp-btn", "Rinomina");
      btRin.type = "button";
      btRin.addEventListener("click", () => {
        apriRinomina(doc, o.rinomina, s, riga);
      });
      atti.appendChild(btRin);
    }
    if (typeof o.modifica === "function") {
      const btMod = el(doc, "button", "skp-btn", "Modifica nel costruttore");
      btMod.type = "button";
      btMod.addEventListener("click", () => o.modifica(s));
      atti.appendChild(btMod);
    }
    if (typeof o.elimina === "function") {
      const btDel = el(doc, "button", "skp-btn skp-elimina", "Elimina");
      btDel.type = "button";
      btDel.addEventListener("click", () => {
        confermaInPagina(doc, riga, "Eliminare lo scheletro «" + (nomePulito(s.nome) || s.nome) + "»? Non tocca nessuna scheda: sparisce solo dalla raccolta.",
          "Sì, elimina", () => {
            btDel.disabled = true;
            Promise.resolve()
              .then(() => o.elimina(s))
              .then((ris) => {
                if (!ris || ris.ok !== true) throw new Error((ris && ris.motivo) || "eliminazione non riuscita");
              }, (e) => { throw e; })
              .then(() => { riga.remove(); o.dopo && o.dopo(); }, (e) => {
                btDel.disabled = false;
                const why = el(doc, "p", "skp-errore", "Non ho eliminato: " + ((e && e.message) || "motivo non dichiarato"));
                riga.appendChild(why);
              });
          });
      });
      atti.appendChild(btDel);
    }
    riga.appendChild(atti);
    riga.appendChild(dettaglio);
    c.appendChild(riga);
  });
  return c;
}

/* Serie totali dichiarate dallo scheletro (solo quelle scritte: nessuna stima). */
function serieTotali(s) {
  return Number(s && s.serie) > 0 ? Number(s.serie) : 0;
}


/* Una conferma dentro la pagina, con due tasti: niente finestrelle del browser.
 * Torna il nodo, così la prova lo legge e il flusso lo toglie quando ha finito. */
function confermaInPagina(doc, dove, testo, etichettaSi, alSi) {
  const vecchio = dove.querySelector(".sk-conf-programma");
  if (vecchio) vecchio.remove();
  const box = el(doc, "div", "sk-conf-programma");
  box.setAttribute("role", "dialog");
  box.appendChild(el(doc, "p", "sk-conf-testo", testo));
  const fila = el(doc, "div", "sk-conf-fila");
  const no = el(doc, "button", "sk-annulla", "Annulla");
  no.type = "button";
  no.addEventListener("click", () => box.remove());
  const si = el(doc, "button", "sk-conf-si", etichettaSi);
  si.type = "button";
  si.addEventListener("click", () => { box.remove(); if (typeof alSi === "function") alSi(); });
  fila.appendChild(no);
  fila.appendChild(si);
  box.appendChild(fila);
  dove.appendChild(box);
  return box;
}
/* Il montaggio della pagina. servizi:
 *   costruttore()            -> { schede: [...] } (lo stato del costruttore)
 *   etichetta(k)             -> nome del gruppo muscolare da mostrare
 *   leggi()                  -> Promise<elenco scheletri dalla zona B>
 *   salva(documento)         -> Promise<{ ok, id, nome }> (scrive in B)
 *   nonCollegata             -> testo da dire se la scrittura non c'è
 *   applica?/elimina?        non servono qui: stanno in Programma 1
 */
export function montaPaginaScheletri(doc, servizi) {
  const s = servizi || {};
  const barra = doc.querySelector("#pag-scheletri .sk-tabbar");
  const griglia = doc.querySelector("#pag-scheletri .sk-grid");
  if (!barra || !griglia) return false;

  const linguette = Array.from(barra.querySelectorAll(".sk-tab"));
  const perTesto = (parola) => linguette.filter((b) => testo(b.textContent).indexOf(parola) === 0)[0];

  /* Una sola zona per la raccolta, creata accanto al costruttore. */
  let raccolta = doc.getElementById("sk-raccolta");
  if (!raccolta) {
    raccolta = el(doc, "div", "sk-card sk-raccolta-pane");
    raccolta.id = "sk-raccolta";
    mostra(raccolta, false);
    griglia.parentNode.insertBefore(raccolta, griglia.nextSibling);
  }
  let esitoRaccolta = doc.getElementById("sk-esito-raccolta");
  if (!esitoRaccolta) {
    esitoRaccolta = el(doc, "div", "sk-esito");
    esitoRaccolta.id = "sk-esito-raccolta";
    raccolta.insertBefore(esitoRaccolta, raccolta.firstChild);
  }

  /* Le due linguette spente: restano al loro posto, dicono perché, e non
   * portano più numeri inventati. */
  Object.keys(LINGUETTE_SPENTE).forEach((parola) => {
    const b = perTesto(parola);
    if (!b) return;
    b.disabled = true;
    b.setAttribute("aria-disabled", "true");
    b.title = LINGUETTE_SPENTE[parola];
    const cnt = b.querySelector(".sk-cnt");
    if (cnt) cnt.remove();
  });

  const accendi = (quale) => {
    linguette.forEach((b) => b.classList.toggle("attiva", b === quale));
    const miei = quale === perTesto("Miei scheletri");
    mostra(griglia, !miei);
    mostra(raccolta, miei);
    if (miei) carica();
  };

  /* L'elenco si costruisce dai documenti veri (`lista`), così ogni riga porta
   * il suo dettaglio; i conteggi li fa elencoScheletri, come il resto dell'app. */
  function disegna(documenti) {
    const docs = Array.isArray(documenti) ? documenti.filter((d) => d && d.dati) : [];
    const perId = Object.create(null);
    docs.forEach((d) => { perId[String(d.id)] = d.dati; });
    const lista = elencoScheletri(docs).map((s) => Object.assign({}, s, { dati: perId[String(s.id)] || null }));
    const conto = doc.getElementById("sk-miei");
    if (conto) conto.textContent = String(lista.length);
    const vecchio = raccolta.querySelector(".skp-raccolta");
    if (vecchio) vecchio.remove();
    raccolta.appendChild(pannelloRaccolta(doc, lista, {
      rinomina: typeof s.rinomina === "function" ? s.rinomina : null,
      elimina: typeof s.elimina === "function" ? s.elimina : null,
      modifica: typeof s.modifica === "function" ? s.modifica : null,
      dopo: () => carica()
    }));
    return lista.length;
  }

  /* Ogni lettura porta un numero: se una risposta vecchia arriva dopo una
   * nuova, si butta. Così una lettura già in corso non cancella lo scheletro
   * appena salvato. */
  let versioneLettura = 0;
  function carica() {
    if (typeof s.leggi !== "function") return Promise.resolve(0);
    const mia = ++versioneLettura;
    return Promise.resolve()
      .then(() => s.leggi())
      .then((elenco) => {
        if (mia !== versioneLettura) return -1;
        return disegna(elenco);
      }, (e) => {
        if (mia !== versioneLettura) return -1;
        esitoRaccolta.className = "sk-esito on no";
        esitoRaccolta.textContent = testoRifiuto(e && e.message);
        return 0;
      });
  }

  linguette.forEach((b) => {
    if (b.disabled) return;
    b.addEventListener("click", () => accendi(b));
  });

  /* «Salva Scheletro»: scrive davvero, poi lo mostra nella raccolta. */
  const salva = doc.getElementById("sk-salva");
  const esito = doc.getElementById("sk-esito");
  const scriviEsito = (txt, ok) => {
    if (!esito) return;
    esito.textContent = testo(txt);
    esito.className = "sk-esito on " + (ok ? "ok" : "no");
  };

  function statoCostruttore() {
    if (typeof s.costruttore === "function") return s.costruttore() || { schede: [] };
    return { schede: [] };
  }

  if (salva && !salva.__bdScheletriPagina) {
    salva.__bdScheletriPagina = true;
    salva.addEventListener("click", (ev) => {
      if (ev && ev.preventDefault) ev.preventDefault();
      const stato = statoCostruttore();
      const nome = testo((doc.getElementById("sk-nome") || {}).value);
      const nota = testo((doc.getElementById("sk-desc") || {}).value);
      const documento = scheletroDaCostruttore(stato, {
        nome: nome,
        nota: nota,
        etichetta: typeof s.etichetta === "function" ? s.etichetta : null
      });
      if (!documento.esercizi.length) {
        scriviEsito("Non c'è ancora nessun esercizio: clicca un gruppo muscolare e scegli l'esercizio.", false);
        return;
      }
      if (typeof s.salva !== "function") {
        scriviEsito(testo(s.nonCollegata) || "Non sei ancora collegata: entra con Google e riprova.", false);
        return;
      }
      const testoPrima = salva.textContent;
      salva.disabled = true;
      salva.textContent = "Salvo…";
      scriviEsito("Scrivo lo scheletro nella tua raccolta…", true);
      Promise.resolve()
        .then(() => s.salva(documento))
        .then((ris) => {
          if (!ris || ris.ok !== true) throw new Error((ris && (ris.motivo || ris.messaggio)) || "scrittura rifiutata");
          const quante = documento.esercizi.length;
          const salvato = "Scheletro «" + (nomePulito(documento.nome) || documento.nome) + "» salvato · "
            + quante + (quante === 1 ? " esercizio" : " esercizi");
          scriviEsito(salvato + " · lo trovi in «Miei scheletri»", true);
          esitoRaccolta.className = "sk-esito on ok";
          esitoRaccolta.textContent = salvato;
          return carica();
        })
        .then((n) => {
          const tab = perTesto("Miei scheletri");
          if (tab && Number(n) > 0) accendi(tab);
        }, (e) => {
          scriviEsito(messaggioNonSalvato((e && e.message) || "motivo non dichiarato"), false);
        })
        .then(() => { salva.disabled = false; salva.textContent = testoPrima; });
    });
  }

  /* «Crea un programma nuovo» (passo 35): dallo stesso costruttore nasce un
   * programma nuovo in bozza. Non tocca nessun programma che esiste già;
   * aprirlo è un secondo passo, con la sua conferma e il suo Annulla. */
  const crea = doc.getElementById("sk-crea-programma");
  if (crea && !crea.__bdScheletriPagina) {
    crea.__bdScheletriPagina = true;
    crea.addEventListener("click", (ev) => {
      if (ev && ev.preventDefault) ev.preventDefault();
      const stato = statoCostruttore();
      const nome = testo((doc.getElementById("sk-nome") || {}).value);
      const nota = testo((doc.getElementById("sk-desc") || {}).value);
      const documento = scheletroDaCostruttore(stato, {
        nome: nome,
        nota: nota,
        etichetta: typeof s.etichetta === "function" ? s.etichetta : null
      });
      if (!documento.esercizi.length) {
        scriviEsito("Non c'è ancora nessun esercizio: clicca un gruppo muscolare e scegli l'esercizio.", false);
        return;
      }
      if (typeof s.creaProgramma !== "function") {
        scriviEsito(testo(s.nonCollegata) || "Non sei ancora collegata: entra con Google e riprova.", false);
        return;
      }
      const attivo = typeof s.nomeAttivo === "function" ? testo(s.nomeAttivo()) : "";
      const frase = fraseNuovoProgramma({
        /* il nome mostrato passa da nomePulito, come ogni testo preso dai dati */
        nome: nomePulito(nome) || nomePulito(documento.nome),
        schede: (documento.schede && documento.schede.length) || 1,
        esercizi: documento.esercizi.length
      }, attivo);
      confermaInPagina(doc, crea.parentNode, frase, "Sì, crea il programma", () => {
        crea.disabled = true;
        const prima = crea.textContent;
        crea.textContent = "Creo…";
        scriviEsito("Scrivo il programma nuovo nella zona B…", true);
        Promise.resolve()
          .then(() => s.creaProgramma(documento, { nome: nome, descrizione: nota }))
          .then((ris) => {
            if (!ris || ris.ok !== true) throw new Error((ris && (ris.motivo || ris.messaggio)) || "creazione non riuscita");
            const schede = Number(ris.schede) || 0;
            const esercizi = Number(ris.esercizi) || 0;
            scriviEsito("Programma «" + (nomePulito(ris.nome) || ris.nome) + "» creato in bozza · "
              + schede + (schede === 1 ? " scheda" : " schede") + " · " + esercizi + (esercizi === 1 ? " esercizio" : " esercizi")
              + " · «" + (attivo || "il programma che stai usando") + "» non è stato toccato", true);
            /* Aprire è una scelta, non un effetto collaterale. */
            if (typeof s.apriProgramma === "function" && ris.id) {
              confermaInPagina(doc, crea.parentNode,
                "Vuoi aprirlo adesso? Diventa il programma aperto e «" + (attivo || "quello di prima")
                  + "» resta salvato com'è (Annulla lo rimette attivo).",
                "Apri «" + (nomePulito(ris.nome) || ris.nome) + "»", () => {
                  scriviEsito("Apro il programma nuovo…", true);
                  Promise.resolve()
                    .then(() => s.apriProgramma(ris.id))
                    .then((esito) => {
                      if (!esito || esito.ok !== true) throw new Error((esito && (esito.motivo || esito.testo)) || "apertura non riuscita");
                      scriviEsito("Programma «" + (nomePulito(ris.nome) || ris.nome) + "» aperto: lo vedi in Programmi", true);
                    }, (e) => scriviEsito("Non ho aperto il programma: " + ((e && e.message) || "motivo non dichiarato"), false));
                });
            }
          }, (e) => scriviEsito("Programma non creato: " + ((e && e.message) || "motivo non dichiarato"), false))
          .then(() => { crea.disabled = false; crea.textContent = prima; });
      });
    });
  }

  /* Conteggio e raccolta: appena si può leggere. Senza accesso la pagina non
   * inventa uno zero: lo dice quando serve, e ricarica dopo l'accesso. */
  if (typeof s.leggi === "function") carica();
  else if (esitoRaccolta) {
    esitoRaccolta.className = "sk-esito on no";
    esitoRaccolta.textContent = testo(s.nonCollegata) || "Non sei ancora collegata: entra con Google e riprova.";
  }
  return { ricarica: carica, accendi: accendi };
}

export { serieTotali };
