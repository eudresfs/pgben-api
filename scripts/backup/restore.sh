#!/bin/bash
# Script de restauração de backups do PGBen
# Este script realiza a restauração dos backups do PostgreSQL e MinIO

# Configurações
PG_BACKUP_DIR="${PGBEN_BACKUP_DIR:-/backup/postgres}"
MINIO_BACKUP_DIR="${PGBEN_MINIO_BACKUP_DIR:-/backup/minio}"
DB_NAME="${PGBEN_DB_NAME:-pgben}"
DB_USER="${PGBEN_DB_USER:-postgres}"
DB_HOST="${PGBEN_DB_HOST:-localhost}"
DB_PORT="${PGBEN_DB_PORT:-5432}"
MINIO_HOST="${PGBEN_MINIO_HOST:-localhost:9000}"
MINIO_ACCESS_KEY="${PGBEN_MINIO_ACCESS_KEY:-minioadmin}"
MINIO_SECRET_KEY="${PGBEN_MINIO_SECRET_KEY:-minioadmin}"
LOG_FILE="/var/log/pgben/restore.log"
TEMP_DIR="/tmp/minio-restore-$(date +%Y%m%d%H%M%S)"

# Função para registrar mensagens de log
log_message() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Criar diretório de log se não existir
mkdir -p "$(dirname "$LOG_FILE")"

# Função para exibir ajuda
show_help() {
    echo "Uso: $0 [opções]"
    echo
    echo "Opções:"
    echo "  -p, --postgres ARQUIVO  Restaurar banco de dados PostgreSQL a partir do arquivo especificado"
    echo "  -m, --minio ARQUIVO     Restaurar buckets MinIO a partir do arquivo especificado"
    echo "  -a, --all               Restaurar os backups mais recentes do PostgreSQL e MinIO"
    echo "  -l, --list              Listar backups disponíveis"
    echo "  -h, --help              Exibir esta ajuda"
    echo
    echo "Exemplos:"
    echo "  $0 --postgres pgben-db-backup_2025-05-10_00-00-00.sql.gz"
    echo "  $0 --minio pgben-minio-backup_2025-05-10_00-00-00.tar.gz"
    echo "  $0 --all"
    echo
}

# Função para listar backups disponíveis
list_backups() {
    echo "=== Backups do PostgreSQL ==="
    if [ -d "$PG_BACKUP_DIR" ]; then
        find "$PG_BACKUP_DIR" -name "pgben-db-backup*.sql.gz" -type f | sort -r | head -n 10
    else
        echo "Diretório de backup do PostgreSQL não encontrado: $PG_BACKUP_DIR"
    fi
    
    echo
    echo "=== Backups do MinIO ==="
    if [ -d "$MINIO_BACKUP_DIR" ]; then
        find "$MINIO_BACKUP_DIR" -name "pgben-minio-backup*.tar.gz" -type f | sort -r | head -n 10
    else
        echo "Diretório de backup do MinIO não encontrado: $MINIO_BACKUP_DIR"
    fi
}

