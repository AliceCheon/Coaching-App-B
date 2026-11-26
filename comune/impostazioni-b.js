/* Barbell Diva B — Impostazioni: le tre voci del vecchio salvataggio locale
 * (passo 19).
 *
 * Nella pagina Impostazioni c'erano tre residui di quando l'app non salvava in
 * B e teneva le modifiche nel browser:
 *   - «Modifiche in coda» (contatore): un numero del vecchio elenco locale, che
 *     su questa pagina non voleva dire più niente;
 *   - «Esporta modifiche»: scaricava quel vecchio elenco, vuoto;
 *   - «Azzera modifiche locali»: svuotava quel vecchio elenco (e sulle pagine
 *     vecchie anche i testi della scheda).
 * La regola di casa è: i tasti non si cancellano, si spiegano e si costruiscono.
 * Quindi, ora:
 *   - il contatore dice la VERITÀ: zero con la nota che le modifiche vanno
 *     dirette in B, oppure il numero vero se in locale è rimasto qualcosa;
 *   - l'esportazione è vera: scarica il REGISTRO delle modifiche letto da B
 *     (tipo, campo, prima/dopo, versione, data), dalla più vecchia;
 *   - l'azzeramento dichiara cosa toglierebbe PRIMA di farlo e chiede
 *     conferma. Non tocca i dati in B e non tocca la sessione d'accesso:
 *     quella si chiude da «Esci da questo dispositivo».
 *
 * Solo letture e memoria locale del browser: nessuna scrittura su Firestore,
 * nessun verbo di scrittura (la guardia 47 vale anche qui).
 */

/* Le chiavi del vecchio salvataggio locale: sono di un'altra app (il v31) e
 * non hanno il prefisso di B. Servono solo per riconoscerle e toglierle. */
export const CHIAVE_CODA_VECCHIA = "bd.edit.v27";
export const CHIAVE_SALVATAGGIO_VECCHIO = "bd.saved";

export const NOME_FILE_BASE = "Modifiche Barbell Diva B";

function testo(valore) {
  return valore == null ? "" : String(valore).trim();
}

/* PASSO 17/19 — le voci arrivano dalla lettura come `{ id, dati }`, ma alcune
 * funzioni le costruiscono piatte: si accettano le due forme. */
function datiDi(voce) {
  if (!voce || typeof voce !== "object") return null;
  const dati = voce.dati && typeof voce.dati === "object" ? voce.dati : voce;
  return dati && typeof dati === "object" ? dati : null;
}

/* Il registro in ordine di data, dal più vecchio. L'ordine non è garantito
 * dall'elenco: si sceglie per `quando`, e a parità resta l'ordine di lettura. */
function vociInOrdine(registro) {
  const voci = [];
  (Array.isArray(registro) ? registro : []).forEach((voce, posizione) => {
    const dati = datiDi(voce);
    if (!dati) return;
    const quando = testo(dati.quando);
    if (!quando) return;
    voci.push({ dati: dati, quando: quando, posizione: posizione });
  });
  voci.sort((a, b) => (a.quando === b.quando ? a.posizione - b.posizione : (a.quando < b.quando ? -1 : 1)));
  return voci;
}

/* Un valore del registro, leggibile in un file: gli oggetti (la sostituzione
 * di un esercizio, per esempio) diventano JSON, i vuoti restano vuoti. */
function valoreLeggibile(valore) {
  if (valore === undefined || valore === null) return "";
  if (typeof valore === "string") return valore;
  if (typeof valore === "number" || typeof valore === "boolean") return String(valore);
  try { return JSON.stringify(valore); } catch (e) { return ""; }
}

/* ---- Esporta: il registro delle modifiche letto da B -------------------- */

export function modificheDalRegistro(registro) {
  return vociInOrdine(registro).map((v, indice) => {
    const dati = v.dati;
    const versione = dati.versioneDopo != null ? dati.versioneDopo : (dati.versione != null ? dati.versione : null);
    return {
      numero: indice + 1,
      tipo: testo(dati.tipo) || "non dichiarato",
      campo: testo(dati.campo),
      prima: valoreLeggibile(dati.prima),
      dopo: valoreLeggibile(dati.dopo),
      versione: versione == null ? null : Number(versione),
      data: v.quando
    };
  });
}

