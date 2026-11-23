/* Barbell Diva B — PASSO 11: la diagnosi degli esercizi, in funzioni pure.
 *
 * Perche' serve. Quando il Riepilogo volume dice «le schede non portano
 * distretti riconoscibili», nessuno sa QUALE riga ha fallito e perche'. Questa
 * pagina mette una riga di tabella per ogni esercizio della scheda e dichiara:
 * il nome com'e' scritto, cosa risponde il resolver, che distretto e che
 * articolazioni ne escono, se la riga conta nel volume.
 *
 * Regole:
 *  - sola lettura: entra la scheda gia' letta, escono righe. Nessun DOM,
 *    nessun Firestore, nessuna scrittura;
 *  - il nome si mostra COME STA SCRITTO: niente trim, niente nomePulito(),
 *    spazi doppi compresi. Per questo si puo' passare `nomiGrezzi`, l'indice
 *    ricavato dai documenti veri della zona B: la ricostruzione delle schede
 *    (comune/schede-v2.js) toglie gli spazi ai bordi, e qui vogliamo vederli;
 *  - il resolver e' quello vero (comune/riconoscimento-esercizio.js): qui non
 *    si riscrive nessuna regola, si legge la risposta e si dichiara;
 *  - quando la riga non si riconosce non si inventa niente: il motivo e i
 *    candidati, o «nessun candidato».
 */

import { CAMPI_VOLUME, formattaNumero } from "./volume-b.js";
import { FRASI_VUOTO_VOLUME } from "./vista-volume.js";
import { contaNelVolume } from "./tecniche-b.js";
import { catalogoBase, risolviEsercizio } from "./riconoscimento-esercizio.js";
import { muscoliEsercizio } from "./muscoli-b.js";
import { articolazioniDi } from "./articolazioni-b.js";

export const MOTIVO_NESSUNO = "nessun candidato";
export const MOTIVO_AMBIGUO = "ambiguo";
export const MOTIVO_DA_RIGA = "nessuna voce di catalogo: vale il muscolo della riga";

function primoCampo(oggetto, nomi) {
  if (!oggetto || typeof oggetto !== "object") return undefined;
  for (let i = 0; i < nomi.length; i += 1) {
    const nome = nomi[i];
    if (!Object.prototype.hasOwnProperty.call(oggetto, nome)) continue;
    const v = oggetto[nome];
    if (v == null) continue;
    if (typeof v === "string" && !v.trim()) continue;
    return v;
  }
  return undefined;
}

function testo(valore) {
  if (valore == null) return "";
  return String(valore).trim();
}

/* L'indice dei nomi COSI' COME SONO nei documenti della zona B:
 * id esercizio -> nome scritto, senza toccarlo.
 * Si guardano le due forme che la zona B usa: `sheet.exercises` (la scheda) e
 * `exercise` (l'esercizio sciolto di una scheda troppo grande). Vince la prima
 * che arriva: il documento non si riscrive e non si sceglie. */
export function indiceNomiGrezzi(documenti) {
  const indice = Object.create(null);

  function registra(esercizio) {
    if (!esercizio || typeof esercizio !== "object") return;
    const id = testo(primoCampo(esercizio, CAMPI_VOLUME.id));
    if (!id) return;
    if (indice[id] !== undefined) return;
    const grezzo = primoCampo(esercizio, CAMPI_VOLUME.nome);
    if (typeof grezzo !== "string") return;
    indice[id] = grezzo;
  }

  (Array.isArray(documenti) ? documenti : []).forEach((doc) => {
    const dati = doc && doc.dati && typeof doc.dati === "object" ? doc.dati : {};
    const scheda = dati.sheet && typeof dati.sheet === "object" ? dati.sheet : null;
    if (scheda) {
      const esercizi = Array.isArray(scheda.exercises) ? scheda.exercises
        : (Array.isArray(scheda.esercizi) ? scheda.esercizi : []);
      esercizi.forEach(registra);
    }
    registra(dati.exercise);
  });
  return indice;
}

