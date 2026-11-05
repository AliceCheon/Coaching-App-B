/* Barbell Diva B — Archivio programmi (b0.35).
 *
 * L'elenco dei programmi letti che NON sono quello attivo. Cliccando una riga
 * si apre la stessa vista del programma attivo (comune/vista-programma.js):
 * una schermata sola, aperta per scelta invece che per posizione.
 *
 * Solo lettura: qui non si scrive niente, né su Firestore né nel browser.
 * I programmi cancellati non arrivano a questo modulo — la lettura li scarta
 * prima, con la regola di A (r.5591/5600) — e la riga in fondo lo dichiara
 * con il loro numero, invece di far finta che non esistano.
 */

import { profiloProgramma } from "./programma.js";
import { nomePulito } from "./nome-pulito.js";

const NON = "non registrato";

/* gg/mm/aaaa, la stessa forma del resto dell'app. Una data che non si
 * riconosce si mostra com'è: non si traduce a caso. */
export function dataItaliana(valore) {
  if (valore == null || valore === "") return NON;
  if (valore instanceof Date && !Number.isNaN(valore.getTime())) {
    return String(valore.getDate()).padStart(2, "0") + "/" + String(valore.getMonth() + 1).padStart(2, "0") + "/" + valore.getFullYear();
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(valore));
  if (iso) return iso[3] + "/" + iso[2] + "/" + iso[1];
  return String(valore);
}

/* Le righe dell'archivio: tutti i programmi letti tranne l'attivo, i più
 * recenti in cima. `schedeV2` è la ricostruzione dei documenti v2: serve solo
 * a dire quante schede ha ogni programma, e resta `null` quando la lettura
 * non è riuscita — la riga scrive «schede non lette», non uno zero finto. */
export function elencoArchivio(programmi, opzioni) {
  const o = opzioni || {};
  const elenco = Array.isArray(programmi) ? programmi.filter((p) => p && typeof p === "object") : [];
  const attivoId = o.attivoId == null ? "" : String(o.attivoId);
  const perProgramma = o.schedeV2 && o.schedeV2.perProgramma ? o.schedeV2.perProgramma : null;
  return elenco
    .filter((p) => !p.deletedAt)
    .filter((p) => String(p.id || "") !== attivoId)
    .map((p) => {
      const profilo = profiloProgramma(p);
      const suo = perProgramma ? (perProgramma[profilo.id] || null) : null;
      return {
        id: profilo.id,
        nome: nomePulito(profilo.nome),
        stato: nomePulito(profilo.stato),
        segno: profilo.segno,
        creato: dataItaliana(p.createdAt || p.created),
        creatoGrezzo: String(p.createdAt || p.created || ""),
        inizio: profilo.inizio ? dataItaliana(profilo.inizio) : NON,
        schede: suo && Array.isArray(suo.schede) ? suo.schede.length : null,
        archiviate: suo && Array.isArray(suo.archiviate) ? suo.archiviate.length : null,
        programma: p
      };
    })
    .sort((a, b) => b.creatoGrezzo.localeCompare(a.creatoGrezzo) || a.nome.localeCompare(b.nome) || a.id.localeCompare(b.id));
}

function nodo(doc, tag, classe, testo) {
  const n = doc.createElement(tag);
  if (classe) n.className = classe;
  n.textContent = testo == null ? "" : String(testo);
  return n;
}

/* Quante schede ha un programma, in parole. */
function schedeInParole(riga) {
  if (riga.schede == null) return "schede non lette";
  const base = riga.schede + (riga.schede === 1 ? " scheda" : " schede");
  return riga.archiviate ? base + " · " + riga.archiviate + " archiviate" : base;
}

/* L'elenco. `opz.righe` arriva da elencoArchivio; `opz.cancellati` è il numero
 * di documenti scartati dalla lettura (regola di A), `opz.schedeNonLette` dice
 * se la lettura delle schede è fallita. I bottoni portano `data-programma`:
 * chi li monta decide cosa aprire, qui non si attacca nessun ascoltatore. */
export function renderArchivio(doc, contenitore, opzioni) {
  const opz = opzioni || {};
  const righe = Array.isArray(opz.righe) ? opz.righe : [];
  while (contenitore.firstChild) contenitore.firstChild.remove();

  const blocco = nodo(doc, "section", "pr-arch");

  const testa = nodo(doc, "header", "pr-arch-testa");
  testa.appendChild(nodo(doc, "h2", "", "Archivio programmi"));
  testa.appendChild(nodo(doc, "p", "", "I programmi che non sono quello attivo. Clicca una riga: si apre la stessa scheda del programma attivo, con le stesse parole e gli stessi numeri. Niente si modifica."));
  testa.appendChild(nodo(doc, "div", "pr-arch-conta",
    righe.length === 0
      ? "nessun altro programma letto"
      : righe.length + (righe.length === 1 ? " programma in archivio" : " programmi in archivio") + " · quello attivo sta nella voce qui sopra"));
  blocco.appendChild(testa);

  if (!righe.length) {
    blocco.appendChild(nodo(doc, "p", "pr-arch-vuoto",
      opz.letturaFallita
        ? "La lettura dei programmi non è riuscita: qui non c'è un elenco vuoto per finta. Riprova con «Ricarica»."
        : "Nessun altro programma: nei documenti letti c'è solo quello attivo."));
  } else {
    const lista = nodo(doc, "div", "pr-arch-lista");
    lista.setAttribute("role", "list");
    righe.forEach((riga) => {
      const bottone = nodo(doc, "button", "pr-arch-riga");
      bottone.setAttribute("type", "button");
      bottone.setAttribute("data-programma", riga.id);
      bottone.setAttribute("role", "listitem");
      bottone.appendChild(nodo(doc, "span", "pr-arch-nome", nomePulito(riga.nome)));
      const stato = nodo(doc, "span", "pr-arch-stato", nomePulito(riga.stato));
      stato.setAttribute("data-segno", riga.segno || "vuoto");
      bottone.appendChild(stato);
      bottone.appendChild(nodo(doc, "span", "pr-arch-meta",
        "creato il " + riga.creato + " · " + schedeInParole(riga)));
      lista.appendChild(bottone);
    });
    blocco.appendChild(lista);
  }

  const cancellati = Number(opz.cancellati) || 0;
  blocco.appendChild(nodo(doc, "p", "pr-arch-piede",
    cancellati > 0
      ? "I programmi cancellati non compaiono: la lettura li scarta, come fa A. Fuori da qui ne restano " + cancellati + "."
      : "I programmi cancellati non compaiono: la lettura li scarta, come fa A. Nessun documento è stato scartato."));

  contenitore.appendChild(blocco);
  return blocco;
}
