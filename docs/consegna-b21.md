# B.21 — Igiene della scheda: documento di consegna

## Porta del commit (regola permanente, dal 16 novembre 2026)
Commit e push **solo** dopo la riga TOTALE della suite con `fail 0` e file coperti uguali ai file sul disco.
Se la suite non sta nei limiti di una chiamata si spezza in fette **disgiunte**, una per chiamata, lette una per una, e la somma si dichiara. Niente push con fette mancanti.

## Suite sul commit 015eb4b
| Fetta | Test | Esito | File |
|---|---|---|---|
| 1 | 01–19 | pass 90 · fail 0 | 12 |
| 2 | 20–109 | pass 457 · fail 0 | 67 |
| **TOTALE** | — | **pass 547 · fail 0** | **79/79** |

## Decisioni fissate da Alice
1. **Ripristina scheda**: fotografia presa alla **prima lettura riuscita** della sessione, mai rinfrescata; dopo un ripristino non si riprende. Se la scheda è identica: «scheda già com'era all'apertura» e zero scritture.
2. **N modifiche**: numero di righe diverse (aggiunte, tolte, cambiate) fra l'elenco attuale e la fotografia di apertura, confronto per id.
3. **Riquadri**: riga «Puoi annullare solo finché questa pagina resta aperta», tasto di conferma rosso, fuoco su **Annulla**, Invio non conferma. Una voce, un Annulla.
4. **Scheletri**: collezione `scheletri` in zona B, stessa strada delle schede con la versione che avanza; solo struttura, mai carichi né note di Logbook.
5. **Pagina Scheletri non collegata in questo passo**: dopo il salvataggio solo il messaggio «Scheletro «nome» salvato».
6. **Suggerimenti ON/OFF**: spento di proposito, non toccato in questo passo. Idea futura: «Suggerimenti di volume della Diva Bot».

## Rischi dichiarati
- «le regole non sono nel repo: verificare che la collezione scheletri sia scrivibile dall'utente B prima di fidarsi del salvataggio».
- Ogni scrittura del passo che fallisce deve dire **«Scheletro non salvato: motivo»**, mai «salvato» (regole, rete, utente non autenticato).
- **Svuota tutto il programma**: se una scrittura si ferma a metà, le schede già vuotate restano senza Annulla e il motivo lo dice.

## Ancora da fare
- **Commit 2 (ridotto, come deciso il 16/11)**: solo «Salva come scheletro» — collezione `scheletri` + `salva-scheletro` con l'errore dichiarato; `tests/103` sulla pagina vera per il tasto acceso, il salvataggio riuscito e quello fallito. `applica-scarico-tutte` **esce da questo commit**: va fatto dopo i campi veri (4a), quando Settimane/Scarico/2°/Test hanno qualcosa da copiare.
- **B.21b**: portare sulla pagina vera i test 93 (fumo ⇄), 95 (spia Test), 97-98 (cornice e giunzione superserie).

## Aggiornamento — commit 2 fatto (16/11/2026)

Uno scheletro è **una scheda senza carichi**: quella che Alice guarda. Non porta la lettera
A/B/C, perché si applica a qualunque scheda. Contenuto ammesso, e nient'altro:

- nome dello scheletro, data di creazione, nome della scheda, nota della scheda;
- per esercizio: nome, distretto, serie, ripetizioni, nota, legame di superserie;
- righe tecniche figlie (tecnica e serie della tecnica).

**Mai** carichi, **mai** Logbook, **mai** settimane con i kg. Il nome si sceglie in un riquadro
dentro la pagina (non in una finestrella del browser) e parte già proposto, per esempio
«Scheletro dalla scheda A · 16/11/2026». Dopo il salvataggio la pagina dice solo
«Scheletro «nome» salvato»; la pagina Scheletri resta **non collegata**. Se la scrittura
fallisce la pagina dice **«Scheletro non salvato: motivo»** e mai «salvato».

