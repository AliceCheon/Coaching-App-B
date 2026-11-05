/* Barbell Diva B — ingresso desktop (SOLA LETTURA).
 *
 * Letture una tantum all'avvio e al pulsante «Ricarica»: nessun ascoltatore
 * sui dati. Nessuna scrittura, nessun service worker, nessun IndexedDB.
 *
 * Fase 1: le sedute e i programmi arrivano dalle LORO sottoraccolte (sessions,
 * nutritionPhotos), non più dalla radice — vedi comune/modello-dati.js.
 */

import { applicaTema, temaSalvato, alternaTema } from "../comune/tema.js";
import { inizializzaAppB, authDi, firestoreDi, persistenzaLocale } from "../comune/firebase-client.js";
import { entraConGoogle, esci, ascoltaStato } from "../comune/accesso.js";
import { leggiDocumentoAtleta, leggiSedute, leggiProgrammi, riepilogoDati, programmaAttivo } from "../comune/lettura-dati.js";
import { frasiPerDati, montaDivaBot, voceDelQuadro, voceDelGiorno, voceDelCarico, tonoPeggiore, voceDelProgramma } from "../comune/diva-bot.js";
import { righeValoriCheckin } from "../comune/valori-checkin.js";
import { creaVolto } from "../comune/diva-volto.js";
import { carichiPerEsercizio, righeCarichi } from "../comune/carichi.js";
import { quadroStrutturale, righeQuadro, righeSemaforo, righeDatiMancanti } from "../comune/struttura.js";
import { renderDashboardV31 } from "../comune/vista-dashboard.js";
import { renderOverviewAtleta } from "../comune/vista-overview.js";
import { riepilogoOverview } from "../comune/overview.js";
import { renderPianificazione } from "../comune/vista-pianificazione.js";
import { riepilogoPianificazione } from "../comune/pianificazione.js";
import { renderProgramma } from "../comune/vista-programma.js";
import { riepilogoProgramma, elencoProgrammiOrdinato, profiloProgramma } from "../comune/programma.js";
import { renderArchivio, elencoArchivio } from "../comune/vista-archivio.js";
import { gruppiApribili } from "../comune/gruppi-menu.js";
import { leggiSchedeProgrammi } from "../comune/schede-v2.js";

const NON_REGISTRATO = "non registrato";

/* Cambio di schermata: una voce viva accende la sua area e spegne le altre.
 * Le voci spente non arrivano qui: sono disabilitate nel menu. */
export function mostraVista(doc, id) {
  const pannelli = { dashboard: doc.querySelector("#vistaDash"), "overview-atleta": doc.querySelector("#vistaOverview"), pianificazione: doc.querySelector("#vistaPianificazione"), "programma-1": doc.querySelector("#vistaProgramma1"), archivio: doc.querySelector("#vistaArchivio") };
  if (!Object.prototype.hasOwnProperty.call(pannelli, id)) return null;
  Object.entries(pannelli).forEach(([chiave, el]) => { if (el) el.hidden = chiave !== id; });
  doc.querySelectorAll(".voce[data-vista]").forEach((v) => {
    const sua = v.getAttribute("data-vista") === id;
    v.classList.toggle("attiva", sua);
    if (sua) v.setAttribute("aria-current", "page"); else v.removeAttribute("aria-current");
  });
  return id;
}
const NON_REGISTRATA = "non registrata (in A si calcola dalle sedute; nessun numero indovinato)";

function nodo(doc, tag, classe, contenuto) {
  const n = doc.createElement(tag);
  if (classe) n.className = classe;
  n.textContent = contenuto == null ? "" : String(contenuto);
  return n;
}

function carta(doc, titolo, righe, fonte) {
  const c = nodo(doc, "article", "carta");
  c.appendChild(nodo(doc, "h2", "", titolo));
  righe.forEach((r) => {
    if (r && r.testo != null) c.appendChild(nodo(doc, r.tag || "div", r.classe || "riga", r.testo));
  });
  c.appendChild(nodo(doc, "div", "fonte", "fonte: " + fonte));
  return c;
}

/* Righe della card «Sedute registrate»: il numero viene dalla sottoraccolta,
 * il sessionCount della radice fa da controprova dichiarata (mai un numero
 * al posto di un altro, mai uno 0 quando il dato esiste altrove). */
