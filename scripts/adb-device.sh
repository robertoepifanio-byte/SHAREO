#!/usr/bin/env bash
# Helper de teste em device Android real (ShareO).
# Resolve o adb do winget automaticamente e converte coordenadas do screenshot
# exibido (900x2000) para a resolução real do device (1080x2400) — fator 1.2.
#
# Uso:
#   scripts/adb-device.sh shot [arquivo.png]   # screencap + pull (default: device-shot.png no cwd)
#   scripts/adb-device.sh tap <x> <y>          # x,y COMO VISTOS NO SCREENSHOT (converte ×1.2)
#   scripts/adb-device.sh tapraw <x> <y>       # x,y na resolução real do device (sem conversão)
#   scripts/adb-device.sh swipe <x1> <y1> <x2> <y2> [ms]  # coords do screenshot (converte ×1.2)
#   scripts/adb-device.sh text "conteudo"      # digita texto (espacos ok)
#   scripts/adb-device.sh back                 # botão voltar
#   scripts/adb-device.sh devices              # lista devices
#
# ⚠️ O device é o celular PESSOAL do fundador: confira o que está na tela (shot)
# antes de qualquer tap — notificações reais podem interceptar o toque.

set -euo pipefail

SCALE="${ADB_SCALE:-1.2}"

find_adb() {
  if command -v adb >/dev/null 2>&1; then command -v adb; return; fi
  local winget="/c/Users/${USERNAME:-Roberto}/AppData/Local/Microsoft/WinGet/Packages"
  local hit
  hit=$(ls -d "$winget"/Google.PlatformTools*/platform-tools/adb.exe 2>/dev/null | head -1 || true)
  if [ -n "$hit" ]; then echo "$hit"; return; fi
  echo "adb não encontrado (nem no PATH nem no winget)" >&2; exit 1
}

ADB="$(find_adb)"

scale() { awk -v v="$1" -v s="$SCALE" 'BEGIN { printf "%d", v * s }'; }

cmd="${1:-}"; shift || true
case "$cmd" in
  shot)
    out="${1:-device-shot.png}"
    "$ADB" shell screencap -p /sdcard/_claude_shot.png
    "$ADB" pull /sdcard/_claude_shot.png "$out" >/dev/null
    "$ADB" shell rm /sdcard/_claude_shot.png
    echo "screenshot: $out"
    ;;
  tap)
    x=$(scale "$1"); y=$(scale "$2")
    "$ADB" shell input tap "$x" "$y"
    echo "tap $1,$2 (screenshot) -> $x,$y (device)"
    ;;
  tapraw)
    "$ADB" shell input tap "$1" "$2"
    ;;
  swipe)
    x1=$(scale "$1"); y1=$(scale "$2"); x2=$(scale "$3"); y2=$(scale "$4"); ms="${5:-300}"
    "$ADB" shell input swipe "$x1" "$y1" "$x2" "$y2" "$ms"
    ;;
  text)
    "$ADB" shell input text "$(printf '%s' "$*" | sed 's/ /%s/g')"
    ;;
  back)
    "$ADB" shell input keyevent KEYCODE_BACK
    ;;
  devices)
    "$ADB" devices -l
    ;;
  *)
    grep '^#' "$0" | sed 's/^# \{0,1\}//' | head -20
    exit 1
    ;;
esac
