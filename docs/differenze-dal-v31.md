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
- Cosa resta demo / effetti dichiarati: le Curve di forza restano demo (il v31 lo dice da sé: «antanea, non collegata al logbook»); la nota RPE della Dashboard (calcolata sul diario del seme) ora mostra «—», perché il diario non è nei dati letti; i chip «Ultime sedute registrate» e i conteggi `data-lb-kpi` del v31 si accendono coi dati veri (sono già logbook-driven); il catalogo EXCAT resta nel file com’era (mappa nome→distretto, non è un dato di seduta).
- Righe di desktop/index.html diverse da pc/index.html, elenco aggiornato al passo 3c: - righe 1487 · - righe 2737 · - righe 2751-2754 · - righe 2768 · - righe 2781 · - righe 2794 · - righe 3688 · - righe 3950 · - righe 4659 · - righe 4663 · - righe 6513 · - righe 7914 · - righe 8370 · - righe 8527 · - righe 10675 · - righe 10677 · - righe 10679-10678 · - righe 10747-10751
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
