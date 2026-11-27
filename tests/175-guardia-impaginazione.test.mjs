/* Guardia 175 (passo 24) — il secondo blocco del giro di controllo: l'impaginazione.
 *
 * Sono regole che si possono tenere ferme senza un browser:
 *
 *  175.1 il fumetto chiuso non riappare: la chiusura si ricorda per pagina
 *        in sessionStorage, e solo il tasto della Diva lo riapre
 *  175.2 su Impostazioni il fumetto dice qualcosa di Impostazioni: il suo
 *        testo esiste ed è diverso da quello della Dashboard
 *  175.3 il fumetto non deve coprire campi e filtri: la ricerca della
 *        posizione guarda input, select, textarea, tasti, collegamenti,
 *        testi e immagini, e se non trova spazio si chiude da solo
 *  175.4 il badge INGRANDISCI sta fuori dal riquadro della figura (sotto,
 *        mai sopra il disegno) e la figura non lo taglia
 *  175.5 le due figure di Study time hanno la stessa altezza dichiarata e
 *        le carte affiancate si allungano insieme
 *  175.6 la lampadina ha il suo spazio: il nastro finisce prima
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const HTML = readFileSync(join(radice, "desktop", "index.html"), "utf8");

/* La pagina vera, con i suoi script dentro (quelli esterni restano fuori). */
function paginaViva() {
  const html = HTML.replace(/<script[^>]*\ssrc="[^"]*"[^>]*><\/script>/g, "");
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { const m = String((e && e.message) || ""); if (!/Not implemented/.test(m)) throw new Error(m); });
  return new JSDOM(html, { runScripts: "dangerously", url: "http://localhost/desktop/index.html", virtualConsole: vc });
}

const attendi = (ms) => new Promise((ok) => setTimeout(ok, ms));
const vaiA = (doc, vista) => { doc.querySelector('.voce[data-vista="' + vista + '"]').click(); };

/* ------------------------------------------------------------------ 175.1 */

test("175.1 il fumetto chiuso non riappare per quella pagina, in questa sessione", async () => {
  const dom = paginaViva();
  const w = dom.window, doc = w.document;
  try {
    await attendi(150);
    const fumetto = doc.getElementById("dv-fumetto");
    assert.ok(fumetto, "manca il fumetto");
    assert.equal(fumetto.classList.contains("off"), false, "all'apertura il fumetto parla");

    /* lo chiudo sulla Dashboard */
    doc.getElementById("dv-x").click();
    assert.ok(fumetto.classList.contains("off"), "la × non lo chiude");
    assert.equal(w.sessionStorage.getItem("bd.diva.chiusa.dashboard"), "1", "la chiusura non è ricordata per la Dashboard");

    /* cambio pagina e torno: resta chiuso */
    vaiA(doc, "misure"); await attendi(60);
    vaiA(doc, "dashboard"); await attendi(700);
    assert.ok(fumetto.classList.contains("off"), "tornando sulla Dashboard il fumetto è ricomparso");

    /* su un'altra pagina parla: la memoria è per pagina, non per sempre */
    vaiA(doc, "misure"); await attendi(700);
    assert.equal(fumetto.classList.contains("off"), false, "il fumetto non parla più su nessuna pagina");
    assert.equal(w.sessionStorage.getItem("bd.diva.chiusa.dashboard"), "1", "la memoria della Dashboard si è persa");

    /* il tasto sempre visibile lo riapre, e la chiusura viene dimenticata */
    doc.getElementById("dv-ava").click();
    await attendi(60);
    assert.ok(fumetto.classList.contains("off"), "il tasto della Diva non ha richiuso il fumetto aperto");
    doc.getElementById("dv-x").click();
    doc.getElementById("dv-ava").click();
    await attendi(60);
    assert.equal(fumetto.classList.contains("off"), false, "il tasto della Diva non riapre il fumetto chiuso");
    assert.equal(w.sessionStorage.getItem("bd.diva.chiusa.misure"), null, "riaprendo, la chiusura resta scritta");
  } finally { w.close(); }
});

