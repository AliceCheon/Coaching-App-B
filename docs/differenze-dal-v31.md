# Differenze del desktop dal v31

Regola di casa (guardia 42): `desktop/index.html` può differire da `pc/index.html` — il v31 congelato — **solo nelle righe elencate qui sotto**. Ogni modifica futura aggiunge un blocco a questo documento, altrimenti la suite è rossa.

- `pc/index.html` resta congelato — sha256 di pc/index.html: `c612e2bbdae952546a250ed0ea58d7eab825178e6b1551b0bc6a6981af78a7c8`
- file nuovo (non cambia il v31): `desktop/app-v31.js` — login Google + lettura in sola lettura + render del Programma attivo
- `tests/09` continua a guardare `desktop/index.html`; `tests/01` e le scansioni di `tests/02` e `tests/08` lo lasciano escluso come prima (l'editor statico nascosto porta dentro il seme di esempio del v31: finché resta nascosto non viene mostrato, e le scansioni non lo leggono)
- i dati di esempio del Programma attivo non si vedono più (editor statico nascosto); `window.BD_LB_SEED` resta nel file: lo usano le schermate non ancora collegate (Dashboard, Overview, Riepilogo volume…)

## Le righe cambiate (numeri di desktop/index.html)

Ogni blocco qui sotto e un pezzo di diff vero fra `pc/index.html` (il v31 congelato) e `desktop/index.html`: il numero e la riga che cambia, non un margine largo. Se un blocco non combacia piu, si corregge il numero guardando il diff, mai allargando il blocco.

### Passo 8 - via i numeri del mockup da Curve di forza, Pianificazione, Misure e Dashboard

Curve di forza: sezione ridotta a `data-curva="non-calcolata"`. Pianificazione: `#pianificazione-viva` con `renderPianificazione`/`riepilogoPianificazione` e CSS `.pz-*`. Misure: non si seminano piu' le misure di esempio. Dashboard: readiness a trattino, «non registrato», nessuna media inventata.

### Riparazione del passo 8 - le quattro tab tornate al v31

Scheletri, Programma 1 (`#programma-attivo`), Impostazioni e Study time erano state cancellate per errore insieme alle sezioni riscritte: sono state ripristinate identiche al v31, e per questo nel diff non compaiono come righe cambiate.

### I blocchi

Una riga per blocco: il numero di riga (o l'intervallo) in `desktop/index.html` e la prima riga cambiata. Se una modifica futura non sta qui, la guardia `tests/42-identita-desktop-pc.test.mjs` diventa rossa.

- righe 40-48 — --zebra-a: #fffafd;
- righe 75-83 — --zebra-a: #14132d;
- righe 142-151 — /* ---- TENDINE: il menu nativo segue il tema (UN SOLO posto) ----
- righe 612-634 — .ck-red-cla{margin-top:11px;border-top:1px solid var(--linea);padding-top:9px;display:flex;flex-dire
- righe 816-818 — /* Passo 34: una linguetta spenta si vede che è spenta (e il motivo sta nel tooltip). */
- righe 901 — #sk-legenda{padding:0 12px 10px;display:flex;flex-direction:column;gap:5px}
- righe 1050-1052 — /* La guida che si apre sotto il tasto (passo 19): un riquadro di testo, niente di piu'. */
- righe 1491-1600 — </style>
- righe 1616 — var b=document.getElementById('bd-ver');if(b)b.textContent=(window.BD_VERSIONE//'')+' \u00b7 '+id;
- righe 1620-1631 — /* Versione dell'app: un punto solo. Il menu qui sotto, Impostazioni -> Build e
- righe 1638 — <div id="bd-ver" style="margin-top:8px;font:600 10px/1 'JetBrains Mono',monospace;letter-spacing:.06
- righe 1663 — <button class="voce" data-vista="programma-1" onclick="BDVAI(this.getAttribute('data-vista'),this)">
- righe 1682 — <span style="display:inline-block;margin-top:7px;color:#8A6FA8">Versione B &middot; in prova sui tuo
- righe 1705-1706 — <b class="db-titolo">Il consiglio di oggi</b>
- righe 1728-1729 — <text x="48" y="52" text-anchor="middle" \1&mdash;\2/text>
- righe 1735-1738 — <h3>Readiness media <span class="ck-slash">-</span> <b>non registrato</b></h3>
- righe 1743 — <div class="ck-chips"><span class="ck-chip"><em>Energia</em><b>&mdash;</b></span><span class="ck-chi
- righe 1755 — <div class="ck-mets">            <article class="ck-met"><div class="ck-met-t"><svg class="ck-ic" vi
- righe 1777 — <!-- ============ 4 · PESO + SONNO ============ -->
- righe 1780-1784 — <header class="ck-h"><h4><svg class="ck-ic" viewBox="0 0 16 16" width="12" height="12" fill="none" s
- righe 1804 — <div class="ck-red-num"><b data-reds-num>-</b><span class="ck-pill mute" data-reds-stato>non calcola
- righe 1807 — <div class="ck-red-cla" data-reds-classifica></div>
- righe 1810 — <div class="ck-dove-r"><svg class="ck-ic" viewBox="0 0 16 16" width="12" height="12" fill="none" str
- righe 1814-1815 — <div class="ck-avviso"><svg class="ck-ic" viewBox="0 0 16 16" width="12" height="12" fill="none" str
- righe 1833-1835 — <p data-ck-bio-sotto>check-in · scala 1-5 · non ancora letto</p></div></header>
- righe 1845-1848 — <div class="ck-fare-tit">Nessuna decisione automatica <span class="ck-tag">motore non attivo</span><
- righe 1927-1933 — <button class="ck-link" type="button" data-vai="riepilogo-volume">Apri analisi completa →</button>
- righe 1955-1957 — <div class="dc-mail">scaniscrini@gmail.com</div>
- righe 1962 — <p>Anagrafica, Anamnesi, Biofeedback e Questionari</p>
- righe 1968 — <button class="dc-tab" data-dc="biofeedback">Biofeedback</button>
- righe 2027-2033 — <!-- Passo 25: «Domande» esce (tornerà quando ci sarà un senso), e
- righe 2063-2064 — <div class="dc-pan" data-pan="biofeedback"><div class="dc-card"><div class="dc-vuot"><b>Biofeedback:
- righe 2075 — <div class="sr-who"><b>Alice Clemente</b> · <span data-sr-ck>check-in non ancora letto</span> · <spa
- righe 2084-2087 — <div class="sr-i" data-sr-i="sleep"><span>Sonno percepito</span><b>-</b><i>non registrato</i></div>
- righe 2092-2100 — <div class="sr-boxh"><b data-sr-ck-tit>Check-in di oggi</b><span class="sr-legend">scala 1-5 · 5 = i
- righe 2118 — <p class="sr-legend" style="margin:10px 0 0">RPE medio <b style="color:var(--core)" id="sr-mrpe">-</
- righe 2126 — <p class="sr-note"><b>Nessun giudizio senza il dato.</b> RPE medio <span id="sr-nota-rpe">-</span> (
- righe 2129 — <script>
- righe 2152 — <div class="ms-who"><b>Alice Clemente</b> &middot; altezza, et&agrave; e sessioni non registrate: ne
- righe 2277 — (riga vuota)
- righe 2349 — var S=null;
- righe 2357 — var S=null;
- righe 2690 — <div class="p7-note3"><b>Da dove vengono i numeri:</b> il peso dalle rilevazioni <b>della scheda del
- righe 2701-2703 — <div class="mp-who"><b>Alice Clemente</b> · <span data-peso-profilo>altezza e età non registrate</sp
- righe 2709 — <div class="mp-boxh"><b>Andamento peso</b><span class="mp-legend">linea del peso · le pesate registr
- righe 2715-2717 — <!-- Passo 24: la coppia «Pesate / Mesi» torna com'era. Il passo 21 l'aveva tolta
- righe 2739-2741 — <div class="mp-note"><b>Perché qui non c'è la media a 7 giorni.</b> Le pesate sono poche e distanti 
- righe 2754 — <div class="v-stato">Cosa conterr&agrave;: nome, dose, orario, periodo, note e l&rsquo;avviso di fin
- righe 2771 — <div class="dperche" id="ov-p1">programma non ancora letto</div>
- righe 2778 — <div class="dperche" id="ov-p2">logbook non ancora letto</div>
- righe 2812 — <p class="p7-note2" id="lb-nota-b" hidden></p>
- righe 2826-2829 — var sed=function(){return (window.BD_LB_SEED&&window.BD_LB_SEED.sedute)//[];};
- righe 2843 — var cand=sed().filter(function(x){return x.d===dd;});
- righe 2856 — aggiornaMappa();
- righe 2869 — if(cnt&&(fv//fo))cnt.textContent=vis+" di "+sed().length+" sedute";
- righe 2881 — <div id="pianificazione-viva"></div>
- righe 2891 — </div><button class="db-btn" id="db-guida">Guida DB Esercizi</button></div>
- righe 2923 — <p class="pr-sub">Le regole con cui le settimane salgono. Per applicare una progressione alla singol
- righe 2933 — <div class="rv" id="rv-vivo"></div><style>.rv,.sp,.db2{display:block}
- righe 3147-3148 — </div><button class="sp-btn" id="sp-guida">Guida Specializzazione</button></div>
- righe 3152 — (riga vuota)
- righe 3155-3157 — <div class="v-occhiello">Programmi &middot; Curve di forza</div>
- righe 3160-3162 — <div class="cv-card" id="cv-real" data-curva="non-calcolata">
- righe 3165 — <section class="voce-pag" id="pag-scheletri">
- righe 3171 — scegli le serie. Quando salvi, lo scheletro entra nella tua raccolta e da lì lo applichi a una sched
- righe 3175-3176 — <button class="sk-tab" type="button" disabled aria-disabled="true" title="spento: i template della l
- righe 3192-3193 — <label class="sk-check" title="C'è una sola atleta: non c'è a chi altro renderlo disponibile"><input
- righe 3206-3207 — <div class="sk-qh">Questionario</div>
- righe 3217 — <section class="voce-pag" id="pag-programma-1"><div class="pg-wrap"><div id="programma-attivo"></div
- righe 3304 — <button class="pr-btn" id="t8-appprog" type="button">Applica progressione a tutta la scheda</button>
- righe 3337 — <div class="p8-box" id="box-A"><div class="p8-head"><div><div class="p8-nome">Scheda A - Dorsali, Sp
- righe 3348 — (riga vuota)
- righe 3381 — (riga vuota)
- righe 3401-3402 — <div><b>Scarico</b><p>La settimana che la scheda segna come scarico tiene la tecnica e toglie volume
- righe 3461 — </div></div></section><section class="voce-pag" id="pag-impostazioni">
- righe 3482 — <div class="st-row"><span>Build</span><b id="st-ver"></b></div>
- righe 4138 — <p class="v-testo">Tutti i programmi del backup, attivo compreso: si leggono, non si modificano. Ser
- righe 4142 — <tbody id="archivio-corpo"></tbody>
- righe 5295-5303 — { /* B.14l: il testo a pezzi, la data dentro uno span vero: prima il tag si
- righe 5389 — (riga vuota)
- righe 5488 — (riga vuota)
- righe 5577 — (riga vuota)
- righe 5589 — (riga vuota)
- righe 5592-5598 — /* Passo 34: «Salva Scheletro» scrive nella raccolta vera (comune/vista-scheletri-pagina.js).
- righe 5931 — var LABEL={"pag-dashboard":"Dashboard","pag-dati-cliente":"Dati cliente","pag-salute-recupero":"Salu
- righe 6189 — if(navigator.userActivation&&navigator.userActivation.hasBeenActive===false)return;/* niente audio p
- righe 6306-6310 — /* la spia «Test» (B.16a-2): un insieme solo - nascosta senza .on, visibile
- righe 6989-6990 — <!-- beacon Cloudflare tolto (passo 16b): su GitHub Pages chiamava il collettore RUM di Cloudflare e
- righe 7118-7154 — #pag-programma-1 .pr-shd-f{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:flex-end
- righe 7296 — (riga vuota)
- righe 7323-7350 — /* ---- zebra (B.14h): un tono per esercizio, classi z-a/z-b; i due toni per
- righe 7395 — html body #pag-programma-1 td.c-rec .rec,html body #pag-programma-1 td.c-ese .ese-name{white-space:n
- righe 7441 — (riga vuota)
- righe 7491-7492 — /* ---- settimane: due celle, SER e REPS affiancate (niente RM) ---- */
- righe 7565 — html body .p7-donut .dperche{max-width:150px;text-align:center;font:500 9px/1.3 'Inter',system-ui,sa
- righe 7844 — window.BD_LB_SEED = null; /* passo 3c: tolto il seme di esempio del logbook; le sedute vere arrivano
- righe 8001 — ese.push('<div class="lb-ex"><b>' + sc(e.np // e.n) + '</b>' + (window.BD_LB_EXCAT && BD_LB_EXCAT[e.
- righe 8389-8390 — /* Passo B.20b: anche la Stampa da Compilare vive in comune/vista-programma.js
- righe 8843 — var SEED = {config:{}, sessioni:[]};
- righe 8858-8861 — var P_ST = window.BDPesoB ? window.BDPesoB.leggiPeso() : { stato:'non-letto', pesate:[], motivo:'il 
- righe 8885-8888 — var P_PROF = window.BDPesoB ? window.BDPesoB.leggiProfilo(null) : { confermato:false, altezza:null, 
- righe 8895-8922 — /* ---------- Passo 18: l'Overview conta dal programma letto e dal logbook ----------
- righe 8925-8930 — function logbookVivo(){
- righe 8933-8936 — function pittaOverview(){
- righe 8939-8965 — var aderE = OV ? OV.aderenza({ sedute: LV.sedute, letto: LV.letto, motivoLogbook: LV.motivo, giorni:
- righe 8978-8980 — var delta = (ultimo && primo) ? (ultimo.w - primo.w) : null;
- righe 8986-8988 — {l:'Carico', v: cOk ? it(carE.serie) : '-', u: cOk ? 'serie S' + carE.settimana : '',
- righe 8991 — return '<div class="p7-k' + (k.on ? '' : ' nd') + '"' + (k.id ? ' id="' + k.id + '"' : '') + '><div 
- righe 8997 — PV.righe.forEach(function(r){ var v = r.serie[0]; if(!r.dist // r.dist === '-' // v === null) return
- righe 9005-9007 — el('ov-barsn').textContent = PV.letto
- righe 9010-9013 — /* Passo 32: disegno nelle misure vere del riquadro (prima era un 100x34
- righe 9017-9024 — var xdi = function(i){ return 8 + i * ((W - 18) / (pesi.length - 1)); };
- righe 9027 — el('ov-pesot').textContent = 'Andamento peso · ' + P_TESTO;
- righe 9035-9055 — el('ov-sed').innerHTML = '<span class="p7-chip">' + (LV.letto ? 'nessuna seduta nel logbook' : LV.mo
- righe 9058-9070 — if(el('tb-bmr') && (!P_PROF.confermato // P_PROF.mancanti.length // PESO === null)){
- righe 9109 — bf = GRASSO === null ? ' · massa magra non registrata: Katch non calcolabile' : ' · grasso stimato '
- righe 9160 — if(false){
- righe 9357 — '<div class="ese-chips2">' +
- righe 9908-9911 — /* I riquadri dell'analisi non sono in pagina (la linguetta mostra la tabella):
- righe 9916 — kpi.innerHTML =
- righe 10091-10100 — // Passo 30: nei campi si lascia al browser la cronologia del testo.
- righe 10210 — (riga vuota)
- righe 10254-10573 — <!-- beacon Cloudflare tolto (passo 16b): su GitHub Pages chiamava il collettore RUM di Cloudflare e

### Cosa è cambiato, per passi (prosa, non blocchi)












- **Passo 8** — via i numeri del mockup da Curve di forza, Pianificazione, Misure e Dashboard; le quattro tab cancellate per errore (Scheletri, Programma 1, Impostazioni, Study time) sono state ripristinate identiche al v31.
- **Passo 15** — Dati cliente: tolte le linguette Wearable e Personalizzati con i loro pannelli.
- **Passo 16** — via dal codice il questionario personale di Scheletri, il link Cloudflare dell'email, le tre versioni ridotte a una (`window.BD_VERSIONE`), e la funzione che scriveva in riquadri inesistenti (`#t9-kpi`).
- **Passo 16b** — via la quarta versione rimasta nel menu, il beacon Cloudflare, un'icona mancante, e l'`AudioContext` creato prima di un gesto dell'utente.
- **Passo 17** — il peso ha una fonte sola (`comune/peso-b.js`): via le cinque pesate scritte nella pagina, via «178 cm · 31 anni», via il ripiego del profilo nei calcoli.
- **Passo 18** — nessun numero fisso si presenta come dato di oggi: la carta «Biofeedback settimanale» della Dashboard e il «Check-in di oggi» di Salute & recupero leggono il check-in da una fonte sola (`comune/checkin-b.js`, scala 1-5 dichiarata) e, senza check-in, dicono che non è arrivato; via «21/10/2026 · 6 note», i punteggi «/ 10» e il giudizio «la scala dice metà»; l'Overview conta aderenza e carico dal logbook e dal programma vivi (`comune/overview-vivo-b.js`) invece che dalla tabella nascosta del mockup, e dove il conto non si fa scrive il perché.
- **Passo 19** — i quattro tasti «? Guida» che non facevano niente ora aprono un riquadro con la spiegazione.
- **Passo 20** — via il «?» dai tasti Guida; anche Dashboard, Overview e Pianificazione ora spiegano invece di restare spenti.
- **Passo 26** — anagrafica scrivibile (sesso, lingua, obiettivo, cognome) con le voci nel registro; «Compila / Modifica» apre l'editor dell'anamnesi.
- **Passo 28** — i due «Apri» della carta «Cosa fare questa settimana» sembrano tasti (bordo, freccia, animazione, tastiera), e la frase della carta invita invece di scoraggiare.
- **Passo 29** — il quaderno: i quattordici campi dell'anamnesi si scrivono (voci `anamnesi-campo` nel registro); i due tasti si attaccano al caricamento, non più dopo l'accesso; badge della carta riscritti.
- **Passo 31** — Integratori: via la frase «mandami lo screen»; i due tasti spenti del Logbook dicono perché; la casella «Rendi disponibile» spenta con il motivo.
- **Passo 32** — la linea del peso si disegna nelle misure vere del riquadro (larghezza in pixel del contenitore, altezza uguale al riquadro, punti e spessore coerenti). Prima il disegno era un riquadro 100×N allungato a sette volte l'altezza senza rapporto: dentro la carta Peso, in «Andamento peso» e in Monitor peso usciva una striscia schiacciata con macchie al posto dei punti. Ora si ridisegna anche quando il riquadro cambia larghezza.
- **Passo 33** — «Spiegazioni (4/4)» è acceso: apre un pannello con le quattro voci (TUT, ondata 10-x, scarico, rotazione schede), si chiude col ×, col clic fuori e con Esc, e il fuoco torna al tasto. I testi di scarico e rotazione dicono solo cose vere: la settimana e la percentuale dello scarico si leggono dai campi «Scarico» e «Vol −%» della scheda (non da un «qui S4» fisso), e la rotazione prevista non essendo nei documenti letti si vede solo quella osservata nel logbook. «Suggerimenti» resta al suo posto: serve alla robottina.
- **Passo 34** — la pagina Scheletri parla con la zona B. «Miei scheletri» è acceso e mostra la raccolta vera (nome, data, esercizi, schede, serie), con il conteggio letto e non più scritto a mano; «Template» e «Libreria Coach» restano spenti col motivo nel tooltip e senza i numeri 5 e 34. «Salva Scheletro» scrive lo scheletro nella raccolta (`bdB_atleti/<uid>/scheletri`) con la stessa strada della scheda, lo mostra subito in «Miei scheletri» e non crea più un «Programma 2» in memoria: la frase «ti ho portato lì» e la promessa «diventa un programma nuovo» sono sparite. Sistemato anche `leggiScheletriB`, che chiedeva un id a un riferimento di raccolta e quindi non riusciva a leggere niente.
