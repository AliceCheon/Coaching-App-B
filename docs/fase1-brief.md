# Barbell Diva B — Brief di consegna (fine fase 0 → inizio fase 1)

> Da dare in pasto al nuovo assistente: tutto il contesto essenziale in una pagina.
> Data: 2 novembre 2026. La memoria completa di progetto è in `docs/memory-bank/progress_log.md` (leggerla SEMPRE per prima).

## Chi è Alice
Personal trainer specializzata in bodybuilding, progetto «Barbell Diva». Preferisce spiegazioni semplici, tono incoraggiante, italiano.

## Il progetto in 10 righe
- **App A** = «Coaching-App», repo pubblica GitHub `AliceCheon/Coaching-App-` (v148.38): l'app vera, con Firestore (progetto `barbell-diva`). **NON TOCCARE MAI**: repo, branch, regole Firestore, dati. Solo letture pubbliche.
- **App B** = questa repo (`AliceCheon/Coaching-App-B`): dashboard di **SOLA LETTURA** dei dati di A, su PC e telefono. HTML+JS vanilla, moduli ES, niente bundler.
- **Fase 0 COMPLETATA e online** (2/11/2026): login Google OK, dati veri letti da Firestore (123 documenti in sottoraccolta `sessions/`, check-in 2026-10-21), tema doppio OK su PC e telefono.
- Sito: `https://alicecheon.github.io/Coaching-App-B/desktop/` e `.../mobile/`
- Repo locale sul PC di Alice: `C:\Users\39320\Documents\Barbell-Diva-B\Coaching-App-B` (in git-bash: `/c/Users/39320/Documents/Barbell-Diva-B/Coaching-App-B`).
- Stato: branch `main`, commit `2f8d71a` (fase 0) + `c8575bf` (registro); build `b0.1-fase0`; 28 file; suite 20/20 con `node --test`.

## Vincoli permanenti
1. B è SOLO LETTURA finché Alice non approva esplicitamente le scritture.
2. Mai toccare A (repo, regole, dati). Mai push o modifiche senza chiedere ad Alice prima.
3. Niente APK, niente Firebase nuovo; la config pubblica di A è già in `app-config-b.js`.
4. Identificativi sensibili sempre spezzati nei sorgenti (es. prefisso chiavi `bd-b.v1.`, mai le chiavi di A per intero).
5. Privacy nei contenuti: niente dati personali veri; dati mancanti = «non registrato»; numeri di prova inventati etichettati come tali.
6. La shell del PC di Alice è **BASH (git-bash), NON PowerShell** (percorsi `/c/Users/...`). Git già configurato (firma `AliceCheon` + email noreply, credenziali GitHub salvate).
7. Versione a sorgente unico in `app-config-b.js`; bump con `scripts/bump-b.sh` + test di guardia 01. Prima di ogni consegna: suite verde.

## Fase 1 — da dove ripartire
- **Punto 1 (già nel registro)**: la card «Sedute registrate» mostra **0** (contatore nel documento radice di A) mentre la sottoraccolta `sessions/` contiene **123 documenti veri**. Decidere con Alice quale lettura è «la verità» da mostrare e correggere.
- Eventuali prime scritture nuove: SOLO su percorsi/sottoraccolte nuovi e SOLO con account di prova, dopo esplicito OK di Alice.
- Estetica/branding dal mockup Barbell Diva: è la **FASE 2**, non anticipare.

## Procedura di lavoro
1. Leggere `docs/memory-bank/progress_log.md` (nella repo locale o su GitHub).
2. Lavorare nella repo locale del PC di Alice (o in sandbox e poi consegnare), aggiornando il registro a ogni tappa.
3. Push solo dopo accordo con Alice; Pages si aggiorna da solo dopo il push su `main`.
