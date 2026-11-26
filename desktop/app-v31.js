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
import { leggiZonaB, leggiFotografia, scriviVoceRegistro, senzaUndefined, leggiScheletriB, leggiScheletroB, salvaScheletroConVersione, eliminaScheletroB } from "../comune/scritture-b.js";
import { creaEditorSchede } from "../comune/editor-schede-b.js";
import { ultimaAnnullabile } from "../comune/modifiche-b.js";
import { riepilogoProgramma, schedePerProgramma, profiloProgramma } from "../comune/programma.js";
import { riepilogoPianificazione } from "../comune/pianificazione.js";
import { renderPianificazione } from "../comune/vista-pianificazione.js";
import { elencoScheletri, salvaScheletroCostruito } from "../comune/scheletri.js";
import { montaPaginaScheletri } from "../comune/vista-scheletri-pagina.js";
import { programmaDaScheletro, scriviProgrammaNuovo } from "../comune/nuovo-programma-b.js";
import { renderProgramma } from "../comune/vista-programma.js";
import { collegaPiano } from "../comune/piano-vivo.js";
import { pianiDalleSchede } from "../comune/piano-scheda.js";
import { chiedeRilettura } from "../comune/ridisegno-b.js";
import { renderVolume } from "../comune/vista-volume.js";
import { renderSpecializzazione } from "../comune/vista-specializzazione.js";
import { elencoArchivio, renderArchivio } from "../comune/vista-archivio.js";
import { apriConsultabile } from "../comune/vista-programma-consultabile.js";
import { pianoCopiaProgramma, scriviProgrammaCopiato } from "../comune/salva-come-programma.js";
import { seduteLogbook } from "../comune/logbook.js";
import { applicaEsclusioni } from "../comune/esclusioni.js";
import { riempiRischioDaZonaBSicuro } from "../comune/vista-reds.js";
import { riconosciArticolazioni, dichiarazioneDalRegistro } from "../comune/anamnesi-b.js";
import { creaPonteAnamnesi } from "../comune/anamnesi-viva.js";
import { montaCampoAnamnesi } from "../comune/vista-anamnesi.js";
import { annodaGuideVive } from "../comune/guide-vive.js";
import { montaAnagrafica, mostraAnagrafica, anagraficaDalRegistro, versioneDi, voceAnagrafica } from "../comune/anagrafica-b.js";
import { montaQuaderno, mostraQuaderno, quadernoDalRegistro, voceQuaderno, CAMPI_QUADERNO } from "../comune/quaderno-b.js";

/* PASSO 14d — l'esito della dichiarazione sopravvive ai ridisegni: se no,
 * «Salvato alle 15:04» sparirebbe al primo giro di pagina. */
let esitoAnamnesi = null;
let tokenAnamnesi = 0;
/* PASSO 27 — l'anagrafica ricorda cosa è già stato scritto in questa sessione:
 * le versioni avanzano senza dover rileggere il registro a ogni clic. */
const statoAnagrafica = Object.create(null);
const contatoriAnagrafica = Object.create(null);
/* PASSO 29 — il quaderno ricorda i valori scritti in questa sessione. */
const statoQuaderno = Object.create(null);
const contatoriQuaderno = Object.create(null);
/* PASSO 29 — l'ultimo registro letto: il quaderno lo usa per mostrare i testi
 * già scritti senza rileggere il cloud a ogni disegno. */
let registroLetto = [];

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
if (typeof document !== "undefined") caricaFoglioB(document);

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
  if (win) win.__bdScorrimentoApp = Date.now();
  if (doc && doc.querySelector && doc.querySelector(".prog-panel:not([data-progp])")) return;
  if (win && typeof win.scrollTo === "function" && preso.finestra) win.scrollTo(0, preso.finestra);
  const att = doc && doc.querySelector ? doc.querySelector("#programma-attivo") : null;
  if (!att || !att.querySelector) return;
  (preso.elementi || []).forEach((v) => {
    let nodo = null;
    try { nodo = v.percorso ? att.querySelector(v.percorso) : null; } catch (e) { nodo = null; }
    if (nodo) nodo.scrollTop = v.cima;
  });
}

/* Passo 24 — il messaggio che Alice ha chiesto per le progressioni, e quello
 * di sempre (salvato alle...) per le celle. Qui e' provato: la pagina lo mostra
 * nella riga di stato. */