/* La data del nome file, nel fuso di chi guarda: 2026-11-26. */
export function giornoBreve(adesso) {
  const d = adesso instanceof Date && !Number.isNaN(adesso.getTime()) ? adesso : new Date();
  const due = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + due(d.getMonth() + 1) + "-" + due(d.getDate());
}

/* Il pacchetto da scaricare. Con il registro vuoto NON si produce un file
 * vuoto: si spiega perché non c'è niente. */
export function pacchettoEsportazione(registro, adesso) {
  const modifiche = modificheDalRegistro(registro);
  if (!modifiche.length) {
    return {
      ok: false,
      motivo: "Il registro delle modifiche è vuoto: non c'è niente da esportare. Le voci compaiono qui quando salvi qualcosa, e restano in B."
    };
  }
  const quando = adesso instanceof Date && !Number.isNaN(adesso.getTime()) ? adesso : new Date();
  const nomeFile = NOME_FILE_BASE + " \u2014 " + giornoBreve(quando) + ".json";
  const contenuto = JSON.stringify({
    applicazione: NOME_FILE_BASE,
    esportato: quando.toISOString(),
    totale: modifiche.length,
    nota: "Dalla modifica più vecchia alla più recente. Voci lette dal registro della zona B.",
    modifiche: modifiche
  }, null, 2);
  return { ok: true, nomeFile: nomeFile, contenuto: contenuto, totale: modifiche.length };
}

/* ---- «Modifiche in coda»: la verità ------------------------------- */

/* Quante voci restano nel vecchio elenco locale. Zero quando non c'è (il caso
 * normale): il salvataggio va diretto in B e una coda non esiste più. */
export function leggiCodaLocale(archivio) {
  const esito = { numero: 0, chiavi: [], presente: false };
  if (!archivio || typeof archivio.getItem !== "function") return esito;
  let grezzo = null;
  try { grezzo = archivio.getItem(CHIAVE_CODA_VECCHIA); } catch (e) { return esito; }
  if (grezzo == null || grezzo === "") return esito;
  esito.presente = true;
  let dati = null;
  try { dati = JSON.parse(grezzo); } catch (e) { dati = null; }
  if (dati && typeof dati === "object") esito.chiavi = Object.keys(dati);
  esito.numero = esito.chiavi.length;
  return esito;
}

export function testoModificheInCoda(coda) {
  const n = Math.max(0, Number(coda && coda.numero) || 0);
  if (n > 0) {
    return {
      numero: String(n),
      nota: "Resti del vecchio salvataggio locale (" + n + (n === 1 ? " voce" : " voci") + "): le modifiche nuove vanno dirette in B. Si tolgono solo con «Azzera modifiche locali»."
    };
  }
  return {
    numero: "0",
    nota: "Le modifiche vanno dirette su B: non c'è una coda da svuotare."
  };
}

/* ---- «Azzera modifiche locali»: cosa, prima di farlo ------------------ */

/* Le chiavi locali che questo tasto può togliere. Solo i resti del vecchio
 * salvataggio: niente sessione d'accesso (le chiavi dell'SDK non entrano
 * nell'elenco), niente email ricordata, niente preferenze, niente di B. */
export function chiaviLocaliDaAzzerare(archivio) {
  const elenco = [];
  if (!archivio || typeof archivio.getItem !== "function") return elenco;
  const coda = leggiCodaLocale(archivio);
  if (coda.presente) {
    elenco.push({
      chiave: CHIAVE_CODA_VECCHIA,
      etichetta: coda.numero > 0
        ? "le modifiche del vecchio formato locale (" + coda.numero + (coda.numero === 1 ? " voce" : " voci") + ")"
        : "il vecchio elenco delle modifiche locali (vuoto)"
    });
  }
  let salvato = null;
  try { salvato = archivio.getItem(CHIAVE_SALVATAGGIO_VECCHIO); } catch (e) { salvato = null; }
  if (salvato != null && salvato !== "") {
    elenco.push({ chiave: CHIAVE_SALVATAGGIO_VECCHIO, etichetta: "l'ora dell'ultimo salvataggio locale (vecchio formato)" });
  }
  return elenco;
}

