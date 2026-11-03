/* Barbell Diva B — la Dashboard (fase 2.1, passo 2).
 *
 * Costruisce la schermata con le classi del mockup v31 (ck-testa, ck-ready,
 * ck-mets, ck-due, ck-card…): l'aspetto è quello, i numeri sono quelli di A.
 * Regola unica: se il dato non c'è, si dichiara «non registrato» e si dice
 * perché. Nessun valore di riempimento, nessuna stima a occhio.
 *
 * Modulo puro di presentazione: riceve il modello già letto (comune/lettura-dati.js)
 * e non parla con Firebase. Nessuna scrittura, nessun ascoltatore.
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

/* Titolo di sezione, come i ck-sez del mockup: icona + frase. */
function sezione(doc, percorso, testo) {
  const d = n(doc, "div", "ck-sez");
  d.appendChild(icona(doc, percorso));
  d.appendChild(n(doc, "span", "", testo));
  return d;
}

function pillola(doc, testo, tono) {
  return n(doc, "span", "ck-pill " + (tono || "mute"), testo);
}

function vuoto(doc, titolo, spiegazione) {
  const c = n(doc, "div", "ck-vuoto-c");
  c.appendChild(n(doc, "span", "ck-ic-vuoto", "!"));
  const d = n(doc, "div");
  d.appendChild(n(doc, "b", "", titolo));
  d.appendChild(n(doc, "p", "", spiegazione));
  c.appendChild(d);
  return c;
}

/* I cinque segnali del check-in, 1-5. Restituisce null se ne manca anche uno:
 * una media su tre segnali non è «readiness», e non la spaccio per tale. */
export function readiness(wellness) {
  if (!wellness) return null;
  const chiavi = ["energy", "sleep", "doms", "stress", "hunger"];
  const valori = [];
  for (const k of chiavi) {
    const v = wellness[k];
    if (typeof v !== "number" || !Number.isFinite(v)) return null;
    valori.push(v);
  }
  const media = valori.reduce((a, b) => a + b, 0) / valori.length;
  return { punteggio: Math.round((media / 5) * 100), valori, chiavi };
}


/* Il disegno della robottina, preso dal mockup v31 tale e quale: stessa
 * posizione, stessa misura (86px, dal foglio testata-diva.css), stessa
 * faccia allegra. Non è un'immagine da scaricare: sono le sue forme. */