/* ------------------------------------------------------------------ 175.2 */

test("175.2 su Impostazioni il fumetto dice qualcosa di Impostazioni", async () => {
  const dom = paginaViva();
  const w = dom.window, doc = w.document;
  try {
    await attendi(150);
    vaiA(doc, "impostazioni"); await attendi(700);
    assert.equal(doc.getElementById("dv-where").textContent, "Impostazioni", "il fumetto non si intitola Impostazioni");
    const testo = doc.getElementById("dv-testo").textContent;
    assert.match(testo, /^Impostazioni\./, "il fumetto non comincia con «Impostazioni.»");
    assert.equal(/dashboard/i.test(testo), false, "su Impostazioni il fumetto racconta la Dashboard");

    /* Le due voci nel copione sono diverse davvero. */
    const copione = HTML.slice(HTML.indexOf("var VOCI={"), HTML.indexOf("var d=document.getElementById('bd-diva')"));
    assert.match(copione, /"impostazioni":\["Impostazioni","[^"]{20,}"/, "manca la voce «impostazioni» nel copione del fumetto");
    assert.equal(copione.includes('"impostazioni":["Impostazioni","Eccoci.'), false, "la voce di Impostazioni copia la Dashboard");
  } finally { w.close(); }
});

/* ------------------------------------------------------------------ 175.3 */

test("175.3 il fumetto cerca posto e, se non ce n'è, si chiude: mai sopra un campo o un filtro", () => {
  const i = HTML.indexOf("var DENTRO='");
  assert.ok(i > 0, "manca l'elenco di ciò che il fumetto non deve coprire");
  const cerca = HTML.slice(i, HTML.indexOf("function libero(", i));
  assert.ok(cerca.includes("function ostacoli()"), "manca la ricerca degli ostacoli");
  for (const pezzo of ["input", "select", "textarea", "button", "a[href]", "h1", "p", "td", "img", "figure"]) {
    assert.ok(cerca.includes(pezzo), "la ricerca del posto non guarda «" + pezzo + "»");
  }
  /* Se nessuna posizione è libera, il fumetto si chiude da solo (la Diva resta). */
  const sistema = HTML.slice(HTML.indexOf("function sistema("), HTML.indexOf("function mostra("));
  assert.match(sistema, /if\(!posto\)\{[\s\S]*bub\.classList\.add\('off'\)/, "senza spazio il fumetto non si chiude");
  /* E chi lo richiede col tasto lo legge lo stesso, per qualche secondo. */
  assert.match(sistema, /if\(!forza\)\{[^}]*return false;/, "la richiesta esplicita non ha un ripiego");
  assert.match(sistema, /setTimeout\(function\(\)\{ bub\.classList\.add\('off'\)/, "il ripiego non si richiude da solo");
});

/* ------------------------------------------------------------------ 175.4 */

test("175.4 il badge INGRANDISCI sta fuori dal riquadro della figura, mai sopra il disegno", () => {
  const dom = new JSDOM(HTML);
  const doc = dom.window.document;
  const badge = [...doc.querySelectorAll("#pag-study-time .st-zoom")];
  assert.ok(badge.length > 0, "non c'è nessun badge INGRANDISCI");
  for (const b of badge) {
    const figura = b.closest(".st-fig");
    assert.ok(figura, "un badge sta fuori da ogni figura");
    assert.ok(figura.classList.contains("st-fig-wide"), "il badge non è sulla figura larga");
    assert.equal(b, figura.lastElementChild, "il badge non è l'ultimo pezzo della figura: sarebbe sopra il disegno");
    assert.equal(b.textContent.trim().toLowerCase(), "ingrandisci", "il badge non dice INGRANDISCI");
  }
  /* Il badge è posizionato sotto la figura (bottom negativo) e la figura non lo taglia. */
  const stile = HTML.slice(HTML.indexOf("#pag-study-time .st-zoom{"), HTML.indexOf("}", HTML.indexOf("#pag-study-time .st-zoom{")));
  assert.match(stile, /position:absolute/, "il badge non è posizionato col foglio di stile");
  assert.match(stile, /bottom:-\d+px/, "il badge non sta sotto la figura");
  const figuraLarga = HTML.slice(HTML.indexOf("#pag-study-time .st-fig-wide{"), HTML.indexOf("}", HTML.indexOf("#pag-study-time .st-fig-wide{")));
  assert.match(figuraLarga, /overflow:visible/, "la figura taglierebbe il badge");
  assert.match(figuraLarga, /margin-bottom:\d+px/, "manca lo spazio sotto la figura per il badge");
});

/* ------------------------------------------------------------------ 175.5 */

test("175.5 le figure di Study time hanno la stessa altezza e le carte affiancate crescono insieme", () => {
  const st = HTML.slice(HTML.indexOf("<style", HTML.indexOf('id="pag-study-time"') - 4000), HTML.indexOf("</style>", HTML.indexOf('id="pag-study-time"')));
  assert.match(HTML, /#pag-study-time\{--st-fig-h:undici|#pag-study-time\{--st-fig-h:\d+px\}/, "manca l'altezza dichiarata una volta sola");
  const altezza = HTML.match(/#pag-study-time\{--st-fig-h:(\d+)px\}/);
  assert.ok(altezza && Number(altezza[1]) >= 120, "l'altezza dichiarata delle figure è troppo piccola");

  const fig = HTML.slice(HTML.indexOf("#pag-study-time .st-fig{"), HTML.indexOf("}", HTML.indexOf("#pag-study-time .st-fig{")));
  assert.match(fig, /min-height:var\(--st-fig-h\)/, "la figura non usa l'altezza dichiarata");
  assert.match(fig, /align-self:stretch/, "la figura non si allunga con la carta");

  const griglia = HTML.slice(HTML.indexOf("#pag-study-time .st-grid{"), HTML.indexOf("}", HTML.indexOf("#pag-study-time .st-grid{")));
  assert.match(griglia, /align-items:stretch/, "le carte di una riga non si allineano in altezza");

  const carta = HTML.slice(HTML.indexOf("#pag-study-time .st-card{"), HTML.indexOf("}", HTML.indexOf("#pag-study-time .st-card{")));
  assert.match(carta, /height:100%/, "la carta non prende l'altezza della riga");
  assert.match(carta, /align-items:stretch/, "dentro la carta testo e figura non si allungano insieme");

  /* Il disegno si adatta al riquadro invece di stare in un angolo. */
  const img = HTML.slice(HTML.indexOf("#pag-study-time .st-fig img{"), HTML.indexOf("}", HTML.indexOf("#pag-study-time .st-fig img{")));
  assert.match(img, /object-fit:contain/, "il disegno non si adatta al riquadro");
  assert.match(img, /height:100%/, "il disegno non prende l'altezza del riquadro");
  assert.ok(st.length > 0, "le regole di Study time non sono nel foglio di stile della pagina");
});

/* ------------------------------------------------------------------ 175.6 */

test("175.6 la lampadina ha il suo spazio: il nastro finisce prima", () => {
  const nastro = HTML.slice(HTML.indexOf(".nastro{"), HTML.indexOf("}", HTML.indexOf(".nastro{")));
  const m = nastro.match(/margin:0 (\d+)px/);
  assert.ok(m, "il nastro non riserva spazio a destra");
  const riserva = Number(m[1]);
  const lampada = HTML.slice(HTML.indexOf("#bd-tema{"), HTML.indexOf("}", HTML.indexOf("#bd-tema{")));
  const right = Number((lampada.match(/right:(\d+)px/) || [])[1]);
  const largh = Number((lampada.match(/width:(\d+)px/) || [])[1]);
  assert.ok(riserva > 0 && right >= 0 && largh > 0, "la lampadina non è dove la misura dice");
  assert.ok(riserva >= right + 8, "la riserva a destra non copre la lampadina (" + riserva + " < " + (right + 8) + ")");
});
