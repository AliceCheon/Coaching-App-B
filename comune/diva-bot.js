/* Barbell Diva B — la robottina Diva Bot (regola fissa: resta e dà verdetti).
 *
 * In fase 0 i suoi verdetti sono di LETTURA: guarda i numeri e dichiara di non
 * toccare nulla. Niente logica pesante: poche frasi, scelte dai dati letti.
 *
 * Fase 2c — «la voce»: una frase sola, la più importante del quadro
 * strutturale, scelta da una scala di priorità dichiarata qui sotto. La frase
 * cambia tono (bene / attenzione / neutro), non contenuto inventato: ogni
 * numero che pronuncia viene dal quadro, ogni assenza la dichiara.
 *
 * Regola di casa: quando il dato manca, la Diva dice «non registrato». Non
 * riempie, non stima, non rassicura a vuoto. E non fa diagnosi: quella non è
 * roba sua.
 */

import { SOGLIE } from "./struttura.js";

const FRASI_BASE = [
  "Sto guardando i numeri, non tocco nulla 💜",
  "Solo occhi, zero mani: questa schermata non scrive niente.",
  "Rileggo i tuoi dati quando vuoi: il pulsante è lì per questo."
];

function fraseSedute(n) {
  if (n > 0) return "Ho letto " + n + " sedute e non ho scritto un byte.";
  return "Nessuna seduta qui per ora: mostro il vuoto con onestà.";
}

function frasePeso(presente) {
  return presente ? "Il peso arriva dalla tua app, io me lo guardo." : "Peso non registrato: nessun numero di riempimento, mai.";
}

/* ---------- la voce: una frase, la più importante ---------- */

/* «oggi», «ieri», «N giorni fa»: nessun conteggio a rovescio. */
function giorniFrase(giorni) {
  if (giorni === 0) return "oggi";
  if (giorni === 1) return "ieri";
  return giorni + " giorni fa";
}

/* Lo stesso sbilanciamento che segnala il semaforo: stesse soglie, stessa
 * aritmetica. Se divergessero, B si contraddirebbe da sola. */
function sbilanciamento(quadro) {
  if (!quadro || !quadro.distribuzione || !quadro.distribuzione.length) return null;
  if (quadro.numeroSedute < 8) return null;
  if (quadro.distribuzione.length < 2) return null;
  const max = quadro.distribuzione[0];
  const min = quadro.distribuzione[quadro.distribuzione.length - 1];
  const quote = quadro.distribuzione.map((d) => d.numero / quadro.numeroSedute);
  const piu = Math.max.apply(null, quote);
  const meno = Math.min.apply(null, quote);
  if (piu - meno <= 0.35) return null;
  return { max, min };
}

/* La scala di priorità è l'ordine in cui queste condizioni sono scritte:
 * la prima che scatta vince. È deliberata: una pausa lunga conta più di una
 * distribuzione storta, e una distribuzione storta conta più di un complimento.
 * Restituisce { testo, tono } con tono in "bene" | "attenzione" | "neutro". */
