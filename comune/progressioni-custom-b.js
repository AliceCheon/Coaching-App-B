/* Barbell Diva B — le progressioni custom (passo 21).
 *
 * Alice (26/11/2026): «dentro la scheda di progressioni, ogni progressione deve
 * essere visualizzabile, modificabile e duplicabile, in più ci deve essere il
 * tasto "crea progressione custom"».
 *
 * Le 21 voci del tastino e le 13 della scheda sono FORMULE: non si modificano
 * in loco, sennò nessuno sa più quale formula sta usando. Una progressione
 * custom invece è una TABELLA di otto settimane scritta a mano (serie e
 * ripetizioni per settimana), con un nome suo: si crea, si duplica da una
 * formula, si modifica cella per cella, si rinomina e si elimina.
 *
 * Dove vivono: fino al passo 26 dentro il documento del PROGRAMMA che si stava
 * guardando (`programMeta.progressioniCustom`, oppure `program.progressioniCustom`
 * per i programmi v1). Dal passo 31 vivono nella raccolta
 * `bdB_atleti/{uid}/progressioni` (regola pubblicata da Alice il 28/11/2026) e
 * questo modulo resta il MOTORE: normalizza le otto settimane e applica
 * crea · settimane · rinomina · elimina. A scrivere è
 * `comune/scritture-b.js`; a mettere la voce nella raccolta è
 * `comune/progressioni-libreria-b.js`. Il campo dentro il programma si legge
 * ancora solo per la migrazione e per l'Annulla di una voce vecchia.
 *
 * Questo modulo è puro: niente DOM, niente rete, niente scritture. Entra il
 * documento del programma, escono il documento nuovo e la voce di registro;
 * a scrivere è `comune/scritture-b.js` (salvaProgrammaConVersione), con la
 * versione +1, il marchio di B e l'Annulla.
 */
import { MARCHIO_B, versioneDi, idVoceRegistro } from "./modifiche-b.js";
import { CAMPO_CUSTOM, PREFISSO_CUSTOM, SETTIMANE_CUSTOM } from "./progressioni-b.js";

export { CAMPO_CUSTOM, PREFISSO_CUSTOM, SETTIMANE_CUSTOM };

export const NOME_MASSIMO = 60;
export const CELLA_MASSIMA = 24;

/* Il testo come lo scrive Alice: spazi ai bordi tolti, a capo dentro una cella
 * diventano uno spazio (una cella della tabella è una riga sola). */
function testo(valore) {
  if (valore == null) return "";
  return String(valore).replace(/\s+/g, " ").trim();
}

/* Dove sta l'elenco dentro il documento: `programMeta` (v2) o `program` (v1).
 * Il programma già letto dalla pagina è il meta "nudo": in quel caso il campo
 * sta sulla radice dell'oggetto. */
function chiaveContenitore(dati) {
  const d = dati || {};
  if (d.programMeta && typeof d.programMeta === "object") return "programMeta";
  if (d.program && typeof d.program === "object") return "program";
  return "";
}

function contenitore(dati) {
  const k = chiaveContenitore(dati);
  return k ? dati[k] : (dati || {});
}

/* Una voce custom com'è nel documento, ripulita: otto settimane sempre, anche
 * quando il documento ne porta meno. Una cella che non c'è resta vuota e la
 * tabella la dichiara con un trattino: non si inventa uno zero. */
function normalizzaVoce(grezza, indice, quante) {
  const v = grezza && typeof grezza === "object" ? grezza : {};
  const settimane = [];
  const lette = Array.isArray(v.settimane) ? v.settimane : [];
  for (let w = 0; w < SETTIMANE_CUSTOM; w += 1) {
    const s = lette[w] && typeof lette[w] === "object" ? lette[w] : {};
    settimane.push({ serie: testo(s.serie), ripetizioni: testo(s.ripetizioni) });
  }
  const nome = testo(v.nome) || ("Progressione custom " + (indice + 1));
  return {
    id: testo(v.id) || ("pc-" + (indice + 1) + "-" + quante),
    nome: nome,
    da: testo(v.da),
    settimane: settimane
  };
}