function righeSedute(modello) {
  if (!modello.presente) return [{ testo: NON_REGISTRATO, classe: "valore" }];
  if (modello.seduteNonLette) {
    return [
      { testo: "lettura non riuscita", classe: "valore" },
      { testo: "la sottoraccolta sessions non ha risposto: nessun numero inventato, riprova con «Ricarica».", classe: "errore" }
    ];
  }
  const righe = [
    { testo: modello.numeroSedute == null ? NON_REGISTRATO : modello.numeroSedute, classe: "valore" },
    { testo: "sottoraccolta sessions: " + modello.numeroSedute + " sedute valide su " + (modello.numeroDocumentiSedute == null ? "?" : modello.numeroDocumentiSedute) + " documenti" }
  ];
  if (modello.seduteSenzaId || modello.seduteDuplicate) {
    righe.push({ testo: "scartati come in A: " + modello.seduteSenzaId + " senza id · " + modello.seduteDuplicate + " duplicati" });
  }
  const controllo = modello.controlloSessioni;
  if (!controllo) {
    righe.push({ testo: "controllo · sessionCount nella radice: non registrato" });
  } else if (controllo.coincide) {
    righe.push({ testo: "controllo · sessionCount nella radice: " + controllo.radice + " · coincide", classe: "lemmacarta" });
  } else {
    righe.push({ testo: "controllo · sessionCount nella radice: " + controllo.radice + " · NON coincide (differenza " + (controllo.radice - controllo.sottoraccolta) + ")", classe: "errore" });
  }
  return righe;
}

/* Righe della card «Programma attivo»: nome dalla sottoraccolta, controprova
 * dichiarata con programCount della radice. Se la radice dichiara programmi e
 * B non ne trova, lo dice con le stesse parole di A («cloud programs missing»,
 * r.5640) invece di mostrare «non registrato» come se non ci fosse nulla. */
function righeProgramma(modello) {
  if (!modello.presente) return [{ testo: NON_REGISTRATO, classe: "valore" }];
  if (modello.programmiNonLetti) {
    return [
      { testo: "lettura non riuscita", classe: "valore" },
      { testo: "la sottoraccolta nutritionPhotos non ha risposto: nessun nome inventato, riprova con «Ricarica».", classe: "errore" }
    ];
  }
  const pr = modello.programma;
  const controllo = modello.controlloProgrammi;
  const righe = [];
  if (pr) {
    righe.push({ testo: pr.nome, classe: "valore" });
    righe.push({ testo: pr.esplicito ? "attivo (marcato esplicitamente)" : "aggiornato più di recente (ripiego di A, non marcato attivo)", classe: "lemmacarta" });
    righe.push({ testo: "Settimana: " + (pr.settimana == null ? NON_REGISTRATA : pr.settimana) });
  } else if (controllo && controllo.mancanti) {
    righe.push({ testo: "programmi mancanti nel cloud", classe: "valore" });
    righe.push({ testo: "la radice dichiara " + controllo.radice + " programmi (programCount) ma nei documenti-programma non ne resta nessuno: come A, «cloud programs missing» — nessun nome inventato.", classe: "errore" });
  } else {
    righe.push({ testo: NON_REGISTRATO, classe: "valore" });
  }
  if (modello.numeroProgrammi != null) {
    righe.push({ testo: "programmi letti dai documenti-programma: " + modello.numeroProgrammi + " su " + (modello.documentiProgrammi == null ? "?" : modello.documentiProgrammi) + " documenti" });
  }
  if (!controllo) {
    righe.push({ testo: "controllo · programCount nella radice: non registrato" });
  } else if (controllo.coincide) {
    righe.push({ testo: "controllo · programCount nella radice: " + controllo.radice + " · coincide", classe: "lemmacarta" });
  } else {
    righe.push({ testo: "controllo · programCount nella radice: " + controllo.radice + " · NON coincide (differenza " + (controllo.radice - controllo.letti) + ")", classe: "errore" });
  }
  if (modello.programmiScartatiFiltro || modello.programmiV1Doppioni) {
    righe.push({ testo: "scartati come in A: " + modello.programmiScartatiFiltro + " fuori da programIds (programmi cancellati) · " + modello.programmiV1Doppioni + " v1 già presenti in v2" });
  }
  return righe;
}