const SVG_ROBOT = `<svg class="diva-bot" viewBox="0 0 240 260" aria-hidden="true" focusable="false"><g class="diva-bot-antenna"><path d="M120 49V31" fill="none" stroke="#c7b8d8" stroke-width="7" stroke-linecap="round"/><path d="M120 29c-13-15-30 4 0 23 30-19 13-38 0-23Z" fill="#ff72c2" stroke="#ffe1f4" stroke-width="3"/></g><g class="diva-bot-arm diva-bot-arm-left"><circle class="diva-bot-joint" cx="68" cy="177" r="13"/><path class="diva-bot-shell" d="M64 171c-17 1-27 13-28 29-1 12 7 20 17 17 9-3 13-15 16-30Z"/><circle class="diva-bot-joint" cx="47" cy="211" r="10"/></g><g class="diva-bot-arm diva-bot-arm-right"><circle class="diva-bot-joint" cx="172" cy="177" r="13"/><path class="diva-bot-shell" d="M176 171c17 1 27 13 28 29 1 12-7 20-17 17-9-3-13-15-16-30Z"/><circle class="diva-bot-joint" cx="193" cy="211" r="10"/><path d="M196 204v-13m-6 4 6-8 6 8" fill="none" stroke="#ff72c2" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g><g class="diva-bot-body"><path class="diva-bot-shell" d="M76 164c10-14 78-14 88 0l-7 68c-13 16-61 16-74 0Z"/><path d="M86 176h68l-5 42c-13 11-45 11-58 0Z" fill="#ded5e9" stroke="#9f87bb" stroke-width="3"/><path class="diva-bot-heart-shape" d="M120 189c-10-12-24 3 0 20 24-17 10-32 0-20Z"/><path class="diva-bot-shell" d="M90 230l-8 18h34l4-16m30-2 8 18h-34l-4-16"/></g><g class="diva-bot-barbell"><rect x="35" y="203" width="170" height="8" rx="4" fill="#f5eaff" stroke="#9f87bb" stroke-width="3"/><rect x="22" y="184" width="16" height="46" rx="6" fill="#ff72c2" stroke="#6f4c86" stroke-width="4"/><rect x="9" y="191" width="15" height="32" rx="5" fill="#c96cff" stroke="#6f4c86" stroke-width="4"/><rect x="202" y="184" width="16" height="46" rx="6" fill="#ff72c2" stroke="#6f4c86" stroke-width="4"/><rect x="216" y="191" width="15" height="32" rx="5" fill="#c96cff" stroke="#6f4c86" stroke-width="4"/></g><g class="diva-bot-head"><path class="diva-bot-shell" d="M45 73c15-27 135-27 150 0 12 20 12 72-3 91-21 27-123 27-144 0-15-19-15-71-3-91Z"/><path d="M41 96c-16 5-18 44-1 51m159-51c16 5 18 44 1 51" fill="#efe6f7" stroke="#ff72c2" stroke-width="7" stroke-linecap="round"/><rect class="diva-bot-screen" x="57" y="83" width="126" height="77" rx="31"/><path class="diva-bot-screen-glint" d="M75 92c20-8 67-10 91 0-37 1-68 8-92 22-5-8-4-16 1-22Z"/></g><g class="diva-bot-face"><g class="diva-bot-face-idle"><g class="diva-bot-eyes"><circle class="diva-bot-face-fill" cx="93" cy="117" r="8"/><circle class="diva-bot-face-fill" cx="147" cy="117" r="8"/></g><path class="diva-bot-face-stroke" d="M103 137q17 15 34 0"/></g><g class="diva-bot-face-happy"><g class="diva-bot-eyes"><path class="diva-bot-face-stroke" d="M80 119q13-21 26 0M134 119q13-21 26 0"/></g><path class="diva-bot-face-fill" d="M101 135q19 24 38 0c-4 28-34 28-38 0Z"/></g><g class="diva-bot-face-thinking"><g class="diva-bot-eyes"><circle class="diva-bot-face-fill" cx="92" cy="117" r="8"/><path class="diva-bot-face-stroke" d="M137 117q11-12 22 0"/></g><path class="diva-bot-face-stroke" d="M109 139q11 5 22 0"/><circle class="diva-bot-face-fill" cx="177" cy="70" r="4"/><circle class="diva-bot-face-fill" cx="190" cy="60" r="3"/></g><g class="diva-bot-face-encouraging"><g class="diva-bot-eyes"><circle class="diva-bot-face-fill" cx="93" cy="117" r="8"/><path class="diva-bot-face-stroke" d="M135 117q12-13 24 0"/></g><path class="diva-bot-face-stroke" d="M102 136q18 17 36 0"/></g><g class="diva-bot-face-warning"><g class="diva-bot-eyes"><path class="diva-bot-face-stroke" d="M80 111l25 4M135 115l25-4"/></g><path class="diva-bot-face-stroke" d="M106 140q14-7 28 0"/></g><g class="diva-bot-face-rest"><g class="diva-bot-eyes"><path class="diva-bot-face-stroke" d="M80 119h26M134 119h26"/></g><path class="diva-bot-face-stroke" d="M109 139h22"/><text x="171" y="86" fill="#ff72c2" font-size="20" font-weight="800">Z</text></g></g></svg>`;

/* La testata di benvenuto: la Diva nel riquadro, con la sua bolla. Parla
 * solo di ciò che il modello sa: se la readiness non si calcola, lo dice. */
