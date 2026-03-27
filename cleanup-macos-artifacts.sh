#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# cleanup-macos-artifacts.sh
#
# Remove os arquivos de metadados macOS (._*) que o Finder/CopyAgent gera
# automaticamente ao copiar arquivos entre volumes. Esses arquivos são lixo
# do sistema operacional e não fazem parte do projeto FlowCut.
#
# USO:
#   cd /Volumes/SSD\ EXTERNO/DOWNLOAD/FlowCut
#   chmod +x cleanup-macos-artifacts.sh
#   ./cleanup-macos-artifacts.sh
#
# O script mostra o que vai apagar ANTES de apagar (dry-run primeiro).
# ─────────────────────────────────────────────────────────────────────────────

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "🔍 FlowCut — Limpeza de arquivos de metadados macOS"
echo "📁 Pasta do projeto: $PROJECT_ROOT"
echo ""

# ─── Contagem antes ─────────────────────────────────────────────────
COUNT=$(find "$PROJECT_ROOT" -name "._*" -not -path "*/.git/*" | wc -l | tr -d ' ')

if [ "$COUNT" -eq 0 ]; then
  echo "✅ Nenhum arquivo ._ encontrado. Projeto limpo."
  exit 0
fi

echo "⚠️  Encontrados $COUNT arquivos ._ para remover:"
echo ""

# ─── Dry-run: lista o que vai ser removido ──────────────────────────
find "$PROJECT_ROOT" -name "._*" -not -path "*/.git/*" | sort | while read -r f; do
  echo "   🗑  $f"
done

echo ""
echo "─────────────────────────────────────────────────────────────────"
read -p "Confirmar remoção de $COUNT arquivos? (s/N): " CONFIRM

if [[ "$CONFIRM" =~ ^[Ss]$ ]]; then
  find "$PROJECT_ROOT" -name "._*" -not -path "*/.git/*" -delete
  echo ""
  echo "✅ $COUNT arquivos removidos com sucesso."
else
  echo ""
  echo "❌ Operação cancelada. Nenhum arquivo foi removido."
fi

echo ""
