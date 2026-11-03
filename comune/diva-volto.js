// comune/diva-volto.js — IL DIVA BOT DEL MOCKUP, IMPORTATO COSÌ COM'È.
// Fonte: mockup/mockup-telefono.html — funzione bot() e tavola "DIVA BOT · ESPRESSIONI".
// Nessun ridisegno: cambiano solo i nomi dell'API (bot -> bot interno, o.head -> opzioni.testa).
//
// Fase 2e, seconda passata — «importa tutto»: non solo la testina della bolla, ma
// tutto quello che il mockup sa disegnare del personaggio.
//  - le due inquadrature (figura intera e testa);
//  - le sei espressioni, compresa l'esultanza `cele`;
//  - la striscia dei suggerimenti (`sbot`: bolla + figura a 64px);
//  - il marchio della barra in alto (la testa, `44 58 152 112`).

/** Le due inquadrature dell'originale: figura intera e testa (per i posti piccoli). */
export const GEOMETRIA_VOLTO = Object.freeze({
  intera: '0 18 240 256',
  testa: '44 58 152 112'
});

/** I tre toni della bolla. */
export const TONI_VOLTO = Object.freeze(['bene', 'attenzione', 'neutro']);

/** Le espressioni del mockup: quelle che ci sono, non una in più. */
export const ESPRESSIONI_VOLTO = Object.freeze(['idle', 'happy', 'focus', 'tired', 'worried', 'cele']);

/** Le etichette della tavola «DIVA BOT · ESPRESSIONI», parola per parola.
 *  L'esultanza `cele` non ha una tavola sua: nel mockup è la faccia di `happy`
 *  con le braccia alzate, e qui resta tale. */
export const ETICHETTE_ESPRESSIONE = Object.freeze({
  happy: Object.freeze({ nome: 'Felice', quando: 'record, festa' }),
  focus: Object.freeze({ nome: 'Concentrata', quando: 'durante la serie' }),
  tired: Object.freeze({ nome: 'Stanca', quando: 'poco sonno' }),
  worried: Object.freeze({ nome: 'Preoccupata', quando: 'dolore articolare' }),
  idle: Object.freeze({ nome: 'Tranquilla', quando: 'tutto ok' })
});

const ESPRESSIONE_DEL_TONO = Object.freeze({ bene: 'happy', attenzione: 'worried', neutro: 'idle' });

export function etichettaTono(tono) {
  if (tono === 'bene') return 'tutto in ordine';
  if (tono === 'attenzione') return "c'è qualcosa da guardare";
  return 'nessun giudizio';
}

/** Il tono della bolla tradotto nell'espressione del personaggio. */
export function espressioneDelTono(tono) {
  return ESPRESSIONE_DEL_TONO[tono] || 'idle';
}

function espressioneValida(espressione) {
  return ESPRESSIONI_VOLTO.indexOf(espressione) >= 0 ? espressione : 'idle';
}

/** I dati non diventano mai markup: la bolla della striscia è testo, non HTML. */
function fuggi(testo) {
  return String(testo === null || testo === undefined ? '' : testo)
    .split('&').join('&amp;')
    .split('<').join('&lt;')
    .split('>').join('&gt;')
    .split('"').join('&quot;')
    .split("'").join('&#39;');
}

