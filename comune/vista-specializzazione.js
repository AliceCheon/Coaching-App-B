/* Barbell Diva B — la pagina Specializzazione conta davvero (B.14k).
 *
 * Stesso patto del Riepilogo volume: il conto sta in comune/volume-b.js
 * (stessa regola: 1 punto al bersaglio, 0,5 ai secondari da muscoli-b.js),
 * qui c'e' solo il disegno. Nessun numero scritto a mano: se il programma
 * attivo non c'e' o non porta esercizi leggibili, la pagina dice
 * «nessun programma attivo» e non mostra numeri.
 *
 * Lo switch Solo diretto / Diretto + indiretto rifà il conto da capo,
 * come nel Riepilogo volume: non aggiusta i numeri dopo.
 */

import { contaVolume, righeDalleSchede, formattaNumero } from "./volume-b.js";

function n(doc, tag, classe, testo) {
  const e = doc.createElement(tag);
  if (classe) e.className = classe;
  if (testo != null) e.textContent = String(testo);
  return e;
}

function cartaKpi(doc, etichetta, valore, sotto) {
  const k = n(doc, "div", "sp-k");
  k.appendChild(n(doc, "span", "", etichetta));
  k.appendChild(n(doc, "b", "", valore));
  if (sotto) k.appendChild(n(doc, "em", "", sotto));
  return k;
}

/* Quota di un distretto sul volume del blocco, in percentuale. */
function quota(distretto, somma) {
  return somma > 0 ? Math.round((distretto / somma) * 1000) / 10 : 0;
}

/* Il conto della pagina: classifica, media, sotto soglia, rimbalzi, leader
 * di settimana. Solo numeri calcolati, niente invenzioni. */
export function calcolaSpecializzazione(righe, opzioni) {
  const o = opzioni && typeof opzioni === "object" ? opzioni : {};
  const quante = Number.isFinite(Number(o.quante)) && Number(o.quante) > 0 ? Math.floor(Number(o.quante)) : 8;
  const soloDiretto = o.soloDiretto === true;

  const conto = contaVolume(Array.isArray(righe) ? righe : [], { quante, soloDiretto });
  if (!conto.righeContate || !conto.distretti.length) return { vuoto: true, conto };

  const somma = conto.distretti.reduce((a, d) => a + d.totale, 0);
  if (!(somma > 0)) return { vuoto: true, conto };

  const classifica = conto.distretti.slice().sort((a, b) => b.totale - a.totale);
  const mediaRaw = somma / classifica.length;
  const media = Math.round(mediaRaw * 10) / 10;
  const soglia = 0.6 * mediaRaw;
  const sotto = conto.distretti.filter((d) => d.totale > 0 && d.totale < soglia);
  const daSinergie = conto.distretti.filter((d) => d.totale > 0 && d.indirette / d.totale > 0.4);

  /* Chi guida ogni settimana: dal vivo della mappa settimana x distretto
   * (che contaVolume lascia grezza: qui si applica lo switch a mano). */
  const leaders = [];
  for (let w = 1; w <= quante; w += 1) {
    let miglior = null;
    conto.distretti.forEach((d) => {
      const cella = (conto.perDistrettoSettimana[d.distretto] || []).find((c) => c.numero === w);
      if (!cella) return;
      const v = soloDiretto ? cella.dirette : cella.totale;
      if (v > 0 && (!miglior || v > miglior.valore)) miglior = { distretto: d.distretto, valore: v };
    });
    if (miglior) leaders.push(Object.assign({ numero: w }, miglior));
  }

  return {
    vuoto: false,
    conto,
    classifica,
    inTesta: classifica[0],
    quotaInTesta: quota(classifica[0].totale, somma),
    somma,
    mediaRaw,
    media,
    sotto,
    daSinergie,
    leaders,
    senzaSecondari: conto.righeSenzaSecondari,
    righeContate: conto.righeContate
  };
}

/* La pagina: il guscio (testata, guida) resta nel markup, qui si riempie
 * #sp-corpo. Nessun numero se non c'e' un programma che ne vale la pena. */
