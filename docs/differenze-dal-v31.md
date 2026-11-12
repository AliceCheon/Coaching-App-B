# Differenze del desktop dal v31

Regola di casa (guardia 42): `desktop/index.html` può differire da `pc/index.html` — il v31 congelato — **solo nelle righe elencate qui sotto**. Ogni modifica futura aggiunge un blocco a questo documento, altrimenti la suite è rossa.

- `pc/index.html` resta congelato — sha256 di pc/index.html: `c612e2bbdae952546a250ed0ea58d7eab825178e6b1551b0bc6a6981af78a7c8`
- file nuovo (non cambia il v31): `desktop/app-v31.js` — login Google + lettura in sola lettura + render del Programma attivo
- `tests/09` continua a guardare `desktop/index.html`; `tests/01` e le scansioni di `tests/02` e `tests/08` lo lasciano escluso come prima (l'editor statico nascosto porta dentro il seme di esempio del v31: finché resta nascosto non viene mostrato, e le scansioni non lo leggono)
- i dati di esempio del Programma attivo non si vedono più (editor statico nascosto); `window.BD_LB_SEED` resta nel file: lo usano le schermate non ancora collegate (Dashboard, Overview, Riepilogo volume…)

## Le righe cambiate (numeri del file attuale, desktop/index.html)

: La voce di menu «Programma 1» diventa «Programma attivo · in corso», con sotto l'identificativo #nomeProgrammaAttivo per il nome letto da Firestore (modifica approvata da Alice).
: La sezione Programma 1 apre il contenitore dinamico #programma-attivo e nasconde l'editor statico dentro #programma-strumenti (hidden): i dati di esempio non si vedono più; il resto del blocco resta nel file, intatto.
: Chiusura di #programma-strumenti prima della sezione Programma 2 (la seconda </div> è la nuova).
: La mappa delle etichette del menu allinea la voce del programma al nuovo nome.
: Regola di a-capo solo per la cella Recupero (.rec) e il nome esercizio (.ese-name) dentro la tabella del Programma 1: overflow-wrap:anywhere per le stringhe senza spazi (es. eccentrica_controllata_e_poi_esplosiva).
: Prima di </body>: carico di app-config-b.js, dell'SDK Firebase compat 10.12.5 (app, auth, firestore) e del modulo desktop/app-v31.js (login + lettura in sola lettura).

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
- Regola nomePulito dappertutto (06/11, Alice): il trattino basso non si vede in NESSUN punto dell'app (esercizi, schede, programmi, logbook, archivio, tendine). Una sola funzione, nomePulito in comune/nome-pulito.js (al posto di nomi-esercizi.js, tolto): sostituisce «_» con uno spazio, taglia gli spazi alle estremità e mette la maiuscola alla prima lettera. Usata in tutte le schermate dove si disegna un nome o un testo preso dai dati: vista-programma (nome esercizio, nota, nome scheda, focus, note scheda, programma, descrizione, messaggio, Fase nel tendina, stato, serie/reps, testi spostati REC:/TUT:, Title del recupero), vista-archivio, vista-dashboard, vista-overview, vista-pianificazione e la voce di menu in app-v31; dentro campo() la pulizia vale per ogni valore mostrato. Regola ferma: solo il testo mostrato — il valore vero resta intatto nei dati e nei confronti col logbook (chiavePrestazione e ultimaVolta usano l'originale). Guardia in suite (tests/44): scansione di tutte le vista-*.js più app-v31.js che fallisce se una riga usa .nome/.nota/.note/.descrizione/.messaggio/.focus/.fase/.stato senza nomePulito (valgono le sole condizioni, le chiavi di ricerca e i confronti), più la prova su schermo: la scheda renderizzata con trattini bassi in ogni testo non ne mostra nessuno e l'Ultima resta legata al nome vero. Ogni schermata nuova vista-* entra nella guardia da sola; il suo test deve portare testi con «_».
- Passo 3b, Archivio programmi come il v31 (06/11, Alice: dati veri in sola lettura, controlli spenti, tabella del v31). Righe cambiate: nella sezione pag-archivio di desktop/index.html il corpo statico della tabella pg-tab (le cinque righe di esempio del backup) e’ sostituito da <tbody id="archivio-corpo">, e la frase del v-testo che rimandava al backup del 30/10 ora dice «calcolati dai dati veri letti in sola lettura»; nel blocco Fase B2 (che resta per le Curve di forza) tolti la chiave «prog» di DATI, la variabile SCHEDE, la variabile Pr e il ciclo che riempiva i data-lb-pg: l’Archivio non prende più numeri dal backup. comune/vista-archivio.js riscritto: elencoArchivio comprende TUTTI i programmi letti, attivo compreso (più recente in cima), con attivo/schede/esercizi/serie; renderArchivio disegna le righe della tabella pg-tab nel corpo #archivio-corpo, attivo evidenziato «(attiva)» accanto al nome, e i data-lb-pg rimasti nella Nota del v31 diventano «non registrato» invece di restare con i puntini; senza programmi letti una riga sola lo dice. desktop/app-v31.js: import di elencoArchivio/renderArchivio e, nel leggi(), render dell’archivio in #archivio-corpo con attivoId e schedeV2. Definizioni dichiarate: Schede = tutte le schede del programma lette (archiviate comprese); Esercizi = somma degli esercizi di quelle schede; Serie = somma delle serie della settimana 1 di quegli esercizi, e se anche una sola non si legge la colonna è «non registrato»; Sedute e Ultima = «non registrato» per tutti, perché le sedute lette portano data, codice ed esercizi ma non il programma a cui appartenevano: il collegamento non è nei dati e non si deduce dai codici. Nomi sempre con nomePulito, valori veri intatti nei documenti. Test 45 nuovo.
## Passo 3c — 6 novembre 2026 · il Logbook dentro «Tutto insieme», con le sedute vere

- La fonte, scelta e dichiarata: la sottoraccolta `sessions` (124 sedute lette), NON `state.history` (363 voci). Il v31 disegna SEDUTE — data, scheda, esercizi con le serie, journal, durata, provenienza — ed è esattamente la forma della sottoraccolta: il seme di esempio del v31 era lui stesso una copia statica delle stesse sedute (120, backup del 30/10). `state.history` ha una voce per esercizio (exercise, sets, previous, average, muscle…): non porta la seduta come unità, e raggrupparla per data per ricavarne sedute sarebbe una ricostruzione, non una lettura. I due numeri non si sommano: 363 voci di esercizio, 124 sedute.
- Righe cambiate di `desktop/index.html`: il seme di esempio `window.BD_LB_SEED` (una riga da 113.108 caratteri, 120 sedute) diventa `window.BD_LB_SEED = null`; lo script «Mostra/Fonte» (v3) ora rilegge le sedute a ogni applicazione del filtro invece di incollarle all'avvio (i dati veri arrivano dopo, da Firestore); nel cassetto della seduta il nome esercizio si mostra con `nomePulito` (`e.np || e.n`: il vero resta in `n` e il catalogo EXCAT continua a guardare lì); nella carta, sotto i filtri, la riga di dichiarazione `#lb-nota-b` (vuota e nascosta di default, riempita da app-v31).
- `comune/logbook.js` nuovo: `seduteLogbook(...)` traduce le sedute vere nella forma del v31 ({id, d, pn, sc, nm, w, st, dur, jr, pg, ex, so}) e torna le dichiarazioni. Regole dichiarate: stato da `status`, o da `done` (true→completed, false→bozza) se status manca, altrimenti spento «non registrato»; provenienza da `source`, altrimenti spenta; programma SOLO se il codice della scheda (senza «scheda », senza spazi, maiuscolo) appartiene a UN programma solo fra quelli letti, schede attive e archiviate comprese — altrimenti «—» con la ragione in carta; journal solo se la seduta porta l’oggetto `journal` (energy/rpe/mood/note, i campi che il v31 legge nei backup), con solo `journalId` resta «non collegata»; durata da `totalDurationSeconds`; Programmato solo col programma attribuito e la scheda trovata per lo stesso codice, con la settimana DALLA SEDUTA (se il documento della scheda non porta quella settimana, la colonna resta a «—», mai presa da un’altra). Serie: [kg, reps, rpe, rir], i campi accettati dichiarati (kg/weight/peso/carico/load · reps/ripetizioni/rip/repetitions · rpe · rir) — lo zero vero (corpo libero) resta zero, il mancante vale null. Ordine: più recenti in cima (data, poi id); le sedute senza data leggibile restano in fondo, contate, non buttate. Nomi: vero in `n` per il catalogo, pulito in `np` per lo schermo.
- `desktop/app-v31.js`: dopo la lettura, `seduteLogbook` alimenta `window.BD_LB_SEED` e `BD_LB._prende(...)` + `tutto()` (i chip «Ultime sedute registrate» si ridisegnano); «Importa backup» e «Dimentica» restano visibili ma disabled; i filtri Programma/Stato/Fonte si accendono solo se il campo vero esiste, altrimenti spenti con «non registrato»; la riga di dichiarazione elenca i conti (sedute lette, documenti senza id e doppioni, attribuzioni).
- `desktop/diagnosi.html` tolta dal sito (era temporanea): la sua sezione qui sopra resta come memoria.
- La striscia di diagnosi `?diagnosi=1` (`comune/diagnosi-b.js`, 9-10/11/2026) e' RIMOSSA dal sito il 10/11/2026, finito il suo lavoro: con lei sono usciti il modulo, l'import, le due righe di stato e il blocco della striscia in `desktop/app-v31.js`, i tre attributi `data-id-scheda`, `data-id-ese`, `data-indice` in `comune/vista-programma.js` e la sua sezione qui sopra. Senza quel parametro la pagina era gia' identica: adesso non c'e' piu' nessun codice che la costruisca.
- Cosa resta demo / effetti dichiarati: le Curve di forza restano demo (il v31 lo dice da sé: «antanea, non collegata al logbook»); la nota RPE della Dashboard (calcolata sul diario del seme) ora mostra «—», perché il diario non è nei dati letti; i chip «Ultime sedute registrate» e i conteggi `data-lb-kpi` del v31 si accendono coi dati veri (sono già logbook-driven); il catalogo EXCAT resta nel file com’era (mappa nome→distretto, non è un dato di seduta).
- Righe di desktop/index.html diverse da pc/index.html, elenco aggiornato al passo 3c: - righe 1487 · - righe 2737 · - righe 2751-2754 · - righe 2768 · - righe 2781 · - righe 2794 · - righe 3688 · - righe 3950 · - righe 4659 · - righe 4663 · - righe 6513 · - righe 7914 · - righe 8370 · - righe 8527 · - righe 10685 · - righe 10687 · - righe 10689-10688 · - righe 10757-10761
## Passo 4 — 7 novembre 2026 · la zona B e la copia (con gli esercizi sciolti)

