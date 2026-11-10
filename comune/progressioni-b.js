/* Barbell Diva B -- le progressioni del v31, copiate alla lettera.

Sono due liste, e sono diverse: il v31 le usa in due punti diversi e non le ha
mai unite. Qui restano separate, con gli stessi nomi di prima, perche' il
comportamento da riprodurre e' quello vero e non una versione "migliorata".

  PROG + PROGRULE  -> pc/index.html r.7252-7298: il tastino "+" della riga
                      (r.9853, titolo "inserisci progressione sotto") e il
                      pulsante "Applica progressione" della riga, che aprono il
                      pannello r.7305-7345. 21 voci.
  PRG              -> pc/index.html r.9043-9060: "Applica progressione a tutta
                      la scheda" (r.3771, comando r.9959-10024). 13 voci.
                      E' qui che vive "Custom" (r.9049): "Copia la settimana 1
                      su tutte le settimane".

I valori fissi P sono quelli di r.7145, identici (`var P={mini:3,pausa:15,
drop:20,blocchi:3,bloccoRip:3,pausaBlocco:12}`): non c'e' nessun pannello che li
cambi, quindi non c'e' niente da costruire. Se un giorno il v31 li rendera'
modificabili, si cambia questo oggetto e basta.

Niente DOM e niente rete: entrano le 8 settimane di un esercizio, escono le 8
coppie [serie, ripetizioni] che il v31 scriverebbe nelle celle. Cosi' le prove
possono confrontare i numeri senza aprire un browser.
*/

/* r.7145, valori fissi. */
export const P = Object.freeze({
  mini: 3,
  pausa: 15,
  drop: 20,
  blocchi: 3,
  bloccoRip: 3,
  pausaBlocco: 12
});

/* r.7252-7274: le 21 voci del tastino "+", nell'ordine del v31. */
export const PROG = Object.freeze([
  ["linear-load", "Carico lineare", "stesse serie e rip, sale solo il carico"],
  ["double-progression", "Doppia progressione", "+1 rip fino al tetto, poi +1 serie"],
  ["volume-progression", "Progressione di volume", "+1 serie ogni 2 settimane"],
  ["rir-progression", "Autoregolazione RIR", "serie uguali, si stringe lontano dal cedimento"],
  ["undulating-dup", "Ondulazione (DUP)", "pesante / leggero che si alternano"],
  ["step-loading", "Scalini di carico", "-1 rip ogni 2 settimane, si sale a scalini"],
  ["reverse-pyramid", "Piramide inversa", "si parte pesanti e si alleggerisce"],
  ["top-set-backoff", "Top set + backoff", "2 top set + serie di ritorno"],
  ["intensity-progression", "Progressione di intensità", "-1 serie e -1 rip ogni 2 settimane"],
  ["peak-taper", "Peaking e taper", "sale per 6 settimane, poi scarico"],
  ["unilateral-wave", "Ondulazione unilaterale", "settimane alternate sopra/sotto"],
  ["deload-cycle", "Ciclo di scarico 3:1", "scarico alla S4 e alla S8"],
  ["heavy-cluster", "Cluster pesante", "3 blocchi da 3 rip per serie"],
  ["density-progression", "Progressione di densità", "stesse serie, recupero che scende"],
  ["micro-loading", "Micro-carichi", "carico +1,25% a settimana"],
  ["rpe-progression", "RPE autoregolato", "+1 rip ogni 3 settimane"],
  ["rest-pause", "Rest-pause", "1 serie + riprese"],
  ["ascending-pyramid", "Piramide ascendente", "si parte leggeri e si sale"],
  ["intensity-test12-wave", "Intensità: test 12rm + ondata 10-x", "S1 test, poi ondata 10-8-x"],
  ["intensity-test10-climb", "Intensità: test 10rm + salita 6\u21929", "S1 test 10rm, poi 6\u21929"],
  ["intensity-midcycle-test", "Intensità: test a metà ciclo", "test alla S5, poi ondata"]
]);

/* r.7275-7298: una regola per voce. `b` e' la base della riga (serie e reps
 * della settimana 1), `w` e' la settimana da 1 a 8. Ritorna [serie, reps].
 *
 * Quattro voci tornano la base com'e' (Carico lineare, Autoregolazione RIR,
 * Progressione di densità, Micro-carichi): nel v31 non toccano le celle, e qui
 * non le toccano uguale. Restano nell'elenco perche' ci sono nel v31. */
