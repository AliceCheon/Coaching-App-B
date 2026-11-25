/* comune/vista-scheletri-pagina.js — passo 34: la pagina Scheletri parla con B.
 *
 * Cosa fa, e cosa non fa:
 *  - le quattro linguette si accendono per davvero: «Scheletri» è il
 *    costruttore, «Miei scheletri» è la raccolta letta dalla zona B;
 *  - «Template» e «Libreria Coach» restano SPENTE e dicono perché. I numeri
 *    5 e 34 scritti a mano sono via: non erano un dato, erano un disegno;
 *  - «Salva Scheletro» scrive lo scheletro nella raccolta vera e lo fa
 *    comparire in «Miei scheletri». Niente «ti ho portato in Programma 2»:
 *    uno scheletro non diventa un programma da solo.
 *
 * Qui si legge e si disegna soltanto: la scrittura arriva dal servizio che
 * riceve (db e uid stanno nell'app, non nella pagina).
 */

import { scheletroDaCostruttore, messaggioNonSalvato } from "./scheletri.js";
import { nomePulito } from "./nome-pulito.js";

function el(doc, tag, classe, testo) {
  const e = doc.createElement(tag);
  if (classe) e.setAttribute("class", classe);
  if (testo != null) e.appendChild(doc.createTextNode(String(testo)));
  return e;
}

function testo(v) {
  return String(v == null ? "" : v).trim();
}

/* Nascondere con `hidden` non basta: le regole della pagina (`.sk-grid` è
 * `display:grid`) vincono sull'attributo. Qui si spegne il display e si tiene
 * `hidden` per chi legge la pagina con un lettore di schermo. */
function mostra(nodo, si) {
  if (!nodo) return;
  nodo.hidden = !si;
  nodo.style.display = si ? "" : "none";
}

/* Le due linguette che restano spente, con il motivo scritto nel tooltip.
 * Non si tolgono (regola di Alice): dicono a cosa serviranno. */
export const LINGUETTE_SPENTE = {
  Template: "spento: i template della libreria non sono ancora in B — nessun elenco da leggere",
  "Libreria Coach": "spento: la libreria del coach non è ancora in B — nessun elenco da leggere"
};

/* Il pannello della raccolta: una riga per scheletro, letta dalla zona B. */
export function pannelloRaccolta(doc, elenco, opzioni) {
  const o = opzioni || {};
  const c = el(doc, "div", "skp-raccolta");
  const lista = Array.isArray(elenco) ? elenco : [];
  if (!lista.length) {
    c.appendChild(el(doc, "div", "sk-vuoto",
      "Nessuno scheletro salvato: costruiscilo nella linguetta «Scheletri» e premi «Salva Scheletro». La raccolta è la tua: si legge dalla zona B."));
    return c;
  }
  c.appendChild(el(doc, "p", "skp-sottotitolo",
    lista.length + (lista.length === 1 ? " scheletro" : " scheletri") + " · dal più recente. Si applicano da Programma 1, linguetta «Scheletri»."));
  lista.forEach((s) => {
    const riga = el(doc, "div", "skp-riga");
    riga.setAttribute("data-sk", testo(s.id));
    const testa = el(doc, "div", "skp-testa");
    testa.appendChild(el(doc, "b", "skp-nome", nomePulito(s.nome) || "(senza nome)"));
    testa.appendChild(el(doc, "span", "skp-data", testo(s.data) || "data non registrata"));
    const quante = Number(s.esercizi) || 0;
    let conto = quante + (quante === 1 ? " esercizio" : " esercizi");
    if (Number(s.schede) > 0) conto += " · " + Number(s.schede) + (Number(s.schede) === 1 ? " scheda" : " schede");
    testa.appendChild(el(doc, "span", "skp-conto", conto));
    riga.appendChild(testa);

    /* Le serie dello scheletro si vedono una volta sola: sono quelle scritte
     * qui, non un carico. */
    const serie = Number(s.serie) || 0;
    if (serie > 0) riga.appendChild(el(doc, "p", "skp-serie", "serie in tutto: " + serie));
    c.appendChild(riga);
  });
  return c;
}

/* Serie totali dichiarate dallo scheletro (solo quelle scritte: nessuna stima). */
function serieTotali(s) {
  return Number(s && s.serie) > 0 ? Number(s.serie) : 0;
}

/* Il montaggio della pagina. servizi:
 *   costruttore()            -> { schede: [...] } (lo stato del costruttore)
 *   etichetta(k)             -> nome del gruppo muscolare da mostrare
 *   leggi()                  -> Promise<elenco scheletri dalla zona B>
 *   salva(documento)         -> Promise<{ ok, id, nome }> (scrive in B)
 *   nonCollegata             -> testo da dire se la scrittura non c'è
 *   applica?/elimina?        non servono qui: stanno in Programma 1
 */
