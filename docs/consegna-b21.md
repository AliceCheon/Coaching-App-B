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

**Suite.** TOTALE pass 589 fail 0 file 86/86 (il numero incompleto che c'era qui era un errore mio di lettura del log, non un rosso della suite).

**Quello che non ho guardato.** Non ho aperto la pagina a occhio: la prova è sulla pagina disegnata nei test, non su uno screenshot. La cornice ridisegnata dopo il filtro non l'ho vista a schermo: ho verificato che le righe del gruppo perdano e riprendano i segni `in-sup`/`z-gruppo`, che sono quelli da cui la cornice nasce.


## PASSO 3c (17/11/2026)

Il recupero va da 0" a 10'. Prima i pulsantini dei 30" si fermavano a 30" e a 3':
adesso scendono fino a 0" (che e' un valore: nessun recupero) e salgono fino a
10'. Oltre i due estremi il pulsantino si spegne, e il tooltip dice perche'.

Su un intervallo (2-3', 1'-2', 120-180 sec) i pulsantini spostano tutti e due gli
estremi insieme: 2-3' diventa 150-210", poi 3-4'. L'ordine resta quello, mai un
estremo sopra l'altro; se l'estremo alto uscirebbe dai 10' il passo non si fa.

Quando la cella non contiene un tempo (una frase, o la cella vuota) i pulsantini
sono spenti e il tooltip scrive il motivo: "non e' un tempo: i pulsantini vanno
con 90" o 2' o 2-3'", "vuoto: prima scrivi un recupero", "sotto 0" non si scende",
"sopra 10' non si sale". Il pulsantino spento si vede spento (opacita' e cursore).

Il tempo totale della scheda adesso legge il recupero vero. Prima prendeva il
primo numero della cella: 1'30" contava 1 secondo e 2-3' contava 2 secondi, e la
stima "S1 x serie x TUT + recuperi" era sbagliata di un pezzo. Un valore singolo
vale se stesso, un intervallo vale la media dei due estremi (2-3' -> 150").

Lo zero buttato li' resta una frase senza valore, come dal passo 14: "0", "0 sec",
"0,00'" non diventano 0". Lo zero scritto come tempo (0", 0') invece e' un valore,
perche' e' il limite basso del recupero. Una cifra sola con il segno dei secondi
(1") da sola non e' un recupero: resta dentro la frase.

File toccati: comune/tut-rec.js (REC_MIN 0, REC_MAX 600, secondiPezzo,
intervalloSecondi, testoIntervallo, motivoPassoRecupero, passoRecupero),
comune/vista-programma.js (i due pulsantini si spengono col motivo e si
riaccendono, il tempo totale legge il recupero vero), comune/dashboard-b.css
(.stp:disabled), tests/110-recupero-limiti.test.mjs (nuovo, 6 test), tests/57 e
tests/61 aggiornati alle nuove regole. Suite: TOTALE pass 595 fail 0 file 87/87.

## PASSO 3d (17/11/2026)

Alice preme «Metti in bozza» e legge: «il programma scelto non e' fra quelli di
B: non ho scritto niente». Il rifiuto era sbagliato: il programma ERA in B. La
pagina mostra solo dati di B (desktop/app-v31.js legge leggiZonaBCompleta e non
ripiega mai su A), e il tasto «Metti in bozza» compare solo quando il profilo
dice «Attivo», cioe' quando un documento di B e' attivo. Se il programma si
vede, in B c'e'.

Il difetto era l'id. Il profilo porta l'id DENTRO il documento
(comune/programma.js:176, profilo.id = testo(programma.id), cioe'
programMeta.id), mentre i documenti di B si chiamano program-v2-meta-... e
l'editor cercava l'id del documento (comune/editor-schede-b.js, id:
String(d.id)). Due id diversi, un confronto solo: testo(p.id) ===
testo(idScelto) in comune/attiva-programma.js non poteva che fallire.

Cosa cambia: trovaProgramma accetta l'id del documento, l'id interno
(idInterno, che l'editor mette quando legge B) e programId. La scrittura
continua a usare l'id del DOCUMENTO: daScrivere[0].id resta
program-v2-meta-..., ed e' su quello che passano leggiProgrammaB e
salvaProgrammaConVersione. «Attiva» e «Metti in bozza» funzionano sul programma
vero, senza portare niente da nessuna parte.

Il rifiuto, quando capita davvero (un id che non esiste fra i documenti di B),
adesso porta nonInB: true e quantiB, e la pagina apre un riquadro dentro la
pagina con nome e numero: «Il programma "X" non e' fra i documenti di B (in B
ce ne sono N)», e dice che non ha toccato niente. Niente finestrelle del
browser.

Da fare, e sta scritto qui come rischio da gestire: il tasto «Porta in B» per
un solo programma. Il port va fatto dalla pagina Copia (l'unica che legge A per
davvero), copiando il documento con LO STESSO id piu' copiatoDaA: true e
copiatoIl. Perche' e' un rischio: il «giorno del cambio», quando si rifa' la
copia finale da A, deve riconoscere i documenti con copiatoDaA e fare il merge
per id, non duplicarli. Se il merge manca, la copia finale sovrascrive la
versione lavorata in B: e' il punto da provare prima del cambio.

File toccati: comune/attiva-programma.js (trovaProgramma, idCorrisponde,
nonInB/quantiB), comune/editor-schede-b.js (idInterno sulle tre letture dei
programmi), desktop/app-v31.js (il rifiuto nonInB torna alla pagina),
comune/vista-programma.js (apriNonInB),
tests/111-programma-ricerca-id.test.mjs (nuovo, 4 test). Suite: TOTALE pass 595
fail 0 file 88/88.

## Idee scartate (18 novembre 2026)

- **Porta in B (un programma alla volta da A)**: scartato, ramo `idee/porta-in-b`; si riprende solo se serve. Il difetto vero era il confronto di id, curato nel 3d; il tasto avrebbe aggiunto un secondo meccanismo con rischio di doppioni al giorno del cambio.

## PASSO 4a — il piano della scheda (scarico e test), la testata del programma

Fatto il 18 novembre 2026. Tre cose: i campi veri nella testata della scheda, la
testata del programma (data di inizio e fase), e il «2°» tolto.

**Cosa si scrive, e dove.** Un campo solo per ogni cosa:

| Cosa | Dove sta nel documento | Forma |
|---|---|---|
| Scarico | `sheet.pianoScarico` | `{ settimana: N, volume: NN }` |
| Test | `sheet.pianoTest` | `{ settimana: N }` |
| Data inizio | documento programma | `startDate` (`aaaa-mm-gg`) |
| Fase | documento programma | `phase` (Bulk, Cut, Recomp, Mantenimento) |

La settimana di scarico segna anche la settimana come «deload» in ogni riga che
ha quella settimana, così il campo e la scheda dicono la stessa cosa. Le serie e
le ripetizioni non si toccano: la percentuale è un'annotazione, e la prova 113.2
lo verifica (volume della scheda identico prima e dopo).

**Validazione.** Settimana: intero dentro 1…N, dove N è la settimana più lunga
scritta nella scheda (`settimaneScheda`). Percentuale: intero 0…100. Data: deve
esistere nel calendario (il 30 febbraio si rifiuta). Fase: una delle quattro.
Vuoto vuol dire «non registrato», e si può svuotare: il piano sparisce e la
settimana torna com'era.

**Registro e Annulla.** Una voce per modifica (`piano-scheda`,
`testata-programma`), e l'Annulla rimette i valori di prima, compreso il tipo
delle settimane. La voce della testata porta l'id del programma, perché si
annulla sul documento del programma, non su una scheda.

**Il disegno, in due tempi.** `comune/vista-programma.js` resta di sola lettura:
disegna il campo e lascia il segnaposto `data-pr-c` (più `data-pr-scheda` sul
riquadro). `comune/piano-vivo.js` — modulo nuovo, senza Firebase — trasforma il
segnaposto in un controllo vero: riempie il valore salvato, manda la modifica,
e sulla pagina non usa mai `alert`/`confirm`: gli errori vanno nella riga di
stato della pagina. Sta fuori da `app-v31.js` proprio per poterlo provare con
jsdom. Dopo ogni scrittura la pagina rilegge: il valore a schermo è quello
salvato, anche dopo un Annulla.

**Il «2°» è stato tolto.** Una riga sola in `comune/vista-programma.js` (riga
~1500, dentro `pannelloScheda`): etichetta, casella e codice che la disegnava.
Nessun test lo nominava, nessun campo `secondoScarico` esiste nei dati, e
nessuna funzione lo leggeva. La riga 3792 di `desktop/index.html` — il campo
`pr-sk-due` del mockup statico — **non è stata toccata**: nella pagina vera la
testata la disegna `pannelloScheda`, e `app-v31.js` non nomina mai `pr-sk-due`.
La prova 113.9 lo verifica sul rendering: nella pagina vera non esiste nessun
«2°», né come etichetta né come testo.

**Idee future, da fare solo se serve.**

- **`2° scarico`**: si aggiunge solo se Alice farà blocchi più lunghi di 8
  settimane. Oggi ogni blocco ha un solo scarico.
- **`extra-1` — una funzione sola per la settimana di test.** Oggi il campo Test
  segna `type: "test"` sulla settimana, mentre la spia rosa «Test» si accende
  dalla parola «test» scritta nelle celle: sono due fonti diverse e possono
  contraddirsi (settimana segnata test, celle senza la parola). Il passo è
  `settimanaDiTest(scheda)`: legge prima il tipo, e solo se manca guarda la
  parola; spia e campo leggono da lì. Non è stato fatto qui di proposito: il 4a
  non tocca la spia.

**Prove.** `tests/113-piano-scheda.test.mjs`, 11 prove: piano letto e vuoto,
invarianza del volume (serie e ripetizioni identiche), settimana segnata come
deload, rifiuti di settimana e percentuale fuori misura, Annulla del test e
dello scarico (piano e tipo di prima), testata del programma con data vera e
rifiuto del 30 febbraio, API dell'editor, e due prove sulla pagina vera con
jsdom (nessun «2°»; campi che mostrano il valore salvato e mandano la modifica
con settimana e percentuale insieme).

**Cosa non è provato.** La scrittura vera su Firestore: le prove usano un editor
finto, la zona B finta e jsdom, non il database. La resa a schermo nei due temi
non è stata guardata a occhio: i campi usano le classi `pr-in`/`pr-sel`/`pr-f`
già esistenti, quindi non c'è CSS nuovo — ma questo è un argomento, non una
verifica.

## PASSO 4a-bis — il valore che spariva uscendo dal campo (18 novembre 2026)

Alice lo ha visto sulla pagina vera: scriveva la settimana di scarico e la
percentuale, usciva dal campo, e il valore spariva senza un messaggio.

**La causa e' la (c): il valore si scriveva, la lettura non lo ritrovava.**
La scrittura andava a buon fine (`pianoScarico` finiva davvero nella scheda in
zona B), ma i piani che la pagina tiene in mano erano indicizzati con una chiave
sola — `dati.sheetId || sheet.id` — mentre la vista chiede la scheda con
`scheda.id`, che per una scheda copiata da A e' `sheet.id`. Quando i due campi
non coincidono (ed e' il caso normale: `sheetId: "s-A"`, `sheet.id: "sh-A"`) la
vista cercava una chiave che non esisteva, il piano le arrivava `null` e
riscriveva il campo vuoto. Nessun errore, perche' non c'era nessun errore da
scrivere: il difetto era tutto nella lettura.

Non era lo stesso difetto del PASSO 3d: la' si confrontavano id di documento
contro id interno, qui due id della stessa scheda. Ma la lezione e' la stessa, e
la cura e' la stessa: **una sola funzione** che dice quale documento e' quella
scheda, usata da chi scrive e da chi legge.

### Cosa e' cambiato

- `comune/piano-scheda.js`: nuova `pianiDalleSchede(documenti)`, che indicizza
  il piano con **tutti** gli id della scheda (`sheetId`, `sheet.id`, id del
  documento) e salta archiviate e documenti archiviati. Nuova
  `settimaneEsercizi(esercizi)`, che `settimaneScheda` ora usa: le settimane
  della scheda si contano in un posto solo.
- `desktop/app-v31.js`: il blocco che raccoglieva i piani a mano e' sostituito
  da `pianiDalleSchede(schedeGrezze)`. Scrittura e lettura passano dalla stessa
  funzione, quindi non possono piu' divergere.
- `comune/vista-programma.js`: `campoPiano` accetta un oggetto di opzioni
  (tooltip, segnaposto, suffisso) e le voci di tendina come `{ valore, testo }`.
  **Scarico e Test sono tendine** con «—» e «S1»…«SN» (N = settimane scritte
  davvero nella scheda, non otto per forza). **Vol −%** e' un numero con il
  segno `%` accanto e il tooltip «di quanto togli il volume in quella
  settimana, es. 40». Tooltip sulle etichette: Scarico «settimana dello
  scarico», Test «settimana del test». La voce vuota della tendina dice «—».
- `comune/piano-vivo.js`: riscritto.
  - si scrive **solo sul cambio** (change/blur o Invio), mai a ogni tasto;
  - **mentre il campo ha il fuoco la pagina non si ridisegna**: il ridisegno
    parte quando il fuoco esce (`dopoIlFuoco`). Prima poteva essere sostituito
    l'elemento sotto le dita;
  - un rifiuto **non e' piu' un silenzio**: la riga di stato dice «Scarico non
    salvato: <motivo>» (e cosi' per Test, Data di inizio, Fase) e **il campo
    tiene quello che Alice ha scritto** finche' non lo corregge;
  - dopo un ridisegno e dopo un Annulla il campo mostra il valore SALVATO.

### Le prove (`tests/114-piano-pagina-vera.test.mjs`, 7 prove)

Pagina vera (`desktop/index.html`) + `renderProgramma` + **editor vero**
(`creaEditorSchede`) sopra una zona B finta in memoria che registra le
scritture. Scheda con `sheetId: "s-A"` e `sheet.id: "sh-A"`, come i documenti
che arrivano da A.

1. la stessa scheda si trova con tutti i suoi id (la causa);
2. Scarico e Test sono tendine «—, S1…S8», Vol ha `%` e tooltip, etichette con
   tooltip;
3. S4 + 40 arrivano in zona B (`pianoScarico { settimana: 4, volume: 40 }`),
   la settimana 4 e' `deload` su tutte le righe, e dopo il ridisegno i campi
   mostrano ancora S4 e 40;
4. scrittura rifiutata (versione cambiata sotto): messaggio «Scarico non
   salvato: …versione…» visibile e valore scelto mantenuto, disco intatto;
5. Annulla: il piano esce dalla scheda e la tendina torna a «—»;
6. Data inizio e Fase arrivano in zona B e resistono al ridisegno;
7. con il fuoco dentro il campo la pagina non si ridisegna; uscendo, si
   ridisegna e il valore resta.

`tests/113` aggiornato dove il comportamento e' cambiato per scelta di Alice:
una data impossibile (31/02/2026) ora **resta scritta** con il messaggio
«Data di inizio non salvata: …», invece di essere cancellata in silenzio.

### Cosa le prove NON coprono

La scrittura vera su Firestore con le regole vere: qui il database e' finto e
in memoria, l'editor e' quello vero ma il filo verso il cloud no. Quindi resta
da guardare a mano, sulla pagina vera, che il salvataggio passi con le regole
di produzione — tutto il resto del giro (validazione, versione, registro,
ridisegno, Annulla) e' provato.

### Riconciliazione dei numeri

La suite contava 610 prove su 89 file con il 113 fuori dalle fette. Il 113 e'
dentro `fette.txt`, il 114 entra con questa consegna: il totale atteso e'
**90 file**. Il numero delle prove sale di 11 (113) + 7 (114).

## PASSO 4a-ter — le tendine che sparivano nel bianco, la testata in una riga, la pillola via (18 novembre 2026)

### 1. Il difetto delle tendine (causa: una sola, il menu lo disegna il sistema)
Alice apre la tendina dello Scarico: le voci S1…S8 ci sono, ma sono grigio
chiarissimo su fondo BIANCO. Solo quella sotto il mouse si legge.
Non era un colore nostro sbagliato: il menu a comparsa di una `<select>` lo
disegna il sistema operativo. Il testo della voce ereditava il chiaro del tema
scuro (il nostro `color`), mentre il fondo del menu restava quello bianco di
sistema. Nessuna regola dava un fondo alle voci, quindi il sistema metteva il suo.

Correzione, in **un solo posto** del CSS (`desktop/index.html`, dentro il blocco
del tema, subito prima di «Programmi nel chiaro»):

```
html[data-theme="dark"]{color-scheme:dark}
html[data-theme="light"]{color-scheme:light}
select,select option{color:#F3EAF9;background-color:#241634}
html[data-theme="light"] select,html[data-theme="light"] select option{color:#281738;background-color:#FFFFFF}
```

Il selettore è d'elemento (`select option`): vale per **ogni** tendina dell'app,
presente e futura — Fase, Test, Scarico, le tendine del Database, i selettori
dei riquadri, le tendine della libreria e dei filtri. Non una regola per
tendina. `color-scheme` dice al sistema quale tema disegnare, così anche il
bordo e il fondo del menu seguono il tema.

Contrasti (formula del test 86): scuro `#F3EAF9` su `#241634` = 13,0:1; chiaro
`#281738` su `#FFFFFF` = 18,0:1. Tutti e due sopra 4,5:1.

**Altre tendine con lo stesso difetto:** sì, tutte quelle che non dichiaravano
un fondo per le voci — cioè quasi tutte (`.sel`, `.db-sel`, `.lb-sel`, `.t8-sel`,
`.pr-psel`, `.cv-cerca`, `#bd-diva .dv-panel select`). La regola d'elemento le
copre tutte in un colpo, comprese quelle che l'app costruisce a riga di codice.

### 2. La testata in una riga
`#pag-programma-1 .pr-shd-f` è una fila (`display:flex`) che va a capo in modo
ordinato (`flex-wrap:wrap`) quando la finestra è stretta: Settimane | Scarico |
Vol −% | Test, ognuno con l'etichetta sopra e il campo sotto, tutti della stessa
larghezza (96px, una regola sola) e della stessa altezza (34px, una regola sola).

Il segno `%` ora sta **dentro** il campo: il guscio `.pr-suf-box` è
`position:relative` e il segno è `position:absolute;right:10px`. L'input ha
`padding-right:28px`, così il numero non finisce sotto il segno.

Il campo Vol −% **nasce spento** (`disattivato: true` nella vista,
`vol.disabled = !acceso` in `piano-vivo.js`) e si accende quando si sceglie una
settimana di scarico; da spento porta il tooltip «scegli prima la settimana
dello scarico». Scegliere la settimana senza avere ancora scritto la
percentuale non è un errore: la riga di stato dice «S4 scelta: scrivi la
percentuale di volume» e il campo si accende.

### 3. La pillola «S— vol non registrato»
Tolta dal pannello vivo: era il riassunto del v31 e ora doppiava i campi.
Eliminati, in `comune/vista-programma.js`, la creazione del `span.pr-chip-s4`
con `data-pr-c="scarico-chip"` e il suo `appendChild` (3 righe); in
`comune/piano-vivo.js` la riga che lo cercava e il blocco `if (chip) { … }` che
lo riscriveva (7 righe). Il riassunto non si mostra più in nessuna forma: la
conferma arriva dalla riga di stato («scarico salvato: S4 · volume −40%»).

**Markup statico:** non toccato, nessuna riga di `desktop/index.html` cambiata
nel corpo della pagina. Le uniche modifiche al file sono righe di CSS: il blocco
delle tendine (11 righe nuove prima di «Programmi nel chiaro») e il blocco
`pr-shd-f`/`pr-f-sm` sostituito da 11 righe (fila, altezze, `%` dentro il
campo, campo spento, media query per la finestra stretta). La regola
`.pr-chip-s4` resta dov'era perché la usa il mockup statico della pagina.

### 4. Da dove veniva S1 nel campo Test
Non c'era nessun default, e questo è il punto: nel codice `pianoTest` viene
scritto **solo** dalla tendina del Test (`cambiaPianoScheda` con
`campo: "test"`) e letto solo da `leggiPiano`. Senza `pianoTest` nel documento
il campo deve mostrare «—». Per sicurezza ora la tendina viene forzata:
`controllo.value = valore ? String(valore) : ""` e, se il valore non esiste tra
le voci, `selectedIndex = 0` — così non può comparire la prima voce al posto di
un dato che non c'è. Se in una scheda comparisse ancora S1, quel documento
porta davvero `pianoTest { settimana: 1 }` scritto in un passaggio precedente.

## PASSO 4b, commit 1 — copiare esercizi da una scheda all'altra (18 novembre 2026)

**Cosa fa.** Il tasto «Copia/Sposta esercizi» della barra della scheda non è più spento e non porta più la pillola «demo»: apre un riquadro **dentro la pagina** (mai una finestra del browser) con la scheda di partenza già scritta, il menu della scheda di destinazione (solo le altre schede di questo programma), l'elenco degli esercizi della partenza con le spunte — più esercizi insieme — e il tasto «Avanti». Il secondo passo è la domanda con i numeri esatti: «Copi 3 esercizi e 1 riga tecnica dalla Scheda A alla Scheda E?». Si conferma solo con il clic: Invio non scrive, Esc chiude.

**Il linguaggio.** Nell'app le giornate sono le SCHEDE (A, B, C, D): nei testi e nel registro si legge «esercizio copiato nella Scheda B», mai «giorno». La copia vale dentro il programma attivo: non esiste un passaggio da un atleta all'altro.

**Cosa viaggia con l'esercizio.** Serie, ripetizioni, nota, recupero e le otto settimane identici; id nuovo per ogni riga copiata, mai un id già in giro (neanche su una riga tolta). La riga tecnica figlia segue sempre il padre e il suo `padreId` punta al **nuovo** id del padre. Una superserie si copia solo se sono spuntati **tutti** i suoi membri: in quel caso la copia riceve un identificativo di gruppo nuovo; se ne spunti una parte, la copia arriva senza legame e la pagina lo dice («le superserie spuntate solo in parte arrivano senza legame: [Rematore + Pulley]»). In fondo alla scheda di destinazione, nell'ordine della partenza. Il Logbook non si tocca mai.

**Doppioni.** Se nella destinazione c'è già una riga con lo stesso nome il motore **non scrive** e restituisce l'elenco: il riquadro mostra quali sono e offre «Sostituisci» (l'esistente esce, con le sue righe tecniche, e la copia prende il suo posto) oppure «Aggiungi ugualmente» (resta anche l'esistente), più «Annulla». Nessuna aggiunta silenziosa, mai.

**Scritture e Annulla.** Una scrittura sulla destinazione; per lo sposta, prima la destinazione e poi la partenza — se la seconda non passa la copia resta e il messaggio dice «esercizi copiati ma non tolti dalla scheda di partenza». Una **sola voce di registro** per tutta l'operazione, con la fotografia delle schede toccate: un solo Annulla rimette tutti i lati, e se una metà non passa lo dichiara («esercizi rimessi in 1 schede su 2»).

**Prove.** `tests/116-copia-esercizi.test.mjs`, undici prove sulla pagina vera con l'editor vero e una zona B finta che registra: riquadro e spunte, numeri della conferma, id nuovi e settimane intatte, originale intatto, figlia tecnica col nuovo padreId, superserie intera con legame nuovo e parziale senza, doppione che avvisa senza scrivere poi «Aggiungi ugualmente» e «Sostituisci», Annulla che rimette la destinazione, stessa scheda rifiutata, nessuna scrittura fuori da schede e registro, sposta con la seconda scrittura che fallisce.

**Cosa non ho potuto guardare.** Nessun browser vero (jsdom): la resa grafica del riquadro non è stata fotografata, e lo Sposta non ha ancora il suo comando nella pagina — arriva nel commit 2, come da spezzatura concordata.