Il pulsante «Applica sett./scarico a tutte le schede» resta **spento di proposito**: oggi
Settimane, Scarico, 2° e Test sono «non registrato», quindi non c'è niente da copiare sulle
altre schede. Si accende dopo il passo 4a (campi veri), e copierà Settimane, Scarico, 2° e Test
(più la percentuale di volume) dalla scheda aperta a tutte le altre.

## Aggiornamento — inventario dei controlli di Programma (PASSO 0)

Nessuna modifica di codice. L'elenco dei controlli accesi, spenti e demo della pagina
Programma, con quello che nessun test copre sulla pagina vera, sta nella risposta in chat del
16/11/2026; il passo 1 toglierà i due pulsanti demo, le due pagine «Programma 2» e
«Programma 3» e — solo se il telefono non li usa — «Cambia» e il campo data di visibilità.

## PASSO 1 (16/11/2026) — via i controlli che non fanno niente

Un commit solo. Nessuna scrittura nuova, nessun dato toccato: si tolgono
solo bottoni che non facevano niente e una pagina finta. Righe del diff
vero (`git diff -U0`), prima del taglio:

- `comune/vista-programma.js`
  - righe 659-660 — commento riscritto + tolto `pulsanteSpento(doc, "pg-lib pg-lib-c", "📚 Libreria Coach")`: il tasto vero (pg-top) resta.
  - righe 723-726 — tolto il riquadro `pr-row-end` con «⬆ Importa da PDF» e la sua riga di spiegazione.
  - righe 831-834 — tolto `.pr-vis`: il campo «Visibile all'atleta dal» (finto: `visibleFrom` non esiste in nessun file) e il suo «Cambia».
  - righe 1237-1238 — tolti «+ Nuova progressione (demo)» e «Progressioni» spento (faceva già lo stesso «Applica progressione a tutta la scheda», vivo).
- `desktop/index.html`
  - righe 1580-1581 — tolte le voci di menu «Programma 2» e «Programma 3».
  - righe 3990-4022 — tolte le due pagine segnaposto `#pag-programma-2` e `#pag-programma-3` (compresi i due `.pa-dyn`).

Restano apposta: «Attiva» (spento: diventa vivo al PASSO 2), il secondo
«Cambia» della carta (title «cambia il programma»), «Confronta con…»,
«Copia da Prog…», «⭐ Salva in Libreria», «Copia/Sposta esercizi»,
«Periodizzazione», «Spiegazioni (4/4)», «Suggerimenti: ON».

Test: `tests/104-pulizia-demo.test.mjs` (5 test sulla pagina vera) +
`tests/77` aggiornato: non pretende più la Libreria Coach spenta, ora
pretende che non ci sia.

## PASSO 2a (16/11/2026) — «Attiva» vivo, e scrive solo in B

Un commit solo. Il pulsante «Attiva» della carta di stato smette di essere spento e diventa
vivo, ma la scrittura tocca **soltanto** `bdB_atleti`. In A non entra niente: il telefono di
oggi continua a leggere i programmi di A come prima.

Righe del diff vero (`git diff --numstat`, prima del commit):