export function testoEsito(richiesta, esito) {
  const r = richiesta || {};
  const v = (esito && esito.voce) || {};
  if (r.campo === "progressione") {
    return "progressione «" + (v.nomeProgressione || r.progressione || "") + "» applicata alle 8 settimane · Annulla per annullare";
  }
  if (r.campo === "progressione-scheda") {
    return "progressione «" + (v.nomeProgressione || r.progressione || "") + "» applicata alle 8 settimane di tutte le righe · Annulla per annullare";
  }
  if (r.campo === "superserie") {
    return "superserie: " + (v.dopoTesto || "gruppo aggiornato") + " · Annulla per rimetterla";
  }
  if (r.campo === "sostituzione-riga") {
    return "esercizio sostituito: «" + nomePulito((v.prima || {}).nome || "") + "» con «" + nomePulito(v.esercizio || "") + "» · Annulla per rimetterlo";
  }
  if (r.campo === "riga") {
    return "riga tolta · Annulla per rimetterla";
  }
  if (r.campo === "applica-scheletro") {
    return (esito && esito.testo) || "scheletro applicato: righe senza carichi \u00b7 Annulla per rimettere com'era";
  }
  if (r.campo === "elimina-scheletro") {
    return (esito && esito.testo) || "scheletro eliminato dalla raccolta";
  }
  if (r.campo === "salva-scheletro") {
    return (esito && esito.testo) || "scheletro salvato";
  }
  return "salvato alle " + oraBreve(new Date().toISOString()) + " · scheda " + v.codice + " · " + doveVoce(v) + ": " + ((v.dopoTesto || v.dopo) || "vuoto") +
    " · peso radice " + kb((esito.peso || {}).radice) + ", scheda " + kb((esito.peso || {}).scheda);
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
  /* Passo 31 — spenti, ma ognuno dice perché: un tasto spento senza motivo
   * è la stessa cosa di un tasto che non funziona. */
  if (btnImportaLb) {
    btnImportaLb.disabled = true;
    btnImportaLb.title = "Il logbook si legge dal cloud: non c'è un backup da importare a mano";
  }
  if (btnDimenticaLb) {
    btnDimenticaLb.disabled = true;
    btnDimenticaLb.title = "Il logbook è in sola lettura: non si cancella da qui";
  }
  const motivoLb = doc.getElementById("lb-fonte");
  if (motivoLb && !String(motivoLb.textContent || "").trim()) {
    motivoLb.textContent = "letto dal cloud · in sola lettura";
  }
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
  let editorCorrente = null;
  /* B.21 — la fotografia di APERTURA delle schede: si prende una volta sola,
   * alla prima lettura riuscita della sessione, e non si rinfresca più.
   * Dopo ogni scrittura la pagina rilegge (sincronizza -> leggi): se la
   * fotografia si aggiornasse, coinciderebbe sempre con lo stato attuale e
   * «Ripristina scheda» non farebbe mai niente. */
  const aperturaSchede = Object.create(null);
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
    /* PASSO 14d — «Patologie o infortuni» vive nel registro: la dichiarazione
     * e' l'ultima voce che nessuno ha annullato. Se il registro non si e' letto,
     * la dichiarazione porta l'errore e la pagina lo DICE. */
    const anamnesiDichiarazione = zona.registroErrore
      ? { presente: false, testo: "", aggiornato: "", versione: 0, voce: null, idVoce: "", errore: zona.registroErrore }
      : dichiarazioneDalRegistro(zona.registro || []);
    if (!rigaStato) rigaStato = creaRigaStato(doc);
    /* Passo 9 — l'editor delle schede: serie e ripetizioni di una settimana,
     * scritte SOLO nella zona B, una alla volta e con il controllo di versione. */
    const schedeGrezze = await leggiZonaB(db, utente.uid, "schede");
    const registroB = await leggiZonaB(db, utente.uid, "registro");
    registroLetto = Array.isArray(registroB) ? registroB : [];
    /* PASSO 17 — i salvataggi tornano dopo il refresh. La memoria di sessione
     * (statoAnagrafica/statoQuaderno) e' vuota a pagina nuova, il registro no:
     * qui si rilegge da li' e si riapplica ai campi. Una scrittura appena fatta
     * resta la piu' nuova e vince; il contatore delle versioni riparte dal
     * registro, cosi' la voce nuova non nasce con una versione gia' usata. */
    try {
      const salvatiAnagrafica = anagraficaDalRegistro(registroLetto);
      Object.keys(salvatiAnagrafica).forEach((campo) => {
        if (!statoAnagrafica[campo]) statoAnagrafica[campo] = salvatiAnagrafica[campo].valore;
        contatoriAnagrafica[campo] = versioneDi(registroLetto, campo);
      });
      mostraAnagrafica(doc, statoAnagrafica);
      const salvatiQuaderno = quadernoDalRegistro(registroLetto);
      Object.keys(salvatiQuaderno).forEach((campo) => {
        const voce = salvatiQuaderno[campo];
        if (!statoQuaderno[campo]) statoQuaderno[campo] = { valore: voce.valore, quando: voce.quando };
        if (voce.versione > (contatoriQuaderno[campo] || 0)) contatoriQuaderno[campo] = voce.versione;
      });
      mostraQuaderno(doc, statoQuaderno);
    } catch (e) { /* se un campo non si riapplica, gli altri restano */ }
    const fotografiaB = await leggiFotografia(db, utente.uid);
    /* B.21 — la fotografia di apertura, presa adesso se manca. Chi c'e' non
     * si tocca: la prima vince, per tutta la sessione. */
    (Array.isArray(schedeGrezze) ? schedeGrezze : []).forEach((d) => {
      const id = String((d && d.id) || "");
      if (!id || aperturaSchede[id] !== undefined) return;
      const dati = (d && d.dati) || {};
      const f = dati.sheet && typeof dati.sheet === "object" ? dati.sheet : null;
      if (!f) return;
      const chiave = Array.isArray(f.exercises) ? "exercises" : (Array.isArray(f.esercizi) ? "esercizi" : "");
      if (!chiave) return;
      aperturaSchede[id] = {
        scheda: String(f.code || f.codice || f.letter || f.id || ""),
        elenco: JSON.parse(JSON.stringify(f[chiave])),
        quando: new Date().toISOString()
      };
    });
    /* Passo 16 — l'impronta dei dati letti: se e' la stessa che sta a schermo
     * non c'e' niente da ridisegnare (ed e' il caso normale di un giro di
     * sessione o di un controllo dopo un salvataggio). */
    const impronta = improntaDati({ programmi: programmi.programmi, schede: schedeGrezze, sedute: sedutePulite.sedute, esclusioni: esclusioni, registro: registroB });
    const improntaPrima = stato.impronta;
    stato.letture += 1;

    /* Niente da ridisegnare: si esce con l'esito della lettura, senza toccare
     * la pagina. (`esito` qui non esiste: prima questa riga lanciava
     * «esito is not defined» a ogni giro in cui i dati erano già a schermo.) */
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
      fotografiaApertura: aperturaSchede,
      ultimaVoce: ultimaAnnullabile(registroB)
    });
    editorCorrente = editor;
    /* Passo 35 — aprire il programma appena creato passa dallo stesso «Attiva»
     * di sempre: una voce di registro, l'Annulla che rimette com'era. */
    globalThis.BD_ATTIVA_PROGRAMMA = (idProgramma) => {
      if (!editor || typeof editor.attivaProgramma !== "function") {
        return Promise.resolve({ ok: false, motivo: "la pagina non ha un editor collegato: non ho scritto niente" });
      }
      return editor.attivaProgramma(String(idProgramma)).then((esito) => {
        if (esito && esito.ok) {
          segnalaModifica(esito.testo || "programma attivo in B", "ok");
          return sincronizza(utenteCorrente, { forza: true, motivo: "programma nuovo aperto" }).then(() => esito);
        }
        segnalaModifica((esito && esito.motivo) || "apertura non riuscita", "errore");
        return esito || { ok: false };
      });
    };

    /* Una cella e' in modifica se il fuoco e' dentro un campo scrivibile, o se
     * c'e' una cella aperta (classe "scrittura") anche quando il fuoco e' sul
     * pulsantino +: li' dentro c'e' una modifica che non e' ancora partita. */
    const cellaInModifica = () => {
      const attivoQui = doc.activeElement;
      /* Passo 16b — mentre si scrive in un campo della testata (descrizione,
       * messaggio, settimane, rotazione…) la pagina non si ridisegna: il
       * ridisegno staccava il campo dal documento, il testo restava a metà e la
       * pagina saltava in basso. La scrittura parte al cambio, il disegno dopo. */
      if (attivoQui && attivoQui.closest && attivoQui.closest("#programma-attivo")) {
        const dentro = attivoQui.closest("[data-pr-c]");
        if (dentro && /^(INPUT|TEXTAREA|SELECT)$/.test(String(attivoQui.tagName || ""))) return true;
      }
      if (attivoQui && attivoQui.getAttribute && attivoQui.getAttribute("contenteditable") === "true") return true;
      const aperte = doc.querySelectorAll("#programma-attivo [contenteditable='true']");
      for (let i = 0; i < aperte.length; i += 1) {
        if (aperte[i].classList && aperte[i].classList.contains("scrittura")) return true;
      }
      return false;
    };
    const rimanda = () => { rinvioAutomatico = true; stato.rimandati += 1; };
    /* Passo 37 — una rilettura a richiesta da fuori (la pagina Scheletri dopo
     * una scrittura): passa dallo stesso sincronizza di sempre. Prima queste
     * chiamate stavano in un punto che sincronizza non lo vedeva. */
    globalThis.BD_RICARICA = (motivo) => sincronizza(utenteCorrente, { forza: true, motivo: String(motivo || "richiesta") });

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
    /* Passo 6c — la carta «Rischio strutturale (RED-S)» della Dashboard legge la
     * scheda attiva dalla zona B già letta qui sopra: nessuna scrittura, nessun
     * tasto. Se non c'è un programma attivo la carta lo dice, non mostra zeri. */
    /* 6c-fix-3: dentro c'è il try/catch — un difetto della carta non deve
     * poter rompere la Dashboard. */
    /* PASSO 14d — il campo «Patologie o infortuni» e il ponte col registro.
     * Salva = UNA voce di registro (dichiarazione-anamnesi); Annulla = una voce
     * che la cita. Dopo ogni scrittura si rilegge: il campo mostra il registro. */
    let ponteAnamnesi = null;
    const disegnaAnamnesi = (st) => montaCampoAnamnesi(doc, st.dichiarazione, {
      onSalva: (t2) => ponteAnamnesi.salva(t2),
      erroreLettura: st.erroreLettura || zona.registroErrore || null,
      esito: st.esito,
      token: st.token,
      scrivendo: st.scrivendo === true
    });
    ponteAnamnesi = creaPonteAnamnesi({
      db: db,
      uid: utente.uid,
      dichiarazione: anamnesiDichiarazione,
      erroreLettura: zona.registroErrore || null,
      esito: esitoAnamnesi,
      token: tokenAnamnesi,
      segnala: segnalaModifica,
      monta: disegnaAnamnesi,
      suStato: (st) => { esitoAnamnesi = st.esito; tokenAnamnesi = st.token; },
      ricarica: () => sincronizza(utente, { forza: true, motivo: "anamnesi" })
    });
    disegnaAnamnesi(ponteAnamnesi.quadro);
    const riconosciute = zona.registroErrore
      ? { articolazioni: [] }
      : riconosciArticolazioni(anamnesiDichiarazione.testo || "");
    riempiRischioDaZonaBSicuro(doc, {
      programmi: programmi.programmi || [],
      sedute: sedutePulite.sedute,
      schedeV2: schedeV2,
      dichiarate: riconosciute.articolazioni
    });
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
    /* Passo 8 — la Pianificazione disegna la rotazione che i logbook dimostrano,
     * non piu' il calendario del mockup. Se il programma non ha un nome, la
     * vista lo dichiara: qui non si inventa niente. */
    const piazzaP = doc.querySelector("#pianificazione-viva");
    if (piazzaP) {
      const progAttivo = attivo && attivo.programma ? attivo.programma : null;
      renderPianificazione(doc, piazzaP, {
        programma: progAttivo ? {
          nome: nomePulito(progAttivo.name || progAttivo.nome || ""),
          esplicito: Boolean(progAttivo.active || String(progAttivo.status || "") === "active"),
          settimana: null
        } : null
      }, riepilogoPianificazione(sedutePulite.sedute, { oggi: new Date(), quante: 8, settimane: 8 }));
    }
    /* La Fase: se il campo del documento ripete il nome del programma, non è
     * una fase. Non lo mostro: il campo resta a «non registrato». La pagina
     * desktop/diagnosi.html (temporanea) dice quali nomi usa davvero il
     * documento; quando li sapremo si collega il campo giusto. */
    if (rp.profilo && rp.profilo.presente && rp.profilo.fase && rp.profilo.fase === rp.profilo.nome) rp.profilo.fase = "";
    /* extra-3 — la linguetta Scheletri legge la raccolta arrivata con la zona B. */
    rp.scheletri = elencoScheletri(zona.scheletri);
    /* Passo 42 — «Salva come nuovo programma»: crea SOLO documenti nuovi, con
     * le funzioni di scritture-b (schede prima, programma dopo). Niente che
     * esista già viene toccato; dopo la scrittura la pagina rilegge. */
    const salvaComeNuovoProgramma = (idProgramma, nome) => {
      const id = String(idProgramma == null ? "" : idProgramma);
      const documento = (programmi.programmi || []).filter((p) => String((p && p.id) || "") === id)[0] || null;
      if (!documento) return Promise.resolve({ ok: false, motivo: "il programma non è più fra quelli letti in B: non ho scritto niente" });
      const piano = pianoCopiaProgramma(documento, schedeGrezze, { nome: nome, quando: new Date() });
      if (!piano.ok) return Promise.resolve(piano);
      return scriviProgrammaCopiato(db, utente.uid, piano).then((esito) => {
        if (esito && esito.ok && typeof globalThis.BD_RICARICA === "function") {
          globalThis.BD_RICARICA("programma copiato");
        }
        return esito;
      });
    };

    /* Passo 41 — «Cambia»: l'elenco dei programmi di B, con lo stato di ognuno.
     * Passo 42 — ogni voce porta il documento vero e le sue schede: da lì si
     * apre la vista di sola lettura («Guarda») e il confronto, senza rileggere
     * niente e senza indovinare l'id. */
    rp.altriProgrammi = (programmi.programmi || []).map((p) => {
      /* lettura dei campi del documento (non testo da disegnare) */
      const stato = String((p && (p.status || p["stato"])) || "").toLowerCase();
      const attivo = Boolean(p && p.active) || stato === "active";
      const cerca = schedePerProgramma(schedeV2, profiloProgramma(p));
      const quante = cerca.gruppo && Array.isArray(cerca.gruppo.schede) ? cerca.gruppo.schede.length : 0;
      return {
        id: String((p && p.id) || ""),
        nome: (p && (p.name || p["nome"])) || "",
        attivo: attivo,
        bozza: stato === "draft",
        archiviato: Boolean(p && p.archivedAt) || stato === "archived",
        dettaglio: quante ? (quante + (quante === 1 ? " scheda" : " schede")) : "",
        programma: p,
        gruppo: cerca.gruppo
      };
    });
    rp.onSalvaCome = salvaComeNuovoProgramma;
    const scorrimentoPrima = prendiScorrimento(doc, win);
    if (contenitore) {
      stato.ridisegni += 1;

    }
    if (contenitore) renderProgramma(doc, contenitore, { presente: Boolean(attivo) }, Object.assign({}, rp, {
      modifica: {
        attivo: true,
        get annullabile() { return editor.annullabile; },
        /* B.21 — i conti per la conferma e lo svuotamento del programma. */
        conta: (idScheda) => editor.conta(idScheda),
        svuotaProgramma: () => {
          modificheInVolo += 1;
          return editor.svuotaProgramma().then((esito) => {
            modificheInVolo -= 1;
            segnalaModifica(esito.ok
              ? "programma svuotato \u00b7 " + esito.quanto.schede + " schede, " + esito.quanto.esercizi + " esercizi, " + esito.quanto.tecniche + " righe tecnica"
              : (esito.motivo || "non ho scritto niente"), esito.ok ? "ok" : "errore");
            return sincronizza(utente, { forza: true, motivo: "igiene" });
          }, (e) => {
            modificheInVolo = Math.max(0, modificheInVolo - 1);
            segnalaModifica("svuotamento non riuscito: " + (e && e.message ? e.message : "errore"), "errore");
            return sincronizza(utente, { forza: true, motivo: "igiene non riuscita" });
          });
        },
        /* B.21 PASSO 2a — «Attiva»: scrive in B e rilegge. La riga di stato
         * dice cosa e' successo, e se l'altro programma ha smesso di esserlo. */
        onAttiva: (idProgramma) => {
          modificheInVolo += 1;
          return editor.attivaProgramma(idProgramma).then((esito) => {
            modificheInVolo -= 1;
            /* PASSO 3d — se il programma non e' fra i documenti di B, il motivo
             * torna alla pagina: li' c'e' il nome, e il conteggio dei programmi. */
            /* EXTRA-4 - il silenzio: se il programma non e' fra i documenti di B
             * la pagina apre il suo riquadro, ma chi chiama da altrove non lo
             * vedrebbe. Il messaggio si scrive comunque, prima di tornare. */
            if (esito && esito.ok === false && esito.nonInB === true) {
              segnalaModifica((esito && esito.motivo) || "il programma non e' fra quelli di B: non ho scritto niente", "errore");
              return esito;
            }
            if (esito && esito.ok) {
              segnalaModifica(esito.gia
                ? esito.testo
                : esito.testo + (esito.altri && esito.altri.length ? " · non e' piu' attivo: «" + esito.altri.join("», «") + "»" : "") + (esito.avvisoRegistro ? " · MA: " + esito.avvisoRegistro : ""), "ok");
            } else {
              segnalaModifica((esito && esito.motivo) || "non ho scritto niente", "errore");
            }
            return sincronizza(utente, { forza: true, motivo: "programma attivo" });
          }, (e) => {
            modificheInVolo = Math.max(0, modificheInVolo - 1);
            segnalaModifica("attivazione non riuscita: " + (e && e.message ? e.message : "errore"), "errore");
            return sincronizza(utente, { forza: true, motivo: "attivazione non riuscita" });
          });
        },
        /* B.21 PASSO 2c \u2014 \u00abMetti in bozza\u00bb: scrive in B e rilegge. La riga di
         * stato dice cosa e' successo, senza promettere cosa fara' il telefono. */
        onBozza: (idProgramma) => {
          modificheInVolo += 1;
          return editor.mettiInBozza(idProgramma).then((esito) => {
            modificheInVolo -= 1;
            /* PASSO 3d — se il programma non e' fra i documenti di B, il motivo
             * torna alla pagina: li' c'e' il nome, e il conteggio dei programmi. */
            /* EXTRA-4 - il silenzio: se il programma non e' fra i documenti di B
             * la pagina apre il suo riquadro, ma chi chiama da altrove non lo
             * vedrebbe. Il messaggio si scrive comunque, prima di tornare. */
            if (esito && esito.ok === false && esito.nonInB === true) {
              segnalaModifica((esito && esito.motivo) || "il programma non e' fra quelli di B: non ho scritto niente", "errore");
              return esito;
            }
            if (esito && esito.ok) {
              segnalaModifica(esito.gia
                ? esito.testo
                : esito.testo + " \u00b7 non e' pi\u00f9 attivo: il telefono non lo vedr\u00e0" + (esito.avvisoRegistro ? " \u00b7 MA: " + esito.avvisoRegistro : ""), "ok");
            } else {
              segnalaModifica((esito && esito.motivo) || "non ho scritto niente", "errore");
            }
            return sincronizza(utente, { forza: true, motivo: "programma in bozza" });
          }, (e) => {
            modificheInVolo = Math.max(0, modificheInVolo - 1);
            segnalaModifica("passaggio in bozza non riuscito: " + (e && e.message ? e.message : "errore"), "errore");
            return sincronizza(utente, { forza: true, motivo: "passaggio in bozza non riuscito" });
          });
        },
        /* 4d: il tasto 4d cerca queste funzioni sull'editor che la pagina riceve qui. */
        proponiScaricoTutte: (richiesta) => editor.proponiScaricoTutte(richiesta),
        applicaScaricoTutte: (richiesta) => {
          modificheInVolo += 1;
          return editor.applicaScaricoTutte(richiesta).then((esito) => {
            modificheInVolo = Math.max(0, modificheInVolo - 1);
            return esito;
          }, (e) => {
            modificheInVolo = Math.max(0, modificheInVolo - 1);
            throw e;
          });
        },
        rilegge: () => sincronizza(utente, { forza: true, motivo: "applica sett./scarico a tutte le schede" }),
        copiaEsercizi: (richiesta) => {
          modificheInVolo += 1;
          return editor.copiaEsercizi(richiesta).then((esito) => {
            modificheInVolo -= 1;
            if (esito && esito.ok) {
              segnalaModifica((esito.testo || "esercizi copiati") + (esito.avvisoRegistro ? " · MA: " + esito.avvisoRegistro : ""), "ok");
            } else {
              segnalaModifica((esito && esito.motivo) || "non ho scritto niente", "errore");
            }
            return sincronizza(utente, { forza: true, motivo: "copia esercizi" });
          }, (e) => {
            modificheInVolo = Math.max(0, modificheInVolo - 1);
            segnalaModifica("copia non riuscita: " + (e && e.message ? e.message : "errore"), "errore");
            return sincronizza(utente, { forza: true, motivo: "copia non riuscita" });
          });
        },
        onAnnulla: () => {
          editor.annulla().then((esito) => {
            segnalaModifica(esito.ok
              ? "annullato \u00b7 " + ((esito.voce && esito.voce.campo === "programma") ? "programma attivo rimesso com'era" : doveVoce(esito.voce)) + (esito.voce && ["serie", "ripetizioni", "recupero", "tempo"].indexOf(String(esito.voce.campo || "")) !== -1 ? " torna a " + String(esito.voce.dopo == null ? "vuoto" : esito.voce.dopo) : "")
              : (esito.motivo || "non c'e' niente da annullare"), esito.ok ? "ok" : "errore");
            return sincronizza(utente, { forza: true, motivo: "annulla" });
          }, (e) => {
            segnalaModifica("annullamento non riuscito: " + (e && e.message ? e.message : "errore"), "errore");
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
              // Passo 29: una cella salvata riattiva Annulla senza ridisegnare.
              const annullaB = doc.querySelector("#programma-attivo button.pg-undo");
              if (annullaB && richiesta && ["serie", "ripetizioni", "recupero", "tempo"].indexOf(richiesta.campo) !== -1) annullaB.disabled = !editor.annullabile;
              /* Passo 24 — il messaggio di Alice, con l'avviso del registro
               * se la voce non e' passata (il salvataggio resta valido). */
              segnalaModifica(testoEsito(richiesta, esito) + (esito.avvisoRegistro ? " · MA: " + esito.avvisoRegistro : ""), "ok");
            } else {
              segnalaModifica(esito.motivo || "non ho scritto niente", "errore");
              /* Passo 16/24 — una scrittura non riuscita puo' voler dire che il
               * dato a schermo non e' piu' quello del disco: qui si rilegge
               * DAVVERO (prima il commento lo diceva e il codice tornava senza
               * rileggere: cosi' il rifiuto per versione taceva in eterno). */
              return sincronizza(utente, { forza: true, motivo: "scrittura rifiutata" })
                .then(() => {
                  const programma = doc.querySelector("#programma-attivo");
                  if (rigaStato && programma && programma.parentNode) {
                    programma.parentNode.insertBefore(rigaStato, programma);
                    segnalaModifica(esito.motivo || "non ho scritto niente", "errore");
                    if (typeof rigaStato.scrollIntoView === "function") rigaStato.scrollIntoView({ block: "start" });
                  }
                  return { ok: false, motivo: esito.motivo || "non ho scritto niente" };
                });
            }
            /* Passo 16 — il dato appena scritto e' gia' nella cella: non si
             * rilegge e non si ridisegna da zero. Se un controllo era stato
             * rimandato perche' si stava scrivendo, ora si puo' fare: l'impronta
             * (struttura) dira' se c'e' davvero qualcosa di nuovo. */
            if (rinvioAutomatico) { rinvioAutomatico = false; return sincronizza(utente, { motivo: "controllo rimandato" }); }
            /* Passo 20 — le otto settimane le ha calcolate B, non la cella:
             * senza rileggere, a schermo non cambierebbe niente. */
            if (chiedeRilettura(richiesta)) {
              return sincronizza(utente, { forza: true, motivo: "progressione" });
            }
            return Object.assign({ ridisegnato: false }, esito);
          }, (e) => {
            /* Passo 24 — un rifiuto non puo' piu' bloccare la pagina: si
             * scende di uno, si dice la causa e si rilegge, cosi' la versione
             * a schermo torna quella del disco e i tasti riprendono a valere. */
            modificheInVolo = Math.max(0, modificheInVolo - 1);
            segnalaModifica("scrittura non riuscita: " + (e && e.message ? e.message : "errore"), "errore");
            return sincronizza(utente, { forza: true, motivo: "scrittura fallita" })
              .then(() => ({ ok: false, motivo: e && e.message ? e.message : "errore" }));
          });
        }
      }
    }));

    /* PASSO 4a — i campi vivi della testata: scarico (settimana e
     * percentuale), test, data di inizio, fase. I valori si leggono dai
     * documenti appena letti: dopo ogni scrittura la pagina rilegge e li
     * rimette a schermo, anche dopo un Annulla. */
    /* PASSO 4a — i campi vivi della testata: scarico (settimana e
     * percentuale), test, data di inizio, fase. I piani si raccolgono con la
     * funzione che usano anche i test: scrittura e lettura passano dalle
     * stesse chiavi, altrimenti il valore scritto sparisce dal campo. */
    /* 4d \u2014 il tasto \u00abApplica a tutte le schede\u00bb scrive fuori da onCambia:
     * dopo la scrittura la pagina deve rileggere, o la colonna dello scarico
     * resta quella di prima. */
    if (editor && typeof editor === "object") editor.rilegge = () => sincronizza(utente, { forza: true, motivo: "applica sett./scarico a tutte le schede" });
    const pianiSchede = pianiDalleSchede(schedeGrezze);
    collegaPiano(doc, {
      editor: editor,
      piani: pianiSchede,
      programma: {
        /* Passo 15b — l'id del DOCUMENTO, non quello del meta: la scrittura
         * della testata cerca il documento in B e con «prg-…» non lo trovava. */
        id: attivo && attivo.programma ? String(attivo.programma.docId || attivo.programma.id || "") : "",
        inizio: rp.profilo.inizio,
        fase: nomePulito(rp.profilo.fase),
        /* Punto 15 — anche giorni, settimane e rotazione si scrivono dalla
         * stessa testata: i valori salvati arrivano qui, e il campo vuoto
         * vuol dire «non registrato», non zero. */
        giorni: rp.profilo.giorni,
        settimane: rp.profilo.durata,
        rotazione: rp.rotazione && rp.rotazione.fonte === "campo del programma"
          ? rp.rotazione.codici.join(" ")
          : "",
        /* Passo 16 — i due testi liberi, perché dopo il salvataggio la pagina
         * ridisegna e i campi devono ritrovare quello che è stato scritto. */
        descrizione: nomePulito(rp.profilo.descrizione),
        messaggio: nomePulito(rp.profilo.messaggio)
      },
      segnala: segnalaModifica,
      sincronizza: () => sincronizza(utente, { forza: true, motivo: "piano della scheda" })
    });

    if (nomeVoce) nomeVoce.textContent = attivo ? nomePulito(rp.profilo.nome) : "nessun programma letto";
    if (strumenti) strumenti.hidden = true;
    /* L'Archivio (passo 3b): la tabella del v31 con i programmi veri.
     * Passo 42 — «Guarda» apre il programma in sola lettura; il confronto è
     * sempre con il programma in uso, che qui è quello aperto in Programmi. */
    const corpoArchivio = doc.getElementById("archivio-corpo");
    if (corpoArchivio) {
      const gruppoInUso = attivo && attivo.programma
        ? schedePerProgramma(schedeV2, profiloProgramma(attivo.programma)).gruppo : null;
      renderArchivio(doc, corpoArchivio, {
        righe: elencoArchivio(programmi.programmi || [], { attivoId: attivo ? String(attivo.programma.id || "") : "", schedeV2 }),
        apri: (riga) => apriConsultabile(doc, {
          programma: riga.programma,
          gruppo: riga.gruppo,
          attivo: attivo && attivo.programma
            ? { programma: attivo.programma, gruppo: gruppoInUso } : null,
          nomeInUso: rp.profilo ? nomePulito(rp.profilo.nome) : "",
          bottone: null,
          onSalvaCome: salvaComeNuovoProgramma
        })
      });
    }
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
    /* B.14f: il volume è solo quello programmato (le schede). */
    renderVolume(doc, doc.querySelector("#rv-vivo"), rp.schede, { quante: 8 });
    /* B.14k: la Specializzazione conta dal programma attivo, stessa regola del Riepilogo volume. */
    renderSpecializzazione(doc, doc.querySelector("#sp-corpo"), rp.schede, { quante: 8 });
    notaLogbook(doc, lb);
    rimettiScorrimento(doc, win, scorrimentoPrima);
    return { ridisegnato: true };
  };

  /* Passo 16 — onAuthStateChanged torna anche quando l'SDK rinnova il token,
   * con lo stesso utente: quel giro non e' un motivo per rileggere e
   * ridisegnare. Il primo (o un cambio di account) legge; i successivi passano
   * dal controllo d'impronta, che con i dati uguali non tocca la pagina. */
  doc.addEventListener("focusout", (evento) => {
    /* Spostarsi da un campo all'altro della stessa carta non è «ho finito»:
     * senza questa riga ogni passaggio faceva rileggere e ridisegnare tutto, e
     * il testo appena scritto spariva. */
    const verso = evento && evento.relatedTarget;
    if (verso && verso.closest && verso.closest("#programma-attivo")) return;
    if (!rinvioAutomatico || modificheInVolo > 0 || sincronizzazione !== null) return;
    rinvioAutomatico = false;
    setTimeout(() => {
      if (typeof sincronizzaEsterno === "function" && utenteCorrente) sincronizzaEsterno(utenteCorrente);
    }, 0);
  }, true);
  /* ---------- Passo 23 — il ripristino mirato (?ripristina=) ------------- */
  const ripristina = new URLSearchParams(win.location.search).get("ripristina");
  let ripristinoGiaperto = false;

  function descrizioneVoce(v) {
    const t = String(v.tipo || "");
    const nome = nomePulito(v.esercizio || "");
    if (t === "modifica-progressione") return "progressione «" + (v.nomeProgressione || v.progressione || "") + "» su " + nome;
    if (t === "modifica-progressione-scheda") return "progressione «" + (v.nomeProgressione || "") + "» su " + ((v.righe || []).length) + " righe";
    if (t === "cancella-riga") return "riga tolta: " + nome;
    if (t === "sostituzione-riga") return "sostituzione: " + nome;
    if (t === "superserie") return "superserie: " + nome;
    if (t === "modifica-serie-ripetizioni") return "S" + (v.settimana || "?") + " " + String(v.campo || "") + " di " + nome;
    if (t === "modifica-rec-tut") return (v.campo === "recupero" ? "Rec" : "TUT") + " di " + nome;
    return t || "voce";
  }

  async function apriRipristino(idCercata) {
    if (!utenteCorrente || !editorCorrente) return;
    let registro = [];
    try { registro = await leggiZonaB(db, utenteCorrente.uid, "registro"); } catch (e) { registro = []; }
    const tutte = (Array.isArray(registro) ? registro : [])
      .filter((d) => d && d.dati && TIPI_RIPRISTINABILI.indexOf(String(d.dati.tipo || "")) !== -1)
      .map((d) => Object.assign({}, d.dati, { idVoce: String(d.dati.idVoce || d.id || "") }));
    const rifatte = {};
    (Array.isArray(registro) ? registro : []).forEach((d) => {
      if (d && d.dati && d.dati.annullaDi) rifatte[String(d.dati.annullaDi)] = true;
    });
    const voci = tutte
      .filter((v) => !rifatte[v.idVoce] && (!idCercata || v.idVoce === idCercata))
      .sort((a, b) => String(b.quando || "").localeCompare(String(a.quando || "")));
    const vecchio = doc.getElementById("pannello-ripristino");
    if (vecchio) vecchio.remove();
    const velo = doc.createElement("div");
    velo.id = "pannello-ripristino";
    velo.setAttribute("style", "position:fixed;inset:0;z-index:99991;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55)");
    const carta = doc.createElement("div");
    carta.setAttribute("style", "background:var(--card,#181822);border:1px solid var(--line,#2a2a38);border-radius:18px;padding:22px 24px;max-width:540px;max-height:70vh;overflow:auto;color:var(--text,#eee);font-size:13px;line-height:1.5");
    const t1 = doc.createElement("div");
    t1.setAttribute("style", "font-size:16px;font-weight:800;margin-bottom:4px");
    t1.textContent = "Ripristino dai valori di prima";
    const t2 = doc.createElement("div");
    t2.setAttribute("style", "opacity:.65;margin-bottom:14px");
    t2.textContent = idCercata
      ? "voce " + idCercata + ": i valori tornano quelli di prima, con una voce nuova nel registro (versione +1). Niente si cancella."
      : "le voci di registro ancora annullabili, dalla più recente: il ripristino riscrive i valori di prima con una voce nuova (versione +1). Niente si cancella.";
    carta.appendChild(t1);
    carta.appendChild(t2);
    if (!voci.length) {
      const vuoto = doc.createElement("div");
      vuoto.setAttribute("style", "opacity:.75");
      vuoto.textContent = idCercata
        ? "nel registro non c'e' nessuna voce ancora annullabile con l'id " + idCercata + "."
        : "nel registro non c'e' nessuna voce ancora annullabile.";
      carta.appendChild(vuoto);
    }
    voci.forEach((v) => {
      const riga = doc.createElement("div");
      riga.setAttribute("style", "border-top:1px solid var(--line,#2a2a38);padding:10px 0");
      const q = doc.createElement("div");
      q.textContent = String(v.quando || "senza data").replace("T", " ").replace(/..*/, "") + " · " + descrizioneVoce(v);
      riga.appendChild(q);
      const idv = doc.createElement("div");
      idv.setAttribute("style", "opacity:.55;font-size:11px;margin:2px 0 8px");
      idv.textContent = v.idVoce;
      riga.appendChild(idv);
      const bottone = doc.createElement("button");
      bottone.type = "button";
      bottone.textContent = "Ripristina i valori di prima";
      bottone.setAttribute("style", "font:700 13px/1 inherit;font-family:inherit;color:var(--text,#eee);background:var(--card-2,#20202c);border:1px solid var(--lav,#8b8bf5);border-radius:10px;padding:9px 14px;cursor:pointer");
      bottone.addEventListener("click", () => {
        bottone.disabled = true;
        bottone.textContent = "scrittura in corso…";
        editorCorrente.annullaVoce(v.idVoce).then((esito) => {
          if (esito.ok) {
            segnalaModifica("ripristinato · " + descrizioneVoce(esito.voce || v) + " torna ai valori di prima" + (esito.avvisoRegistro ? " · MA: " + esito.avvisoRegistro : ""), "ok");
            velo.remove();
            if (typeof sincronizzaEsterno === "function") sincronizzaEsterno(utenteCorrente, { forza: true, motivo: "ripristino" });
          } else {
            bottone.disabled = false;
            bottone.textContent = "Ripristina i valori di prima";
            const why = doc.createElement("div");
            why.setAttribute("style", "color:var(--pink,#f06292);margin-top:6px");
            why.textContent = esito.motivo || "non ho scritto niente";
            riga.appendChild(why);
          }
        }).catch((e) => {
          bottone.disabled = false;
          bottone.textContent = "Ripristina i valori di prima";
          const why = doc.createElement("div");
          why.setAttribute("style", "color:var(--pink,#f06292);margin-top:6px");
          why.textContent = "ripristino non riuscito: " + (e && e.message ? e.message : "errore");
          riga.appendChild(why);
        });
      });
      riga.appendChild(bottone);
      carta.appendChild(riga);
    });
    const chiudiB = doc.createElement("button");
    chiudiB.type = "button";
    chiudiB.textContent = "Chiudi";
    chiudiB.setAttribute("style", "margin-top:14px;font:700 13px/1 inherit;font-family:inherit;color:var(--text,#eee);background:transparent;border:1px solid var(--line,#2a2a38);border-radius:10px;padding:9px 14px;cursor:pointer");
    chiudiB.addEventListener("click", () => velo.remove());
    carta.appendChild(chiudiB);
    velo.appendChild(carta);
    doc.body.appendChild(velo);
  }

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
    /* Passo 25 — Impostazioni deve dire lo stato vero: chi sei entrata e
     * quando la lettura è riuscita. La riga del v31 diceva «non collegato»
     * proprio sulla parte che funziona. */
    try {
      const riga = doc.getElementById("st-sync-firebase");
      if (riga) riga.textContent = "collegato · " + String(utente.email || utente.uid || "");
      const tastoVerifica = doc.getElementById("st-verifica");
      if (tastoVerifica && tastoVerifica.dataset.vivo !== "1") {
        tastoVerifica.dataset.vivo = "1";
        tastoVerifica.addEventListener("click", () => {
          const r = doc.getElementById("st-sync-firebase");
          if (r) r.textContent = "collegato · " + String(utente.email || utente.uid || "") + " · lettura " + new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
          const n = doc.getElementById("st-sync-net");
          if (n) n.textContent = navigator.onLine ? "online" : "offline";
          tastoVerifica.textContent = "verificato";
          setTimeout(() => { tastoVerifica.textContent = "Verifica connessione"; }, 2000);
        }, true);
      }
    } catch (e) { /* se la pagina non ha Impostazioni non è un errore */ }
    /* Passo 26/30 — l'anagrafica si scrive: la scrittura vive qui (db + uid),
     * il montaggio dei tasti sta fuori, a caricamento pagina, così i tasti
     * rispondono anche se questa callback non è ancora passata. */
    globalThis.BD_SALVA_ANAGRAFICA = async (campo, valore, prima) => {
      const esito = voceAnagrafica({ campo, prima, dopo: valore, versionePrima: contatoriAnagrafica[campo] || 0 });
      if (!esito.ok) throw new Error(esito.motivo || "valore non valido");
      const quando = String(esito.voce.quando).replace(/[^0-9]/g, "").slice(0, 17);
      const id = "mod-" + quando + "-" + campo + "-v" + esito.voce.versioneDopo;
      await scriviVoceRegistro(db, utente.uid, id, senzaUndefined(esito.voce));
      contatoriAnagrafica[campo] = esito.voce.versioneDopo;
      statoAnagrafica[campo] = valore;
      return true;
    };
    /* Passo 34 — la pagina Scheletri legge e scrive la sua raccolta: db e uid
     * vivono qui, la pagina chiede e basta. La scrittura passa dalla stessa
     * strada della scheda (salvaScheletroDalCostruttore → scritture-b). */
    /* La pagina riceve i documenti interi: le serve il dettaglio (schede ed
     * esercizi) oltre ai conteggi, e così non si legge due volte. */
    globalThis.BD_LEGGI_SCHELETRI = async () => leggiScheletriB(db, utente.uid);
    globalThis.BD_SALVA_SCHELETRO = (documento, opzioni) => salvaScheletroCostruito(documento, { db, uid: utente.uid, id: opzioni && opzioni.id }).then((esito) => {
      /* Il salvataggio cambia la raccolta: la pagina Programmi la rilegge, così
       * il suo elenco non resta indietro (era il caso dello scheletro «che non
       * compare in Programma 1»). */
      if (esito && esito.ok && typeof globalThis.BD_RICARICA === "function") globalThis.BD_RICARICA("scheletro salvato");
      return esito;
    });
    /* Rinominare uno scheletro: si rilegge, si cambia il nome, si riscrive.
     * Passa da scritture-b come tutto il resto. */
    globalThis.BD_RINOMINA_SCHELETRO = async (id, nome) => {
      const idSk = String(id == null ? "" : id);
      const nuovo = String(nome == null ? "" : nome).trim();
      if (!idSk) return { ok: false, motivo: "manca lo scheletro da rinominare" };
      if (!nuovo) return { ok: false, motivo: "il nome non può restare vuoto" };
      const letto = await leggiScheletroB(db, utente.uid, idSk);
      if (!letto || !letto.esiste) return { ok: false, motivo: "lo scheletro non è più nella raccolta" };
      const dati = Object.assign({}, letto.dati || {}, { nome: nuovo, aggiornatoIl: new Date().toISOString() });
      await salvaScheletroConVersione(db, utente.uid, idSk, dati);
      if (typeof globalThis.BD_RICARICA === "function") globalThis.BD_RICARICA("scheletro rinominato");
      return { ok: true, id: idSk, nome: nuovo };
    };
    globalThis.BD_ELIMINA_SCHELETRO = async (id) => {
      const idSk = String(id == null ? "" : id);
      if (!idSk) return { ok: false, motivo: "manca lo scheletro da eliminare" };
      await eliminaScheletroB(db, utente.uid, idSk);
      if (typeof globalThis.BD_RICARICA === "function") globalThis.BD_RICARICA("scheletro eliminato");
      return { ok: true, id: idSk };
    };
    /* Passo 35 — da uno scheletro nasce un programma NUOVO, in bozza: qui si
     * costruiscono e si scrivono solo documenti nuovi, niente che esista già. */
    globalThis.BD_CREA_PROGRAMMA = (scheletro, richiesta) => {
      const r = richiesta || {};
      /* Il nome che scrive lei diventa il nome del programma: si legge con le
       * parentesi perché è un valore da salvare, non un testo da disegnare. */
      const piano = programmaDaScheletro(scheletro, { nome: r["nome"], descrizione: r["descrizione"], quando: new Date() });
      if (!piano.ok) return Promise.resolve(piano);
      return scriviProgrammaNuovo(db, utente.uid, piano).then((esito) => {
        /* Il programma nuovo deve comparire subito in «Cambia» e in Programmi:
         * senza questa rilettura la pagina restava con l'elenco di prima. */
        if (esito && esito.ok && typeof globalThis.BD_RICARICA === "function") globalThis.BD_RICARICA("programma nuovo");
        return esito;
      });
    };
    if (globalThis.BD_SCHELETRI_PAGINA && typeof globalThis.BD_SCHELETRI_PAGINA.ricarica === "function") {
      globalThis.BD_SCHELETRI_PAGINA.ricarica();
    }

    /* Passo 29 — il quaderno: gli altri campi dell'anamnesi si scrivono, una
     * voce di registro per campo. «Patologie o infortuni» resta al suo modulo,
     * che da lì ricava le articolazioni. */
    try {
      const montati = montaQuaderno(doc, {
        stato: Object.assign(quadernoDalRegistro(registroLetto), statoQuaderno),
        onSalva: async (campo, dopo, prima) => {
          const esito = voceQuaderno({ campo, prima, dopo, versionePrima: contatoriQuaderno[campo] || 0 });
          if (!esito.ok) throw new Error(esito.motivo || "testo non valido");
          const quando = String(esito.voce.quando).replace(/[^0-9]/g, "").slice(0, 17);
          const id = "mod-" + quando + "-" + campo + "-v" + esito.voce.versioneDopo;
          await scriviVoceRegistro(db, utente.uid, id, senzaUndefined(esito.voce));
          contatoriQuaderno[campo] = esito.voce.versioneDopo;
          statoQuaderno[campo] = { valore: dopo, quando: esito.voce.quando };
          return true;
        }
      });
      if (montati.length) stato.quaderno = montati.length;
    } catch (e) { /* il quaderno resta com'è */ }
    if (uidLetto === utente.uid) {
      if (typeof sincronizzaEsterno === "function") sincronizzaEsterno(utente);
      return;
    }
    uidLetto = utente.uid;
    leggi(utente).catch((e) => {
      carta.velo.style.display = "flex";
      carta.segnala("lettura non riuscita: " + (e && e.code ? e.code : (e && e.message ? e.message : "errore sconosciuto")));
    }).then(() => {
      /* Passo 23 — ?ripristina=<id voce> (o senza id, per l'elenco). */
      if (ripristina === null || ripristinoGiaperto) return;
      ripristinoGiaperto = true;
      const idCercata = ripristina === "" || ripristina === "1" || ripristina === "elenco" ? "" : ripristina;
      apriRipristino(idCercata).catch((e) => {
        if (typeof console !== "undefined") console.warn("ripristino: ", e);
      });
    });
  });
}

