/* Barbell Diva B — Archivio programmi come il v31 (passo 3b, SOLA LETTURA).
 *
 * La pagina è quella del v31: occhiello «Programmi · l'archivio», la tabella
 * pg-tab con Programma · Schede · Esercizi · Serie · Sedute · Ultima, il
 * programma attivo evidenziato con «(attiva)» accanto al nome, e le tre
 * colonne Nota / Cosa manca / La regola (quelle restano nel file, statiche).
 * Cambia solo il contenuto: niente più righe di esempio del backup — le righe
 * sono i programmi letti da Firestore, i numeri si contano dalle schede lette.
 *
 * Dove un dato non c'è, «non registrato». Due casi veri:
 *  - PASSO 23 — Sedute e Ultima leggono lo STESSO logbook dell'Overview. Il
 *    logbook attribuisce una seduta a un programma solo quando il codice
 *    della scheda appartiene a un programma solo (è la regola di
 *    comune/logbook.js, non una deduzione nuova): quelle sedute si contano
 *    qui, per nome del programma. Le sedute che il logbook non sa attribuire
 *    restano fuori, e la nota sotto la tabella lo dice. Se il logbook non è
 *    stato letto, la colonna dice «non registrato» col motivo nel titolo;
 *  - se anche una sola serie della settimana 1 non si legge, la colonna
 *    Serie dell'intero programma è «non registrato»: una somma a buchi non
 *    si presenta come un numero.
 *
 * Solo a schermo: i nomi passano da nomePulito (trattino basso via, iniziale
 * maiuscola); i valori veri nei documenti restano intatti.
 */

import { profiloProgramma, schedePerProgramma } from "./programma.js";
import { settimanePerTabella } from "./schede-v2.js";
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

/* Le serie della settimana 1 di un esercizio, come numero leggibile. */
function seriePrimaSettimana(esercizio) {
  const sett = (esercizio && esercizio.prescrizione && esercizio.prescrizione.elencoSettimane) || [];
  const prima = settimanePerTabella(sett, 1)[0] || {};
  const n = Number(String(prima.serie == null ? "" : prima.serie).replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/* I conti di un programma dalle sue schede lette (archiviate comprese):
 * quante schede, quanti esercizi in tutto, quante serie della settimana 1.
 * Se il gruppo di schede non c'è o la lettura non è arrivata, si torna null:
 * la colonna scrive «non registrato», non uno zero finto. */
function contiSchede(gruppo) {
  if (!gruppo) return null;
  const tutte = [].concat(
    Array.isArray(gruppo.schede) ? gruppo.schede : [],
    Array.isArray(gruppo.archiviate) ? gruppo.archiviate : []
  );
  let leggibili = true;
  let serie = 0;
  tutte.forEach((s) => ((s && s.esercizi) || []).forEach((e) => {
    const n = seriePrimaSettimana(e);
    if (n == null) leggibili = false;
    else serie += n;
  }));
  return {
    schede: tutte.length,
    esercizi: tutte.reduce((acc, s) => acc + ((s && s.esercizi) || []).length, 0),
    serie: leggibili ? serie : null
  };
}

/* gg/mm/aaaa → aaaammgg per ordinare; vuoto quando non si legge. */
function chiaveData(valore) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(valore == null ? "" : valore).trim());
  return m ? m[3] + m[2].padStart(2, "0") + m[1].padStart(2, "0") : "";
}

/* Le sedute del logbook che appartengono a un programma: il logbook mette il
 * nome del programma in `pn` solo quando il codice della scheda è di UN solo
 * programma. Stessa fonte, stessa regola, stesso numero dell'Overview. */
function seduteDelProgramma(sedute, nome) {
  if (!Array.isArray(sedute)) return null;
  const cercato = String(nome == null ? "" : nome).trim().toLowerCase();
  const mie = sedute.filter((s) => s && String(s.pn == null ? "" : s.pn).trim().toLowerCase() === cercato);
  let ultima = null;
  mie.forEach((s) => {
    const k = chiaveData(s.d);
    if (!k) return;
    if (!ultima || k > ultima.chiave) ultima = { chiave: k, testo: String(s.d).trim() };
  });
  return { numero: mie.length, ultima: ultima ? ultima.testo : null };
}

/* Le righe della tabella: TUTTI i programmi letti, attivo compreso (è il v31:
 * «I blocchi, chiusi e attivo»), i più recenti in cima. `attivoId` marca la
 * riga del programma attivo; `schedeV2` serve ai conti e resta null quando la
 * lettura non è riuscita — la riga scrive «non registrato», non uno zero. */