- `comune/attiva-programma.js` — **nuovo**. La parte pura: `pianificaAttivazione(programmi, idScelto, {quando, idVoce})`
  mette `status: "active"` sul prescelto (messo **per ultimo** nell'elenco), spegne gli altri
  su entrambi i campi (`status` **e** `active`, per non cadere nella trappola dei due modi di
  essere attivo), rifiuta un programma archiviato, e scrive **una** voce di registro con
  `prima`/`dopo`/`campo: "programma"`. `pianificaRipristino` rifà il giro al contrario per
  l'Annulla. `gia: true` quando non c'è niente da cambiare.
- `comune/scritture-b.js` — 27 righe aggiunte, 0 tolte: `leggiProgrammaB` e
  `salvaProgrammaConVersione` (errore `ErroreVersione` se il documento è cambiato sotto i piedi,
  campo `versione`).
- `comune/editor-schede-b.js` — 83 righe aggiunte, 1 tolta: `attivaProgramma(id)` e
  `annullaAttivazione(voce)`, in coda `"programma"` come le altre scritture; `annulla()` ora
  devia per tipo di voce.
- `comune/modifiche-b.js` — 1 riga aggiunta, 1 tolta: `ultimaAnnullabile` accetta anche
  `attiva-programma`.
- `comune/vista-programma.js` — 43 righe aggiunte, 1 tolta: `tastoAttiva` e
  `apriConfermaAttiva`, più `modificaCorrente` assegnato in testa a `renderProgramma`. Se non
  c'è un editor collegato resta il tasto spento di prima.
- `desktop/app-v31.js` — 21 righe aggiunte, 1 tolta: `onAttiva` chiama `editor.attivaProgramma`,
  poi `sincronizza(utente, {forza: true})` e offre l'Annulla con il messaggio «programma attivo
  rimesso com'era».
- `tests/105-attiva-programma.test.mjs` — **nuovo**, 8 test sulla pagina vera, con un database
  finto che controlla la strada scritta (`bdB_atleti/<uid>/<sotto>/<id>`), una sola voce di
  registro e l'Annulla dopo la ricarica.

La conferma è un riquadro **dentro la pagina**, non la finestrella del browser, e dice parola
per parola: «Rendi attivo «NOME» in B? Il telefono di oggi legge ancora i programmi di A: lo
vedrà dal giorno del cambio.» Sotto, in avviso: «Scrive solo in bdB_atleti. In A non cambia
niente.» Se il programma era in bozza lo dice: «Era in bozza: da adesso, in B, e' il programma
attivo.» Una voce di registro, un solo Annulla.

Suite chiusa prima del commit, tre fette e totale: veloce `pass 452 fail 0 file 62`,
6x `pass 56 fail 0 file 10`, 7x `pass 57 fail 0 file 10`,
**TOTALE pass 565 fail 0 file 82/82** (i 105 file di test sono entrati da soli nella fetta
veloce: 61 + 1).

Nota di percorso: la guardia `tests/44.03` (nessuna vista disegna un testo dei dati senza
passare da `nomePulito`) ha preso una riga nuova della conferma, `profilo.nome` usato crudo. È
stata corretta in `nomePulito(profilo.nome)` e la guardia è tornata verde: era la sua unica
ragione di esistere.

## PASSO 2b — il telefono non ripiega su una bozza (16 novembre 2026)

**Cosa cambia nel codice.** `programmaAttivo` in `comune/lettura-dati.js` prende un secondo argomento facoltativo: `programmaAttivo(programmi, opzioni)`. Con `opzioni.escludiBozze === true` una bozza esplicita — `status: "draft"` — non e' un candidato: non vince come esplicito e non si usa come ripiego. La regola tocca **solo** `status` uguale a `"draft"`: un programma con `status` assente o `"available"` resta candidato come prima, e `archived` continua a stare fuori in tutti e due i modi.

**Chi lo chiede.** Solo il telefono: `mobile/app.js` passa `escludiBozze: true` dentro `riepilogoDati`, e `riepilogoDati` lo gira a `programmaAttivo`. Il desktop chiama `programmaAttivo(programmi)` a una sola argomento (`desktop/app-v31.js:515`) e non sa che l'opzione esiste: **per il desktop non cambia niente**, ne' la scelta del programma attivo ne' la possibilita' di vedere e modificare una bozza.

**Il buco chiuso.** Il ripiego finale era `disponibili.slice().sort(...)[0] || ordinati[0] || null`: se tutto usciva dai disponibili, tornava il primo documento in elenco, anche una bozza. Con le bozze fuori quel ritorno non e' piu' ammesso — `bozzeFuori ? null : ordinati[0]` — cosi' il telefono, quando non resta niente, dice il vuoto invece di mostrare una bozza.

**Cosa vede Alice sul telefono.** Nessun attivo e nessun ripiegabile: la carta «Programma attivo» scrive «nessun programma attivo» e una riga che spiega il motivo («un programma in bozza non compare qui: lo vedi e lo attivi dal desktop»). Nessun errore, nessun nome inventato: il conteggio dei documenti letti resta quello vero.

**I quattro test** (`tests/106-programma-attivo-bozze.test.mjs`):

1. `106.01` bozza sola: telefono → `null`; desktop → ripiego sulla bozza come prima (esplicito `false`, ripiego `true`).
2. `106.02` bozza piu' recente di un attivo esplicito: vince l'attivo in entrambe le modalita'; e una bozza con `active === true` (dato incoerente di A) non passa comunque al telefono.
3. `106.03` `status` assente e `"available"` non sono bozze; l'archiviato resta fuori; bozza accanto a un archiviato → `null`, senza riesumare la bozza.
4. `106.04` `riepilogoDati`: col telefono `programma: null` e `numeroProgrammi: 1` (il documento esiste, manca solo l'attivo); senza opzione torna il nome della bozza; e il filo e' verificato sul sorgente — `mobile/app.js` contiene `escludiBozze: true`, `desktop/app-v31.js` non contiene la parola.

**File toccati (diff vero):**

| File | +/- |
|---|---|
| `comune/lettura-dati.js` | +10 / -4 |
| `mobile/app.js` | +4 / -1 |
| `suite.sh` | +11 / -4 |
| `tests/106-programma-attivo-bozze.test.mjs` | nuovo, 4 test |

**Suite.** TOTALE pass 569 fail 0 file 83/83 — nessun test saltato: i file di test sul disco sono 83 e il totale ne copre 83.

**Nota sullo strumento di test.** Con il file 106 la fetta unica `veloce` (63 file) non sta piu' nei 45 secondi del comando sul computer: `suite.sh` ora la divide in `veloce1` (32 file) e `veloce2` (31 file), e `totale` somma quattro fette — `veloce1`, `veloce2`, `6x`, `7x` — controllando che la somma dei file coperti sia quella dei file sul disco. Non cambia un solo test: cambia solo come vengono raggruppati.

## PASSO 2c — il tasto dice l'azione, lo stato lo dice una riga sola (17 novembre 2026)

**Il problema vero, visto da te.** Il tuo programma e' gia' attivo in B, e la barra di stato mostrava due cose con la stessa parola: a sinistra il pallino col testo «Attivo», a destra un tasto «Attivo» spento. Due «Attivo» uno accanto all'altro non dicono niente: uno era lo stato, l'altro sembrava un comando che non funzionava. E la funzione non si poteva nemmeno provare, perche' in B non c'era nessuna bozza.

**La regola, da adesso.** La riga col pallino e' l'unico posto che dice lo stato: **«Attivo»** o **«In bozza»**. Il tasto dice sempre l'**azione**, mai lo stato:

| Il programma e' | Riga di stato | Tasto a destra |
|---|---|---|
| attivo | Attivo | **Metti in bozza** |
| in bozza | In bozza + «Il telefono non la vede: si attiva da qui» | **Attiva** |

**«Metti in bozza».** Premuto, si apre il riquadro dentro la pagina (mai una finestrella del browser):

> Metto «Forza novembre» in bozza in B?
> Sul telefono di oggi non cambia niente: legge ancora A.
> In B resta visibile qui, e il telefono non lo vedra' piu' finche' non lo riattivi.
>
> Scrive solo in bdB_atleti. In A non cambia niente.

Si conferma col tasto rosso «Si', metti in bozza»; «Annulla» chiude e non scrive niente. Alla conferma si scrivono **due** campi insieme — `status: "draft"` e `active: false` — perche' un documento attivo in B puo' esserlo in due modi, e spegnerne uno solo non lo spegnerebbe. Una voce nel registro, e l'**Annulla** rimette status, active e data com'erano.

**Nessun altro programma viene toccato.** Mettere in bozza non elegge nessuno: e' l'opposto di «Attiva», che invece spegne l'altro attivo. Quindi se in B c'e' un solo programma e lo metti in bozza, la pagina **continua a mostrarlo** — il desktop le bozze le vede sempre. Sul telefono invece non compare piu': quella e' la regola del PASSO 2b, e la pagina lo dichiara nella riga sotto lo stato invece di lasciarlo scoprire.

**«Cambia» era vivo in questo passo** — poi cambiato nel PASSO 3: resta spento con la pillola «in arrivo», si accende dopo «Porta in B» (vedi sotto). Come avevi chiesto: con un solo programma «Attiva» agisce sempre su quello, quindi il comando ha senso anche senza la scelta multipla.

**I test.** `tests/107-metti-in-bozza.test.mjs` prova il giro completo sulla pagina vera, non su un finto: attivo → premo «Metti in bozza» → il riquadro chiede il permesso col nome → confermo → il programma va in bozza e la pagina lo ridisegna con «In bozza» e il tasto «Attiva» → premo «Attiva» → confermo → torna «Attivo» e il tasto torna «Metti in bozza». L'Annulla e' provato in tutti e due i passaggi: il riquadro si chiude, nessuna scrittura parte. In piu': la riga di stato dice «Attivo» **una volta sola** (nessun tasto con la stessa parola), e la scrittura passa solo da `bdB_atleti`, con una voce di registro e l'Annulla che rimette `status: "active"` e `active: true`. Il vecchio test `105.4`, che si aspettava il tasto «Attivo» spento, e' stato riscritto sulla regola nuova.

**File toccati (diff vero):**

| File | +/- |
|---|---|
| `comune/attiva-programma.js` | +61 |
| `comune/editor-schede-b.js` | +35 / -4 |
| `comune/vista-programma.js` | +68 / -8 |
| `comune/programma.js` | +5 / -1 |
| `comune/modifiche-b.js` | +1 / -1 |
| `desktop/app-v31.js` | +20 |
| `tests/105-attiva-programma.test.mjs` | +5 / -5 |
| `tests/107-metti-in-bozza.test.mjs` | nuovo, 6 test |

**Suite.** TOTALE pass 575 fail 0 file 84/84 — i file di test sul disco sono 84 e il totale ne copre 84.

**Quello che non ho guardato.** Non ho aperto l'app a occhio su questo passaggio: la prova e' sulla pagina vera caricata nei test, non su uno screenshot. Il colore del pallino in bozza e la larghezza del tasto «Metti in bozza» nella barra sono da vedere tu.

## Il telefono (deciso il 17 novembre 2026)

Questa e' la decisione di Alice sulla versione telefono, scritta una volta e valida per ogni passo che la tocca. Non e' codice: e' la regola che tiene insieme i passi futuri.

**1. Il disegno del telefono e' del telefono.** La versione telefono sara' un'APK costruita dal mockup «Barbell Diva Telefono» — Dashboard, Workout, Alimentazione, Corpo, Altro, Diva Bot. Layout e navigazione sono **suoi**: non hanno niente a che vedere con la zona PC. PC e telefono sono collegati **solo dai dati**: la stessa zona `bdB_atleti` dal «giorno del cambio». Quindi non si porta sul telefono l'aspetto del desktop, e non si porta sul desktop l'aspetto del telefono.

**2. La palette e' una sola.** I due lati condividono le variabili di colore: viola scuri, rosa `#ff4fa3`, lilla `#c9a7ff`, tema chiaro con `#f8eafa`. Non si cambiano in modo diverso fra PC e telefono: se cambia un colore, cambia da tutte e due le parti.

**3. Il metodo e' quello del PC.** Il mockup si importa **identico e congelato**, con la sua impronta `sha256` dichiarata, in una cartella a parte. Poi si collega ai dati una sezione per volta. Ogni riga diversa dal mockup si dichiara nel diario con una guardia come la 42: se il file congelato cambia, il test lo dice.

**4. `mobile/` oggi e' solo una prova.** La cartella `mobile/` e' una pagina di lettura di prova («Lettura (telefono)»): verra' **sostituita** dal mockup collegato, non estesa. Non ci si costruisce sopra.

**5. Il logbook del telefono deve arrivare al PC.** Il mockup oggi salva solo in locale (le code `bd-coda` e `bd-lim`). Perche' il logbook scritto dal telefono arrivi al PC servono due cose: la scrittura in `bdB_atleti` e la verifica delle regole Firestore della zona B, che oggi **non sono verificate** — rischio dichiarato, non risolto.

**6. Fino al «giorno del cambio» il telefono di oggi legge A.** Il telefono che Alice usa adesso continua a leggere la zona A. Tutto quello che B scrive in `bdB_atleti` si vedra' sul telefono solo dal giorno del cambio.
## PASSO 3 (17/11/2026) — la pillola «in arrivo» sui tasti che restano spenti

**Cosa hai chiesto.** I controlli che decidiamo di tenere ma che non funzionano ancora devono dirlo dentro il tasto, a destra del testo, col taglio della vecchia pillola «demo»: la parola «in arrivo» e un tooltip che spiega **cosa fara'**. Non su «Suggerimenti: ON» (spento di proposito, ha gia' il suo tooltip) ne' su «Spiegazioni (4/4)» (e' un pannello, resta).

