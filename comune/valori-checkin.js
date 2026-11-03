/* Barbell Diva B — i valori del check-in (fase 2l).
 *
 * Fonte: `state.quiz.questionnaireHistory` (A r.15021). A scrive, per ogni
 * check-in, un oggetto `wellness` con cinque voci: energia, sonno, DOMS,
 * stress, fame. Ogni voce è una parola scelta dal questionario, non un numero
 * calcolato: qui non si interpreta, si mostra.
 *
 * Regola di casa: quando la voce manca, si scrive «non registrato». E la data
 * mostrata è quella del check-in che ha portato i valori — non quella di oggi,
 * che direbbe una cosa falsa su quando li hai compilati.
 *
 * Nota di onestà (verificata sul codice di A, non ipotizzata): i campi
 * `state.metrics.sleep / stress / energy` esistono ma A non li scrive mai —
 * li legge soltanto, ricavandone un valore dal questionario quando sono vuoti
 * (A r.7659-7683). Per questo questa pagina legge il check-in e non le
 * metriche: le metriche sarebbero un default, il check-in è ciò che hai
 * davvero compilato.
 */

/* Ordine deliberato: prima come stai (energia), poi come hai dormito, poi i
 * dolori, poi la testa, poi la fame. È l'ordine in cui il questionario le
 * chiede, e leggerle in fila racconta una giornata. */
export const VOCI_CHECKIN = Object.freeze([
  Object.freeze({ chiave: "energy", nome: "Energia", noto: "quanta ne avevi" }),
  Object.freeze({ chiave: "sleep", nome: "Sonno", noto: "qualità del riposo" }),
  Object.freeze({ chiave: "doms", nome: "DOMS", noto: "dolori muscolari" }),
  Object.freeze({ chiave: "stress", nome: "Stress", noto: "pressione percepita" }),
  Object.freeze({ chiave: "hunger", nome: "Fame", noto: "appetito" })
]);

export const NON_REGISTRATO = "non registrato";

/* Una voce vuota non è uno zero e non è «bene»: è un buco. Vale per null,
 * undefined, stringa vuota o solo spazi. Anche un oggetto senza senso è un
 * buco: qui non si indovina. */
function vuota(valore) {
  if (valore == null) return true;
  if (typeof valore === "number") return !Number.isFinite(valore);
  if (typeof valore === "boolean") return false;
  const testo = String(valore).trim();
  return testo === "";
}

/* Il valore come si legge: stringhe ripulite, numeri come sono, oggetti
 * ridotti a JSON (meglio brutto che inventato). */
function leggibile(valore) {
  if (typeof valore === "number") return String(valore);
  if (typeof valore === "boolean") return valore ? "sì" : "no";
  if (typeof valore === "string") return valore.trim();
  try {
    return JSON.stringify(valore);
  } catch (e) {
    return NON_REGISTRATO;
  }
}

/* Le cinque righe della pagina, sempre tutte e cinque: una voce assente resta
 * al suo posto con «non registrato» scritto, invece di sparire e far sembrare
 * che il questionario non la chiedesse. */
export function valoriDelCheckin(checkin) {
  const ck = checkin || null;
  const wellness = ck && ck.wellness && typeof ck.wellness === "object" ? ck.wellness : {};
  return VOCI_CHECKIN.map((voce) => {
    const grezzo = wellness[voce.chiave];
    const manca = vuota(grezzo);
    return {
      chiave: voce.chiave,
      nome: voce.nome,
      noto: voce.noto,
      valore: manca ? NON_REGISTRATO : leggibile(grezzo),
      registrato: !manca
    };
  });
}

/* La data dell'ultimo aggiornamento: quella del check-in, non quella di oggi.
 * Se il check-in non c'è, la pagina lo dice invece di mostrare una data. */
export function dataDelCheckin(checkin) {
  if (!checkin) return { testo: NON_REGISTRATA_FRASE(), registrata: false };
  /* Il documento grezzo di A porta `date`; il modello di B lo espone come
   * `data`. Si accettano entrambi, poi `createdAt`. */
  const grezza = [checkin.date, checkin.data, checkin.createdAt].find((v) => !vuota(v));
  if (vuota(grezza)) return { testo: NON_REGISTRATA_FRASE(), registrata: false };
  return { testo: String(grezza).trim(), registrata: true };
}

function NON_REGISTRATA_FRASE() {
  return "data non registrata";
}

/* Quante voci su cinque hai davvero compilato. Serve alla riga di sintesi:
 * «tre voci su cinque» dice più di un «ok» generico. */
export function quanteRegistrate(righe) {
  const elenco = Array.isArray(righe) ? righe : [];
  return elenco.filter((r) => r && r.registrato === true).length;
}

/* Le righe pronte per la carta: stesso formato di `righeQuadro` e compagni,
 * così il disegno resta uno solo in tutta l'app. */
export function righeValoriCheckin(checkin) {
  const righe = valoriDelCheckin(checkin);
  const data = dataDelCheckin(checkin);
  const quante = quanteRegistrate(righe);
  const uscita = [
    {
      testo: "ultimo aggiornamento: " + data.testo,
      classe: data.registrata ? "lemmacarta" : "errore"
    }
  ];
  righe.forEach((r) => {
    uscita.push({ testo: r.nome + " — " + r.valore, classe: r.registrato ? "riga" : "riga" });
  });
  uscita.push({
    testo: quante === righe.length
      ? "tutte e " + righe.length + " le voci compilate"
      : quante + " voci su " + righe.length + " compilate: le altre restano scritte come mancanti",
    classe: "fonte"
  });
  return uscita;
}