export function montaPaginaScheletri(doc, servizi) {
  const s = servizi || {};
  const barra = doc.querySelector("#pag-scheletri .sk-tabbar");
  const griglia = doc.querySelector("#pag-scheletri .sk-grid");
  if (!barra || !griglia) return false;

  const linguette = Array.from(barra.querySelectorAll(".sk-tab"));
  const perTesto = (parola) => linguette.filter((b) => testo(b.textContent).indexOf(parola) === 0)[0];

  /* Una sola zona per la raccolta, creata accanto al costruttore. */
  let raccolta = doc.getElementById("sk-raccolta");
  if (!raccolta) {
    raccolta = el(doc, "div", "sk-card sk-raccolta-pane");
    raccolta.id = "sk-raccolta";
    mostra(raccolta, false);
    griglia.parentNode.insertBefore(raccolta, griglia.nextSibling);
  }
  let esitoRaccolta = doc.getElementById("sk-esito-raccolta");
  if (!esitoRaccolta) {
    esitoRaccolta = el(doc, "div", "sk-esito");
    esitoRaccolta.id = "sk-esito-raccolta";
    raccolta.insertBefore(esitoRaccolta, raccolta.firstChild);
  }

  /* Le due linguette spente: restano al loro posto, dicono perché, e non
   * portano più numeri inventati. */
  Object.keys(LINGUETTE_SPENTE).forEach((parola) => {
    const b = perTesto(parola);
    if (!b) return;
    b.disabled = true;
    b.setAttribute("aria-disabled", "true");
    b.title = LINGUETTE_SPENTE[parola];
    const cnt = b.querySelector(".sk-cnt");
    if (cnt) cnt.remove();
  });

  const accendi = (quale) => {
    linguette.forEach((b) => b.classList.toggle("attiva", b === quale));
    const miei = quale === perTesto("Miei scheletri");
    mostra(griglia, !miei);
    mostra(raccolta, miei);
    if (miei) carica();
  };

  function disegna(elenco) {
    const conto = doc.getElementById("sk-miei");
    const lista = Array.isArray(elenco) ? elenco : [];
    if (conto) conto.textContent = String(lista.length);
    const vecchio = raccolta.querySelector(".skp-raccolta");
    if (vecchio) vecchio.remove();
    raccolta.appendChild(pannelloRaccolta(doc, lista));
    return lista.length;
  }

  /* Ogni lettura porta un numero: se una risposta vecchia arriva dopo una
   * nuova, si butta. Così una lettura già in corso non cancella lo scheletro
   * appena salvato. */
  let versioneLettura = 0;
  function carica() {
    if (typeof s.leggi !== "function") return Promise.resolve(0);
    const mia = ++versioneLettura;
    return Promise.resolve()
      .then(() => s.leggi())
      .then((elenco) => {
        if (mia !== versioneLettura) return -1;
        return disegna(elenco);
      }, (e) => {
        if (mia !== versioneLettura) return -1;
        esitoRaccolta.className = "sk-esito on no";
        esitoRaccolta.textContent = "La raccolta non si legge: " + ((e && e.message) || "motivo non dichiarato");
        return 0;
      });
  }

  linguette.forEach((b) => {
    if (b.disabled) return;
    b.addEventListener("click", () => accendi(b));
  });

  /* «Salva Scheletro»: scrive davvero, poi lo mostra nella raccolta. */
  const salva = doc.getElementById("sk-salva");
  const esito = doc.getElementById("sk-esito");
  const scriviEsito = (txt, ok) => {
    if (!esito) return;
    esito.textContent = testo(txt);
    esito.className = "sk-esito on " + (ok ? "ok" : "no");
  };

  function statoCostruttore() {
    if (typeof s.costruttore === "function") return s.costruttore() || { schede: [] };
    return { schede: [] };
  }

  if (salva && !salva.__bdScheletriPagina) {
    salva.__bdScheletriPagina = true;
    salva.addEventListener("click", (ev) => {
      if (ev && ev.preventDefault) ev.preventDefault();
      const stato = statoCostruttore();
      const nome = testo((doc.getElementById("sk-nome") || {}).value);
      const nota = testo((doc.getElementById("sk-desc") || {}).value);
      const documento = scheletroDaCostruttore(stato, {
        nome: nome,
        nota: nota,
        etichetta: typeof s.etichetta === "function" ? s.etichetta : null
      });
      if (!documento.esercizi.length) {
        scriviEsito("Non c'è ancora nessun esercizio: clicca un gruppo muscolare e scegli l'esercizio.", false);
        return;
      }
      if (typeof s.salva !== "function") {
        scriviEsito(testo(s.nonCollegata) || "Non sei ancora collegata: entra con Google e riprova.", false);
        return;
      }
      const testoPrima = salva.textContent;
      salva.disabled = true;
      salva.textContent = "Salvo…";
      scriviEsito("Scrivo lo scheletro nella tua raccolta…", true);
      Promise.resolve()
        .then(() => s.salva(documento))
        .then((ris) => {
          if (!ris || ris.ok !== true) throw new Error((ris && (ris.motivo || ris.messaggio)) || "scrittura rifiutata");
          const quante = documento.esercizi.length;
          const salvato = "Scheletro «" + (nomePulito(documento.nome) || documento.nome) + "» salvato · "
            + quante + (quante === 1 ? " esercizio" : " esercizi");
          scriviEsito(salvato + " · lo trovi in «Miei scheletri»", true);
          esitoRaccolta.className = "sk-esito on ok";
          esitoRaccolta.textContent = salvato;
          return carica();
        })
        .then((n) => {
          const tab = perTesto("Miei scheletri");
          if (tab && Number(n) > 0) accendi(tab);
        }, (e) => {
          scriviEsito(messaggioNonSalvato((e && e.message) || "motivo non dichiarato"), false);
        })
        .then(() => { salva.disabled = false; salva.textContent = testoPrima; });
    });
  }

  /* Conteggio e raccolta: appena si può leggere. Senza accesso la pagina non
   * inventa uno zero: lo dice quando serve, e ricarica dopo l'accesso. */
  if (typeof s.leggi === "function") carica();
  else if (esitoRaccolta) {
    esitoRaccolta.className = "sk-esito on no";
    esitoRaccolta.textContent = testo(s.nonCollegata) || "Non sei ancora collegata: entra con Google e riprova.";
  }
  return { ricarica: carica, accendi: accendi };
}

export { serieTotali };
