import { nomePulito } from "./nome-pulito.js";
/* Barbell Diva B — la schermata Overview atleta (fase 2.3).
 *
 * Le classi sono quelle del v31 (ck-testa, ck-sez, ck-card, ck-met): l'aspetto
 * è lo stesso della Dashboard, così il colore e il filo delle carte arrivano
 * da soli. Le classi ov-* sono solo per i pezzi che la Dashboard non ha.
 *
 * Regola:nessun numero inventato. Il piano settimanale non è nel contratto di
 * lettura, quindi il ritmo non diventa «aderenza» e non ha una percentuale.
 */

const NON = "non registrato";

function n(doc, tag, classe, testo) {
  const e = doc.createElement(tag);
  if (classe) e.className = classe;
  if (testo != null) e.textContent = String(testo);
  return e;
}

function icona(doc, percorso) {
  const s = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("class", "ck-ic");
  s.setAttribute("viewBox", "0 0 16 16");
  s.setAttribute("width", "13");
  s.setAttribute("height", "13");
  s.setAttribute("fill", "none");
  s.setAttribute("stroke", "currentColor");
  s.setAttribute("stroke-width", "1.4");
  s.setAttribute("stroke-linecap", "round");
  s.setAttribute("stroke-linejoin", "round");
  s.setAttribute("aria-hidden", "true");
  const p = doc.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", percorso);
  s.appendChild(p);
  return s;
}

function sezione(doc, percorso, testo) {
  const d = n(doc, "div", "ck-sez");
  d.appendChild(icona(doc, percorso));
  d.appendChild(n(doc, "span", "", testo));
  return d;
}

function testa(doc, modello) {
  const c = n(doc, "div", "ck-testa");
  const d = n(doc, "div");
  d.appendChild(n(doc, "div", "ov-oc", "Programmi · Overview atleta"));
  const h = n(doc, "h2");
  h.appendChild(doc.createTextNode("Tutto "));
  h.appendChild(n(doc, "i", "", "insieme"));
  d.appendChild(h);
  const p = n(doc, "p");
  p.appendChild(doc.createTextNode("Programma attivo, settimana, ritmo e ultime sedute in una schermata sola. "));
  p.appendChild(doc.createTextNode("Ogni numero è contato sulle sedute lette da A: dove il dato manca lo dice."));
  d.appendChild(p);
  c.appendChild(d);
  const g = n(doc, "button", "ck-guida", "Guida Overview");
  g.type = "button";
  g.disabled = true;
  g.title = "arriva con la schermata Impostazioni (2.15)";
  c.appendChild(g);
  return c;
}

function donut(doc, quota, totale, etichetta) {
  const d = n(doc, "div", "ov-donut");
  const q = totale > 0 ? Math.round((quota / totale) * 100) : 0;
  d.style.setProperty("--q", String(q));
  d.appendChild(n(doc, "b", "", totale > 0 ? quota + "/" + totale : "—"));
  const et = n(doc, "span", "ov-donut-lab", etichetta);
  d.appendChild(et);
  return d;
}

function sintesi(doc, modello, r) {
  const c = n(doc, "section", "ck-ready ov-sint");
  const d = n(doc, "div", "ov-sint-testo");
  d.appendChild(n(doc, "div", "ck-ready-testa", "Stato di sintesi"));
  const h3 = n(doc, "h3", "", "Settimane con almeno una seduta ");
  h3.appendChild(n(doc, "b", "", r.settimaneTotali ? r.settimaneAttive + "/" + r.settimaneTotali : NON));
  d.appendChild(h3);
  d.appendChild(n(doc, "p", "ck-frase",
    r.settimaneTotali
      ? "Su " + r.settimaneTotali + " settimane guardate, " + r.settimaneAttive + " hanno almeno una seduta registrata. Il conto è sulle date delle sedute, non sui piani."
      : "Nessuna seduta con una data leggibile: la sintesi resta vuota invece di mostrare zeri."));
  const pr = modello.programma;
  d.appendChild(n(doc, "p", "ck-ready-nota ov-sint-prog",
    pr && pr.nome ? "Programma attivo: " + nomePulito(pr.nome) + (pr.settimana != null ? " · settimana " + pr.settimana : "") : "Programma attivo: " + NON));
  c.appendChild(d);
  c.appendChild(donut(doc, r.settimaneAttive, r.settimaneTotali, "settimane attive"));
  const ottoSettimane = (r.blocchi || []).reduce((a, b) => a + b.numero, 0);
  c.appendChild(donut(doc, r.ultimi28, ottoSettimane, "28 giorni su 8 sett."));
  return c;
}