const TIPI_RIPRISTINABILI = ["modifica-serie-ripetizioni", "modifica-rec-tut", "modifica-progressione", "modifica-progressione-scheda", "cancella-riga", "sostituzione-riga", "superserie"];

if (typeof document !== "undefined" && typeof window !== "undefined") {
  avvia(document, window).catch((e) => { if (typeof console !== "undefined") console.warn("avvio: ", e); });
}

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
  if (tipo === "sostituzione-riga") return "sostituzione: «" + nomePulito((v.prima || {}).nome || "") + "» con «" + nomePulito(v.esercizio || "") + "»";
  if (tipo === "annulla-modifica") {
    if (v.campo === "riga") return "la riga «" + nomePulito(v.esercizio || "") + "» rimessa";
    if (v.campo === "progressione") return "progressione di " + nomePulito(v.esercizio || "") + " riportata indietro";
    if (v.campo === "progressione-scheda") return "progressione di scheda riportata indietro";
    if (v.campo === "superserie") return "superserie rimessa come prima";
  }
  if (v.settimana) return "S" + v.settimana + " " + v.campo;
  const nome = v.campo === "recupero" ? "rec" : "TUT";
  return v.esercizio ? nome + " di " + nomePulito(v.esercizio) : nome;
}

/* Le guide che nel v31 non facevano niente (passo 19): il tasto apre un
 * riquadro con la spiegazione. Il modulo sta in comune/guide-vive.js, cosi'
 * le prove lo possono far girare senza caricare tutta la pagina. */
