# Censimento delle tab del desktop

Solo lettura: nessuna riga di codice cambiata. Le venti `pag-*` di `desktop/index.html`, nell'ordine del menu.
«Calcolato» vuol dire che un modulo di `comune/` rilegge i dati veri e riscrive la pagina a ogni sincronizzazione; «statico» vuol dire che quello che si vede è il testo scritto nell'HTML e nessuno lo tocca più.

| Tab | Cosa mostra oggi con i dati veri di Alice | Come nasce | Dati finti |
|---|---|---|---|
| **Dashboard** | Readiness dai cinque segnali del check-in, stato di sintesi, carico, carta RED-S e carta Stress allenamento, questionari, Diva Bot | Calcolato (`comune/vista-dashboard.js`, `comune/vista-reds.js`) | **Sì, avanzi di mockup** che vengono sovrascritti appena la pagina si ridisegna: readiness «72» e «Sei pronta, Alice!» e le chips 4/5 5/5 3/5 2/5 4/5 — `desktop/index.html:1705`, `:1682`, `:1719` |
| **Dati Cliente** | Quattro linguette: Anagrafica (con i buchi dichiarati: cognome vuoto, data di nascita non registrata), Anamnesi (letta dal registro), Biofeedback e Questionari (dichiarano cosa manca e da dove arriva) | Anagrafica statica dal mockup v31; Anamnesi calcolata (`comune/vista-anamnesi.js`) | **Sì, fermo**: nome, mail protetta e schede scritte a mano — `desktop/index.html:1931`, `:1963` |
| **Salute & recupero** | Sonno, stress, segnali; dice apertamente che nel backup non ci sono HRV né FC a riposo e che quindi la prontezza non si calcola | Statico dal mockup | **Sì, conteggi scritti a mano**: «ultimo check-in 21/10/2026 · 6 note di diario», numero di sedute — `desktop/index.html:2054`, `:2097` |
| **Misure & plicometria** | Plicometria, BMI, WHR, cinque sessioni con la data; il modulo dice che i dati arrivano dall'app telefono, non a mano | Statico, con un seed demo dentro la pagina | **Sì, seed demo**: il seme di dati demo scritto dentro la pagina con altezza 178, sesso, età 31 — `desktop/index.html:2257`; l'intestazione «5 sessioni dalla scheda della coach» è testo fermo — `:2131` |
| **Reset / Bulk / Cut** | Le tre direzioni con BMR, TDEE, target e le tre fasi; senza profilo confermato niente cifre, e la nota nomina i campi che mancano | Calcolato per metà (passo 17): il peso viene da `comune/peso-b.js`, il profilo da `BDPesoB.leggiProfilo`; le formule si applicano solo con altezza, età e sesso **confermati** | No: nessuna cifra scritta a mano. Con i campi vuoti (o non confermati) mostra `—` e dice perché — `desktop/index.html:9052` |
| **Monitor annuale** | L'anno in una pagina: peso medio per mese, linea dei dodici mesi, pesate lette e anno ricavato dalle date | Calcolato (passo 17, `comune/peso-b.js`): tre stati distinti — letto, vuoto, non letto | No: i numeri arrivano dalle pesate; con la lettura negata dice «non ho potuto leggere», col vuoto «nessuna pesata registrata» |
| **Monitor peso** | Cinque pesate con data, delta, medie per periodo, grafico; ognuna dichiara la fonte «scheda coach (importata)» | Calcolato (passo 17, `comune/peso-b.js`): badge, KPI, tabella e legenda ridipinti insieme alle altre quattro pagine | No nel senso di «inventate»: sono le cinque pesate vere della scheda della coach, spostate in un modulo solo e dichiarate come importate |
| **Integratori** | Nient'altro che la struttura: cosa ci va, «nessun dato», «tutto manca» | Vuota per scelta | No — la stato è dichiarato: «struttura pronta · contenuto da riempire» — `desktop/index.html:2829` |
| **Overview atleta** | Programma attivo, settimana corrente, aderenza, carico, trend gruppi, peso, ultime sedute | Calcolato (`comune/vista-overview.js` + logbook) | No: il segnaposto «calcolo dai dati del file…» viene sostituito — `desktop/index.html:2840` |
| **Pianificazione** | Il prospetto delle otto settimane con la rotazione A–D | Statico: nessun modulo lo ridisegna (`pl-blocks` non compare in nessun `.js`), anche se `comune/vista-pianificazione.js` esiste e non è collegato | **Sì, calendario del mockup**: 8 settimane × 4 giorni scritti in HTML — `desktop/index.html:2961` |
| **Database esercizi** | I 179 esercizi con distretto, set base, sovrapposizione, TUT; la nota dice che i 267 del gestionale qui sono 179 e che 62 prehab non si inventano | Statico, ma copiato dal catalogo vero (`comune/catalogo-esercizi-b.js`) | No nei contenuti; **sì nella forma**: 131 KB di righe scritte in HTML, la testata «179 esercizi» è ferma — `desktop/index.html:2979`, tabella `:2996` |
| **Scheletri** | Il costruttore vuoto: «0» scheletri salvati | Vuota: legge `zona.scheletri`, che è vuoto | No |
| **Progressioni** | Solo la frase di apertura: la griglia è un contenitore vuoto | Vuota | No — `desktop/index.html:3019` è un `<div>` da 23 byte |
| **Programma 1** | La scheda attiva con le linguette, i carichi, le progressioni, l'annulla | Calcolato (`comune/vista-programma.js`, `piano-vivo.js`) | No |
| **Riepilogo volume** | Serie per distretto sulle otto settimane del programma attivo | Calcolato (`comune/vista-volume.js` dentro `#rv-vivo`) | No |
| **Specializzazione** | Chi prende più volume e in quale settimana, sinergie comprese | Calcolato (`comune/vista-specializzazione.js` dentro `#sp-corpo`) | No |
| **Curve di forza** | Quattro letture, grafici, tabella esercizi, scheda palestra | Statico: 124 KB di pagina, SVG già disegnati, nessun modulo la riempie (`cv-real` non compare in nessun `.js`) | **Sì, e sembra vivo**: «Dal logbook — carico massimo per seduta · dati veri del backup · 30/10/2026» con i punti già tracciati — `desktop/index.html:3415` |
| **Archivio** | Tutti i programmi del backup, attivo compreso, con schede, esercizi, serie, sedute, ultima seduta | Calcolato (`comune/vista-archivio.js` dentro `#archivio-corpo` + logbook) | No |
| **Study time** | L'Excel reso consultabile: 104 figure, 5 stanze, 19 rotazioni, 38 settimane | Statico: 4,5 MB di HTML con le figure incorporate | No inventato, ma **congelato all'import**: i numeri sono quelli letti dall'Excel — `desktop/index.html:4069` |
| **Impostazioni** | Dove salva, cosa manca, tema, versione, azzera | Statico nello stato, vero nel contenuto: dice «solo locale · Firebase non collegato»; la versione arriva da un punto solo (`window.BD_VERSIONE`) e la mostra la riga Build | No: la versione non è più scritta a mano in tre posti |

