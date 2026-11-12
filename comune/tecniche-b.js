/* Barbell Diva B — le tecniche di intensita' come riga figlia (Fase 1, 12/11/2026).
 *
 * Cosa e': la riga figlia che Alice ha approvato nel mockup v2. Vive DENTRO
 * l'elenco esercizi della scheda, subito sotto il padre:
 *
 *   { tipo: "tecnica", id, padreId,
 *     tecnica: "rest-pause" | "myo-reps" | "drop-set",
 *     settimane: [{ serie: 1, reps: "rest pause" }, ...],   // testo libero
 *     parametri: { ...della tecnica... },
 *     nota: { auto: "...", manuale: null | "..." },
 *     contaVolume: false }
 *
 * Regole del filone (valgono qui):
 *  - scritture solo su bdB_atleti (la scheda passa da modifiche-b.js);
 *  - schede esistenti identiche: senza tecnica la riga figlia NON esiste;
 *  - non conta nel volume e non conta come esercizio (contaVolume false,
 *    schede-v2.js la esclude dai numeri);
 *  - la nota mostrata e' manuale || auto; i parametri restano separati.
 */

const TECNICHE = Object.freeze({
  "rest-pause": Object.freeze({
    nome: "REST-PAUSE",
    campi: Object.freeze([
      { chiave: "riprese", etichetta: "Riprese", tipo: "numero" },
      { chiave: "recuperoSec", etichetta: "Recupero", tipo: "secondi", unita: "\u2033" },
      { chiave: "maxRiprese", etichetta: "Max riprese", tipo: "numero", vuotoOk: true }
    ]),
    /* Parametri di nascita (il mockup v2). */
    parametri: function () { return { riprese: 5, recuperoSec: 20, maxRiprese: null }; }
  }),
  "myo-reps": Object.freeze({
    nome: "MYO-REPS",
    /* Attivazione e RIR sono INTERVALLI di testo ("12-15", "3-4"): la
     * validazione accetta numero o numero-numero, rifiuta il resto. */
    campi: Object.freeze([
      { chiave: "attivazione", etichetta: "Attivazione", tipo: "testo", unita: "reps" },
      { chiave: "rir", etichetta: "RIR", tipo: "testo" },
      { chiave: "ripMini", etichetta: "Mini-serie", tipo: "numero", unita: "reps" },
      { chiave: "recupero", etichetta: "Recupero", tipo: "respiri", unita: "respiri" },
      { chiave: "maxMini", etichetta: "Max mini-serie", tipo: "numero", vuotoOk: true }
    ]),
    parametri: function () { return { attivazione: "12-15", rir: "3-4", ripMini: 5, recupero: { respiri: 3 }, maxMini: null }; }
  }),
  "drop-set": Object.freeze({
    nome: "DROP SET",
    /* Una percentuale per scalata: [20, 40] = due scalate al -20% e -40%. */
    campi: Object.freeze([
      { chiave: "scalate", etichetta: "Scalate", tipo: "scalate" }
    ]),
    parametri: function () { return { scalate: [20, 40] }; }
  })
});

export function nomeTecnica(id) {
  const t = TECNICHE[String(id || "")];
  return t ? t.nome : "";
}

export function eTecnica(e) {
  return Boolean(e) && typeof e === "object" && e.tipo === "tecnica";
}

/* La riga figlia e' legata al padre SOLO da padreId: nessun nome, nessun
 * distretto. Senza padreId non e' una riga tecnica. */
export function eFigliaDi(e, idPadre) {
  return eTecnica(e) && String(e.padreId || "") === String(idPadre || "");
}

/* La nota automatica, composta dai parametri. Il testo e' quello del mockup
 * v2 approvato da Alice. */
export function notaAutomatica(tecnica, parametri) {
  const p = parametri && typeof parametri === "object" ? parametri : {};
  if (tecnica === "rest-pause") {
    const rec = Number(p.recuperoSec) || 20;
    return "Serie tocca il cedimento, poi " + rec + "\u2033 e " + (Number(p.riprese) || 5)
      + " ripetizioni, ripeti finché non chiudi più " + (Number(p.riprese) || 5)
      + ": lì ti fermi. Le riprese sono tecnica: fuori dal volume.";
  }
  if (tecnica === "myo-reps") {
    const att = String(p.attivazione == null ? "" : p.attivazione) || "12-15";
    const rir = String(p.rir == null ? "" : p.rir) || "3-4";
    const respiri = p.recupero && Number(p.recupero.respiri) || 3;
    const mini = Number(p.ripMini) || 5;
    return "Serie attivatrice da " + att + " ripetizioni a RIR " + rir + ". Poi "
      + respiri + " respiri e mini-serie da " + mini
      + ", ripeti finché non chiudi più " + mini + ": lì ti fermi. Le mini-serie sono tecniche: fuori dal volume.";
  }
  if (tecnica === "drop-set") {
    const sc = Array.isArray(p.scalate) ? p.scalate : [20, 40];
    const parti = sc.map((s, i) => "scalata " + (i + 1) + " al \u2212" + (Number(s) || 0) + "%");
    return "Serie tocca il cedimento, poi " + parti.join(" e ")
      + ", senza pausa. Le scalate sono tecniche: fuori dal volume.";
  }
  return "";
}

/* La riga figlia nuova: settimane come le scrive il mockup (una voce per
 * settimana, serie = 1, reps = nome della tecnica, testo modificabile). */
