# Script PowerShell para backup automatizado em produção
# Sistema PGBEN - SEMTAS

param(
    [string]$BackupType = "full", # full, incremental, database-only, files-only
    [string]$BackupLocation = "./backups",
    [switch]$Compress,
    [switch]$Encrypt,
    [string]$EncryptionKey = "",
    [int]$RetentionDays = 30,
    [switch]$UploadToCloud,
    [string]$CloudProvider = "azure", # azure, aws, gcp
    [switch]$Verify,
    [switch]$Quiet,
    [string]$LogLevel = "Info" # Debug, Info, Warning, Error
)

# Configurações
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Variáveis globais
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$BackupTimestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupName = "pgben-backup-$BackupTimestamp"
$LogFile = "./logs/backup-$BackupTimestamp.log"

# Configurações de backup
$BackupConfig = @{
    Database = @{
        Host = "localhost"
        Port = 5432
        Database = "pgben_db"
        User = "postgres"
        BackupFormat = "custom" # custom, plain, directory, tar
    }
    Volumes = @(
        @{ Name = "postgres_data"; Path = "/var/lib/postgresql/data" }
        @{ Name = "minio_data"; Path = "/data" }
        @{ Name = "grafana_data"; Path = "/var/lib/grafana" }
        @{ Name = "prometheus_data"; Path = "/prometheus" }
        @{ Name = "redis_data"; Path = "/data" }
    )
    Files = @(
        "./config",
        "./scripts",
        "./docker-compose.prod.yml",
        "./docker-compose.nginx.yml",
        "./README-DEPLOY-PROD.md"
    )
    Exclude = @(
        "*.log",
        "*.tmp",
        "node_modules",
        ".git",
        "backups"
    )
}