## Tab piene e affidabili

1. Programma 1
2. Riepilogo volume
3. Specializzazione
4. Overview atleta
5. Archivio
6. Dashboard (piena, ma con gli avanzi di mockup ancora nel file)

## Tab con dati finti da alimentare o spegnere

1. **Curve di forza** — la peggiore: grafici già disegnati con la data 30/10/2026 e l'etichetta «dati veri del backup».
2. **Pianificazione** — il calendario delle otto settimane è quello del mockup, mentre il programma vero esiste già.
3. **Misure & plicometria** — seed demo (178 cm, 31 anni) dentro la pagina.
4. **Salute & recupero** — conteggi di check-in e note scritti a mano.
5. **Dati Cliente** — anagrafica ferma al v31.
6. **Database esercizi** — contenuto giusto, ma 131 KB di righe statiche invece del catalogo letto a runtime.
7. **Study time** — congelato all'import dell'Excel.
8. **Impostazioni** — badge e versione fermi.

Usciti da questo elenco col passo 17: **Monitor peso**, **Monitor annuale** e **Reset / Bulk / Cut**. Il peso ha una fonte sola
(`comune/peso-b.js`) e le cifre di Reset/Bulk/Cut compaiono solo con un profilo confermato, mai scritte a mano.

## Tab vuote con il motivo già scritto

1. **Integratori** — «struttura pronta · contenuto da riempire» e fuori perimetro la prescrizione.
2. **Scheletri** — nessuno scheletro salvato nella zona B.
3. **Progressioni** — il contenitore c'è, la libreria non è collegata: la griglia di `#pr-libgrid` è vuota e non c'è nessuna nota che lo dica.

## Passo 17 — il peso ha una fonte sola

Le cinque pesate della scheda della coach stanno in `comune/peso-b.js`, dichiarate con la fonte «scheda coach (importata)».
Cinque pagine (Dashboard, Monitor peso, Monitor annuale, Overview atleta, la riga del profilo) leggono da lì e dicono la stessa
frase. Tre stati, mai uno zero al posto di un dato che non c'è: **letto** (le pesate con la data), **vuoto** («letta e vuota:
nessuna pesata registrata»), **non letto** («non ho potuto leggere il peso: …»). Con il vuoto o la lettura negata il KPI del
peso dice `—` anche in Overview, e la tessera Peso della Dashboard dice `—` con il motivo. **Reset / Bulk / Cut** non mostra
BMR, TDEE né target finché altezza, età e sesso non sono confermati: la guardia guarda la conferma, non solo i campi pieni.

## Linguette uscite da Dati Cliente (passo 15)

Erano gusci nati dal video di riferimento: un titolo, la frase «da costruire con i tuoi screen» e nessun campo. Non avevano un dato dietro nel backup, né un bisogno espresso da Alice. Escono anche dal file, non restano nascoste: se un giorno servirà, tornerà con un dato vero dentro.

| Linguetta tolta | Cosa c'era | Perché è uscita |
|---|---|---|
| **Wearable** | Solo la frase «Wearable: da costruire con i tuoi screen». Passi, sonno e frequenza cardiaca non sono nel backup: il sonno e lo stress stanno nel check-in, non in un dispositivo collegato | Guscio nato dal video, nessun dato dietro, nessun bisogno espresso. Il posto del sonno è Salute & recupero e il check-in, non una linguetta vuota |
| **Personalizzati** | Solo la frase «Personalizzati: da costruire con i tuoi screen». Campi liberi che nessuno ha mai creato, e nessuna schermata da cui copiarli | Guscio nato dal video, nessun dato dietro, nessun bisogno espresso. Se servirà, tornerà quando ci sarà qualcosa da metterci dentro |

Restano **Biofeedback** e **Questionari**: non sono collegate, ma non fingono. Ognuna dice in una riga cosa manca e da dove arriverà (il check-in del telefono) e non ha campi editabili che non salvano.
