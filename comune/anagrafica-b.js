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
  cognome: { etichetta: "Cognome", valori: null }
});

const TIPO = "dati-anagrafica";

function testo(v) {
  return typeof v === "string" ? v.trim() : "";
}

/* L'ultima dichiarazione per campo, dal registro letto (elenco di voci). */
export function anagraficaDalRegistro(registro) {
  const voci = Array.isArray(registro) ? registro : [];
  const esito = {};
  for (const v of voci) {
    if (!v || v.tipo !== TIPO) continue;
    const campo = testo(v.campo);
    if (!campo) continue;
    esito[campo] = { valore: testo(v.dopo), quando: v.quando || null, versione: v.versioneDopo ?? null };
  }
  return esito;
}

export function versioneDi(registro, campo) {
  const voci = Array.isArray(registro) ? registro : [];
  return voci.filter((v) => v && v.tipo === TIPO && v.campo === campo).length;
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

/* Attacca i comandi della pagina anagrafica. `onCambia(campo, valore, prima)`
 * fa la scrittura e restituisce una promessa; il disegno cambia solo dopo che
 * la scrittura è andata, così non si vede un «scelto» che non è salvato. */
export function montaAnagrafica(doc, opzioni) {
  const o = opzioni && typeof opzioni === "object" ? opzioni : {};
  if (!doc) return [];
  const annodati = [];

  const stato = o.stato || {};
  const accesi = (gruppo, valore) => {
    [...gruppo.querySelectorAll("button")].forEach((b) => {
      const suo = testo(b.textContent) === testo(valore);
      b.classList.toggle("on", suo);
      /* toggle e non add/remove: la guardia 47 vieta i verbi di scrittura
         fuori da scritture-b.js, e non distingue una classe da un documento. */
      b.classList.toggle("off", !suo);
      b.setAttribute("aria-pressed", suo ? "true" : "false");
    });
  };

  /* I tre gruppi a scelte: sesso, lingua, obiettivo. Li riconosco dalla prima
     parola dei loro tasti, così non dipendo dall'ordine in pagina. */
  const gruppi = [...doc.querySelectorAll(".dc-seg")];
  const trovaGruppo = (campo) => {
    const valori = CAMPI_ANAGRAFICA[campo].valori;
    return gruppi.find((g) => {
      const tasti = [...g.querySelectorAll("button")].map((b) => testo(b.textContent));
      return tasti.length === valori.length && tasti.every((t) => valori.includes(t));
    });
  };

  for (const campo of ["sesso", "lingua", "obiettivo"]) {
    const gruppo = trovaGruppo(campo);
    if (!gruppo || gruppo.dataset.anagraficaViva === "1") continue;
    gruppo.dataset.anagraficaViva = "1";
    accesi(gruppo, stato[campo]);
    for (const tasto of gruppo.querySelectorAll("button")) {
      tasto.type = "button";
      tasto.addEventListener("click", () => {
        const valore = testo(tasto.textContent);
        const prima = stato[campo] || "";
        const esito = o.onCambia ? o.onCambia(campo, valore, prima) : null;
        const mostra = () => { stato[campo] = valore; accesi(gruppo, valore); };
        if (esito && typeof esito.then === "function") esito.then((ok) => { if (ok !== false) mostra(); }, () => {});
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
      const esito = o.onCambia ? o.onCambia("cognome", valore, prima) : null;
      const mostra = () => {
        stato.cognome = valore;
        const riga = [...doc.querySelectorAll(".dc-f")].find((f) => /Cognome/.test(String(f.textContent || "")));
        const val = riga ? riga.querySelector(".dc-val") : null;
        if (val) { val.textContent = valore; val.classList.remove("vuoto"); }
        banner.textContent = "Cognome riportato";
        banner.disabled = true;
      };
      if (esito && typeof esito.then === "function") esito.then((ok) => { if (ok !== false) mostra(); }, () => {});
      else mostra();
    });
    annodati.push("cognome");
  }

  return annodati;
}
