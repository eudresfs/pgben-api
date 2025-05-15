#!/bin/bash
# Script de backup do PostgreSQL para o PGBen
# Este script realiza o backup completo do banco de dados PostgreSQL
# e mantém uma política de retenção configurável.

# Configurações
DB_NAME="${PGBEN_DB_NAME:-pgben}"
DB_USER="${PGBEN_DB_USER:-postgres}"
DB_HOST="${PGBEN_DB_HOST:-localhost}"
DB_PORT="${PGBEN_DB_PORT:-5432}"
BACKUP_DIR="${PGBEN_BACKUP_DIR:-/backup/postgres}"
RETENTION_DAYS="${PGBEN_RETENTION_DAYS:-30}"
BACKUP_PREFIX="pgben-db-backup"
DATE_FORMAT=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILENAME="${BACKUP_PREFIX}_${DATE_FORMAT}.sql.gz"
LOG_FILE="${BACKUP_DIR}/backup-log.txt"

# Função para registrar mensagens de log
log_message() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Criar diretório de backup se não existir
if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    log_message "Diretório de backup criado: $BACKUP_DIR"
fi

# Iniciar processo de backup
log_message "Iniciando backup do banco de dados $DB_NAME"

# Executar pg_dump e compactar o arquivo
if PGPASSWORD="$PGBEN_DB_PASS" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F c | gzip > "${BACKUP_DIR}/${BACKUP_FILENAME}"; then
    log_message "Backup concluído com sucesso: ${BACKUP_FILENAME}"
    
    # Calcular tamanho do backup
    BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILENAME}" | cut -f1)
    log_message "Tamanho do backup: ${BACKUP_SIZE}"
    
    # Criar arquivo de verificação MD5
    md5sum "${BACKUP_DIR}/${BACKUP_FILENAME}" > "${BACKUP_DIR}/${BACKUP_FILENAME}.md5"
    log_message "Arquivo de verificação MD5 criado"
    
    # Aplicar política de retenção
    log_message "Aplicando política de retenção (${RETENTION_DAYS} dias)"
    find "$BACKUP_DIR" -name "${BACKUP_PREFIX}*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete
    find "$BACKUP_DIR" -name "${BACKUP_PREFIX}*.sql.gz.md5" -type f -mtime +${RETENTION_DAYS} -delete
    
    # Contar arquivos de backup restantes
    REMAINING_BACKUPS=$(find "$BACKUP_DIR" -name "${BACKUP_PREFIX}*.sql.gz" | wc -l)
    log_message "Backups restantes após retenção: ${REMAINING_BACKUPS}"
    
    # Verificar espaço em disco
    DISK_SPACE=$(df -h "$BACKUP_DIR" | awk 'NR==2 {print $5}')
    log_message "Uso atual de disco: ${DISK_SPACE}"
    
    # Alerta se espaço em disco estiver acima de 80%
    DISK_SPACE_NUM=$(echo "$DISK_SPACE" | tr -d '%')
    if [ "$DISK_SPACE_NUM" -gt 80 ]; then
        log_message "ALERTA: Espaço em disco crítico (${DISK_SPACE})"
    fi
    
    # Registrar sucesso
    echo "${DATE_FORMAT},success,${BACKUP_FILENAME},${BACKUP_SIZE}" >> "${BACKUP_DIR}/backup-history.csv"
    exit 0
else
    # Registrar falha
    log_message "ERRO: Falha ao realizar backup do banco de dados"
    echo "${DATE_FORMAT},failed,${BACKUP_FILENAME},0" >> "${BACKUP_DIR}/backup-history.csv"
    exit 1
fi