/* Trasforma il modello (puro) in card DOM. Nessun dato entra nell'HTML come markup. */
export function renderDashboard(doc, contenitore, modello, opzioni) {
  while (contenitore.firstChild) contenitore.firstChild.remove();
  const opz = opzioni || {};
  const presente = modello.presente === true;

  contenitore.appendChild(carta(doc, "Sedute registrate", righeSedute(modello),
    "sottoraccolta sessions, campo session.id · A r.6257, r.6365, filtro r.5581 · controllo sessionCount r.5937"));

  const u = modello.ultima;
  contenitore.appendChild(carta(doc, "Ultima seduta", [
    { testo: u ? u.data : NON_REGISTRATO, classe: "valore" },
    u ? { testo: "scheda " + u.codice + (u.nome ? " · " + u.nome : "") } : null
  ], "sottoraccolta sessions — dateInput/sessionCode/sessionName · ordinamento A r.6894-6898"));

  contenitore.appendChild(carta(doc, "Peso corrente", [
    { testo: modello.peso ? modello.peso + " kg" : NON_REGISTRATO, classe: "valore" }
  ], "state.metrics.weight · A r.15034 (scrittore dal v148.38)"));

  const ck = modello.checkin;
  const righeCheckin = [];
  if (ck) {
    righeCheckin.push({ testo: ck.data, classe: "valore" });
    righeCheckin.push({ testo: "questionario: " + ck.questionario });
    const voci = Object.entries(ck.risposte || {}).map(([k, v]) => k + ": " + v);
    if (ck.wellness) voci.push("wellness: " + JSON.stringify(ck.wellness));
    if (voci.length) righeCheckin.push({ testo: voci.join("\n"), classe: "pre" });
  }
  contenitore.appendChild(carta(doc, "Ultimo check-in", righeCheckin.length ? righeCheckin : [{ testo: NON_REGISTRATO, classe: "valore" }],
    "state.quiz.questionnaireHistory · A r.4777 (canonico) e r.15021 (struttura voce)"));

  contenitore.appendChild(carta(doc, "Valori del check-in", righeValoriCheckin(modello.checkin),
    "state.quiz.questionnaireHistory · wellness (energy, sleep, doms, stress, hunger) · A r.15021 — state.metrics non è usato: A non lo scrive (r.7659-7683)"));

  contenitore.appendChild(carta(doc, "Programma attivo", righeProgramma(modello),
    "nutritionPhotos, soli documenti program-v1- e program-v2-meta- · filtro programIds r.5591/5600 · v1 scartato se già in v2 r.5636 · controllo programCount r.5633/5640 · regola attivo r.7019-7027 · settimana r.6882-6899"));

  if (!presente && opz.messaggioVuoto !== false) {
    contenitore.appendChild(carta(doc, "Documento di A", [
      { testo: "Non risulta un documento per questo account: le schermate mostrano il vuoto, senza numeri inventati." }
    ], "barbellDivaAccounts/{uid} · A r.24 e r.6080"));
  }
  if (opz.quadro) {
    contenitore.appendChild(carta(doc, "Quadro strutturale", righeQuadro(opz.quadro),
      "sottoraccolta sessions — dateInput e sessionCode · 8 settimane ISO · soglie dichiarate in comune/struttura.js"));
    contenitore.appendChild(carta(doc, "Semaforo strutturale", righeSemaforo(opz.quadro),
      "conteggi di carico e continuita, non una diagnosi · nessun dato inventato"));
    contenitore.appendChild(carta(doc, "Cosa manca per il semaforo completo", righeDatiMancanti(),
      "DATI_SEMAFORO · comune/struttura.js — dati che in A non sono registrati"));
  }
  if (opz.carichi) {
    contenitore.appendChild(carta(doc, "Carichi per esercizio", righeCarichi(opz.carichi),
      "sottoraccolta sessions \u2014 esercizi e serie con peso \u00b7 finestra di 8 settimane \u00b7 campi accettati dichiarati in comune/carichi.js"));
  }
  return contenitore;
}