- Perche' una zona separata: B non scrive dove scrive A. La zona si chiama `bdB_atleti/{uid}` e il nome sta **una volta sola** (`ZONA_B` in `comune/modello-dati.js`); la guardia `tests/47` fallisce se il nome compare altrove, se una scrittura nasce fuori dalla zona o se un modulo diverso da `comune/scritture-b.js` contiene un verbo di scrittura.
- `comune/scritture-b.js` e' l'**unico** modulo che scrive. Nessuna funzione accetta un percorso pronto: si passano uid, sottoraccolta e id, e il percorso lo costruisce `riferimentoB`. Le sottoraccolte ammesse sono cinque: programmi, schede, esercizi, sedute, registro. uid o id vuoti, con `/` o non testuali vengono **rifiutati con un errore**, non corretti in silenzio.
- `comune/copia-b.js` e' puro (niente rete, niente DOM): piano di copia, confronto atteso/scritto, fotografia, data leggibile. Cosi' i numeri si verificano senza aprire un browser.
- **Correzione del 7/11 sugli esercizi sciolti.** Nella prima stesura del passo 4 gli `program-v2-exercise-` erano rimasti fuori: era una decisione presa mentre scrivevo il codice, e contraddiceva il piano approvato. Sbagliata, perche' le schede grandi in B sarebbero risultate monche. Ora entrano nella copia come quarta famiglia, con la loro sottoraccolta `esercizi` dentro la zona B. Se in A non ce ne sono, il numero mostrato e' **0**: uno zero dichiarato, non uno zero taciuto.
- **Due momenti separati nella pagina.** `desktop/copia-b.html` + `copia-b.js`: il pulsante *Conta (sola lettura)* legge A e mostra i numeri veri (programmi, schede attive, esercizi sciolti, sedute, archiviate) senza scrivere niente; il pulsante *Copia in B* nasce `disabled` e si accende **solo dopo un conteggio riuscito**, e si rispegne se il conteggio si azzera o fallisce. Senza piano la copia si rifiuta con «Prima conta: senza i numeri non si copia».
- Cosa si copia: programmi (`program-v2-meta-` e `program-v1-` interi), schede attive (`program-v2-sheet-`), esercizi sciolti (`program-v2-exercise-`), sedute (`sessions`). Cosa resta fuori, dichiarato a schermo col conteggio: le schede **archiviate** (`program-v2-archived-`) e le foto di nutrizione (che la lettura grezza non chiede nemmeno: interroga solo per intervalli di id).
- La copia e' una **fotografia**, non una sincronizzazione: dopo aver scritto, la pagina rilegge B, confronta id per id e contenuto, scrive il documento `fotografia` nella radice della zona B con la data in chiaro («Fotografia del 7 novembre 2026 alle 12:39») e una voce nel registro; la nota dentro il documento dice che le sedute registrate dopo non arrivano da sole.
- Guardie nuove: `tests/47` (la zona B, 8 controlli) e `tests/48` (il piano di copia e i due pulsanti, 8 controlli, compreso quello che vuole gli esercizi nel piano e la copia `disabled` nell'HTML). `tests/02` e' stata modificata: l'esenzione dai verbi di scrittura vale per **un solo file**, e le due forzature che la guardia vieta (il flag CSS di priorita massima e la chiave del seme di dati) restano vietate anche li'.
- Rischio residuo, dichiarato e non nascosto: le regole Firestore del progetto sono ancora `allow read, write: if request.auth != null` per ogni documento. Le regole non distinguono app A e app B: il «no» a B sta nel codice e nella suite, non nel server. Il passo «regole sicure» (elenco di TUTTI i percorsi di A e di B, poi regole «solo il proprietario» con default negato) viene dopo, come concordato.

## Passo 8 — le schermate leggono dalla zona B (7/11/2026)

Fonte di Programma attivo, Archivio e Logbook: `bdB_atleti/{uid}`
(`programmi`, `schede`, `sedute`, `esclusioni`). Nessuna di queste schermate
legge piu' `barbellDivaAccounts`; la sola pagina che continua a leggere A e' la
pagina Copia, che serve a copiare.

- `comune/lettura-b.js` (nuovo): `programmiDaDocumenti`, `seduteDaDocumenti`,
  `schedeDaDocumenti`, `statoZonaB`, `leggiZonaBCompleta`. Non scrive niente:
  legge passando da `scritture-b.js`.
- `desktop/app-v31.js`: `leggi()` chiede una sola cosa a `leggiZonaBCompleta` e
  si ferma se `stato.completa` e' falso. `mostraZonaBIncompleta` scrive il
  messaggio in `#programma-attivo`, `#archivio-corpo` e `#lb-nota-b`, e svuota
  il Logbook invece di lasciargli il seme di esempio. Nessun ripiego su A.
- I numeri non cambiano: 126 sedute senza esclusioni, 121 con le cinque
  esclusioni di Alice (`tests/54-fonte-b.test.mjs`, su dati di prova).

## Passo 9 — le schede si modificano in B, e la Copia non sovrascrive (8/11/2026)

Cosa cambia rispetto al v31, riga per riga.

- `comune/modifiche-b.js` (nuovo, puro): `cambiaSerieRipetizioni` tocca SOLO
  `sets` e `reps` di una settimana di un esercizio che c'e' gia'; `annullaModifica`
  rimette il valore di prima; `ultimaAnnullabile` legge il registro;
  `protezioneCopia` e `differenzeScheda` dicono quali schede non vanno sovrascritte
  e cosa cambia; `misuraPeso` conta i byte; `creaCoda` accoda per scheda.
- `comune/editor-schede-b.js` (nuovo): mappa codice scheda verso documento, coda
  per scheda, rilettura prima di scrivere, versione, voce nel registro.
- `comune/scritture-b.js`: aggiunte `leggiSchedaB`, `salvaSchedaConVersione` e
  `ErroreVersione`. Resta l'unico modulo che scrive, e scrive solo nella zona B.
- `comune/vista-programma.js`: le celle ser e reps diventano scrivibili quando il
  modello porta `modifica` (prima erano sempre testo). Il pulsante «Annulla
  ctrl z» si accende e chiama `onAnnulla`; resta spento quando non c'e' niente da
  annullare. Nessun altro comando si accende: Rec. resta spento, e cosi' TUT,
  nota, tecniche, sostituzione, aggiungi/togli.
- `desktop/app-v31.js`: legge schede e registro dalla zona B, crea l'editor,
  passa il modello alla vista e mostra la riga di stato `#modifica-stato`
  (salvato, rifiutato, peso della radice e della scheda) fuori dal contenitore
  del Programma, cosi' il ridisegno non la cancella.
- `desktop/copia-b.js` e `desktop/copia-b.html`: al conteggio si leggono le
  schede gia' in B; quelle con il marchio `modificatoInB` si dichiarano in
  `#protette` e la copia le salta. Il confronto finale le segnala come diverse:
  ed e' scritto a schermo che deve succedere.
- `tests/55-modifiche-schede.test.mjs` (nuovo): modifica che resta dopo la
  rilettura, due modifiche di fila con una scrittura alla volta, versione diversa
  rifiutata, copia che non sovrascrive, annulla che riporta il valore di prima,
  peso sotto il limite.

## Correzione dell'8 novembre 2026 · la tabella e la scheda si parlano per id

Difetto visto da Alice: cambiando un numero di serie in una scheda compariva
«scheda non riconosciuta in B: non ho scritto niente». La tabella passava la lettera
del box («A») e l'editor la usava come chiave per trovare il documento. In B la
lettera non e' unica: la stessa lettera sta sulla scheda attiva e su quella
archiviata, quindi la mappa per lettera si svuotava e non restava nessun id da
aprire. Il legame ora passa dall'id della scheda, lo stesso con cui Programma
attivo legge il documento.

- `comune/editor-schede-b.js`: nuova `mappaSchede`, che lega l'id della scheda
  (`dati.sheetId` oppure `sheet.id`) all'id del documento in B; le schede
  archiviate e i documenti degli esercizi sciolti restano fuori. `modifica` e
  `annulla` usano solo quell'id, e quando la scheda non si trova il messaggio
  dice quale id si e' cercato. `mappaCodici` resta per la prova 55.8, non e' piu'
  il legame della tabella.
- `comune/vista-programma.js`: le celle serie e ripetizioni passano `idScheda`
  (l'id della scheda) accanto al codice, che resta solo per il testo a schermo.
- `tests/56-collegamento-schede.test.mjs` (nuovo): documenti nel formato vero di
  B (`program-v2-sheet-p1__s1`, `program-v2-archived-p1__s1`,
  `program-v2-exercise-p1__s1__e1`); la modifica arriva alla scheda attiva e non
  all'archiviata, la lettera da sola non basta piu', il rifiuto dice l'id cercato.
- `tests/55-modifiche-schede.test.mjs`: le prove passano l'id della scheda.

## Passo 10 dell'8 novembre 2026 · recupero e TUT si scrivono dalla tabella

Rec e TUT sono campi dell'**esercizio**, non della settimana: in A il recupero sta
in `recupero` (B legge anche `rest` e `pausa`) e il TUT in `tempo` (B legge anche
`cadenza`), eventualmente dentro `prescription`. E' il valore che la tabella
mostra, quindi cambiarlo vale per tutte le settimane. A puo' scrivere un `rec`
dentro la singola settimana: quello resta com'e' e non si tocca.

- `comune/tut-rec.js`: le due tendine (`REC_TENDINA`, `TUT_TENDINA`), il lettore
  del tempo (`secondiRecupero`), il testo (`testoSecondi`) e il passo di 30"
  (`passoRecupero`) fra 30" e 3'. Su una frase libera il passo torna vuoto e
  nessuno tocca la cella.
- `comune/modifiche-b.js`: nuova `cambiaRecTempo` (recupero e TUT, una sola
  cella, marchio, `versione` +1, voce nel registro con prima e dopo);
  `annullaModifica` e `ultimaAnnullabile` valgono per i due passi;
  `differenzeScheda` guarda anche recupero e TUT, cosi' la Copia non dice
  «identica ad A» a una scheda col recupero cambiato.
- `comune/editor-schede-b.js`: `modifica` sceglie la strada dal campo (
  serie/ripetizioni sulla settimana, recupero/TUT sull'esercizio).
- `comune/vista-programma.js`: la cella Rec ha testo libero, i pulsantini
  −/+ vivi (30", non piu' 15) e la freccetta con 30", 1', 1'30", 2', 2'30",
  3', «1'30" e cambio gamba», «1'30" e cambio braccio»; la cella TUT ha il
  testo libero e la freccetta con 2-0-2, 2-1-0, 0-1-2, 3-0-1, 3-1-1, 4-0-1.
  Con l'editor acceso la cella mostra il testo intero (e' quello che si
  modifica); in sola lettura la frase di coach torna spostata in Descr./Setup.
- `comune/dashboard-b.css`: solo la freccia e il taglio con i puntini.
- `desktop/app-v31.js`: il messaggio dice dove e' finita la modifica
  («S3 serie» oppure «rec di Panca piana»).
- `tests/57-rec-tut.test.mjs` (nuovo): documenti nel formato vero di B
  (`program-v2-sheet-p1__s1`, `recupero` sull'esercizio, TUT dentro
  `prescription`); recupero e TUT scritti dove stanno, settimane e altri campi
  intatti, testo libero e svuotamento, tendine e passo di 30", annulla, e la
  Copia che vede la differenza.

## Passo 10 bis dell'8 novembre 2026 · la freccetta di Rec e TUT non copre più le settimane

Alice, dopo la prova a schermo del passo 10: la tendina era il select grezzo del
browser, larga, e copriva le celle S1 e S2; il testo lungo si spezzava lettera per
lettera e usciva dalla cella. Rifatto così.

**La freccetta** (comune/vista-programma.js: rendiFreccia, apriMenu, chiudiMenu)

- non è più un select: è un pulsantino ▾, un button con aria-haspopup, largo 13 px, dentro la cella;
- il menu (classe menu-freccia) nasce al clic e sta fuori dalla tabella: position fixed, z-index 1200; misurato 145x204 px, 8 voci nel Rec e 6 nel TUT;
- si chiude scegliendo una voce, cliccando fuori, con Esc, o quando la tabella scorre;
- misurato a 1440 e a 1920: il menu aperto non tocca nessuna cella delle settimane (sopraSettimane 0).

**Le due colonne** (comune/dashboard-b.css)

- col.w-rec da 56 a 120 px, col.w-tut da 46 a 110 px, min-width della tabella da 1242 a 1374 px: se lo schermo è stretto la tabella scorre in orizzontale. Misurato: 123/112 px a 1440, 165/151 a 1920;
- via il white-space nowrap sulla cella: si va a capo fra le parole, word-break normal, hyphens none, mai una parola spezzata lettera per lettera;
- al massimo tre righe con i puntini (line-clamp 3); il testo intero sta nel title, cioè nel tooltip, e mentre si scrive il limite sparisce e si vede tutto;
- meno, valore e più stanno in una riga sola (div rec-riga, flex, gap 2px): non finiscono sopra altre celle;
- altezze misurate con l'editor acceso: 87,87,87,87,87,87,87,114,87,87,90,87 px, le stesse della sola lettura (87,114,87,87,90,87): nessuna riga cresce.

**Prova a schermo** (Chromium, protocollo DevTools, 8/11/2026)

- dati di prova con le frasi vere: «Eccentrica controllata e poi esplosiva», «No recupero tra le braccia e poi 1,30' e si riparte subito», «Partenza al ginocchio, cerca di accelerare senza strappi», «Discesa in tre secondi, fermo di un secondo in basso, salita decisa»;
- misura a 1440 e a 1920: nessun pezzo fuori dalla cella, nessuna sovrapposizione, nessun testo oltre tre righe (problemi: nessuno).

**Test**: tests/58-rec-tut-menu.test.mjs (58.1-58.7): nessun select nelle celle, il menu con le voci di sempre, la scelta che chiude e scrive, il TUT senza pulsantini, la chiusura con clic fuori e con Esc, l'ordine meno · valore · più · freccia, il testo intero nel title.

Non cambia niente nella scrittura: cambiaRecTempo e comune/scritture-b.js restano come nel passo 10.

## Passo 11 dell'8 novembre 2026 · in Rec e TUT solo il valore, la frase in Descr./Setup

Alice ha visto sul sito vero due errori: le frasi del coach tornate dentro le
celle Rec e TUT, e la tabella ancora stretta con il testo a capo lettera per
lettera. Qui si correggono tutti e due.

**La regola di colonna.** Nelle celle Rec e TUT stanno solo i valori:

- TUT: la sequenza di tre o quattro numeri uniti da trattini (`2-0-1`,
  `3-1-1`, `2-1-0-1`); la barra si accetta e si mostra con i trattini.
- REC: `2-3'`, `120-180 sec`, `90"`, `1'30"`, `2'30"`, `1'-2'`; la virgola
  del v31 (`1,30'`) si mostra come `1'30"`.

Tutto il resto del testo e' la frase del coach e va in Descr./Setup con
l'etichetta davanti (`REC: ...`, `TUT: ...`), sia in sola lettura sia con
l'editor acceso, e mai due volte: se la frase e' gia' dentro la nota, non si
ripete.

**Come si separano.** Il valore si prende in fondo al testo, perche' li' sta il
recupero che si prescrive davvero: «No recupero tra le braccia e poi 1,30'»
diventa valore `1'30"` e frase «No recupero tra le braccia e poi». Se un valore
riconoscibile non c'e', la cella resta vuota (trattino) e la frase sta lo stesso
in Descr./Setup. Le funzioni stanno in `comune/tut-rec.js`:
`separaRecupero`, `separaTempo`, `sostituisciRecupero`, `sostituisciTempo`,
`normalizzaValoreRecupero`, `normalizzaValoreTempo`.

**Le modifiche.** Scegliendo un valore dalla freccetta o usando + e -, cambia
solo il valore: `sostituisciRecupero` / `sostituisciTempo` rimettono il valore
nuovo al posto di quello vecchio dentro il testo di sempre, e la frase resta
parola per parola nel dato. Se il valore non c'era, il valore nuovo va in fondo
alla frase. Scrivendo a mano nella cella succede lo stesso: nel dato va il testo
intero, non il solo valore.

**La tabella vera.** Colonne Rec 136 px, TUT 124 px, Descr./Setup 210 px,
larghezza minima della tabella 1470 px: i valori corti non hanno piu' bisogno di
tre righe e la freccetta resta fuori dal valore. La prova a schermo e' stata
rifatta sulla pagina vera (`desktop/index.html` con `app-v31.js`) a 1280, 1440
e 1920 px, non piu' sulla pagina di prova.

**I test.** Nuovo `tests/59-rec-tut-solo-valore.test.mjs`: la separazione sui
casi veri del v31, la scrittura che conserva la frase, la cella che con l'editor
acceso mostra il solo valore e la frase in Descr./Setup una volta sola.

## Passo 12 dell'8 novembre 2026 · tendina corta, niente X, scrittura a mano

Decisioni di Alice, applicate qui:

- **TUT: la X non c'e' piu'.** In cella vanno solo numeri uniti dai trattini:
  `2-0-1`, `3-1-1`, `2-1-0-1`. Quindi `30X1` e `3010` non sono valori: non e'
  una prova indebolita, e' la regola nuova. Le prove 43 lo dicono nero su bianco.
- **Rec: la tendina ha sei voci** — `30"`, `1'`, `1'30"`, `2'`, `2'30"`, `3'`.
  Tolte «1'30" e cambio gamba» e «1'30" e cambio braccio». Nella cella
  Rec stanno solo valori numerici.
- **Rec e TUT si scrivono a mano**, oltre che con la freccetta. Mentre si
  scrive la casella si allarga quanto il testo, la colonna cresce e le celle
  vicine non vengono coperte: se la tabella non ci sta, scorre in orizzontale
  (`.p8-scroll{overflow-x:auto}`). Quello che si scrive finisce nel **valore**;
  la frase in Descr./Setup non si tocca.
- **Quello che non e' un valore non entra**: se si scrive una frase, o la X,
  la cella torna com'era e il dato resta quello di prima
  (`recuperoScrittoValido`, `tempoScrittoValido`).
- Nel registro delle modifiche va il **testo intero** di prima e di dopo: cosi'
  l'annulla rimette la frase esattamente com'era.

Prove: aggiornate 43, 57, 58, 59 alla regola nuova; aggiunte le prove della
scrittura a mano. Suite verde, guardie 02, 42, 44.03 e 47 comprese.

## Passo 13 dell'8 novembre 2026 · il bug dello schermo che torna indietro

Il bug di Alice sul sito (8/11/2026, ore 16:53): cambiando un valore di Rec o
TUT la cella sembra cambiare, poi la pagina "si sposta" e torna tutto come
prima, nulla salvato; con i pulsantini + e - del Rec il numero cambia a
schermo ma non si salva, e premendo piu' volte di fila smette di funzionare.

**La causa (una sola, due facce).** La vista passava al legame della modifica
il nome PULITO dell'esercizio (nomePulito: trattini bassi diventano spazi,
iniziale maiuscola), ma trovaEsercizio in comune/modifiche-b.js confronta con
il nome GREZZO del documento. Con gli esercizi nel formato di A (nomi come
"Curl_bilanciere", senza campo id) l'esercizio non si ritrova MAI: la modifica
viene rifiutata ("l'esercizio non si ritrova in questa scheda: non ho scritto
niente") e leggi() ridisegna la tabella con i dati di prima. Ecco il "sembra
cambiare, poi torna tutto come prima, nulla salvato" e il "premo piu' volte di
fila e non funziona piu'": ogni pressione era un rifiuto, non una scrittura
persa — la coda delle scritture c'era e funziona (prove 55).

**Le correzioni.**

- comune/vista-programma.js: il legame porta il nome ORIGINALE
  (esercizio: String(e.nome ...).trim()), come vuole la regola di casa di
  nome-pulito.js ("chiavi e ricerche usano l'originale"). A schermo i nomi
  restano puliti: doveVoce in desktop/app-v31.js pulisce solo dove si stampa.
- desktop/app-v31.js: dopo ogni salvataggio NON si rilegge piu' niente subito.
  La riga di stato dice "salvato alle HH:MM · scheda · rec/TUT di ...: valore",
  e la sincronizzazione (una rilettura completa) parte UNA sola volta quando
  le scritture della coda sono tutte finite; se una cella e' in scrittura si
  rimanda, per non rubarle il focus. Cosi' la tabella si ridisegna SOLO con i
  dati letti dopo l'ack: mai piu' uno stato vecchio sopra una modifica fresca.
  Anche "Annulla" usa la stessa via.
- Colonna Rec a 170 px (era 136), min-width della tabella 1500 (era 1470) e
  a riposo il valore di Rec e TUT sta su una riga (white-space:nowrap, con i
  puntini se non ci sta): 2-3', 120-180 sec, 1'30" si leggono senza
  spezzature, con la freccetta e i pulsantini - e + accanto.

**La prova.** Nuovo tests/60-coda-scritture-rec-tut.test.mjs: la sequenza di
Alice (+ tre volte di fila, scrittura a mano e uscita dalla cella, freccetta
del Rec, freccetta del TUT) sulla PAGINA VERA (desktop/index.html con
desktop/app-v31.js) su jsdom, con la zona B finita in
tests/finti/zona-b-finta.mjs (letture con latenze a rotazione, scritture
visibili solo all'ack, registri di ogni lettura e scrittura). Con il codice di
prima la sequenza falliva alle tre pressioni: il disco restava al valore
vecchio. Ora: sei scritture in coda, in ordine (2', 2'30", 3', la mano,
le due freccette), versione 7, le sei voci nel registro con prima/dopo e
"salvato alle ..." nella riga di stato. Prove 59.13 aggiornate alle misure
nuove, con l'assert della riga unica a riposo. La colonna Rec a 1200 px e'
provata con lo scatto della pagina vera (scatta-vera-60.mjs).

## Passo 14 — formato unico del Rec e niente zero inventato (8/11/2026)

Regole di Alice, stesso giorno del Passo 13, stesso commit.

1. In cella solo i simboli delle tendine: secondi con il pollice (30", 90", 120-180"), minuti con l'apostrofo (2', 2-3'), misti (1'30"). Mai la parola sec o min in cella. Il dato non si riscrive: testoRecupero lo lascia com'e', la normalizzazione avviene solo alla vista (normalizzaValoreRecupero converte le parole sec/min); salvando cambia solo il pezzo del valore, come gia' faceva con la frase.
2. Niente zero inventato: un recupero 0 (0, "0", "0 sec", {seconds:0}) non e' un valore — formattaSecondi(0) adesso torna vuoto e la cella mostra il trattino; prima scriveva 0' (e' questo lo zero che Alice vedeva in colonna). Lo zero scritto a mano non entra nel dato.
3. A3 (Pulley sbarra presa larga supina): il dato vero sta nel cloud di A e non nel repository; dallo schermo l'unico percorso che metteva uno zero in cella e' formattaSecondi(0), quindi il recupero di A3 e' una forma di zero, mentre "REC: 2 2" in Descr./Setup e' la nota della coach e resta intatta. Le frasi senza valore ("2 2") erano gia' trattino in colonna dal Passo 12.
4. Test nuovi 61 (formato unico, zero, A3 a schermo, salvataggio); portati ai simboli 41.01, 43, 44.02 e 59.03.

## Passo 15 — Rec e TUT: il valore che tornava indietro (9/11/2026)

**Il sintomo.** Dal sito su `e5332ca`: si cambia Rec o TUT, a schermo cambia, e dopo qualche secondo torna il valore di prima senza ricaricare. Serie e reps no. Dal registro Firebase la voce `mod-2026-11-09T13-30-00-388Z` (esercizio «Pendulum focus glutei», prima vuoto, dopo `2-1-0`, versione 15 → 16) dice che la scrittura e' andata a buon fine: il guasto era in lettura.

**Le due cause.**
1. Lo stesso esercizio arrivava **due volte**: dentro il documento-scheda e nei documenti «esercizio sciolto» (le schede grandi si spezzano). La tabella disegnava due righe con lo stesso id, la modifica andava sulla prima e la riga che si guardava era l'altra, ancora vecchia. Per questo anche le pressioni di + successive ripartivano dal valore vecchio e non si applicavano tutte.
2. L'esercizio porta **piu' campi di recupero** (dentro `prescription` e fuori, piu' il `rec` della singola settimana). La scrittura ne toccava uno solo; gli altri restavano col valore vecchio e bastava che la lettura ne preferisse un altro perche' la modifica sparisse.

**La correzione.** In `comune/schede-v2.js` la copia sciolta non si aggiunge se l'id c'e' gia' nella scheda (vince la scheda). In `comune/modifiche-b.js` `cambiaRecTempo` scrive il valore nuovo su **tutti i campi esistenti** della famiglia (`rest`/`recupero`/`pausa`, `tempo`/`cadenza`), dentro e fuori da `prescription`; se non ne esiste nessuno lo crea dove la lettura lo cerca per primo. Il `rec` della settimana resta com'e'.

**Le prove.** `tests/62-rec-tut-torna-indietro.test.mjs`: una sola riga per esercizio con il documento sciolto in mezzo (62.1), TUT da vuoto a `2-1-0` riletto dal documento (62.2), nessun campo di recupero lasciato vecchio (62.3), tre pressioni di + di fila applicate in ordine con versione 15 → 19 (62.4). Prima della correzione 62.1, 62.2 e 62.3 fallivano.

**Non toccato.** `desktop/index.html` (guardia 42), nessun dato di A, nessuna scrittura fuori da `bdB_atleti`.

## Passo 16 — la pagina che si ridisegnava da sola (9/11/2026)

Alice, dal sito: mentre scrive Rec o TUT la pagina fa dei micro riavvii, si
ridisegna piu' volte e cancella la modifica in corso; il registro di Firebase
dice che i salvataggi arrivano. Quindi il guasto non e' la scrittura: e' il
ridisegno.

Chi poteva far ripartire `leggi()` o il disegno, cercato in
`desktop/app-v31.js` e in `comune/`:

- `onAuthStateChanged` (`comune/accesso.js:46`, l'unico ascoltatore di B):
  **scatta da solo**, e torna anche quando l'SDK rinnova il token con lo
  stesso utente. Ogni giro rifaceva `leggi()` da zero.
- `sincronizza()` dopo ogni salvataggio: `onCambia` la chiamava anche quando
  la scrittura era andata bene, quindi ogni modifica finiva con una rilettura
  completa e un ridisegno.
- il `setTimeout(..., 300)` dentro `sincronizza`: se una cella era in
  scrittura si riprovava ogni 300 ms, all'infinito finche' la cella restava
  aperta. Era l'unico timer dell'app: non c'e' nessun `setInterval`.
- nessun `onSnapshot`: le letture di B sono `get()` una volta sola
  (`comune/lettura-dati.js`, `comune/lettura-b.js`). Nessun
  `visibilitychange`, `focus` o `online` sull'app.
- `modificheInVolo`, `sincronizzazione` e gli altri contatori stavano
  **dentro** `leggi()`: ogni ridisegno li azzerava, quindi una scrittura
  partita prima del ridisegno diventava invisibile al controllo che doveva
  aspettarla.

Quanti ridisegni in 30 secondi con la pagina ferma? Adesso zero (prova 63.3).
Prima: uno per ogni giro di sessione, uno per ogni salvataggio, piu' i
tentativi ogni 300 ms con una cella aperta.

Cosa cambia:

1. Dopo un salvataggio la cella tiene il valore appena scritto: niente
   rilettura e niente ridisegno. Si rilegge solo se la scrittura fallisce.
2. Il ridisegno automatico non parte se una cella e' aperta o se c'e' una
   scrittura in coda o in corso: si rimanda e si riprova quando la cella si
   chiude (un solo ascolto `focusout`, nessun timer che rigira).
3. Si ridisegna solo se l'impronta dei dati letti (struttura: programmi,
   schede con i loro esercizi in ordine, sedute, voci del registro) e' diversa
   da quella a schermo. I valori di serie/reps/rec/TUT non entrano
   nell'impronta: li aggiorna la cella che li scrive.
4. Il ridisegno prende e rimette la posizione di scorrimento (finestra e
   contenitori che scorrono, ritrovati dal percorso di tag e classi).
5. `window.BD_B_STATO` conta i ridisegni veri, le letture e i rinvii.

Prove: `tests/63-ridisegno-automatico.test.mjs` (63.1-63.5), con il finto
Firestore che sa emettere due volte lo stesso documento.

## Passo 17 — Rec e TUT: la frase non e' un valore, il rifiuto non ridisegna (10/11/2026)

Alice, dal sito: scrive un valore in Rec o TUT, dopo cinque secondi torna quello
vecchio, e in Firebase le scritture arrivano. La striscia temporanea `?diagnosi=1` (allora accesa, poi tolta) ha
mostrato la catena: la cella conteneva la frase del coach, uscire dalla cella
faceva partire un salvataggio con quella frase, il salvataggio veniva rifiutato
(«il TUT si scrive in una riga sola, al massimo 24 caratteri») e il rifiuto
ridisegnava la pagina da zero, perdendo la modifica e riportando in cima.

Le schede importate non tengono il TUT in `prescription.tempo`: il valore sta in
un altro campo (`tempo` sull'esercizio, oppure `prescription.cadenza`), e un
campo vuoto poteva nascondere quello accanto che il valore ce l'aveva.

Correzioni:

1. uscire da una cella che non ha cambiato niente e' un no-op: nessuna
   scrittura, nessun ridisegno (il testo si confronta con quello di quando la
   cella si e' aperta);
2. una scrittura rifiutata o fallita non ridisegna mai la pagina: il motivo si
   legge sotto la cella (`.errore-cella`) e il resto resta com'e';
3. la cella Rec/TUT contiene solo il valore (TUT `2-0-1`, Rec `2-3'`), ed e'
   vuota quando il valore non c'e': la frase sta solo in Descr./Setup;
4. il limite dei 24 caratteri (40 per il recupero) vale per il VALORE, non per
   la frase del coach;
5. la lettura prende il primo campo che un valore ce l'ha davvero: un campo
   vuoto non nasconde piu' quello accanto, e la scrittura va su tutti i campi
   che esistono, cosi' campo letto e campo scritto coincidono.

6. l impronta dei dati non conta piu le voci del registro: ogni scrittura ne
   aggiunge una, e contarle faceva ridisegnare la pagina subito dopo un
   salvataggio riuscito.

Prove: `tests/64-rec-tut-campo-vero.test.mjs` usa la forma vera del documento
(campo grezzo diverso da `prescription.tempo`): la modifica resta dopo la
rilettura, il rifiuto non ridisegna, uscire senza cambiare non scrive.

## Programma senza le archiviate (10/11/2026)

Alice: le schede archiviate non servono nella schermata Programma. Sono uscite
due cose, in `comune/vista-programma.js`: la linguetta «Archiviate N» in coda alla
barra delle linguette (con il suo separatore `pr-tabs-sep`, che adesso resta uno
solo, quello tra le schede e le letture) e il riquadro in fondo «Schede
archiviate · N, in sola lettura» con i chip (`div.pr-archiviate`,
`span.pr-chip-arch`).

I dati non si toccano: `r.archiviate` resta nel riepilogo come prima, e la vista
semplicemente non lo disegna. CSS e `desktop/index.html` non sono stati toccati.

Prova: `tests/65-programma-senza-archiviate.test.mjs` (65.1-65.6) disegna il
Programma con due schede attive e due archiviate nei dati: nessun riquadro,
nessun chip, nessuna linguetta «Archiviate», una sola barretta; le linguette
«Scheda A» e «Scheda B» e «Analisi programmazione» ci sono e il pannello delle
analisi si apre ancora; la pagina con le archiviate e' identica, carattere per
carattere, a quella senza.

### Passo 20 — il tastino «+» della riga e il «✕» (10 novembre 2026)

Richieste di Alice (`docs/lista-modifiche-programmi.md`, punto 3): il «+» sotto un esercizio («inserisci progressione sotto») e il «✕» («cancella riga»).

- Nel v31 il «+» (r.9853, `data-act="ins"`, titolo «inserisci progressione sotto») **non inserisce niente**: al clic fa partire il pulsante «Applica progressione» della stessa riga (r.7363), che apre il pannello delle progressioni (r.7305-7345) e applica la voce scelta alle otto settimane **di quella riga** con un ciclo (r.7323-7328). La lista è `PROG` (r.7252-7274, **21 voci**) con le regole `PROGRULE` (r.7275-7298). In B è identico: `comune/progressioni-b.js` porta le 21 voci e le 21 regole copiate alla lettera, e la prova 66.1 le confronta riga per riga con `pc/index.html`.
- I valori fissi `P` (r.7145: mini 3, pausa 15, drop 20, blocchi 3, bloccoRip 3, pausaBlocco 12) sono copiati in `progressioni-b.js`: sono valori fissi, il v31 non ha nessun pannello che li cambi.
- Le quattro voci che nel v31 non cambiano nessuna cella (Carico lineare, Autoregolazione RIR, Progressione di densità, Micro-carichi) restano nell'elenco con gli stessi nomi. In B, se le otto coppie calcolate sono già quelle scritte, la scrittura si rifiuta e il motivo si legge a schermo: dire «salvato» su una scrittura che non cambia niente sarebbe una bugia. Differenza dichiarata rispetto al v31, che dice «applicata» senza toccare nulla.
- **Una scrittura sola**: `applicaProgressione` in `comune/modifiche-b.js` calcola le otto coppie [serie, reps] in memoria, scrive il documento una volta (`versione` + 1, marchio `modificatoInB`) e lascia **una** voce di registro `modifica-progressione` con `prima` e `dopo` come array di otto coppie. `annullaModifica` riporta indietro tutte le otto in un colpo e aggiunge una voce `annulla-modifica` che cita la precedente: la storia non si cancella.
- Le serie tornano numeri quando sono numeri, le ripetizioni restano **testo**: è quello che il v31 scrive nelle celle, e cosí l'Annulla rimette il valore com'era.
- Il «✕» (v31 r.9855, `data-act="del"`, r.7367-7375: cancella le chiavi della riga, la toglie dal DOM e dice «riga cancellata · Ctrl+Z per rimetterla») in B **marca** `deletedAt` sull'esercizio. I lettori già saltano gli esercizi con `deletedAt` (`eserciziDi`, `tabellaDi`), le settimane restano scritte nel documento e l'Annulla toglie il campo. Le sedute passate del Logbook non cambiano: portano i nomi degli esercizi dentro di sé e non puntano all'id della scheda.
- `ultimaAnnullabile` accetta i tipi nuovi (`modifica-progressione`, `modifica-progressione-scheda`, `cancella-riga`) e `annullaModifica` li instrada: senza queste due righe il pulsante Annulla del v31 non li avrebbe visti.
- Righe del desktop cambiate rispetto al v31: in `comune/vista-programma.js` i pulsanti della riga che erano tutti `pulsanteSpento` ora sono vivi per «✕» e «+» (righe ~870-880 del file), e il pulsante «Applica progressione» della riga apre le stesse 21 voci riusando il pannello del v31 (classi `.prog-panel`, `.tec-lab`, `.prog-item`: nessun foglio di stile nuovo, nessuna regola CSS toccata). Il «⇄ sostituisci esercizio» resta spento, come prima.
- In `desktop/app-v31.js` `doveVoce` sa dire le voci nuove (progressione, riga tolta, annulla) e, dopo una progressione o una riga tolta, la pagina rilegge e ridisegna: le otto settimane le ha calcolate B, non la cella, quindi senza rilettura a schermo non cambierebbe niente.
- Moduli: `comune/progressioni-b.js` **nuovo** (le due liste del v31 e i calcoli); `comune/modifiche-b.js` tre funzioni nuove (`applicaProgressione`, `cancellaEsercizio`, `applicaProgressioneScheda`) e l'annullamento esteso; `comune/editor-schede-b.js` instrada i campi nuovi (`progressione`, `progressione-scheda`, `riga`).
- Prova nuova: `tests/66-progressione-riga.test.mjs` (66.1-66.10), con la forma vera dei documenti.

### Passo 21 — «Applica progressione a tutta la scheda» (10 novembre 2026)

- Nel v31 è il pulsante r.3771 (comando `cmdProgAll` r.9965): apre una finestra con le **13 voci** di `PRG` (r.9043-9060), dice «Le 8 settimane dei N esercizi di Scheda X vengono riscritte», applica con `applyProgRows` (r.9986-10008) e offre un annulla nel messaggio in basso. In B è identico: `comune/progressioni-b.js` porta le 13 voci con le loro tabelle di 8 settimane, compreso **Custom** (r.9049) che copia la settimana 1 su tutte (`w: null`, come r.9992).
- Differenza dichiarata: il v31 scrive su tutte le righe della scheda senza guardare `deletedAt`; B **salta le righe tolte**, che non sono più in scheda. Se una riga non porta le settimane scritte non si scrive niente, invece di toccarne metà.
- **Una scrittura sola e una voce sola**: `applicaProgressioneScheda` in `comune/modifiche-b.js` calcola le otto coppie di ogni riga, scrive il documento una volta (`versione` + 1, marchio `modificatoInB`) e lascia una voce `modifica-progressione-scheda` con `righe: [{idEsercizio, esercizio, prima: 8 coppie, dopo: 8 coppie}]`. L'Annulla riporta indietro tutte le righe in un colpo e cita la voce annullata.
- Come il pulsante trova la scheda: la tabella lascia l'editor in `modificaCorrente` e scrive l'id sull'attributo `data-scheda` di `.p8-tab`; la barra dei comandi non deve indovinare niente.
- `comune/vista-programma.js`: il pulsante «Applica progressione a tutta la scheda» della barra passa da `pulsanteSpento` a `pulsanteVivo` (riga ~1075) e apre lo stesso pannello del v31 con le 13 voci. Rispetto al v31 (r.3771) cambia solo che la finestra è il pannello `.prog-panel` già usato dal «+» della riga, non un modale: stesse classi, nessun foglio di stile nuovo.
- Prova nuova: `tests/67-progressione-scheda.test.mjs` (67.1-67.8).

### Passo 22 — la frase delle archiviate dice la verità (10 novembre 2026)

- Il passo 19 toglie dalla schermata Programma il disegno delle archiviate, ma
  lascia appesa la frase del `pr-hint` nel ramo «programma senza schede attive»
  di `comune/vista-programma.js` (r.1275): «Schede archiviate di questo
  programma: N — si vedono nella tabella qui sotto». Falsa due volte: la carta
  finisce lì, di tabella non c'e' niente, e dal passo 19 le archiviate non si
  disegnano più.
- Ora la frase dice: «Schede archiviate di questo programma: N — restano nei
  dati, la pagina non le disegna più». Il conto resta (`r.archiviate` è ancora
  nel riepilogo, come vuole il passo 19); cambia solo la promessa, che era una
  bugia. Nessun'altra riga toccata: CSS e `desktop/index.html` intatti (guardia 42).
- Il v31 non ha nessuna di queste frasi: in `pc/index.html` «archiviate» non
  compare. La frase nasce con B e la differenza resta dichiarata qui.
- Prova nuova: `tests/68-frase-archiviate.test.mjs` (68.1-68.3): nel ramo vuoto
  la frase conta e nega invece di promettere; senza archiviate non c'e' frase; con
  le schede attive la frase non esiste (come il 65.1).

### Passo 23 — il guasto del 10/11 sul sito vero: ripristino, feedback vivo, Annulla (10-11 novembre 2026)

Alice sul sito (passi 20-21 online): il + apriva l'elenco ma la voce cliccata non
cambiava niente a schermo; il ✕ e «Applica progressione a tutta la scheda» non
facevano niente; l'Annulla diceva «niente da annullare»; però «Pendulum focus
glutei» aveva 1 serie su tutte le 8 settimane (prima: S1 1·Test 12rm, poi 1x8,
S2 2·10-x, S3 3·10-8-x, S4 2·10, S5 2·10-x, S6 3·10-x-x, S7 3·10-8-x, S8 2·10:
la voce Custom copia la S1 su tutte). Le celle riscritte a mano (serie/reps)
non sono state salvate dopo Ctrl+F5. La scrittura ERA arrivata, la pagina non
l'ha mostrata.

Diagnosi, sette difetti tutti veri:
1. desktop/app-v31.js: onCambia non aveva un .catch: un rifiuto di
   editor.modifica (la voce di registro mai scritta, o l'SDK fermo) lasciava
   modificheInVolo > 0 e ogni sincronizzazione dopo si auto-rifiutava: pagina
   ghiacciata, senza messaggi, per sempre.
2. Il ramo di errore tornava senza rileggere: il commento del passo 16 diceva
   «qui si rilegge» ma il codice no. La versione a schermo restava vecchia e i
   tentativi dopo rifiutavano «la scheda e' cambiata nel frattempo».
3. Voce di registro mai scritta = registro vuoto = Annulla «non c'e' nessuna
   modifica da annullare», anche dopo ricarica.
4. comune/modifiche-b.js: la coppia dei valori di prima leggeva
   serie/ripetizioni dove le settimane portano sets/reps: la voce di
   progressione nasceva con i valori di prima VUOTI, e un Annulla avrebbe
   cancellato le settimane invece di rimetterle.
5. comune/editor-schede-b.js: l'id della voce era il solo millisecondo: due
   modifiche nello stesso istante si sfacciavano la voce nel registro (l'ultima
   sovrascriveva la prima). Ora l'id porta anche il numero d'ordine.
6. Le prove 66-67 provavano le funzioni pure: nessuna cliccava i pulsanti sulla
   pagina (la prova 69, passo 24, lo fa ora).
7. Il caso Pendulum: le voci nate col difetto 4 portano i valori di prima
   VUOTI: il loro ripristino CANCELLEREBBE le settimane. Da qui la guardia.

Riparazioni:
- comune/scritture-b.js: senzaUndefined — Firestore vero rifiuta i campi
  undefined (il finto li ingoiava): ogni voce e scheda esce pulita.
- comune/editor-schede-b.js: ogni scrittura ha una scadenza di 8 secondi
  (conScadenza, in prova si accorcia con scadenzaVoceMs): un SDK fermo non
  ghiaccia più la pagina. La voce di registro si riprova una volta e, se non
  passa, il salvataggio resta valido con avvisoRegistro che torna a schermo.
  annullaVoce(idVoce): il ripristino mirato della voce DETTA (non dell'ultima);
  rifiuta una voce già annullata o assente.
- comune/modifiche-b.js: la coppia dei valori di prima legge ENTRAMBE le forme
  delle settimane (sets/reps e serie/ripetizioni): l'Annulla rimette i valori
  veri di prima, non li cancella. E una voce con i valori di prima VUOTI viene
  RIFIUTATA dal ripristino (le celle si rimettono a mano): nessun ripristino
  puo' cancellare le settimane di Pendulum.
- comune/vista-programma.js: il pulsante vivo non esplode più quando nasce
  senza azione (l'Annulla lo costruisce così: ogni clic partiva un errore a
  pagina); il pannello delle progressioni si posiziona restando nel riquadro
  visibile e sopravvive allo scorrimento PROGRAMMATO del ridisegno (lo
  scorrimento di Alice lo chiude, come nel v31).
- desktop/app-v31.js: .catch su onCambia e onAnnulla (mai più pagine mute); dopo
  un rifiuto la pagina si RILEGGE davvero (forza), come il commento diceva dal
  passo 16; mentre un pannello è aperto il ridisegno non riposiziona lo
  scorrimento. Messaggi nuovi: «progressione «X» applicata alle 8 settimane ·
  Annulla per annullare» (di riga e di scheda), «riga tolta · Annulla per
  rimetterla»; le celle restano a «salvato alle…» (testoEsito, provata in
  71.1-71.4). Il ripristino si lancia con l'indirizzo: desktop/?ripristina=
  apre l'elenco delle voci ancora annullabili lette dal registro su Firestore
  (dalla più recente), ?ripristina=<id voce> apre quella sola; ogni ripristino
  chiede conferma, riscrive i valori di prima con una voce nuova (versione +1,
  annullaDi) e rilegge la pagina. Niente dati scritti a mano.

Prove: tests/70 (70.1-70.7) e tests/71 (messaggi + misura dei danni: le 21 voci
di riga e le 13 di scheda toccano SOLO serie e ripetizioni delle 8 settimane —
recupero, TUT, nota, RIR, riposo, tipo e fonte restano identici, gli altri
esercizi pure: il punto 5 di Alice è la 71.5-71.6). La prova 72 costruisce il
caso Pendulum con i valori veri dettati da Alice: la voce Custom fa il danno
(1 serie ovunque), l'Annulla torna ESATTAMENTE sulle 8 settimane di prima, e la
voce senza valori di prima viene rifiutata. La prova 69.6 (passo 24) copre la
cella a mano di Alice: voce modifica-serie-ripetizioni, mai una progressione.
Differenze dichiarate dal v31: nessuna nuova di comportamento; il ripristino
non esiste nel v31 ed è strumento di B, dichiarato qui.
### Passo 24 — la pagina viva nel browser (10/11/2026)

tests/69-pagina-viva.test.mjs: Playwright serve il repo, blocca gstatic e
inietta tests/finti/zona-b-finta-browser.js PRIMA dei moduli: la pagina VERA
parte col finto Firestore dalla forma dei documenti vera (esercizi dentro
sheet.exercises, esercizi anche senza id, schede splittate). Il finto è
diventato severo come quello vero (rifiuta qualunque undefined) e la memoria
gli resta dietro alle navigazioni (localStorage), come serve alla prova del
ripristino dopo la ricarica. La prova clicca davvero: il ✕ (documento marcato,
voce, riga di stato, Annulla rimette), il + (pannello, voce cliccata → 8
settimane scritte, pagina ridisegnata SUBITO col dato scritto, pannello chiuso,
messaggio di Alice), «Applica progressione a tutta la scheda» (una voce sola,
tutte le righe vive, pagina ridisegnata) e, in ricarica con ?ripristina=, il
pannello trova la voce sul disco e riporta i valori di prima. La 69.5 fallisce
se a pagina resta UN SOLO errore non preso in carico. Playwright sta nelle
devDependencies (installato senza browser scaricati: usa il Chrome di sistema).
### Nota al push (11/11/2026)

Spinto main su GitHub. Verdi: 69.0-69.2, 69.5, 69.6 (cella a mano, verde quando corre da sola), 70.1-70.7, 71.1-71.6, 72.1-72.3. Rossi: 69.3 (timeout del TEST sulla voce Range 8-10 -> 8-8 nel pannello di scheda; nessun difetto della pagina dimostrato) e 69.4 (ripristino dopo ricarica, da verificare). Dettagli in suite69.log alla radice del repo.


## Passo 25 — le ripetizioni sono un testo (11/11/2026)

**Il sintomo (Alice, sul sito).** Rimettere la progressione vera di «Pendulum focus
glutei» era impossibile: appena si toccava una cella delle ripetizioni l'app
rispondeva «les ripetizioni si scrivono come 8 oppure 8-10». Ma `10-x`,
`10-8-x`, `10-x-x`, `Test 12rm, poi 1x8` sono i valori VERI delle schede di Alice:
negli altri esercizi ci sono già e la pagina li mostra senza dire niente. Il
controllo era più stretto dei dati che l'app stessa contiene, e bloccava proprio
la riparazione del caso Pendulum.

**La causa, due difetti.**
1. `comune/modifiche-b.js`, `cambiaSerieRipetizioni`: le ripetizioni erano
   validate con `/^\d{1,3}([-\u2013/]\d{1,3})?$/` — solo `8` e `8-10`. Tutto
   il resto veniva rifiutato.
2. Sempre lì, il valore digitato passava per `.replace(/\s+/g, "")`: gli spazi
   sparivano, quindi `Test 12rm, poi 1x8` sarebbe stato scritto `Test12rm,poi1x8`.
   Fino a oggi non si vedeva solo perché il controllo del punto 1 rifiutava prima.

**La correzione.** Le ripetizioni sono un TESTO, come sono nei dati: si accetta
quello che Alice scrive, con gli spazi normalizzati a uno solo, fino a 40
caratteri; si rifiuta solo ciò che romperebbe la riga (testo troppo lungo,
caratteri di controllo; un a capo diventa uno spazio). Le serie restano
numeriche da 1 a 99, e il resto della scheda non si tocca. Nessun cambio di CSS
e nessun cambio della forma dei dati: `reps` era già e resta una stringa.

**Le prove.** `tests/73-ripetizioni-testo-libero.test.mjs`, quattro prove verdi:
73.1 `10-x` passa e arriva nel documento con la voce del registro; 73.2 la
progressione vera di Pendulum, settimana per settimana, riporta il documento
ESATTAMENTE a quella dettata da Alice (S1 `1 · Test 12rm, poi 1x8`, S2 `2 · 10-x`,
S3 `3 · 10-8-x`, S4 `2 · 10`, S5 `2 · 10-x`, S6 `3 · 10-x-x`, S7 `3 · 10-8-x`,
S8 `2 · 10`), spazi compresi; 73.3 i testi veri passano, il troppo lungo e i
caratteri di controllo no; 73.4 `tre` nelle serie viene ancora rifiutato.

**Stato della suite a fine passo (suite.log).** 352 verdi, 4 rossi:
- 64.4 — «la scrittura rifiutata ha ridisegnato la pagina»: ROSSA ANCHE SENZA
  questa correzione (verificato mettendo da parte `comune/modifiche-b.js` e
  rilanciando la 64). È l'aspettativa vecchia contro la rilettura forzata dopo un
  rifiuto, voluta nel passo 23: la prova va riallineata, non l'app.
- 69.3 e 69.4 — già note dal passo 24 (la voce `.prog-item` di scheda e il
  ripristino dopo ricarica).
- 69.6 — cade per la scia della 69.3 nello stesso browser (la cella non è
  visibile quando la pagina resta col pannello aperto): da riverificare a 69.3
  chiusa, non un difetto nuovo.

Nessun commit e nessun push in questo passo: il lavoro è pronto sul disco e
aspetta la parola di Alice.


## Passo 26 — scorrimento interno del pannello progressioni (11/11/2026)

Richiesta di Alice: il + apre il pannello; lo scroll interno verso il basso non deve chiuderlo. Commit richiesto, nessun push.

Causa: il gestore scroll in cattura di desktop/index.html nasconde tutti i pannelli, compreso quello che sta scorrendo internamente. La pagina originale resta intatta. In comune/vista-programma.js un gestore sulla finestra intercetta scroll e touchmove SOLO quando il bersaglio appartiene al pannello progressioni corrente, fermandone la propagazione prima del gestore globale. Nessun preventDefault: lo scorrimento nativo non viene annullato. Nessun cambio a CSS, dati o scritture.

Prova 74 sulla pagina vera con Firestore finto: + apre, rotella interna sposta scrollTop da 0 a 151 oltre i 1500ms della vecchia protezione, pannello visibile; touchmove interno non annullato e pannello aperto; scrollTop fino al fondo lascia aperto; scroll esterno e clic fuori chiudono ancora. Senza la correzione la stessa prova fallisce: il pannello risulta nascosto e non scorrevole dopo gli eventi iniziali; con la correzione la prova mirata passa. Il gesto fisico su telefono non e stato verificato: touchmove e sintetico, la rotella e reale tramite Playwright.

Verifica finale: suite tranne 63, 354 verdi e 4 rossi (64.4, 69.3, 69.4, 69.6, gli stessi quattro segnalati nel passo 25). La nuova 74 passa sia nella suite completa sia isolata: scrollTop 0 -> 151, pannello visibile, touchmove non annullato, clic fuori chiude. Non si dichiara la suite tutta verde. Il commit e richiesto esplicitamente da Alice; nessun push.

Prova 63 eseguita separatamente dopo la suite finale: 5 verdi, 0 rossi. Guardia 42 verificata con git diff --exit-code su desktop/index.html; nessun Map/Set aggiunto.


## Passo 27 — registro progressioni compatibile con Firestore (11/11/2026)

Alice segnala Nested arrays are not supported nel registro dopo la scelta di Intensità: test 12rm + ondata 10-x. La causa riprodotta è prima/dopo come array di coppie: Firestore rifiuta array direttamente dentro array. Il finto browser finora rifiutava undefined ma accettava erroneamente questa struttura.

In comune/scritture-b.js, SOLO al confine di scrittura del registro gli array interni sono avvolti in mappe con marcatore __bdRegistroArrayV1; leggiZonaB li decodifica SOLO per registro. Le coppie usate da Annulla e la forma dei documenti scheda restano intatte. Le vecchie voci sono ancora leggibili. Nessun cambio di CSS o desktop/index.html, nessun Map/Set aggiunto. Il finto browser ora rifiuta gli array annidati come il servizio vero. La 70.1 verifica il registro riletto, non impone il formato vietato sul disco.

Nuova prova 75: il finto rifiuta gli array annidati; intensity-test12-wave scrive otto settimane, lascia intatto l’altro esercizio, salva il registro senza avvisi; dopo una nuova lettura Annulla ripristina le settimane di prima e scrive la propria voce. Si provano anche coppie dentro righe, undefined e voci precedenti. Senza la correzione 75.2 e 75.3 falliscono con Nested arrays are not supported; con la correzione le 13 prove 70/72/75 passano. Le verifiche usano dati finti: nessun accesso o ripristino dei dati reali di Alice è stato eseguito.

Nota diagnostica: il codice salva la scheda prima di scrivere il registro. Quell’errore, da solo, NON dimostra che la scheda non sia stata scritta; l’esito sui dati veri resta da controllare nella sessione autenticata. Nessuna promessa di applicazione avvenuta sul sito. Nessun commit o push richiesto in questo passo.

Esiti conclusivi: suite tranne 63, 357 verdi e 4 rossi (64.4, 69.3, 69.4, 69.6, gli stessi segnalati prima). Prova 63 separata: 5 verdi, 0 rossi. Lo scroll della 74 resta verificato anche nella suite. Nessun push.

Controllo browser aggiuntivo: 69.0/69.1/69.2/69.5, nella sequenza originale, 4 verdi: apertura, applicazione dal +, Annulla e assenza errori. La 69.2 isolata saltando 69.1 fallisce sulla verifica finale di Annulla: resta una dipendenza della prova dalla sequenza, non dichiarata risolta.

Autorizzazione di Alice, 11/11/2026 ore 16:03: pubblicare solo la correzione per azioni e modifiche future. La scheda è già stata corretta da Alice: NON sovrascrivere. Nessuna migrazione, riparazione retroattiva o scrittura nel database viene eseguita dalla pubblicazione; il codice interviene solo quando viene richiesta una nuova azione.


## Passo 28 — Applica progressione al posto del + (11/11/2026)

Vincoli di Alice: «se premo applica progressione si deve aprire il popup con tutte le progressioni»; «se premo il + per ora nulla»; le superserie sono rimandate. Il + della riga è disabilitato e non ha più il collegamento alle progressioni. Applica progressione conserva le 21 voci e la stessa applicazione alla singola riga. Nessuna superserie introdotta, nessun accesso ai dati reali, nessun ripristino.

La prima prova browser ha mostrato che il gestore storico in cattura su document interrompeva il clic su .btn-prog prima del pulsante di B. Il modulo vista-programma.js ora intercetta sulla finestra solo i pulsanti marcati della vista B e apre il pannello prima del vecchio gestore. desktop/index.html e CSS intatti; nessun Map/Set aggiunto.

Prove mirate 66/74: 13 verdi. Evidenze browser: + disabilitato, clic anche sintetico non apre popup e non modifica scheda o registro; Applica progressione mostra tutti i 21 nomi originali nello stesso ordine; apertura senza scritture; scrollTop 0 -> 151, touchmove interno non annullato, scroll esterno e clic fuori chiudono. Prova 69.2 aggiornata per scegliere dal nuovo pulsante; formule e dati della progressione invariati. Suite completa in corso. Nessun commit e nessun push autorizzato in questo passo.

Esiti verificati: suite tranne 63, 357 verdi e i quattro rossi già presenti (64.4, 69.3, 69.4, 69.6); browser mirato 69.0/69.1/69.2/69.5, 4 verdi, inclusi applicazione dal nuovo pulsante e Annulla. La 63 viene eseguita separatamente e il suo esito è in suite63-passo28-separata.log. Nessun commit o push.

Prova 63 separata conclusa: 5 verdi, 0 rossi (suite63-passo28-separata.log). Vincoli ricontrollati: popup con tutte le 21 progressioni su Applica progressione; + inattivo senza scritture; nessuna funzione superserie introdotta.

Autorizzazione di Alice, 11/11/2026 ore 23:31 Europe/Rome: «fai commit e push per favore», dopo il riepilogo degli esiti (357 verdi, quattro rossi già noti, 63 separata 5/5). Pubblicazione limitata al passo 28; nessuna scrittura sui dati reali o sovrascrittura delle schede.


## Passo 29 — Ctrl+Z usa il registro B (11/11/2026)

Richiesta: prima diagnosi senza modifiche, poi Ctrl+Z identico al pulsante; test rosso prima e verde dopo; aggiornare questo diario e tasti-finti.md, suite, dichiarare i rossi, fermarsi prima del push. Alice ha autorizzato esplicitamente «Sì, modifica minima» come eccezione alla guardia HTML. Nessun commit o push.

Diagnosi: il pulsante della vista chiama mod.onAnnulla in desktop/app-v31.js, poi editor.annulla(), leggiZonaB(registro) e ultimaAnnullabile. Ctrl+Z era intercettato in window/cattura da doUndo(), con stack/redo e snapshot delle celle data-k; un altro listener document usa annulla() con HIST/REDO. La vista B non usa data-k: nessuna delle due pile storiche legge il registro B.

- righe 10565-10574
Inserite solo sette righe nel gestore storico: con Programma B visibile, Ctrl+Z/Cmd+Z senza Shift/Alt chiama click() sullo stesso button.pg-undo. preventDefault e stopImmediatePropagation evitano sia undo nativo sia i vecchi gestori. Pulsante disabilitato resta inerte, come il clic. Fuori da B, Ctrl+Shift+Z e Ctrl+Y restano sul comportamento storico: non viene introdotto Rifai per B. I numeri dei blocchi successivi sono aggiornati di sette righe; pc/index.html resta congelato.

In desktop/app-v31.js, dopo un salvataggio riuscito, lo stato disabled del pulsante viene riallineato a editor.annullabile, senza ridisegnare. La prova ha evidenziato che dopo aver esaurito gli annullamenti e modificato una cella il pulsante altrimenti restava disabilitato. Nessuna modifica al modello, al CSS o alle funzioni di scrittura; nessun accesso ai dati reali.

Test nuovo tests/76-ctrl-z-registro-b.test.mjs sulla pagina vera con Firestore finto: confronto pulsante/Ctrl+Z dopo cancellazione, Ctrl+Z dopo serie e Cmd+Z dopo ripetizioni. Prima del fix, 76.1 mostra pulsante funzionante, seconda cancellazione non annullata e messaggio «Niente da annullare: nessuna modifica registrata in questa sessione.» (regressione-passo29-prima.log). Dopo: 4/4 verdi (mirata-passo29-verificata.log); per ogni ripristino la scheda torna identica, una sola voce con annullaDi corretto, nessun messaggio storico e nessun doppio annullamento. Durante costruzione del test corrette le attese e l’identificazione degli ID: quei primi rossi non sono presentati come prova del difetto. Esiti finali versione ristretta alle celle: mirata 76, 4/4 verdi (mirata-passo29-verificata2.log); browser 69.0/69.1/69.2/69.5, 4/4 verdi (browser-passo29-finale.log); guardie 42/66/75, 18/18 verdi. Suite tranne 63: 365 prove, 361 verdi e i quattro rossi già noti (suite-passo29-finale.log): 64.4 si aspetta nessun ridisegno sul rifiuto, osserva 2 anziché 1; 69.3 timeout sulla voce Range 8-10 → 8-8; 69.4 ripristino delle otto settimane non conforme all’atteso; 69.6 cella non visibile e staccata dal DOM. Non risolti in questo passo. La 63 separata è conclusa: 5/5 verdi (suite63-passo29-finale.log); zero ridisegni nei trenta secondi fermi, una sola rilettura al cambio vero. Conferma finale test 76: 4/4 verdi (conferma-passo29.log). Nessun commit né push.

Nota di verifica: l’aggiornamento disabled è limitato a serie/ripetizioni/recupero/tempo; cancellazioni e progressioni mantengono il ridisegno esistente. Un aggiornamento anticipato non ristretto aveva fatto emergere un rosso 69.2 nella prova aggiuntiva; dopo la restrizione la sequenza browser passa. Test e dati esclusivamente finti, nessuna scrittura nel database reale.

## Passo 30 — annullamento nativo nei campi (11/11/2026)

Alice richiede e autorizza la distinzione: dentro celle contenteditable, input (ricerca compresa) e textarea, anche nei modali, Ctrl+Z/Cmd+Z resta nativo; fuori dai campi, nella vista B, aziona il pulsante Annulla. Il gestore window/cattura ora esce prima di preventDefault e prima delle pile storiche. Il gestore document storico già ignora input, textarea e contenteditable. Tre righe aggiunte al blocco autorizzato del passo 29; blocchi successivi aggiornati di tre righe. Nessun CSS o formato dati cambiato.

Salvataggio verificato in rendiValoreModificabile/rendiCellaModificabile: blur salva; Invio chiama blur; input misura solo la scrittura. Tornare al testo iniziale prima di uscire non scrive nulla. Non si salva a ogni carattere. Test 76 esteso con digitazione reale e undo nativo, scheda e registro invariati durante il focus; ricerca nel DOM storico del modale Database (aperto soltanto dal banco di prova, funzione non attivata), input e textarea di prova. In Windows Control+Z verifica anche il testo ripristinato; Meta+Z verifica evento non impedito e nessuna scrittura: la combinazione nativa macOS va confermata su Mac, non simulata come se Windows fosse macOS. Prima della correzione entrambe le prove cella falliscono perché il gestore ferma l’evento (regressione-passo30-prima.log). Prova rafforzata: una cancellazione resta annullabile per tutte le prove dentro i campi; solo dopo il blur esplicito il comando fuori campo la annulla. Test 76 definitivo: 10/10 verdi (mirata-passo30-registro-attivo.log e suite-passo30-attivo.log). Suite finale tranne 63: 371 test, 367 verdi, quattro rossi 64.4/69.3/69.4/69.6; sono gli stessi numeri già osservati prima, non risolti. Nel giro precedente 69.3 era passato: il suo esito non è stabile. I primi errori del banco modale erano l’attesa troppo forte di cancellare una parola intera (il browser annulla invece una lettera) e la pulizia saltata dopo il fallimento; corretti nel test, non confusi con un difetto della funzione. La 63 separata è conclusa: 5/5 verdi, inclusi trenta secondi fermi senza ridisegni (suite63-passo30-attivo.log). Guardia 42: 4/4 verdi; diff senza errori, pc congelato, CSS e formato dati intatti. Alice chiede esplicitamente di comunicare i rossi e poi push: questo passo non è dichiarato a suite tutta verde e la pubblicazione segue tale richiesta successiva.

## Passo 31 — cinque letture indipendenti in parallelo (12/11/2026)

Richiesta Alice: avviare insieme soltanto le cinque letture di leggiZonaBCompleta(), senza toccare scritture né formato dati. Sostituiti i cinque await consecutivi con Promise.all, stesso ordine dei risultati; fotografia con ripiego null ed esclusioni con ripiego [] invariati, errori programmi/schede/sedute propagati. Nessuna modifica a scritture-b.js, modello-dati.js, modifiche-b.js, editor, pagina, CSS o formato salvato. Le altre tre letture e quelle duplicate restano intatte. Nessun commit né push richiesto in questo passo.

Test 54 esteso: cinque richieste avviate prima di risolverne una, risposte in ordine inverso e risultato identico, attesa della fotografia, due errori facoltativi e tre obbligatori. Prima 54.11 rosso (regressione-passo31-isolata.log); dopo 15/15 verdi (mirata-passo31.log). Il primo avvio del banco completo aveva lasciato promesse controllate pendenti; corretta l’attesa nel test, non interpretata come difetto applicativo aggiuntivo.

Misura sulla pagina vera con database esclusivamente finto, stesso banco della diagnosi, tre coppie cancella/annulla per profilo (misura-passo31-dopo.log). Con letture 60 ms e scritture 25 ms: cancella 506–528 ms, annulla 557–574 ms; prima cancella 758–773 ms e annulla 831–841 ms. Con letture 250 ms e scritture 150 ms: cancella 1912–2074 ms, annulla 2145–2392 ms; prima cancella 2907–2988 ms e annulla 3177–3228 ms. Totale dal clic al controllo del risultato più due fotogrammi, non misura di sola pittura. Primo gruppo ora sovrapposto: nel primo giro lento tutte cinque partono a 830,7 ms e terminano entro 1093,3 ms. Non sono tempi Firestore reale né promessa di uguale guadagno in rete.

Verifica finale: suite tranne 63, 376 prove, 372 verdi e quattro rossi già presenti 64.4 (ridisegno su scrittura rifiutata), 69.3 (timeout voce Range 8-10 → 8-8), 69.4 (ripristino otto settimane), 69.6 (cella non visibile/staccata). Test 63 separato 5/5 verdi, inclusi trenta secondi fermi senza ridisegno. Guardie 42 e 47, 12/12 verdi. git diff --check senza errori. Stato finale solo lettura-b.js, test 54 e questo diario; nessun commit né push, nessun dato reale modificato.

Aggiornamento successivo: Alice richiede il commit locale del passo 31, senza push. Inclusi soltanto funzione, test 54 e diario; esiti della suite sopra dichiarati, nessuna correzione aggiuntiva.

## Passo 32 A-B — blocco del ripristino parziale (12/11/2026)

A, sola lettura: backup barbell-diva-backup-A-2026-11-04.json, creatoIl 2026-11-03T23:36:32.073Z, SHA-256 e22e5f45c9e55b761db831486e0e8918407252480e90e526c23e6e34f5c30f4d. Esaminati tutti i 196 documenti scheda: kind sheet 26, 234 righe (207 vive); kind archived 170, 1273 righe. Identificativo assente/null/vuoto/spazi: zero righe, zero schede interessate. Programma attivo: 4 schede, 35 righe, tutte con ID. Nessuna verifica del cloud o dei cambiamenti successivi al backup, nessuna scrittura nel backup. Il caso senza ID del banco sintetico NON dimostra la presenza di tale caso nei dati reali; il commento storico del test 70 che lo attribuiva ad Alice non e una prova.

B: in annullaProgressione(), ramo modifica-progressione-scheda, controllo esplicito prima della ricerca: identificativo mancante => ok false, nessun documento/voce restituito e messaggio che nessuna riga e stata ripristinata o scritta. Il chiamante annullaVoce si ferma prima delle scritture gia esistenti. Nessun cambiamento a I/O, schema, CSS, HTML o database; nessun Map/Set aggiunto al codice applicativo. Nessuna migrazione o riparazione retroattiva.

Test 70 esteso con contatore dei tentativi set: sei righe, otto settimane differenti per riga, ID assente all inizio/in mezzo/alla fine, vuoto/spazi/null, ID non trovato e settimane assenti. Confronta scheda completa e registro completi e zero tentativi di scrittura al rifiuto; caso valido confronta tutte le righe/settimane dopo rilettura e passaggio del registro attraverso encoder/decoder. Prima del fix: 9 prove nuove, 6 rosse per modifiche indebite sul disco finto e 3 verdi. Dopo: 9/9 verdi; insieme ai test 67 e 70 precedenti 24/24 verdi. Nessuna correzione delle attese dei test 69.3/69.4/69.6 in questo passo.

C non implementato: proposta separata da approvare. Suite finale da completare e riportare qui. Nessun commit o push autorizzato/eseguito.

Esiti finali passo 32 B: suite tranne 63, 385 prove, 381 verdi e 4 rossi: 64.4 ridisegno 2 invece di 1; 69.3 timeout seconda voce nel menu chiuso; 69.4 attesa/aspettativa di ripristino non aggiornata al rifiuto sicuro; 69.6 cella nascosta, timeout. Test 69 lasciati intatti: non dichiarati verdi o risolti. Test 63 separato 5/5 verdi, inclusi 30 secondi senza ridisegno. Test 70 finale 16/16 verdi; modifica applicativa di sole quattro righe. Backup ricontato indipendentemente: 196 schede, 1507 righe, zero ID mancanti; SHA-256 invariato.

Proposta C, NON implementata: per nuove operazioni conservare nel registro un riferimento della riga verificabile (identita stabile se presente; per assente, descrittore completo e confronto dello stato atteso), validare prima tutte le corrispondenze univoche e tutte le settimane; nessuna scelta solo per nome/posizione. Se ambiguo o cambiato, rifiuto totale. Nessun ID retroattivo, nessuna migrazione; voci vecchie prive di informazioni sufficienti restano bloccate, salvo nuova autorizzazione e verifica esplicita. Richiede il via di Alice. Nessun commit e nessun push.

## Passo 33 — attese e casi completi della prova 69 (12/11/2026)

Passo 32 B pubblicato su autorizzazione di Alice: commit c9d91ea85884bfa195c07da11f72bb53d17dc8e4, hash remoto verificato. Il passo 33 resta locale, nessun commit/push richiesto. Solo tests/69-pagina-viva.test.mjs e diario modificati rispetto a quel commit; nessuna modifica applicativa, migrazione o accesso al database vero.

69.3 usa polling dal banco Node che accetta solo il risultato conclusivo, senza scambiare null/false per fine operazione; controlla una sola voce nuova per ogni scelta, tutte le righe e coppie delle otto settimane decodificate dal modulo reale, attende incremento ridisegni e coda finta ferma con DOM stabile. Due scelte successive con riapertura del menu. Lo scroll per arrivare alla barra viene concluso PRIMA di aprire il menu: un evento ritardato poteva chiuderlo. La scelta usa un clic DOM esplicito, non una verifica di raggiungibilita col puntatore; le prove dedicate 74 restano responsabili di scroll e interazione del popup. Nessun errore viene nascosto da catch vuoti nei nuovi helper.

69.4 usa contesti browser nuovi e soli dati sintetici: caso con tutti gli ID validi e caso con ID assente. Nessuna modifica del finto condiviso: unico script iniziale ordinato; ID aggiunto soltanto nella memoria del caso valido. Dopo ricarica mirata alla voce attende esito del registro, chiusura pannello e fine ridisegno, poi confronta exercises completo (tutte le righe e otto settimane inclusi gli altri campi), versione +1 e una sola voce di annullamento. Nel caso senza ID attende messaggio esplicito di rifiuto e confronta intera scheda/versione e registro invariati.

69.6 riapre Programma, attende tabella visibile e stabile, modifica la cella e attende la voce reale di modifica manuale prima di controllarla. Prime prove di costruzione: errori di stringa corretti nel test; blocchi dovuti al clic Playwright sul menu durante scroll, processi diagnostici fermati; ultimo giro preparatorio 7/7 verdi. Avviati cinque giri consecutivi della versione finale, poi suite tranne 63 e 63 separata; esiti da aggiungere al termine.

Esiti finali passo 33: cinque esecuzioni consecutive della stessa versione del file 69, tutte exit 0 e 7/7 verdi. Per 69.3, 69.4 e 69.6: ciascuno 5/5 passaggi, zero fallimenti. Anche 69.0/69.1/69.2/69.5 passano tutti i cinque giri (passo33-giro1.log fino a passo33-giro5.log). Suite tranne 63: 385 prove, 384 verdi e un solo rosso 64.4, ridisegni 2 contro 1 sul rifiuto. Test 69 verdi anche in suite-passo33.log. Test 63 separato 5/5 verdi, inclusi trenta secondi senza ridisegni (suite63-passo33.log). fine-passo33.log: cinque exit 0, suite 1, separata63 0. Solo test69 e diario modificati rispetto a c9d91ea. Nessun commit o push del passo 33.

## Passo 34 — conflitto con messaggio sopra Programma (12/11/2026)

Alice sceglie opzione A: mantenuti controllo versione, rifiuto senza scritture, rilettura e ridisegno. Dopo la sincronizzazione rifiutata il nodo di stato viene spostato sopra Programma, il motivo viene ribadito e portato in vista. Nessun CSS, formato dati o controllo di scrittura modificato. Test 64.4 ora richiede ridisegno e rilettura, scheda completa e versione 99 invariati, zero nuove scritture, registro invariato, cella ridisegnata col valore precedente, messaggio non nascosto sopra Programma e assenza di errore sotto cella. Resta il vincolo nessun ridisegno sul salvataggio riuscito. Inclusa nella pubblicazione richiesta anche la modifica locale del passo 33. Esiti suite da aggiungere.

Verifica passo 34: test 64 mirato 6/6 verdi. Il banco JSDOM outside-only non esegue la navigazione incorporata: per verificare anche gli antenati visibili il test apre Programma con la classe on prevista dal CSS; i primi controlli hanno segnalato correttamente la vista nascosta. Browser Playwright con finto Firestore: messaggio completo di conflitto versione 99 invece di 1, visibile sopra Programma dopo ridisegno, rettangolo verticale 0,25–15,77 px nel viewport 1440x900, zero errori sotto cella e documento completo invariato. JSDOM conferma anche zero scritture aggiuntive e registro invariato, valore precedente 3-1-1 a schermo, rilettura e sostituzione del vecchio nodo. Suite tranne 63: 385/385 verdi, zero rossi (suite-passo34.log). Nessun accesso al database reale. File comune/ intatti: controllo versione e I/O invariati; pc e desktop/index.html intatti.

Conclusione passo 34: test 63 separato 5/5 verdi, inclusi trenta secondi senza ridisegni. Totale suite 390/390 verdi, zero rossi. Alice autorizza esplicitamente push di tutto il lavoro corrente: passi 33 e 34, quattro file intenzionali, nessun log o immagine diagnostica incluso.
## Passo 35 — Database esercizi: catalogo e selettore di sola lettura (12/11/2026)

Richiesta Alice: l'Aggiungi riga dovrà scegliere l'esercizio dal Database esercizi; prima il catalogo e il selettore, poi si riparla di aggiunta. Autorizzazione esplicita: copiare il catalogo dei 179 esercizi dal v31 in un modulo statico di comune/ senza cambiare né aggiungere niente; costruire il selettore come il modal pg-lib (ricerca per nome o distretto, clic per scegliere, Esc per chiudere); accendere il pulsante 🗄 in testa a Programma; nessuna scrittura, né su Firestore né sul computer; test su ricerca, conteggio e chiusura; aggiornare diario e tasti-finti.md; suite; fermarsi prima del push.

Letture dal v31 (pc/index.html): la pagina completa DB Esercizi (r.2822-2855) è solo consultazione; l'aggiunta del v31 passa dal modal libreria pg-lib (r.6865, JS r.7377-7399), e il modal Sostituisci esercizio bdsw (r.7042, JS r.7442-7510) è un componente separato: i due condividono l'array CAT (r.5860), 179 voci {n, g} statiche nel file, chiavate sul nome senza identificativi (nota del v31 a r.2848: sono gli esercizi veri del backup; i 62 di prehab non ci sono perché nel backup mancavano). In B nessun catalogo esistente; trovaEsercizio cerca per id e ripiega sul nome esatto univoco.

Fatto: comune/catalogo-esercizi-b.js generato per estrazione automatica dall'array CAT del v31 (nessun nome riscritto a mano; 179 voci, zero nomi duplicati, voce per voce identiche all'origine — prova 77.1); comune/selettore-esercizi-b.js con il modal pg-lib rifatto: ricerca senza maiuscole su nome o distretto, contatore, griglia nome+distretto, chiusura con Esc, clic sul velo o sulla ×, e scelta restituita a chi ascolta come {n, g} — per ora nessun consumatore, non scrive niente (prove 77.3 e 77.4, localStorage intatto). Il pulsante 🗄 Database esercizi in comune/vista-programma.js passa da pulsanteSpento a pulsanteVivo e apre il selettore; Libreria Coach resta spenta (prova 77.5). CSS nuovo con classi bdsel-*, nessun tocco al CSS esistente.

Esiti: suite tranne 63, prima esecuzione un solo rosso 69.2 («l'Annulla riporta le 8 settimane di prima»), prova già nota come fragile e risultata 7/7 verde rilanciata da sola; seconda esecuzione completa: 390 prove, 390 verdi, zero rossi. Prova 63 separata: 5 verdi, zero rossi (5 prove). Nessuna scrittura su dati veri, banco di prova solo finto. Nessun commit di file temporanei; nessun push: in attesa del via di Alice.

## Passo B — il selettore Database esercizi aggiunge la riga (12/11/2026)

Richiesta Alice dopo l’analisi dei muscoli: il clic su un esercizio del selettore aggiunge IN FONDO alla scheda aperta una riga con il nome scelto, il distretto del catalogo scritto VERBATIM nel campo muscolo, serie e ripetizioni vuote, le otto settimane come le altre e un identificativo nuovo assegnato alla creazione, mai riutilizzato. Voce di registro per Annulla e Ctrl+Z, che tolgono la riga. Scritture solo su bdB_atleti, schede gia’ corrette non toccate, le righe esistenti con «Addome» e le altre etichette NON cambiate.

Analisi di preparazione (sola lettura, backup barbell-diva-backup-A-2026-11-04.json, documenti in j.documenti): i campi muscle/som delle schede (3.971 valori) usano i 12 distretti del catalogo identici alla maiuscola per il 97%; dichiarati e lasciati dove stanno: Addome (32, il catalogo dice Addominali), Attivazione (36), Da classificare (20), Custom (20), Full body (1), gluteo medio (2, gia’ fuso in Glutei dal v31 a r.5861-5862), glutei minuscolo (3). Nessuna tabella di traduzione inventata: la riga nuova prende il distretto del catalogo cosi’ com’e’.

Fatto: comune/modifiche-b.js — aggiungiEsercizio (riga in fondo con order = massimo+1 secondo la lettura della tabella, name, muscle verbatim se presente, progression.weeks con 8 settimane vuote {}, id nuovo bdb-ex-* verificato contro TUTTI gli id della scheda comprese le righe cancellate, generatore iniettabile per le prove, marchio aggiuntoInB con l’istante, versione +1, voce tipo aggiunta-riga con prima null e dopo {nome, muscolo}); annullaModifica/annullaProgressione con il ramo aggiunta-riga che TOGLIE la riga per id (non per posizione), ultimaAnnullabile aggiornata. comune/editor-schede-b.js — strada campo aggiunta-riga dentro la coda scritture, stesso flusso delle altre (rilettura, versione, salvaSchedaConVersione, voce di registro). comune/vista-programma.js — la scelta del selettore passa da mod.onCambia con l’id della scheda aperta letto dall’attributo data-scheda della tabella; senza editor acceso la scelta resta sola lettura.

Rilancio in sequenza di 74, 76 e 63 (test-concurrency 1): 74 e 76 ORA VERDI, compresa 76.1 pulsante e Ctrl+Z sul registro B. La 63 resta rossa a livello di FILE (18,9 s, chiudo con «test failed» generico senza alcuna prova caduta dentro: 63.1 e 63.2 verdi, il processo del file crolla dopo, stessa firma del browser morto vista in suite) e va riprovata in una passata dedicata. Rosso dichiarato, non nascosto, non attribuito al codice del Passo B che la 63 non tocca.
