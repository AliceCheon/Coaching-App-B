/* Barbell Diva B — la robottina Diva Bot (regola fissa: resta e da' verdetti).
 *
 * In fase 0 i suoi verdetti sono di LETTURA: guarda i numeri e dichiara di non
 * toccare nulla. Niente logica pesante: poche frasi, scelte dai dati letti.
 *
 * Fase 2c — «la voce»: una frase sola, la piu' importante del quadro
 * strutturale, scelta da una scala di priorita' dichiarata qui sotto. La frase
 * cambia tono (bene / attenzione / neutro), non contenuto inventato: ogni
 * numero che pronuncia viene dal quadro, ogni assenza la dichiara.
 *
 * Fase 2d — «il giorno e il carico»: due voci in piu'.
 *  - voceDelGiorno: un calendario di sette registri, uno per giorno della
 *    settimana, tre varianti ciascuno. Non legge dati e non giudica: e' il
 *    saluto. Stessa data, stessa frase — nessun sorteggio a ogni ricarica.
 *  - voceDelCarico: cosa dicono i pesi per esercizio, quando ci sono. Se non
 *    ci sono, lo dice: un carico assente non diventa mai uno zero.
 *
 * Regola di casa: quando il dato manca, la Diva dice «non registrato». Non
 * riempie, non stima, non rassicura a vuoto. E non fa diagnosi: quella non e'
 * roba sua.
 */

import { SOGLIE } from "./struttura.js";
import { SOGLIE_CARICHI, eserciziConStoria } from "./carichi.js";
import { creaFigura, etichettaTono } from "./diva-volto.js";

const FRASI_BASE = [
  "Sto guardando i numeri, non tocco nulla \ud83d\udc9c",
  "Solo occhi, zero mani: questa schermata non scrive niente.",
  "Rileggo i tuoi dati quando vuoi: il pulsante e' li' per questo."
];

function fraseSedute(n) {
  if (n > 0) return "Ho letto " + n + " sedute e non ho scritto un byte.";
  return "Nessuna seduta qui per ora: mostro il vuoto con onesta'.";
}

function frasePeso(presente) {
  return presente ? "Il peso arriva dalla tua app, io me lo guardo." : "Peso non registrato: nessun numero di riempimento, mai.";
}

/* ---------- la voce del giorno: un saluto, sette registri ---------- */

/* Sette registri, tre varianti ciascuno. Il lunedi' e' quello che accende la
 * settimana, il mercoledi' quello che la regge, la domenica quella che la
 * lascia andare. Nessuna cifra: qui non si contano cose, si parla. */
const CALENDARIO = Object.freeze([
  /* domenica */
  Object.freeze([
    "Domenica. Il ferro riposa, e riposare e' parte dell'allenamento: oggi non ti chiedo niente.",
    "Domenica, la giornata delle cose lente. Io resto qui, a tenerti i numeri in ordine.",
    "Ultimo giorno della settimana: la settimana e' gia' scritta, e non serve aggiungere altro."
  ]),
  /* lunedi' */
  Object.freeze([
    "Lunedi'. Le settimane non iniziano davvero: pero' oggi hai tutta l'aria di chi comincia.",
    "Lunedi', il giorno in cui il corpo si ricorda cosa sa fare. Vai piano che e' meglio.",
    "Primo giorno: nessun debutto, solo la solita, ostinata continuita'."
  ]),
  /* martedi' */
  Object.freeze([
    "Martedi'. Il secondo giorno e' quello che rivela se la settimana era un'intenzione o un fatto.",
    "Martedi', a meta' strada tra l'entusiasmo e la stanchezza: posto comodo per non decidere niente.",
    "Martedi'. Io non ti chiedo di essere costante: ti chiedo solo di essere qui."
  ]),
  /* mercoledi' */
  Object.freeze([
    "Mercoledi', il giorno che regge tutto il resto. Anche le settimane hanno bisogno di una schiena.",
    "Mercoledi'. Se la settimana fosse una serie, sarebbe la terza: quella in cui si capisce il carico.",
    "Mercoledi': nessuna fretta, nessun recupero. Solo il centro esatto della settimana."
  ]),
  /* giovedi' */
  Object.freeze([
    "Giovedi'. Il grosso e' fatto o non e' fatto: in entrambi i casi, da qui si vede chiaro.",
    "Giovedi': le settimane oneste si riconoscono da come trattano il quarto giorno.",
    "Giovedi'. Ancora abbastanza presto per cambiare qualcosa, abbastanza tardi per saperlo."
  ]),
  /* venerdi' */
  Object.freeze([
    "Venerdi'. Il ferro ha gia' detto quasi tutto quello che aveva da dire.",
    "Venerdi', con l'aria di chi chiude una porta senza sbatterla.",
    "Venerdi'. Ultimo giorno di lavoro: quello che manca, manca domani. Non stanotte."
  ]),
  /* sabato */
  Object.freeze([
    "Sabato. I pesi non sanno che giorno e': pero' tu si', e questo cambia tutto.",
    "Sabato, il giorno in cui ci si allena per se stesse e non per il calendario.",
    "Sabato'. Se oggi scegli il divano, io non lo scrivo come sconfitta: lo scrivo come scelta."
  ])
]);