export function rigaTecnica(tecnica, idPadre, settimane, generaId) {
  const def = TECNICHE[String(tecnica || "")];
  if (!def) return null;
  const parametri = def.parametri();
  const quante = Math.max(8, Array.isArray(settimane) ? settimane.length : 0);
  const settimaneNuove = [];
  for (let k = 0; k < quante; k += 1) {
    const gia = (settimane && settimane[k]) || {};
    settimaneNuove.push({
      serie: gia.serie == null || gia.serie === "" ? 1 : gia.serie,
      reps: gia.reps == null || gia.reps === "" ? def.nome.toLowerCase().replace(/-/g, " ") : String(gia.reps)
    });
  }
  return {
    tipo: "tecnica",
    id: String(generaId || ("bdb-tec-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8))),
    padreId: String(idPadre || ""),
    tecnica: String(tecnica),
    settimane: settimaneNuove,
    parametri: parametri,
    nota: { auto: notaAutomatica(String(tecnica), parametri), manuale: null },
    contaVolume: false
  };
}

/* Cambiare tecnica: i parametri ripartono dai valori di nascita della tecnica
 * nuova, le settimane RESTANO (serie e testo che Alice ha scritto). */
export function tecnicaCambiata(riga, tecnicaNuova) {
  const def = TECNICHE[String(tecnicaNuova || "")];
  if (!riga || !def) return null;
  return Object.assign({}, riga, {
    tecnica: String(tecnicaNuova),
    parametri: def.parametri(),
    nota: { auto: notaAutomatica(String(tecnicaNuova), def.parametri()), manuale: riga.nota && riga.nota.manuale != null ? String(riga.nota.manuale) : null }
  });
}

/* La nota mostrata: la mano di Alice vince, sempre. */
export function notaVisibile(riga) {
  if (!riga || !riga.nota) return "";
  if (riga.nota.manuale != null && String(riga.nota.manuale).trim() !== "") return String(riga.nota.manuale);
  return String(riga.nota.auto || "");
}

/* La cella REC della riga tecnica: dai parametri, NON scritta a mano.
 * Rest-Pause: i secondi fra le riprese («20-25″» se intervallo, «20″» se
 * uno). Myo-Reps: «3 resp.». Drop Set: «senza pausa». */
export function recTecnica(riga) {
  if (!riga) return "";
  const p = riga.parametri || {};
  if (riga.tecnica === "rest-pause") {
    const v = p.recuperoSec;
    if (typeof v === "string" && v.trim() !== "") return v.trim();
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n + "\u2033" : "";
  }
  if (riga.tecnica === "myo-reps") {
    const r = p.recupero && Number(p.recupero.respiri) || 3;
    return r + " resp.";
  }
  if (riga.tecnica === "drop-set") return "senza pausa";
  return "";
}

/* La validazione dei parametri, rigo per rigo. Numeri interi >= 0; attivazione
 * e RIR accettano intervallo "n" o "n-n"; scalate: percentuali 1..95. */
export function parametriValidi(tecnica, parametri) {
  const p = parametri && typeof parametri === "object" ? parametri : {};
  const intervalloOk = function (v) {
    const t = String(v == null ? "" : v).trim();
    if (t === "") return { ok: false, motivo: "il campo è vuoto" };
    if (!/^\d{1,3}(-\d{1,3})?$/.test(t)) return { ok: false, motivo: "si scrive 12 oppure 12-15" };
    return { ok: true };
  };
  const numeroOk = function (v, nome, massimo) {
    if (v == null || v === "") return massimo === 0 ? { ok: false, motivo: "il campo è vuoto" } : { ok: true, vuoto: true };
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0) return { ok: false, motivo: nome + " si scrive con un numero" };
    if (massimo && n > massimo) return { ok: false, motivo: nome + " sta sotto " + massimo };
    return { ok: true };
  };
  if (tecnica === "rest-pause") {
    let e = numeroOk(p.riprese, "le riprese"); if (!e.ok) return e;
    e = numeroOk(p.recuperoSec, "il recupero", 600); if (!e.ok) return e;
    return numeroOk(p.maxRiprese, "le max riprese");
  }
  if (tecnica === "myo-reps") {
    let e = intervalloOk(p.attivazione); if (!e.ok) return e;
    e = intervalloOk(p.rir); if (!e.ok) return { ok: false, motivo: "il RIR " + e.motivo };
    e = numeroOk(p.ripMini, "le mini-serie"); if (!e.ok) return e;
    if (!p.recupero || !Number.isInteger(Number(p.recupero.respiri)) || Number(p.recupero.respiri) < 0) return { ok: false, motivo: "il recupero si scrive in respiri" };
    return numeroOk(p.maxMini, "le max mini-serie");
  }
  if (tecnica === "drop-set") {
    const sc = Array.isArray(p.scalate) ? p.scalate : [];
    if (!sc.length) return { ok: false, motivo: "serve almeno una scalata" };
    for (let i = 0; i < sc.length; i += 1) {
      const n = Number(sc[i]);
      if (!Number.isFinite(n) || n < 1 || n > 95) return { ok: false, motivo: "la scalata " + (i + 1) + " si scrive in percentuale da 1 a 95" };
    }
    return { ok: true };
  }
  return { ok: false, motivo: "tecnica sconosciuta" };
}

/* L'etichetta dei pulsanti del pannello: le tre voci del mockup. */
export function elencoTecniche() {
  return Object.keys(TECNICHE).map((k) => ({ id: k, nome: TECNICHE[k].nome }));
}
