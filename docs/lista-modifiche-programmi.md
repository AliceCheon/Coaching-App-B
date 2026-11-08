# Programmi — le richieste di Alice, in quest'ordine (8 novembre 2026)

Elenco dettato da Alice, nell'ordine in cui vanno fatte. La quarta sta per ultima
perche' chiede un campo nuovo nei dati.

Il sorgente del v31 e' `pc/index.html` (10.778 righe): `desktop/index.html` ne e'
la copia con le modifiche dichiarate. I numeri di riga qui sotto sono di
`pc/index.html`.

## 1. Rec — freccetta a tendina con i valori preimpostati

Cosa chiede: una tendina con 30", 1', 1'30", 2', 2'30", 3', piu' due voci speciali
«1'30" e cambio gamba» e «1'30" e cambio braccio», e una voce «Scrivi libero» per
il testo libero. I pulsanti + e − restano e vanno avanti e indietro di 30".

Nel v31: il Rec e' una cella di testo libero — `td.c-rec` con `<span class="rec"
contenteditable="true">` costruita a r.9862 — piu' due pulsantini + e − accanto
(`td.c-rec .stp`, r.6926-6927): si scrive a mano e si aumenta a mano, **non c'e'
nessuna tendina**. Le voci con il cambio di lato e «Scrivi libero» non esistono.

## 2. TUT — tendina con gli schemi, e via i pulsanti

Cosa chiede: il TUT e' un tempo di esecuzione, non una durata. Tendina con
2-0-2, 2-1-0, 0-1-2, 3-0-1, 3-1-1, 4-0-1 e «Scrivi libero». I pulsanti + e − del
TUT vanno tolti: non servono.

Nel v31: anche il TUT e' solo testo libero — `<span class="tut"
contenteditable="true">` a r.9863, in stile grigio e piccolo (r.6928) — con
**nessuna tendina e nessun pulsante** accanto: non c'e' niente da togliere, c'e'
solo da aggiungere la scelta.

## 3. «Inserisci progressione sotto» → Custom

Cosa chiede: oggi ricopia la settimana 1 in tutte le settimane. Deve invece
aggiungere UNA riga sotto, collegata all'esercizio corrispondente.

Nel v31: e' esattamente cosi'. Il tastino «+» della riga si chiama «inserisci
progressione sotto» (r.9853) ma non inserisce niente: al clic fa partire
«Applica progressione» (r.7363), che apre il pannello delle progressioni con la
scritta «applica alle 8 settimane» (r.7306) e lo applica a S1…S8 con un ciclo
(r.7323-7328); la voce «Custom» descrive se stessa come «Copia la settimana 1 su
tutte le settimane» (r.9049). In piu' c'e' l'«Applica progressione a tutta la
scheda» (r.3771) che fa lo stesso su tutte le righe.

## 4. Superserie — tastino con le frecce verso il basso (per ultima)

Cosa chiede: al posto della scritta dx/sx sotto i pulsantini T F R P, un tastino
con le frecce verso il basso che crea una superserie con l'esercizio subito sotto.
La superserie evidenzia con un colore leggermente piu' chiaro o piu' scuro (secondo
il tema) tutte le righe coinvolte, comprese le 8 settimane. Serve un campo nuovo
nei dati: quindi si fa per ultima.

Nel v31: sotto i tastini T F R P (r.9845-9849) c'e' la scritta «⇄ DX/SX» (r.9856),
uno `<span>` fermo, 8px grigio (r.7979): non si clicca e non fa niente. Di
superserie nel v31 resta solo la parola dentro i dati importati — `"tecnica":
"superset"` e la nota «in superserie con i calf» (r.5145) — cioe' un'etichetta
scritta a mano, senza un campo che tenga insieme le due righe e senza nessuna
evidenza a schermo.