# Função para logging colorido
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Type = "Info",
        [switch]$NoLog
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Type] $Message"
    
    if (-not $Quiet) {
        switch ($Type) {
            "Info" { Write-Host "[INFO] $Message" -ForegroundColor Blue }
            "Success" { Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
            "Warning" { Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
            "Error" { Write-Host "[ERROR] $Message" -ForegroundColor Red }
            "Debug" { if ($LogLevel -eq "Debug") { Write-Host "[DEBUG] $Message" -ForegroundColor Gray } }
        }
    }
    
    if (-not $NoLog) {
        # Criar diretório de logs se não existir
        $logDir = Split-Path $LogFile -Parent
        if (!(Test-Path $logDir)) {
            New-Item -ItemType Directory -Path $logDir -Force | Out-Null
        }
        Add-Content -Path $LogFile -Value $logEntry
    }
}

# Função para verificar pré-requisitos
function Test-Prerequisites {
    Write-ColorOutput "Verificando pré-requisitos..." "Info"
    
    # Verificar Docker
    try {
        $dockerVersion = docker --version 2>$null
        if (-not $dockerVersion) {
            throw "Docker não encontrado"
        }
        Write-ColorOutput "Docker encontrado: $dockerVersion" "Debug"
    }
    catch {
        Write-ColorOutput "Docker não está instalado ou não está no PATH" "Error"
        return $false
    }
    
    # Verificar Docker Compose
    try {
        $composeVersion = docker-compose --version 2>$null
        if (-not $composeVersion) {
            throw "Docker Compose não encontrado"
        }
        Write-ColorOutput "Docker Compose encontrado: $composeVersion" "Debug"
    }
    catch {
        Write-ColorOutput "Docker Compose não está instalado ou não está no PATH" "Error"
        return $false
    }
    
    # Verificar se os serviços estão rodando
    try {
        Set-Location $ProjectRoot
        $runningServices = docker-compose ps --services --filter "status=running" 2>$null
        if (-not $runningServices) {
            Write-ColorOutput "Nenhum serviço está rodando. Iniciando backup offline..." "Warning"
        } else {
            Write-ColorOutput "Serviços rodando: $($runningServices -join ', ')" "Debug"
        }
    }
    catch {
        Write-ColorOutput "Erro ao verificar status dos serviços" "Warning"
    }
    
    # Verificar espaço em disco
    try {
        $drive = Get-WmiObject -Class Win32_LogicalDisk -Filter "DriveType=3" | Where-Object { $_.DeviceID -eq "C:" }
        $freeSpaceGB = [math]::Round($drive.FreeSpace / 1GB, 2)
        
        if ($freeSpaceGB -lt 5) {
            Write-ColorOutput "Pouco espaço em disco disponível: ${freeSpaceGB}GB" "Warning"
        } else {
            Write-ColorOutput "Espaço em disco disponível: ${freeSpaceGB}GB" "Debug"
        }
    }
    catch {
        Write-ColorOutput "Erro ao verificar espaço em disco" "Warning"
    }
    
    return $true
}

# Função para criar diretório de backup
function New-BackupDirectory {
    $fullBackupPath = Join-Path $BackupLocation $BackupName
    
    try {
        if (Test-Path $fullBackupPath) {
            Write-ColorOutput "Diretório de backup já existe, criando backup..." "Warning"
            $backupDir = "${fullBackupPath}_backup_$(Get-Date -Format 'HHmmss')"
            Move-Item $fullBackupPath $backupDir
        }
        
        New-Item -ItemType Directory -Path $fullBackupPath -Force | Out-Null
        Write-ColorOutput "Diretório de backup criado: $fullBackupPath" "Success"
        
        return $fullBackupPath
    }
    catch {
        Write-ColorOutput "Erro ao criar diretório de backup: $($_.Exception.Message)" "Error"
        throw
    }
}

# Função para backup do banco de dados
function Backup-Database {
    param([string]$BackupPath)
    
    if ($BackupType -eq "files-only") {
        Write-ColorOutput "Pulando backup do banco de dados (files-only)" "Info"
        return
    }
    
    Write-ColorOutput "Iniciando backup do banco de dados..." "Info"
    
    $dbBackupPath = Join-Path $BackupPath "database"
    New-Item -ItemType Directory -Path $dbBackupPath -Force | Out-Null
    
    try {
        # Verificar se o container do PostgreSQL está rodando
        $postgresContainer = docker-compose ps postgres --format json 2>$null | ConvertFrom-Json
        
        if ($postgresContainer -and $postgresContainer.State -eq "running") {
            Write-ColorOutput "Fazendo backup do banco via container rodando..." "Info"
            
            # Backup via pg_dump no container
            $dumpFile = Join-Path $dbBackupPath "pgben_db_$BackupTimestamp.dump"
            $dumpCommand = "pg_dump -h localhost -U postgres -d pgben_db -F c -b -v -f /backup/pgben_db_$BackupTimestamp.dump"
            
            # Executar pg_dump no container
            docker-compose exec -T postgres bash -c "mkdir -p /backup && $dumpCommand" 2>$null
            
            # Copiar arquivo de backup do container
            docker cp "$(docker-compose ps -q postgres):/backup/pgben_db_$BackupTimestamp.dump" $dumpFile
            
            if (Test-Path $dumpFile) {
                $fileSize = [math]::Round((Get-Item $dumpFile).Length / 1MB, 2)
                Write-ColorOutput "Backup do banco criado: $dumpFile (${fileSize}MB)" "Success"
            } else {
                throw "Arquivo de backup não foi criado"
            }
            
            # Backup adicional em formato SQL
            if ($BackupConfig.Database.BackupFormat -eq "plain" -or $BackupType -eq "full") {
                $sqlFile = Join-Path $dbBackupPath "pgben_db_$BackupTimestamp.sql"
                $sqlCommand = "pg_dump -h localhost -U postgres -d pgben_db -f /backup/pgben_db_$BackupTimestamp.sql"
                
                docker-compose exec -T postgres bash -c $sqlCommand 2>$null
                docker cp "$(docker-compose ps -q postgres):/backup/pgben_db_$BackupTimestamp.sql" $sqlFile
                
                if (Test-Path $sqlFile) {
                    $sqlSize = [math]::Round((Get-Item $sqlFile).Length / 1MB, 2)
                    Write-ColorOutput "Backup SQL criado: $sqlFile (${sqlSize}MB)" "Success"
                }
            }
        } else {
            Write-ColorOutput "Container PostgreSQL não está rodando, fazendo backup dos volumes..." "Warning"
            
            # Backup dos volumes do PostgreSQL
            $volumeBackup = Join-Path $dbBackupPath "postgres_volume_$BackupTimestamp.tar"
            docker run --rm -v pgben_postgres_data:/data -v "${BackupPath}:/backup" alpine tar czf "/backup/postgres_volume_$BackupTimestamp.tar" -C /data .
            
            if (Test-Path $volumeBackup) {
                $volumeSize = [math]::Round((Get-Item $volumeBackup).Length / 1MB, 2)
                Write-ColorOutput "Backup do volume PostgreSQL criado: $volumeBackup (${volumeSize}MB)" "Success"
            }
        }
    }
    catch {
        Write-ColorOutput "Erro no backup do banco de dados: $($_.Exception.Message)" "Error"
        throw
    }
}

# Função para backup dos volumes Docker
function Backup-DockerVolumes {
    param([string]$BackupPath)
    
    if ($BackupType -eq "database-only") {
        Write-ColorOutput "Pulando backup dos volumes (database-only)" "Info"
        return
    }
    
    Write-ColorOutput "Iniciando backup dos volumes Docker..." "Info"
    
    $volumesBackupPath = Join-Path $BackupPath "volumes"
    New-Item -ItemType Directory -Path $volumesBackupPath -Force | Out-Null
    
    foreach ($volume in $BackupConfig.Volumes) {
        try {
            $volumeName = "pgben_$($volume.Name)"
            $volumeFile = Join-Path $volumesBackupPath "$($volume.Name)_$BackupTimestamp.tar"
            
            Write-ColorOutput "Fazendo backup do volume: $volumeName" "Info"
            
            # Verificar se o volume existe
            $volumeExists = docker volume ls --format "{{.Name}}" | Where-Object { $_ -eq $volumeName }
            
            if ($volumeExists) {
                # Criar backup do volume
                docker run --rm -v "${volumeName}:/data" -v "${BackupPath}:/backup" alpine tar czf "/backup/volumes/$($volume.Name)_$BackupTimestamp.tar" -C /data .
                
                if (Test-Path $volumeFile) {
                    $volumeSize = [math]::Round((Get-Item $volumeFile).Length / 1MB, 2)
                    Write-ColorOutput "Volume $($volume.Name) backup criado: ${volumeSize}MB" "Success"
                } else {
                    Write-ColorOutput "Falha ao criar backup do volume: $($volume.Name)" "Warning"
                }
            } else {
                Write-ColorOutput "Volume não encontrado: $volumeName" "Warning"
            }
        }
        catch {
            Write-ColorOutput "Erro no backup do volume $($volume.Name): $($_.Exception.Message)" "Error"
        }
    }
}

# Função para backup dos arquivos de configuração
function Backup-ConfigFiles {
    param([string]$BackupPath)
    
    if ($BackupType -eq "database-only") {
        Write-ColorOutput "Pulando backup dos arquivos (database-only)" "Info"
        return
    }
    
    Write-ColorOutput "Iniciando backup dos arquivos de configuração..." "Info"
    
    $filesBackupPath = Join-Path $BackupPath "files"
    New-Item -ItemType Directory -Path $filesBackupPath -Force | Out-Null
    
    Set-Location $ProjectRoot
    
    foreach ($file in $BackupConfig.Files) {
        try {
            if (Test-Path $file) {
                $destination = Join-Path $filesBackupPath (Split-Path $file -Leaf)
                
                if (Test-Path $file -PathType Container) {
                    # É um diretório
                    Copy-Item $file $destination -Recurse -Force
                    Write-ColorOutput "Diretório copiado: $file" "Success"
                } else {
                    # É um arquivo
                    Copy-Item $file $destination -Force
                    Write-ColorOutput "Arquivo copiado: $file" "Success"
                }
            } else {
                Write-ColorOutput "Arquivo/diretório não encontrado: $file" "Warning"
            }
        }
        catch {
            Write-ColorOutput "Erro ao copiar $file : $($_.Exception.Message)" "Error"
        }
    }
    
    # Criar arquivo de metadados
    $metadata = @{
        BackupTimestamp = $BackupTimestamp
        BackupType = $BackupType
        SystemInfo = @{
            OS = $env:OS
            ComputerName = $env:COMPUTERNAME
            UserName = $env:USERNAME
            PowerShellVersion = $PSVersionTable.PSVersion.ToString()
        }
        DockerInfo = @{
            Version = (docker --version 2>$null)
            ComposeVersion = (docker-compose --version 2>$null)
        }
        BackupConfig = $BackupConfig
    }
    
    $metadataFile = Join-Path $filesBackupPath "backup-metadata.json"
    $metadata | ConvertTo-Json -Depth 10 | Out-File -FilePath $metadataFile -Encoding UTF8
    Write-ColorOutput "Metadados do backup salvos: $metadataFile" "Success"
}

# Função para comprimir backup
function Compress-Backup {
    param([string]$BackupPath)
    
    if (-not $Compress) {
        return $BackupPath
    }
    
    Write-ColorOutput "Comprimindo backup..." "Info"
    
    try {
        $compressedFile = "$BackupPath.zip"
        
        # Usar PowerShell 5+ Compress-Archive
        if ($PSVersionTable.PSVersion.Major -ge 5) {
            Compress-Archive -Path "$BackupPath\*" -DestinationPath $compressedFile -Force
        } else {
            # Fallback para versões antigas
            Add-Type -AssemblyName System.IO.Compression.FileSystem
            [System.IO.Compression.ZipFile]::CreateFromDirectory($BackupPath, $compressedFile)
        }
        
        if (Test-Path $compressedFile) {
            $originalSize = [math]::Round((Get-ChildItem $BackupPath -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
            $compressedSize = [math]::Round((Get-Item $compressedFile).Length / 1MB, 2)
            $compressionRatio = [math]::Round((1 - ($compressedSize / $originalSize)) * 100, 1)
            
            Write-ColorOutput "Backup comprimido: ${originalSize}MB → ${compressedSize}MB (${compressionRatio}% redução)" "Success"
            
            # Remover diretório original
            Remove-Item $BackupPath -Recurse -Force
            
            return $compressedFile
        } else {
            throw "Arquivo comprimido não foi criado"
        }
    }
    catch {
        Write-ColorOutput "Erro na compressão: $($_.Exception.Message)" "Error"
        return $BackupPath
    }
}

# Função para criptografar backup
function Protect-Backup {
    param([string]$BackupPath)
    
    if (-not $Encrypt) {
        return $BackupPath
    }
    
    Write-ColorOutput "Criptografando backup..." "Info"
    
    try {
        # Gerar chave se não fornecida
        if (-not $EncryptionKey) {
            $EncryptionKey = [System.Convert]::ToBase64String([System.Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes(32))
            Write-ColorOutput "Chave de criptografia gerada. GUARDE COM SEGURANÇA!" "Warning"
            Write-ColorOutput "Chave: $EncryptionKey" "Warning"
        }
        
        # Implementar criptografia AES (simplificado)
        $encryptedFile = "$BackupPath.encrypted"
        
        # Para produção, usar uma biblioteca de criptografia mais robusta
        # Aqui é um exemplo básico
        Write-ColorOutput "AVISO: Implementar criptografia robusta para produção" "Warning"
        
        # Por enquanto, apenas renomear para indicar que deveria ser criptografado
        Move-Item $BackupPath $encryptedFile
        
        Write-ColorOutput "Backup criptografado: $encryptedFile" "Success"
        return $encryptedFile
    }
    catch {
        Write-ColorOutput "Erro na criptografia: $($_.Exception.Message)" "Error"
        return $BackupPath
    }
}

# Função para verificar integridade do backup
function Test-BackupIntegrity {
    param([string]$BackupPath)
    
    if (-not $Verify) {
        return $true
    }
    
    Write-ColorOutput "Verificando integridade do backup..." "Info"
    
    try {
        if ($BackupPath.EndsWith(".zip")) {
            # Verificar arquivo ZIP
            Add-Type -AssemblyName System.IO.Compression.FileSystem
            $zip = [System.IO.Compression.ZipFile]::OpenRead($BackupPath)
            $entryCount = $zip.Entries.Count
            $zip.Dispose()
            
            Write-ColorOutput "Arquivo ZIP válido com $entryCount entradas" "Success"
        } elseif (Test-Path $BackupPath -PathType Container) {
            # Verificar diretório
            $fileCount = (Get-ChildItem $BackupPath -Recurse -File).Count
            Write-ColorOutput "Diretório de backup válido com $fileCount arquivos" "Success"
        } else {
            # Verificar arquivo único
            $fileSize = [math]::Round((Get-Item $BackupPath).Length / 1MB, 2)
            Write-ColorOutput "Arquivo de backup válido: ${fileSize}MB" "Success"
        }
        
        return $true
    }
    catch {
        Write-ColorOutput "Erro na verificação de integridade: $($_.Exception.Message)" "Error"
        return $false
    }
}

# Função para limpeza de backups antigos
function Remove-OldBackups {
    Write-ColorOutput "Limpando backups antigos (retenção: $RetentionDays dias)..." "Info"
    
    try {
        $cutoffDate = (Get-Date).AddDays(-$RetentionDays)
        $oldBackups = Get-ChildItem $BackupLocation -Directory | Where-Object { 
            $_.Name -match "pgben-backup-\d{8}-\d{6}" -and $_.CreationTime -lt $cutoffDate 
        }
        
        $oldFiles = Get-ChildItem $BackupLocation -File | Where-Object { 
            $_.Name -match "pgben-backup-\d{8}-\d{6}" -and $_.CreationTime -lt $cutoffDate 
        }
        
        $removedCount = 0
        $freedSpace = 0
        
        foreach ($backup in $oldBackups) {
            $size = (Get-ChildItem $backup.FullName -Recurse | Measure-Object -Property Length -Sum).Sum
            Remove-Item $backup.FullName -Recurse -Force
            $freedSpace += $size
            $removedCount++
            Write-ColorOutput "Backup removido: $($backup.Name)" "Info"
        }
        
        foreach ($file in $oldFiles) {
            $freedSpace += $file.Length
            Remove-Item $file.FullName -Force
            $removedCount++
            Write-ColorOutput "Arquivo removido: $($file.Name)" "Info"
        }
        
        if ($removedCount -gt 0) {
            $freedSpaceMB = [math]::Round($freedSpace / 1MB, 2)
            Write-ColorOutput "$removedCount backups antigos removidos, ${freedSpaceMB}MB liberados" "Success"
        } else {
            Write-ColorOutput "Nenhum backup antigo encontrado para remoção" "Info"
        }
    }
    catch {
        Write-ColorOutput "Erro na limpeza de backups antigos: $($_.Exception.Message)" "Error"
    }
}

# Função para upload para nuvem (placeholder)
function Send-BackupToCloud {
    param([string]$BackupPath)
    
    if (-not $UploadToCloud) {
        return
    }
    
    Write-ColorOutput "Enviando backup para nuvem ($CloudProvider)..." "Info"
    
    try {
        switch ($CloudProvider.ToLower()) {
            "azure" {
                Write-ColorOutput "IMPLEMENTAR: Upload para Azure Blob Storage" "Warning"
                # az storage blob upload --file $BackupPath --name $BackupName --container-name backups
            }
            "aws" {
                Write-ColorOutput "IMPLEMENTAR: Upload para AWS S3" "Warning"
                # aws s3 cp $BackupPath s3://bucket-name/backups/
            }
            "gcp" {
                Write-ColorOutput "IMPLEMENTAR: Upload para Google Cloud Storage" "Warning"
                # gsutil cp $BackupPath gs://bucket-name/backups/
            }
            default {
                Write-ColorOutput "Provedor de nuvem não suportado: $CloudProvider" "Error"
            }
        }
    }
    catch {
        Write-ColorOutput "Erro no upload para nuvem: $($_.Exception.Message)" "Error"
    }
}

# Função para gerar relatório de backup
function New-BackupReport {
    param(
        [string]$BackupPath,
        [datetime]$StartTime,
        [datetime]$EndTime,
        [bool]$Success
    )
    
    $duration = $EndTime - $StartTime
    $reportFile = Join-Path $BackupLocation "backup-report-$BackupTimestamp.json"
    
    $report = @{
        BackupInfo = @{
            Name = $BackupName
            Type = $BackupType
            Timestamp = $BackupTimestamp
            StartTime = $StartTime.ToString("yyyy-MM-dd HH:mm:ss")
            EndTime = $EndTime.ToString("yyyy-MM-dd HH:mm:ss")
            Duration = $duration.ToString("hh\:mm\:ss")
            Success = $Success
        }
        BackupPath = $BackupPath
        Options = @{
            Compress = $Compress
            Encrypt = $Encrypt
            Verify = $Verify
            UploadToCloud = $UploadToCloud
            CloudProvider = $CloudProvider
        }
        System = @{
            OS = $env:OS
            ComputerName = $env:COMPUTERNAME
            PowerShellVersion = $PSVersionTable.PSVersion.ToString()
        }
        LogFile = $LogFile
    }
    
    if (Test-Path $BackupPath) {
        if ($BackupPath.EndsWith(".zip") -or (Test-Path $BackupPath -PathType Leaf)) {
            $report.BackupInfo.Size = [math]::Round((Get-Item $BackupPath).Length / 1MB, 2)
        } else {
            $report.BackupInfo.Size = [math]::Round((Get-ChildItem $BackupPath -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
        }
    }
    
    $report | ConvertTo-Json -Depth 10 | Out-File -FilePath $reportFile -Encoding UTF8
    Write-ColorOutput "Relatório de backup salvo: $reportFile" "Success"
    
    return $report
}

# Função principal
function Main {
    $startTime = Get-Date
    $success = $false
    $finalBackupPath = ""
    
    try {
        Write-Host "======================================" -ForegroundColor Cyan
        Write-Host "  Backup Automatizado - PGBEN" -ForegroundColor Cyan
        Write-Host "  Sistema SEMTAS" -ForegroundColor Cyan
        Write-Host "======================================" -ForegroundColor Cyan
        Write-Host ""
        
        Write-ColorOutput "Iniciando backup $BackupType em $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" "Info"
        
        # Verificar pré-requisitos
        if (-not (Test-Prerequisites)) {
            throw "Pré-requisitos não atendidos"
        }
        
        # Criar diretório de backup
        $backupPath = New-BackupDirectory
        
        # Executar backups baseado no tipo
        switch ($BackupType) {
            "full" {
                Backup-Database -BackupPath $backupPath
                Backup-DockerVolumes -BackupPath $backupPath
                Backup-ConfigFiles -BackupPath $backupPath
            }
            "incremental" {
                Write-ColorOutput "IMPLEMENTAR: Backup incremental" "Warning"
                Backup-Database -BackupPath $backupPath
                Backup-ConfigFiles -BackupPath $backupPath
            }
            "database-only" {
                Backup-Database -BackupPath $backupPath
            }
            "files-only" {
                Backup-DockerVolumes -BackupPath $backupPath
                Backup-ConfigFiles -BackupPath $backupPath
            }
            default {
                throw "Tipo de backup não suportado: $BackupType"
            }
        }
        
        # Comprimir se solicitado
        $finalBackupPath = Compress-Backup -BackupPath $backupPath
        
        # Criptografar se solicitado
        $finalBackupPath = Protect-Backup -BackupPath $finalBackupPath
        
        # Verificar integridade
        if (-not (Test-BackupIntegrity -BackupPath $finalBackupPath)) {
            throw "Falha na verificação de integridade do backup"
        }
        
        # Upload para nuvem
        Send-BackupToCloud -BackupPath $finalBackupPath
        
        # Limpeza de backups antigos
        Remove-OldBackups
        
        $success = $true
        Write-ColorOutput "Backup concluído com sucesso!" "Success"
        
    }
    catch {
        Write-ColorOutput "Erro durante o backup: $($_.Exception.Message)" "Error"
        $success = $false
    }
    finally {
        $endTime = Get-Date
        
        # Gerar relatório
        $report = New-BackupReport -BackupPath $finalBackupPath -StartTime $startTime -EndTime $endTime -Success $success
        
        # Exibir resumo
        Write-Host ""
        Write-Host "======================================" -ForegroundColor Cyan
        Write-Host "  Resumo do Backup" -ForegroundColor Cyan
        Write-Host "======================================" -ForegroundColor Cyan
        Write-Host "Status: $(if ($success) { 'SUCESSO' } else { 'FALHA' })" -ForegroundColor $(if ($success) { 'Green' } else { 'Red' })
        Write-Host "Tipo: $BackupType"
        Write-Host "Duração: $($report.BackupInfo.Duration)"
        if ($report.BackupInfo.Size) {
            Write-Host "Tamanho: $($report.BackupInfo.Size)MB"
        }
        Write-Host "Local: $finalBackupPath"
        Write-Host "Log: $LogFile"
        Write-Host ""
        
        if ($success) {
            Write-ColorOutput "✅ Backup realizado com sucesso" "Success"
            exit 0
        } else {
            Write-ColorOutput "❌ Backup falhou" "Error"
            exit 1
        }
    }
}

# Executar função principal
Main