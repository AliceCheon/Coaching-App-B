#!/usr/bin/env bash
# Script unico della suite (richiesta di Alice).
#   bash suite.sh prossima   -> esegue la prima fetta non ancora nel log
#   bash suite.sh elenco     -> nome, quanti file e quali file di ogni fetta
#   bash suite.sh totale     -> somma le fette e verifica i file coperti
#   bash suite.sh azzera     -> svuota log-suite.txt
#   bash suite.sh nodo       -> quale Node vero si usa
#   bash suite.sh fetta <n>  -> rifai una sola fetta
#   bash suite.sh            -> tutte le fette di fila + TOTALE
# Regola dal 19 novembre 2026: NIENTE --test-timeout=0. scripts/con-tetto.mjs
# da' 60 secondi a ogni prova e 240 a ogni file; una fetta che li supera dice
# «TOTALE FALLITO» col nome del file bloccato. La suite non resta piu' appesa.
# Regola dal 17 novembre 2026: una fetta deve stare sotto i 35 secondi, cosi'
# una sola chiamata (45 s) la porta a termine e il log resta scritto. Le fette
# lunghe sono spezzate in blocchi: veloce1/veloce2 da 16 file, 6x e 7x da 4.
# Regola dal 16 novembre 2026: si usa SOLO il Node vero, e lo si sceglie
# PROVANDO che --test parta davvero. Lo shim di GensparkAIO risponde
# "managed runtime is not available" e non esegue nulla: con quello una fetta
# gira a vuoto e il TOTALE direbbe "0 e 0", che e' peggio di un errore.
cd "$(dirname "$0")" || exit 1

# PowerShell (19/11/2026): lanciata da nohup, questa bash non lo trova nel PATH.
# Lo si cerca una volta, col percorso vero di Windows, e poi si usa sempre $PS.
PS=""
for c in powershell.exe "$SYSTEMROOT/System32/WindowsPowerShell/v1.0/powershell.exe" "/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe" "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe"; do
  [ -n "$c" ] || continue
  if "$c" -NoProfile -Command "exit 0" >/dev/null 2>&1; then PS="$c"; break; fi
done
if [ -z "$PS" ]; then
  echo "pulizia: PowerShell non trovata, ne nel PATH ne in /c/Windows/System32/WindowsPowerShell/v1.0/"
  echo "Mi fermo qui: senza PowerShell non posso spegnere i test appesi, quindi non lancio nessuna corsa."
  exit 3
fi

# --- Un solo giro alla volta (19 novembre 2026) -----------------------------
# Due suite concorrenti si pestavano i piedi: le fette uscivano MANCATE e i log
# restavano vuoti. Qui: prima si spengono i processi di test rimasti appesi
# (SOLO node.exe con --test, mai altri node: gli strumenti di lavoro restano),
# poi si prende un file di blocco con il PID. Se quel PID e' ancora vivo
# un'altra suite e' in corso e questa esce subito. Il blocco si toglie sempre,
# anche quando la suite fallisce.
BLOCCO=".suite.lock"

# La pulizia sta in uno script a parte: le virgolette annidate dentro Git Bash
# si rompono, e un file .ps1 lanciato con -File non ha questo problema. Lo
# script mostra l'elenco PRIMA e DOPO, cosi' nel log si vede che i processi
# sono davvero spariti.
processi_test() {
  "$PS" -NoProfile -ExecutionPolicy Bypass -File scripts/elenco-test.ps1 2>/dev/null
}

pulisci_test() {
  local out esito
  out=$("$PS" -NoProfile -ExecutionPolicy Bypass -File scripts/ferma-test.ps1 2>&1)
  esito=$?
  if [ -n "$out" ]; then
    printf '%s
' "$out" | sed 's/^/pulizia | /'
  else
    echo "pulizia: lo script non ha risposto (powershell non raggiungibile)"
  fi
  if [ "$esito" != "0" ]; then echo "pulizia: restano processi di test vivi"; fi
  return 0
}

pid_vivo() {
  local pid="$1"
  [ -n "$pid" ] || return 1
  kill -0 "$pid" 2>/dev/null && return 0
  "$PS" -NoProfile -Command "if (Get-Process -Id $pid -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }" >/dev/null 2>&1
}

