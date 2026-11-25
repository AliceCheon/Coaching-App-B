/* Barbell Diva B — il quaderno: l'anamnesi si scrive (passo 29).
 *
 * Alice: «rendi scrivibile l'anamnesi così diventa il mio quaderno».
 * Finora dei quattordici campi se ne scriveva uno solo, «Patologie o
 * infortuni» (che ha il suo modulo, perché da lì si ricavano le articolazioni).
 * Qui ci sono gli altri: stile di vita, intolleranze, farmaci, rapporto col
 * cibo, integratori, allenamento.
 *
 * Dove finiscono: nel registro della zona B, come ogni altra dichiarazione —
 * `tipo: "anamnesi-campo"`, `campo: <chiave>`, con prima, dopo e versioni.
 * Nessuna raccolta nuova, nessuna regola da chiedere: la stessa strada che
 * funziona dall'inizio.
 *
 * Come si scrive: si tocca il valore (o la riga) e compare la casella con
 * Salva e Annulla. A cedere il campo si torna alla riga in sola lettura, con
 * la data dell'ultima volta. Niente modali, niente pagine nuove.
 */

export const CAMPI_QUADERNO = Object.freeze([
  { chiave: "giornata", etichetta: "Com'è strutturata la giornata", blocco: "Stile di vita", righe: 3 },
  { chiave: "sonno", etichetta: "Come dormi e quante ore", blocco: "Stile di vita", righe: 2 },
  { chiave: "orari-allenamento", etichetta: "Quando e quanto puoi allenarti", blocco: "Stile di vita", righe: 2 },
  { chiave: "cibi-preferiti", etichetta: "Alimenti che ti piace mangiare", blocco: "Stile di vita", righe: 2 },
  { chiave: "piano-alimentare", etichetta: "Piano alimentare attuale / cosa mangi", blocco: "Stile di vita", righe: 3 },
  { chiave: "intolleranze", etichetta: "Intolleranze / allergie", blocco: "Salute", righe: 2, dentroAvviso: true },
  { chiave: "farmaci", etichetta: "Assunzione di farmaci", blocco: "Salute", righe: 2, dentroAvviso: true },
  { chiave: "rapporto-cibo", etichetta: "Rapporto con il cibo", blocco: "Rapporto con il cibo", righe: 2 },
  { chiave: "macro-preferiti", etichetta: "Macronutriente / alimenti preferiti", blocco: "Rapporto con il cibo", righe: 2 },
  { chiave: "grasso-dove", etichetta: "Punto dove accumuli grasso", blocco: "Rapporto con il cibo", righe: 1 },
  { chiave: "integratori-usa", etichetta: "Utilizzi integratori? Se sì quali", blocco: "Integratori", righe: 2 },
  { chiave: "integratori-dosi", etichetta: "Integratori e dosi attuali", blocco: "Integratori", righe: 2 },
  { chiave: "esercizi-no", etichetta: "Esercizi che non ti piace fare", blocco: "Allenamento", righe: 2 },
  { chiave: "esercizi-si", etichetta: "Esercizi che ami fare", blocco: "Allenamento", righe: 2 },
  { chiave: "esercizi-difficili", etichetta: "Esercizio in cui trovi più difficoltà", blocco: "Allenamento", righe: 2 }
]);

const TIPO = "anamnesi-campo";

const testo = (v) => (typeof v === "string" ? v.trim() : "");

/* L'ultima dichiarazione per campo: il valore e quando è stato messo. */
export function quadernoDalRegistro(registro) {
  const voci = Array.isArray(registro) ? registro : [];
  const esito = {};
  for (const v of voci) {
    if (!v || v.tipo !== TIPO) continue;
    const campo = testo(v.campo);
    if (!campo) continue;
    esito[campo] = { valore: testo(v.dopo), quando: v.quando || null };
  }
  return esito;
}