export function voceDelQuadro(quadro) {
  if (!quadro || !quadro.numeroSedute) {
    return {
      testo: "Nessuna seduta con data leggibile: non ti disegno un quadro, ti dico solo «non registrato».",
      tono: "neutro"
    };
  }

  const giorni = quadro.giorniDallUltima;
  const vuote = Number(quadro.settimaneVuoteDiFila) || 0;

  if (giorni != null && giorni >= SOGLIE.giorniPausaLunga) {
    return {
      testo: "L'ultima seduta è " + giorniFrase(giorni) + ". Nessun rimprovero: è un numero, e i numeri non giudicano. Quando riparti, riparti da qui.",
      tono: "attenzione"
    };
  }

  if (vuote >= SOGLIE.settimaneVuoteAttenzione) {
    return {
      testo: vuote + " settimane di fila senza sedute. Lo dico piano, perché non è una diagnosi: è una lacuna nel registro, e le lacune si colmano quando ti va.",
      tono: "attenzione"
    };
  }

  if (giorni != null && giorni >= SOGLIE.giorniPausaAttenzione) {
    return {
      testo: "Sono " + giorni + " giorni dall'ultima seduta: oltre la settimana. Può essere riposo scelto o vita che si mette di traverso, e io non lo so: registro solo il numero.",
      tono: "attenzione"
    };
  }

  const storto = sbilanciamento(quadro);
  if (storto) {
    return {
      testo: "Il carico pende: " + storto.max.codice + " " + storto.max.numero + " sedute contro " + storto.min.codice + " " + storto.min.numero + ". Non è squilibrio muscolare, è squilibrio di registro: io conto le schede, non i muscoli.",
      tono: "attenzione"
    };
  }

  if (quadro.mediaSettimanale != null && quadro.mediaSettimanale >= SOGLIE.seduteSettimanaPiene) {
    return {
      testo: "La struttura tiene: " + quadro.mediaSettimanale + " sedute a settimana, l'ultima " + giorniFrase(giorni == null ? 0 : giorni) + ". Sonno, energia e ciclo restano non registrati: quelli non me li invento.",
      tono: "bene"
    };
  }

  if (quadro.mediaSettimanale != null && quadro.mediaSettimanale >= 1) {
    return {
      testo: "Sei sotto la soglia che ho dichiarato (" + SOGLIE.seduteSettimanaPiene + " a settimana): la tua media è " + quadro.mediaSettimanale + ". Non è un voto, è un conto.",
      tono: "attenzione"
    };
  }

  return {
    testo: "Nelle settimane osservate non trovo sedute datate. Il quadro resta vuoto, e vuoto lo dico.",
    tono: "neutro"
  };
}

/* Frasi per la bolla, derivate dai dati letti (nessun dato personale qui:
 * solo conteggi e presenza/assenza). La voce del quadro, se c'è, va per prima:
 * una bolla si legge una volta, e la prima frase deve essere quella che conta. */
export function frasiPerDati(riepilogo, quadro) {
  const r = riepilogo || {};
  const frasi = [];
  if (quadro) frasi.push(voceDelQuadro(quadro).testo);
  frasi.push(FRASI_BASE[0]);
  frasi.push(fraseSedute(Number(r.numeroSedute) || 0));
  frasi.push(frasePeso(Boolean(r.pesoPresente)));
  frasi.push(
    Boolean(r.checkinPresente)
      ? "Ho anche l'ultimo check-in: lo leggo e basta."
      : "Nessun check-in nel documento: pazienza, si mostra il vuoto."
  );
  frasi.push(FRASI_BASE[2]);
  return frasi;
}

/* Costruisce la robottina (bolla + pallino) dentro il contenitore dato.
 * Solo testo (textContent): i dati non diventano mai HTML. Il tono è un
 * attributo, non una parola in più: il colore dice quanto pesa la frase. */
export function montaDivaBot(contenitore, frasi, tono) {
  const bolla = contenitore.ownerDocument.createElement("div");
  bolla.className = "bd-bolla";
  if (tono) bolla.setAttribute("data-tono", String(tono));
  const testo = contenitore.ownerDocument.createElement("p");
  testo.className = "bd-bolla-testo";
  bolla.appendChild(testo);
  const pallino = contenitore.ownerDocument.createElement("button");
  pallino.type = "button";
  pallino.className = "bd-diva";
  pallino.setAttribute("aria-label", "Diva Bot");
  pallino.textContent = "🤖";
  contenitore.appendChild(bolla);
  contenitore.appendChild(pallino);
  let indice = 0;
  const mostra = () => {
    testo.textContent = frasi[indice % frasi.length] || FRASI_BASE[0];
    indice += 1;
  };
  mostra();
  pallino.addEventListener("click", mostra);
  return { aggiungi: (nuove) => nuove && nuove.length && mostra(), bolla, pallino };
}