function testataDiva(doc, modello) {
  const c = n(doc, "div", "db-hero");
  const carta = n(doc, "div", "db-diva");
  carta.id = "db-diva-carta";
  const r = readiness(modello.checkin && modello.checkin.wellness);
  carta.title = r ? "Diva Bot dice come sta andando la giornata" : "Diva Bot: oggi manca il check-in";
  const scatola = n(doc, "div", "db-robot");
  const pezzo = doc.createRange().createContextualFragment(SVG_ROBOT);
  scatola.appendChild(pezzo);
  carta.appendChild(scatola);
  const bolla = n(doc, "div", "db-balloon");
  const et = n(doc, "div", "db-etich");
  et.appendChild(n(doc, "span", "db-dot"));
  et.appendChild(doc.createTextNode("Coach AI"));
  bolla.appendChild(et);
  const nome = (modello.atleta && modello.atleta.nome) || "Alice";
  let titolo, frase, coda;
  if (!r) {
    titolo = "Ciao, " + nome + "!";
    frase = "Il check-in di oggi non c'è: senza i cinque segnali non ti dico di spingere, e non me li invento.";
    coda = "Compila il questionario e torno con la risposta.";
  } else if (r.punteggio >= 65) {
    titolo = "Sei pronta, " + nome + "!";
    frase = "I segnali di oggi reggono il carico: si progredisce con calma e tecnica pulita.";
    coda = "Readiness " + r.punteggio + "/100.";
  } else if (r.punteggio >= 40) {
    titolo = "Oggi si mantiene, " + nome + ".";
    frase = "I segnali sono a metà: carico fermo dov'è, recupero curato.";
    coda = "Readiness " + r.punteggio + "/100.";
  } else {
    titolo = "Oggi si scarica, " + nome + ".";
    frase = "I segnali sono bassi: meglio alleggerire che forzare.";
    coda = "Readiness " + r.punteggio + "/100.";
  }
  const b = n(doc, "b", "db-titolo", titolo);
  bolla.appendChild(b);
  const p = n(doc, "p");
  p.appendChild(doc.createTextNode(frase + " "));
  p.appendChild(n(doc, "em", "", coda));
  bolla.appendChild(p);
  carta.appendChild(bolla);
  c.appendChild(carta);
  return c;
}

function testa(doc, modello) {
  const c = n(doc, "div", "ck-testa");
  const d = n(doc, "div");
  const h = n(doc, "h2", "", "Benvenuta, ");
  const i = n(doc, "i", "", "Alice");
  h.appendChild(i);
  h.appendChild(doc.createTextNode("!"));
  d.appendChild(h);
  const p = n(doc, "p");
  p.appendChild(doc.createTextNode("Dashboard principale"));
  p.appendChild(n(doc, "span", "sep", "/"));
  const pr = modello.programma;
  p.appendChild(doc.createTextNode(pr && pr.nome ? pr.nome : "programma non registrato"));
  p.appendChild(n(doc, "span", "sep", "/"));
  p.appendChild(doc.createTextNode(pr && pr.settimana != null ? "settimana " + pr.settimana : "settimana non registrata"));
  d.appendChild(p);
  c.appendChild(d);
  const g = n(doc, "button", "ck-guida", "Guida Dashboard");
  g.type = "button";
  g.disabled = true;
  g.title = "arriva con la schermata Impostazioni (2.15)";
  c.appendChild(g);
  return c;
}