function bot(x, opzioni = {}) {
 const F={
 idle:`<circle fill="#ff9ad5" cx="93" cy="117" r="8"/><circle fill="#ff9ad5" cx="147" cy="117" r="8"/><path d="M103 137q17 15 34 0" class="fs"/>`,
 happy:`<path d="M80 119q13-21 26 0M134 119q13-21 26 0" class="fs"/><path fill="#ff9ad5" d="M101 135q19 24 38 0c-4 28-34 28-38 0Z"/><circle cx="76" cy="134" r="6" fill="#ff72c2" opacity=".55"/><circle cx="164" cy="134" r="6" fill="#ff72c2" opacity=".55"/>`,
 focus:`<path d="M80 107l26 8M160 107l-26 8" class="fs"/><circle fill="#ff9ad5" cx="94" cy="124" r="7"/><circle fill="#ff9ad5" cx="146" cy="124" r="7"/><path d="M106 143h28" class="fs"/>`,
 tired:`<path d="M80 121q13 9 26 0M134 121q13 9 26 0" class="fs"/><ellipse cx="120" cy="142" rx="8" ry="6" fill="#ff9ad5"/><text x="168" y="92" fill="#ff72c2" font-size="22" font-weight="800">Z</text><text x="182" y="76" fill="#ff72c2" font-size="15" font-weight="800">z</text>`,
 worried:`<circle fill="#ff9ad5" cx="93" cy="121" r="8"/><circle fill="#ff9ad5" cx="147" cy="121" r="8"/><path d="M80 105l22-7M160 105l-22-7" class="fs"/><path d="M105 144q8-8 15 0t15 0" class="fs"/><path d="M172 98q-8 12 0 17 8-5 0-17Z" fill="#8fd3ff"/>`}[x==='cele'?'happy':x]||'';
 const A={happy:[130,-130],idle:[0,0],focus:[-28,28],tired:[8,-8],worried:[-30,30],cele:[150,-150]}[x]||[0,0];
 const up=(x==='happy'||x==='cele');const ARMS=`<g transform="rotate(${A[0]} 68 177)"><circle class="jt" cx="68" cy="177" r="12"/><path class="sh" d="M64 172c-15 1-24 12-25 26-1 11 6 18 15 15 8-3 12-13 14-27Z"/><circle class="jt" cx="47" cy="208" r="9"/></g>
 <g transform="rotate(${A[1]} 172 177)"><circle class="jt" cx="172" cy="177" r="12"/><path class="sh" d="M176 172c15 1 24 12 25 26 1 11-6 18-15 15-8-3-12-13-14-27Z"/><circle class="jt" cx="193" cy="208" r="9"/></g>`;
 const vb=opzioni.testa?'44 58 152 112':'0 18 240 256';
 return `<svg viewBox="${vb}" aria-hidden="true"><style>.fs{fill:none;stroke:#ff9ad5;stroke-width:6;stroke-linecap:round;stroke-linejoin:round}.sh{fill:#fdfbff;stroke:#b9a6d0;stroke-width:3}.jt{fill:#efe6f7;stroke:#b9a6d0;stroke-width:3}</style>
 ${opzioni.testa?'':'<ellipse cx="120" cy="268" rx="62" ry="6" fill="#000" opacity=".18"/>'}
 <path d="M120 49V31" fill="none" stroke="#c7b8d8" stroke-width="7" stroke-linecap="round"/><path d="M120 29c-13-15-30 4 0 23 30-19 13-38 0-23Z" fill="#ff72c2" stroke="#ffe1f4" stroke-width="3"/>
 ${opzioni.testa?'':`<path class="sh" d="M92 226h24v32q0 8-8 8H86q-8 0-8-8 0-6 8-8l6-4Z"/><path class="sh" d="M148 226h-24v32q0 8 8 8h22q8 0 8-8 0-6-8-8l-6-4Z"/><path d="M82 258h30M128 258h30" stroke="#ff72c2" stroke-width="4" stroke-linecap="round"/>
${up?"":ARMS}
 <path class="sh" d="M76 164c10-14 78-14 88 0l-7 68c-13 16-61 16-74 0Z"/><path d="M86 176h68l-5 42c-13 11-45 11-58 0Z" fill="#ded5e9" stroke="#9f87bb" stroke-width="3"/><path d="M120 189c-10-12-24 3 0 20 24-17 10-32 0-20Z" fill="#ff72c2"/>`}
 <path class="sh" d="M45 73c15-27 135-27 150 0 12 20 12 72-3 91-21 27-123 27-144 0-15-19-15-71-3-91Z"/>
 <path d="M41 96c-16 5-18 44-1 51m159-51c16 5 18 44 1 51" fill="#efe6f7" stroke="#ff72c2" stroke-width="7" stroke-linecap="round"/>
 <rect x="57" y="83" width="126" height="77" rx="31" fill="#241a2e"/><path d="M75 92c20-8 67-10 91 0-37 1-68 8-92 22-5-8-4-16 1-22Z" fill="#3a2a4a" opacity=".65"/>${F}${up&&!opzioni.testa?ARMS:''}</svg>`}

/** L'SVG del mockup, così com'è: markup stringa, nessun ritocco ai percorsi. */
export function markupVolto(espressione, opzioni = {}) {
  return bot(espressioneValida(espressione), { testa: opzioni.testa !== false });
}

/** La figura intera, senza testa mozzata: è il personaggio che sta in piedi. */
export function markupFigura(espressione) {
  return bot(espressioneValida(espressione), { testa: false });
}

/** Il marchio della barra in alto: il mockup ci mette la testa dentro `.mark`. */
export function markupMarco(espressione) {
  return '<div class="bd-marco">' + bot(espressioneValida(espressione), { testa: true }) + '</div>';
}

/** La striscia dei suggerimenti del mockup (`sbot`): bolla a sinistra, figura a
 *  destra. Il testo è dato, quindi esce escapato: i dati non diventano HTML. */
export function markupStriscia(espressione, testo) {
  return '<div class="bd-striscia"><div class="bd-striscia-bolla">' + fuggi(testo) +
    '</div><div class="bd-striscia-sbt">' + bot(espressioneValida(espressione), { testa: false }) +
    '</div></div>';
}

function elemento(doc, markup, classe, espressione) {
  if (!doc || typeof doc.createElement !== 'function') return null;
  const guscio = doc.createElement('span');
  guscio.innerHTML = markup;
  const svg = guscio.querySelector ? guscio.querySelector('svg') : guscio.firstElementChild;
  if (!svg) return null;
  svg.setAttribute('class', classe);
  svg.setAttribute('data-espressione', espressione);
  svg.removeAttribute('aria-hidden');
  return svg;
}

/** Il volto per i posti piccoli: la testa (comportamento della prima passata). */
export function creaVolto(doc, tono, opzioni = {}) {
  const espressione = espressioneDelTono(tono);
  return elemento(doc, markupVolto(espressione, opzioni), 'bd-volto', espressione);
}

/** La figura intera, pronta da appendere: è quella che sta accanto alla bolla. */
export function creaFigura(doc, tono) {
  const espressione = ESPRESSIONI_VOLTO.indexOf(tono) >= 0 ? tono : espressioneDelTono(tono);
  return elemento(doc, markupFigura(espressione), 'bd-figura', espressione);
}

/** La striscia già montata: un elemento solo, bolla compresa. */
export function montaStriscia(doc, espressione, testo) {
  if (!doc || typeof doc.createElement !== 'function') return null;
  const guscio = doc.createElement('span');
  guscio.innerHTML = markupStriscia(espressione, testo);
  return guscio.firstElementChild || null;
}

/** Il marchio già montato, per la barra in alto. */
export function montaMarco(doc, espressione) {
  if (!doc || typeof doc.createElement !== 'function') return null;
  const guscio = doc.createElement('span');
  guscio.innerHTML = markupMarco(espressione);
  return guscio.firstElementChild || null;
}