if (typeof document !== "undefined") {
  const attacca = () => annodaGuideVive(document);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", attacca);
  else attacca();
}

/* ---- I tasti che sembrano cliccabili e non lo sono (passo 21) -------------
 * Due casi trovati cliccando la pagina vera nel browser:
 *  - «Apri analisi completa →» in Dashboard: aveva `data-vai="volume"`, ma
 *    nessuna voce del menu si chiama `volume` (la pagina è `riepilogo-volume`),
 *    quindi il gestore esistente non trovava niente e il tocco cadeva nel vuoto.
 *    Ora la pagina è quella giusta e il gestore del v31 la apre.
 *  - la data di una seduta nel Logbook dell'Overview: un tasto che non portava
 *    da nessuna parte. Ora porta all'Archivio, dove le sedute stanno davvero.
 * La coppia «Pesate / Mesi» di Monitor peso invece non è stata collegata: la
 * vista per mese non esiste, quindi è stata tolta dalla pagina. */
if (typeof document !== "undefined") {
  document.addEventListener("click", (ev) => {
    const data = ev.target && ev.target.closest ? ev.target.closest(".lb-link[data-lb]") : null;
    if (!data) return;
    const voce = document.querySelector('.voce[data-vista="archivio"]');
    if (voce) voce.click();
  });
}