# Função para restaurar o PostgreSQL
restore_postgres() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        log_message "ERRO: Arquivo de backup do PostgreSQL não encontrado: $backup_file"
        return 1
    fi
    
    log_message "Iniciando restauração do PostgreSQL a partir de: $backup_file"
    
    # Verificar MD5 do arquivo de backup
    if [ -f "${backup_file}.md5" ]; then
        log_message "Verificando integridade do arquivo de backup"
        original_md5=$(cat "${backup_file}.md5" | cut -d' ' -f1)
        current_md5=$(md5sum "$backup_file" | cut -d' ' -f1)
        
        if [ "$original_md5" != "$current_md5" ]; then
            log_message "ERRO: Falha na verificação de integridade do arquivo de backup"
            return 1
        fi
        
        log_message "Verificação de integridade bem-sucedida"
    else
        log_message "AVISO: Arquivo MD5 não encontrado, pulando verificação de integridade"
    fi
    
    # Perguntar ao usuário se deseja continuar
    read -p "ATENÇÃO: Esta operação irá substituir o banco de dados '$DB_NAME'. Deseja continuar? (s/N): " confirm
    if [[ ! "$confirm" =~ ^[sS]$ ]]; then
        log_message "Restauração cancelada pelo usuário"
        return 1
    fi
    
    # Criar banco de dados temporário para verificar o backup
    temp_db="${DB_NAME}_restore_temp"
    log_message "Criando banco de dados temporário para verificação: $temp_db"
    
    if PGPASSWORD="$PGBEN_DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "DROP DATABASE IF EXISTS $temp_db;" postgres && \
       PGPASSWORD="$PGBEN_DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE $temp_db;" postgres; then
        log_message "Banco de dados temporário criado com sucesso"
        
        # Restaurar para o banco de dados temporário
        log_message "Restaurando backup para o banco de dados temporário"
        if gunzip -c "$backup_file" | PGPASSWORD="$PGBEN_DB_PASS" pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$temp_db"; then
            log_message "Verificação do backup concluída com sucesso"
            
            # Remover banco de dados temporário
            PGPASSWORD="$PGBEN_DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "DROP DATABASE $temp_db;" postgres
            
            # Restaurar para o banco de dados real
            log_message "Restaurando backup para o banco de dados $DB_NAME"
            
            # Verificar se há conexões ativas
            log_message "Verificando conexões ativas ao banco de dados $DB_NAME"
            active_connections=$(PGPASSWORD="$PGBEN_DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname = '$DB_NAME';" postgres)
            
            if [ "$active_connections" -gt 0 ]; then
                log_message "AVISO: Existem $active_connections conexões ativas ao banco de dados"
                read -p "Deseja encerrar todas as conexões e continuar? (s/N): " confirm
                if [[ ! "$confirm" =~ ^[sS]$ ]]; then
                    log_message "Restauração cancelada pelo usuário"
                    return 1
                fi
                
                log_message "Encerrando conexões ativas"
                PGPASSWORD="$PGBEN_DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME';" postgres
            fi
            
            # Remover banco de dados existente e criar novo
            log_message "Removendo banco de dados existente: $DB_NAME"
            PGPASSWORD="$PGBEN_DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "DROP DATABASE IF EXISTS $DB_NAME;" postgres
            
            log_message "Criando novo banco de dados: $DB_NAME"
            PGPASSWORD="$PGBEN_DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;" postgres
            
            # Restaurar backup
            log_message "Restaurando backup para o banco de dados $DB_NAME"
            if gunzip -c "$backup_file" | PGPASSWORD="$PGBEN_DB_PASS" pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"; then
                log_message "Restauração do PostgreSQL concluída com sucesso"
                return 0
            else
                log_message "ERRO: Falha ao restaurar backup para o banco de dados $DB_NAME"
                return 1
            fi
        else
            log_message "ERRO: Falha ao verificar backup"
            PGPASSWORD="$PGBEN_DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "DROP DATABASE IF EXISTS $temp_db;" postgres
            return 1
        fi
    else
        log_message "ERRO: Falha ao criar banco de dados temporário"
        return 1
    fi
}