export function voceQuaderno({ campo, prima, dopo, quando, versionePrima }) {
  const pulito = testo(dopo);
  if (!campo) return { ok: false, motivo: "campo vuoto" };
  if (pulito === testo(prima)) return { ok: false, motivo: "il testo è identico" };
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

/* La riga di un campo nella pagina: un `.dc-f` con la sua etichetta, oppure una
 * riga del riquadro Salute (`<b>etichetta</b><span>valore</span>`). */
function trovaRiga(doc, campo) {
  const etichetta = campo.etichetta;
  for (const f of doc.querySelectorAll(".dc-f")) {
    const lab = f.querySelector(".dc-lbl");
    if (lab && testo(lab.textContent) === etichetta) return f;
  }
  for (const w of doc.querySelectorAll(".dc-warn > div")) {
    const b = w.querySelector("b");
    if (b && testo(b.textContent) === etichetta) return w;
  }
  return null;
}

/* Il nodo che porta il valore, dentro la riga. */
function nodoValore(riga) {
  return riga.querySelector(".dc-val") || riga.querySelector("span:not(.dc-lbl)") || null;
}

export function montaQuaderno(doc, opzioni) {
  const o = opzioni && typeof opzioni === "object" ? opzioni : {};
  if (!doc) return [];
  const pannello = doc.querySelector('[data-pan="anamnesi"]');
  if (!pannello) return [];

  /* La riga d'esito del quaderno, una sola per tutta la pagina. */
  let esitoEl = doc.getElementById("dc-quaderno-esito");
  if (!esitoEl) {
    const carta = pannello.querySelector(".dc-card") || pannello;
    esitoEl = doc.createElement("div");
    esitoEl.className = "dc-nota";
    esitoEl.id = "dc-quaderno-esito";
    esitoEl.setAttribute("role", "status");
    carta.appendChild(esitoEl);
  }
  const scriviEsito = (t) => { esitoEl.textContent = t; };

  const stato = o.stato || quadernoDalRegistro(o.registro);
  const annodati = [];

  /* Mostra i valori già scritti, senza creare campi. */
  const disegna = () => {
    for (const campo of CAMPI_QUADERNO) {
      const riga = trovaRiga(doc, campo);
      if (!riga) continue;
      const nodo = nodoValore(riga);
      if (!nodo || nodo.dataset.quadernoArea === "1") continue;
      const v = stato[campo.chiave];
      nodo.textContent = v && v.valore ? v.valore : "—";
      nodo.classList.toggle("vuoto", !(v && v.valore));
      if (v && v.valore) nodo.title = "un tocco per modificare";
    }
  };
  disegna();

  const apri = (campo, riga, nodo) => {
    if (riga.dataset.quadernoAperto === "1") return;
    riga.dataset.quadernoAperto = "1";
    const prima = (stato[campo.chiave] && stato[campo.chiave].valore) || "";
    const area = doc.createElement("textarea");
    area.rows = campo.righe || 2;
    area.className = "dc-area-quaderno";
    area.value = prima;
    area.setAttribute("data-quaderno-area", "1");
    area.setAttribute("aria-label", campo.etichetta);
    area.style.cssText = "width:100%;box-sizing:border-box;background:var(--surface2);border:1px solid var(--linea);border-radius:9px;color:var(--testo);font:600 13px/1.5 'Nunito Sans',sans-serif;padding:8px 10px;margin-top:4px";

    const tasti = doc.createElement("div");
    tasti.style.cssText = "display:flex;gap:6px;margin-top:6px";
    const salva = doc.createElement("button");
    salva.type = "button";
    salva.className = "dc-btn";
    salva.textContent = "Salva";
    const annulla = doc.createElement("button");
    annulla.type = "button";
    annulla.className = "dc-btn ghost";
    annulla.textContent = "Annulla";
    tasti.appendChild(salva);
    tasti.appendChild(annulla);

    nodo.dataset.quadernoArea = "1";
    nodo.style.display = "none";
    riga.appendChild(area);
    riga.appendChild(tasti);
    area.focus();

    const chiudi = () => {
      riga.dataset.quadernoAperto = "0";
      delete nodo.dataset.quadernoArea;
      nodo.style.display = "";
      area.remove();
      tasti.remove();
    };

    annulla.addEventListener("click", () => { chiudi(); scriviEsito("Modifica annullata: non ho scritto niente."); });
    salva.addEventListener("click", () => {
      const dopo = testo(area.value);
      if (dopo === prima) { chiudi(); scriviEsito("Il testo è identico: non ho scritto niente."); return; }
      scriviEsito("Sto salvando «" + campo.etichetta + "»…");
      let esito = null;
      try { esito = o.onSalva ? o.onSalva(campo.chiave, dopo, prima) : null; } catch (e) { scriviEsito("Non ho salvato: " + ((e && e.message) || "errore")); return; }
      const fatto = () => {
        stato[campo.chiave] = { valore: dopo, quando: new Date().toISOString() };
        chiudi();
        disegna();
        scriviEsito("Salvato: «" + campo.etichetta + "» — " + (dopo.length > 40 ? dopo.slice(0, 40) + "…" : dopo));
      };
      if (esito && typeof esito.then === "function") esito.then((ok) => { if (ok === false) scriviEsito("Non ho salvato: il valore non è passato."); else fatto(); }, (e) => scriviEsito("Non ho salvato: " + ((e && e.message) || "errore")));
      else fatto();
    });
  };

  for (const campo of CAMPI_QUADERNO) {
    const riga = trovaRiga(doc, campo);
    if (!riga || riga.dataset.quadernoVivo === "1") continue;
    riga.dataset.quadernoVivo = "1";
    const nodo = nodoValore(riga);
    if (!nodo) continue;
    nodo.style.cursor = "pointer";
    nodo.setAttribute("role", "button");
    nodo.setAttribute("tabindex", "0");
    const apriQui = () => apri(campo, riga, nodo);
    nodo.addEventListener("click", apriQui);
    nodo.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); apriQui(); } });
    annodati.push(campo.chiave);
  }

  return annodati;
}