function bloccoReadiness(doc, modello) {
  const c = n(doc, "section", "ck-ready");
  const r = readiness(modello.checkin && modello.checkin.wellness);

  const g = n(doc, "div", "ck-gauge");
  const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 96 96");
  svg.setAttribute("width", "96");
  svg.setAttribute("height", "96");
  svg.setAttribute("aria-hidden", "true");
  const sfondo = doc.createElementNS("http://www.w3.org/2000/svg", "circle");
  sfondo.setAttribute("cx", "48"); sfondo.setAttribute("cy", "48"); sfondo.setAttribute("r", "34");
  sfondo.setAttribute("class", "ck-anello-sfondo");
  svg.appendChild(sfondo);
  if (r) {
    const cerchio = doc.createElementNS("http://www.w3.org/2000/svg", "circle");
    cerchio.setAttribute("cx", "48"); cerchio.setAttribute("cy", "48"); cerchio.setAttribute("r", "34");
    cerchio.setAttribute("class", "ck-anello-valore ok");
    cerchio.setAttribute("stroke-dasharray", ((2 * Math.PI * 34 * r.punteggio) / 100).toFixed(1) + " 213.6");
    cerchio.setAttribute("transform", "rotate(-90 48 48)");
    svg.appendChild(cerchio);
  }
  const num = doc.createElementNS("http://www.w3.org/2000/svg", "text");
  num.setAttribute("x", "48"); num.setAttribute("y", "52"); num.setAttribute("text-anchor", "middle");
  num.setAttribute("class", "ck-gauge-num");
  num.textContent = r ? String(r.punteggio) : "—";
  svg.appendChild(num);
  g.appendChild(svg);
  g.appendChild(n(doc, "span", "ck-gauge-lab", "Readiness"));
  c.appendChild(g);

  const corpo = n(doc, "div");
  const t = n(doc, "div", "ck-ready-testa");
  const h3 = n(doc, "h3", "", "Readiness media ");
  h3.appendChild(n(doc, "span", "ck-slash", "—"));
  h3.appendChild(doc.createTextNode(" "));
  const b = n(doc, "b", "", r ? r.punteggio + "/100" : NON);
  h3.appendChild(b);
  t.appendChild(h3);
  t.appendChild(pillola(doc, r ? "DATI SUFFICIENTI · 5/5" : "SEGNALI INCOMPLETI · nessuna media", r ? "ok" : "no"));
  corpo.appendChild(t);
  corpo.appendChild(n(doc, "p", "ck-frase", r ? frase(r.punteggio) : "Il check-in di oggi non porta i cinque segnali: senza tutti e cinque non calcolo una media."));

  const leg = n(doc, "p", "ck-legenda-scala");
  leg.appendChild(n(doc, "b", "", "Come leggerlo:"));
  leg.appendChild(n(doc, "span", "v-ok", "≥65 buono → progredisci"));
  leg.appendChild(n(doc, "span", "sep", "|"));
  leg.appendChild(n(doc, "span", "v-mid", "40-64 medio → mantieni carico e recupero"));
  leg.appendChild(n(doc, "span", "sep", "|"));
  leg.appendChild(n(doc, "span", "v-low", "<40 basso → prima il recupero"));
  corpo.appendChild(leg);

  const chips = n(doc, "div", "ck-chips");
  const etichette = { energy: "Energia", sleep: "Sonno", doms: "DOMS", stress: "Stress", hunger: "Fame" };
  const w = (modello.checkin && modello.checkin.wellness) || {};
  Object.keys(etichette).forEach((k) => {
    const chip = n(doc, "span", "ck-chip");
    chip.appendChild(n(doc, "em", "", etichette[k]));
    const v = w[k];
    chip.appendChild(n(doc, "b", "", typeof v === "number" ? v + "/5" : "—"));
    chips.appendChild(chip);
  });
  corpo.appendChild(chips);
  c.appendChild(corpo);

  const nota = n(doc, "div", "ck-ready-nota");
  const p1 = n(doc, "p");
  p1.appendChild(n(doc, "b", "", "Da dove viene."));
  p1.appendChild(doc.createTextNode(" Media delle risposte del check-in di oggi (energia, sonno, DOMS, stress, fame), riportata in centesimi. "));
  p1.appendChild(doc.createTextNode(modello.checkin && modello.checkin.data ? "Check-in del " + modello.checkin.data + "." : "Nessuna data di check-in leggibile."));
  nota.appendChild(p1);
  nota.appendChild(n(doc, "p", "", "Non è la prontezza pesata del piano G3: quella vuole sei segnali, e due — sonno misurato e carico settimanale — l'app ancora non li registra."));
  c.appendChild(nota);
  return c;
}

