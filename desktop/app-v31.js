/* Barbell Diva B — passo 3a: Programma attivo con i dati veri, in sola lettura.
 * Passo 3b: striscia in alto per pagina, ripulita dal markup, e guardia sulla Fase.
 *
 * Il file index.html è il v31: qui si collegano solo queste cose, nient'altro.
 *  1. il login Google, con la card di accesso (solo quando non c'è sessione);
 *  2. la lettura una tantum di documento radice, sedute, programmi e schede,
 *     con i moduli che già esistono in comune/ (niente riscritture);
 *  3. il render del Programma attivo dentro #programma-attivo, con i
 *     controlli che scrivono spenti (la vista li mostra ma non li attiva);
 *  4. il nastro in alto aggiornato al cambio pagina (nel file è scritto fisso
 *     per la Dashboard) e ripulito dal markup che il v31 stampa come testo;
 *  5. la Fase: se il campo del documento ripete il nome del programma, non è
 *     una fase — resta a «non registrato» invece di mostrare un valore sbagliato.
 *
 * Dove un dato non c'è: "non registrato". Mai inventato.
 */

import { inizializzaAppB, authDi, firestoreDi, persistenzaLocale } from "../comune/firebase-client.js";
import { nomePulito } from "../comune/nome-pulito.js";
import { entraConGoogle, ascoltaStato } from "../comune/accesso.js";
import { programmaAttivo } from "../comune/lettura-dati.js";
import { leggiZonaBCompleta } from "../comune/lettura-b.js";
import { leggiZonaB, leggiFotografia } from "../comune/scritture-b.js";
import { creaEditorSchede } from "../comune/editor-schede-b.js";
import { ultimaAnnullabile } from "../comune/modifiche-b.js";
import { riepilogoProgramma } from "../comune/programma.js";
import { renderProgramma } from "../comune/vista-programma.js";
import { elencoArchivio, renderArchivio } from "../comune/vista-archivio.js";
import { seduteLogbook } from "../comune/logbook.js";
import { applicaEsclusioni } from "../comune/esclusioni.js";

/* ---------- il foglio di stile di B --------------------------------------
 * Il file index.html e' il v31 e porta dentro di se' una copia vecchia delle
 * regole di B (tabella compresa). Il foglio vero e' comune/dashboard-b.css: lo
 * si carica qui, per ultimo nel body, cosi' le misure della tabella e le celle
 * di Rec e TUT sono quelle del foglio che si mantiene, non quelle della copia.
 */
function caricaFoglioB(doc, base) {
  if (!doc || !doc.body || doc.getElementById("foglio-b")) return;
  const l = doc.createElement("link");
  l.id = "foglio-b";
  l.rel = "stylesheet";
  l.href = new URL("../comune/dashboard-b.css", base || import.meta.url).href;
  doc.body.appendChild(l);
}
caricaFoglioB(document);

/* La card di accesso: nasce solo quando manca la sessione, scompare quando c'è.
 * L'aspetto usa i gettoni del v31 (le stesse variabili CSS). */
function montaCartaAccesso(doc) {
  const velo = doc.createElement("div");
  velo.id = "veloAccesso31";
  velo.setAttribute("style", "position:fixed;inset:0;z-index:99990;display:flex;align-items:center;justify-content:center;background:var(--bg,#101018)");
  const carta = doc.createElement("div");
  carta.setAttribute("style", "background:var(--card,#181822);border:1px solid var(--line,#2a2a38);border-radius:22px;padding:30px 32px;max-width:340px;text-align:center;color:var(--text,#eee);box-shadow:0 18px 50px rgba(0,0,0,.45)");
  const titolo = doc.createElement("div");
  titolo.setAttribute("style", "font-size:19px;font-weight:800;letter-spacing:.02em;margin-bottom:6px");
  titolo.textContent = "Barbell Diva B";
  const sottotitolo = doc.createElement("div");
  sottotitolo.setAttribute("style", "font-size:12px;opacity:.7;margin-bottom:22px");
  sottotitolo.textContent = "il quadro della coach, in sola lettura";
  const bottone = doc.createElement("button");
  bottone.type = "button";
  bottone.textContent = "Entra con Google";
  bottone.setAttribute("style", "font:700 14px/1 inherit;font-family:inherit;color:var(--text,#eee);background:var(--card-2,#20202c);border:1px solid var(--lav,#8b8bf5);border-radius:12px;padding:12px 22px;cursor:pointer");
  const nota = doc.createElement("div");
  nota.setAttribute("style", "font-size:11px;opacity:.6;margin-top:14px");
  nota.textContent = "sola lettura · niente viene salvato";
  const errore = doc.createElement("div");
  errore.setAttribute("style", "font-size:12px;color:var(--pink,#f06292);margin-top:12px;display:none");
  carta.appendChild(titolo);
  carta.appendChild(sottotitolo);
  carta.appendChild(bottone);
  carta.appendChild(nota);
  carta.appendChild(errore);
  velo.appendChild(carta);
  doc.body.appendChild(velo);
  return {
    velo,
    segnala(messaggio) {
      errore.textContent = messaggio;
      errore.style.display = "block";
    }
  };
}

