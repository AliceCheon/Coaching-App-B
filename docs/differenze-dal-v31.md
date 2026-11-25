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

- righe 40-44 — --zebra-a: #fffafd;
- righe 46-48 — --sup-cornice-a: #D6247F;
- righe 75-79 — --zebra-a: #14132d;
- righe 81-83 — --sup-cornice-a: #FF4FA3;
- righe 142-151 — /* ---- TENDINE: il menu nativo segue il tema (UN SOLO posto
- righe 612-634 — .ck-red-cla{margin-top:11px;border-top:1px solid var(--linea
- righe 898 — #sk-legenda{padding:0 12px 10px;display:flex;flex-direction:
- righe 1047-1049 — /* La guida che si apre sotto il tasto (passo 19): un riquad
- righe 1488-1591 — </style>
- righe 1607 — var b=document.getElementById('bd-ver');if(b)b.textContent=(
- righe 1611-1618 — /* Versione dell'app: un punto solo. Il menu qui sotto, Impo
- righe 1620-1622 — <script src="../comune/peso-b.js"></script>
- righe 1629 — <div id="bd-ver" style="margin-top:8px;font:600 10px/1 'JetB
- righe 1654 — <button class="voce" data-vista="programma-1" onclick="BDVAI
- righe 1673 — <span style="display:inline-block;margin-top:7px;color:#8A6F
- righe 1696-1697 — <b class="db-titolo">Il consiglio di oggi</b>
- righe 1719-1720 — <text x="48" y="52" text-anchor="middle" \1&mdash;\2/text>
- righe 1726-1727 — <h3>Readiness media <span class="ck-slash">—</span> <b>non r
- righe 1729 — <p class="ck-frase">Il check-in di oggi non &egrave; stato l
- righe 1734 — <div class="ck-chips"><span class="ck-chip"><em>Energia</em>
- righe 1746 — <div class="ck-mets">            <article class="ck-met"><di
- righe 1768 — <!-- ============ 4 · PESO + SONNO ============ -->
- righe 1771 — <header class="ck-h"><h4><svg class="ck-ic" viewBox="0 0 16 
- righe 1773-1775 — <span class="ck-ic-vuoto" id="ck-peso-ico">!</span>
- righe 1795 — <div class="ck-red-num"><b data-reds-num>—</b><span class="c
- righe 1798 — <div class="ck-red-cla" data-reds-classifica></div>
- righe 1801 — <div class="ck-dove-r"><svg class="ck-ic" viewBox="0 0 16 16
- righe 1805-1806 — <div class="ck-avviso"><svg class="ck-ic" viewBox="0 0 16 16
- righe 1824-1826 — <p data-ck-bio-sotto>check-in · scala 1-5 · non ancora letto
- righe 1836-1839 — <div class="ck-fare-tit">Nessuna decisione automatica <span 
- righe 1918 — <button class="ck-link" type="button" data-vai="riepilogo-vo
- righe 1920 — <article class="ck-card ck-st">
- righe 1922-1924 — <p>serie equivalenti a settimana per articolazione · la tacc
- righe 1946 — <div class="dc-mail">scaniscrini@gmail.com</div>
- righe 1948 — <button class="dc-guida">Guida Dati Cliente</button>
- righe 1953 — <p>Anagrafica, Anamnesi, Biofeedback e Questionari</p>
- righe 1959 — 
- righe 1960 — 
- righe 2018-2020 — <!-- Passo 25: «Domande» esce (tornerà quando ci sarà un sen
- righe 2022 — <button class="dc-btn" id="dc-compila">✏️ Compila / Modifica
- righe 2024 — <div class="dc-avviso" id="dc-avviso">L'anamnesi si scrive d
- righe 2054-2055 — <div class="dc-pan" data-pan="biofeedback"><div class="dc-ca
- righe 2066 — <div class="sr-who"><b>Alice Clemente</b> · <span data-sr-ck
- righe 2075-2078 — <div class="sr-i" data-sr-i="sleep"><span>Sonno percepito</s
- righe 2083-2089 — <div class="sr-boxh"><b data-sr-ck-tit>Check-in di oggi</b><
- righe 2091 — <p class="sr-legend" style="margin:10px 0 0" data-sr-ck-fras
- righe 2109 — <p class="sr-legend" style="margin:10px 0 0">RPE medio <b st
- righe 2117 — <p class="sr-note"><b>Nessun giudizio senza il dato.</b> RPE
- righe 2120 — <script>
- righe 2143 — <div class="ms-who"><b>Alice Clemente</b> &middot; altezza, 
- righe 2268 — 
- righe 2340 — var S=null;
- righe 2348 — var S=null;
- righe 2681 — <div class="p7-note3"><b>Da dove vengono i numeri:</b> il pe
- righe 2692 — <div class="mp-who"><b>Alice Clemente</b> · <span data-peso-
- righe 2694 — <div class="ms-top"><span class="ms-badge carta" id="mp-badg
- righe 2700 — <div class="mp-boxh"><b>Andamento peso</b><span class="mp-le
- righe 2706-2708 — <!-- Passo 24: la coppia «Pesate / Mesi» torna com'era. Il p
- righe 2730 — <div class="mp-note"><b>Perché qui non c'è la media a 7 gior
- righe 2732 — 
- righe 2745 — <div class="v-stato">Cosa conterr&agrave;: nome, dose, orari
- righe 2762 — <div class="dperche" id="ov-p1">programma non ancora letto</
- righe 2769 — <div class="dperche" id="ov-p2">logbook non ancora letto</di
- righe 2803 — <p class="p7-note2" id="lb-nota-b" hidden></p>
- righe 2817-2820 — var sed=function(){return (window.BD_LB_SEED&&window.BD_LB_S
- righe 2834 — var cand=sed().filter(function(x){return x.d===dd;});
- righe 2847 — aggiornaMappa();
- righe 2860 — if(cnt&&(fv||fo))cnt.textContent=vis+" di "+sed().length+" s
- righe 2872 — <div id="pianificazione-viva"></div>
- righe 2882 — </div><button class="db-btn" id="db-guida">Guida DB Esercizi
- righe 2914 — <p class="pr-sub">Le regole con cui le settimane salgono. Pe
- righe 2924 — <div class="rv" id="rv-vivo"></div><style>.rv,.sp,.db2{displ
- righe 3138-3139 — </div><button class="sp-btn" id="sp-guida">Guida Specializza
- righe 3140 — 
- righe 3143 — 
- righe 3146 — <div class="v-occhiello">Programmi &middot; Curve di forza</
- righe 3148 — <p class="v-testo">La storia del carico per esercizio, sedut
- righe 3149 — 
- righe 3151-3153 — <div class="cv-card" id="cv-real" data-curva="non-calcolata"
- righe 3154 — 
- righe 3156 — <section class="voce-pag" id="pag-scheletri">
- righe 3183-3184 — <label class="sk-check" title="C'è una sola atleta: non c'è 
- righe 3197-3198 — <div class="sk-qh">Questionario</div>
- righe 3208 — <section class="voce-pag" id="pag-programma-1"><div class="p
- righe 3295 — <button class="pr-btn" id="t8-appprog" type="button">Applica
- righe 3328 — <div class="p8-box" id="box-A"><div class="p8-head"><div><di
- righe 3339 — 
- righe 3372 — 
- righe 3452 — </div></div></section><section class="voce-pag" id="pag-impo
- righe 3473 — <div class="st-row"><span>Build</span><b id="st-ver"></b></d
- righe 4129 — <p class="v-testo">Tutti i programmi del backup, attivo comp
- righe 4133 — <tbody id="archivio-corpo"></tbody>
- righe 5286-5294 — { /* B.14l: il testo a pezzi, la data dentro uno span vero: 
- righe 5480 — 
- righe 5640 — disegnaSchede(); disegnaLegenda();
- righe 5973 — var LABEL={"pag-dashboard":"Dashboard","pag-dati-cliente":"D
- righe 6231 — if(navigator.userActivation&&navigator.userActivation.hasBee
- righe 6348-6352 — /* la spia «Test» (B.16a-2): un insieme solo — nascosta senz
- righe 7031-7032 — <!-- beacon Cloudflare tolto (passo 16b): su GitHub Pages ch
- righe 7160-7196 — #pag-programma-1 .pr-shd-f{display:flex;flex-wrap:wrap;align
- righe 7338 — 
- righe 7365-7392 — /* ---- zebra (B.14h): un tono per esercizio, classi z-a/z-b
- righe 7437 — html body #pag-programma-1 td.c-rec .rec,html body #pag-prog
- righe 7483 — 
- righe 7533-7534 — /* ---- settimane: due celle, SER e REPS affiancate (niente 
- righe 7607 — html body .p7-donut .dperche{max-width:150px;text-align:cent
- righe 7886 — window.BD_LB_SEED = null; /* passo 3c: tolto il seme di esem
- righe 8043 — ese.push('<div class="lb-ex"><b>' + sc(e.np || e.n) + '</b>'
- righe 8431-8432 — /* Passo B.20b: anche la Stampa da Compilare vive in comune/
- righe 8885 — var SEED = {config:{}, sessioni:[]};
- righe 8900-8903 — var P_ST = window.BDPesoB ? window.BDPesoB.leggiPeso() : { s
- righe 8927-8930 — var P_PROF = window.BDPesoB ? window.BDPesoB.leggiProfilo(nu
- righe 8937-8955 — /* ---------- Passo 18: l'Overview conta dal programma letto
- righe 8957-8964 — if(radiceP){
- righe 8967-8972 — function logbookVivo(){
- righe 8973 — 
- righe 8975-8978 — function pittaOverview(){
- righe 8979 — 
- righe 8981-9007 — var aderE = OV ? OV.aderenza({ sedute: LV.sedute, letto: LV.
- righe 9020 — var delta = (ultimo && primo) ? (ultimo.w - primo.w) : null;
- righe 9022 — {id:'ov-k-peso', l:'Peso', v:it(PESO, 1), u:'kg', f: ultimo 
- righe 9028-9030 — {l:'Carico', v: cOk ? it(carE.serie) : '—', u: cOk ? 'serie 
- righe 9033 — return '<div class="p7-k' + (k.on ? '' : ' nd') + '"' + (k.i
- righe 9039 — PV.righe.forEach(function(r){ var v = r.serie[0]; if(!r.dist
- righe 9047-9049 — el('ov-barsn').textContent = PV.letto
- righe 9052-9055 — /* Passo 32: disegno nelle misure vere del riquadro (prima era un 100x34 allungato: la linea usciva come una striscia) — var Hh = 90, spBox = el('ov-spark');
- righe 9059-9064 — var xdi = function(i){ return 8 + i * ((W - 18) / (pesi.length - 1)); }; ... spBox.innerHTML = '<svg class="p7-spark" viewBox="0 0 ' + W + ' ' + Hh + '" ...
- righe 9066 — return '<circle cx="' + xdi(i).toFixed(1) + '" cy="' + ydi(p.w).toFixed(1) + '" r="' + (i === pesi.length-1 ? ... (punti nelle misure vere)
- righe 9069 — el('ov-pesot').textContent = 'Andamento peso · ' + P_TESTO;
- righe 9077 — el('ov-sed').innerHTML = '<span class="p7-chip">' + (LV.lett
- righe 9079-9097 — /* il peso lo ridipinge la sua fonte unica (peso-pittore), c
- righe 9100-9112 — if(el('tb-bmr') && (!P_PROF.confermato || P_PROF.mancanti.le
- righe 9151 — bf = GRASSO === null ? ' · massa magra non registrata: Katch
- righe 9202 — if(false){
- righe 9399 — '<div class="ese-chips2">' +
- righe 9950-9953 — /* I riquadri dell'analisi non sono in pagina (la linguetta 
- righe 9958 — kpi.innerHTML =
- righe 10133-10142 — // Passo 30: nei campi si lascia al browser la cronologia de
- righe 10252 — 
- righe 10296-10616 — <!-- beacon Cloudflare tolto (passo 16b): su GitHub Pages ch

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