function kpi(doc, r) {
  const griglia = n(doc, "div", "ck-mets ov-kpi");
  const voce = (etichetta, valore, unita, nota) => {
    const a = n(doc, "article", "ck-met");
    a.appendChild(n(doc, "div", "ck-met-t", etichetta));
    a.appendChild(n(doc, "div", "ck-met-v", valore));
    const u = n(doc, "div", "ck-met-u", unita);
    u.appendChild(n(doc, "span", "ck-met-n", nota));
    a.appendChild(u);
    return a;
  };
  griglia.appendChild(voce("Sedute lette", String(r.totale), "sedute", r.senzaData ? r.senzaData + " senza data leggibile" : "tutte con data"));
  griglia.appendChild(voce("Ultimi 28 giorni", String(r.ultimi28), "sedute", "finestra di quattro settimane"));
  griglia.appendChild(voce("Giorni dall'ultima", r.giorniUltima == null ? "—" : String(r.giorniUltima), "giorni", r.giorniUltima == null ? "nessuna data" : "calcolato sulla data della seduta"));
  griglia.appendChild(voce("Ritmo", r.ritmo == null ? "—" : String(r.ritmo), "sedute / sett.", "media, non aderenza: il piano non è nel contratto"));
  griglia.appendChild(voce("Schede usate", String(r.schede.length), "schede", "codici distinti nelle sedute"));
  griglia.appendChild(voce("Settimane attive", r.settimaneTotali ? r.settimaneAttive + "/" + r.settimaneTotali : "—", "settimane", "almeno una seduta"));
  return griglia;
}

function ritmo(doc, r) {
  const c = n(doc, "article", "ck-card ov-ritmo");
  const h = n(doc, "header", "ck-h");
  const d = n(doc, "div");
  d.appendChild(n(doc, "h4", "", "Ritmo settimanale · ultime " + r.settimaneTotali + " settimane"));
  d.appendChild(n(doc, "p", "", "blocchi di sette giorni che finiscono oggi · conteggio delle sedute"));
  h.appendChild(d);
  c.appendChild(h);
  if (!r.totale) {
    c.appendChild(n(doc, "p", "ck-piede-card", "Nessuna seduta letta: le barre restano vuote invece di simulare un andamento."));
    return c;
  }
  const max = Math.max(1, ...r.blocchi.map((b) => b.numero));
  const barre = n(doc, "div", "ov-bars");
  r.blocchi.forEach((b) => {
    const col = n(doc, "div", "ov-bar");
    const i = n(doc, "i");
    i.style.height = Math.round((b.numero / max) * 88) + "px";
    i.style.minHeight = b.numero ? "6px" : "2px";
    if (!b.numero) i.className = "vuota";
    col.appendChild(n(doc, "b", "", String(b.numero)));
    col.appendChild(i);
    const et = b.da.getUTCDate() + "/" + (b.da.getUTCMonth() + 1);
    col.appendChild(n(doc, "span", "", b.ultima ? "oggi" : et));
    barre.appendChild(col);
  });
  c.appendChild(barre);
  const totale = r.blocchi.reduce((a, b) => a + b.numero, 0);
  c.appendChild(n(doc, "p", "ck-piede-card", totale + " sedute nelle " + r.settimaneTotali + " settimane · massimo " + max + " in una settimana"));
  return c;
}

function schede(doc, r) {
  const c = n(doc, "article", "ck-card ov-schede");
  const h = n(doc, "header", "ck-h");
  const d = n(doc, "div");
  d.appendChild(n(doc, "h4", "", "Schede usate"));
  d.appendChild(n(doc, "p", "", "quante sedute per ogni codice di scheda"));
  h.appendChild(d);
  c.appendChild(h);
  if (!r.schede.length) {
    c.appendChild(n(doc, "p", "ck-piede-card", "Nessun codice di scheda nelle sedute: non invento nomi al posto loro."));
    return c;
  }
  const g = n(doc, "div", "ov-schede-lista");
  r.schede.forEach((s) => {
    const p = n(doc, "span", "ov-scheda");
    p.appendChild(n(doc, "b", "", s.codice));
    p.appendChild(n(doc, "span", "", s.numero + (s.numero === 1 ? " seduta" : " sedute")));
    g.appendChild(p);
  });
  c.appendChild(g);
  return c;
}

