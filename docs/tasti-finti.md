# I tasti che non fanno niente

Inventario dei pulsanti, tasti e controlli che nel v31 (`pc/index.html`) e nella copia B
si vedono ma non fanno niente, o sono soltanto dimostrativi. Generato leggendo il codice
il 10 novembre 2026: la riga del v31 e' quella dove il tasto compare, la riga di B e' quella
dove nasce spento (`pulsanteSpento` / `pulsanteConEtichetta`).

Nota di lettura: nel v31 quasi tutti i comandi esistono e funzionano; quelli spenti in B
sono spenti perche' la pagina di B non scrive (o non scriveva). La colonna «cosa dovrebbe
fare» riporta il testo che il codice stesso dichiara, non una mia ipotesi.

## Programma  (`comune/vista-programma.js`)

| Tasto come lo vede Alice | riga in B | riga nel v31 | pagina nel v31 | cosa dovrebbe fare |
|---|---|---|---|---|
| \u21b6 Annulla | 618 | non trovato | - | annulla l'ultima modifica |
| \ud83d\udcda Libreria Coach | 629 | non trovato | - | apre la Libreria Coach |
| ⬆ Importa da PDF | 657 | 3702 | pag-programma-1 | un PDF di scheda diventa una scheda nuova |
| Cambia | 766 | 3725 | pag-programma-1 | cambia la data di visibilità |
| Attiva | 770 | 3724 | pag-programma-1 | mette il programma come attivo |
| Cambia | 771 | 3725 | pag-programma-1 | cambia il programma |
| Confronta con… | 772 | 3726 | pag-programma-1 | confronta con un altro programma |
| Copia da Prog… | 773 | 3726 | pag-programma-1 | copia da un altro programma |
| ⭐ Salva in Libreria | 774 | 3726 | pag-programma-1 | salva il programma in libreria |
| chplus | 922 | non trovato | - | tecniche di intensità |
| \u2715 | 930 | 9851 | pag-archivio | cancella riga |
| \u21c4 | 931 | 9852 | pag-archivio | sostituisci esercizio |
| \uff0b | 938 | 9853 | pag-archivio | inserisci progressione sotto |
| tb-prog btn-prog | 957 | non trovato | - | applica progressione |
| \u2212 | 1006 | non trovato | - | meno 30 secondi |
| + | 1010 | 3804 | pag-programma-1 | pi\u00f9 30 secondi |
| Applica sett./scarico a tutte le schede | 1055 | 3757 | pag-programma-1 | applica settimane e scarico a tutte le schede |
| + Nuova progressione | 1066 | non trovato | - | demo |
| Progressioni | 1067 | 1486 | - | apre le progressioni |
| Periodizzazione | 1068 | 3741 | pag-programma-1 | apre la periodizzazione |
| Copia/Sposta esercizi | 1069 | non trovato | - | demo |
| Spiegazioni (4/4) | 1070 | 3765 | pag-programma-1 | apre le spiegazioni |
| Stampa Compatta | 1071 | 3766 | pag-programma-1 | stampa la scheda così com'è |
| Stampa da Compilare | 1072 | 3769 | pag-programma-1 | stampa la scheda con le caselle vuote |
| Suggerimenti: ON | 1073 | 3770 | pag-programma-1 | accende o spegne i suggerimenti |
| Salva come scheletro | 1085 | 3771 | pag-programma-1 | salva la scheda come scheletro |
| Svuota scheda | 1086 | 3772 | pag-programma-1 | svuota la scheda |
| Svuota tutto il programma | 1087 | 3773 | pag-programma-1 | svuota tutto il programma |
| ↺ ripristina scheda | 1088 | 3804 | pag-programma-1 | riporta la scheda a com'era |

## I tasti con la pillola «demo» nel v31

Sono i comandi che il v31 stesso dichiara dimostrativi: si vedono, mostrano come funzionera',
non salvano niente. Sono le righe che portano la pillola `pr-demo`.

| riga nel v31 | pagina nel v31 | testo sulla riga |
|---|---|---|
| 3761 | pag-programma-1 | + Nuova progressione demo |
| 3764 | pag-programma-1 | Copia/Sposta esercizi demo |
| 3874 | pag-programma-1 | Applica a Prog 2 demo ⬇ 🗑 |
| 3899 | pag-programma-1 | Scegli un PDF… parsing demo |
| 7643 | pag-archivio | #pag-programma-1 .pr-demo{ |
| 8879 | pag-archivio | ' Applica a Prog 2 demo ' + |

## Cosa e' gia' vivo in B (aggiornamento 12 novembre 2026)

Questi non sono piu' spenti: sono stati collegati nei passi 9-21 e hanno una prova nella suite.

- Celle **serie** e **rips** delle otto settimane (passo 9).
- Celle **Rec** e **TUT** (passi 10-19).
- Il pulsante **Annulla** in testa alla schermata: riporta indietro l'ultima modifica e cita la voce annullata.
- Il pulsante **Database esercizi** in testa a Programma: dal passo 35 apre il selettore del catalogo dei 179 esercizi del v31 (ricerca per nome o distretto, clic per scegliere, Esc per chiudere); la scelta torna all'app e non scrive niente. La **Libreria Coach** accanto resta spenta.
- **x** della riga: toglie l'esercizio (`deletedAt`) e l'Annulla lo rimette (passo 20).
- **+** della riga: dal passo 28 è volutamente disabilitato, riservato alle future superserie; non apre le progressioni.
- **Applica progressione** della riga: apre le 21 voci, applica alla singola riga e consente Annulla (passi 20/28).
- **Applica progressione a tutta la scheda**: le 13 voci con Custom, su tutte le righe, un solo Annulla (passo 21).
- **Escludi seduta** nel Logbook: due scritture, la seduta sparisce dalle letture.
- I **filtri** del Logbook, la tabella delle sedute vere, la tabella del Programma, l'Archivio dei programmi.