# Função para restaurar o MinIO
restore_minio() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        log_message "ERRO: Arquivo de backup do MinIO não encontrado: $backup_file"
        return 1
    fi
    
    log_message "Iniciando restauração do MinIO a partir de: $backup_file"
    
    # Verificar MD5 do arquivo de backup
    if [ -f "${backup_file}.md5" ]; then
        log_message "Verificando integridade do arquivo de backup"
        original_md5=$(cat "${backup_file}.md5" | cut -d' ' -f1)
        current_md5=$(md5sum "$backup_file" | cut -d' ' -f1)
        
        if [ "$original_md5" != "$current_md5" ]; then
            log_message "ERRO: Falha na verificação de integridade do arquivo de backup"
            return 1
        fi
        
        log_message "Verificação de integridade bem-sucedida"
    else
        log_message "AVISO: Arquivo MD5 não encontrado, pulando verificação de integridade"
    fi
    
    # Verificar se o arquivo tar.gz pode ser lido
    if ! tar -tzf "$backup_file" > /dev/null 2>&1; then
        log_message "ERRO: Arquivo tar.gz corrompido: $backup_file"
        return 1
    fi
    
    # Perguntar ao usuário se deseja continuar
    read -p "ATENÇÃO: Esta operação irá substituir os dados nos buckets do MinIO. Deseja continuar? (s/N): " confirm
    if [[ ! "$confirm" =~ ^[sS]$ ]]; then
        log_message "Restauração cancelada pelo usuário"
        return 1
    fi
    
    # Criar diretório temporário
    mkdir -p "$TEMP_DIR"
    log_message "Extraindo backup para diretório temporário: $TEMP_DIR"
    
    # Extrair backup
    if tar -xzf "$backup_file" -C "$TEMP_DIR"; then
        log_message "Backup extraído com sucesso"
        
        # Configurar cliente MinIO
        log_message "Configurando cliente MinIO"
        export MC_HOST_pgben=https://${MINIO_ACCESS_KEY}:${MINIO_SECRET_KEY}@${MINIO_HOST}
        
        # Verificar se a configuração do MinIO está correta
        if ! mc ls pgben/ > /dev/null 2>&1; then
            log_message "ERRO: Falha ao conectar ao servidor MinIO"
            rm -rf "$TEMP_DIR"
            return 1
        fi
        
        # Restaurar cada bucket
        for bucket_dir in "$TEMP_DIR"/*; do
            if [ -d "$bucket_dir" ]; then
                bucket_name=$(basename "$bucket_dir")
                log_message "Restaurando bucket: $bucket_name"
                
                # Verificar se o bucket existe
                if ! mc ls "pgben/$bucket_name" > /dev/null 2>&1; then
                    log_message "Criando bucket: $bucket_name"
                    mc mb "pgben/$bucket_name"
                else
                    # Perguntar ao usuário se deseja limpar o bucket
                    read -p "O bucket '$bucket_name' já existe. Deseja limpar o conteúdo antes de restaurar? (s/N): " confirm
                    if [[ "$confirm" =~ ^[sS]$ ]]; then
                        log_message "Limpando bucket: $bucket_name"
                        mc rm --recursive --force "pgben/$bucket_name"
                    fi
                fi
                
                # Copiar objetos para o bucket
                log_message "Copiando objetos para o bucket: $bucket_name"
                if ! mc cp --recursive "${bucket_dir}/" "pgben/${bucket_name}/"; then
                    log_message "ERRO: Falha ao copiar objetos para o bucket $bucket_name"
                else
                    log_message "Bucket $bucket_name restaurado com sucesso"
                fi
            fi
        done
        
        log_message "Restauração do MinIO concluída"
        rm -rf "$TEMP_DIR"
        return 0
    else
        log_message "ERRO: Falha ao extrair backup"
        rm -rf "$TEMP_DIR"
        return 1
    fi
}

# Função para obter o backup mais recente
get_latest_backup() {
    local backup_dir="$1"
    local pattern="$2"
    
    find "$backup_dir" -name "$pattern" -type f | sort -r | head -n 1
}

# Processar argumentos
if [ $# -eq 0 ]; then
    show_help
    exit 1
fi

while [ $# -gt 0 ]; do
    case "$1" in
        -p|--postgres)
            if [ -n "$2" ] && [ "${2:0:1}" != "-" ]; then
                if [[ "$2" == /* ]]; then
                    pg_backup="$2"
                else
                    pg_backup="$PG_BACKUP_DIR/$2"
                fi
                shift 2
            else
                echo "Erro: Argumento para $1 está faltando" >&2
                exit 1
            fi
            ;;
        -m|--minio)
            if [ -n "$2" ] && [ "${2:0:1}" != "-" ]; then
                if [[ "$2" == /* ]]; then
                    minio_backup="$2"
                else
                    minio_backup="$MINIO_BACKUP_DIR/$2"
                fi
                shift 2
            else
                echo "Erro: Argumento para $1 está faltando" >&2
                exit 1
            fi
            ;;
        -a|--all)
            pg_backup=$(get_latest_backup "$PG_BACKUP_DIR" "pgben-db-backup*.sql.gz")
            minio_backup=$(get_latest_backup "$MINIO_BACKUP_DIR" "pgben-minio-backup*.tar.gz")
            shift
            ;;
        -l|--list)
            list_backups
            exit 0
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Erro: Opção inválida $1" >&2
            show_help
            exit 1
            ;;
    esac
done

# Verificar se pelo menos um backup foi especificado
if [ -z "$pg_backup" ] && [ -z "$minio_backup" ]; then
    echo "Erro: Nenhum backup especificado" >&2
    show_help
    exit 1
fi

# Restaurar PostgreSQL
if [ -n "$pg_backup" ]; then
    if [ ! -f "$pg_backup" ]; then
        echo "Erro: Arquivo de backup do PostgreSQL não encontrado: $pg_backup" >&2
        exit 1
    fi
    
    echo "Restaurando PostgreSQL a partir de: $pg_backup"
    if ! restore_postgres "$pg_backup"; then
        echo "Erro: Falha ao restaurar PostgreSQL" >&2
        exit 1
    fi
fi

# Restaurar MinIO
if [ -n "$minio_backup" ]; then
    if [ ! -f "$minio_backup" ]; then
        echo "Erro: Arquivo de backup do MinIO não encontrado: $minio_backup" >&2
        exit 1
    fi
    
    echo "Restaurando MinIO a partir de: $minio_backup"
    if ! restore_minio "$minio_backup"; then
        echo "Erro: Falha ao restaurar MinIO" >&2
        exit 1
    fi
fi

echo "Restauração concluída com sucesso"
exit 0