function ultime(doc, r) {
  const c = n(doc, "article", "ck-card ov-ultime");
  const h = n(doc, "header", "ck-h");
  const d = n(doc, "div");
  d.appendChild(n(doc, "h4", "", "Ultime sedute registrate"));
  d.appendChild(n(doc, "p", "", "dalla più recente, con la data e il codice della scheda"));
  h.appendChild(d);
  c.appendChild(h);
  if (!r.ultime.length) {
    c.appendChild(n(doc, "p", "ck-piede-card", "Nessuna seduta con data leggibile."));
    return c;
  }
  const lista = n(doc, "div", "ov-sed");
  r.ultime.forEach((s) => {
    const riga = n(doc, "div", "ov-sed-r");
    const g = s.data;
    riga.appendChild(n(doc, "span", "ov-sed-d", String(g.getUTCDate()).padStart(2, "0") + "/" + String(g.getUTCMonth() + 1).padStart(2, "0") + "/" + g.getUTCFullYear()));
    riga.appendChild(n(doc, "span", "ov-sed-c", s.codice || "senza codice"));
    riga.appendChild(n(doc, "span", "ov-sed-n", nomePulito(s.nome) || "nome non registrato"));
    lista.appendChild(riga);
  });
  c.appendChild(lista);
  return c;
}

function cosaManca(doc) {
  const c = n(doc, "article", "ck-card ov-manca");
  const h = n(doc, "header", "ck-h");
  const d = n(doc, "div");
  d.appendChild(n(doc, "h4", "", "Cosa non c'è, e perché"));
  d.appendChild(n(doc, "p", "", "i riquadri restano spenti finché il dato non esiste, invece di mostrare zeri finti"));
  h.appendChild(d);
  c.appendChild(h);
  const righe = [
    ["Aderenza vera", "serve il piano settimanale, fuori dal contratto di lettura: qui si conta il ritmo"],
    ["Storico del peso", "in A c'è il peso di oggi, non la serie: nessuna curva inventata"],
    ["Sonno, HRV, passi, macro", "arrivano dall'app del telefono, non dal documento letto"],
    ["Carico per gruppo muscolare", "le articolazioni per esercizio non sono nel backup"]
  ];
  const lista = n(doc, "div", "ov-manca-lista");
  righe.forEach(([titolo, testo]) => {
    const r = n(doc, "div", "ov-manca-r");
    r.appendChild(n(doc, "b", "", titolo));
    r.appendChild(n(doc, "span", "", testo));
    lista.appendChild(r);
  });
  c.appendChild(lista);
  return c;
}

/* La vista riceve il riepilogo già calcolato da comune/overview.js. */
export function renderOverviewAtleta(doc, contenitore, modello, calcoli) {
  while (contenitore.firstChild) contenitore.firstChild.remove();
  const r = calcoli || { totale: 0, conData: 0, senzaData: 0, ultimi28: 0, giorniUltima: null, blocchi: [], settimaneAttive: 0, settimaneTotali: 0, ritmo: null, schede: [], ultime: [] };
  contenitore.appendChild(testa(doc, modello || {}));
  contenitore.appendChild(sintesi(doc, modello || {}, r));
  contenitore.appendChild(sezione(doc, "M2 6.5L8 2l6 4.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z", "Stato di sintesi · i numeri di adesso"));
  contenitore.appendChild(kpi(doc, r));
  contenitore.appendChild(sezione(doc, "M2 12l4-4.5 3 2.2L14 4", "Andamento · come si distribuiscono le sedute"));
  const due = n(doc, "div", "ck-due");
  due.appendChild(ritmo(doc, r));
  due.appendChild(schede(doc, r));
  contenitore.appendChild(due);
  contenitore.appendChild(sezione(doc, "M4 2.5h6l2.5 2.5v8.5H4z", "Registro · le ultime sedute e i vuoti dichiarati"));
  const due2 = n(doc, "div", "ck-due");
  due2.appendChild(ultime(doc, r));
  due2.appendChild(cosaManca(doc));
  contenitore.appendChild(due2);
  return contenitore;
}

export const OVERVIEW_NON_REGISTRATO = NON;
