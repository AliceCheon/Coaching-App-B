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
- **Commit 2**: `applica-scarico-tutte` con conferma e una voce; collezione `scheletri` + `salva-scheletro` con l'errore dichiarato; `tests/103` sulla pagina vera per «Applica sett./scarico».
- **B.21b**: portare sulla pagina vera i test 93 (fumo ⇄), 95 (spia Test), 97-98 (cornice e giunzione superserie).