/* ---- «Compila / Modifica» dell'anamnesi (passo 25) -----------------------
 * Il tasto in cima alla pagina era muto: il riquadro giallo mandava a lui,
 * mentre l'editor vero sta sulla riga «Patologie o infortuni». Ora il tasto
 * porta il fuoco su quella riga e apre l'editor, come farebbe un dito. */
if (typeof document !== "undefined") {
  const aggancia = () => {
    const tasto = document.getElementById("dc-compila");
    if (!tasto || tasto.dataset.vivo === "1") return;
    tasto.dataset.vivo = "1";
    tasto.type = "button";
    tasto.addEventListener("click", () => {
      const riga = document.querySelector('[data-anamnesi="campo"]');
      const modifica = document.querySelector('[data-anamnesi="modifica"]');
      if (modifica) {
        /* il tasto vero è quello della riga Patologie: lo premo io per te */
        if (riga) riga.scrollIntoView({ block: "center" });
        modifica.click();
        return;
      }
      if (riga) {
        riga.scrollIntoView({ block: "center" });
        const avviso = document.getElementById("dc-avviso");
        if (avviso) avviso.textContent = "L'editor dell'anamnesi si accende quando la pagina ha letto i tuoi dati: qui non c'è ancora niente da modificare.";
        return;
      }
      const avviso = document.getElementById("dc-avviso");
      if (avviso) avviso.textContent = "L'editor dell'anamnesi si accende quando la pagina ha letto i tuoi dati: qui non c'è ancora niente da modificare.";
    });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", aggancia);
  else aggancia();
}

/* ---- I due «Apri» della Dashboard anche da tastiera (passo 28) -----------
 * Il gestore del v31 risponde solo al clic. Con role="button" e tabindex, chi
 * naviga da tastiera deve poterli premere con Invio o spazio: stessa strada. */
if (typeof document !== "undefined") {
  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "Enter" && ev.key !== " ") return;
    const t = ev.target && ev.target.closest ? ev.target.closest("[data-vai][role='button']") : null;
    if (!t) return;
    ev.preventDefault();
    const voce = document.querySelector('.voce[data-vista="' + t.dataset.vai + '"]');
    if (voce) voce.click();
  });
}