Tutto il resto che compare in questo elenco e' ancora spento: e' la lista delle cose da far vivere.

## Ctrl+Z e Annulla — passo 29, 11 novembre 2026

Il pulsante non era finto: chiamava editor.annulla() sul registro B. La scorciatoia leggeva invece stack/HIST del v31, non alimentate dalle modifiche B. Correzione locale, con eccezione HTML autorizzata da Alice: Ctrl+Z/Cmd+Z nella pagina Programma B aziona proprio lo stesso pulsante, rispettandone lo stato disabled e impedendo i gestori storici. Dopo il salvataggio di una cella lo stato del pulsante viene riallineato al registro senza ridisegnare. Nessun Rifai B implementato; Ctrl+Shift+Z e Ctrl+Y non sono dichiarati funzionanti sul registro B. Test 76: 4 verdi; riprodotto prima il difetto, verificati cancellazione, serie, ripetizioni, annullaDi e assenza di doppie scritture. Numeri della tabella iniziale storici, non riferimenti aggiornati. Nessun dato reale modificato; nessun commit o push in questo passo.

Verifica finale passo 29: suite tranne 63 con 361 verdi e quattro rossi preesistenti 64.4/69.3/69.4/69.6. Ctrl+Z è provato dai quattro verdi della 76; i rossi di scheda/ripristino non sono dichiarati risolti.

Prova 63 separata: 5/5 verdi. Modifiche solo locali, nessun commit né push.

## Passo 30 — precedenza al testo nei campi
Ctrl+Z/Cmd+Z dentro input, ricerca, textarea e celle modificabili non richiama Annulla scheda; il browser mantiene la cronologia del testo. Fuori dai campi resta il collegamento al pulsante B. Le celle salvano su uscita o Invio, non a ogni carattere. Database esercizi resta spento: il test apre soltanto il DOM storico del suo modale. Nessun Rifai B aggiunto.

Esiti finali passo 30: test 76, 10/10 verdi; suite tranne 63, 367 verdi e quattro rossi 64.4/69.3/69.4/69.6; 63 separata, 5/5 verdi. Meta+Z verificato non intercettato su Windows; annullamento nativo macOS da confermare su Mac. Alice richiede push dopo la comunicazione dei rossi, non dichiarati risolti.

## Passo B — Database esercizi aggiunge la riga, 12 novembre 2026

Il pulsante **🗄 Database esercizi** non e’ piu’ solo un selettore: la scelta di un esercizio aggiunge la riga IN FONDO alla scheda aperta (nome scelto, distretto del catalogo verbatim nel campo muscolo, serie e ripetizioni vuote, otto settimane, id nuovo mai riutilizzato). **Ctrl+Z** e **↶ Annulla** tolgono la riga aggiunta (una voce di registro, annullata una volta sola). Senza scheda aperta o senza editor di scrittura la scelta resta senza effetto. Le righe gia’ presenti non vengono toccate: «Addome», «Attivazione» e le altre etichette restano come sono. Resta spento: **⇄ sostituisci esercizio**, **＋ superserie**, Libreria Coach, «+ Riga» della barra strumenti (l’aggiunta passa solo dal Database esercizi).

## Aggiornamento 12 novembre 2026 (passo B)

Vivo da oggi: **+ Riga** nella barra strumenti apre il selettore del Database esercizi (prova 79); alla scelta la riga si aggiunge in fondo alla scheda aperta (prova 78). Non e' piu' nell'elenco qui sopra: non e' piu' un tasto finto.
Tolti il 12 novembre 2026 (passo B.2, decisione di Alice):
- il pulsante **Database esercizi** della testa di Programma (non era mai stato attaccato alla pagina; la porta di aggiunta e' solo «+ Riga»);
- il **＋ grigio** accanto a ✕ e ⇄ (nel v31 diceva «inserisci progressione sotto»): la prova 66.8 ora verifica che non esista piu'.
Resta come sta: il tondo **⊕** delle tecniche di intensita' (chplus), spento in attesa delle future tecniche (superserie, rest pause, myo reps, drop set).



## Passo B.5 — il ⊕ delle tecniche di intensità è vivo (12 novembre 2026)

Il tondo **⊕** (chplus) non è più finto: apre il pannello con le tre voci (REST-PAUSE,
MYO-REPS, DROP SET); la tecnica scelta nasce come riga figlia sotto l'esercizio, col badge
che apre i parametri, la nota automatica/manuale e «Rimuovi tecnica». La riga figlia NON
conta negli esercizi e NON prende la progressione; ✕ sul padre la toglie con lui e
l'Annulla la rimette. Prova: tests/81-tecniche-intensita.test.mjs (13 verdi).
Restano spenti: ↕ sostituisci esercizio, Libreria Coach e tutto l'elenco qui sopra non
segnato come vivo. La riga VOLUME collegata è rimandata a Fase 2.
Nota sui 4 rossi 64.4/69.3/69.4/69.6 (pagina viva Playwright): chiusi ieri sera (passo 33: cinque giri di fila tutti verdi; passo 34: suite 385/385 e 390/390 senza rossi), sono tornati ROSSI in suite dopo la patch B.5 e VERDI al rilancio. Rilanci dedicati di oggi: tutti e quattro (64.4, 69.3, 69.4, 69.6) 3/3 verdi nei rilanci dedicati: stabili.
