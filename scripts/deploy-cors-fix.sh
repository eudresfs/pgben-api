#!/bin/bash

# Script para aplicar correções de CORS em produção
# Sistema PGBEN - SEMTAS

set -e

echo "=== Deploy de Correções CORS - Sistema PGBEN ==="
echo "Data: $(date)"
echo

# Verificar se está rodando como root ou com sudo
if [[ $EUID -ne 0 ]]; then
   echo "Este script deve ser executado como root ou com sudo"
   exit 1
fi

# Definir variáveis
NGINX_CONFIG_SOURCE="./config/nginx/nginx.prod.conf"
NGINX_CONFIG_DEST="/etc/nginx/sites-available/pgben"
NGINX_CONFIG_ENABLED="/etc/nginx/sites-enabled/pgben"
BACKUP_DIR="/etc/nginx/backup/$(date +%Y%m%d_%H%M%S)"
SERVICE_NAME="pgben-server"

echo "1. Criando backup da configuração atual..."
mkdir -p "$BACKUP_DIR"
if [ -f "$NGINX_CONFIG_DEST" ]; then
    cp "$NGINX_CONFIG_DEST" "$BACKUP_DIR/nginx.prod.conf.backup"
    echo "   ✓ Backup criado em: $BACKUP_DIR"
else
    echo "   ⚠ Arquivo de configuração não encontrado, continuando..."
fi

echo
echo "2. Verificando arquivo de configuração..."
if [ ! -f "$NGINX_CONFIG_SOURCE" ]; then
    echo "   ✗ Erro: Arquivo $NGINX_CONFIG_SOURCE não encontrado"
    exit 1
fi
echo "   ✓ Arquivo de configuração encontrado"

echo
echo "3. Copiando nova configuração..."
cp "$NGINX_CONFIG_SOURCE" "$NGINX_CONFIG_DEST"
echo "   ✓ Configuração copiada"

echo
echo "4. Criando link simbólico (se necessário)..."
if [ ! -L "$NGINX_CONFIG_ENABLED" ]; then
    ln -s "$NGINX_CONFIG_DEST" "$NGINX_CONFIG_ENABLED"
    echo "   ✓ Link simbólico criado"
else
    echo "   ✓ Link simbólico já existe"
fi

echo
echo "5. Testando configuração do nginx..."
if nginx -t; then
    echo "   ✓ Configuração do nginx válida"
else
    echo "   ✗ Erro na configuração do nginx"
    echo "   Restaurando backup..."
    if [ -f "$BACKUP_DIR/nginx.prod.conf.backup" ]; then
        cp "$BACKUP_DIR/nginx.prod.conf.backup" "$NGINX_CONFIG_DEST"
        echo "   ✓ Backup restaurado"
    fi
    exit 1
fi

echo
echo "6. Recarregando nginx..."
if systemctl reload nginx; then
    echo "   ✓ Nginx recarregado com sucesso"
else
    echo "   ✗ Erro ao recarregar nginx"
    exit 1
fi

echo
echo "7. Verificando status do backend..."
if systemctl is-active --quiet "$SERVICE_NAME"; then
    echo "   ✓ Serviço $SERVICE_NAME está rodando"
    echo "   Reiniciando serviço para aplicar alterações..."
    if systemctl restart "$SERVICE_NAME"; then
        echo "   ✓ Serviço $SERVICE_NAME reiniciado"
    else
        echo "   ⚠ Erro ao reiniciar serviço $SERVICE_NAME"
    fi
else
    echo "   ⚠ Serviço $SERVICE_NAME não está rodando"
    echo "   Tentando iniciar..."
    if systemctl start "$SERVICE_NAME"; then
        echo "   ✓ Serviço $SERVICE_NAME iniciado"
    else
        echo "   ✗ Erro ao iniciar serviço $SERVICE_NAME"
    fi
fi

echo
echo "8. Aguardando estabilização dos serviços..."
sleep 10

echo
echo "9. Testando conectividade..."
echo "   Testando health check..."
if curl -f -s -o /dev/null "http://localhost:3000/v1/health"; then
    echo "   ✓ Backend respondendo localmente"
else
    echo "   ⚠ Backend não está respondendo localmente"
fi

echo
echo "10. Testando CORS..."
echo "    Testando requisição OPTIONS..."
CORS_TEST=$(curl -s -o /dev/null -w "%{http_code}" \
    -X OPTIONS \
    -H "Origin: https://semtas-natal.pgben.com.br" \
    -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: authorization" \
    "https://api-semtas-natal.pgben.com.br/api/v1/health" 2>/dev/null || echo "000")

if [ "$CORS_TEST" = "204" ] || [ "$CORS_TEST" = "200" ]; then
    echo "   ✓ Requisição OPTIONS funcionando (HTTP $CORS_TEST)"
else
    echo "   ⚠ Problema com requisição OPTIONS (HTTP $CORS_TEST)"
fi

echo
echo "=== Resumo do Deploy ==="
echo "✓ Configuração nginx atualizada"
echo "✓ Nginx recarregado"
echo "✓ Backend verificado"
echo "✓ Testes de conectividade executados"
echo
echo "Backup da configuração anterior: $BACKUP_DIR"
echo
echo "Para verificar logs:"
echo "  - Nginx: tail -f /var/log/nginx/pgben_error.log"
echo "  - Backend: journalctl -u $SERVICE_NAME -f"
echo
echo "Para testar CORS manualmente:"
echo "  curl -X OPTIONS -H 'Origin: https://semtas-natal.pgben.com.br' -v https://api-semtas-natal.pgben.com.br/api/v1/health"
echo
echo "Deploy concluído em: $(date)"
echo "==========================================="