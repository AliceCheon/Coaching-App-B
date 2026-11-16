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
