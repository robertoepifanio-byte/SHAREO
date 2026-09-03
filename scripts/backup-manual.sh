#!/usr/bin/env bash
#
# Backup manual do ShareO — banco + Storage, numa pasta datada.
#
# 🪤 Por que existe: o Supabase faz 7 dias de backup diário DO BANCO, mas NÃO
# faz backup do Storage e não oferece alternativa nativa (o banco guarda só o
# caminho do arquivo). `booking-photos` são as fotos de check-in e check-out —
# a base de prova das disputas. Sem isto, não existe cópia nenhuma delas.
#
# Uso:
#   bash scripts/backup-manual.sh staging
#   bash scripts/backup-manual.sh prod
#
# Pré-requisito, uma vez por máquina:
#   npx supabase login
#
# O que NÃO faz: subir para lugar nenhum. A cópia fica local, na pasta
# `backups/`, que está no .gitignore. Guardar num disco externo ou nuvem é
# decisão sua — cópia que mora na mesma máquina do original protege contra
# engano, não contra desastre.

set -euo pipefail

AMBIENTE="${1:-}"

case "$AMBIENTE" in
  staging) REF="zythygwvmrwrqmnrdufq" ;;
  prod)    REF="jdxdndrhjxtkaifbpagr" ;;
  *)
    echo "uso: bash scripts/backup-manual.sh <staging|prod>" >&2
    echo >&2
    echo "Dizer o ambiente é obrigatório de propósito: os dois refs se parecem" >&2
    echo "e já houve confusão entre eles. staging=zythy... prod=jdxd..." >&2
    exit 1
    ;;
esac

DATA=$(date +%Y-%m-%d_%H%M)
DESTINO="backups/${AMBIENTE}_${DATA}"
BUCKETS=(booking-photos id-docs item-images)

echo "Ambiente: $AMBIENTE  (ref $REF)"
echo "Destino:  $DESTINO"
echo

mkdir -p "$DESTINO"

# ─── Banco ───────────────────────────────────────────────────────────────────
# Schema e dados separados: restaurar schema num banco vazio é o caminho normal,
# e ter os dados à parte permite conferir/recortar sem reler um arquivo gigante.
echo "[1/3] Schema do banco…"
npx supabase db dump --project-ref "$REF" -f "$DESTINO/schema.sql"

echo "[2/3] Dados do banco…"
npx supabase db dump --project-ref "$REF" --data-only --use-copy -f "$DESTINO/dados.sql"

# ─── Storage ─────────────────────────────────────────────────────────────────
# É a parte que o backup automático NÃO cobre — a razão de este script existir.
echo "[3/3] Storage (os 3 buckets)…"
for BUCKET in "${BUCKETS[@]}"; do
  echo "  → $BUCKET"
  mkdir -p "$DESTINO/storage/$BUCKET"
  # -j 4: paralelismo modesto. Subir muito arrisca 429 do Storage API.
  npx supabase storage cp -r -j 4 --project-ref "$REF" \
    "ss:///$BUCKET" "$DESTINO/storage/$BUCKET" || {
      echo "  ⚠️  falhou em $BUCKET — os demais continuam" >&2
    }
done

echo
echo "─────────────────────────────────────────────"
du -sh "$DESTINO" 2>/dev/null || true
echo "Arquivos por bucket:"
for BUCKET in "${BUCKETS[@]}"; do
  N=$(find "$DESTINO/storage/$BUCKET" -type f 2>/dev/null | wc -l | tr -d ' ')
  printf "  %-16s %s\n" "$BUCKET" "$N"
done
echo
echo "✅ Backup em $DESTINO"
echo
echo "⚠️  Ainda na mesma máquina do original. Copie para fora (disco externo ou"
echo "    nuvem) — senão protege contra engano, não contra desastre."
