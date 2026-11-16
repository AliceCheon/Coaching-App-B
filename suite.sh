#!/usr/bin/env bash
# Script unico della suite (richiesta di Alice).
#   bash suite.sh            -> tutte le fette + TOTALE
#   bash suite.sh azzera | veloce | 6x | 7x | totale | nodo
# Regola dal 16 novembre 2026: si usa SOLO il Node vero, e lo si sceglie
# PROVANDO che --test parta davvero. Lo shim di GensparkAIO risponde
# «managed runtime is not available» e non esegue nulla: con quello una fetta
# gira a vuoto e il TOTALE direbbe «0 e 0», che e' peggio di un errore.
cd "$(dirname "$0")" || exit 1

NODE=""
MOTIVO=""

trovare_node() {
  local cand dir out
  for cand in "$(command -v node 2>/dev/null)" "C:/Program Files/nodejs/node.exe" "/c/Program Files/nodejs/node.exe" "/mnt/c/Program Files/nodejs/node.exe"; do
    if [ -z "$cand" ]; then
      MOTIVO="$MOTIVO · nessun node nel PATH"
      continue
    fi
    if ! "$cand" -e "process.exit(0)" >/dev/null 2>&1; then
      MOTIVO="$MOTIVO · non parte: $cand"
      continue
    fi
    dir=".prova-node-$$"
    rm -rf "$dir"
    if ! mkdir -p "$dir"; then
      MOTIVO="$MOTIVO · non posso creare la cartella di prova dentro il repo"
      continue
    fi
    printf 'import { test } from "node:test";\ntest("prova", () => {});\n' > "$dir/p.test.mjs"
    out=$("$cand" --test "$dir/p.test.mjs" 2>&1)
    rm -rf "$dir"
    if echo "$out" | grep -qE "pass 1"; then
      NODE="$cand"
      return 0
    fi
    MOTIVO="$MOTIVO · c'e' ma --test non parte: $cand ($(echo "$out" | grep -vE '^[[:space:]]*$' | head -1))"
  done
  return 1
}

if ! trovare_node; then
  echo "NODE VERO NON DISPONIBILE:$MOTIVO"
  echo "TOTALE FALLITO: Node vero non disponibile, nessuna fetta valida"
  exit 2
fi

prendi() { grep -oE "$1 [0-9]+" "$2" | tail -1 | grep -oE "[0-9]+"; }

fetta() {
  local nome="$1"
  shift
  local nfile=$#
  local log="log-slice-$nome.txt"
  if [ "$nfile" -eq 0 ]; then
    echo "fetta $nome: MANCATA (nessun file in questa fetta)" | tee -a log-suite.txt
    return 1
  fi
  "$NODE" --test "$@" > "$log" 2>&1
  local p f
  p=$(prendi pass "$log")
  f=$(prendi fail "$log")
  if [ -z "$p" ] || [ -z "$f" ]; then
    echo "fetta $nome: MANCATA (nessun risultato da --test, vedi $log)" | tee -a log-suite.txt
    return 1
  fi
  echo "fetta $nome: pass $p fail $f file $nfile" | tee -a log-suite.txt
  cat "$log" >> log-suite.txt
  rm -f "$log"
  [ "$f" = "0" ]
}

totale() {
  local P=0 F=0 NF=0 mancanti="" nome linea p f nf sudisco
  sudisco=$(ls tests/*.test.mjs 2>/dev/null | wc -l | tr -d ' ')
  for nome in veloce1 veloce2 6x 7x; do
    linea=$(grep "^fetta $nome:" log-suite.txt | tail -1)
    if [ -z "$linea" ]; then
      mancanti="$mancanti $nome"
      continue
    fi
    if echo "$linea" | grep -q MANCATA; then
      mancanti="$mancanti $nome"
      continue
    fi
    p=$(echo "$linea" | grep -oE "pass [0-9]+" | grep -oE "[0-9]+")
    f=$(echo "$linea" | grep -oE "fail [0-9]+" | grep -oE "[0-9]+")
    nf=$(echo "$linea" | grep -oE "file [0-9]+" | grep -oE "[0-9]+")
    P=$((P + p))
    F=$((F + f))
    NF=$((NF + nf))
  done
  if [ -n "$mancanti" ] || [ "$NF" != "$sudisco" ] || [ "$F" != "0" ]; then
    echo "TOTALE FALLITO pass $P fail $F file $NF/$sudisco · fette mancanti:$mancanti"
    return 1
  fi
  echo "TOTALE pass $P fail $F file $NF/$sudisco"
}

VELOCE=$(ls tests/*.test.mjs | grep -v "tests/6" | grep -v "tests/7" | tr "
" " ")
read -r -a VELOCE_ARR <<< "$VELOCE"
METAV=$(( (${#VELOCE_ARR[@]} + 1) / 2 ))
VELOCE1=("${VELOCE_ARR[@]:0:$METAV}")
VELOCE2=("${VELOCE_ARR[@]:$METAV}")

case "$1" in
  nodo) echo "node vero: $NODE" ;;
  azzera) : > log-suite.txt ;;
  veloce1) fetta veloce1 "${VELOCE1[@]}" ;;
  veloce2) fetta veloce2 "${VELOCE2[@]}" ;;
  6x) fetta 6x tests/6*.test.mjs ;;
  7x) fetta 7x tests/7*.test.mjs ;;
  totale) totale ;;
  "")
    : > log-suite.txt
    fetta veloce1 "${VELOCE1[@]}"
    fetta veloce2 "${VELOCE2[@]}"
    fetta 6x tests/6*.test.mjs
    fetta 7x tests/7*.test.mjs
    totale ;;
  *) echo "fetta sconosciuta: $1"; echo "TOTALE FALLITO: fetta sconosciuta"; exit 2 ;;
esac