/* Il motivo per cui una riga non ha una voce di catalogo. Null se la voce c'e'. */
export function motivoDellaRiga(trovato) {
  if (!trovato) return MOTIVO_NESSUNO;
  if (trovato.chiave) return null;
  if (trovato.come === "ambiguo") return MOTIVO_AMBIGUO;
  if (trovato.fonte === "distretto della scheda") return MOTIVO_DA_RIGA;
  return MOTIVO_NESSUNO;
}

/* La frase delle articolazioni come va scritta: principale + secondarie,
 * oppure il motivo per cui non ce ne sono. */
export function testoArticolazioni(voce) {
  const art = voce || {};
  if (art.nonMappato) return "non mappato: il catalogo articolare non ha questo nome";
  if (art.cardio) return "cardio: nessuna articolazione";
  if (!art.principale) return "nessuna articolazione principale";
  const secondarie = Array.isArray(art.secondarie) ? art.secondarie : [];
  return art.principale + (secondarie.length ? " · " + secondarie.join(", ") : " · nessuna secondaria");
}

/* DA DOVE ARRIVANO LE SCHEDE. Il Riepilogo volume lo dice gia' in testa con
 * `fonteSchede` («documento del programma (v1)» oppure «documenti v2 ·
 * program-v2-sheet- / -exercise- · legame: …») e con `legameSchede`; qui si
 * legge quella risposta e si traduce in due parole, senza riscriverla.
 * `tipo`: "v1" (schede dentro il documento del programma) | "v2" (schede nei
 * documenti separati) | null (non dichiarato). */
export function origineSchede(riepilogo) {
  const r = riepilogo && typeof riepilogo === "object" ? riepilogo : {};
  const fonte = testo(r.fonteSchede);
  const legame = r.legameSchede && typeof r.legameSchede === "object" ? r.legameSchede : {};
  let tipo = null;
  if (fonte.indexOf("documento del programma (v1)") === 0) tipo = "v1";
  else if (fonte.indexOf("documenti v2") === 0) tipo = "v2";
  return {
    tipo,
    fonte: fonte || null,
    idProgramma: testo(r.profilo && r.profilo.id) || null,
    come: legame.come || null,
    gruppi: legame.gruppi == null ? null : legame.gruppi,
    lette: legame.lette == null ? null : legame.lette,
    legate: legame.legate == null ? null : legame.legate
  };
}

/* La cella «proviene da» di una riga: il tipo di documento e l'id del
 * programma che ha risposto. Una riga sola, sempre la stessa forma. */
export function testoOrigine(origine) {
  const o = origine && typeof origine === "object" ? origine : {};
  const id = testo(o.idProgramma) || "(programma senza id)";
  if (o.tipo === "v1") return "documento del programma (v1) \u00b7 " + id;
  if (o.tipo === "v2") return "documenti v2" + (o.come ? " \u00b7 legame: " + o.come : "") + " \u00b7 " + id;
  return "fonte non dichiarata \u00b7 " + id;
}

/* Le righe di diagnosi. `schede` sono quelle dell'app (comune/schede-v2.js, via
 * riepilogoProgramma) e si leggono con gli stessi campi del Volume
 * (CAMPI_VOLUME), saltando le righe cancellate. La differenza con
 * righeDalleSchede e' una sola: il nome resta com'e' scritto.
 * `opzioni.nomiGrezzi` = indiceNomiGrezzi(documenti) per vedere gli spazi veri. */