/* L'elenco delle custom di UN documento (vecchia posizione dentro il
 * programma), sempre un array (vuoto se non ce ne sono). Accetta sia il
 * documento vero sia il meta già letto dalla pagina. */
export function elencoCustom(dati) {
  const c = contenitore(dati) || {};
  const grezzo = Array.isArray(c[CAMPO_CUSTOM]) ? c[CAMPO_CUSTOM] : [];
  return grezzo.map((v, i) => normalizzaVoce(v, i, grezzo.length)).filter((v) => v.nome);
}

/* Le otto coppie [serie, ripetizioni] di una voce custom, come le vuole il
 * motore delle schede. */
export function coppieCustom(voce) {
  const v = voce || {};
  const out = [];
  for (let w = 0; w < SETTIMANE_CUSTOM; w += 1) {
    const s = (Array.isArray(v.settimane) ? v.settimane[w] : null) || {};
    out.push([testo(s.serie), testo(s.ripetizioni)]);
  }
  return out;
}

/* Otto coppie valide? Serve al motore quando la pagina gliele passa: se non
 * sono otto, o se non sono coppie, non si scrive niente. */
export function coppieValide(coppie) {
  if (!Array.isArray(coppie) || coppie.length !== SETTIMANE_CUSTOM) return null;
  const out = [];
  for (let w = 0; w < SETTIMANE_CUSTOM; w += 1) {
    const c = coppie[w];
    if (!Array.isArray(c) || c.length < 2) return null;
    out.push([testo(c[0]), testo(c[1])]);
  }
  return out;
}

/* Una tabella tutta vuota non è una progressione: non si salva. */
export function tabellaVuota(coppie) {
  const c = Array.isArray(coppie) ? coppie : [];
  return !c.some((x) => testo(x && x[0]) !== "" || testo(x && x[1]) !== "");
}

/* Il nome: quello scritto, o uno di riserva se è vuoto. */
function nomeBuono(valore, riserva) {
  const t = testo(valore);
  if (!t) return testo(riserva);
  return t.slice(0, NOME_MASSIMO);
}

/* Una cella: testo accorciato, o un rifiuto se supera la misura. */
function cellaBuona(valore) {
  const t = testo(valore);
  if (t.length > CELLA_MASSIMA) {
    return { ok: false, motivo: "«" + t.slice(0, 12) + "…» è troppo lungo per una cella (massimo " + CELLA_MASSIMA + " caratteri)" };
  }
  return { ok: true, valore: t };
}

function daCoppie(coppie) {
  const c = coppieValide(coppie) || [];
  return c.map((x) => ({ serie: x[0], ripetizioni: x[1] }));
}

function nuovoId(quando, quante) {
  return "pc-" + String(quando || "").replace(/[^0-9]/g, "").slice(-14) + "-" + String(quante + 1);
}

function trova(elenco, id) {
  const k = testo(id);
  for (let i = 0; i < elenco.length; i += 1) if (elenco[i].id === k) return i;
  return -1;
}

/* Il documento nuovo: il campo scritto nel contenitore giusto, la versione +1
 * e il marchio di B, così la Copia da A non lo sovrascrive. */
function chiudiProgramma(dati, elenco, quando, uid) {
  const nuovo = Object.assign({}, dati);
  const k = chiaveContenitore(dati);
  const pulito = elenco.map((v) => ({ id: v.id, nome: v.nome, da: v.da || "", settimane: v.settimane }));
  if (k) nuovo[k] = Object.assign({}, dati[k], { [CAMPO_CUSTOM]: pulito, updatedAt: quando });
  else nuovo[CAMPO_CUSTOM] = pulito;
  nuovo.versione = versioneDi(dati) + 1;
  nuovo[MARCHIO_B] = { quando: quando, da: uid == null ? null : String(uid), ultima: "progressioni-custom" };
  return nuovo;
}

/* L'azione, una sola: crea · duplica · rinomina · cella · settimane · elimina.
 *
 *   crea      { nome?, coppie? }               una tabella nuova (vuota o copiata)
 *   duplica   { id, nome? }                    copia una voce che c'è
 *   rinomina  { id, nome }
 *   cella     { id, settimana 1..8, campo "serie"|"ripetizioni", valore }
 *   settimane { id, coppie }                   la tabella intera (l'editor)
 *   elimina   { id }
 *
 * Ritorna { ok:true, dati, voce, custom, elenco, testo } oppure { ok:false,
 * motivo }. `prima` e `dopo` della voce portano l'elenco INTERO, così
 * l'Annulla rimetterlo in un colpo solo, creazioni ed eliminazioni comprese. */