function frase(p) {
  if (p >= 75) return "I segnali di oggi reggono il carico.";
  if (p >= 65) return "Sopra la soglia buona: si può progredire con calma.";
  if (p >= 40) return "Zona media: mantieni il carico e cura il recupero.";
  return "Sotto 40: prima il recupero, il carico aspetta.";
}

function metrica(doc, percorso, etichetta, valore, unita, nota) {
  const a = n(doc, "article", "ck-met");
  const t = n(doc, "div", "ck-met-t");
  t.appendChild(icona(doc, percorso));
  t.appendChild(n(doc, "span", "", etichetta));
  a.appendChild(t);
  a.appendChild(n(doc, "div", "ck-met-v", valore));
  const u = n(doc, "div", "ck-met-u", unita);
  u.appendChild(n(doc, "span", "ck-met-n", nota));
  a.appendChild(u);
  return a;
}

function statoDiSintesi(doc, modello) {
  const sez = sezione(doc, "M2 6.5L8 2l6 4.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z", "Stato di sintesi · i numeri che guidano la decisione");
  const mets = n(doc, "div", "ck-mets");
  mets.appendChild(metrica(doc, "M4 5h8l1.5 8.5a1 1 0 0 1-1 1.2H3.5a1 1 0 0 1-1-1.2z", "Peso",
    modello.peso ? String(modello.peso) : "—", "kg",
    modello.peso ? "state.metrics.weight" : "nessuna pesata in A"));
  mets.appendChild(metrica(doc, "M12.5 10.5A5.5 5.5 0 0 1 5 3.2a5.5 5.5 0 1 0 7.5 7.3z", "Sonno", "—", "h", "nessuna durata registrata"));
  mets.appendChild(metrica(doc, "M8 13S3 10 3 6.4A2.6 2.6 0 0 1 8 5a2.6 2.6 0 0 1 5 1.4C13 10 8 13 8 13z", "HRV / FC", "—", "ms/bpm", "nessuna misura"));
  mets.appendChild(metrica(doc, "M4 5h8l1.5 8.5a1 1 0 0 1-1 1.2H3.5a1 1 0 0 1-1-1.2z", "Passi", "—", "passi", "nessuna misura"));
  mets.appendChild(metrica(doc, "M4 2v5a2 2 0 0 0 4 0V2", "Macro", "—", "kcal", "fuori perimetro (nutrizione)"));
  mets.appendChild(metrica(doc, "M2 5v6M14 5v6M4.5 3.5v9M11.5 3.5v9M4.5 8h7", "Carico", "—", "kg·rip / sett.", "arriva con Riepilogo volume"));
  return [sez, mets];
}

function carta(doc, titolo, sottotitolo, pill) {
  const c = n(doc, "article", "ck-card");
  const h = n(doc, "header", "ck-h");
  const d = n(doc, "div");
  const h4 = n(doc, "h4", "", titolo);
  d.appendChild(h4);
  if (sottotitolo) d.appendChild(n(doc, "p", "", sottotitolo));
  h.appendChild(d);
  if (pill) h.appendChild(pill);
  c.appendChild(h);
  return c;
}