function giornoDelAnno(data) {
  const inizio = Date.UTC(data.getUTCFullYear(), 0, 1);
  const oggi = Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate());
  return Math.floor((oggi - inizio) / 86400000) + 1;
}

/* Ritorna { testo, tono }. Deterministico: la frase dipende dalla data, non
 * dal momento in cui apri la pagina. Il tono e' sempre «neutro» perche' il
 * saluto non giudica niente: il peso della bolla lo decide il quadro. */
export function voceDelGiorno(data) {
  const giorno = data instanceof Date && !Number.isNaN(data.getTime()) ? data : new Date();
  const indiceGiorno = giorno.getUTCDay();
  const varianti = CALENDARIO[indiceGiorno] || CALENDARIO[0];
  const settimana = Math.floor(giornoDelAnno(giorno) / 7);
  const variante = varianti[(settimana + giorno.getUTCFullYear()) % varianti.length];
  return { testo: variante, tono: "neutro" };
}

/* ---------- la voce del quadro: una frase, la piu' importante ---------- */

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

/* La scala di priorita' e' l'ordine in cui queste condizioni sono scritte:
 * la prima che scatta vince. E' deliberata: una pausa lunga conta piu' di una
 * distribuzione storta, e una distribuzione storta conta piu' di un complimento.
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
      testo: "L'ultima seduta e' " + giorniFrase(giorni) + ". Nessun rimprovero: e' un numero, e i numeri non giudicano. Quando riparti, riparti da qui.",
      tono: "attenzione"
    };
  }

  if (vuote >= SOGLIE.settimaneVuoteAttenzione) {
    return {
      testo: vuote + " settimane di fila senza sedute. Lo dico piano, perche' non e' una diagnosi: e' una lacuna nel registro, e le lacune si colmano quando ti va.",
      tono: "attenzione"
    };
  }

  if (giorni != null && giorni >= SOGLIE.giorniPausaAttenzione) {
    return {
      testo: "Sono " + giorni + " giorni dall'ultima seduta: oltre la settimana. Puo' essere riposo scelto o vita che si mette di traverso, e io non lo so: registro solo il numero.",
      tono: "attenzione"
    };
  }

  const storto = sbilanciamento(quadro);
  if (storto) {
    return {
      testo: "Il carico pende: " + storto.max.codice + " " + storto.max.numero + " sedute contro " + storto.min.codice + " " + storto.min.numero + ". Non e' squilibrio muscolare, e' squilibrio di registro: io conto le schede, non i muscoli.",
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
      testo: "Sei sotto la soglia che ho dichiarato (" + SOGLIE.seduteSettimanaPiene + " a settimana): la tua media e' " + quadro.mediaSettimanale + ". Non e' un voto, e' un conto.",
      tono: "attenzione"
    };
  }

  return {
    testo: "Nelle settimane osservate non trovo sedute datate. Il quadro resta vuoto, e vuoto lo dico.",
    tono: "neutro"
  };
}

/* ---------- la voce del carico: cosa dicono i pesi ---------- */