export function cambiaProgressioni(dati, richiesta, opzioni) {
  const r = richiesta || {};
  const o = opzioni || {};
  if (!dati || typeof dati !== "object") return { ok: false, motivo: "questo documento non è un programma" };
  const azione = testo(r.azione);
  const quando = o.quando ? String(o.quando) : new Date().toISOString();
  const uid = o.uid == null ? null : String(o.uid);
  const prima = elencoCustom(dati);
  const elenco = prima.map((v) => ({ id: v.id, nome: v.nome, da: v.da, settimane: v.settimane.map((s) => Object.assign({}, s)) }));
  let custom = null;
  let testoVoce = "";

  if (azione === "crea" || azione === "duplica") {
    let coppie;
    let da = "";
    let riserva = "Progressione custom " + (elenco.length + 1);
    if (azione === "duplica") {
      const i = trova(prima, r.id);
      if (i < 0) return { ok: false, motivo: "la progressione da duplicare non c'è più: non ho scritto niente" };
      coppie = coppieCustom(prima[i]);
      da = prima[i].da || prima[i].id;
      riserva = "Copia di " + prima[i].nome;
    } else {
      coppie = coppieValide(r.coppie) || [];
      if (!coppie.length) {
        coppie = [];
        for (let w = 0; w < SETTIMANE_CUSTOM; w += 1) coppie.push(["", ""]);
      }
      da = testo(r.da);
    }
    if (tabellaVuota(coppie)) {
      return { ok: false, motivo: "la tabella è tutta vuota: scrivi almeno una serie o una ripetizione prima di salvare" };
    }
    const nome = nomeBuono(r.nome, riserva);
    if (!nome) return { ok: false, motivo: "serve un nome per la progressione custom" };
    custom = { id: nuovoId(quando, elenco.length), nome: nome, da: da, settimane: daCoppie(coppie) };
    elenco.push(custom);
    testoVoce = azione === "duplica"
      ? "progressione custom «" + nome + "» creata copiando «" + riserva.replace(/^Copia di /, "") + "»"
      : "progressione custom «" + nome + "» creata";
  } else if (azione === "rinomina") {
    const i = trova(prima, r.id);
    if (i < 0) return { ok: false, motivo: "la progressione custom non c'è più: non ho scritto niente" };
    const nome = nomeBuono(r.nome, prima[i].nome);
    if (!nome) return { ok: false, motivo: "il nome non può restare vuoto" };
    if (nome === prima[i].nome) return { ok: false, motivo: "il nome non è cambiato" };
    elenco[i].nome = nome;
    custom = elenco[i];
    testoVoce = "progressione custom «" + prima[i].nome + "» rinominata «" + nome + "»";
  } else if (azione === "cella") {
    const i = trova(prima, r.id);
    if (i < 0) return { ok: false, motivo: "la progressione custom non c'è più: non ho scritto niente" };
    const settimana = Number(r.settimana);
    if (!Number.isInteger(settimana) || settimana < 1 || settimana > SETTIMANE_CUSTOM) {
      return { ok: false, motivo: "la settimana va da 1 a " + SETTIMANE_CUSTOM + ": non ho scritto niente" };
    }
    const campo = testo(r.campo);
    if (campo !== "serie" && campo !== "ripetizioni") {
      return { ok: false, motivo: "in una cella si scrivono serie o ripetizioni" };
    }
    const cella = cellaBuona(r.valore);
    if (!cella.ok) return { ok: false, motivo: cella.motivo };
    const s = elenco[i].settimane[settimana - 1];
    if (s[campo] === cella.valore) return { ok: false, motivo: "la cella non è cambiata" };
    s[campo] = cella.valore;
    custom = elenco[i];
    testoVoce = "progressione custom «" + prima[i].nome + "» · S" + settimana + " " + campo + ": «" +
      (prima[i].settimane[settimana - 1][campo] || "vuoto") + "» → «" + (cella.valore || "vuoto") + "»";
  } else if (azione === "settimane") {
    const i = trova(prima, r.id);
    if (i < 0) return { ok: false, motivo: "la progressione custom non c'è più: non ho scritto niente" };
    const coppie = coppieValide(r.coppie);
    if (!coppie) return { ok: false, motivo: "la tabella non porta le otto settimane: non ho scritto niente" };
    if (tabellaVuota(coppie)) return { ok: false, motivo: "la tabella è tutta vuota: una progressione senza valori non serve" };
    const primaCoppie = coppieCustom(prima[i]);
    const cambiate = [];
    for (let w = 0; w < SETTIMANE_CUSTOM; w += 1) {
      if (primaCoppie[w][0] !== coppie[w][0] || primaCoppie[w][1] !== coppie[w][1]) cambiate.push(w + 1);
    }
    /* Il nome si può cambiare nella stessa finestra: stessa scrittura, stessa
     * voce di registro, stesso Annulla. Se cambia SOLO il nome va bene lo
     * stesso: è una modifica come le altre. */
    const nomeScritto = testo(r.nome);
    const rinominata = nomeScritto && nomeScritto !== prima[i].nome;
    if (!cambiate.length && !rinominata) return { ok: false, motivo: "la tabella non è cambiata" };
    if (cambiate.length) elenco[i].settimane = daCoppie(coppie);
    if (rinominata) elenco[i].nome = nomeScritto.slice(0, NOME_MASSIMO);
    custom = elenco[i];
    testoVoce = "progressione custom «" + prima[i].nome + (rinominata ? "» rinominata «" + elenco[i].nome : "") + "»" +
      (cambiate.length
        ? " · cambiate " + (cambiate.length === 1 ? "la settimana S" + cambiate[0] : "le settimane " + cambiate.map((x) => "S" + x).join(", "))
        : " · solo il nome");
  } else if (azione === "elimina") {
    const i = trova(prima, r.id);
    if (i < 0) return { ok: false, motivo: "la progressione custom non c'è più: niente da eliminare" };
    elenco.splice(i, 1);
    testoVoce = "progressione custom «" + prima[i].nome + "» eliminata · le schede scritte non cambiano";
  } else {
    return { ok: false, motivo: "azione sconosciuta: non ho scritto niente" };
  }

  const nuovo = chiudiProgramma(dati, elenco, quando, uid);
  const voce = {
    idVoce: idVoceRegistro(quando),
    quando: quando,
    tipo: "progressioni-custom",
    origine: "modifica-fatta-in-B",
    programma: testo(r.idProgramma),
    scheda: "",
    codice: "",
    esercizio: "",
    idEsercizio: "",
    settimana: azione === "cella" ? Number(r.settimana) : null,
    campo: "progressioni-custom",
    azione: azione,
    nome: custom ? custom.nome : "",
    prima: prima.map((v) => ({ id: v.id, nome: v.nome, da: v.da, settimane: v.settimane.map((s) => Object.assign({}, s)) })),
    dopo: elenco.map((v) => ({ id: v.id, nome: v.nome, da: v.da, settimane: v.settimane.map((s) => Object.assign({}, s)) })),
    dopoTesto: testoVoce,
    versionePrima: versioneDi(dati),
    versioneDopo: nuovo.versione
  };
  return { ok: true, dati: nuovo, voce: voce, custom: custom, elenco: elenco, testo: testoVoce };
}

/* Il riassunto di una custom per la riga dell'elenco: poche parole, niente
 * numeri inventati (le settimane vuote non si contano come zeri). */
export function riassuntoCustom(voce) {
  const v = voce || {};
  const coppie = coppieCustom(v);
  const piene = coppie.filter((c) => c[0] !== "" || c[1] !== "").length;
  if (!piene) return "tabella vuota";
  const prima = coppie[0];
  const da = prima[0] && prima[1] ? "da " + prima[0] + "×" + prima[1] : (prima[0] ? prima[0] + " serie" : prima[1] + " rip");
  return piene + (piene === 1 ? " settimana scritta" : " settimane scritte") + " · " + da + " in S1";
}