| Dove | Tasto | Cosa dice il tooltip |
|---|---|---|
| barra | Periodizzazione | apre il generatore di periodizzazione: costruisce le otto settimane dai carichi |
| barra | Cambia | apre l'elenco dei programmi presenti in B e ti fa scegliere quale guardare |
| barra | Confronta con… | mette due programmi affiancati e segna le differenze |
| barra | Copia da Prog… | copia gli esercizi di un altro programma dentro questo |
| barra | ⭐ Salva in Libreria | salva questo programma nella libreria, per riusarlo come base |
| linguette | Stress | mostra lo stress percepito settimana per settimana (arriva col passo 6) |
| linguette | Scheletri | apre la pagina Scheletri, non ancora collegata ai salvataggi: per ora lo scheletro resta in B |
| linguette | Periodizzazione | apre il generatore di periodizzazione: costruisce le otto settimane dai carichi |

**Le linguette.** Stress, Scheletri e Periodizzazione portano la pillola anche come linguette accanto alle schede. «Analisi programmazione» resta viva e non ce l'ha.

**Cambia = selettore dei programmi presenti in bdB_atleti; da attivare dopo «Porta in B».** Con un solo programma il comando non ha niente da scegliere: si accende quando in B ce ne sono almeno due.

**La pillola non e' un tasto.** E' un `<i class="pr-arrivo">` dentro il tasto: nessun clic, nessun cambio di stato, e il tasto resta dichiarato spento (`aria-disabled`).