/* ---------- il nastro in alto (la striscia) ----------
 * Nel file il nastro è scritto fisso per la Dashboard («Dashboard /
 * readiness, carico, questionari…») e nessun codice del v31 lo aggiorna al
 * cambio pagina; il pezzo destro (#fr-nastro) viene scritto con textContent
 * su una stringa che contiene un tag, e il browser lo stampa come testo.
 * Il vecchio B teneva il nastro con il suo app.js, per pagina: qui si rifà
 * quello. Il titolo è il testo della voce di menu del v31 (quella stessa che
 * la voce di menu mostra); il sottotitolo per le pagine previste è il testo
 * che usava il vecchio B; per le altre pagine il sottotitolo della Dashboard
 * sparisce invece di restare appiccicato. Nessun testo inventato. */
const SOTTOTITOLI_NASTRO = {
  "overview-atleta": "overview atleta · conti sulle sedute lette",
  "pianificazione": "pianificazione · il calendario che i logbook dimostrano",
  "programma-1": "programma attivo · il documento del programma e i logbook",
  "archivio": "archivio programmi · la stessa scheda, aperta per scelta"
};

function aggiornaStriscia(doc, id) {
  const nastro = doc.querySelector(".nastro");
  if (!nastro) return;
  const titolo = nastro.querySelector("b");
  const sotto = nastro.querySelector("span:not([class])");
  if (id === "dashboard") {
    if (titolo) titolo.textContent = "Dashboard";
    if (sotto) { sotto.textContent = "readiness, carico, questionari, quadro atleta"; sotto.style.display = ""; }
    return;
  }
  const voce = doc.querySelector('.voce[data-vista="' + id + '"] .tx');
  if (titolo && voce) {
    const prima = voce.childNodes[0] && voce.childNodes[0].textContent ? voce.childNodes[0].textContent : voce.textContent;
    titolo.textContent = String(prima).trim();
  }
  if (sotto) {
    const s = SOTTOTITOLI_NASTRO[id];
    if (s) { sotto.textContent = s; sotto.style.display = ""; }
    else { sotto.textContent = ""; sotto.style.display = "none"; }
  }
}

/* Il pezzo destro del nastro: il v31 lo scrive con textContent su una stringa
 * che contiene un tag <span>; qui si toglie solo il markup, il contenuto
 * (conteggio esercizi e ultima seduta, o il puntino) resta quello calcolato
 * dal v31. */
function ripulisciNastroDestro(doc) {
  const fr = doc.getElementById("fr-nastro");
  if (!fr) return;
  const t = fr.textContent;
  if (t.indexOf('<span data-lb-kpi="ultima">') === -1) return;
  fr.textContent = t.replace('<span data-lb-kpi="ultima">', "").replace("</span>", "");
}

/* Passo 3c — i filtri del Logbook: accesi dove il campo vero c'è, spenti con
 * «non registrato» dove non c'è; la dichiarazione finisce nella carta. */