export function righeDiagnosi(schede, opzioni) {
  const o = opzioni && typeof opzioni === "object" ? opzioni : {};
  const nomiGrezzi = o.nomiGrezzi && typeof o.nomiGrezzi === "object" ? o.nomiGrezzi : null;
  const origine = o.origine && typeof o.origine === "object" ? o.origine : null;
  const origineTesto = origine ? testoOrigine(origine) : null;
  const out = [];

  (Array.isArray(schede) ? schede : []).forEach((scheda) => {
    if (!scheda || typeof scheda !== "object") return;
    const codice = testo(scheda.codice) || testo(scheda.nome) || "(scheda senza codice)";
    const elenco = Array.isArray(scheda.esercizi) ? scheda.esercizi : [];
    elenco.forEach((e) => {
      if (!e || typeof e !== "object" || e.deletedAt) return;
      const id = testo(primoCampo(e, CAMPI_VOLUME.id));
      /* come volume-b: prima il campo `n` della ricostruzione, poi i nomi
       * lunghi. Nessuno dei due si ripulisce. */
      const dallaScheda = e.n != null && String(e.n) !== "" ? e.n : primoCampo(e, CAMPI_VOLUME.nome);
      const grezzo = nomiGrezzi && id && nomiGrezzi[id] !== undefined ? String(nomiGrezzi[id]) : null;
      /* Il nome che si mostra: il documento vero se lo conosciamo, altrimenti
       * quello che la scheda porta. Mai ripulito. */
      const nome = grezzo != null ? grezzo : String(dallaScheda == null ? "" : dallaScheda);
      const distretto = testo(primoCampo(e, CAMPI_VOLUME.distretto));
      const trovato = risolviEsercizio(nome, { voci: catalogoBase(), distretto: distretto });
      const muscoli = muscoliEsercizio(nome, distretto);
      const art = articolazioniDi(nome);
      out.push({
        id,
        scheda: codice,
        nome,
        origine: origineTesto,
        origineTipo: origine ? origine.tipo : null,
        programma: origine ? origine.idProgramma : null,
        dalDocumento: grezzo != null,
        distrettoRiga: distretto,
        voce: trovato.chiave,
        passo: trovato.come,
        fonte: trovato.fonte,
        motivo: motivoDellaRiga(trovato),
        candidati: Array.isArray(trovato.candidati) ? trovato.candidati.slice() : [],
        primari: muscoli ? muscoli.primari.slice() : [],
        secondari: muscoli ? muscoli.secondari.slice() : [],
        fonteMuscoli: muscoli ? muscoli.fonte : "",
        articolazioni: art,
        articolazioniTesto: testoArticolazioni(art),
        nelVolume: contaNelVolume(e),
        tecnica: Boolean(e.tipo === "tecnica")
      });
    });
  });
  return out;
}

/* I numeri in testa alla pagina: quante lette, quante riconosciute, quanti
 * distretti distinti (primari e secondari insieme, come nella tabella del
 * Riepilogo volume). */
export function riepilogoDiagnosi(righe) {
  const elenco = Array.isArray(righe) ? righe.filter((r) => r && typeof r === "object") : [];
  const distretti = [];
  let riconosciute = 0;
  let senzaDistretto = 0;
  let fuoriVolume = 0;
  let conArticolazioni = 0;
  let senzaArticolazioni = 0;
  let daDocumento = 0;
  const origini = [];
  elenco.forEach((r) => {
    const primari = Array.isArray(r.primari) ? r.primari : [];
    const secondari = Array.isArray(r.secondari) ? r.secondari : [];
    if (primari.length) riconosciute += 1; else senzaDistretto += 1;
    primari.concat(secondari).forEach((d) => {
      if (d && distretti.indexOf(d) === -1) distretti.push(d);
    });
    if (r.nelVolume === false) fuoriVolume += 1;
    const art = r.articolazioni || {};
    if (art.nonMappato || art.cardio || !art.principale) senzaArticolazioni += 1; else conArticolazioni += 1;
    if (r.dalDocumento) daDocumento += 1;
    const chi = r.origine || "";
    if (chi && origini.indexOf(chi) === -1) origini.push(chi);
  });
  distretti.sort((a, b) => a.localeCompare(b, "it"));
  return {
    lette: elenco.length,
    riconosciute,
    senzaDistretto,
    distretti,
    fuoriVolume,
    conArticolazioni,
    senzaArticolazioni,
    daDocumento,
    origini
  };
}