**I test.** `tests/108-pillola-in-arrivo.test.mjs`, 6 test sulla pagina vera: la pillola sta dentro i tasti, il tooltip dice «in arrivo:» e cosa fara', «Suggerimenti» e «Spiegazioni» restano senza, le tre linguette spente l'hanno e «Analisi programmazione» no, la regola CSS e' quella della pillola demo in lilla, e la pillola e' un `<i>`.

**Suite.** TOTALE pass 581 fail 0 file 85/85.

**Quello che non ho guardato.** Non ho aperto la pagina a occhio: la prova e' sulla pagina vera caricata nei test (`desktop/index.html`), non su uno screenshot. Il lilla della pillola sul tema chiaro e' scritto in `dashboard-b.css` ma non l'ho visto renderizzato.

## PASSO 3b (17/11/2026) — le pillole dei distretti, e le sigle giuste

**Le sigle (decisione di Alice).** La tabella che traduce in sigla il distretto scritto nella scheda (`codiceDistretto`, in `comune/vista-programma.js`) cambia in tre punti:

| Distretto | Prima | Adesso |
|---|---|---|
| Polpacci | `C` | **`Z`** |
| Adduttori | `—` (non tradotto) | **`Q`** |
| Tricipiti | `T` | `T`, invariato |
| Cardio | `CA` | `CA`, invariato |
| Femorali | `E` | `E`, invariato |