/* Avvio: tema, app B (nome "B"), sessione, letture una tantum. */
export async function avvia(doc, win) {
  const config = win.BD_B;
  const sdk = win.firebase;
  if (!config || !sdk) throw new Error("Configurazione o SDK mancanti");

  doc.querySelectorAll("[data-build]").forEach((n) => { n.textContent = "build " + config.build; });
  doc.querySelectorAll("[data-versione]").forEach((n) => { n.textContent = config.build; });
  const segnoMarco = doc.querySelector("[data-marco]");
  if (segnoMarco) segnoMarco.appendChild(creaVolto(doc, "neutro"));
  applicaTema(doc, temaSalvato(win.localStorage));

  const app = inizializzaAppB(sdk, config);
  const auth = authDi(app);
  persistenzaLocale(auth, sdk).catch(() => {});
  const db = firestoreDi(app);

  const vistaLogin = doc.querySelector("#vistaLogin");
  const vistaDash = doc.querySelector("#vistaDash");
  const statoUtente = doc.querySelector("#statoUtente");
  const oraLettura = doc.querySelector("#oraLettura");
  const messaggioErrore = doc.querySelector("#messaggioErrore");
  const contenitoreDiva = doc.querySelector("#divaContenitore");
  let utenteCorrente = null;
  let modelloScorso = null;
  /* L'ultima lettura, messa da parte: l'Archivio riapre la scheda di un
   * programma da qui, senza rileggere Firestore. */
  let statoLettura = { sedute: [], programmi: [], schedeV2: null, attivo: null, ordinati: [] };
  /* La voce del programma e le frasi della Diva: la prima nasce dallo stesso
   * riepilogo che disegna le carte, così fumetto e numeri non divergono. */
  let voceProgramma1 = null;
  let frasiDiva = null;
  let tonoDiva = null;
  const vistaProgrammaAperta = () => {
    const v = doc.querySelector("#vistaProgramma1");
    return Boolean(v) && !v.hidden;
  };
  const frasiConProgramma = () => (voceProgramma1 && vistaProgrammaAperta() && frasiDiva
    ? [voceProgramma1].concat(frasiDiva)
    : (frasiDiva || []));

  const aggiornaVista = (utente) => {
    if (utente) {
      vistaLogin.hidden = true;
      vistaDash.hidden = false;
      statoUtente.textContent = "connessa/o come " + (utente.displayName || utente.email || utente.uid);
    } else {
      vistaLogin.hidden = false;
      vistaDash.hidden = true;
      statoUtente.textContent = "";
    }
  };

  /* L'Archivio: elenco dei programmi che non sono l'attivo, e la stessa vista
   * del programma aperta per scelta. Nessuna scrittura: si legge e si disegna. */
  const mostraElencoArchivio = () => {
    const elenco = doc.querySelector("#archivioElenco");
    const scheda = doc.querySelector("#archivioScheda");
    if (elenco) elenco.hidden = false;
    if (scheda) scheda.hidden = true;
  };

  const montaArchivio = (prop, modello, schedeV2, seduteLette, ordinatiP, attivo) => {
    const elenco = doc.querySelector("#archivioElenco");
    const dettaglio = doc.querySelector("#archivioDettaglio");
    const scheda = doc.querySelector("#archivioScheda");
    if (!elenco) return;
    const righe = elencoArchivio(prop.programmi || [], { attivoId: attivo ? attivo.id : "", schedeV2 });
    renderArchivio(doc, elenco, {
      righe,
      cancellati: modello.programmiScartatiFiltro,
      schedeNonLette: schedeV2 == null,
      letturaFallita: Boolean(modello.programmiNonLetti)
    });
    if (scheda) scheda.hidden = true;
    elenco.hidden = false;
    elenco.querySelectorAll(".pr-arch-riga").forEach((bottone) => {
      bottone.addEventListener("click", () => {
        const id = bottone.getAttribute("data-programma");
        const programma = (prop.programmi || []).find((x) => String(x.id || "") === id) || null;
        if (!programma || !dettaglio) return;
        const indice = Math.max(0, ordinatiP.indexOf(programma));
        const rp = riepilogoProgramma(programma, seduteLette, { indice, totaleProgrammi: ordinatiP.length, schedeV2, oggi: new Date(), quante: 8 });
        renderProgramma(doc, dettaglio, modello, rp);
        elenco.hidden = true;
        if (scheda) scheda.hidden = false;
        const nastroArch = doc.querySelector("#nastroSotto");
        if (nastroArch) nastroArch.textContent = "archivio · " + (rp.profilo.nome || "programma") + " · sola lettura";
      });
    });
  };

  const leggi = async (utente) => {
    if (!utente) return;
    messaggioErrore.textContent = "";
    try {
      const radice = await leggiDocumentoAtleta(db, utente.uid);
      let sedute = { sedute: [], documenti: 0, senzaId: 0, duplicati: 0 };
      let seduteNonLette = false;
      try {
        sedute = await leggiSedute(db, utente.uid);
      } catch (e) {
        seduteNonLette = true;
      }
      let programmi = { programmi: [], documenti: 0, scartatiFiltro: 0, v1Doppioni: 0, fonte: null };
      let programmiNonLetti = false;
      try {
        // La radice porta programIds/programCount/programStorage (r.5932-5935):
        // servono al filtro dei programmi cancellati e al controllo dei conteggi.
        programmi = await leggiProgrammi(db, utente.uid, radice);
      } catch (e) {
        programmiNonLetti = true;
      }
      let schedeV2 = null;
      try {
        // Le schede dei programmi v2: stessa lettura della pagina Conteggi
        // (tre famiglie di id, sola lettura). Se fallisce, la schermata dice
        // che non ha potuto leggerle e non mostra un elenco vuoto per finta.
        schedeV2 = await leggiSchedeProgrammi(db, utente.uid);
      } catch (e) {
        schedeV2 = null;
      }
      const modello = riepilogoDati({
        stato: radice.stato,
        sedute: sedute.sedute,
        documentiSedute: sedute.documenti,
        seduteSenzaId: sedute.senzaId,
        seduteDuplicate: sedute.duplicati,
        seduteNonLette,
        programmi: programmi.programmi,
        documentiProgrammi: programmi.documenti,
        programmiScartatiFiltro: programmi.scartatiFiltro,
        programmiV1Doppioni: programmi.v1Doppioni,
        programmiFonte: programmi.fonte,
        programmiNonLetti,
        sessionCount: radice.sessionCount,
        programCount: radice.programCount
      });
      const quadro = quadroStrutturale(sedute.sedute, { oggi: new Date(), peso: modello.peso });
      const carichi = carichiPerEsercizio(sedute.sedute, { oggi: new Date() });
      const rq = righeQuadro(quadro);
      const rs = righeSemaforo(quadro);
      const rm = righeDatiMancanti();
      const conta = (v) => (v && v.valore != null ? v.valore : null);
      const pausa = conta(rq.find((r) => /pausa|giorni/i.test(String(r.etichetta || ""))));
      modelloScorso = modello;
      renderDashboardV31(doc, doc.querySelector("#griglia"), modello, {
        build: config.build,
        righeQuadro: rq,
        righeSemaforo: rs,
        righeMancanti: rm,
        quadroNumeri: pausa == null ? null : "controllo · quadro: ultima pausa " + pausa
      });
      const grigliaOverview = doc.querySelector("#overviewGriglia");
      if (grigliaOverview) {
        renderOverviewAtleta(doc, grigliaOverview, modello, riepilogoOverview(sedute.sedute, { oggi: new Date(), settimane: 8, ultime: 8 }));
      }
      const grigliaPianificazione = doc.querySelector("#pianificazioneGriglia");
      if (grigliaPianificazione) {
        renderPianificazione(doc, grigliaPianificazione, modello, riepilogoPianificazione(sedute.sedute, { oggi: new Date(), settimane: 8 }));
      }
      /* Un solo programma in scena: quello attivo, con la regola di A
       * (status "active", poi il flag active, poi il più aggiornato — e in quel
       * caso lo dichiaro). Tutti gli altri vanno in Archivio programmi, con la
       * stessa vista aperta per scelta. Un programma che non c'è resta vuoto e
       * lo dice: non si riempie con un altro. */
      const ordinatiP = elencoProgrammiOrdinato(programmi.programmi || []);
      const scelto = programmaAttivo(programmi.programmi || []);
      const attivo = scelto ? scelto.programma : null;
      const profiloAttivo = attivo ? profiloProgramma(attivo) : null;
      const indiceAttivo = attivo ? Math.max(0, ordinatiP.indexOf(attivo)) : 0;
      const grigliaAttiva = doc.querySelector("#programma1Griglia");
      if (grigliaAttiva) {
        const rp = riepilogoProgramma(attivo, sedute.sedute, { indice: indiceAttivo, totaleProgrammi: ordinatiP.length, schedeV2, oggi: new Date(), quante: 8 });
        voceProgramma1 = voceDelProgramma(rp);
        renderProgramma(doc, grigliaAttiva, modello, rp);
      }
      statoLettura = { sedute: sedute.sedute, programmi: programmi.programmi || [], schedeV2, attivo, ordinati: ordinatiP };
      /* Il nome del programma attivo va sotto la voce del menu: è quello letto,
       * non quello scritto nell'HTML. Se il programma non è marcato attivo, il
       * suggerimento dice che sto mostrando il più aggiornato. */
      const nomeAttivo = doc.querySelector("#nomeProgrammaAttivo");
      if (nomeAttivo) {
        nomeAttivo.textContent = profiloAttivo ? profiloAttivo.nome : "nessun programma letto";
        nomeAttivo.setAttribute("title", !scelto
          ? "nessun documento-programma letto"
          : scelto.esplicito
            ? "marcato attivo nel programma"
            : "nessun programma è marcato attivo: mostro il più aggiornato, e lo dichiaro");
      }
      montaArchivio(programmi, modello, schedeV2, sedute.sedute, ordinatiP, attivo);
      const nastro = doc.querySelector("#nastroSotto");
      if (nastro) {
        nastro.textContent = profiloAttivo
          ? profiloAttivo.nome
            + (modello.programma && modello.programma.settimana != null ? " · settimana " + modello.programma.settimana : "")
            + (scelto && scelto.esplicito ? "" : " · nessun attivo segnato: il più aggiornato")
          : "in lettura dai tuoi dati veri";
      }
      oraLettura.textContent = "lettura una tantum · " + new Date().toLocaleTimeString("it-IT") + " · nessuna scrittura";
      contenitoreDiva.textContent = "";
      const voceQuadro = voceDelQuadro(quadro);
      const voceCarico = voceDelCarico(carichi);
      const saluto = voceDelGiorno(new Date());
      frasiDiva = frasiPerDati({
        numeroSedute: modello.numeroSedute || 0,
        pesoPresente: Boolean(modello.peso),
        checkinPresente: Boolean(modello.checkin)
      }, quadro, { giornata: saluto, carichi });
      tonoDiva = tonoPeggiore(voceQuadro.tono, voceCarico.tono);
      montaDivaBot(contenitoreDiva, frasiConProgramma(), tonoDiva);
    } catch (errore) {
      messaggioErrore.textContent = "Errore di lettura: " + (errore && errore.code ? errore.code : (errore && errore.message) || "sconosciuto");
    }
  };

  ascoltaStato(auth, async (utente) => {
    utenteCorrente = utente;
    aggiornaVista(utente);
    await leggi(utente);
  });

  doc.querySelector("#bottoneEntra").addEventListener("click", () => {
    entraConGoogle(sdk, auth, { mobile: false }).catch((e) => {
      messaggioErrore.textContent = "Accesso non riuscito: " + (e && e.code ? e.code : (e && e.message) || "");
    });
  });
  doc.querySelector("#bottoneRicarica").addEventListener("click", () => leggi(utenteCorrente));
  doc.querySelector("#bottoneEsci").addEventListener("click", () => esci(auth));
  doc.querySelectorAll(".voce[data-vista]").forEach((voce) => {
    if (voce.disabled) return;
    voce.addEventListener("click", () => {
      const id = mostraVista(doc, voce.getAttribute("data-vista"));
      if (id === "overview-atleta" && nastro) nastro.textContent = "overview atleta · conti sulle sedute lette";
      else if (id === "pianificazione" && nastro) nastro.textContent = "pianificazione · il calendario che i logbook dimostrano";
      else if (id === "programma-1" && nastro) nastro.textContent = "programma attivo · il documento del programma e i logbook";
      else if (id === "archivio" && nastro) nastro.textContent = "archivio programmi · la stessa scheda, aperta per scelta";
      else if (id === "dashboard" && nastro && modelloScorso) nastro.textContent = modelloScorso.programma && modelloScorso.programma.nome ? modelloScorso.programma.nome : "in lettura dai tuoi dati veri";
      if (id === "archivio") mostraElencoArchivio();
      if (id === "programma-1" && frasiDiva) {
        contenitoreDiva.textContent = "";
        montaDivaBot(contenitoreDiva, frasiConProgramma(), tonoDiva || "neutro");
      }
    });
  });
  doc.querySelector("#bottoneTema").addEventListener("click", () => alternaTema(doc, win.localStorage));
  const archivioIndietro = doc.querySelector("#archivioIndietro");
  if (archivioIndietro) archivioIndietro.addEventListener("click", mostraElencoArchivio);
  gruppiApribili(doc, win.localStorage);
  return { app, auth, db };
}

/* Avvio solo nella pagina vera (i test importano il modulo senza il marker). */
if (typeof document !== "undefined" && document.querySelector && document.querySelector("[data-avvio-b]")) {
  avvia(document, window);
}