/* LA FRASE DEL RIEPILOGO VOLUME. Stesse stringhe, stessa cascata della vista:
 * prima «nessuna riga da contare», poi «nessun distretto riconosciuto», poi —
 * quando il conto c'e' — la composizione vera per distretto. Se il conto non
 * e' stato fatto la frase e' quella delle righe assenti, non una frase nuova. */
export function fraseRiepilogoVolume(conto) {
  const c = conto && typeof conto === "object" ? conto : null;
  if (!c || !c.righeUtili) {
    if (c && c.righeSenzaNome) {
      return "Nessuna riga da contare: " + c.righeSenzaNome
        + (c.righeSenzaNome === 1 ? " riga letta non porta" : " righe lette non portano")
        + " il nome dell'esercizio, e senza nome il distretto non si riconosce. Il conto non lo inventa.";
    }
    return FRASI_VUOTO_VOLUME.nessunaRiga;
  }
  if (!Array.isArray(c.distretti) || !c.distretti.length) {
    /* PASSO 13: stessa scelta della vista, stessa stringa. */
    return c.righeSenzaSettimane ? FRASI_VUOTO_VOLUME.nessunaSettimana : FRASI_VUOTO_VOLUME.nessunDistretto;
  }
  return "Serie per distretto: "
    + c.distretti.map((d) => d.distretto + " " + formattaNumero(d.dirette) + " dirette").join(" \u00b7 ")
    + " (" + c.righeLette + " righe lette \u00b7 " + c.righeSenzaNome + " senza nome \u00b7 "
    + c.fuoriVolume + " fuori volume)";
}

/* Il testo che finisce negli appunti con «copia tutto»: intestazione, frase del
 * Riepilogo volume, numeri, poi una riga per esercizio. Tab come separatore,
 * cosi' incollandolo in un foglio resta in colonne. */
export function testoDiagnosi(dati) {
  const d = dati && typeof dati === "object" ? dati : {};
  const riepilogo = d.riepilogo || riepilogoDiagnosi(d.righe || []);
  const righe = Array.isArray(d.righe) ? d.righe : [];
  const out = [];
  out.push("Barbell Diva B \u00b7 diagnosi degli esercizi (sola lettura)");
  if (d.quando) out.push("Letta il " + d.quando);
  if (d.programma) out.push("Programma: " + d.programma);
  /* la riga che il Riepilogo volume mette in testa, parola per parola */
  const fonteSchede = d.fonteSchede || (d.origine && d.origine.fonte) || null;
  out.push("fonte schede: " + (fonteSchede || "non dichiarata"));
  out.push("Righe lette: " + riepilogo.lette
    + " \u00b7 riconosciute: " + riepilogo.riconosciute
    + " \u00b7 senza distretto: " + riepilogo.senzaDistretto
    + " \u00b7 distretti distinti: " + riepilogo.distretti.length);
  out.push("Riepilogo volume: " + (d.frase || "(nessuna frase)"));
  out.push("");
  out.push(["Scheda", "Proviene da", "Nome come sta scritto", "Muscolo della riga", "Resolver", "Distretto", "Articolazioni", "Nel volume"].join("\t"));
  righe.forEach((r) => {
    const resolver = r.voce
      ? r.voce + " (" + (r.passo || "?") + ")"
      : "non riconosciuto: " + (r.motivo || MOTIVO_NESSUNO)
        + (r.candidati && r.candidati.length ? " [" + r.candidati.join(" / ") + "]" : "");
    const distretto = r.primari && r.primari.length
      ? r.primari.join(", ") + (r.secondari && r.secondari.length ? " (secondari: " + r.secondari.join(", ") + ")" : "")
      : "nessun distretto";
    out.push([
      r.scheda,
      r.origine || "fonte non dichiarata",
      "\u00AB" + r.nome + "\u00BB",
      r.distrettoRiga || "\u2014",
      resolver,
      distretto,
      r.articolazioniTesto,
      r.nelVolume ? "s\u00EC" : "no"
    ].join("\t"));
  });
  return out.join("\n");
}
