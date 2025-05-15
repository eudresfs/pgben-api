#!/bin/bash
# Script de backup do MinIO para o PGBen
# Este script realiza o backup dos buckets do MinIO usando o cliente mc
# e mantém uma política de retenção configurável.

# Configurações
MINIO_HOST="${PGBEN_MINIO_HOST:-localhost:9000}"
MINIO_ACCESS_KEY="${PGBEN_MINIO_ACCESS_KEY:-minioadmin}"
MINIO_SECRET_KEY="${PGBEN_MINIO_SECRET_KEY:-minioadmin}"
BACKUP_DIR="${PGBEN_MINIO_BACKUP_DIR:-/backup/minio}"
RETENTION_DAYS="${PGBEN_RETENTION_DAYS:-30}"
BACKUP_PREFIX="pgben-minio-backup"
DATE_FORMAT=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILENAME="${BACKUP_PREFIX}_${DATE_FORMAT}.tar.gz"
LOG_FILE="${BACKUP_DIR}/backup-log.txt"
TEMP_DIR="/tmp/minio-backup-${DATE_FORMAT}"
BUCKETS_TO_BACKUP=("pgben-documents" "pgben-temp" "pgben-audit")

# Função para registrar mensagens de log
log_message() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Criar diretório de backup se não existir
if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    log_message "Diretório de backup criado: $BACKUP_DIR"
fi

# Criar diretório temporário para o backup
mkdir -p "$TEMP_DIR"
log_message "Diretório temporário criado: $TEMP_DIR"

# Configurar cliente MinIO
log_message "Configurando cliente MinIO"
export MC_HOST_pgben=https://${MINIO_ACCESS_KEY}:${MINIO_SECRET_KEY}@${MINIO_HOST}

# Verificar se a configuração do MinIO está correta
if ! mc ls pgben/ > /dev/null 2>&1; then
    log_message "ERRO: Falha ao conectar ao servidor MinIO"
    rm -rf "$TEMP_DIR"
    echo "${DATE_FORMAT},failed,${BACKUP_FILENAME},0" >> "${BACKUP_DIR}/backup-history.csv"
    exit 1
fi

# Iniciar processo de backup
log_message "Iniciando backup dos buckets do MinIO"

# Backup de cada bucket
BACKUP_SUCCESS=true
for BUCKET in "${BUCKETS_TO_BACKUP[@]}"; do
    log_message "Realizando backup do bucket: $BUCKET"
    
    # Criar diretório para o bucket
    mkdir -p "${TEMP_DIR}/${BUCKET}"
    
    # Copiar objetos do bucket para o diretório temporário
    if ! mc cp --recursive "pgben/${BUCKET}/" "${TEMP_DIR}/${BUCKET}/"; then
        log_message "ERRO: Falha ao copiar objetos do bucket $BUCKET"
        BACKUP_SUCCESS=false
    else
        log_message "Backup do bucket $BUCKET concluído com sucesso"
        
        # Contar objetos
        OBJECT_COUNT=$(find "${TEMP_DIR}/${BUCKET}" -type f | wc -l)
        log_message "Objetos no bucket $BUCKET: $OBJECT_COUNT"
    fi
done

# Criar arquivo tar.gz com o conteúdo do diretório temporário
log_message "Criando arquivo compactado do backup"
if tar -czf "${BACKUP_DIR}/${BACKUP_FILENAME}" -C "${TEMP_DIR}" .; then
    log_message "Arquivo compactado criado com sucesso: ${BACKUP_FILENAME}"
    
    # Calcular tamanho do backup
    BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILENAME}" | cut -f1)
    log_message "Tamanho do backup: ${BACKUP_SIZE}"
    
    # Criar arquivo de verificação MD5
    md5sum "${BACKUP_DIR}/${BACKUP_FILENAME}" > "${BACKUP_DIR}/${BACKUP_FILENAME}.md5"
    log_message "Arquivo de verificação MD5 criado"
    
    # Aplicar política de retenção
    log_message "Aplicando política de retenção (${RETENTION_DAYS} dias)"
    find "$BACKUP_DIR" -name "${BACKUP_PREFIX}*.tar.gz" -type f -mtime +${RETENTION_DAYS} -delete
    find "$BACKUP_DIR" -name "${BACKUP_PREFIX}*.tar.gz.md5" -type f -mtime +${RETENTION_DAYS} -delete
    
    # Contar arquivos de backup restantes
    REMAINING_BACKUPS=$(find "$BACKUP_DIR" -name "${BACKUP_PREFIX}*.tar.gz" | wc -l)
    log_message "Backups restantes após retenção: ${REMAINING_BACKUPS}"
    
    # Verificar espaço em disco
    DISK_SPACE=$(df -h "$BACKUP_DIR" | awk 'NR==2 {print $5}')
    log_message "Uso atual de disco: ${DISK_SPACE}"
    
    # Alerta se espaço em disco estiver acima de 80%
    DISK_SPACE_NUM=$(echo "$DISK_SPACE" | tr -d '%')
    if [ "$DISK_SPACE_NUM" -gt 80 ]; then
        log_message "ALERTA: Espaço em disco crítico (${DISK_SPACE})"
    fi
    
    # Registrar sucesso ou falha parcial
    if [ "$BACKUP_SUCCESS" = true ]; then
        log_message "Backup do MinIO concluído com sucesso"
        echo "${DATE_FORMAT},success,${BACKUP_FILENAME},${BACKUP_SIZE}" >> "${BACKUP_DIR}/backup-history.csv"
    else
        log_message "Backup do MinIO concluído com falhas parciais"
        echo "${DATE_FORMAT},partial,${BACKUP_FILENAME},${BACKUP_SIZE}" >> "${BACKUP_DIR}/backup-history.csv"
    fi
else
    log_message "ERRO: Falha ao criar arquivo compactado do backup"
    echo "${DATE_FORMAT},failed,${BACKUP_FILENAME},0" >> "${BACKUP_DIR}/backup-history.csv"
    BACKUP_SUCCESS=false
fi

# Limpar diretório temporário
log_message "Limpando diretório temporário"
rm -rf "$TEMP_DIR"

if [ "$BACKUP_SUCCESS" = true ]; then
    exit 0
else
    exit 1
fi
