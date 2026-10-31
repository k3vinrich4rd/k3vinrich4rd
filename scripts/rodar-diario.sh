#!/usr/bin/env bash
# Rotina diária do perfil, rodada na máquina de automação (gh logado como k3vinrich4rd).
# Faz tudo: atualiza a main, gera o diário do dia, a tabela de últimos commits (privados só como "projeto privado"),
# as metas e o progresso.md, ajusta cabeçalhos/índice do README, commita como o Kevin (conta na ofensiva) e dá push.
# Sem mudança, não commita.
#
# Antes de chamar, a rotina pode deixar no clone (o commit leva junto):
#   diario/inbox/AAAA-MM-DD.md   resumo do diário do Obsidian (vira a fonte do diario/AAAA-MM-DD.md)
#   metas/progresso.json         metas com feitos/commits classificados
# Uso: bash scripts/rodar-diario.sh [--seco]
set -euo pipefail
cd "$(dirname "$0")/.."

NOME="${KEVIN_NOME:-k3vinrich4rd}"
EMAIL="${KEVIN_EMAIL:-kevinrichardve@gmail.com}"
SECO="${1:-}"

gh auth status >/dev/null 2>&1 || { echo "erro: gh não está logado (gh auth login)"; exit 1; }
[ "$(git rev-parse --abbrev-ref HEAD)" = main ] || git switch -q main
git config user.name "$NOME"
git config user.email "$EMAIL"
git pull -q --rebase --autostash origin main

unset GH_TOKEN GITHUB_TOKEN # usa o gh logado (enxerga os privados)
if [ "$SECO" = "--seco" ]; then node scripts/perfil-diario.mjs --seco; exit 0; fi
saida="$(node scripts/perfil-diario.mjs)"; echo "$saida"
node scripts/atualizar-readme.mjs >/dev/null # cabeçalhos das seções, índice e SVGs (sem API)

git add README.md progresso.md diario metas assets
if git diff --cached --quiet; then echo "Nada mudou: sem commit."; exit 0; fi
dia="$(TZ=America/Sao_Paulo date +%F)"
fonte="$(sed -n 's/^> Fonte: \([^.(]*\).*/\1/p' "diario/$dia.md" 2>/dev/null | head -1 | sed 's/ *$//')"
git commit -q -m "docs(diario): $dia${fonte:+ — $fonte}"
for tentativa in 1 2 3; do
  git push -q origin main && break
  git pull -q --rebase -X theirs origin main
done
echo "ok: $(git log -1 --format='%h %an <%ae> %s')"
