# Esercizi e articolazioni — la tabella per lo stress

> Proposta di lavoro per il **passo 6** (stress per articolazione). Solo documento: legge il catalogo,
> non tocca il codice, non scrive su Firestore, non aggiunge tasti. La decisione è di Alice.

## 1. Come è nata

La fonte è una sola: `comune/catalogo-esercizi-b.js`, i **179 esercizi** veri del backup del gestionale,
ciascuno con il suo distretto. Il catalogo è congelato: qui non si riscrive un nome, si aggiunge solo
l'articolazione accanto.

Nel catalogo ci sono **0 esercizi senza distretto**: la colonna «distretto» è sempre piena.
Ci sono invece **13 righe che sono lo stesso esercizio scritto due volte** (nomi con un carattere
rovinato, tipo «30Â°», o con la maiuscola sbagliata): le ho lasciate tutte e 179 perché il catalogo è
congelato, e le ho segnate nella colonna «dubbio». Unirle è una decisione di Alice.

## 2. Le articolazioni che propongo

Otto, e nessuna inventata: sono quelle che il catalogo carica davvero.

| Articolazione | Esercizi in cui è la principale |
|---|---|
| spalla | 55 |
| gomito | 25 |
| polso | 0 |
| anca | 32 |
| ginocchio | 24 |
| caviglia | 6 |
| colonna lombare | 20 |
| colonna toracica | 17 |

**Il collo non c'è.** Non l'ho messo perché nel catalogo non esiste un solo esercizio che carichi il
collo: metterlo vorrebbe dire inventare una articolazione che non serve a nessun conto.

Le articolazioni che compaiono solo come secondarie sono **polso** (nei curl, dove tiene la presa):
da principale non tocca a nessun esercizio. La colonna secondarie non supera mai **2 voci**, come chiesto.

## 3. La regola di punteggio

Scritta in chiaro, così non ci sono sorprese quando la usiamo:

- **1 punto** all'articolazione **principale** dell'esercizio;
- **0,5 punti** a ciascuna articolazione **secondaria**;
- **un esercizio non può dare più di 2 punti in totale**, comunque sia fatta la riga.

Con questa tabella il tetto non taglia niente: una principale più due secondarie fanno esattamente
1 + 0,5 + 0,5 = **2**. Il tetto serve se un giorno una riga avesse tre secondarie: in quel caso si
tengono le due che contano e la terza non entra.

Due casi da tenere presenti:

- un esercizio **senza articolazione** (oggi solo Tabata, che è un formato e non un gesto) dà **0 punti**
  finché Alice non decide come contarlo;
- un esercizio che compare in **più schede** dà i suoi punti **una volta per scheda**: è la stessa cosa
  che l'Analisi programmazione chiama sovrapposizione.

## 4. La tabella dei 179 esercizi

Ordine e nomi sono quelli del catalogo, identici. «Dubbio» vuoto (—) vuol dire che la scelta è
sicura.