if [ -f "$BLOCCO" ]; then
  ALTRO=$(tr -dc '0-9' < "$BLOCCO" | head -c 12)
  if pid_vivo "$ALTRO"; then
    echo "TOTALE FALLITO: un'altra suite e' in corso (PID $ALTRO)"
    exit 3
  fi
  rm -f "$BLOCCO"
fi

pulisci_test
printf '%s\n' "$" > "$BLOCCO"
trap 'rm -f "$BLOCCO"' EXIT INT TERM

NODE=""
MOTIVO=""

trovare_node() {
  local cand dir out
  for cand in "$(command -v node 2>/dev/null)" "C:/Program Files/nodejs/node.exe" "/c/Program Files/nodejs/node.exe" "/mnt/c/Program Files/nodejs/node.exe"; do
    if [ -z "$cand" ]; then
      MOTIVO="$MOTIVO . nessun node nel PATH"
      continue
    fi
    if ! "$cand" -e "process.exit(0)" >/dev/null 2>&1; then
      MOTIVO="$MOTIVO . non parte: $cand"
      continue
    fi
    dir=".prova-node-$$"
    rm -rf "$dir"
    if ! mkdir -p "$dir"; then
      MOTIVO="$MOTIVO . non posso creare la cartella di prova dentro il repo"
      continue
    fi
    printf 'import { test } from "node:test";\ntest("prova", () => {});\n' > "$dir/p.test.mjs"
    out=$("$cand" --test "$dir/p.test.mjs" 2>&1)
    rm -rf "$dir"
    if echo "$out" | grep -qE "pass 1"; then
      NODE="$cand"
      return 0
    fi
    MOTIVO="$MOTIVO . c'e' ma --test non parte: $cand ($(echo "$out" | grep -vE '^[[:space:]]*$' | head -1))"
  done
  return 1
}

if ! trovare_node; then
  echo "NODE VERO NON DISPONIBILE:$MOTIVO"
  echo "TOTALE FALLITO: Node vero non disponibile, nessuna fetta valida"
  exit 2
fi

prendi() { grep -oE "$1 [0-9]+" "$2" | tail -1 | grep -oE "[0-9]+"; }

# Una fetta: nome + i file da passare a --test. Scrive una riga in log-suite.txt.
fetta() {
  local nome="$1"
  shift
  local nfile=$#
  local log="log-slice-$nome.txt"
  if [ "$nfile" -eq 0 ]; then
    echo "fetta $nome: MANCATA (nessun file in questa fetta)" | tee -a log-suite.txt
    return 1
  fi
  # Il tetto (19/11/2026): 60 s a ogni prova dentro scripts/con-tetto.mjs,
  # 240 s a ogni file qui. Prima --test-timeout=0 lasciava la suite appesa
  # per sempre su una prova che non finiva.
  local avviso esitoFile blocc
  avviso=$("$NODE" scripts/con-tetto.mjs "$log" 240 "$@" 2>&1 1>/dev/null < /dev/null)
  esitoFile=$?
  if [ "$esitoFile" = "124" ]; then
    blocc=$(printf '%s' "$avviso" | grep -o 'BLOCCATO: .*' | sed 's/^BLOCCATO: //')
    echo "fetta $nome: TOTALE FALLITO (bloccata: ${blocc:-file sconosciuto})" | tee -a log-suite.txt
    [ -f "$log" ] && cat "$log" >> log-suite.txt && rm -f "$log"
    return 1
  fi
  local p f
  # Una fetta puo' avere piu' file: ogni file ha il suo riepilogo, qui si somma.
  if ! grep -qE "^. pass [0-9]+$" "$log" 2>/dev/null; then
    echo "fetta $nome: MANCATA (nessun risultato da --test, vedi $log)" | tee -a log-suite.txt
    return 1
  fi
  p=$(awk '$2=="pass"{s+=$3} END{print s+0}' "$log")
  f=$(awk '$2=="fail"{s+=$3} END{print s+0}' "$log")
  echo "fetta $nome: pass $p fail $f file $nfile" | tee -a log-suite.txt
  cat "$log" >> log-suite.txt
  rm -f "$log"
  [ "$f" = "0" ]
}