/* Toglie SOLO le chiavi dell'elenco ammesso, una per una. Qualunque chiave
 * fuori da quell'elenco viene ignorata, non rimossa: è la cintura che tiene
 * fuori la sessione d'accesso anche se qualcuno passa un elenco sbagliato. */
const CHIAVI_AMMESSE = [CHIAVE_CODA_VECCHIA, CHIAVE_SALVATAGGIO_VECCHIO];

export function azzeraChiaviLocali(archivio, elenco) {
  if (!archivio || typeof archivio.removeItem !== "function") {
    return { ok: false, motivo: "questo dispositivo non ha una memoria locale da toccare", tolte: [] };
  }
  const tolte = [];
  for (const voce of (Array.isArray(elenco) ? elenco : [])) {
    const chiave = testo(voce && typeof voce === "object" ? voce.chiave : voce);
    if (!CHIAVI_AMMESSE.includes(chiave)) continue;
    try { archivio.removeItem(chiave); tolte.push(chiave); } catch (e) { /* resta dov'è */ }
  }
  return { ok: true, tolte: tolte };
}

/* ---- Il file, davvero ------------------------------------------------ */

/* Prepara il file e lo fa scaricare. Ritorna true se il browser l'ha preso.
 * Nessun dato esce dal dispositivo: il file si compone qui, in memoria. */
export function scaricaTesto(doc, nomeFile, contenuto) {
  const win = doc && doc.defaultView ? doc.defaultView : (typeof window !== "undefined" ? window : null);
  const Api = win && win.URL ? win.URL : (typeof URL !== "undefined" ? URL : null);
  if (!win || !Api || typeof Api.createObjectURL !== "function" || typeof win.Blob !== "function") return false;
  const blob = new win.Blob([contenuto], { type: "application/json;charset=utf-8" });
  const url = Api.createObjectURL(blob);
  const a = doc.createElement("a");
  a.href = url;
  a.download = nomeFile;
  a.rel = "noopener";
  if (doc.body) doc.body.appendChild(a);
  a.click();
  if (a.parentNode) a.parentNode.removeChild(a);
  if (typeof Api.revokeObjectURL === "function") setTimeout(() => { try { Api.revokeObjectURL(url); } catch (e) { /* niente */ } }, 0);
  return true;
}

/* ---- Il montaggio in pagina ------------------------------------------ */

function notaDi(doc, id) {
  const el = doc.getElementById(id);
  return el || null;
}

function scriviNota(doc, id, testoNota) {
  const el = notaDi(doc, id);
  if (!el) return;
  el.textContent = testoNota;
  el.hidden = !testo(testoNota);
}

/* Attacca i tre comandi della pagina Impostazioni. Opzioni:
 *  - archivio: () => Storage | Storage — la memoria del dispositivo;
 *  - registro: () => Promise<Array> | Array — le voci lette da B;
 *  - scarica:  (doc, nomeFile, contenuto) => boolean — il scaricatore (per le prove);
 *  - adesso:   () => Date — l'ora del nome file (per le prove).
 * Ritorna un oggetto con lo stato letto, utile alle prove. */