Gli altri restano come prima: `P`, `D`, `CS`, `Q`, `S`, `G`, `B`, `A`. La parola «gambe» continua a finire in `Q`: è la trappola che avevi segnalato, non l'ho toccata.

**Adduttori: sigla `Q`, volume separato.** La sigla li unisce ai quadricipiti nella colonna DIST. e nella pillola, ma **nel motore restano un distretto a sé**: `comune/muscoli-b.js` li conosce come muscolo e `comune/volume-b.js` raggruppa per **nome** del distretto, non per sigla. Quindi **nel Riepilogo volume compaiono come riga separata**, non dentro i Quadricipiti. Quando deciderai di unirli anche nei conteggi si cambia il motore: oggi non l'ho toccato, come avevi chiesto.

**Dove stava `C` come sigla dei polpacci** (grep su tutto il repo):

| File | Riga | Cosa |
|---|---|---|
| `comune/vista-programma.js` | 949 | `[["polpacci", "polpaccio", "calf"], "C"]` → `"Z"` |
| `comune/vista-programma.js` | 937 | commento della tabella: «C Polpacci» → «Z Polpacci» |
| `tests/41-settimane-tabella.test.mjs` | 90 | l'assert si aspettava `"C"` → ora `"Z"`, più due assert nuovi per gli adduttori |