export const PROGRULE = Object.freeze({
  "linear-load": function (b, w) { return [b.s, b.r]; },
  "double-progression": function (b, w) { var t = b.r.split("-"); var lo = +t[0] || 8; var hi = +(t[1] || (lo + 2)); var r = Math.min(hi, lo + w - 1); return [b.s, String(r)]; },
  "volume-progression": function (b, w) { return [b.s + Math.floor((w - 1) / 2), b.r]; },
  "rir-progression": function (b, w) { return [b.s, b.r]; },
  "undulating-dup": function (b, w) { return w % 2 ? [b.s + 1, b.r] : [b.s, b.r]; },
  "step-loading": function (b, w) { var t = b.r.split("-"); var lo = +t[0] || 8; return [b.s, String(Math.max(4, lo - Math.floor((w - 1) / 2)))]; },
  "reverse-pyramid": function (b, w) { var t = b.r.split("-"); var lo = +t[0] || 8; return [b.s, String(Math.max(4, lo + w - 1))]; },
  "top-set-backoff": function (b, w) { return ["2+" + b.s, b.r]; },
  "intensity-progression": function (b, w) { return [Math.max(1, b.s - Math.floor((w - 1) / 2)), b.r]; },
  "peak-taper": function (b, w) { return [w >= 7 ? Math.max(1, b.s - 1) : b.s, b.r]; },
  "unilateral-wave": function (b, w) { return w % 2 ? [b.s + 1, b.r] : [b.s, b.r]; },
  "deload-cycle": function (b, w) { return (w === 4 || w === 8) ? [Math.max(1, b.s - 1), b.r] : [b.s, b.r]; },
  "heavy-cluster": function (b, w) { return [String(P.blocchi), "\u00d7" + P.bloccoRip + " /" + P.pausaBlocco + "\""]; },
  "density-progression": function (b, w) { return [b.s, b.r]; },
  "micro-loading": function (b, w) { return [b.s, b.r]; },
  "rpe-progression": function (b, w) { var t = b.r.split("-"); var lo = +t[0] || 8; return [b.s, String(lo + Math.floor((w - 1) / 3))]; },
  "rest-pause": function (b, w) { return ["1+" + P.mini, b.r + " ced +" + P.mini + "\u00d7" + P.bloccoRip]; },
  "ascending-pyramid": function (b, w) { var t = b.r.split("-"); var lo = +t[0] || 8; return [b.s, String(Math.max(4, lo + (8 - w)))]; },
  "intensity-test12-wave": function (b, w) { return w === 1 ? ["1", "test 12rm \u2192 8"] : ["1", "10-8-x"]; },
  "intensity-test10-climb": function (b, w) { return w === 1 ? ["1", "test 10rm \u2192 6"] : ["3", String(6 + Math.min(3, w - 2))]; },
  "intensity-midcycle-test": function (b, w) { return w === 5 ? ["1", "test 12rm \u2192 8"] : ["1", "10-8-x"]; }
});

/* r.9043-9060: le 13 voci della scheda intera. `w` e' la tabella esplicita
 * delle 8 settimane, gia' scritta nel v31; `w: null` vuol dire "prendi quello
 * che c'e' gia' in cella" (r.9992), cioe' la settimana 1 copiata su tutte.
 * L'id e' la POSIZIONE nell'elenco, come nel v31 (r.10011 usa `data-i`). */
