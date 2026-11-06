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
 *  - le sedute lette portano data, codice ed esercizi ma NON il programma a
 *    cui appartenevano: il collegamento seduta→programma non è nei dati
 *    letti, quindi Sedute e Ultima restano «non registrato» per tutti (se un
 *    giorno il documento di una seduta porterà il programma, la colonna si
 *    accende — qui non si deduce dai codici);
 *  - se anche una sola serie della settimana 1 non si legge, la colonna
 *    Serie dell'intero programma è «non registrato»: una somma a buchi non
 *    si presenta come un numero.
 *
 * Solo a schermo: i nomi passano da nomePulito (trattino basso via, iniziale
 * maiuscola); i valori veri nei documenti restano intatti.
 */

import { profiloProgramma } from "./programma.js";
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

/* Le righe della tabella: TUTTI i programmi letti, attivo compreso (è il v31:
 * «I blocchi, chiusi e attivo»), i più recenti in cima. `attivoId` marca la
 * riga del programma attivo; `schedeV2` serve ai conti e resta null quando la
 * lettura non è riuscita — la riga scrive «non registrato», non uno zero. */
export function elencoArchivio(programmi, opzioni) {
  const o = opzioni || {};
  const elenco = Array.isArray(programmi) ? programmi.filter((p) => p && typeof p === "object") : [];
  const attivoId = o.attivoId == null ? "" : String(o.attivoId);
  const perProgramma = o.schedeV2 && o.schedeV2.perProgramma ? o.schedeV2.perProgramma : null;
  return elenco
    .filter((p) => !p.deletedAt)
    .map((p) => {
      const profilo = profiloProgramma(p);
      const conti = contiSchede(perProgramma ? (perProgramma[profilo.id] || null) : null);
      return {
        id: profilo.id,
        nome: nomePulito(profilo.nome),
        stato: nomePulito(profilo.stato),
        segno: profilo.segno,
        attivo: attivoId !== "" && String(profilo.id || "") === attivoId,
        creatoGrezzo: String(p.createdAt || p.created || ""),
        schede: conti ? conti.schede : null,
        esercizi: conti ? conti.esercizi : null,
        serie: conti ? conti.serie : null
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
    tr.appendChild(nome);
    [["schede", riga.schede], ["esercizi", riga.esercizi], ["serie", riga.serie], ["sedute", null], ["ultima", null]]
      .forEach(([chiave, valore]) => {
        const td = doc.createElement("td");
        td.className = "pg-m";
        td.setAttribute("data-colonna", chiave);
        td.textContent = valore == null ? NON : String(valore);
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
