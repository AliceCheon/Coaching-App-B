# Differenze del desktop dal v31

Regola di casa (guardia 42): `desktop/index.html` può differire da `pc/index.html` — il v31 congelato — **solo nelle righe elencate qui sotto**. Ogni modifica futura aggiunge un blocco a questo documento, altrimenti la suite è rossa.

- `pc/index.html` resta congelato — sha256 di pc/index.html: `c612e2bbdae952546a250ed0ea58d7eab825178e6b1551b0bc6a6981af78a7c8`
- file nuovo (non cambia il v31): `desktop/app-v31.js` — login Google + lettura in sola lettura + render del Programma attivo
- `tests/09` continua a guardare `desktop/index.html`; `tests/01` e le scansioni di `tests/02` e `tests/08` lo lasciano escluso come prima (l'editor statico nascosto porta dentro il seme di esempio del v31: finché resta nascosto non viene mostrato, e le scansioni non lo leggono)
- i dati di esempio del Programma attivo non si vedono più (editor statico nascosto); `window.BD_LB_SEED` resta nel file: lo usano le schermate non ancora collegate (Dashboard, Overview, Riepilogo volume…)

## Le righe cambiate (numeri del file attuale, desktop/index.html)

- righe 1487: La voce di menu «Programma 1» diventa «Programma attivo · in corso», con sotto l'identificativo #nomeProgrammaAttivo per il nome letto da Firestore (modifica approvata da Alice).
- righe 3684: La sezione Programma 1 apre il contenitore dinamico #programma-attivo e nasconde l'editor statico dentro #programma-strumenti (hidden): i dati di esempio non si vedono più; il resto del blocco resta nel file, intatto.
- righe 3946: Chiusura di #programma-strumenti prima della sezione Programma 2 (la seconda </div> è la nuova).
- righe 6535: La mappa delle etichette del menu allinea la voce del programma al nuovo nome.
- righe 7936: Regola di a-capo solo per la cella Recupero (.rec) e il nome esercizio (.ese-name) dentro la tabella del Programma 1: overflow-wrap:anywhere per le stringhe senza spazi (es. eccentrica_controllata_e_poi_esplosiva).
- righe 10777-10781: Prima di </body>: carico di app-config-b.js, dell'SDK Firebase compat 10.12.5 (app, auth, firestore) e del modulo desktop/app-v31.js (login + lettura in sola lettura).

Ultimo aggiornamento: passo 3a (5 novembre 2026).

---

## Passo 3b — notte del 5 novembre 2026 · correzioni dopo la prova sui dati veri

In questo passo NESSUNA riga di `desktop/index.html` è cambiata: i sei blocchi
dichiarati sopra restano gli unici confronto col v31 (la guardia 42 lo verifica
dal diff vero). Le correzioni stanno nei due file che il v31 non ha.

### desktop/app-v31.js — tre aggiunte
1. **Striscia in alto (il nastro).** Nel file la striscia è scritta fissa per
   la Dashboard («Dashboard / readiness, carico, questionari…») e nessun codice
   del v31 la aggiorna al cambio pagina; il pezzo destro (`#fr-nastro`) viene
   scritto con `textContent` su una stringa che contiene un tag `<span>`, che
   il browser stampa come testo. Il vecchio B teneva il nastro con il suo
   app.js, per pagina: per questo prima sembrava giusta. Ora il nastro si
   aggiorna al cambio pagina: titolo = testo della voce di menu del v31 (per i
   Programmi: «Programma attivo · in corso»), sottotitolo per le pagine previste
   = il testo che usava il vecchio B (per i Programmi: «programma attivo · il
   documento del programma e i logbook»), per le altre pagine il sottotitolo
   della Dashboard sparisce invece di restare appiccicato; la voce «dati veri ·
   nessun numero inventato» resta. Il pezzo destro perde il markup e resta testo
   semplice, con lo stesso contenuto calcolato dal v31.
2. **Fase.** Se il campo del documento ripete il nome del programma non è una
   fase: non viene mostrato e il campo resta a «non registrato». La pagina di
   diagnosi (sotto) dice quali nomi usa davvero il documento; quando li
   sapremo si collega il campo giusto.
3. Niente altro: login, lettura e render restano quelli del passo 3a.

### desktop/diagnosi.html — TEMPORANEA, da togliere
Pagina di sola lettura, stessa identità del sito (stesso login, moduli di
comune/): dopo l'accesso mostra SOLO i nomi dei campi, il loro tipo e la
lunghezza — mai i valori — del documento radice, del campo state, dei documenti
programma raggruppati per prefisso dell'id, del programma attivo, di una scheda,
di un esercizio dentro la scheda, di un eventuale esercizio separato e di una
scheda archiviata, più i nomi delle sottoraccolte della radice e del programma.
Serve a leggere i nomi veri dei campi del documento di Alice (fase, data inizio,
durata, giorni, schede). Si toglie dal sito appena i nomi giusti sono a posto.
- diagnosi v2 (clic muto): script di controllo spostato PRIMA degli SDK (cosi' anche i loro errori si vedono); il clic quando il modulo non e' pronto dice esattamente quali pezzi mancano (config/SDK/auth/firestore); orologio di avvio ogni 4s e avviso dopo 30s; corretta la variabile uscita mai dichiarata nel modulo.
- Programma attivo (dopo la diagnosi): i pannelli delle schede si accendono come nel v31 con la classe .on (il CSS di .pr-pannello e' display:none finche' non arriva .on: con solo hidden restavano invisibili e le linguette sembravano morte); Data inizio vuota mostra "non registrato" al posto del segnaposto gg/mm/aaaa. La Fase era gia' a posto (guardia fase=nome del passo 3b). Nessuna riga di desktop/index.html cambiata. Commit locale, niente push.
- Elenco TUT/REC (pagine temporanee, come diagnosi): nuovo modulo comune/tut-rec.js con la regola dichiarata (REC in colonna solo se recupero vero: cifre, intervalli, min/sec; TUT solo se vuoto o schema di cifre con separatori) e nuova pagina desktop/elenco-tut-rec.html che elenca le celle da spostare col pulsante Copia elenco. La pagina elenco va tolta dal sito appena Alice approva; poi la stessa regola entra nella vista, solo a schermo.
- Regola TUT/REC nella vista (06/11, cambio d'istruzioni di Alice: niente elenco da approvare, la regola entra in codice per tutte le schede; solo a schermo, i dati non si toccano). Regola esatta, in comune/tut-rec.js e usata da comune/vista-programma.js: REC resta in colonna se è vuoto, «—», o fatto solo di cifre con virgole/punti, trattini, apostrofi/primi, barre, due punti, spazi e opzionali sec/secondi/min/minuti — serve almeno una cifra (es. «2», «2-3'», «3-4'», «90 sec», «120-180 sec», «1,30'»); TUT resta se è vuoto, «—», o uno schema di cifre con i separatori - / x (es. «3-1-1-0», «2/0/1/0», «30X1», «3010»). Tutto il resto (le frasi di coach) si mostra in Descr./Setup su una riga nuova con «REC: » / «TUT: » davanti e in colonna resta «—». Il recupero lungo si mostra tagliato a 8 caratteri con «…» e il valore completo nel Title del mouse, così i bottoni −/+ non gli finiscono sopra. I nomi degli esercizi si mostrano senza trattino basso e con l'iniziale maiuscola («lat_machine_triangolo» → «Lat machine triangolo»): solo a schermo, documento e chiavi del logbook restano com'erano (comune/nomi-esercizi.js). La pagina elenco-tut-rec.html non serve più per l'approvazione: si toglierà dal sito al prossimo push, se Alice è d'accordo.
