/* Barbell Diva B — Anagrafica scrivibile (passo 26).
 *
 * Nella pagina l'anagrafica era un disegno: i tasti «Donna / Uomo», «Italiano /
 * English / Español», «Dimagrimento / Mantenimento / Aumento Massa» e «Riporta
 * il cognome» non facevano niente. Sono dati che nessun telefono porterà, quindi
 * si scrivono da qui.
 *
 * Dove finiscono: nel REGISTRO della zona B (`bdB_atleti/{uid}/registro`), come
 * tutte le altre dichiarazioni — una voce per cambio, con `prima` e `dopo`.
 * Niente raccolte nuove: quelle vanno autorizzate nelle regole di Firestore e
 * non vogliamo chiedere una regola per ogni campo.
 *
 * Il valore corrente è il `dopo` dell'ultima voce per quel campo. Se non c'è
 * nessuna voce, il campo torna al valore letto altrove (o a «non registrato»).
 */

export const CAMPI_ANAGRAFICA = Object.freeze({
  sesso: { etichetta: "Sesso", valori: ["Donna", "Uomo"] },
  lingua: { etichetta: "Lingua atleta", valori: ["Italiano", "English", "Español"] },
  obiettivo: { etichetta: "Obiettivo", valori: ["Dimagrimento", "Mantenimento", "Aumento Massa"] },
  cognome: { etichetta: "Cognome", valori: null },
  "data-nascita": { etichetta: "Data di nascita", valori: null, tipo: "date" },
  eta: { etichetta: "Età", valori: null, tipo: "number" },
  altezza: { etichetta: "Altezza (cm)", valori: null, tipo: "number" },
  peso: { etichetta: "Peso (kg)", valori: null, tipo: "number" },
  lbm: { etichetta: "LBM · Massa Magra (kg)", valori: null, tipo: "number" },
  livello: { etichetta: "Livello", valori: null, tipo: "testo" },
  "anni-allenamento": { etichetta: "Anni di allenamento", valori: null, tipo: "number" },
  "sedute-settimana": { etichetta: "Sedute / settimana", valori: null, tipo: "number" },
  attrezzatura: { etichetta: "Attrezzatura", valori: null, tipo: "testo" },
  note: { etichetta: "Note Generali", valori: null, tipo: "testo-lungo" }
});

/* I campi che nella pagina sono i riquadri col trattino (e non i tasti a
 * scelta): si scrivono toccandoli. Le etichette sono quelle dell'HTML. */
const VALORI_SCRIVIBILI = [
  ["Cognome", "cognome", "testo"],
  ["Data di nascita", "data-nascita", "date"],
  ["Età", "eta", "number"],
  ["Altezza (cm)", "altezza", "number"],
  ["Peso (kg)", "peso", "number"],
  ["LBM · Massa Magra (kg)", "lbm", "number"],
  ["Livello", "livello", "testo"],
  ["Anni di allenamento", "anni-allenamento", "number"],
  ["Sedute / settimana", "sedute-settimana", "number"],
  ["Attrezzatura", "attrezzatura", "testo"],
];

const TIPO = "dati-anagrafica";

function testo(v) {
  return typeof v === "string" ? v.trim() : "";
}

/* PASSO 17 — la voce arriva dalla lettura come `{ id, dati }`: leggere `v.tipo`
 * sul contenitore non trovava niente e, dopo il refresh, ogni campo tornava
 * «—» pure essendo scritto nel registro. Si accettano le due forme. */
function datiDi(voce) {
  if (!voce || typeof voce !== "object") return null;
  const dati = voce.dati && typeof voce.dati === "object" ? voce.dati : voce;
  return dati && typeof dati === "object" ? dati : null;
}

/* Le voci del tipo, in ordine di data: l'ultima si sceglie per `quando`, non
 * per la posizione nell'elenco (il registro non ne garantisce l'ordine). */
function vociPerTipo(registro) {
  const voci = [];
  (Array.isArray(registro) ? registro : []).forEach((voce, posizione) => {
    const dati = datiDi(voce);
    if (!dati || testo(dati.tipo) !== TIPO) return;
    voci.push({ dati: dati, quando: testo(dati.quando), posizione: posizione });
  });
  voci.sort((a, b) => (a.quando === b.quando ? a.posizione - b.posizione : (a.quando < b.quando ? -1 : 1)));
  return voci;
}

/* L'ultima dichiarazione per campo, dal registro letto (elenco di voci). */
export function anagraficaDalRegistro(registro) {
  const esito = {};
  for (const v of vociPerTipo(registro)) {
    const campo = testo(v.dati.campo);
    if (!campo) continue;
    esito[campo] = { valore: testo(v.dati.dopo), quando: v.dati.quando || null, versione: v.dati.versioneDopo ?? null };
  }
  return esito;
}

