/* Barbell Diva B — la schermata «Riepilogo volume» legge il conto (B.14, B.14d, B.14e).
 *
 * Il conto sta in comune/volume-b.js; qui c'e' solo il disegno. Nessun numero
 * scritto a mano: se il conto dice «non registrato», la pagina dice lo stesso.
 *
 * B.14d: colonne Dirette / Indirette / Totale, switch Solo diretto /
 * Diretto + indiretto, mappa settimana x distretto, box Sinergie %.
 * B.14e: due fonti, e uno switch le sceglie. «Dalla scheda» e' il lavoro
 * scritto (la prescrizione). «Dal Logbook» e' il lavoro fatto: le serie chiuse,
 * con le ripetizioni vere. Sono due conti diversi e restano diversi: la pagina
 * non somma l'uno con l'altro e non spaccia l'uno per l'altro.
 */

import { contaVolume, righeDalleSchede, righeDalLogbook, formattaNumero, testoVolume, VOLUME_NON_REGISTRATO } from "./volume-b.js";

function n(doc, tag, classe, testo) {
  const e = doc.createElement(tag);
  if (classe) e.className = classe;
  if (testo != null) e.textContent = String(testo);
  return e;
}

function cartaKpi(doc, etichetta, valore, sotto) {
  const k = n(doc, "div", "rv-k");
  k.appendChild(n(doc, "span", "", etichetta));
  k.appendChild(n(doc, "b", "", valore));
  if (sotto) k.appendChild(n(doc, "em", "", sotto));
  return k;
}

function tabella(doc, intestazioni, righe) {
  const t = n(doc, "table", "rv-tab");
  const thead = n(doc, "thead");
  const trh = n(doc, "tr");
  intestazioni.forEach((voce, i) => trh.appendChild(n(doc, "th", i ? "num" : "", voce)));
  thead.appendChild(trh);
  t.appendChild(thead);
  const tb = n(doc, "tbody");
  righe.forEach((celle) => {
    const tr = n(doc, "tr");
    celle.forEach((voce, i) => {
      const td = n(doc, "td", i ? "num" : "");
      if (i === 0) td.appendChild(n(doc, "b", "", voce));
      else td.textContent = String(voce);
      tr.appendChild(td);
    });
    tb.appendChild(tr);
  });
  t.appendChild(tb);
  return t;
}

function numeroOTrattino(valore) {
  return valore == null ? "—" : formattaNumero(valore);
}

/* La settimana 0 non e' «S0»: e' il secchio di chi la settimana non la porta. */
function nomeSettimana(numero) {
  return numero > 0 ? "S" + numero : "senza sett.";
}

/* La scala dei colori della mappa: rosa con trasparenza crescente, cosi' legge
 * bene sia sul tema scuro sia su quello chiaro. */
function tintaPeso(quota) {
  const q = Math.max(0, Math.min(1, Number(quota) || 0));
  if (q === 0) return "transparent";
  const alpha = (0.10 + q * 0.55).toFixed(2);
  return "rgba(255,79,163," + alpha + ")";
}

/* Mappa settimana x distretto: una riga per distretto, una colonna per
 * settimana, il numero dentro la cella. soloDiretto decide cosa si legge. */
function mappaSettimane(doc, conto, quante, soloDiretto) {
  const distretti = conto.distretti.map((d) => d.distretto);
  const settimane = [];
  for (let w = 1; w <= quante; w += 1) settimane.push(w);
  const griglia = n(doc, "div", "rv-heat");
  griglia.appendChild(n(doc, "div"));
  settimane.forEach((w) => griglia.appendChild(n(doc, "div", "rv-hh", "S" + w)));
  griglia.appendChild(n(doc, "div", "rv-hh", "Totale"));

  let massimo = 0;
  distretti.forEach((d) => {
    const per = conto.perDistrettoSettimana[d] || [];
    per.forEach((c) => {
      const v = soloDiretto ? c.dirette : c.totale;
      if (v > massimo) massimo = v;
    });
  });
  if (!massimo) massimo = 1;

  distretti.forEach((d) => {
    griglia.appendChild(n(doc, "div", "rv-hl", d));
    const per = conto.perDistrettoSettimana[d] || [];
    const perNumero = Object.create(null);
    per.forEach((c) => { perNumero[c.numero] = c; });
    settimane.forEach((w) => {
      const c = perNumero[w];
      const v = c ? (soloDiretto ? c.dirette : c.totale) : 0;
      const cella = n(doc, "div", "rv-hc" + (v ? "" : " vuoto"), v ? formattaNumero(v) : "—");
      cella.style.background = tintaPeso(v / massimo);
      cella.title = d + " · S" + w + " · " + (v ? formattaNumero(v) : "niente di scritto")
        + (c && !soloDiretto ? " (dirette " + formattaNumero(c.dirette) + ", indirette " + formattaNumero(c.indirette) + ")" : "");
      griglia.appendChild(cella);
    });
    const riga = conto.distretti.find((x) => x.distretto === d);
    griglia.appendChild(n(doc, "div", "rv-ht", riga ? formattaNumero(soloDiretto ? riga.dirette : riga.totale) : "—"));
  });
  return griglia;
}

