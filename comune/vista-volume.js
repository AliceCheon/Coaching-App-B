/* Barbell Diva B — la schermata «Riepilogo volume» legge il conto (B.14).
 *
 * Il conto sta in comune/volume-b.js; qui c'e' solo il disegno. Nessun numero
 * scritto a mano: se il conto dice «non registrato», la tabella dice lo stesso.
 */

import { contaVolume, righeDalleSchede, testoTonnellaggio, formattaNumero } from "./volume-b.js";

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
  return valore == null ? "\u2014" : formattaNumero(valore);
}

/* Schede -> righe -> conto -> schermo. `opzioni.quante` sono le colonne che la
 * pagina mostra: le settimane mai scritte restano vuote, non a zero. */
export function renderVolume(doc, contenitore, schede, opzioni) {
  if (!doc || !contenitore) return null;
  const o = opzioni && typeof opzioni === "object" ? opzioni : {};
  const quante = Number.isFinite(Number(o.quante)) && Number(o.quante) > 0 ? Math.floor(Number(o.quante)) : 8;
  const conto = contaVolume(righeDalleSchede(schede), { quante });
  contenitore.textContent = "";

  const testa = n(doc, "div", "rv-testa");
  const colonna = n(doc, "div");
  colonna.appendChild(n(doc, "div", "v-occhiello", "Programmi \u00b7 Riepilogo volume"));
  const titolo = n(doc, "h2");
  titolo.appendChild(doc.createTextNode("Quanto lavoro, "));
  titolo.appendChild(n(doc, "i", "", "dove"));
  colonna.appendChild(titolo);
  colonna.appendChild(n(doc, "p", "v-testo", "Serie e ripetizioni scritte nella scheda, contate distretto per distretto e settimana per settimana. Il conto parte dalle righe, non dai numeri di questa pagina."));
  testa.appendChild(colonna);
  contenitore.appendChild(testa);

  const kpi = n(doc, "div", "rv-kpi");
  kpi.appendChild(cartaKpi(doc, "Media settimana", numeroOTrattino(conto.mediaSerie), "serie contate"));
  kpi.appendChild(cartaKpi(
    doc, "Picco",
    conto.picco ? "S" + conto.picco.numero : "\u2014",
    conto.picco ? formattaNumero(conto.picco.serie) + " serie" : "nessuna serie scritta"
  ));
  kpi.appendChild(cartaKpi(doc, "Settimane contate", String(conto.settimaneContate), "su " + quante + " della scheda"));
  kpi.appendChild(cartaKpi(doc, "Tonnellaggio", testoTonnellaggio(conto.totale.tonnellaggio), "serie \u00d7 ripetizioni \u00d7 peso"));
  kpi.appendChild(cartaKpi(doc, "Distretti", String(conto.distretti.length), "toccati dalle schede"));
  contenitore.appendChild(kpi);

  if (!conto.righeContate) {
    const vuoto = n(doc, "p", "pg-vuoto", "Nessuna riga da contare: le schede di questo programma non portano esercizi leggibili. Non si mettono zeri al posto loro.");
    contenitore.appendChild(vuoto);
    return conto;
  }

  const cardDistretti = n(doc, "div", "rv-card");
  const ch1 = n(doc, "div", "rv-ch");
  ch1.appendChild(n(doc, "h4", "", "Serie e tonnellaggio per distretto"));
  ch1.appendChild(n(doc, "span", "", conto.righeContate + " righe contate \u00b7 " + conto.fuoriVolume + " fuori volume"));
  cardDistretti.appendChild(ch1);
  if (!conto.distretti.length) {
    cardDistretti.appendChild(n(doc, "p", "pg-vuoto", "Nessun distretto riconosciuto: il documento non porta il gruppo muscolare. Il conto non lo inventa."));
  } else {
    cardDistretti.appendChild(tabella(
      doc,
      ["Distretto", "Serie", "Ripetizioni", "Tonnellaggio"],
      conto.distretti.map((d) => [d.distretto, formattaNumero(d.serie), formattaNumero(d.ripetizioni), testoTonnellaggio(d.tonnellaggio)])
    ));
  }
  contenitore.appendChild(cardDistretti);

  const cardSettimane = n(doc, "div", "rv-card");
  const ch2 = n(doc, "div", "rv-ch");
  ch2.appendChild(n(doc, "h4", "", "Settimana per settimana"));
  ch2.appendChild(n(doc, "span", "", "le settimane non scritte restano vuote"));
  cardSettimane.appendChild(ch2);
  cardSettimane.appendChild(tabella(
    doc,
    ["Sett.", "Serie", "Ripetizioni", "Tonnellaggio"],
    conto.settimane.map((s) => [
      "S" + s.numero,
      s.serie > 0 ? formattaNumero(s.serie) : "\u2014",
      s.serie > 0 ? formattaNumero(s.ripetizioni) : "\u2014",
      testoTonnellaggio(s.tonnellaggio)
    ])
  ));
  contenitore.appendChild(cardSettimane);

  const nota = n(doc, "p", "rv-nota");
  nota.appendChild(doc.createTextNode("Chi entra nel volume lo decide una regola sola: le tecniche di intensit\u00e0 contano sempre, anche le righe vecchie che portano il campo a false. Il tonnellaggio \u00e8 serie \u00d7 ripetizioni \u00d7 peso: quando il peso non \u00e8 scritto la colonna dice "));
  nota.appendChild(n(doc, "b", "", "non registrato"));
  nota.appendChild(doc.createTextNode(", mai zero."));
  contenitore.appendChild(nota);

  return conto;
}