export const PRG = Object.freeze([
  { id: "0", n: "Forza neurale", g: "Base", d: "Carico alto e poche ripetizioni: le settimane salgono di carico restando sullo stesso range.",
    w: [["4", "3"], ["4", "3"], ["5", "3"], ["5", "3"], ["5", "2"], ["4", "3"], ["3", "3"], ["3", "2"]] },
  { id: "1", n: "Range 8-10 \u2192 8-8", g: "Base", d: "Si parte da 8-10 ripetizioni e il range si stringe verso 8-8 a carico crescente.",
    w: [["3", "8-10"], ["3", "8-10"], ["3", "8-9"], ["3", "8-9"], ["3", "8-8"], ["3", "8-8"], ["3", "8-8"], ["3", "8-8"]] },
  { id: "2", n: "Top Set + Back-Off", g: "Base", d: "Una serie top pesante, poi back-off pi\u00f9 leggeri e pi\u00f9 voluminosi.",
    w: [["3", "4-6 + 8-8"], ["3", "4-6 + 8-8"], ["3", "4-6 + 8-10"], ["3", "4-6 + 8-10"], ["3", "4-6 + 8-10"], ["3", "4-6 + 8-12"], ["3", "3-5 + 8-12"], ["3", "3-5 + 8-12"]] },
  { id: "3", n: "AMRAP / Rest-Pause", g: "Base", d: "Serie a esaurimento tecnico con micro-recuperi per accumulare volume.",
    w: [["2", "AMRAP"], ["2", "AMRAP"], ["3", "AMRAP"], ["3", "AMRAP"], ["3", "AMRAP"], ["3", "AMRAP"], ["3", "AMRAP"], ["3", "AMRAP"]] },
  { id: "4", n: "Percentuale & Settimane", g: "Base", d: "Carico in percentuale del massimale, distribuito settimana per settimana.",
    w: [["3", "8 @70%"], ["3", "8 @72%"], ["3", "8 @75%"], ["3", "8 @78%"], ["3", "8 @80%"], ["3", "6 @82%"], ["3", "6 @85%"], ["2", "6 @85%"]] },
  { id: "5", n: "Custom", g: "Custom", d: "Copia la settimana 1 su tutte le settimane: poi aggiusti tu cella per cella.", w: null },
  { id: "6", n: "Rep-range", g: "Custom", d: "Il range di ripetizioni si stringe di settimana in settimana.",
    w: [["3", "12-15"], ["3", "12-15"], ["3", "10-12"], ["3", "10-12"], ["3", "8-10"], ["3", "8-10"], ["3", "6-8"], ["3", "6-8"]] },
  { id: "7", n: "Reps range vol fisso", g: "Custom", d: "Volume fermo \u2014 stesse serie e stesse reps \u2014 e sale soltanto il carico.", w: null },
  { id: "8", n: "Reps range 10-12", g: "Custom", d: "Blocco di volume: 10-12 ripetizioni, il carico sale quando chiudi il range.",
    w: [["3", "10-12"], ["3", "10-12"], ["3", "10-12"], ["3", "10-12"], ["3", "10-12"], ["3", "10-12"], ["3", "10-12"], ["3", "10-12"]] },
  { id: "9", n: "Attivazione 10-2", g: "Attivazione", d: "Serie di attivazione ad alte ripetizioni che scendono fino a serie da 2.",
    w: [["1", "10"], ["2", "10"], ["2", "8"], ["2", "6"], ["2", "5"], ["2", "4"], ["2", "3"], ["2", "2"]] },
  { id: "10", n: "Attivazione 10-15", g: "Attivazione", d: "Riscaldamento strutturato in serie da 10-15 ripetizioni leggere.",
    w: [["2", "10-15"], ["2", "10-15"], ["2", "10-15"], ["2", "10-15"], ["2", "10-15"], ["2", "10-15"], ["2", "10-15"], ["2", "10-15"]] },
  { id: "11", n: "Pesante 4-6", g: "Intensit\u00e0", d: "Blocco di forza: 4-6 ripetizioni, carico alto e recuperi pieni.",
    w: [["4", "4-6"], ["4", "4-6"], ["4", "4-6"], ["5", "4-6"], ["4", "4-6"], ["4", "4-6"], ["3", "4-6"], ["3", "4-6"]] },
  { id: "12", n: "Top Set + Back-Off 4-6 / 8-8", g: "Intensit\u00e0", d: "Top set da 4-6 e back-off da 8-8: forza e volume nella stessa seduta.",
    w: [["3", "4-6 + 8-8"], ["3", "4-6 + 8-8"], ["3", "4-6 + 8-8"], ["3", "4-6 + 8-8"], ["3", "4-6 + 8-8"], ["3", "4-6 + 8-8"], ["3", "4-6 + 8-8"], ["3", "4-6 + 8-8"]] }
]);

/* --- Le 8 coppie che il v31 scriverebbe ---------------------------------- */

/* r.7171-7176 (baseOf): la base si legge dalla SETTIMANA 1. Le serie: intero
 * fra 1 e 12, altrimenti 3. Le ripetizioni: il testo della S1, altrimenti
 * "8-10". Identico, compresi i ripieghi. */
export function baseDaSettimane(settimane) {
  const elenco = Array.isArray(settimane) ? settimane : [];
  const prima = elenco[0] || {};
  const serie = parseInt(String(prima.serie == null ? "" : prima.serie).trim(), 10);
  const s = (!serie || serie < 1 || serie > 12) ? 3 : serie;
  const r = String(prima.ripetizioni == null ? "" : prima.ripetizioni).trim() || "8-10";
  return { s: s, r: r };
}

/* Il nome come lo vede Alice, o "" se l'id non esiste. */
export function nomeProgressione(id) {
  const k = String(id == null ? "" : id);
  for (let i = 0; i < PROG.length; i += 1) if (PROG[i][0] === k) return PROG[i][1];
  return "";
}

/* Le 8 coppie di una voce del tastino "+". null se la voce non esiste. */
export function coppieRiga(idProgressione, base) {
  const k = String(idProgressione == null ? "" : idProgressione);
  const regola = PROGRULE[k];
  if (!regola) return null;
  const b = base || { s: 3, r: "8-10" };
  const out = [];
  for (let w = 1; w <= 8; w += 1) {
    const v = regola(b, w);
    out.push([String(v[0]), String(v[1])]);
  }
  return out;
}

/* La voce della scheda intera, per id-posizione. */
export function voceScheda(id) {
  const k = String(id == null ? "" : id);
  for (let i = 0; i < PRG.length; i += 1) if (PRG[i].id === k) return PRG[i];
  return null;
}

/* Le 8 coppie di una voce della scheda, data la base della riga.
 * `w: null` = r.9992: si tiene quello che la riga ha gia', cioe' la sua S1
 * ripetuta su tutte le settimane (`Custom` compreso). */
export function coppieScheda(id, base) {
  const voce = voceScheda(id);
  if (!voce) return null;
  const b = base || { s: 3, r: "8-10" };
  const out = [];
  for (let w = 1; w <= 8; w += 1) {
    const v = voce.w ? voce.w[Math.min(w - 1, voce.w.length - 1)] : [String(b.s), String(b.r)];
    out.push([String(v[0]), String(v[1])]);
  }
  return out;
}