/* Come per il quadro, una scala di priorita': il primo gradino che scatta
 * vince. Qui pero' non si parla di frequenza, si parla di chili, e i chili
 * sono un'altra storia: un calo non e' una colpa, un massimo non e' un titolo.
 * Ogni cifra citata esiste nei dati (la guardia 15 lo verifica). */
export function voceDelCarico(carichi) {
  const esercizi = carichi && Array.isArray(carichi.esercizi) ? carichi.esercizi : [];
  if (!esercizi.length) {
    return {
      testo: "I carichi per esercizio non sono registrati: non ti disegno una curva, ti dico che il foglio e' vuoto.",
      tono: "neutro"
    };
  }

  const conStoria = eserciziConStoria(carichi);
  if (!conStoria.length) {
    const primo = esercizi[0];
    return {
      testo: "Ho letto il peso di " + esercizi.length + " esercizi, ma nessuno con " + SOGLIE_CARICHI.minOccorrenze + " sedute alle spalle: un andamento su cosi' poco non lo racconto.",
      tono: "neutro"
    };
  }

  const calo = conStoria
    .filter((e) => e.variazione != null && e.variazione <= -SOGLIE_CARICHI.variazioneAttenzione * 100)
    .sort((a, b) => a.variazione - b.variazione)[0];
  if (calo) {
    return {
      testo: calo.nome + ": da " + calo.occorrenze[0].massimo + " a " + calo.ultimoMassimo + " kg, " + calo.variazione + "%. Puo' essere stanchezza, puo' essere scelta, puo' essere niente: io leggo il registro e non la causa.",
      tono: "attenzione"
    };
  }

  const record = conStoria
    .filter((e) => e.ultimoMassimo >= e.massimoStorico && e.variazione != null && e.variazione > 0)
    .sort((a, b) => b.variazione - a.variazione)[0];
  if (record) {
    return {
      testo: record.nome + " a " + record.ultimoMassimo + " kg: il massimo che ho in archivio per questo esercizio. Non e' un record del mondo, e' il tuo, ed e' scritto.",
      tono: "bene"
    };
  }

  const cresce = conStoria
    .filter((e) => e.variazione != null && e.variazione > 0)
    .sort((a, b) => b.variazione - a.variazione)[0];
  if (cresce) {
    return {
      testo: cresce.nome + " sale di " + cresce.variazione + "% nella finestra: da " + cresce.occorrenze[0].massimo + " a " + cresce.ultimoMassimo + " kg. Progressione lenta e reale, che e' la sola che resta.",
      tono: "bene"
    };
  }

  const stabile = conStoria[0];
  return {
    testo: stabile.nome + ": " + stabile.ultimoMassimo + " kg, fermo da " + stabile.numeroOccorrenze + " sedute. Un peso che non si muove non e' un fallimento: e' un dato.",
    tono: "neutro"
  };
}

/* Il tono della bolla e' il piu' severo tra le voci che ci sono: se il quadro
 * dice «attenzione» e il carico dice «bene», la bolla non si fa verde. */
export function tonoPeggiore() {
  const rango = { neutro: 0, bene: 1, attenzione: 2 };
  let scelto = "neutro";
  for (let i = 0; i < arguments.length; i += 1) {
    const tono = arguments[i];
    if (!Object.prototype.hasOwnProperty.call(rango, tono)) continue;
    if (rango[tono] > rango[scelto]) scelto = tono;
  }
  return scelto;
}

/* Frasi per la bolla, derivate dai dati letti (nessun dato personale qui:
 * solo conteggi e presenza/assenza).
 *
 * Ordine deliberato: prima il saluto del giorno, poi la frase che conta
 * (quadro), poi la voce del carico. `extra` e' facoltativo: senza, la bolla
 * resta quella della fase 2c, e i test 14 continuano a valere.
 */