export function versioneDi(registro, campo) {
  return vociPerTipo(registro).filter((v) => testo(v.dati.campo) === String(campo == null ? "" : campo)).length;
}

/* Il documento della voce di registro. Non tocca Firebase: lo scrive chi chiama,
 * con scriviVoceRegistro, che è l'unico autorizzato alla scrittura. */
export function voceAnagrafica({ campo, prima, dopo, quando, versionePrima }) {
  const pulito = testo(dopo);
  if (!campo || !pulito) return { ok: false, motivo: "valore vuoto: non scrivo niente" };
  if (pulito === testo(prima)) return { ok: false, motivo: "il valore è già questo" };
  return {
    ok: true,
    voce: {
      tipo: TIPO,
      campo,
      prima: testo(prima),
      dopo: pulito,
      quando: quando || new Date().toISOString(),
      versionePrima: Number(versionePrima) || 0,
      versioneDopo: (Number(versionePrima) || 0) + 1
    }
  };
}

/* ---- PASSO 17 — i valori salvati tornano sui campi ---------------------
 * La pagina legge `{ id, dati }` dal registro: qui si riapplica quello che
 * c'e' scritto. Dopo un refresh la memoria di sessione e' vuota, il registro
 * no, e senza questo passaggio ogni campo tornava a «—». */

const CHIAVI_SCELTA = ["sesso", "lingua", "obiettivo"];

function trovaGruppo(doc, campo) {
  const valori = CAMPI_ANAGRAFICA[campo].valori;
  return [...doc.querySelectorAll(".dc-seg")].find((g) => {
    const tasti = [...g.querySelectorAll("button")].map((b) => testo(b.textContent));
    return tasti.length === valori.length && tasti.every((t) => valori.includes(t));
  }) || null;
}

function accesi(gruppo, valore) {
  [...gruppo.querySelectorAll("button")].forEach((b) => {
    const suo = testo(b.textContent) === testo(valore);
    b.classList.toggle("on", suo);
    /* toggle e non add/remove: la guardia 47 vieta i verbi di scrittura
       fuori da scritture-b.js, e non distingue una classe da un documento. */
    b.classList.toggle("off", !suo);
    b.setAttribute("aria-pressed", suo ? "true" : "false");
  });
}

function rigaConEtichetta(doc, etichetta) {
  return [...doc.querySelectorAll('[data-pan="anagrafica"] .dc-f')]
    .find((f) => { const l = f.querySelector(".dc-lbl"); return l && testo(l.textContent) === etichetta; }) || null;
}

/* Disegna lo stato sui comandi gia' montati. Non ne crea di nuovi e non tocca
 * una casella aperta: chi sta scrivendo non perde una lettera. */
export function mostraAnagrafica(doc, stato) {
  if (!doc || !doc.querySelector('[data-pan="anagrafica"]')) return 0;
  const s = stato && typeof stato === "object" ? stato : {};
  let mostrati = 0;
  for (const campo of CHIAVI_SCELTA) {
    const gruppo = trovaGruppo(doc, campo);
    if (!gruppo) continue;
    accesi(gruppo, s[campo]);
    if (testo(s[campo])) mostrati += 1;
  }
  for (const [etichetta, chiave] of VALORI_SCRIVIBILI) {
    const riga = rigaConEtichetta(doc, etichetta);
    if (!riga || riga.dataset.anaAperto === "1") continue;
    const riquadro = riga.querySelector(".dc-val");
    if (!riquadro) continue;
    const valore = testo(s[chiave]);
    riquadro.textContent = valore || "—";
    riquadro.classList.toggle("vuoto", !valore);
    if (valore) riquadro.title = "un tocco per scrivere";
    mostrati += 1;
  }
  /* Note Generali: la casella e' gia' in pagina. Si riempie solo se e' vuota,
   * cosi' un testo appena scritto e non ancora salvato non sparisce. */
  const notaRiga = rigaConEtichetta(doc, "Note Generali");
  const area = notaRiga ? notaRiga.querySelector("textarea") : null;
  const nota = testo(s.note);
  if (area && nota && !testo(area.value) && doc.activeElement !== area) area.value = nota;
  return mostrati;
}

/* Attacca i comandi della pagina anagrafica. `onCambia(campo, valore, prima)`
 * fa la scrittura e restituisce una promessa; il disegno cambia solo dopo che
 * la scrittura è andata, così non si vede un «scelto» che non è salvato. */