| # | Esercizio | Distretto | Principale | Secondarie | Dubbio |
|---|---|---|---|---|---|
| 1 | Ab Roll | Addominali | spalla | colonna lombare | il carico vero e' l'antiestensione del core: se vuoi il core principale, metti colonna lombare |
| 2 | Abductor | Glutei | anca | — | — |
| 3 | Addominali livello 1 | Addominali | colonna lombare | anca | core generico: non so se il gesto e' flessione del tronco o tenuta |
| 4 | Adductor | Quadricipiti | anca | — | — |
| 5 | Affondi al multypower | Quadricipiti | anca | ginocchio, caviglia | — |
| 6 | Affondi forntali manubri | Quadricipiti | anca | ginocchio, caviglia | — |
| 7 | Affondo con rotazione busto triset | Glutei | anca | ginocchio, colonna lombare | — |
| 8 | Affondo pesante triset | Glutei | anca | ginocchio, caviglia | — |
| 9 | Alzata laterale su panca inclinata 30° | Spalle | spalla | — | — |
| 10 | Alzata laterale su panca inclinata 30Â° | Spalle | spalla | — | doppione del nome con carattere rovinato (30Â°): e' l'esercizio della riga sopra |
| 11 | Alzate deltoidi posteriori | Spalle | spalla | colonna toracica | — |
| 12 | Alzate laterali | Spalle | spalla | — | — |
| 13 | Alzate laterali + alzate frontali panca 70° | Spalle | spalla | colonna toracica | — |
| 14 | Alzate laterali + alzate frontali panca 70Â° | Spalle | spalla | colonna toracica | doppione del nome con carattere rovinato (70Â°): e' l'esercizio della riga sopra |
| 15 | Alzate laterali cavo basso cavigliera polso | Spalle | spalla | — | — |
| 16 | Alzate laterali macchinario | Spalle | spalla | — | — |
| 17 | Alzate laterali Seduta | Spalle | spalla | — | — |
| 18 | Arnold Press | Spalle | spalla | gomito | — |
| 19 | Bulgaro focus glutei | Glutei | anca | ginocchio, caviglia | — |
| 20 | Burbees | Cardio | anca | ginocchio, spalla | cardio a corpo libero: il gesto cambia a ogni fase, la spalla e' l'appoggio |
| 21 | Calf al multypower | Polpacci | caviglia | ginocchio | — |
| 22 | Calf Frog | Polpacci | caviglia | ginocchio | — |
| 23 | Calf machine | Polpacci | caviglia | — | — |
| 24 | Cardio tapins + corsa | Cardio | ginocchio | anca, caviglia | corsa sul posto: il carico e' di ginocchio e anca, non di un solo gesto |
| 25 | Chest press | Petto | spalla | gomito | — |
| 26 | Clam shell side plank | Glutei | anca | colonna lombare | — |
| 27 | Croci ai cavi | Petto | spalla | gomito | — |
| 28 | Croci inverse con uso delle scapole | Centro schiena | spalla | colonna toracica | — |
| 29 | Croci inverse manubri | Spalle | spalla | colonna toracica | — |
| 30 | Croci manubri | Petto | spalla | gomito | — |
| 31 | Croci manubri su panca inclinata | Petto | spalla | gomito | — |
| 32 | Cross over ai cavi | Petto | spalla | gomito | — |
| 33 | Crunch classici | Addominali | colonna lombare | colonna toracica | — |
| 34 | Crunch gambe 90° | Addominali | colonna lombare | colonna toracica | — |
| 35 | Crunch gambe 90Â° | Addominali | colonna lombare | colonna toracica | doppione del nome con carattere rovinato (90Â°): e' l'esercizio della riga sopra |
| 36 | Crunch machine | Addominali | colonna lombare | colonna toracica | — |
| 37 | crunch obliqui | Addominali | colonna lombare | colonna toracica | — |
| 38 | Curl cavo basso con bilancere piccolo | Bicipiti | gomito | polso | — |
| 39 | Curl manubri | Bicipiti | gomito | polso | — |
| 40 | Curls Bilaciere Z | Bicipiti | gomito | polso | — |
| 41 | Curls manubri schiena al muro | Bicipiti | gomito | polso | — |
| 42 | Curls martello in piedi | Bicipiti | gomito | polso | — |
| 43 | Curls martello panca | Bicipiti | gomito | — | — |
| 44 | Curls martello panca inlinata 45° | Bicipiti | gomito | — | — |
| 45 | Curls martello panca inlinata 45Â° | Bicipiti | gomito | — | doppione del nome con carattere rovinato (45Â°): e' l'esercizio della riga sopra |
| 46 | Curls panca 45° | Bicipiti | gomito | — | — |
| 47 | Curls panca 45Â° | Bicipiti | gomito | — | doppione del nome con carattere rovinato (45Â°): e' l'esercizio della riga sopra |
| 48 | Curls panca scoot | Bicipiti | gomito | — | — |
| 49 | Curls trx | Bicipiti | gomito | spalla | — |
| 50 | Dead bug dinamico | Addominali | colonna lombare | anca | — |
| 51 | Dips inclinato in avanti | Petto | spalla | gomito | — |
| 52 | Dips stretti | Tricipiti | gomito | spalla | — |
| 53 | Distensione manubri su inclinata | Petto | spalla | gomito | — |
| 54 | Distensioni manubri su piana | Petto | spalla | gomito | — |
| 55 | Donkey calf | Polpacci | caviglia | ginocchio | — |
| 56 | Dragon Flag | Addominali | colonna lombare | spalla | — |
| 57 | Dragon Flag mono | Addominali | colonna lombare | spalla | — |
| 58 | Ellittica | Cardio | ginocchio | anca, caviglia | macchina cardio: il carico dipende da resistenza e passo, non dal gesto |
| 59 | Face Pull | Spalle | spalla | gomito, colonna toracica | — |
| 60 | Face pull reverse pec | Spalle | spalla | colonna toracica | — |
| 61 | Farmer Walk | Addominali | colonna lombare | polso | il carico vero e' la presa: se vuoi, polso principale e colonna secondaria |
| 62 | Floor press bilanciere | Petto | spalla | gomito | — |
| 63 | Floor press manubri | Petto | spalla | gomito | — |
| 64 | French press bilanciere Z | Tricipiti | gomito | spalla | — |
| 65 | French press manubri | Tricipiti | gomito | spalla | — |
| 66 | French press panca 40° | Tricipiti | gomito | — | — |
| 67 | French press panca 40Â° | Tricipiti | gomito | — | doppione del nome con carattere rovinato (40Â°): e' l'esercizio della riga sopra |
| 68 | Frog Pump con elastico | Glutei | anca | — | — |
| 69 | Front squat machine | Quadricipiti | ginocchio | anca, colonna lombare | — |
| 70 | Gentlemen row | Centro schiena | colonna toracica | gomito, spalla | — |
| 71 | Ghd | Femorali | ginocchio | anca | GHD da solo non dice il gesto: se e' il glute-ham raise regge ginocchio, se e' un'iperestenzione e' colonna lombare |
| 72 | GHD lateral crunch | Addominali | colonna lombare | — | — |
| 73 | GHD sit up crunch | Addominali | colonna lombare | anca | — |
| 74 | Glutes machine | Glutei | anca | — | — |
| 75 | Goblet squat | Quadricipiti | ginocchio | anca, colonna toracica | — |
| 76 | Hack Squat con elastico | Quadricipiti | ginocchio | anca | — |
| 77 | Hamstring Destroyers | Femorali | ginocchio | anca | nome di scuola: non dice se e' un curl o uno stacco, quindi ginocchio e' una scelta mia |
| 78 | Hip Thrust | Glutei | anca | ginocchio | — |
| 79 | Hip Thrust statico | Glutei | anca | ginocchio | — |
| 80 | Hip Trust mono | Glutei | anca | ginocchio | — |
| 81 | Hollow position | Addominali | colonna lombare | anca | — |
| 82 | Hypersetensioni con cuscino | Glutei | colonna lombare | anca | — |
| 83 | Hyperstension con cuscinetto | Femorali | colonna lombare | anca | — |
| 84 | Jefferson Culs | Femorali | colonna lombare | anca, ginocchio | — |
| 85 | Kick back | Tricipiti | gomito | spalla | il distretto dice Tricipiti, quindi gomito; se nella scheda e' il calcio gluteo, e' anca |
| 86 | Krock Row | Centro schiena | colonna toracica | gomito, spalla | — |
| 87 | Lat machine | Dorsali | spalla | gomito, colonna toracica | — |
| 88 | Lat Machine supina | Dorsali | spalla | gomito, colonna toracica | — |
| 89 | Lat machine Triangolo | Dorsali | spalla | gomito | — |
| 90 | Lat mono braccio | Dorsali | spalla | gomito | — |
| 91 | Leg curls | Femorali | ginocchio | anca | — |
| 92 | Leg curls seduta | Femorali | ginocchio | anca | — |
| 93 | Leg curls singolo | Femorali | ginocchio | — | — |
| 94 | Leg Curs Fitbal | Femorali | ginocchio | anca, colonna lombare | — |
| 95 | Leg Extension | Quadricipiti | ginocchio | — | — |
| 96 | Leg extension singola | Quadricipiti | ginocchio | — | — |
| 97 | Leg press steso | Quadricipiti | ginocchio | anca, caviglia | — |
| 98 | Leg raise | Addominali | anca | colonna lombare | — |
| 99 | Lento avanti machine | Spalle | spalla | gomito | — |
| 100 | Lento avanti manubri | Spalle | spalla | gomito | — |
| 101 | Military al multypower panca70° | Spalle | spalla | gomito, colonna toracica | — |
| 102 | Military al multypower panca70Â° | Spalle | spalla | gomito, colonna toracica | doppione del nome con carattere rovinato (70Â°): e' l'esercizio della riga sopra |
| 103 | Military press | Spalle | spalla | gomito | — |
| 104 | Panca inclinata | Petto | spalla | gomito | — |
| 105 | Panca piana | Petto | spalla | gomito | — |
| 106 | Passo del granchio | Glutei | anca | colonna lombare | — |
| 107 | Peck deck | Centro schiena | spalla | colonna toracica | il distretto dice Centro schiena, ma la macchina e' una pectoral: spalla principale |
| 108 | Pendaly Row | Centro schiena | colonna toracica | gomito, spalla | — |
| 109 | Pendulum | Quadricipiti | ginocchio | anca | — |
| 110 | Piegamenti sulle braccia | Petto | spalla | gomito, colonna lombare | — |
| 111 | Plank statico | Addominali | colonna lombare | spalla | — |
| 112 | Polpacci in piedi | Polpacci | caviglia | ginocchio | — |
| 113 | Polpacci seduto | Polpacci | caviglia | — | — |
| 114 | Pressa 45° | Quadricipiti | ginocchio | anca, caviglia | — |
| 115 | Pressa 45Â° | Quadricipiti | ginocchio | anca, caviglia | doppione del nome con carattere rovinato (45Â°): e' l'esercizio della riga sopra |
| 116 | Pressa mono gamba | Quadricipiti | ginocchio | anca, caviglia | — |
| 117 | Pressa verticale panatta | Glutei | ginocchio | anca | il distretto dice Glutei ma e' una pressa: ginocchio principale, gluteo lo prendi con l'anca |
| 118 | Pressa45° piedi alti schienale chiuso | Glutei | anca | ginocchio | — |
| 119 | Pressa45Â° piedi alti schienale chiuso | Glutei | anca | ginocchio | doppione del nome con carattere rovinato (45Â°): e' l'esercizio della riga sopra |
| 120 | Pull Down corda | Dorsali | spalla | gomito | — |
| 121 | Pull down sbarra | Dorsali | spalla | gomito, colonna toracica | — |
| 122 | pulldown sbarra | Dorsali | spalla | gomito, colonna toracica | doppione di «Pull down sbarra» scritto in minuscolo |
| 123 | Pulley sbarra presa larga supina | Centro schiena | colonna toracica | gomito, spalla | — |
| 124 | Pulley triangolo | Centro schiena | colonna toracica | gomito, spalla | — |
| 125 | Pullover bilanciere | Dorsali | spalla | gomito, colonna lombare | — |
| 126 | Pullover manubrio | Dorsali | spalla | gomito | — |
| 127 | Push Press Ktb | Spalle | spalla | gomito, ginocchio | — |
| 128 | Push Up | Petto | spalla | gomito, colonna lombare | — |
| 129 | Push ups | Tricipiti | gomito | spalla | doppione di «Push Up» ma con distretto diverso: decide Alice quale dei due resta |
| 130 | RDL Belt machine | Femorali | anca | ginocchio, colonna lombare | — |
| 131 | RDL focus Gluteo | Glutei | anca | ginocchio, colonna lombare | — |
| 132 | RDL focus Gluteo Belt machine | Glutei | anca | ginocchio, colonna lombare | — |
| 133 | Reamtore mono braccio corda bassa | Centro schiena | colonna toracica | gomito, spalla | — |
| 134 | Rematore  Dead Stop | Centro schiena | colonna toracica | gomito, anca | — |
| 135 | Rematore bilanciere | Centro schiena | colonna toracica | gomito, anca | — |
| 136 | Rematore Bilanciere Z | Centro schiena | colonna toracica | gomito | — |
| 137 | Rematore manubri panca 30° | Centro schiena | colonna toracica | gomito | — |
| 138 | Rematore manubri panca 30Â° | Centro schiena | colonna toracica | gomito | doppione del nome con carattere rovinato (30Â°): e' l'esercizio della riga sopra |
| 139 | Rematore supino | Centro schiena | colonna toracica | gomito | — |
| 140 | Renegade row | Centro schiena | colonna lombare | gomito, spalla | — |
| 141 | Rotazioni cavo medio | Glutei | colonna toracica | anca | — |
| 142 | Row machine panatta | Centro schiena | colonna toracica | gomito | — |
| 143 | Scrollate con manubri | Centro schiena | colonna toracica | spalla | — |
| 144 | Side Plank | Addominali | colonna lombare | spalla | — |
| 145 | Sissy squat in piedi | Quadricipiti | ginocchio | anca | — |
| 146 | Slanci cavo basso | Glutei | anca | — | — |
| 147 | Slancio laterale cavo basso triset | Glutei | anca | ginocchio | — |
| 148 | Spider curls | Bicipiti | gomito | spalla | — |
| 149 | Sprawl | Cardio | spalla | anca, ginocchio | appoggio a terra con salto: e' un misto, la spalla e' solo la parte di appoggio |
| 150 | Squat | Quadricipiti | ginocchio | anca, colonna lombare | — |
| 151 | Squat al multypower | Quadricipiti | ginocchio | anca, colonna lombare | — |
| 152 | Squat Bulgaro focus quads | Quadricipiti | ginocchio | anca, caviglia | — |
| 153 | Squez Press | Petto | spalla | gomito | nome storpiato (Squez Press): se e' la squeeze press, resta spalla con gomito |
| 154 | Stacco B Stance cavo | Femorali | anca | ginocchio, colonna lombare | — |
| 155 | Stacco B stance con cavo | Glutei | anca | ginocchio, colonna lombare | doppione di «Stacco B Stance cavo» scritto con la minuscola |
| 156 | Stacco da rialzi | Femorali | anca | ginocchio, colonna lombare | — |
| 157 | Stacco gambe semi tese | Femorali | anca | colonna lombare, ginocchio | — |
| 158 | Stacco mono gamba | Femorali | anca | ginocchio, colonna lombare | — |
| 159 | Stacco RDL | Femorali | anca | colonna lombare, ginocchio | — |
| 160 | Stacco Regular | Femorali | anca | colonna lombare, ginocchio | — |
| 161 | Stacco Sumo | Femorali | anca | ginocchio, colonna lombare | — |
| 162 | Stretchers | Dorsali | spalla | colonna toracica | — |
| 163 | T bar | Centro schiena | colonna toracica | gomito, anca | — |
| 164 | Tabata | Cardio | colonna lombare | — | Tabata e' un formato a intervalli, non un gesto: non c'e' un'articolazione da contare |
| 165 | Tapins Roulant | Cardio | ginocchio | anca, caviglia | corsa sul posto: carico di ginocchio e anca, la caviglia e' rimbalzo |
| 166 | Trazioni | Dorsali | spalla | gomito, colonna toracica | — |
| 167 | Trazioni assistite | Dorsali | spalla | gomito | — |
| 168 | Trazioni gironda | Dorsali | spalla | gomito | — |
| 169 | Trazioni neutre | Dorsali | spalla | gomito | — |
| 170 | Trazioni supine | Dorsali | spalla | gomito | — |
| 171 | Tricipiti cavo alto in corda | Tricipiti | gomito | spalla | — |
| 172 | Tricipiti cavo basso dietro la testa | Tricipiti | gomito | spalla | — |
| 173 | Tricipiti manubrio dietro la testa | Tricipiti | gomito | spalla | — |
| 174 | Tricipiti mono braccio cavo alto | Tricipiti | gomito | spalla | — |
| 175 | Tricipiti Pullover | Tricipiti | gomito | spalla | — |
| 176 | Triset glutei | Glutei | anca | colonna lombare | e' un triset: tre esercizi in un nome, lo stress si somma su tutte e tre le righe |
| 177 | Vertical Traction | Dorsali | spalla | gomito, colonna toracica | — |
| 178 | Vogatore | Cardio | colonna toracica | anca, spalla | macchina cardio: il carico vero e' anca e colonna, la spalla tira alla fine |
| 179 | Y raises cavo alto | Spalle | spalla | colonna toracica | — |