export function montaImpostazioni(doc, opzioni) {
  const o = opzioni && typeof opzioni === "object" ? opzioni : {};
  if (!doc) return null;
  const prendiArchivio = () => {
    try { return typeof o.archivio === "function" ? o.archivio() : (o.archivio || null); } catch (e) { return null; }
  };
  const adesso = () => (typeof o.adesso === "function" ? o.adesso() : new Date());
  const stato = { coda: null, confermaAzzera: false, ultimaEsportazione: null };

  /* 1. «Modifiche in coda»: numero vero e nota in chiaro. */
  const mostraCoda = () => {
    const coda = leggiCodaLocale(prendiArchivio());
    const testo_ = testoModificheInCoda(coda);
    stato.coda = coda;
    const numero = doc.getElementById("st-sync-queue");
    if (numero) numero.textContent = testo_.numero;
    scriviNota(doc, "st-coda-nota", testo_.nota);
    return testo_;
  };
  mostraCoda();

  /* 2. «Esporta modifiche»: il registro vero, dalla più vecchia. */
  const esporta = doc.getElementById("st-esporta");
  if (esporta && esporta.dataset.impostazioniVivo !== "1") {
    esporta.dataset.impostazioniVivo = "1";
    esporta.addEventListener("click", async () => {
      const testoPrima = String(esporta.textContent || "");
      esporta.disabled = true;
      esporta.textContent = "preparo il file…";
      const chiudi = (messaggio) => {
        esporta.disabled = false;
        esporta.textContent = testoPrima || "Esporta modifiche";
        scriviNota(doc, "st-esporta-nota", messaggio);
      };
      try {
        const letto = typeof o.registro === "function" ? await o.registro() : await o.registro;
        const pacchetto = pacchettoEsportazione(Array.isArray(letto) ? letto : [], adesso());
        if (!pacchetto.ok) { stato.ultimaEsportazione = null; chiudi(pacchetto.motivo); return; }
        const scaricatore = typeof o.scarica === "function" ? o.scarica : scaricaTesto;
        const preso = scaricatore(doc, pacchetto.nomeFile, pacchetto.contenuto);
        if (!preso) { stato.ultimaEsportazione = null; chiudi("Il file è pronto («" + pacchetto.nomeFile + "») ma questo browser non me lo lascia salvare: riprova da un browser normale."); return; }
        stato.ultimaEsportazione = pacchetto;
        chiudi("Scaricato «" + pacchetto.nomeFile + "»: " + pacchetto.totale + (pacchetto.totale === 1 ? " voce" : " voci") + ", dalla più vecchia alla più recente.");
      } catch (e) {
        stato.ultimaEsportazione = null;
        chiudi("Non ho potuto leggere il registro: " + ((e && e.message) || "la lettura non è riuscita") + ". Nessun file scaricato.");
      }
    });
  }

  /* 3. «Azzera modifiche locali»: prima dice cosa toglierebbe, poi aspetta. */
  const azzera = doc.getElementById("st-azzera");
  if (azzera && azzera.dataset.impostazioniVivo !== "1") {
    azzera.dataset.impostazioniVivo = "1";
    const testoPrima = String(azzera.textContent || "");
    azzera.addEventListener("click", () => {
      const archivio = prendiArchivio();
      const elenco = chiaviLocaliDaAzzerare(archivio);
      if (!elenco.length) {
        stato.confermaAzzera = false;
        azzera.textContent = testoPrima || "Azzera modifiche locali";
        scriviNota(doc, "st-azzera-nota", "Non c'è niente in locale da azzerare: i dati stanno in B. L'accesso non si tocca: si chiude da «Esci da questo dispositivo».");
        return;
      }
      if (!stato.confermaAzzera) {
        stato.confermaAzzera = true;
        azzera.textContent = "Conferma: togli solo questi dati locali";
        scriviNota(doc, "st-azzera-nota", "Sto per togliere solo dal browser: " + elenco.map((v) => v.etichetta).join("; ") + ". I dati in B non si toccano e l'accesso resta. Confermi?");
        return;
      }
      const esito = azzeraChiaviLocali(archivio, elenco);
      stato.confermaAzzera = false;
      azzera.textContent = testoPrima || "Azzera modifiche locali";
      if (!esito.ok) { scriviNota(doc, "st-azzera-nota", esito.motivo || "Non ho tolto niente."); return; }
      const tolte = esito.tolte.length;
      scriviNota(doc, "st-azzera-nota", tolte
        ? "Fatto: ho tolto " + tolte + (tolte === 1 ? " resto locale" : " resti locali") + ". I dati in B sono intatti e l'accesso non si è chiuso."
        : "Non ho tolto niente: l'elenco era già vuoto. I dati in B sono intatti.");
      mostraCoda();
    });
  }

  return { mostraCoda: mostraCoda, stato: stato };
}