function notaLogbook(doc, lb) {
  const d = lb.dichiarazioni || {};
  const righe = [];
  const fprog = doc.getElementById("lb-fprog");
  if (fprog) {
    if (d.conProgramma > 0) {
      righe.push("Programma: derivato dal codice della scheda, e solo quando quel codice appartiene a un programma solo (" + d.conProgramma + " sedute su " + d.tenute + "); per le altre " + d.senzaProgramma + " il codice manca o ricorre in più programmi e restano \u00ab\u2014\u00bb");
    } else {
      fprog.disabled = true;
      const o0 = fprog.options && fprog.options[0];
      if (o0) o0.textContent = "Programma: non registrato";
      righe.push("Programma: non registrato \u2014 le sedute non portano il programma e il codice della scheda ricorre in più programmi: attribuirlo sarebbe inventare");
    }
  }
  const fmostra = doc.getElementById("lb-fmostra");
  if (fmostra) {
    if (d.haStato) {
      righe.push("Stato: acceso sul campo vero (" + (d.statiValori || []).join(", ") + ")");
    } else {
      fmostra.disabled = true;
      const o0 = fmostra.options && fmostra.options[0];
      if (o0) o0.textContent = "Stato: non registrato";
      righe.push("Stato: non registrato \u2014 le sedute lette non portano né status né done");
    }
  }
  const ffonte = doc.getElementById("lb-ffonte");
  if (ffonte) {
    if (d.haFonte) {
      righe.push("Provenienza: acceso sul campo source (" + (d.fontiValori || []).join(", ") + "); le altre voci del tendine del v31 restano ma non trovano sedute");
    } else {
      ffonte.disabled = true;
      const o0 = ffonte.options && ffonte.options[0];
      if (o0) o0.textContent = "Fonte: non registrato";
      righe.push("Provenienza: non registrato \u2014 le sedute lette non portano source");
    }
  }
  if (d.conJournal === 0) righe.push("Journal: non collegato \u2014 il diario non è nella sottoraccolta sedute letta da B");
  righe.push("Esclusi: " + (d.escluseDaAlice || 0) + (d.escluseDaAlice === 1 ? " seduta" : " sedute") + " escluse da Alice, lette dalla sottoraccolta esclusioni di B: la seduta resta in A, sparisce solo qui");
  if (d.doppioniContenuto) righe.push("Contenuto doppio: " + d.doppioniContenuto + (d.doppioniContenuto === 1 ? " seduta" : " sedute") + " con la stessa data, la stessa scheda e gli stessi esercizi di un\u0027altra: A ne mostra una sola (r.3948), B fa lo stesso. Assorbita: " + (d.assorbite || []).map(function (x) { return (x.id || "senza id") + (x.data ? " del " + x.data : "") + (x.tenuta ? " \u2192 tenuta " + x.tenuta : ""); }).join("; "));
  const info = d.documenti != null && (d.senzaId || d.duplicati) ? " Letti " + d.tenute + " documenti validi su " + d.documenti + " (" + d.senzaId + " senza id, " + d.duplicati + " doppioni): come A, gli scartati non contano." : "";
  const nota = doc.getElementById("lb-nota-b");
  if (nota && righe.length) {
    nota.textContent = "Passo 3c \u2014 " + d.tenute + " sedute lette dal cloud in sola lettura (il seme di esempio del v31 ne aveva 120). " + righe.join(". ") + "." + info;
    nota.hidden = false;
  }
}

/* La zona B vuota o incompleta si dice a parole, nei tre posti che mostrano
 * programmi, archivio e sedute. Il Logbook viene azzerato davvero (non
 * lasciato al seme di esempio del v31): un numero inventato sarebbe peggio di
 * un numero assente. L'aspetto delle schermate non cambia: questo riquadro si
 * vede solo quando non c'e' niente da mostrare. */
/* Passo 9 — la riga di stato delle modifiche. Sta FUORI dal contenitore del
 * Programma, cosi' il ridisegno della tabella non la cancella: l'avviso resta
 * leggibile finche' non arriva il successivo. */
let rigaStato = null;

function creaRigaStato(doc) {
  const contenitore = doc.querySelector("#programma-attivo");
  if (!contenitore || !contenitore.parentNode) return null;
  const riga = doc.createElement("div");
  riga.id = "modifica-stato";
  riga.className = "pr-hint";
  riga.hidden = true;
  contenitore.parentNode.insertBefore(riga, contenitore.nextSibling);
  return riga;
}

function segnalaModifica(testo, tono) {
  if (!rigaStato) return;
  rigaStato.textContent = testo || "";
  rigaStato.hidden = !testo;
  rigaStato.setAttribute("data-tono", tono || "");
}

