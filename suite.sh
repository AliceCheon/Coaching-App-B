#!/usr/bin/env bash
# Script unico della suite (richiesta di Alice). Tutta in un giro:
#   bash suite.sh
# Oppure una fetta per volta (quando il turno e' corto):
#   bash suite.sh azzera ; bash suite.sh veloce ; bash suite.sh 6x ;
#   bash suite.sh 7x ; bash suite.sh totale
# Ogni fetta scrive la sua riga in log-suite.txt; «totale» somma le fette.
cd "$(dirname "$0")" || exit 1
prendi() { grep -oE "$1 [0-9]+" "$2" | tail -1 | grep -oE "[0-9]+"; }
fetta() {
  nome="$1"
  shift
  "${NODE:-node}" --test "$@" > "log-slice-$nome.txt" 2>&1
  echo "fetta $nome: pass $(prendi pass "log-slice-$nome.txt") fail $(prendi fail "log-slice-$nome.txt")" >> log-suite.txt
  cat "log-slice-$nome.txt" >> log-suite.txt
  rm -f "log-slice-$nome.txt"
}
totale() {
  P=$(grep "^fetta " log-suite.txt | grep -oE "pass [0-9]+" | awk '{s+=$2} END {print s+0}')
  F=$(grep "^fetta " log-suite.txt | grep -oE "fail [0-9]+" | awk '{s+=$2} END {print s+0}')
  echo "TOTALE pass $P fail $F"
}
case "$1" in
  azzera) : > log-suite.txt ;;
  veloce) VELOCE=$(ls tests/*.test.mjs | grep -v "tests/6" | grep -v "tests/7" | tr '\n' ' '); fetta veloce $VELOCE ;;
  6x) fetta 6x tests/6*.test.mjs ;;
  7x) fetta 7x tests/7*.test.mjs ;;
  totale) totale ;;
  "") : > log-suite.txt
    VELOCE=$(ls tests/*.test.mjs | grep -v "tests/6" | grep -v "tests/7" | tr '\n' ' ')
    fetta veloce $VELOCE
    fetta 6x tests/6*.test.mjs
    fetta 7x tests/7*.test.mjs
    totale ;;
esac