/* Righe -> conto -> schermo. Due switch (fonte e cosa conta) rifanno il conto
 * da capo: non aggiustano i numeri dopo. */
export function renderVolume(doc, contenitore, schede, opzioni) {
  if (!doc || !contenitore) return null;
  const o = opzioni && typeof opzioni === "object" ? opzioni : {};
  const quante = Number.isFinite(Number(o.quante)) && Number(o.quante) > 0 ? Math.floor(Number(o.quante)) : 8;
  const dalLogbook = righeDalLogbook(o.sedute);
  const righeScheda = righeDalleSchede(schede);
  const haLogbook = Array.isArray(o.sedute) && o.sedute.length > 0;
  let fonte = o.fonte === "logbook" && haLogbook ? "logbook" : "scheda";
  let soloDiretto = o.soloDiretto === true;

  const disegna = () => {
    const dalLog = fonte === "logbook";
    const righe = dalLog ? dalLogbook.righe : righeScheda;
    const conto = contaVolume(righe, { quante, soloDiretto });
    contenitore.textContent = "";

    const testa = n(doc, "div", "rv-testa");
    const colonna = n(doc, "div");
    colonna.appendChild(n(doc, "div", "v-occhiello", "Programmi · Riepilogo volume"));
    const titolo = n(doc, "h2");
    titolo.appendChild(doc.createTextNode(dalLog ? "Quanto lavoro, " : "Quanto lavoro, "));
    titolo.appendChild(n(doc, "i", "", dalLog ? "fatto" : "dove"));
    colonna.appendChild(titolo);
    colonna.appendChild(n(doc, "p", "v-testo", dalLog
      ? "Serie chiuse nel Logbook, settimana per settimana: quello che hai fatto davvero, non quello che c'era scritto. Il volume e' serie × ripetizioni."
      : "Serie per distretto, settimana per settimana. Il volume e' serie × ripetizioni: il tonnellaggio non entra in questo conto."));

    if (haLogbook) {
      const fonti = n(doc, "div", "rv-seg");
      fonti.setAttribute("role", "group");
      fonti.setAttribute("aria-label", "da dove si legge il volume");
      const f1 = n(doc, "button", dalLog ? "" : "on", "Dalla scheda");
      const f2 = n(doc, "button", dalLog ? "on" : "", "Dal Logbook");
      f1.setAttribute("type", "button");
      f2.setAttribute("type", "button");
      f1.onclick = () => { if (fonte !== "scheda") { fonte = "scheda"; disegna(); } };
      f2.onclick = () => { if (fonte !== "logbook") { fonte = "logbook"; disegna(); } };
      fonti.appendChild(f1);
      fonti.appendChild(f2);
      colonna.appendChild(fonti);
    }
    testa.appendChild(colonna);

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
    testa.appendChild(switchBox);
    contenitore.appendChild(testa);

    const regola = n(doc, "p", "rv-nota");
    regola.appendChild(doc.createTextNode("La regola, una sola: "));
    regola.appendChild(n(doc, "b", "", "1 punto al bersaglio, 0,5 ai secondari"));
    regola.appendChild(doc.createTextNode(". Una serie su un distretto secondario vale mezza serie. Il totale e' diretto + indiretto."));
    contenitore.appendChild(regola);

    const kpi = n(doc, "div", "rv-kpi");
    kpi.appendChild(cartaKpi(doc, "Media settimana", numeroOTrattino(conto.mediaTotale), soloDiretto ? "serie dirette" : "serie efficaci"));
    kpi.appendChild(cartaKpi(
      doc, "Picco",
      conto.picco ? "S" + conto.picco.numero : "—",
      conto.picco ? formattaNumero(conto.picco.valore) + " serie" : "nessuna serie scritta"
    ));
    kpi.appendChild(cartaKpi(doc, "Dirette", numeroOTrattino(conto.totale.dirette), "al bersaglio, 1 punto"));
    kpi.appendChild(cartaKpi(doc, "Indirette", soloDiretto ? "—" : numeroOTrattino(conto.totale.indirette), soloDiretto ? "spente dallo switch" : "ai secondari, mezzo punto"));
    kpi.appendChild(cartaKpi(doc, "Sinergie", conto.sinergiePct == null ? "—" : formattaNumero(conto.sinergiePct) + "%", "del volume totale"));
    contenitore.appendChild(kpi);

    if (!conto.righeContate) {
      contenitore.appendChild(n(doc, "p", "pg-vuoto", dalLog
        ? "Nessuna serie chiusa nel Logbook: non c'e' lavoro eseguito da contare. Gli zeri non si mettono al posto suo."
        : "Nessuna riga da contare: le schede di questo programma non portano esercizi leggibili. Non si mettono zeri al posto loro."));
      if (dalLog) dichiaraLogbook(doc, contenitore, dalLogbook);
      return conto;
    }

    const cardDistretti = n(doc, "div", "rv-card");
    const ch1 = n(doc, "div", "rv-ch");
    ch1.appendChild(n(doc, "h4", "", "Serie per distretto"));
    ch1.appendChild(n(doc, "span", "", conto.righeContate + " righe contate · " + conto.fuoriVolume + " fuori volume"));
    cardDistretti.appendChild(ch1);
    if (!conto.distretti.length) {
      cardDistretti.appendChild(n(doc, "p", "pg-vuoto", "Nessun distretto riconosciuto: il documento non porta il gruppo muscolare e la mappa non conosce questi nomi. Il conto non lo inventa."));
    } else {
      cardDistretti.appendChild(tabella(
        doc,
        ["Distretto", "Dirette", "Indirette", "Totale"],
        conto.distretti.map((d) => [
          d.distretto,
          formattaNumero(d.dirette),
          soloDiretto ? "—" : formattaNumero(d.indirette),
          formattaNumero(soloDiretto ? d.dirette : d.totale)
        ])
      ));
    }
    contenitore.appendChild(cardDistretti);

    const cardMappa = n(doc, "div", "rv-card");
    const ch2 = n(doc, "div", "rv-ch");
    ch2.appendChild(n(doc, "h4", "", "Mappa settimana × distretto"));
    ch2.appendChild(n(doc, "span", "", soloDiretto ? "solo diretto" : "con le sinergie dentro"));
    cardMappa.appendChild(ch2);
    if (conto.distretti.length) cardMappa.appendChild(mappaSettimane(doc, conto, quante, soloDiretto));
    else cardMappa.appendChild(n(doc, "p", "pg-vuoto", "Niente da disegnare: nessun distretto attribuito."));
    contenitore.appendChild(cardMappa);

    const cardSettimane = n(doc, "div", "rv-card");
    const ch3 = n(doc, "div", "rv-ch");
    ch3.appendChild(n(doc, "h4", "", "Settimana per settimana"));
    ch3.appendChild(n(doc, "span", "", "le settimane non scritte restano vuote"));
    cardSettimane.appendChild(ch3);
    cardSettimane.appendChild(tabella(
      doc,
      ["Sett.", "Serie", "Dirette", "Indirette", "Totale"],
      conto.settimane.map((s) => [
        nomeSettimana(s.numero),
        s.serie > 0 ? formattaNumero(s.serie) : "—",
        s.serie > 0 ? formattaNumero(s.dirette) : "—",
        soloDiretto || s.serie <= 0 ? "—" : formattaNumero(s.indirette),
        s.serie > 0 ? formattaNumero(soloDiretto ? s.dirette : s.totale) : "—"
      ])
    ));
    contenitore.appendChild(cardSettimane);

    const nota = n(doc, "p", "rv-nota");
    nota.appendChild(doc.createTextNode("Chi entra lo decide una regola sola: le tecniche di intensita' contano sempre, anche le righe vecchie che portano il campo a false, ed ereditano distretto e secondari dall'esercizio a cui appartengono. "));
    nota.appendChild(n(doc, "b", "", conto.righeSenzaSecondari + " esercizi su " + conto.righeContate));
    nota.appendChild(doc.createTextNode(" non hanno i secondari registrati: contano solo come diretti. Nessun indiretto a occhio."));
    contenitore.appendChild(nota);

    if (!soloDiretto && conto.sinergiePct != null) {
      const box = n(doc, "p", "rv-nota");
      box.appendChild(doc.createTextNode("Sinergie: "));
      box.appendChild(n(doc, "b", "", formattaNumero(conto.sinergiePct) + "%"));
      box.appendChild(doc.createTextNode(" del volume totale viene dai distretti di sponda. "));
      box.appendChild(doc.createTextNode("Senza lo switch il totale e' diretto + indiretto; con lo switch resta il solo diretto."));
      contenitore.appendChild(box);
    }
    if (dalLog) dichiaraLogbook(doc, contenitore, dalLogbook);
    return conto;
  };

  return disegna();
}