function oraBreve(iso) {
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return "ora non leggibile";
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

function kb(byte) {
  const n = Number(byte) || 0;
  return n < 1024 ? n + " B" : Math.round(n / 1024) + " KB";
}

function mostraZonaBIncompleta(doc, win, avviso) {
  const testo = avviso || "La zona B non e' pronta: fai prima la copia.";
  const contenitore = doc.querySelector("#programma-attivo");
  if (contenitore) {
    contenitore.innerHTML = "";
    const carta = doc.createElement("div");
    carta.setAttribute("style", "background:var(--card,#181822);border:1px solid var(--pink,#f06292);border-radius:18px;padding:20px 22px;color:var(--text,#eee);font-size:14px;line-height:1.5");
    carta.textContent = testo;
    contenitore.appendChild(carta);
  }
  const nomeVoce = doc.querySelector("#nomeProgrammaAttivo");
  if (nomeVoce) nomeVoce.textContent = "nessun programma letto";
  const corpoArchivio = doc.getElementById("archivio-corpo");
  if (corpoArchivio) {
    corpoArchivio.innerHTML = "";
    const riga = doc.createElement("tr");
    const cella = doc.createElement("td");
    cella.setAttribute("colspan", "8");
    cella.textContent = testo;
    riga.appendChild(cella);
    corpoArchivio.appendChild(riga);
  }
  if (win && win.BD_LB) {
    win.BD_LB_SEED = { fonte: "zona B non ancora copiata", sedute: [] };
    win.BD_LB._prende(win.BD_LB_SEED);
    win.BD_LB.tutto();
    const ovSed = doc.getElementById("ov-sed");
    if (ovSed && win.BD_LB.chips) ovSed.innerHTML = win.BD_LB.chips();
  }
  const nota = doc.getElementById("lb-nota-b");
  if (nota) { nota.textContent = testo; nota.hidden = false; }
}

/* ---------- Passo 16: il ridisegno automatico --------------------------- */

/* L'impronta dei dati letti. Guarda la STRUTTURA (quali programmi, quali
 * schede con quali esercizi e in che ordine, quante sedute, quante voci nel
 * registro) e non i valori di serie/reps/rec/TUT: quei valori li aggiorna la
 * cella che li scrive, e rileggerli per ridisegnarli era il difetto del passo
 * 15. Due letture con la stessa impronta non toccano la pagina. */
export function improntaDati(pezzi) {
  const p = pezzi || {};
  const datiDi = (d) => (d && d.dati != null ? d.dati : d) || {};
  const programmi = (p.programmi || []).map((d) => {
    const meta = datiDi(d).programMeta || datiDi(d);
    return [String((d && d.id) || meta.id || ""), String(meta.name || ""), String(meta.status || ""),
      String(meta.phase || ""), String(meta.startDate || ""), Number(meta.durationWeeks) || 0].join("|");
  }).sort();
  const schede = (p.schede || []).map((d) => {
    const g = datiDi(d);
    const s = g.sheet || g;
    const esercizi = (s.exercises || []).map((e) => String(e.id || e.exerciseId || e.name || "")).join(",");
    return [String((d && d.id) || g.id || ""), String(g.programId || ""), String(s.code || ""),
      String(s.name || ""), esercizi].join("|");
  }).sort();
  const sedute = (p.sedute || []).map((s) => {
    const g = s || {};
    const sessione = g.session || g;
    return [String(g.id || sessione.id || ""), String(sessione.dateInput || sessione.date || ""),
      String(sessione.sessionCode || ""), (sessione.exercises || []).length].join("|");
  }).sort();
  const esclusioni = (p.esclusioni || []).map((e) => String((e && (e.id || e.sedutaId)) || e || "")).sort();
  /* Il registro non fa parte della struttura: una voce nuova a ogni scrittura
   * non deve far ridisegnare la pagina (10/11/2026). */
  return JSON.stringify({ programmi, schede, sedute, esclusioni });
}

/* Lo scorrimento: si prende prima di svuotare il contenitore e si rimette
 * dopo. Ogni nodo che scorre si ritrova dal suo percorso di tag e classi (la
 * struttura del ridisegno e' la stessa), non dall'indice, che cambia. */
export function prendiScorrimento(doc, win) {
  const preso = { finestra: Number((win && (win.scrollY || win.pageYOffset)) || 0), elementi: [] };
  const att = doc && doc.querySelector ? doc.querySelector("#programma-attivo") : null;
  if (!att || !att.querySelectorAll) return preso;
  const tutti = att.querySelectorAll("*");
  for (let i = 0; i < tutti.length; i += 1) {
    const el = tutti[i];
    if (el && el.scrollTop) preso.elementi.push({ percorso: percorsoNodo(att, el), cima: el.scrollTop });
  }
  return preso;
}

function percorsoNodo(radice, el) {
  const pezzi = [];
  let qui = el;
  while (qui && qui !== radice) {
    const tag = qui.tagName ? String(qui.tagName).toLowerCase() : "";
    const classi = qui.getAttribute ? String(qui.getAttribute("class") || "").trim().split(/\s+/).filter(Boolean) : [];
    pezzi.unshift(tag + classi.map((c) => "." + c).join(""));
    qui = qui.parentNode;
  }
  return pezzi.join(">");
}

export function rimettiScorrimento(doc, win, preso) {
  if (!preso) return;
  if (win && typeof win.scrollTo === "function" && preso.finestra) win.scrollTo(0, preso.finestra);
  const att = doc && doc.querySelector ? doc.querySelector("#programma-attivo") : null;
  if (!att || !att.querySelector) return;
  (preso.elementi || []).forEach((v) => {
    let nodo = null;
    try { nodo = v.percorso ? att.querySelector(v.percorso) : null; } catch (e) { nodo = null; }
    if (nodo) nodo.scrollTop = v.cima;
  });
}

export async function avvia(doc, win) {
  const config = win.BD_B;
  const sdk = win.firebase;
  const carta = montaCartaAccesso(doc);
  ripulisciNastroDestro(doc);
  /* Passo 3c: «Importa backup» e «Dimentica» restano visibili ma spenti:
   * il logbook della coach è in sola lettura. */
  const btnImportaLb = doc.getElementById("lb-importa");
  const btnDimenticaLb = doc.getElementById("lb-dimentica");
  if (btnImportaLb) btnImportaLb.disabled = true;
  if (btnDimenticaLb) btnDimenticaLb.disabled = true;
  doc.addEventListener("click", (e) => {
    const v = e.target && e.target.closest ? e.target.closest(".voce[data-vista]") : null;
    if (v) aggiornaStriscia(doc, v.getAttribute("data-vista"));
  }, true);
  if (!config || !sdk) {
    carta.segnala("configurazione o SDK mancanti: ricarica la pagina");
    return;
  }
  const app = inizializzaAppB(sdk, config);
  const auth = authDi(app);
  persistenzaLocale(auth, sdk).catch(() => {});
  const db = firestoreDi(app);

  carta.velo.querySelector("button").addEventListener("click", async () => {
    try {
      await entraConGoogle(sdk, auth, { mobile: false });
    } catch (e) {
      carta.segnala("accesso non riuscito: " + (e && e.code ? e.code : "errore sconosciuto"));
    }
  });

  /* Passo 16 — lo stato che sopravvive a un ridisegno. Prima viveva dentro
   * leggi: ogni ridisegno lo azzerava, e una scrittura partita prima del
   * ridisegno diventava invisibile al controllo che doveva aspettarla. */
  let modificheInVolo = 0;
  let sincronizzazione = null;
  let sincronizzazioneRichiesta = false;
  let rinvioAutomatico = false;
  let utenteCorrente = null;
  let sincronizzaEsterno = null;
  const stato = (win.BD_B_STATO = win.BD_B_STATO || { ridisegni: 0, letture: 0, rimandati: 0, impronta: null });

  const leggi = async (utente, opzioni) => {
    const o = opzioni || {};
    /* Passo 8 — la fonte e' la zona B (bdB_atleti), non piu' i dati di A.
     * Le letture da «barbellDivaAccounts» restano solo nella pagina Copia, che
     * serve a copiare. Se la zona e' vuota o manca un pezzo si dichiara qui
     * sotto e non si mostra niente: nessun ripiego silenzioso su A, perche'
     * mostrare i numeri di A dicendo che sono di B e' peggio di un vuoto. */
    const zona = await leggiZonaBCompleta(db, utente.uid);
    if (!zona.esito.completa) {
      mostraZonaBIncompleta(doc, win, zona.esito.avviso);
      return;
    }
    const sedute = zona.sedute;
    /* Le esclusioni decise da Alice vivono in bdB_atleti/{uid}/esclusioni:
     * arrivano con la zona B e si applicano prima di qualunque schermata.
     * Logbook, riepilogo del programma e card «Tutto insieme» (che si alimenta
     * dalle chips del Logbook) vedono le stesse sedute. */
    const esclusioni = zona.esclusioni;
    const sedutePulite = applicaEsclusioni(sedute.sedute, esclusioni);
    const programmi = { programmi: zona.programmi };
    const schedeV2 = zona.schedeV2;
    if (!rigaStato) rigaStato = creaRigaStato(doc);
    /* Passo 9 — l'editor delle schede: serie e ripetizioni di una settimana,
     * scritte SOLO nella zona B, una alla volta e con il controllo di versione. */
    const schedeGrezze = await leggiZonaB(db, utente.uid, "schede");
    const registroB = await leggiZonaB(db, utente.uid, "registro");
    const fotografiaB = await leggiFotografia(db, utente.uid);
    /* Passo 16 — l'impronta dei dati letti: se e' la stessa che sta a schermo
     * non c'e' niente da ridisegnare (ed e' il caso normale di un giro di
     * sessione o di un controllo dopo un salvataggio). */
    const impronta = improntaDati({ programmi: programmi.programmi, schede: schedeGrezze, sedute: sedutePulite.sedute, esclusioni: esclusioni, registro: registroB });
    const improntaPrima = stato.impronta;
    stato.letture += 1;

    if (o.forza !== true && impronta === improntaPrima) return { ridisegnato: false };
    /* l'impronta si aggiorna quando il disegno parte davvero: un secondo giro
     * che arriva mentre il primo disegna non puo' ridisegnare lo stesso stato. */
    stato.impronta = impronta;
    /* nel frattempo puo' essersi aperta una cella: si ricontrolla prima di
     * toccare la pagina, non dopo */
    const editor = creaEditorSchede({
      db: db,
      uid: utente.uid,
      documenti: schedeGrezze,
      fotografia: fotografiaB,
      ultimaVoce: ultimaAnnullabile(registroB)
    });

    /* Una cella e' in modifica se il fuoco e' dentro un campo scrivibile, o se
     * c'e' una cella aperta (classe "scrittura") anche quando il fuoco e' sul
     * pulsantino +: li' dentro c'e' una modifica che non e' ancora partita. */
    const cellaInModifica = () => {
      const attivoQui = doc.activeElement;
      if (attivoQui && attivoQui.getAttribute && attivoQui.getAttribute("contenteditable") === "true") return true;
      const aperte = doc.querySelectorAll("#programma-attivo [contenteditable='true']");
      for (let i = 0; i < aperte.length; i += 1) {
        if (aperte[i].classList && aperte[i].classList.contains("scrittura")) return true;
      }
      return false;
    };
    const rimanda = () => { rinvioAutomatico = true; stato.rimandati += 1; };
    const sincronizza = (chi, opzioni) => {
      const o = opzioni || {};
      if (modificheInVolo > 0 || sincronizzazione !== null) { sincronizzazioneRichiesta = true; return Promise.resolve(); }
      if (cellaInModifica()) { rimanda(); return Promise.resolve(); }
      const opzLettura = Object.assign({}, o, {
        motivo: o.motivo || (typeof chi === "string" ? chi : "sessione")
      });
      sincronizzazione = leggi(chi, opzLettura).then((esito) => {
        sincronizzazione = null;
        if (sincronizzazioneRichiesta) { sincronizzazioneRichiesta = false; return sincronizza(chi, o); }
        return esito;
      }, (e) => {
        sincronizzazione = null;
        sincronizzazioneRichiesta = false;
        segnalaModifica("sincronizzazione non riuscita: " + (e && e.message ? e.message : "errore"), "errore");
      });
      return sincronizzazione;
    };
    sincronizzaEsterno = sincronizza;
    /* Niente letture mentre si scrive: si rimanda, non si insiste. Le
     * funzioni sono dichiarate qui sopra, quindi si possono usare. */
    if (modificheInVolo > 0 || cellaInModifica()) { rimanda(); return { ridisegnato: false, rimandato: true }; }
    const attivo = programmaAttivo(programmi.programmi || []);
    const contenitore = doc.querySelector("#programma-attivo");
    const strumenti = doc.querySelector("#programma-strumenti");
    const nomeVoce = doc.querySelector("#nomeProgrammaAttivo");
    const rp = riepilogoProgramma(attivo ? attivo.programma : null, sedutePulite.sedute, {
      indice: 0,
      totaleProgrammi: (programmi.programmi || []).length,
      schedeV2,
      oggi: new Date(),
      quante: 8
    });
    /* La Fase: se il campo del documento ripete il nome del programma, non è
     * una fase. Non lo mostro: il campo resta a «non registrato». La pagina
     * desktop/diagnosi.html (temporanea) dice quali nomi usa davvero il
     * documento; quando li sapremo si collega il campo giusto. */
    if (rp.profilo && rp.profilo.presente && rp.profilo.fase && rp.profilo.fase === rp.profilo.nome) rp.profilo.fase = "";
    const scorrimentoPrima = prendiScorrimento(doc, win);
    if (contenitore) {
      stato.ridisegni += 1;

    }
    if (contenitore) renderProgramma(doc, contenitore, { presente: Boolean(attivo) }, Object.assign({}, rp, {
      modifica: {
        attivo: true,
        annullabile: editor.annullabile,
        onAnnulla: () => {
          editor.annulla().then((esito) => {
            segnalaModifica(esito.ok
              ? "annullato · " + doveVoce(esito.voce) + " torna a " + (esito.voce.dopo || "vuoto")
              : (esito.motivo || "non c'e' niente da annullare"), esito.ok ? "ok" : "errore");
            return sincronizza(utente, { forza: true, motivo: "annulla" });
          });
        },
        /* Passo 13 — il dato appena scritto sta a schermo SUBITO (lo mostra la
         * cella), la riga di stato dice quando, e la rilettura arriva una sola
         * volta a coda vuota: mai uno stato vecchio sopra una modifica fresca. */
        onCambia: (richiesta) => {
          modificheInVolo += 1;
          return editor.modifica(richiesta).then((esito) => {
            modificheInVolo -= 1;

            if (esito.ok) {
              segnalaModifica("salvato alle " + oraBreve(new Date().toISOString()) + " · scheda " + esito.voce.codice + " · " + doveVoce(esito.voce) + ": " + ((esito.voce.dopoTesto || esito.voce.dopo) || "vuoto") +
                " · peso radice " + kb(esito.peso.radice) + ", scheda " + kb(esito.peso.scheda), "ok");
            } else {
              segnalaModifica(esito.motivo || "non ho scritto niente", "errore");
              /* Passo 16 — una scrittura non riuscita puo' voler dire che il
               * dato a schermo non e' piu' quello del disco: qui si rilegge. */
              return { ok: false, motivo: esito.motivo || "non ho scritto niente" };
            }
            /* Passo 16 — il dato appena scritto e' gia' nella cella: non si
             * rilegge e non si ridisegna da zero. Se un controllo era stato
             * rimandato perche' si stava scrivendo, ora si puo' fare: l'impronta
             * (struttura) dira' se c'e' davvero qualcosa di nuovo. */
            if (rinvioAutomatico) { rinvioAutomatico = false; return sincronizza(utente, { motivo: "controllo rimandato" }); }
            /* Passo 20 — le otto settimane le ha calcolate B, non la cella:
             * senza rileggere, a schermo non cambierebbe niente. */
            if (richiesta && (richiesta.campo === "progressione" || richiesta.campo === "progressione-scheda" || richiesta.campo === "riga")) {
              return sincronizza(utente, { forza: true, motivo: "progressione" });
            }
            return { ridisegnato: false };
          });
        }
      }
    }));

    if (nomeVoce) nomeVoce.textContent = attivo ? nomePulito(rp.profilo.nome) : "nessun programma letto";
    if (strumenti) strumenti.hidden = true;
    /* L'Archivio (passo 3b): la tabella del v31 con i programmi veri. */
    const corpoArchivio = doc.getElementById("archivio-corpo");
    if (corpoArchivio) renderArchivio(doc, corpoArchivio, { righe: elencoArchivio(programmi.programmi || [], { attivoId: attivo ? String(attivo.programma.id || "") : "", schedeV2 }) });
    /* Il Logbook (passo 3c): le sedute vere dentro la carta del v31, nella
     * stessa forma del seme tolto; niente scritture, controlli spenti. */
    const lb = seduteLogbook(sedutePulite.sedute, { programmi: programmi.programmi || [], schedeV2, oggi: new Date(), escluse: sedutePulite.escluse, infoSedute: { documenti: sedute.documenti, senzaId: sedute.senzaId, duplicati: sedute.duplicati } });
    if (win.BD_LB) {
      win.BD_LB_SEED = { fonte: lb.fonte, sedute: lb.sedute };
      win.BD_LB._prende(win.BD_LB_SEED);
      win.BD_LB.tutto();
      const ovSed = doc.getElementById("ov-sed");
      if (ovSed && win.BD_LB.chips) ovSed.innerHTML = win.BD_LB.chips();
    }
    notaLogbook(doc, lb);
    rimettiScorrimento(doc, win, scorrimentoPrima);
    return { ridisegnato: true };
  };

  /* Passo 16 — onAuthStateChanged torna anche quando l'SDK rinnova il token,
   * con lo stesso utente: quel giro non e' un motivo per rileggere e
   * ridisegnare. Il primo (o un cambio di account) legge; i successivi passano
   * dal controllo d'impronta, che con i dati uguali non tocca la pagina. */
  doc.addEventListener("focusout", () => {
    if (!rinvioAutomatico || modificheInVolo > 0 || sincronizzazione !== null) return;
    rinvioAutomatico = false;
    setTimeout(() => {
      if (typeof sincronizzaEsterno === "function" && utenteCorrente) sincronizzaEsterno(utenteCorrente);
    }, 0);
  }, true);
  let uidLetto = null;
  ascoltaStato(auth, (utente) => {
    if (!utente) {
      uidLetto = null;
      utenteCorrente = null;
      stato.impronta = null;
      carta.velo.style.display = "flex";
      return;
    }
    carta.velo.style.display = "none";
    utenteCorrente = utente;
    if (uidLetto === utente.uid) {
      if (typeof sincronizzaEsterno === "function") sincronizzaEsterno(utente);
      return;
    }
    uidLetto = utente.uid;
    leggi(utente).catch((e) => {
      carta.velo.style.display = "flex";
      carta.segnala("lettura non riuscita: " + (e && e.code ? e.code : (e && e.message ? e.message : "errore sconosciuto")));
    });
  });
}

avvia(document, window).catch((e) => { if (typeof console !== "undefined") console.warn("avvio: ", e); });

/* Dove e' finita la modifica: la settimana per serie e ripetizioni, l'esercizio
 * per recupero e TUT (quei due campi sono dell'esercizio, non della settimana). */
function doveVoce(voce) {
  const v = voce || {};
  const tipo = String(v.tipo || "");
  if (tipo === "modifica-progressione") {
    return "progressione «" + (v.nomeProgressione || v.progressione || "") + "» di " + nomePulito(v.esercizio || "");
  }
  if (tipo === "modifica-progressione-scheda") {
    return "progressione «" + (v.nomeProgressione || "") + "» su " + ((v.righe || []).length) + " righe";
  }
  if (tipo === "cancella-riga") return "riga tolta: " + nomePulito(v.esercizio || "");
  if (tipo === "annulla-modifica") {
    if (v.campo === "riga") return "la riga «" + nomePulito(v.esercizio || "") + "» rimessa";
    if (v.campo === "progressione") return "progressione di " + nomePulito(v.esercizio || "") + " riportata indietro";
    if (v.campo === "progressione-scheda") return "progressione di scheda riportata indietro";
  }
  if (v.settimana) return "S" + v.settimana + " " + v.campo;
  const nome = v.campo === "recupero" ? "rec" : "TUT";
  return v.esercizio ? nome + " di " + nomePulito(v.esercizio) : nome;
}