# Spezza un elenco in blocchi di "passo" file: nome-1, nome-2, ...
chunkizza() {
  local nome="$1"
  local passo="$2"
  shift 2
  local tot=$#
  local i=0 k=1
  while [ "$i" -lt "$tot" ]; do
    local -a files=("${@:i+1:passo}")
    printf '%s-%d\t%d\t%s\n' "$nome" "$k" "${#files[@]}" "${files[*]}" >> fette.txt
    i=$((i + passo))
    k=$((k + 1))
  done
}

# Elenco completo delle fette in fette.txt (nome, quanti file, quali file).
costruisci() {
  local testa meta
  testa=$(ls tests/*.test.mjs 2>/dev/null | grep -v "tests/6" | grep -v "tests/7")
  read -r -a VELOCE_ARR <<< "$(echo "$testa" | tr '\n' ' ')"
  meta=$(( (${#VELOCE_ARR[@]} + 1) / 2 ))
  : > fette.txt
  chunkizza veloce1 8 "${VELOCE_ARR[@]:0:$meta}"
  chunkizza veloce2 8 "${VELOCE_ARR[@]:$meta}"
  chunkizza 6x 2 tests/6*.test.mjs
  chunkizza 7x 2 tests/7*.test.mjs
}

prossima() {
  costruisci
  local nome nf fl
  while IFS=$'\t' read -r nome nf fl; do
    if grep -q "^fetta $nome:" log-suite.txt; then
      continue
    fi
    read -r -a ARR <<< "$fl"
    fetta "$nome" "${ARR[@]}"
    return $?
  done < fette.txt
  echo "nessuna fetta da fare: il log ha gia' tutte le fette (usa azzera per rifare)" | tee -a log-suite.txt
  return 0
}

totale() {
  costruisci
  local nome nf fl linea p f
  local P=0 F=0 NF=0 mancanti="" sudisco
  sudisco=$(ls tests/*.test.mjs 2>/dev/null | wc -l | tr -d ' ')
  while IFS=$'\t' read -r nome nf fl; do
    linea=$(grep "^fetta $nome:" log-suite.txt | tail -1)
    if [ -z "$linea" ] || echo "$linea" | grep -q MANCATA; then
      mancanti="$mancanti $nome"
      continue
    fi
    p=$(echo "$linea" | grep -oE "pass [0-9]+" | grep -oE "[0-9]+")
    f=$(echo "$linea" | grep -oE "fail [0-9]+" | grep -oE "[0-9]+")
    P=$((P + p))
    F=$((F + f))
    NF=$((NF + nf))
  done < fette.txt
  if [ -n "$mancanti" ] || [ "$NF" != "$sudisco" ] || [ "$F" != "0" ]; then
    echo "TOTALE FALLITO pass $P fail $F file $NF/$sudisco . fette mancanti:$mancanti"
    return 1
  fi
  echo "TOTALE pass $P fail $F file $NF/$sudisco"
}

case "$1" in
  nodo) echo "node vero: $NODE" ;;
  azzera) : > log-suite.txt; echo "log-suite.txt svuotato" ;;
  elenco) costruisci; awk -F'\t' '{printf "%-10s %2d file  %s\n", $1, $2, $3}' fette.txt | cut -c1-150 ;;
  prossima) prossima ;;
  fetta)
    shift
    if [ -z "$1" ]; then
      echo "fetta sconosciuta: serve il nome"
      echo "TOTALE FALLITO: fetta sconosciuta"
      exit 2
    fi
    costruisci
    RIGA=$(awk -F'\t' -v n="$1" '$1==n' fette.txt)
    if [ -z "$RIGA" ]; then
      echo "fetta sconosciuta: $1"
      echo "TOTALE FALLITO: fetta sconosciuta"
      exit 2
    fi
    FLCH=$(echo "$RIGA" | awk -F'\t' '{print $3}')
    read -r -a ARR <<< "$FLCH"
    fetta "$1" "${ARR[@]}" ;;
  totale) totale ;;
  "")
    : > log-suite.txt
    costruisci
    while IFS=$'\t' read -r NOME NF FL; do
      read -r -a ARR <<< "$FL"
      fetta "$NOME" "${ARR[@]}" || echo "(fetta non andata, continuo)"
    done < fette.txt
    totale ;;
  *) echo "fetta sconosciuta: $1"; echo "TOTALE FALLITO: fetta sconosciuta"; exit 2 ;;
esac
