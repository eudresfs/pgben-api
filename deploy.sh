#!/bin/bash

# Script para deploy do PGBen com monitoramento
# Autor: Equipe PGBen
# Data: 14/05/2025

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Função para exibir mensagens
log() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
  echo -e "${YELLOW}[AVISO]${NC} $1"
}

error() {
  echo -e "${RED}[ERRO]${NC} $1"
}

# Verificar se o Docker está instalado
if ! command -v docker &> /dev/null; then
  error "Docker não encontrado. Por favor, instale o Docker antes de continuar."
  exit 1
fi

# Verificar se o Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
  error "Docker Compose não encontrado. Por favor, instale o Docker Compose antes de continuar."
  exit 1
fi

# Verificar se o arquivo .env existe
if [ ! -f .env ]; then
  warn "Arquivo .env não encontrado. Criando arquivo .env padrão..."
  cat > .env << EOL
# Configurações do banco de dados
DB_USER=postgres
DB_PASS=postgres
DB_NAME=pgben_db
DB_HOST=postgres
DB_PORT=5432

# Configurações do Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Configurações do MinIO
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# Configurações de segurança
JWT_SECRET=default_jwt_secret_for_dev_only
ENCRYPTION_KEY=default_key_32chars_for_dev_only_

# Configurações do Grafana
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin
EOL
  log "Arquivo .env criado com valores padrão."
fi

# Função para iniciar a aplicação
start_app() {
  log "Iniciando a aplicação PGBen..."
  docker-compose up -d
  
  if [ $? -eq 0 ]; then
    log "Aplicação PGBen iniciada com sucesso!"
  else
    error "Falha ao iniciar a aplicação PGBen."
    exit 1
  fi
}

# Função para iniciar o monitoramento
start_monitoring() {
  log "Iniciando o sistema de monitoramento..."
  docker-compose -f docs/monitoramento/docker-compose.monitoring.yml up -d
  
  if [ $? -eq 0 ]; then
    log "Sistema de monitoramento iniciado com sucesso!"
  else
    error "Falha ao iniciar o sistema de monitoramento."
    exit 1
  fi
}

# Função para parar todos os serviços
stop_all() {
  log "Parando todos os serviços..."
  docker-compose -f docs/monitoramento/docker-compose.monitoring.yml down
  docker-compose down
  
  if [ $? -eq 0 ]; then
    log "Todos os serviços foram parados com sucesso!"
  else
    error "Falha ao parar alguns serviços."
    exit 1
  fi
}

# Função para mostrar o status dos serviços
show_status() {
  log "Status dos serviços PGBen:"
  docker-compose ps
  
  log "Status dos serviços de monitoramento:"
  docker-compose -f docs/monitoramento/docker-compose.monitoring.yml ps
}

# Função para mostrar os logs
show_logs() {
  if [ -z "$1" ]; then
    error "Especifique o serviço para visualizar os logs. Use: ./deploy.sh logs <nome-do-serviço>"
    exit 1
  fi
  
  # Verificar se o serviço está no docker-compose principal
  if docker-compose ps | grep -q "$1"; then
    log "Exibindo logs do serviço $1..."
    docker-compose logs -f "$1"
  # Verificar se o serviço está no docker-compose de monitoramento
  elif docker-compose -f docs/monitoramento/docker-compose.monitoring.yml ps | grep -q "$1"; then
    log "Exibindo logs do serviço de monitoramento $1..."
    docker-compose -f docs/monitoramento/docker-compose.monitoring.yml logs -f "$1"
  else
    error "Serviço $1 não encontrado."
    exit 1
  fi
}

# Função para exibir informações de acesso
show_access_info() {
  log "Informações de acesso ao PGBen:"
  echo -e "API PGBen: ${GREEN}http://localhost:3000${NC}"
  echo -e "Interface MinIO: ${GREEN}http://localhost:9001${NC}"
  echo -e "Interface MailHog: ${GREEN}http://localhost:8025${NC}"
  echo
  log "Informações de acesso ao monitoramento:"
  echo -e "Prometheus: ${GREEN}http://localhost:9090${NC}"
  echo -e "Grafana: ${GREEN}http://localhost:3001${NC} (usuário: ${YELLOW}admin${NC}, senha: ${YELLOW}admin${NC})"
  echo -e "Alertmanager: ${GREEN}http://localhost:9093${NC}"
}

# Função para mostrar ajuda
show_help() {
  echo "Uso: ./deploy.sh [comando]"
  echo
  echo "Comandos disponíveis:"
  echo "  start       - Inicia a aplicação PGBen"
  echo "  monitoring  - Inicia o sistema de monitoramento"
  echo "  all         - Inicia a aplicação e o monitoramento"
  echo "  stop        - Para todos os serviços"
  echo "  status      - Mostra o status dos serviços"
  echo "  logs [svc]  - Mostra os logs de um serviço específico"
  echo "  info        - Mostra informações de acesso"
  echo "  help        - Mostra esta ajuda"
}

# Processar comandos
case "$1" in
  start)
    start_app
    show_access_info
    ;;
  monitoring)
    start_monitoring
    show_access_info
    ;;
  all)
    start_app
    start_monitoring
    show_access_info
    ;;
  stop)
    stop_all
    ;;
  status)
    show_status
    ;;
  logs)
    show_logs "$2"
    ;;
  info)
    show_access_info
    ;;
  help|*)
    show_help
    ;;
esac

exit 0