## 5. Le scelte che toccano ad Alice

Queste non le decido io: sotto ognuna c'è cosa ho messo, l'alternativa e il perché.

1. **Tabata** — messo: nessuna articolazione, 0 punti. Alternativa: contarlo come ginocchio + anca.
   Perché: Tabata è un formato a intervalli, non un gesto: senza sapere cosa c'è dentro non c'è nulla da contare.
2. **I sette esercizi di cardio** (Burbees, Sprawl, Tapins Roulant, Cardio tapins + corsa, Ellittica,
   Vogatore, Tabata) — messo: un'articolazione principale cadauno. Alternativa: escludere il cardio
   dallo stress e lasciarlo solo nel volume.
   Perché: il cardio non è un gesto articolare unico, e contarlo gonfia le articolazioni di chi lo usa tanto.
3. **Farmer Walk** — messo: colonna lombare principale, polso secondaria. Alternativa: polso principale.
   Perché: il carico vero è la presa, ma la tenuta è del tronco.
4. **Kick back** — messo: gomito (il catalogo lo mette nei Tricipiti). Alternativa: anca, se nella tua
   scheda è il calcio gluteo. Perché: il distretto è l'unica traccia che ho.
5. **Ghd** — messo: ginocchio + anca. Alternativa: colonna lombare. Perché: «GHD» da solo non dice se è
   il glute-ham raise o un'iperestenzione.