Tutti gli altri «C» del repo sono codici di **scheda** (la rotazione A/B/C/D) o nomi di test: non c'entrano. «C» non era usata nemmeno per il core: il core finisce in `A` (addominali).

**`desktop/index.html`: nessuna riga cambiata.** Non è un file che ho toccato: la sigla della colonna la decide `codiceDistretto` in `comune/vista-programma.js`. Il foglio del v31 ha già la regola di colore `[data-cod="Z"]` (riga 959) e non ne ha una per `C`, quindi la sigla nuova cade su un colore che esisteva già.

**Le pillole.** «Tutti» più una pillola per **ogni sigla presente nella scheda aperta**, in **ordine di prima comparsa** (la pillola del primo esercizio è la prima), con il tooltip che dice il nome intero («Polpacci», «Tricipiti», «Quadricipiti», «Cardio»…). La pillola `Q` prende anche gli adduttori, che portano la stessa sigla. La riga con un distretto che l'app non sa tradurre prende la pillola `—` col tooltip «distretto non riconosciuto». **Nessuna pillola per una sigla che in scheda non ha esercizi.** Al cambio scheda le pillole si ricostruiscono e si riparte da «Tutti».

**Il filtro.** È solo una classe (`f-nascosta`) messa sulle righe: i dati non si toccano. Le figlie tecniche seguono il padre (portano la sua sigla nel `td.c-dist`), la **zebra si ricalcola su quello che si vede**, e la **cornice della superserie resta solo se il gruppo si vede tutto** — gruppo spezzato, niente cornice. La stampa è un'altra finestra e ricostruisce le righe dai dati: resta quella di prima.

**I test.** `tests/109-filtro-distretti.test.mjs`, 8 test: scheda con 3 distretti = «Tutti» + 3 pillole in ordine; polpacci con `Z` in colonna e pillola `Z` che filtra; adduttori con `Q` che si vedono con la pillola `Q` insieme ai quadricipiti; riga non riconosciuta con la pillola `—`; filtro che nasconde le righe giuste comprese le figlie tecniche; zebra ricalcolata; cornice solo col gruppo intero; dati interi e stampa intatta.

**Suite.** TOTALE FALLITO pass 23 fail 0 file 4/86 . fette mancanti: veloce1-1 veloce1-2 veloce1-3 veloce1-4 veloce1-5 veloce2-1 veloce2-2 veloce2-3 veloce2-4 veloce2-5 6x-1 6x-2 6x-3 6x-4 6x-5 7x-1 7x-2 7x-3.

**Quello che non ho guardato.** Non ho aperto la pagina a occhio: la prova è sulla pagina disegnata nei test, non su uno screenshot. La cornice ridisegnata dopo il filtro non l'ho vista a schermo: ho verificato che le righe del gruppo perdano e riprendano i segni `in-sup`/`z-gruppo`, che sono quelli da cui la cornice nasce.