function seduteEProgrammi(doc, modello, opzioni) {
  const sez = sezione(doc, "M2 12l4-4.5 3 2.2L14 4", "Sedute e programmi · quello che B ha trovato in A");
  const due = n(doc, "div", "ck-due");

  const c1 = carta(doc, "Sedute registrate", "sottoraccolta sessions · campo session.id", pillola(doc, "dati veri", "ok"));
  if (modello.seduteNonLette) {
    c1.appendChild(n(doc, "div", "ck-met-v", "lettura non riuscita"));
    c1.appendChild(n(doc, "p", "ck-piede-card", "La sottoraccolta sessions non ha risposto: nessun numero al suo posto, riprova con «Ricarica»."));
  } else if (!modello.presente) {
    c1.appendChild(n(doc, "div", "ck-met-v", NON));
  } else {
    c1.appendChild(n(doc, "div", "ck-met-v", String(modello.numeroSedute)));
    c1.appendChild(n(doc, "p", "ck-piede-card",
      "su " + (modello.numeroDocumentiSedute == null ? "?" : modello.numeroDocumentiSedute) + " documenti letti" +
      (modello.seduteSenzaId || modello.seduteDuplicate
        ? " · scartati come in A: " + modello.seduteSenzaId + " senza id, " + modello.seduteDuplicate + " duplicati"
        : "")));
    const u = modello.ultima;
    c1.appendChild(n(doc, "p", "ck-piede-card", u ? "ultima: " + u.data + " · scheda " + u.codice : "ultima: non registrata"));
  }
  if (opzioni && opzioni.quadroNumeri) {
    c1.appendChild(n(doc, "p", "ck-piede-card", opzioni.quadroNumeri));
  }
  due.appendChild(c1);

  const c2 = carta(doc, "Programma attivo", "nutritionPhotos · solo documenti-programma", pillola(doc, modello.programma ? "letto" : "vuoto", modello.programma ? "ok" : "mute"));
  if (modello.programmiNonLetti) {
    c2.appendChild(n(doc, "div", "ck-met-v", "lettura non riuscita"));
    c2.appendChild(n(doc, "p", "ck-piede-card", "La sottoraccolta dei programmi non ha risposto: nessun nome inventato."));
  } else if (modello.programma) {
    c2.appendChild(n(doc, "div", "ck-met-v", modello.programma.nome));
    c2.appendChild(n(doc, "p", "ck-piede-card",
      (modello.programma.esplicito ? "attivo (marcato esplicitamente)" : "aggiornato più di recente (ripiego di A, non marcato attivo)") +
      " · settimana " + (modello.programma.settimana == null ? NON : modello.programma.settimana)));
    c2.appendChild(n(doc, "p", "ck-piede-card", "programmi letti: " + (modello.numeroProgrammi == null ? NON : modello.numeroProgrammi)));
  } else if (modello.controlloProgrammi && modello.controlloProgrammi.mancanti) {
    c2.appendChild(n(doc, "div", "ck-met-v", "programmi mancanti nel cloud"));
    c2.appendChild(n(doc, "p", "ck-piede-card", "La radice ne dichiara " + modello.controlloProgrammi.radice + ", nei documenti non ne resta nessuno: come A, «cloud programs missing»."));
  } else {
    c2.appendChild(n(doc, "div", "ck-met-v", NON));
  }
  due.appendChild(c2);
  return [sez, due];
}

function questionari(doc, modello) {
  const sez = sezione(doc, "M4 2.5h6l2.5 2.5v8.5H4z", "Questionari atleta");
  const c = carta(doc, "Ultimo check-in", "state.quiz.questionnaireHistory · wellness 1-5", pillola(doc, modello.checkin ? "dati veri" : "vuoto", modello.checkin ? "ok" : "mute"));
  if (!modello.checkin) {
    c.appendChild(vuoto(doc, "Nessun check-in", "In A non risulta un questionario compilato: la carta resta al suo posto e lo dice, invece di sparire."));
  } else {
    const ck = modello.checkin;
    const h = c.querySelector(".ck-h");
    h.appendChild(n(doc, "span", "ck-data", ck.data));
    const pw = n(doc, "div", "ck-parole");
    const et = { energy: "Energia", sleep: "Sonno", doms: "DOMS", stress: "Stress", hunger: "Fame" };
    Object.entries(et).forEach(([k, lab]) => {
      const v = ck.wellness ? ck.wellness[k] : undefined;
      const riga = n(doc, "div", "ck-pw");
      riga.appendChild(n(doc, "span", "", lab));
      riga.appendChild(n(doc, "b", "", typeof v === "number" ? v + "/5" : NON));
      pw.appendChild(riga);
    });
    c.appendChild(pw);
    const risposte = Object.entries(ck.risposte || {});
    if (risposte.length) {
      const riga = n(doc, "div", "ck-parole");
      risposte.forEach(([k, v]) => {
        const r = n(doc, "div", "ck-pw");
        r.appendChild(n(doc, "span", "", k.replace(/_/g, " ")));
        r.appendChild(n(doc, "b", "", String(v)));
        riga.appendChild(r);
      });
      c.appendChild(riga);
    }
    c.appendChild(n(doc, "p", "ck-piede-card", "Le risposte del check-in sono parole e voti 1-5, quelli che l'app chiede: qui non si convertono in barre che l'app non ha."));
  }
  return [sez, c];
}

