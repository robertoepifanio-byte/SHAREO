# Sonda de CI — ARQUIVO DESCARTÁVEL, NÃO MESCLAR

Criado em 2026-08-20 para provar a correção do PR #329 (`ci: remove
paths-ignore do gatilho de pull_request`).

**Hipótese sob teste:** um PR que toca APENAS arquivos `.md`/`docs/` agora
dispara os três checks obrigatórios da branch protection — "Lint and Type
Check", "Tests" e "Mobile Tests Gate" — e fica mergeable sem `--admin`.

Antes do #329 esse mesmo PR ficaria `BLOCKED`: o `paths-ignore` impedia os
jobs de rodar, e o GitHub espera indefinidamente por um check ausente em vez
de tratá-lo como dispensado.

O PR que carrega este arquivo deve ser **fechado sem merge** assim que o
resultado for observado.