/* Cosa il Logbook ha dato e cosa non ha dato: quattro numeri, nessun giudizio. */
function dichiaraLogbook(doc, contenitore, dalLogbook) {
  const d = dalLogbook.dichiarazioni;
  const nota = n(doc, "p", "rv-nota");
  nota.appendChild(doc.createTextNode("Logbook: "));
  nota.appendChild(n(doc, "b", "", d.seduteUsate + (d.seduteUsate === 1 ? " seduta con serie chiuse" : " sedute con serie chiuse")));
  nota.appendChild(doc.createTextNode(" su " + d.seduteLette + " lette. Le serie sono quelle chiuse, le ripetizioni la somma di quelle vere (8 + 8 + 10, non 3 x 9). "));
  if (d.senzSettimana) {
    nota.appendChild(doc.createTextNode(d.senzSettimana + (d.senzSettimana === 1 ? " seduta non porta la settimana" : " sedute non portano la settimana") + ": entra nel totale e resta fuori dalla media. "));
  }
  if (d.serieSenzaRip) {
    nota.appendChild(doc.createTextNode(d.serieSenzaRip + (d.serieSenzaRip === 1 ? " serie chiusa senza ripetizioni" : " serie chiuse senza ripetizioni") + ": contano come serie e si dichiarano mancanti."));
  }
  contenitore.appendChild(nota);
}