export function elencoArchivio(programmi, opzioni) {
  const o = opzioni || {};
  const elenco = Array.isArray(programmi) ? programmi.filter((p) => p && typeof p === "object") : [];
  const attivoId = o.attivoId == null ? "" : String(o.attivoId);
  const seduteLogbook = Array.isArray(o.sedute) ? o.sedute : null;
  return elenco
    .filter((p) => !p.deletedAt)
    .map((p) => {
      const profilo = profiloProgramma(p);
      /* Passo 42: il gruppo di schede serve due volte — ai conti della tabella
       * e alla vista di sola lettura che si apre con «Guarda». Si cerca con la
       * stessa funzione tollerante del resto dell'app (id nudo o id documento). */
      const cerca = schedePerProgramma(o.schedeV2, profilo);
      const conti = contiSchede(cerca.gruppo);
      /* Stesso logbook dell'Overview: una seduta si attribuisce a un programma
       * solo se il suo codice scheda è di un programma solo. */
      const conto = seduteLogbook ? seduteDelProgramma(seduteLogbook, nomePulito(profilo.nome)) : null;
      return {
        id: profilo.id,
        nome: nomePulito(profilo.nome),
        stato: nomePulito(profilo.stato),
        segno: profilo.segno,
        attivo: attivoId !== "" && String(profilo.id || "") === attivoId,
        creatoGrezzo: String(p.createdAt || p.created || ""),
        schede: conti ? conti.schede : null,
        esercizi: conti ? conti.esercizi : null,
        serie: conti ? conti.serie : null,
        sedute: conto ? conto.numero : null,
        ultima: conto ? conto.ultima : null,
        /* Il documento vero e le sue schede: la vista di sola lettura non
         * rilegge niente e non indovina niente. */
        programma: p,
        gruppo: cerca.gruppo
      };
    })
    .sort((a, b) => b.creatoGrezzo.localeCompare(a.creatoGrezzo) || a.nome.localeCompare(b.nome) || a.id.localeCompare(b.id));
}

/* Le righe della tabella del v31. `contenitore` è il corpo della tabella
 * (#archivio-corpo in index.html): qui dentro si disegna solo questo — la
 * testa, il titolo e le tre colonne di testo restano nel file, com'erano.
 * L'attivo si evidenzia come nel v31: «(attiva)» accanto al nome. I numeri
 * mancanti diventano «non registrato». I data-lb-pg rimasti nella Nota del
 * v31 (i conti «Senza programma») non hanno un dato vero nei documenti letti:
 * si dichiarano invece di restare con i puntini. */
export function renderArchivio(doc, contenitore, opzioni) {
  const opz = opzioni || {};
  const righe = Array.isArray(opz.righe) ? opz.righe : [];
  while (contenitore.firstChild) contenitore.firstChild.remove();

  if (!righe.length) {
    const tr = doc.createElement("tr");
    const td = doc.createElement("td");
    td.colSpan = 6;
    td.className = "pg-tdnome";
    td.textContent = opz.letturaFallita
      ? "La lettura dei programmi non è riuscita: ricarica la pagina."
      : "Nessun programma letto.";
    tr.appendChild(td);
    contenitore.appendChild(tr);
    return contenitore;
  }

  righe.forEach((riga) => {
    const tr = doc.createElement("tr");
    const nome = doc.createElement("td");
    nome.className = "pg-tdnome";
    nome.appendChild(doc.createTextNode(nomePulito(riga.nome)));
    if (riga.attivo) {
      nome.appendChild(doc.createTextNode(" "));
      const em = doc.createElement("em");
      em.textContent = "(attiva)";
      nome.appendChild(em);
    }
    /* Passo 42 — «Guarda»: apre il programma in sola lettura, senza attivarlo.
     * Sulla riga del programma in uso non c'è: quello si legge già in
     * Programmi, ed è la stessa regola del pannello «Cambia». */
    if (!riga.attivo) {
      const apri = typeof opz.apri === "function" ? opz.apri : null;
      const guarda = doc.createElement("button");
      guarda.type = "button";
      guarda.className = "pg-guarda";
      guarda.textContent = "Guarda";
      if (apri) {
        guarda.title = "apre «" + nomePulito(riga.nome) + "» in sola lettura: non lo attiva e non cambia niente";
        guarda.addEventListener("click", () => apri(riga));
      } else {
        guarda.disabled = true;
        guarda.setAttribute("aria-disabled", "true");
        guarda.title = "spento: questa pagina non ha letto le schede dei programmi";
      }
      nome.appendChild(doc.createTextNode(" "));
      nome.appendChild(guarda);
    }
    tr.appendChild(nome);
    [["schede", riga.schede], ["esercizi", riga.esercizi], ["serie", riga.serie],
     ["sedute", riga.sedute], ["ultima", riga.sedute === 0 ? "—" : riga.ultima]]
      .forEach(([chiave, valore]) => {
        const td = doc.createElement("td");
        td.className = "pg-m";
        td.setAttribute("data-colonna", chiave);
        td.textContent = valore == null ? NON : String(valore);
        if (chiave === "sedute" || chiave === "ultima") {
          td.title = valore == null
            ? "il logbook non è stato letto: nessun conto invece di uno zero finto"
            : (riga.sedute === 0
              ? "nessuna seduta del logbook porta una scheda di questo programma"
              : "sedute del logbook con il codice di una scheda di questo programma");
        }
        tr.appendChild(td);
      });
    contenitore.appendChild(tr);
  });

  const sezione = contenitore.closest ? contenitore.closest("section") : null;
  if (sezione) {
    Array.prototype.forEach.call(sezione.querySelectorAll("[data-lb-pg]"), (el) => {
      el.textContent = NON;
    });
  }
  return contenitore;
}