export function renderSpecializzazione(doc, contenitore, schede, opzioni) {
  if (!doc || !contenitore) return null;
  const o = opzioni && typeof opzioni === "object" ? opzioni : {};
  const quante = Number.isFinite(Number(o.quante)) && Number(o.quante) > 0 ? Math.floor(Number(o.quante)) : 8;
  let soloDiretto = o.soloDiretto === true;

  const disegna = () => {
    const righe = righeDalleSchede(schede);
    contenitore.textContent = "";

    if (!Array.isArray(righe) || !righe.length) {
      contenitore.appendChild(n(doc, "p", "pg-vuoto", "Nessun programma attivo: quando c'e' un programma in corso, qui si vede dove va il volume. Nessun numero inventato."));
      return null;
    }
    const calcolo = calcolaSpecializzazione(righe, { quante, soloDiretto });
    if (calcolo.vuoto) {
      contenitore.appendChild(n(doc, "p", "pg-vuoto", "Nessun programma attivo con esercizi leggibili: le schede non portano distretti riconoscibili, la pagina non mostra numeri."));
      return calcolo;
    }

    /* Lo switch, stesso aspetto e stesso comportamento del Riepilogo volume. */
    const switchBox = n(doc, "div", "rv-seg");
    switchBox.setAttribute("role", "group");
    switchBox.setAttribute("aria-label", "cosa conta nel totale");
    const b1 = n(doc, "button", soloDiretto ? "on" : "", "Solo diretto");
    const b2 = n(doc, "button", soloDiretto ? "" : "on", "Diretto + indiretto");
    b1.setAttribute("type", "button");
    b2.setAttribute("type", "button");
    b1.onclick = () => { if (!soloDiretto) { soloDiretto = true; disegna(); } };
    b2.onclick = () => { if (soloDiretto) { soloDiretto = false; disegna(); } };
    switchBox.appendChild(b1);
    switchBox.appendChild(b2);
    contenitore.appendChild(switchBox);

    /* KPI: in testa, quota, media, sotto soglia, da sinergie. */
    const kpi = n(doc, "div", "sp-kpi");
    kpi.appendChild(cartaKpi(doc, "In testa", calcolo.inTesta.distretto, formattaNumero(calcolo.inTesta.totale) + (soloDiretto ? " serie dirette" : " serie efficaci")));
    kpi.appendChild(cartaKpi(doc, "Quota", formattaNumero(calcolo.quotaInTesta) + "%", "del volume del blocco"));
    kpi.appendChild(cartaKpi(doc, "Media distretto", formattaNumero(calcolo.media), soloDiretto ? "serie dirette" : "serie efficaci"));
    kpi.appendChild(cartaKpi(doc, "Sotto soglia", String(calcolo.sotto.length), "sotto il 60% della media"));
    kpi.appendChild(cartaKpi(doc, "Da sinergie", String(calcolo.daSinergie.length), "distretti oltre il 40% indiretto"));
    contenitore.appendChild(kpi);

    const due = n(doc, "div", "sp-due");

    /* Classifica per volume: barra in scala sul primo, quota sul totale. */
    const cardRank = n(doc, "div", "sp-card");
    const ch1 = n(doc, "div", "sp-ch");
    ch1.appendChild(n(doc, "h4", "", "Classifica per volume"));
    ch1.appendChild(n(doc, "span", "", soloDiretto ? "serie dirette sul blocco intero" : "serie efficaci sul blocco intero"));
    cardRank.appendChild(ch1);
    const rank = n(doc, "div", "sp-rank");
    calcolo.classifica.forEach((d, i) => {
      const r = n(doc, "div", "sp-r");
      r.setAttribute("data-d", d.distretto);
      r.appendChild(n(doc, "span", "sp-pr", String(i + 1)));
      const nm = n(doc, "div", "sp-nm");
      nm.appendChild(n(doc, "b", "", d.distretto));
      const bt = n(doc, "div", "sp-bt");
      const barra = n(doc, "i");
      barra.style.width = (d.totale / calcolo.inTesta.totale * 100).toFixed(1) + "%";
      bt.appendChild(barra);
      nm.appendChild(bt);
      r.appendChild(nm);
      r.appendChild(n(doc, "span", "sp-v", formattaNumero(d.totale)));
      r.appendChild(n(doc, "span", "sp-q", formattaNumero(quota(d.totale, calcolo.somma)) + "%"));
      rank.appendChild(r);
    });
    cardRank.appendChild(rank);
    cardRank.appendChild(n(doc, "p", "rv-nota", "Regola dichiarata: 1 punto al bersaglio, 0,5 ai secondari. Stesso conto del Riepilogo volume."));
    due.appendChild(cardRank);

    /* Settimana per settimana: chi guida, e chi sta subito dietro. */
    const cardSettimane = n(doc, "div", "sp-card");
    const ch2 = n(doc, "div", "sp-ch");
    ch2.appendChild(n(doc, "h4", "", "Settimana per settimana"));
    ch2.appendChild(n(doc, "span", "", "chi guida"));
    cardSettimane.appendChild(ch2);
    const focus = n(doc, "div", "sp-focus");
    calcolo.leaders.forEach((l) => {
      const valoreCella = (d) => {
        const c = (calcolo.conto.perDistrettoSettimana[d] || []).find((x) => x.numero === l.numero);
        if (!c) return 0;
        return soloDiretto ? c.dirette : c.totale;
      };
      const dietro = calcolo.classifica
        .map((d) => ({ distretto: d.distretto, valore: valoreCella(d.distretto) }))
        .sort((a, b) => b.valore - a.valore)
        .find((x) => x.distretto !== l.distretto && x.valore > 0);
      const riga = n(doc, "div", "sp-f");
      riga.appendChild(n(doc, "b", "", "S" + l.numero));
      riga.appendChild(n(doc, "em", "", l.distretto));
      riga.appendChild(n(doc, "i", "", formattaNumero(l.valore) + (dietro ? " \u00b7 poi " + dietro.distretto + " " + formattaNumero(dietro.valore) : "")));
      focus.appendChild(riga);
    });
    cardSettimane.appendChild(focus);

    const ch3 = n(doc, "div", "sp-ch");
    ch3.style.margin = "16px 0 8px";
    ch3.appendChild(n(doc, "h4", "", "Avvisi"));
    ch3.appendChild(n(doc, "span", "", "regole dichiarate"));
    cardSettimane.appendChild(ch3);
    const avvisi = n(doc, "ul", "sp-avvisi");
    calcolo.sotto.forEach((d) => {
      const li = n(doc, "li", "w");
      li.appendChild(n(doc, "b", "", d.distretto));
      li.appendChild(doc.createTextNode(" a " + formattaNumero(d.totale) + " serie: sotto il 60% della media (" + formattaNumero(calcolo.media) + "). Se \u00e8 un distretto che vuoi crescere, va aggiunto lavoro diretto."));
      avvisi.appendChild(li);
    });
    calcolo.daSinergie.forEach((d) => {
      const li = n(doc, "li", "w");
      li.appendChild(n(doc, "b", "", d.distretto));
      li.appendChild(doc.createTextNode(": " + formattaNumero(Math.round((d.indirette / d.totale) * 1000) / 10) + "% del suo volume arriva di rimbalzo. Conta, ma non \u00e8 lavoro scelto."));
      avvisi.appendChild(li);
    });
    const liBuono = n(doc, "li", "g");
    liBuono.appendChild(n(doc, "b", "", calcolo.inTesta.distretto));
    liBuono.appendChild(doc.createTextNode(" guida il blocco con " + formattaNumero(calcolo.inTesta.totale) + (soloDiretto ? " serie dirette" : " serie efficaci") + ": " + formattaNumero(calcolo.quotaInTesta) + "% di tutto il volume."));
    avvisi.appendChild(liBuono);
    cardSettimane.appendChild(avvisi);
    due.appendChild(cardSettimane);
    contenitore.appendChild(due);

    /* La dichiarazione: chi non ha secondari registrati conta solo da diretto. */
    const nota = n(doc, "p", "rv-nota");
    nota.appendChild(n(doc, "b", "", calcolo.senzaSecondari + " esercizi su " + calcolo.righeContate));
    nota.appendChild(doc.createTextNode(" non hanno i secondari registrati in muscoli-b.js: contano solo come diretti. Nessun indiretto a occhio."));
    contenitore.appendChild(nota);

    return calcolo;
  };

  return disegna();
}
