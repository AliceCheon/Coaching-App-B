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
- righe 1485-1588 — </style>
- righe 1604 — var b=document.getElementById('bd-ver');if(b)b.textContent=(
- righe 1608-1615 — /* Versione dell'app: un punto solo. Il menu qui sotto, Impo
- righe 1617 — <script src="../comune/peso-b.js"></script>
- righe 1624 — <div id="bd-ver" style="margin-top:8px;font:600 10px/1 'JetB
- righe 1649 — <button class="voce" data-vista="programma-1" onclick="BDVAI
- righe 1668 — <span style="display:inline-block;margin-top:7px;color:#8A6F
- righe 1691-1692 — <b class="db-titolo">Il consiglio di oggi</b>
- righe 1714-1715 — <text x="48" y="52" text-anchor="middle" \1&mdash;\2/text>
- righe 1721-1722 — <h3>Readiness media <span class="ck-slash">—</span> <b>non r
- righe 1724 — <p class="ck-frase">Il check-in di oggi non &egrave; stato l
- righe 1763 — <!-- ============ 4 · PESO + SONNO ============ --> (la card non è più «60 giorni»)
- righe 1741 — <span>Peso</span></div><div class="ck-met-v" id="ck-peso-v">—</div> (la tessera Peso della Dashboard legge dal pittore)
- righe 1766 — Andamento peso <span class="ck-sub">· tutte le pesate</span> (non più «60 giorni»)
- righe 1729 — <div class="ck-chips"><span class="ck-chip"><em>Energia</em>
- righe 1768-1770 — <span class="ck-ic-vuoto" id="ck-peso-ico">!</span>
- righe 1790 — <div class="ck-red-num"><b data-reds-num>—</b><span class="c
- righe 1793 — <div class="ck-red-cla" data-reds-classifica></div>
- righe 1796 — <div class="ck-dove-r"><svg class="ck-ic" viewBox="0 0 16 16
- righe 1800-1801 — <div class="ck-avviso"><svg class="ck-ic" viewBox="0 0 16 16
- righe 1835 — <div class="ck-fare-link spento"><svg class="ck-ic" viewBox=
- righe 1916 — <article class="ck-card ck-st">
- righe 1918-1920 — <p>serie equivalenti a settimana per articolazione · la tacc
- righe 1942 — <div class="dc-mail">scaniscrini@gmail.com</div>
- righe 1949 — <p>Anagrafica, Anamnesi, Biofeedback e Questionari</p>
- righe 1955 — 
- righe 1956 — 
- righe 2048-2049 — <div class="dc-pan" data-pan="biofeedback"><div class="dc-ca
- righe 2114 — <script>
- righe 2137 — <div class="ms-who"><b>Alice Clemente</b> &middot; altezza, 
- righe 2262 — 
- righe 2334 — var S=null;
- righe 2342 — var S=null;
- righe 2675 — <div class="p7-note3"><b>Da dove vengono i numeri:</b> il pe
- righe 2686 — <div class="mp-who"><b>Alice Clemente</b> · <span data-peso-
- righe 2688 — <div class="ms-top"><span class="ms-badge carta" id="mp-badg
- righe 2694 — <div class="mp-boxh"><b>Andamento peso</b><span class="mp-legend">linea del peso · le pesate registrate</span> (via il tratteggio che non c'era)
- righe 2721 — <div class="mp-note"><b>Perché qui non c'è la media a 7 gior
- righe 2723 — 
- righe 2792 — <p class="p7-note2" id="lb-nota-b" hidden></p>
- righe 2806-2809 — var sed=function(){return (window.BD_LB_SEED&&window.BD_LB_S
- righe 2823 — var cand=sed().filter(function(x){return x.d===dd;});
- righe 2836 — aggiornaMappa();
- righe 2849 — if(cnt&&(fv||fo))cnt.textContent=vis+" di "+sed().length+" s
- righe 2861 — <div id="pianificazione-viva"></div>
- righe 2903 — <p class="pr-sub">Le regole con cui le settimane salgono. Pe
- righe 2913 — <div class="rv" id="rv-vivo"></div><style>.rv,.sp,.db2{displ
- righe 3128 — <div class="sp-corpo" id="sp-corpo"></div>
- righe 3129 — 
- righe 3132 — 
- righe 3135 — <div class="v-occhiello">Programmi &middot; Curve di forza</
- righe 3137 — <p class="v-testo">La storia del carico per esercizio, sedut
- righe 3138 — 
- righe 3140-3142 — <div class="cv-card" id="cv-real" data-curva="non-calcolata"
- righe 3143 — 
- righe 3145 — <section class="voce-pag" id="pag-scheletri">
- righe 3186-3187 — <div class="sk-qh">Questionario</div>
- righe 3197 — <section class="voce-pag" id="pag-programma-1"><div class="p
- righe 3284 — <button class="pr-btn" id="t8-appprog" type="button">Applica
- righe 3317 — <div class="p8-box" id="box-A"><div class="p8-head"><div><di
- righe 3328 — 
- righe 3361 — 
- righe 3441 — </div></div></section><section class="voce-pag" id="pag-impo
- righe 3462 — <div class="st-row"><span>Build</span><b id="st-ver"></b></d
- righe 4118 — <p class="v-testo">Tutti i programmi del backup, attivo comp
- righe 4122 — <tbody id="archivio-corpo"></tbody>
- righe 5275-5283 — { /* B.14l: il testo a pezzi, la data dentro uno span vero: 
- righe 5469 — 
- righe 5629 — disegnaSchede(); disegnaLegenda();
- righe 5962 — var LABEL={"pag-dashboard":"Dashboard","pag-dati-cliente":"D
- righe 6220 — if(navigator.userActivation&&navigator.userActivation.hasBee
- righe 6337-6341 — /* la spia «Test» (B.16a-2): un insieme solo — nascosta senz
- righe 7020-7021 — <!-- beacon Cloudflare tolto (passo 16b): su GitHub Pages ch
- righe 7149-7185 — #pag-programma-1 .pr-shd-f{display:flex;flex-wrap:wrap;align
- righe 7327 — 
- righe 7354-7381 — /* ---- zebra (B.14h): un tono per esercizio, classi z-a/z-b
- righe 7426 — html body #pag-programma-1 td.c-rec .rec,html body #pag-prog
- righe 7472 — 
- righe 7522-7523 — /* ---- settimane: due celle, SER e REPS affiancate (niente 
- righe 7874 — window.BD_LB_SEED = null; /* passo 3c: tolto il seme di esem
- righe 8031 — ese.push('<div class="lb-ex"><b>' + sc(e.np || e.n) + '</b>'
- righe 8419-8420 — /* Passo B.20b: anche la Stampa da Compilare vive in comune/
- righe 8873 — var SEED = {config:{}, sessioni:[]};
- righe 8888-8891 — var P_ST = window.BDPesoB ? window.BDPesoB.leggiPeso() : { s
- righe 8915-8918 — var P_PROF = window.BDPesoB ? window.BDPesoB.leggiProfilo(nu
- righe 8995 — {l:'Peso', v:it(PESO, 1), u:'kg', f: ultimo ? gg(ultimo.d) +
- righe 9005 — return '<div class="p7-k' + (k.on ? '' : ' nd') + '"' + (k.id ? ' id="' + k.id + '"' : '') (il KPI del peso ha un id, così il pittore lo ridipinge)
- righe 9037 — el('ov-pesot').textContent = 'Andamento peso · ' + P_TESTO;
- righe 9052-9064 — if(el('tb-bmr') && (P_PROF.mancanti.length || PESO === null)
- righe 9103 — bf = GRASSO === null ? ' · massa magra non registrata: Katch
- righe 9154 — if(false){
- righe 9351 — '<div class="ese-chips2">' +
- righe 9902-9905 — /* I riquadri dell'analisi non sono in pagina (la linguetta 
- righe 9910 — kpi.innerHTML =
- righe 10085-10094 — // Passo 30: nei campi si lascia al browser la cronologia de
- righe 10204 — 
- righe 10248-10420 — <!-- beacon Cloudflare tolto (passo 16b): su GitHub Pages ch

### Come si legge

Se un blocco non combacia piu, si corregge il numero guardando il diff (`git diff --no-index -U0 pc/index.html desktop/index.html`), mai allargando il blocco: la guardia 42 vuole che ogni riga cambiata stia dentro un blocco e che nessun blocco sia morto.

### Cosa è cambiato, per passi (prosa, non blocchi)

- **Passo 8** — via i numeri del mockup da Curve di forza, Pianificazione, Misure e Dashboard; le quattro tab cancellate per errore (Scheletri, Programma 1, Impostazioni, Study time) sono state ripristinate identiche al v31.
- **Passo 15** — Dati cliente: tolte le linguette Wearable e Personalizzati con i loro pannelli.
- **Passo 16** — via dal codice il questionario personale di Scheletri, il link Cloudflare dell'email, le tre versioni ridotte a una (`window.BD_VERSIONE`), e la funzione che scriveva in riquadri inesistenti (`#t9-kpi`).
- **Passo 16b** — via la quarta versione rimasta nel menu, il beacon Cloudflare, un'icona mancante, e l'`AudioContext` creato prima di un gesto dell'utente.
- **Passo 17** — il peso ha una fonte sola (`comune/peso-b.js`): via le cinque pesate scritte nella pagina, via «178 cm · 31 anni», via il ripiego del profilo nei calcoli.