6. **Peck deck** — messo: spalla (la macchina è una pectoral). Alternativa: colonna toracica, come dice
   il distretto «Centro schiena». Perché: qui il distretto del catalogo e la macchina non vanno d'accordo.
7. **Pressa verticale panatta** — messo: ginocchio + anca. Alternativa: anca principale, come dice il
   distretto «Glutei». Perché: è una pressa, il ginocchio lavora per primo.
8. **Push Up / Push ups** — messo: spalla principale nel primo, gomito nel secondo. Alternativa:
   tenere una sola riga. Perché: sono lo stesso esercizio con due distretti diversi nel catalogo.
9. **Triset glutei** — messo: anca + colonna lombare. Alternativa: scioglierlo nei tre esercizi veri.
   Perché: un triset è tre esercizi sotto un nome solo, e i punti si sommano tre volte.
10. **Squez Press** — messo: spalla + gomito. Alternativa: petto, se è una squeeze press al petto.
    Perché: il nome è storpiato e non ho altro.
11. **Hamstring Destroyers** — messo: ginocchio + anca. Alternativa: colonna lombare. Perché: è un nome
    di scuola, non dice il gesto.
12. **Ab Roll e Addominali livello 1** — messo: spalla e colonna lombare principali. Alternativa:
    contare il core (colonna lombare) come principale in entrambi. Perché: nel primo lavora la spalla,
    nel secondo non so nemmeno che gesto sia.
13. **I 13 doppioni** (nomi con «Â°», «pulldown sbarra», «Stacco B stance con cavo», «Push ups»):
    messi: ognuno con la sua riga e i suoi punti. Alternativa: unirli e contarne uno.
    Perché: se restano tutti, lo stesso esercizio dà punti due volte.