function quadro(doc, opzioni) {
  const sez = sezione(doc, "M8 2l5 2v4.5c0 3-2.2 4.8-5 5.5-2.8-.7-5-2.5-5-5.5V4z", "Quadro atleta · cosa dicono le sedute");
  const due = n(doc, "div", "ck-due");

  const c1 = carta(doc, "Continuità e carico", "8 settimane ISO · soglie dichiarate in comune/struttura.js", pillola(doc, "conteggi, non diagnosi", "mute"));
  const righe = (opzioni && opzioni.righeQuadro) || [];
  if (!righe.length) {
    c1.appendChild(vuoto(doc, "Nessun conteggio", "Le sedute non bastano per un quadro: la carta lo dice invece di mostrare zeri."));
  } else {
    const pw = n(doc, "div", "ck-parole");
    righe.forEach((r) => {
      const riga = n(doc, "div", "ck-pw");
      riga.appendChild(n(doc, "span", "", r.etichetta || r[0] || ""));
      riga.appendChild(n(doc, "b", "", r.valore != null ? String(r.valore) : (r[1] != null ? String(r[1]) : NON)));
      pw.appendChild(riga);
    });
    c1.appendChild(pw);
  }
  due.appendChild(c1);

  const c2 = carta(doc, "Semaforo strutturale", "conteggi di carico e continuità", pillola(doc, "prudente", "mute"));
  const sem = (opzioni && opzioni.righeSemaforo) || [];
  if (!sem.length) {
    c2.appendChild(vuoto(doc, "Semaforo non calcolabile", "Servono le articolazioni per esercizio: il backup non le ha."));
  } else {
    const pw = n(doc, "div", "ck-parole");
    sem.forEach((r) => {
      const riga = n(doc, "div", "ck-pw");
      riga.appendChild(n(doc, "span", "", r.etichetta || r[0] || ""));
      riga.appendChild(n(doc, "b", "", r.valore != null ? String(r.valore) : (r[1] != null ? String(r[1]) : NON)));
      pw.appendChild(riga);
    });
    c2.appendChild(pw);
  }
  const mancanti = (opzioni && opzioni.righeMancanti) || [];
  if (mancanti.length) {
    c2.appendChild(n(doc, "div", "ck-dove-t", "Cosa manca per il semaforo completo"));
    const ul = n(doc, "div", "ck-parole");
    mancanti.forEach((r) => {
      const riga = n(doc, "div", "ck-pw");
      riga.appendChild(n(doc, "span", "", r.etichetta || r[0] || ""));
      riga.appendChild(n(doc, "b", "", r.valore != null ? String(r.valore) : (r[1] != null ? String(r[1]) : NON)));
      ul.appendChild(riga);
    });
    c2.appendChild(ul);
  }
  due.appendChild(c2);
  return [sez, due];
}

export function renderDashboardV31(doc, contenitore, modello, opzioni) {
  const opz = opzioni || {};
  while (contenitore.firstChild) contenitore.firstChild.remove();
  contenitore.appendChild(testataDiva(doc, modello));
  contenitore.appendChild(testa(doc, modello));
  contenitore.appendChild(bloccoReadiness(doc, modello));
  statoDiSintesi(doc, modello).forEach((x) => contenitore.appendChild(x));
  seduteEProgrammi(doc, modello, opz).forEach((x) => contenitore.appendChild(x));
  questionari(doc, modello).forEach((x) => contenitore.appendChild(x));
  quadro(doc, opz).forEach((x) => contenitore.appendChild(x));
  return contenitore;
}

export const NON_REGISTRATO = NON;
