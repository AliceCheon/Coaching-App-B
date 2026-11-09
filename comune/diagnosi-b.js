/* Diagnosi temporanea (9/11/2026) — STRUMENTO DA TOGLIERE.
 *
 * Si accende solo aprendo la pagina con ?diagnosi=1 nell'indirizzo. Senza quel
 * parametro non si costruisce niente e la pagina resta identica a prima.
 *
 * Cosa fa: legge lo stato che l'app tiene GIA' in memoria (cella aperta,
 * campi dell'esercizio, versioni, ridisegni) e lo stampa sotto la tabella del
 * Programma attivo, in testo semplice da fotografare.
 *
 * Cosa NON fa: nessuna scrittura su Firestore, nessun ascoltatore nuovo, nessuna
 * lettura dal database. Non tocca i dati: e' solo una lente.
 */

const MAX_EVENTI = 60;

function dueVolte(n) {
  return n < 10 ? "0" + n : String(n);
}

export function oraAdesso() {
  const d = new Date();
  return dueVolte(d.getHours()) + ":" + dueVolte(d.getMinutes()) + ":" + dueVolte(d.getSeconds());
}

/* Il parametro si legge dall'indirizzo: ?diagnosi=1 (anche insieme ad altri). */
export function diagnosiAccesa(win) {
  try {
    const w = win || null;
    if (!w || !w.location) return false;
    const q = String(w.location.search || "");
    if (!q) return false;
    const pezzi = q.replace(/^\?/, "").split("&");
    for (let i = 0; i < pezzi.length; i += 1) {
      const coppia = pezzi[i].split("=");
      if (coppia[0] === "diagnosi" && coppia[1] === "1") return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

function testoBreve(v, quanto) {
  const s = String(v == null ? "" : v);
  const m = quanto || 46;
  return s.length > m ? s.slice(0, m) + "..." : s;
}

function numeroVersione(dati) {
  const v = Number((dati || {}).versione);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

/* Tutti i campi che esistono davvero sull'esercizio, schiacciati in
 * "percorso = valore". Serve a vedere se il valore della cella arriva da un
 * campo che non e' quello che si crede (recupero, pausa, recSettimana...). */
function campiPiatti(oggetto, prefisso, uscita, profondita) {
  const o = oggetto && typeof oggetto === "object" ? oggetto : {};
  const p = profondita || 0;
  const chiavi = Object.keys(o);
  for (let i = 0; i < chiavi.length; i += 1) {
    const k = chiavi[i];
    const v = o[k];
    const percorso = prefisso ? prefisso + "." + k : k;
    if (v && typeof v === "object" && !Array.isArray(v) && p < 1) {
      campiPiatti(v, percorso, uscita, p + 1);
    } else if (Array.isArray(v)) {
      uscita.push(percorso + " = [" + v.length + " voci]");
    } else if (v !== null && v !== undefined && typeof v !== "function") {
      uscita.push(percorso + " = " + testoBreve(v));
    }
  }
  return uscita;
}

/* Chi contiene un id di esercizio: per la diagnosi va bene un elenco di
 * documenti, non serve sapere il resto. */
function indicePerEsercizio(documenti) {
  const indice = Object.create(null);
  const elenco = Array.isArray(documenti) ? documenti : [];
  const segna = (idEse, idDoc) => {
    const k = String(idEse == null ? "" : idEse).trim();
    if (!k || !idDoc) return;
    if (!indice[k]) indice[k] = [];
    if (indice[k].indexOf(idDoc) === -1) indice[k].push(idDoc);
  };
  elenco.forEach((d) => {
    const doc = d || {};
    const dati = doc.dati || {};
    const foglio = dati.sheet || {};
    const liste = [foglio.exercises, foglio.esercizi, dati.exercises, dati.esercizi];
    liste.forEach((l) => {
      if (Array.isArray(l)) l.forEach((e) => { if (e) segna(e.id, String(doc.id || "")); });
    });
    const uno = dati.exercise || dati.esercizio;
    if (uno && uno.id) segna(uno.id, String(doc.id || ""));
  });
  return indice;
}

/* Le versioni per id di scheda: un id puo' stare su piu' documenti. */
function versioniPerScheda(documenti) {
  const perScheda = Object.create(null);
  const elenco = Array.isArray(documenti) ? documenti : [];
  elenco.forEach((d) => {
    const doc = d || {};
    const dati = doc.dati || {};
    const foglio = dati.sheet || {};
    const sheetId = String(dati.sheetId || foglio.id || "").trim();
    if (!sheetId) return;
    if (!perScheda[sheetId]) perScheda[sheetId] = [];
    perScheda[sheetId].push({ doc: String(doc.id || ""), versione: numeroVersione(dati) });
  });
  return perScheda;
}

const PREFISSI = {
  archiviata: "program-v2-archived-",
  esercizio: "program-v2-exercise-",
  scheda: "program-v2-sheet-"
};

function famiglia(idDoc) {
  const s = String(idDoc || "");
  if (s.indexOf(PREFISSI.archiviata) === 0) return "archiviata";
  if (s.indexOf(PREFISSI.esercizio) === 0) return "esercizio sciolto";
  if (s.indexOf(PREFISSI.scheda) === 0) return "scheda";
  return "altro documento";
}

export function creaDiagnosi(win, stato) {
  const d = {
    win: win || null,
    stato: stato || null,
    inizio: oraAdesso(),
    ultimaLettura: null,
    aSchermo: null,
    ultimoRidisegno: null,
    ultimaScrittura: null,
    documenti: [],
    indice: Object.create(null),
    schede: null,
    eventi: []
  };

  d.evento = (testo) => {
    d.eventi.push(oraAdesso() + " " + String(testo || ""));
    if (d.eventi.length > MAX_EVENTI) d.eventi.splice(0, d.eventi.length - MAX_EVENTI);
  };

  /* Fine di una lettura dal database: le versioni lette sono quelle appena
   * arrivate, che il disegno dovrebbe mostrare. */
  d.letta = (dati) => {
    const o = dati || {};
    d.documenti = Array.isArray(o.documenti) ? o.documenti : [];
    d.indice = indicePerEsercizio(d.documenti);
    d.ultimaLettura = { ora: oraAdesso(), versioni: versioniPerScheda(d.documenti) };
    d.evento("lettura dal database");
  };

  /* Fine di un disegno: questo e' quello che sta a schermo adesso. */
  d.disegnata = (dati) => {
    const o = dati || {};
    if (o.schede) d.schede = o.schede;
    const usati = Array.isArray(o.documenti) ? o.documenti : d.documenti;
    d.aSchermo = { ora: oraAdesso(), versioni: versioniPerScheda(usati) };
  };

  d.ridisegnato = (motivo) => {
    d.ultimoRidisegno = { ora: oraAdesso(), motivo: String(motivo || "non detto") };
    d.evento("ridisegno: " + String(motivo || "non detto"));
  };

  d.scritto = (esito, richiesta) => {
    const e = esito || {};
    const r = richiesta || {};
    d.ultimaScrittura = {
      ora: oraAdesso(),
      ok: e.ok === true,
      campo: String(r.campo || ""),
      valore: testoBreve(r.valore, 40),
      prima: testoBreve(r.prima, 40),
      scheda: String(r.idScheda || ""),
      esercizio: String(r.idEsercizio || ""),
      motivo: e.ok ? "" : String(e.motivo || "")
    };
    d.evento("scrittura " + (e.ok ? "riuscita" : "fallita"));
  };

  return d;
}

/* ---------- la striscia ---------------------------------------------------- */

function stile(blocco) {
  blocco.setAttribute("style", [
    "margin:18px 0 6px",
    "padding:12px 14px",
    "border:2px solid #b8860b",
    "border-radius:8px",
    "background:#fffbe6",
    "color:#111",
    "font:12px/1.5 ui-monospace,Menlo,Consolas,monospace",
    "white-space:pre-wrap",
    "word-break:break-word",
    "text-align:left",
    "max-width:100%"
  ].join(";"));
}

function cellaAperta(doc) {
  const attivo = doc.activeElement;
  if (attivo && attivo.getAttribute && attivo.getAttribute("contenteditable") === "true") return attivo;
  const aperte = doc.querySelectorAll("#programma-attivo [contenteditable='true']");
  for (let i = 0; i < aperte.length; i += 1) {
    if (aperte[i].classList && aperte[i].classList.contains("scrittura")) return aperte[i];
  }
  return null;
}

function cercaEsercizio(d, idScheda, idEsercizio) {
  const elenco = Array.isArray(d.schede) ? d.schede : [];
  for (let i = 0; i < elenco.length; i += 1) {
    const s = elenco[i] || {};
    if (String(s.id || "") !== String(idScheda || "")) continue;
    const esercizi = Array.isArray(s.esercizi) ? s.esercizi : [];
    for (let k = 0; k < esercizi.length; k += 1) {
      const e = esercizi[k] || {};
      if (String(e.id || "") !== String(idEsercizio || "")) continue;
      return { scheda: s, esercizio: e, indice: k };
    }
    return { scheda: s, esercizio: null, indice: -1 };
  }
  return null;
}

/* Lo stesso esercizio nel documento appena letto: e' la prova che il database
 * ha un valore e lo schermo un altro. */
function esercizioNelDocumento(d, idScheda, idEsercizio) {
  const elenco = Array.isArray(d.documenti) ? d.documenti : [];
  for (let i = 0; i < elenco.length; i += 1) {
    const doc = elenco[i] || {};
    const dati = doc.dati || {};
    const foglio = dati.sheet || {};
    const sheetId = String(dati.sheetId || foglio.id || "").trim();
    if (sheetId !== String(idScheda || "")) continue;
    const liste = [foglio.exercises, foglio.esercizi, dati.exercises, dati.esercizi];
    for (let j = 0; j < liste.length; j += 1) {
      const l = liste[j];
      if (!Array.isArray(l)) continue;
      for (let k = 0; k < l.length; k += 1) {
        if (String((l[k] || {}).id || "") === String(idEsercizio || "")) {
          return { doc: String(doc.id || ""), esercizio: l[k] };
        }
      }
    }
  }
  return null;
}

const CAMPI_LETTI = {
  recupero: "prescrizione.recupero",
  tempo: "prescrizione.tempo",
  serie: "settimana.serie",
  ripetizioni: "settimana.ripetizioni"
};

function valoreIn(esercizio, percorso) {
  const pezzi = String(percorso || "").split(".");
  let v = esercizio;
  for (let i = 0; i < pezzi.length; i += 1) {
    if (!v || typeof v !== "object") return "";
    v = v[pezzi[i]];
  }
  return v == null ? "" : String(v);
}

export function disegnaDiagnosi(doc, contenitore, d) {
  if (!doc || !contenitore || !d) return null;
  let blocco = doc.getElementById("diag-b");
  if (!blocco) {
    blocco = doc.createElement("div");
    blocco.id = "diag-b";
    stile(blocco);
    contenitore.appendChild(blocco);
  }

  const righe = [];
  righe.push("DIAGNOSI TEMPORANEA (si toglie) \u00b7 aperta alle " + d.inizio + " \u00b7 nessuna scrittura su Firestore");
  righe.push("");

  const cella = cellaAperta(doc);
  let idScheda = "";
  let idEsercizio = "";
  let campo = "";
  let indice = "";
  let mostrato = "";
  if (cella && cella.getAttribute) {
    idScheda = String(cella.getAttribute("data-id-scheda") || "");
    idEsercizio = String(cella.getAttribute("data-id-ese") || "");
    campo = String(cella.getAttribute("data-campo") || "");
    indice = String(cella.getAttribute("data-indice") || "");
    mostrato = String(cella.textContent || "").trim();
  } else if (d.ultimaScrittura) {
    idScheda = d.ultimaScrittura.scheda;
    idEsercizio = d.ultimaScrittura.esercizio;
    campo = d.ultimaScrittura.campo;
    mostrato = d.ultimaScrittura.valore;
  }

  if (!idScheda && !idEsercizio) {
    righe.push("Cella in modifica: nessuna, e nessuna scrittura da quando hai aperto la pagina.");
  } else {
    righe.push("Cella " + (cella ? "in modifica ora" : "ultima toccata") + ": scheda " + (idScheda || "?") +
      " \u00b7 esercizio " + (idEsercizio || "?") + (indice !== "" ? " \u00b7 riga " + (Number(indice) + 1) : "") +
      " \u00b7 campo \"" + (campo || "?") + "\"");
    righe.push("Valore mostrato dalla cella: \"" + (mostrato || "(vuoto)") + "\"");
    if (campo) righe.push("Lo legge da: " + (CAMPI_LETTI[campo] || campo));

    const trovato = cercaEsercizio(d, idScheda, idEsercizio);
    if (trovato && trovato.esercizio) {
      const campi = campiPiatti(trovato.esercizio, "", [], 0);
      righe.push("");
      righe.push("Campi che esistono su questo esercizio (a schermo, cioe' in memoria):");
      const utili = [];
      campi.forEach((riga) => {
        const chiave = riga.split(" = ")[0].toLowerCase();
        if (chiave.indexOf("rec") !== -1 || chiave.indexOf("paus") !== -1 ||
            chiave.indexOf("temp") !== -1 || chiave.indexOf("cadenz") !== -1 ||
            chiave.indexOf("tut") !== -1) utili.push("* " + riga);
      });
      if (utili.length) utili.forEach((r) => righe.push(r));
      else righe.push("(nessun campo di recupero o tempo: la cella legge " + (CAMPI_LETTI[campo] || campo) + ", che qui non esiste)");
      righe.push("Tutti i campi: " + (campi.length ? campi.join(" \u00b7 ") : "(esercizio vuoto)"));
    } else {
      righe.push("Esercizio non trovato nelle schede a schermo: la riga che tocchi non sta nel modello disegnato.");
    }

    const nelDocumento = esercizioNelDocumento(d, idScheda, idEsercizio);
    if (nelDocumento) {
      const percorso = CAMPI_LETTI[campo] || campo;
      const dalDb = valoreIn(nelDocumento.esercizio, percorso);
      const inMemoria = trovato && trovato.esercizio ? valoreIn(trovato.esercizio, percorso) : "";
      righe.push("");
      righe.push("Nel documento del database (" + nelDocumento.doc + "): " + percorso + " = \"" + (dalDb || "(vuoto)") + "\"");
      righe.push("A schermo: \"" + (inMemoria || "(vuoto)") + "\"" +
        (dalDb !== inMemoria ? "  <<< DIVERSI: lo schermo non ha il dato del database" : "  (uguali)"));
    }
  }

  righe.push("");
  const lettura = d.ultimaLettura;
  const schermo = d.aSchermo;
  if (idScheda && lettura) {
    const prima = lettura.versioni[idScheda] || [];
    const dopo = (schermo && schermo.versioni[idScheda]) || [];
    const scrivi = (elenco) => elenco.length
      ? elenco.map((v) => v.versione + " (" + v.doc + ")").join(" \u00b7 ")
      : "nessun documento con questo id";
    righe.push("Versione scheda " + idScheda + ":");
    righe.push("  a schermo: " + scrivi(dopo) + (schermo ? " \u00b7 disegnata alle " + schermo.ora : ""));
    righe.push("  appena letta dal database: " + scrivi(prima) + " \u00b7 letta alle " + lettura.ora);
    if (prima.length && dopo.length) {
      const vPrima = prima.map((v) => v.versione).join("/");
      const vDopo = dopo.map((v) => v.versione).join("/");
      righe.push("  " + (vPrima === vDopo ? "le versioni coincidono" : "VERSIONI DIVERSE: lo schermo e' indietro"));
    }
  } else {
    righe.push("Versione della scheda: nessuna cella da guardare in questo momento.");
  }

  righe.push("");
  const us = d.ultimaScrittura;
  righe.push(us
    ? "Ultima scrittura " + (us.ok ? "RIUSCITA" : "FALLITA") + ": alle " + us.ora + " \u00b7 " + (us.campo || "?") +
      " = \"" + (us.valore || "") + "\"" + (us.prima ? " (prima: \"" + us.prima + "\")" : "") +
      (us.ok ? "" : " \u00b7 motivo: " + (us.motivo || "non detto"))
    : "Ultima scrittura: nessuna da quando hai aperto la pagina.");

  const st = d.stato || {};
  righe.push("Ridisegni della pagina: " + (st.ridisegni || 0) + " dall'apertura" +
    (d.ultimoRidisegno ? " \u00b7 ultimo alle " + d.ultimoRidisegno.ora + " per: " + d.ultimoRidisegno.motivo : " \u00b7 nessuno"));
  righe.push("Letture dal database: " + (st.letture || 0) +
    " \u00b7 controlli rimandati perche' stavi scrivendo: " + (st.rimandati || 0));

  if (idEsercizio) {
    const dove = d.indice[idEsercizio] || [];
    righe.push("");
    if (dove.length <= 1) {
      righe.push("L'esercizio sta in un solo documento" + (dove.length === 1 ? ": " + dove[0] + " (" + famiglia(dove[0]) + ")" : ""));
    } else {
      righe.push("ATTENZIONE: l'esercizio sta in " + dove.length + " documenti:");
      dove.forEach((idDoc) => righe.push("  * " + idDoc + " (" + famiglia(idDoc) + ")"));
    }
  }

  if (d.eventi.length) {
    righe.push("");
    righe.push("Ultimi movimenti: " + d.eventi.slice(-8).join(" \u00b7 "));
  }

  const testo = righe.join("\n");
  if (blocco.textContent !== testo) blocco.textContent = testo;
  return blocco;
}
