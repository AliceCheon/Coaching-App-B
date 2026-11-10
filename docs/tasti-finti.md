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
| \ud83d\uddc4 Database esercizi | 628 | non trovato | - | apre il Database esercizi |
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
| + Riga | 1065 | 3760 | pag-programma-1 | aggiunge una riga alla scheda |
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

## Cosa e' gia' vivo in B (10 novembre 2026)

Questi non sono piu' spenti: sono stati collegati nei passi 9-21 e hanno una prova nella suite.

- Celle **serie** e **rips** delle otto settimane (passo 9).
- Celle **Rec** e **TUT** (passi 10-19).
- Il pulsante **Annulla** in testa alla schermata: riporta indietro l'ultima modifica e cita la voce annullata.
- **x** della riga: toglie l'esercizio (`deletedAt`) e l'Annulla lo rimette (passo 20).
- **+** della riga: apre le 21 progressioni del v31 e le applica alle otto settimane di quella riga (passo 20).
- **Applica progressione** della riga: le stesse 21 voci (passo 20).
- **Applica progressione a tutta la scheda**: le 13 voci con Custom, su tutte le righe, un solo Annulla (passo 21).
- **Escludi seduta** nel Logbook: due scritture, la seduta sparisce dalle letture.
- I **filtri** del Logbook, la tabella delle sedute vere, la tabella del Programma, l'Archivio dei programmi.

Tutto il resto che compare in questo elenco e' ancora spento: e' la lista delle cose da far vivere.
