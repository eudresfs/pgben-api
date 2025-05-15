#!/bin/bash
# Script de verificação de integridade dos backups do PGBen
# Este script verifica a integridade dos backups do PostgreSQL e MinIO

# Configurações
PG_BACKUP_DIR="${PGBEN_BACKUP_DIR:-/backup/postgres}"
MINIO_BACKUP_DIR="${PGBEN_MINIO_BACKUP_DIR:-/backup/minio}"
LOG_FILE="/var/log/pgben/backup-verify.log"
REPORT_FILE="/var/log/pgben/backup-report.html"
EMAIL_RECIPIENT="${PGBEN_ADMIN_EMAIL:-admin@semtas.natal.rn.gov.br}"
DAYS_TO_CHECK="${PGBEN_VERIFY_DAYS:-7}"
DATE_FORMAT=$(date +"%Y-%m-%d_%H-%M-%S")

# Função para registrar mensagens de log
log_message() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Criar diretório de log se não existir
mkdir -p "$(dirname "$LOG_FILE")"

log_message "Iniciando verificação de integridade dos backups"

# Inicializar contadores
total_backups=0
valid_backups=0
invalid_backups=0
missing_backups=0

# Inicializar relatório HTML
cat > "$REPORT_FILE" << EOF
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Relatório de Verificação de Backups - PGBen</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #003366; }
        h2 { color: #0066cc; margin-top: 20px; }
        table { border-collapse: collapse; width: 100%; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .success { color: green; }
        .error { color: red; }
        .warning { color: orange; }
        .summary { margin: 20px 0; padding: 10px; background-color: #f2f2f2; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>Relatório de Verificação de Backups - PGBen</h1>
    <p>Data da verificação: $(date +'%d/%m/%Y %H:%M:%S')</p>
    
    <div class="summary">
        <h2>Resumo</h2>
        <p>Período verificado: últimos $DAYS_TO_CHECK dias</p>
    </div>
EOF

# Verificar backups do PostgreSQL
log_message "Verificando backups do PostgreSQL"
echo "<h2>Backups do PostgreSQL</h2>" >> "$REPORT_FILE"
echo "<table><tr><th>Arquivo</th><th>Data</th><th>Tamanho</th><th>Status</th><th>Detalhes</th></tr>" >> "$REPORT_FILE"

pg_backups=$(find "$PG_BACKUP_DIR" -name "pgben-db-backup*.sql.gz" -type f -mtime -"$DAYS_TO_CHECK" | sort)

if [ -z "$pg_backups" ]; then
    log_message "Nenhum backup do PostgreSQL encontrado nos últimos $DAYS_TO_CHECK dias"
    echo "<tr><td colspan='5' class='warning'>Nenhum backup encontrado nos últimos $DAYS_TO_CHECK dias</td></tr>" >> "$REPORT_FILE"
    missing_backups=$((missing_backups + 1))
else
    for backup in $pg_backups; do
        total_backups=$((total_backups + 1))
        backup_name=$(basename "$backup")
        backup_date=$(echo "$backup_name" | grep -oP 'pgben-db-backup_\K[0-9-_]+' | tr '_' ' ')
        backup_size=$(du -h "$backup" | cut -f1)
        md5_file="${backup}.md5"
        
        log_message "Verificando backup: $backup_name"
        
        if [ -f "$md5_file" ]; then
            # Verificar MD5
            original_md5=$(cat "$md5_file" | cut -d' ' -f1)
            current_md5=$(md5sum "$backup" | cut -d' ' -f1)
            
            if [ "$original_md5" = "$current_md5" ]; then
                log_message "Verificação de integridade bem-sucedida: $backup_name"
                echo "<tr><td>$backup_name</td><td>$backup_date</td><td>$backup_size</td><td class='success'>Válido</td><td>MD5 verificado com sucesso</td></tr>" >> "$REPORT_FILE"
                valid_backups=$((valid_backups + 1))
            else
                log_message "ERRO: Falha na verificação de integridade: $backup_name"
                echo "<tr><td>$backup_name</td><td>$backup_date</td><td>$backup_size</td><td class='error'>Inválido</td><td>MD5 não corresponde</td></tr>" >> "$REPORT_FILE"
                invalid_backups=$((invalid_backups + 1))
            fi
        else
            log_message "AVISO: Arquivo MD5 não encontrado para: $backup_name"
            echo "<tr><td>$backup_name</td><td>$backup_date</td><td>$backup_size</td><td class='warning'>Desconhecido</td><td>Arquivo MD5 não encontrado</td></tr>" >> "$REPORT_FILE"
            invalid_backups=$((invalid_backups + 1))
        fi
    done
fi

echo "</table>" >> "$REPORT_FILE"

# Verificar backups do MinIO
log_message "Verificando backups do MinIO"
echo "<h2>Backups do MinIO</h2>" >> "$REPORT_FILE"
echo "<table><tr><th>Arquivo</th><th>Data</th><th>Tamanho</th><th>Status</th><th>Detalhes</th></tr>" >> "$REPORT_FILE"

minio_backups=$(find "$MINIO_BACKUP_DIR" -name "pgben-minio-backup*.tar.gz" -type f -mtime -"$DAYS_TO_CHECK" | sort)

if [ -z "$minio_backups" ]; then
    log_message "Nenhum backup do MinIO encontrado nos últimos $DAYS_TO_CHECK dias"
    echo "<tr><td colspan='5' class='warning'>Nenhum backup encontrado nos últimos $DAYS_TO_CHECK dias</td></tr>" >> "$REPORT_FILE"
    missing_backups=$((missing_backups + 1))
else
    for backup in $minio_backups; do
        total_backups=$((total_backups + 1))
        backup_name=$(basename "$backup")
        backup_date=$(echo "$backup_name" | grep -oP 'pgben-minio-backup_\K[0-9-_]+' | tr '_' ' ')
        backup_size=$(du -h "$backup" | cut -f1)
        md5_file="${backup}.md5"
        
        log_message "Verificando backup: $backup_name"
        
        if [ -f "$md5_file" ]; then
            # Verificar MD5
            original_md5=$(cat "$md5_file" | cut -d' ' -f1)
            current_md5=$(md5sum "$backup" | cut -d' ' -f1)
            
            if [ "$original_md5" = "$current_md5" ]; then
                # Verificar se o arquivo tar.gz pode ser lido
                if tar -tzf "$backup" > /dev/null 2>&1; then
                    log_message "Verificação de integridade bem-sucedida: $backup_name"
                    echo "<tr><td>$backup_name</td><td>$backup_date</td><td>$backup_size</td><td class='success'>Válido</td><td>MD5 e estrutura verificados com sucesso</td></tr>" >> "$REPORT_FILE"
                    valid_backups=$((valid_backups + 1))
                else
                    log_message "ERRO: Arquivo tar.gz corrompido: $backup_name"
                    echo "<tr><td>$backup_name</td><td>$backup_date</td><td>$backup_size</td><td class='error'>Inválido</td><td>Arquivo tar.gz corrompido</td></tr>" >> "$REPORT_FILE"
                    invalid_backups=$((invalid_backups + 1))
                fi
            else
                log_message "ERRO: Falha na verificação de integridade: $backup_name"
                echo "<tr><td>$backup_name</td><td>$backup_date</td><td>$backup_size</td><td class='error'>Inválido</td><td>MD5 não corresponde</td></tr>" >> "$REPORT_FILE"
                invalid_backups=$((invalid_backups + 1))
            fi
        else
            log_message "AVISO: Arquivo MD5 não encontrado para: $backup_name"
            echo "<tr><td>$backup_name</td><td>$backup_date</td><td>$backup_size</td><td class='warning'>Desconhecido</td><td>Arquivo MD5 não encontrado</td></tr>" >> "$REPORT_FILE"
            invalid_backups=$((invalid_backups + 1))
        fi
    done
fi

echo "</table>" >> "$REPORT_FILE"

# Verificar histórico de backups
log_message "Verificando histórico de backups"
echo "<h2>Histórico de Backups</h2>" >> "$REPORT_FILE"

# PostgreSQL
if [ -f "${PG_BACKUP_DIR}/backup-history.csv" ]; then
    echo "<h3>PostgreSQL</h3>" >> "$REPORT_FILE"
    echo "<table><tr><th>Data</th><th>Status</th><th>Arquivo</th><th>Tamanho</th></tr>" >> "$REPORT_FILE"
    
    # Obter as últimas 10 entradas do histórico
    tail -n 10 "${PG_BACKUP_DIR}/backup-history.csv" | while IFS=, read -r date status file size; do
        status_class="success"
        if [ "$status" = "failed" ]; then
            status_class="error"
        elif [ "$status" = "partial" ]; then
            status_class="warning"
        fi
        
        echo "<tr><td>$date</td><td class='$status_class'>$status</td><td>$file</td><td>$size</td></tr>" >> "$REPORT_FILE"
    done
    
    echo "</table>" >> "$REPORT_FILE"
else
    echo "<p class='warning'>Histórico de backups do PostgreSQL não encontrado</p>" >> "$REPORT_FILE"
fi

# MinIO
if [ -f "${MINIO_BACKUP_DIR}/backup-history.csv" ]; then
    echo "<h3>MinIO</h3>" >> "$REPORT_FILE"
    echo "<table><tr><th>Data</th><th>Status</th><th>Arquivo</th><th>Tamanho</th></tr>" >> "$REPORT_FILE"
    
    # Obter as últimas 10 entradas do histórico
    tail -n 10 "${MINIO_BACKUP_DIR}/backup-history.csv" | while IFS=, read -r date status file size; do
        status_class="success"
        if [ "$status" = "failed" ]; then
            status_class="error"
        elif [ "$status" = "partial" ]; then
            status_class="warning"
        fi
        
        echo "<tr><td>$date</td><td class='$status_class'>$status</td><td>$file</td><td>$size</td></tr>" >> "$REPORT_FILE"
    done
    
    echo "</table>" >> "$REPORT_FILE"
else
    echo "<p class='warning'>Histórico de backups do MinIO não encontrado</p>" >> "$REPORT_FILE"
fi

# Atualizar resumo
success_rate=0
if [ $total_backups -gt 0 ]; then
    success_rate=$((valid_backups * 100 / total_backups))
fi

status_class="success"
if [ $success_rate -lt 80 ]; then
    status_class="error"
elif [ $success_rate -lt 100 ]; then
    status_class="warning"
fi

cat >> "$REPORT_FILE" << EOF
<script>
    document.querySelector('.summary').innerHTML += '<p>Total de backups verificados: $total_backups</p>';
    document.querySelector('.summary').innerHTML += '<p>Backups válidos: $valid_backups</p>';
    document.querySelector('.summary').innerHTML += '<p>Backups inválidos: $invalid_backups</p>';
    document.querySelector('.summary').innerHTML += '<p>Backups ausentes: $missing_backups</p>';
    document.querySelector('.summary').innerHTML += '<p>Taxa de sucesso: <span class="$status_class">$success_rate%</span></p>';
</script>
</body>
</html>
EOF

log_message "Verificação de integridade concluída"
log_message "Total de backups verificados: $total_backups"
log_message "Backups válidos: $valid_backups"
log_message "Backups inválidos: $invalid_backups"
log_message "Backups ausentes: $missing_backups"
log_message "Taxa de sucesso: $success_rate%"

# Enviar relatório por e-mail
if [ -n "$EMAIL_RECIPIENT" ]; then
    log_message "Enviando relatório por e-mail para $EMAIL_RECIPIENT"
    
    subject="Relatório de Verificação de Backups - PGBen - $(date +'%d/%m/%Y')"
    if [ $success_rate -lt 80 ]; then
        subject="[CRÍTICO] $subject"
    elif [ $success_rate -lt 100 ]; then
        subject="[ATENÇÃO] $subject"
    fi
    
    # Enviar e-mail com o relatório HTML
    if command -v mail > /dev/null; then
        mail -a "Content-Type: text/html" -s "$subject" "$EMAIL_RECIPIENT" < "$REPORT_FILE"
    else
        log_message "AVISO: Comando 'mail' não encontrado, não foi possível enviar o relatório por e-mail"
    fi
fi

# Sair com código de erro se houver backups inválidos ou ausentes
if [ $invalid_backups -gt 0 ] || [ $missing_backups -gt 0 ]; then
    exit 1
else
    exit 0
fi