export function frasiPerDati(riepilogo, quadro, extra) {
  const r = riepilogo || {};
  const e = extra || {};
  const frasi = [];
  if (e.giornata && e.giornata.testo) frasi.push(e.giornata.testo);
  if (quadro) frasi.push(voceDelQuadro(quadro).testo);
  if (e.carichi) frasi.push(voceDelCarico(e.carichi).testo);
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
 * Solo testo (textContent): i dati non diventano mai HTML. Il tono e' un
 * attributo, non una parola in piu': il colore dice quanto pesa la frase. */
export function montaDivaBot(contenitore, frasi, tono, opzioni = {}) {
  /* Fase 2h — «la striscia»: sul telefono la frase e la figura stanno sulla
   * stessa riga, come `.strip` del mockup, invece che una sopra l'altra.
   * Il desktop (2f) tiene il fumetto sopra la figura a 104 px: si sceglie con
   * `{ striscia: true }`, e chi non passa niente resta com'era. */
  const striscia = Boolean(opzioni && opzioni.striscia === true);
  const doc = contenitore.ownerDocument;
  const bolla = doc.createElement(striscia ? "p" : "div");
  bolla.className = striscia ? "bd-striscia-bolla" : "bd-bolla";
  if (tono) bolla.setAttribute("data-tono", String(tono));
  let testo = bolla;
  if (!striscia) {
    testo = doc.createElement("p");
    testo.className = "bd-bolla-testo";
    bolla.appendChild(testo);
  }
  const pallino = contenitore.ownerDocument.createElement("button");
  pallino.type = "button";
  /* Nel mockup il personaggio non sta dentro un cerchio: sta in piedi accanto
   * alla bolla (`.sbot`, figura intera). È così che è importato qui. */
  pallino.className = "bd-diva bd-sbot";
  pallino.setAttribute("aria-label", "Diva Bot");
  const volto = creaFigura(contenitore.ownerDocument, tono || "neutro");
  if (volto) pallino.appendChild(volto);
  pallino.setAttribute("data-tono", tono || "neutro");
  pallino.setAttribute("aria-label", "Diva Bot: " + etichettaTono(tono || "neutro"));
  if (striscia) {
    const riga = doc.createElement("div");
    riga.className = "bd-striscia";
    const sbt = doc.createElement("div");
    sbt.className = "bd-striscia-sbt";
    sbt.appendChild(pallino);
    riga.appendChild(bolla);
    riga.appendChild(sbt);
    contenitore.appendChild(riga);
  } else {
    contenitore.appendChild(bolla);
    contenitore.appendChild(pallino);
  }
  let indice = 0;
  let tonoCorrente = tono || "neutro";
  const ciclo = () => {
    testo.textContent = frasi[indice % frasi.length] || FRASI_BASE[0];
    indice += 1;
  };
  /* Fase 2i — la frase imposta da fuori (la carta che stai guardando). Prende
   * il posto del giro senza consumarlo: il tocco riparte da dove era. Il tono
   * cambia la faccia della figura, non solo il colore: se cambia, si ridisegna. */
  const mostra = (testoFrase, tonoFrase) => {
    if (!testoFrase) return null;
    testo.textContent = String(testoFrase);
    const nuovo = tonoPeggiore(tonoCorrente, tonoFrase);
    bolla.setAttribute("data-tono", nuovo);
    if (nuovo !== tonoCorrente) {
      tonoCorrente = nuovo;
      while (pallino.firstChild) pallino.removeChild(pallino.firstChild);
      const nuovaFigura = creaFigura(doc, nuovo);
      if (nuovaFigura) pallino.appendChild(nuovaFigura);
      pallino.setAttribute("data-tono", nuovo);
    }
    return nuovo;
  };
  ciclo();
  pallino.addEventListener("click", ciclo);
  return { aggiungi: (nuove) => nuove && nuove.length && ciclo(), mostra, bolla, pallino };
}
