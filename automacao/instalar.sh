#!/usr/bin/env sh
# Liga a automação: a cada commit (em qualquer repositório) o Obsidian e o README do perfil são atualizados.
# Rodar uma vez por máquina:  sh automacao/instalar.sh
# Desfazer:                   git config --global --unset core.hooksPath
set -e
AQUI=$(cd "$(dirname "$0")" && pwd)
DESTINO="$HOME/.githooks"
mkdir -p "$DESTINO"

SCRIPT=$(cd "$AQUI" && pwd -W 2>/dev/null || pwd)/registrar-commit.mjs
sed "s|__SCRIPT__|$SCRIPT|" "$AQUI/hooks/kevin-sync" > "$DESTINO/kevin-sync"

# Um "encadeador" por tipo de hook, para os hooks de .git/hooks de cada repositório continuarem funcionando.
for h in applypatch-msg pre-applypatch post-applypatch pre-commit pre-merge-commit prepare-commit-msg commit-msg \
         post-commit pre-rebase post-checkout post-merge pre-push post-rewrite; do
  cp "$AQUI/hooks/encadear" "$DESTINO/$h"
done
chmod +x "$DESTINO"/*

anterior=$(git config --global core.hooksPath || true)
if [ -n "$anterior" ] && [ "$anterior" != "$DESTINO" ]; then
  echo "⚠️  core.hooksPath global já era '$anterior'. Não troquei; ajuste à mão se quiser."
else
  git config --global core.hooksPath "$DESTINO"
fi

[ -f "$AQUI/config.json" ] || cp "$AQUI/config.example.json" "$AQUI/config.json"
echo "✅ Hooks instalados em $DESTINO"
echo "   Repositórios com core.hooksPath próprio (ex.: rkfbank) precisam chamar ~/.githooks/kevin-sync no post-commit deles."
echo "   Log da sincronização: $AQUI/sync.log"