/* ---- Anagrafica e quaderno: i tasti rispondono appena la pagina è pronta ----
 * Prima il montaggio stava dentro la callback dell'accesso: se quella non
 * arrivava (o arrivava dopo), i tasti restavano muti e nessuno lo diceva.
 * Ora si attaccano al caricamento; la scrittura arriva dopo, quando c'è. */
if (typeof document !== "undefined") {
  const collegaTutto = () => {
    montaAnagrafica(document, {
      stato: statoAnagrafica,
      onCambia: (campo, valore, prima) => {
        if (typeof globalThis.BD_SALVA_ANAGRAFICA !== "function") {
          return Promise.reject(new Error("non sei ancora collegata: entra con Google e riprova"));
        }
        return globalThis.BD_SALVA_ANAGRAFICA(campo, valore, prima);
      }
    });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", collegaTutto);
  else collegaTutto();
}

/* Passo 34 — la pagina Scheletri: le linguette e «Miei scheletri» si montano al
 * caricamento; lettura e scrittura arrivano dopo l'accesso, come l'anagrafica. */
if (typeof document !== "undefined") {
  const collegaScheletri = () => {
    const pagina = montaPaginaScheletri(document, {
      costruttore: () => (typeof globalThis.BD_COSTRUTTORE_SCHELETRI === "function" ? globalThis.BD_COSTRUTTORE_SCHELETRI() : { schede: [] }),
      leggi: () => (typeof globalThis.BD_LEGGI_SCHELETRI === "function" ? globalThis.BD_LEGGI_SCHELETRI() : Promise.reject(new Error("entra con Google per vedere la raccolta"))),
      salva: (documento, opzioni) => {
        if (typeof globalThis.BD_SALVA_SCHELETRO !== "function") {
          return Promise.reject(new Error("entra con Google e riprova"));
        }
        /* con un id, lo scheletro esistente si aggiorna invece di crearne uno nuovo */
        return globalThis.BD_SALVA_SCHELETRO(documento, opzioni);
      },
      /* La scrittura e la rilettura vivono nell'app (db, uid, sincronizza):
       * qui si passa solo la richiesta. */
      rinomina: (scheletro, nuovoNome) => {
        if (typeof globalThis.BD_RINOMINA_SCHELETRO !== "function") {
          return Promise.reject(new Error("entra con Google e riprova"));
        }
        return globalThis.BD_RINOMINA_SCHELETRO(scheletro.id, nuovoNome);
      },
      elimina: (scheletro) => {
        if (typeof globalThis.BD_ELIMINA_SCHELETRO !== "function") {
          return Promise.reject(new Error("entra con Google e riprova"));
        }
        return globalThis.BD_ELIMINA_SCHELETRO(scheletro.id);
      },
      modifica: (scheletro) => {
        if (typeof globalThis.BD_CARICA_SCHELETRO !== "function") {
          throw new Error("il costruttore non è ancora pronto: ricarica la pagina");
        }
        return globalThis.BD_CARICA_SCHELETRO(Object.assign({ id: scheletro.id }, scheletro.dati || {}));
      },
      creaProgramma: (documento, richiesta) => {
        if (typeof globalThis.BD_CREA_PROGRAMMA !== "function") {
          return Promise.reject(new Error("entra con Google e riprova"));
        }
        return globalThis.BD_CREA_PROGRAMMA(documento, richiesta);
      },
      /* Passo 41 — l'apertura del programma nuovo è collegata: da adesso c'è
       * «Cambia» in Programmi, quindi si può sempre tornare a quello di prima. */
      apriProgramma: (id) => {
        if (typeof globalThis.BD_ATTIVA_PROGRAMMA !== "function") {
          return Promise.reject(new Error("la pagina non ha ancora il programma sotto mano"));
        }
        return globalThis.BD_ATTIVA_PROGRAMMA(id);
      },
      nomeAttivo: () => {
        const n = document.getElementById("nomeProgrammaAttivo");
        return n ? String(n.textContent || "").trim() : "";
      },
      nonCollegata: "Non sei ancora collegata: entra con Google e la raccolta si legge."
    });
    if (pagina) globalThis.BD_SCHELETRI_PAGINA = pagina;
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", collegaScheletri);
  else collegaScheletri();
}
