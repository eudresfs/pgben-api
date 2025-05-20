#!/bin/bash

echo "🔄 Iniciando substituição de valores antigos do ENUM role..."

# Passo 1: Substituir os valores em strings (ex: 'administrador' -> 'admin')
echo "1️⃣ Substituindo strings de roles antigos para novos..."
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.json" \) | while read file; do
  sed -i '' \
    -e "s/'administrador'/'admin'/g" \
    -e "s/'gestor_semtas'/'gestor'/g" \
    -e "s/'tecnico_semtas'/'tecnico'/g" \
    -e "s/'tecnico_unidade'/'tecnico'/g" \
    -e "s/'coordenador_unidade'/'coordenador'/g" \
    "$file"
done

# Passo 2: Substituir os nomes do enum se usados como Role.*
echo "2️⃣ Substituindo nomes do enum Role..."
find . -type f \( -name "*.ts" -o -name "*.tsx" \) | while read file; do
  sed -i '' \
    -e "s/Role.ADMINISTRADOR/Role.ADMIN/g" \
    -e "s/Role.GESTOR_SEMTAS/Role.GESTOR/g" \
    -e "s/Role.TECNICO/Role.TECNICO/g" \
    -e "s/Role.TECNICO/Role.TECNICO/g" \
    -e "s/Role.COORDENADOR/Role.COORDENADOR/g" \
    "$file"
done

# Passo 3: Avisar se ainda restam ocorrências manuais
echo "🔍 Verificando se ainda restam valores antigos no projeto..."
grep -rnE "administrador|gestor_semtas|tecnico_semtas|tecnico_unidade|coordenador_unidade" . || echo "✅ Nenhuma ocorrência restante encontrada."

echo "✅ Script finalizado!"
