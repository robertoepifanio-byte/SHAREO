#!/usr/bin/env bash
# Roda o roteiro Maestro no emulador já de pé (chamado por android-smoke.yml).
# Existe como arquivo próprio porque reactivecircus/android-emulator-runner
# executa cada linha do input `script:` como uma chamada `sh -c` isolada — um
# script multi-linha com `\`/`&&`/background quebra (visto na prática: o
# Maestro recebeu o path do flow terminado em `\` literal).
set -e
mkdir -p out
adb install -r app.apk
export PATH="$HOME/.maestro/bin:$PATH"

adb shell screenrecord /sdcard/android-smoke.mp4 &
REC_PID=$!

set +e
maestro test apps/mobile/.maestro/android-smoke.yaml -e EMAIL="teste_pf_01@demo.shareo.com.br" -e PASSWORD="$MAESTRO_TEST_PASSWORD" --debug-output out/maestro-debug
STATUS=$?
set -e

kill -INT "$REC_PID" 2>/dev/null || true
sleep 3
adb pull /sdcard/android-smoke.mp4 out/ 2>/dev/null || true
mv ./*.png out/ 2>/dev/null || true
exit $STATUS