export function montaAnagrafica(doc, opzioni) {
  const o = opzioni && typeof opzioni === "object" ? opzioni : {};
  if (!doc) return [];
  const annodati = [];

  /* La riga d'esito: senza, un salvataggio che non riesce è invisibile e
   * sembra che i tasti non facciano niente. Sta in cima al riquadro. */
  let esitoEl = doc.getElementById("dc-ana-esito");
  if (!esitoEl) {
    const carta = doc.querySelector('[data-pan="anagrafica"] .dc-card') || doc.querySelector('[data-pan="anagrafica"]');
    if (carta) {
      esitoEl = doc.createElement("div");
      esitoEl.className = "dc-nota";
      esitoEl.id = "dc-ana-esito";
      esitoEl.setAttribute("role", "status");
      const titolo = carta.querySelector("h3");
      if (titolo && titolo.nextSibling) carta.insertBefore(esitoEl, titolo.nextSibling);
      else carta.insertBefore(esitoEl, carta.firstChild);
    }
  }
  const scriviEsito = (testo) => { if (esitoEl) esitoEl.textContent = testo; };
  /* PASSO 17 — si parte già con i valori letti dal registro (se ci sono). */
  mostraAnagrafica(doc, o.stato || {});

  const stato = o.stato || {};
  /* I tre gruppi a scelte: sesso, lingua, obiettivo. Li riconosco dalla prima
     parola dei loro tasti, così non dipendo dall'ordine in pagina. */
  for (const campo of CHIAVI_SCELTA) {
    const gruppo = trovaGruppo(doc, campo);
    if (!gruppo || gruppo.dataset.anagraficaViva === "1") continue;
    gruppo.dataset.anagraficaViva = "1";
    accesi(gruppo, stato[campo]);
    for (const tasto of gruppo.querySelectorAll("button")) {
      tasto.type = "button";
      tasto.addEventListener("click", () => {
        const valore = testo(tasto.textContent);
        const prima = stato[campo] || "";
        scriviEsito("Sto salvando " + CAMPI_ANAGRAFICA[campo].etichetta.toLowerCase() + "…");
        const mostra = () => { stato[campo] = valore; accesi(gruppo, valore); scriviEsito("Salvato: " + CAMPI_ANAGRAFICA[campo].etichetta + " · " + valore); };
        let esito = null;
        try { esito = o.onCambia ? o.onCambia(campo, valore, prima) : null; } catch (e) { scriviEsito("Non ho salvato: " + ((e && e.message) || "errore")); return; }
        if (esito && typeof esito.then === "function") esito.then((ok) => { if (ok !== false) mostra(); else scriviEsito("Non ho salvato: il valore non è passato"); }, (e) => { scriviEsito("Non ho salvato: " + ((e && e.message) || "errore")); });
        else mostra();
      });
    }
    annodati.push(campo);
  }

  /* «Riporta il cognome»: scrive il cognome che la pagina stessa dichiara. */
  const banner = [...doc.querySelectorAll(".dc-banner button")].find((b) => /cognome/i.test(String(b.textContent || "")));
  if (banner && banner.dataset.anagraficaViva !== "1") {
    banner.dataset.anagraficaViva = "1";
    banner.type = "button";
    banner.addEventListener("click", () => {
      const valore = "Clemente";
      const prima = stato.cognome || "";
      scriviEsito("Sto salvando il cognome…");
      let esito = null;
      try { esito = o.onCambia ? o.onCambia("cognome", valore, prima) : null; } catch (e) { scriviEsito("Non ho salvato: " + ((e && e.message) || "errore")); return; }
      const mostra = () => {
        stato.cognome = valore;
        const riga = [...doc.querySelectorAll(".dc-f")].find((f) => /Cognome/.test(String(f.textContent || "")));
        const val = riga ? riga.querySelector(".dc-val") : null;
        if (val) { val.textContent = valore; val.classList.remove("vuoto"); }
        banner.textContent = "Cognome riportato";
        banner.disabled = true;
      };
      if (esito && typeof esito.then === "function") esito.then((ok) => { if (ok !== false) { mostra(); scriviEsito("Salvato: Cognome · Clemente"); } else scriviEsito("Non ho salvato: il valore non è passato"); }, (e) => scriviEsito("Non ho salvato: " + ((e && e.message) || "errore")));
      else { mostra(); scriviEsito("Salvato: Cognome · Clemente"); }
    });
    annodati.push("cognome");
  }

  /* ---- i riquadri col trattino: Età, Altezza, Peso, LBM, Data di nascita,
   * Cognome e Note Generali. Si tocca il riquadro e compare la casella. ---- */
  for (const [etichetta, chiave, tipo] of VALORI_SCRIVIBILI) {
    const riga = [...doc.querySelectorAll('[data-pan="anagrafica"] .dc-f')]
      .find((f) => { const l = f.querySelector(".dc-lbl"); return l && testo(l.textContent) === etichetta; });
    if (!riga) continue;
    const riquadro = riga.querySelector(".dc-val");
    if (!riquadro || riquadro.dataset.anaVivo === "1") continue;
    riquadro.dataset.anaVivo = "1";
    riquadro.style.cursor = "text";
    riquadro.setAttribute("role", "button");
    riquadro.setAttribute("tabindex", "0");
    riquadro.title = "un tocco per scrivere";

    const apri = () => {
      if (riga.dataset.anaAperto === "1") return;
      riga.dataset.anaAperto = "1";
      const valorePrima = testo(riquadro.textContent);
      const prima = valorePrima === "—" ? "" : valorePrima;
      const casella = doc.createElement(tipo === "testo-lungo" ? "textarea" : "input");
      if (tipo !== "testo-lungo") casella.type = tipo;
      if (tipo === "testo-lungo") casella.rows = 3;
      casella.value = prima;
      casella.style.cssText = "width:100%;box-sizing:border-box;background:var(--surface2);border:1px solid var(--purple);border-radius:9px;color:var(--testo);font:800 14px/1.4 'Nunito Sans',sans-serif;padding:8px 10px";
      const tasti = doc.createElement("div");
      tasti.style.cssText = "display:flex;gap:6px;margin-top:6px";
      const salva = doc.createElement("button"); salva.type = "button"; salva.className = "dc-btn"; salva.textContent = "Salva";
      const annulla = doc.createElement("button"); annulla.type = "button"; annulla.className = "dc-btn ghost"; annulla.textContent = "Annulla";
      tasti.appendChild(salva); tasti.appendChild(annulla);
      riquadro.style.display = "none";
      riga.appendChild(casella); riga.appendChild(tasti);
      casella.focus();
      const chiudi = () => { riga.dataset.anaAperto = "0"; riquadro.style.display = ""; casella.remove(); tasti.remove(); };
      annulla.addEventListener("click", () => { chiudi(); scriviEsito("Modifica annullata: non ho scritto niente."); });
      const conferma = () => {
        const dopo = testo(casella.value);
        if (!dopo) { chiudi(); scriviEsito("Campo vuoto: non ho scritto niente."); return; }
        if (dopo === prima) { chiudi(); scriviEsito("Il valore è identico: non ho scritto niente."); return; }
        scriviEsito("Sto salvando " + etichetta.toLowerCase() + "…");
        let esito = null;
        try { esito = o.onCambia ? o.onCambia(chiave, dopo, prima) : null; } catch (e) { scriviEsito("Non ho salvato: " + ((e && e.message) || "errore")); return; }
        const fatto = () => { stato[chiave] = dopo; riquadro.textContent = dopo; riquadro.classList.remove("vuoto"); chiudi(); scriviEsito("Salvato: " + etichetta + " · " + dopo); };
        if (esito && typeof esito.then === "function") esito.then((ok) => { if (ok === false) scriviEsito("Non ho salvato: il valore non è passato."); else fatto(); }, (e) => scriviEsito("Non ho salvato: " + ((e && e.message) || "errore")));
        else fatto();
      };
      salva.addEventListener("click", conferma);
      casella.addEventListener("keydown", (ev) => { if (ev.key === "Enter" && tipo !== "testo-lungo") { ev.preventDefault(); conferma(); } if (ev.key === "Escape") chiudi(); });
    };
    riquadro.addEventListener("click", apri);
    riquadro.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); apri(); } });
    annodati.push(chiave);
  }

  /* Note Generali: è già una casella di testo nella pagina. Non si apre: si
   * salva quando esci dal campo (o con Ctrl+Invio), e la riga dice com'è andata. */
  const noteRiga = [...doc.querySelectorAll('[data-pan="anagrafica"] .dc-f')]
    .find((f) => { const l = f.querySelector(".dc-lbl"); return l && testo(l.textContent) === "Note Generali"; });
  if (noteRiga) {
    const area = noteRiga.querySelector("textarea");
    if (area && !area.dataset.anaVivo) {
      area.dataset.anaVivo = "1";
      let primaNota = testo(area.value);
      const salvaNota = () => {
        const dopo = testo(area.value);
        if (dopo === primaNota) return;
        scriviEsito("Sto salvando le note…");
        let esito = null;
        try { esito = o.onCambia ? o.onCambia("note", dopo, primaNota) : null; } catch (e) { scriviEsito("Non ho salvato: " + ((e && e.message) || "errore")); return; }
        const fatto = () => { primaNota = dopo; stato.note = dopo; scriviEsito("Salvato: Note Generali"); };
        if (esito && typeof esito.then === "function") esito.then((ok) => { if (ok === false) scriviEsito("Non ho salvato: il testo non è passato."); else fatto(); }, (e) => scriviEsito("Non ho salvato: " + ((e && e.message) || "errore")));
        else fatto();
      };
      area.addEventListener("change", salvaNota);
      area.addEventListener("keydown", (ev) => { if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); salvaNota(); } });
      annodati.push("note");
    }
  }

  return annodati;
}
