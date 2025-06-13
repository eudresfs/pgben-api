# Script PowerShell para restore de backup em produção
# Sistema PGBEN - SEMTAS

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupPath,
    [string]$RestoreType = "full", # full, database-only, files-only, volumes-only
    [switch]$Force,
    [switch]$Verify,
    [string]$TargetDatabase = "pgben",
    [string]$EncryptionKey = "",
    [switch]$StopServices,
    [switch]$StartServices,
    [string]$LogLevel = "Info", # Debug, Info, Warning, Error
    [switch]$DryRun
)

# Configurações
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Variáveis globais
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$RestoreTimestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$LogFile = "./logs/restore-$RestoreTimestamp.log"
$TempDir = "./temp/restore-$RestoreTimestamp"

# Configurações de restore
$RestoreConfig = @{
    Database = @{
        Host = "localhost"
        Port = 5432
        User = "postgres"
        AdminDatabase = "postgres"
    }
    Volumes = @(
        @{ Name = "postgres_data"; DockerVolume = "pgben_postgres_data" }
        @{ Name = "minio_data"; DockerVolume = "pgben_minio_data" }
        @{ Name = "grafana_data"; DockerVolume = "pgben_grafana_data" }
        @{ Name = "prometheus_data"; DockerVolume = "pgben_prometheus_data" }
        @{ Name = "redis_data"; DockerVolume = "pgben_redis_data" }
    )
    Services = @(
        "pgben-server",
        "postgres",
        "redis",
        "minio",
        "grafana",
        "prometheus"
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
    
    switch ($Type) {
        "Info" { Write-Host "[INFO] $Message" -ForegroundColor Blue }
        "Success" { Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
        "Warning" { Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
        "Error" { Write-Host "[ERROR] $Message" -ForegroundColor Red }
        "Debug" { if ($LogLevel -eq "Debug") { Write-Host "[DEBUG] $Message" -ForegroundColor Gray } }
        "DryRun" { Write-Host "[DRY-RUN] $Message" -ForegroundColor Magenta }
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
    
    # Verificar se o arquivo de backup existe
    if (-not (Test-Path $BackupPath)) {
        Write-ColorOutput "Arquivo/diretório de backup não encontrado: $BackupPath" "Error"
        return $false
    }
    
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
    
    # Verificar espaço em disco
    try {
        $drive = Get-WmiObject -Class Win32_LogicalDisk -Filter "DriveType=3" | Where-Object { $_.DeviceID -eq "C:" }
        $freeSpaceGB = [math]::Round($drive.FreeSpace / 1GB, 2)
        
        if ($freeSpaceGB -lt 10) {
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

# Função para confirmar operação
function Confirm-RestoreOperation {
    if ($Force -or $DryRun) {
        return $true
    }
    
    Write-Host ""
    Write-Host "⚠️  ATENÇÃO: OPERAÇÃO DE RESTORE" -ForegroundColor Red
    Write-Host "Esta operação irá:" -ForegroundColor Yellow
    
    switch ($RestoreType) {
        "full" {
            Write-Host "  • Substituir TODOS os dados do banco de dados" -ForegroundColor Yellow
            Write-Host "  • Substituir TODOS os volumes Docker" -ForegroundColor Yellow
            Write-Host "  • Substituir arquivos de configuração" -ForegroundColor Yellow
        }
        "database-only" {
            Write-Host "  • Substituir TODOS os dados do banco de dados" -ForegroundColor Yellow
        }
        "files-only" {
            Write-Host "  • Substituir arquivos de configuração" -ForegroundColor Yellow
        }
        "volumes-only" {
            Write-Host "  • Substituir TODOS os volumes Docker" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "Backup origem: $BackupPath" -ForegroundColor Cyan
    Write-Host "Tipo de restore: $RestoreType" -ForegroundColor Cyan
    Write-Host ""
    
    $confirmation = Read-Host "Deseja continuar? (digite 'CONFIRMO' para prosseguir)"
    
    if ($confirmation -ne "CONFIRMO") {
        Write-ColorOutput "Operação cancelada pelo usuário" "Warning"
        return $false
    }
    
    return $true
}

# Função para preparar backup para restore
function Expand-BackupFile {
    Write-ColorOutput "Preparando backup para restore..." "Info"
    
    # Criar diretório temporário
    if (Test-Path $TempDir) {
        Remove-Item $TempDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $TempDir -Force | Out-Null
    
    try {
        if ($BackupPath.EndsWith(".zip")) {
            Write-ColorOutput "Extraindo arquivo ZIP..." "Info"
            
            if ($DryRun) {
                Write-ColorOutput "Extrairia: $BackupPath para $TempDir" "DryRun"
                return $TempDir
            }
            
            # Extrair ZIP
            if ($PSVersionTable.PSVersion.Major -ge 5) {
                Expand-Archive -Path $BackupPath -DestinationPath $TempDir -Force
            } else {
                Add-Type -AssemblyName System.IO.Compression.FileSystem
                [System.IO.Compression.ZipFile]::ExtractToDirectory($BackupPath, $TempDir)
            }
            
            Write-ColorOutput "Backup extraído para: $TempDir" "Success"
            return $TempDir
            
        } elseif ($BackupPath.EndsWith(".encrypted")) {
            Write-ColorOutput "Descriptografando backup..." "Info"
            
            if (-not $EncryptionKey) {
                $EncryptionKey = Read-Host "Digite a chave de criptografia" -AsSecureString
                $EncryptionKey = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($EncryptionKey))
            }
            
            if ($DryRun) {
                Write-ColorOutput "Descriptografaria: $BackupPath" "DryRun"
                return $TempDir
            }
            
            # Implementar descriptografia
            Write-ColorOutput "IMPLEMENTAR: Descriptografia do backup" "Warning"
            
            # Por enquanto, apenas copiar
            $decryptedPath = Join-Path $TempDir "decrypted"
            Copy-Item $BackupPath $decryptedPath
            
            return $decryptedPath
            
        } elseif (Test-Path $BackupPath -PathType Container) {
            Write-ColorOutput "Usando diretório de backup diretamente" "Info"
            return $BackupPath
            
        } else {
            Write-ColorOutput "Copiando arquivo de backup..." "Info"
            
            if ($DryRun) {
                Write-ColorOutput "Copiaria: $BackupPath para $TempDir" "DryRun"
                return $TempDir
            }
            
            $fileName = Split-Path $BackupPath -Leaf
            $destPath = Join-Path $TempDir $fileName
            Copy-Item $BackupPath $destPath
            
            return $TempDir
        }
    }
    catch {
        Write-ColorOutput "Erro ao preparar backup: $($_.Exception.Message)" "Error"
        throw
    }
}

# Função para parar serviços
function Stop-DockerServices {
    if (-not $StopServices -and -not ($RestoreType -in @("full", "volumes-only"))) {
        return
    }
    
    Write-ColorOutput "Parando serviços Docker..." "Info"
    
    try {
        Set-Location $ProjectRoot
        
        if ($DryRun) {
            Write-ColorOutput "Pararia todos os serviços Docker Compose" "DryRun"
            return
        }
        
        # Parar serviços
        docker-compose down
        
        # Aguardar serviços pararem completamente
        Start-Sleep -Seconds 5
        
        # Verificar se pararam
        $runningServices = docker-compose ps --services --filter "status=running" 2>$null
        if ($runningServices) {
            Write-ColorOutput "Alguns serviços ainda estão rodando: $($runningServices -join ', ')" "Warning"
            
            # Forçar parada
            docker-compose kill
            Start-Sleep -Seconds 3
        }
        
        Write-ColorOutput "Serviços parados com sucesso" "Success"
    }
    catch {
        Write-ColorOutput "Erro ao parar serviços: $($_.Exception.Message)" "Error"
        throw
    }
}

# Função para iniciar serviços
function Start-DockerServices {
    if (-not $StartServices) {
        return
    }
    
    Write-ColorOutput "Iniciando serviços Docker..." "Info"
    
    try {
        Set-Location $ProjectRoot
        
        if ($DryRun) {
            Write-ColorOutput "Iniciaria todos os serviços Docker Compose" "DryRun"
            return
        }
        
        # Iniciar serviços
        docker-compose up -d
        
        # Aguardar serviços iniciarem
        Start-Sleep -Seconds 10
        
        # Verificar status
        $runningServices = docker-compose ps --services --filter "status=running" 2>$null
        if ($runningServices) {
            Write-ColorOutput "Serviços iniciados: $($runningServices -join ', ')" "Success"
        } else {
            Write-ColorOutput "Nenhum serviço está rodando" "Warning"
        }
    }
    catch {
        Write-ColorOutput "Erro ao iniciar serviços: $($_.Exception.Message)" "Error"
        throw
    }
}

# Função para restore do banco de dados
function Restore-Database {
    param([string]$BackupDir)
    
    if ($RestoreType -in @("files-only", "volumes-only")) {
        Write-ColorOutput "Pulando restore do banco de dados ($RestoreType)" "Info"
        return
    }
    
    Write-ColorOutput "Iniciando restore do banco de dados..." "Info"
    
    $dbBackupDir = Join-Path $BackupDir "database"
    
    if (-not (Test-Path $dbBackupDir)) {
        Write-ColorOutput "Diretório de backup do banco não encontrado: $dbBackupDir" "Warning"
        return
    }
    
    try {
        # Procurar arquivos de backup do banco
        $dumpFiles = Get-ChildItem $dbBackupDir -Filter "*.dump" | Sort-Object LastWriteTime -Descending
        $sqlFiles = Get-ChildItem $dbBackupDir -Filter "*.sql" | Sort-Object LastWriteTime -Descending
        $volumeFiles = Get-ChildItem $dbBackupDir -Filter "*postgres_volume*.tar" | Sort-Object LastWriteTime -Descending
        
        if ($dumpFiles.Count -gt 0) {
            # Restore via pg_restore
            $dumpFile = $dumpFiles[0]
            Write-ColorOutput "Restaurando banco via pg_restore: $($dumpFile.Name)" "Info"
            
            if ($DryRun) {
                Write-ColorOutput "Restauraria banco de dados de: $($dumpFile.FullName)" "DryRun"
                return
            }
            
            # Garantir que o PostgreSQL está rodando
            docker-compose up -d postgres
            Start-Sleep -Seconds 10
            
            # Copiar arquivo para o container
            $containerDumpPath = "/tmp/restore.dump"
            docker cp $dumpFile.FullName "$(docker-compose ps -q postgres):$containerDumpPath"
            
            # Dropar banco existente (se existir) e recriar
            Write-ColorOutput "Recriando banco de dados: $TargetDatabase" "Warning"
            
            $dropDbCommand = "psql -h localhost -U postgres -d postgres -c \"DROP DATABASE IF EXISTS $TargetDatabase;\""
            docker-compose exec -T postgres bash -c $dropDbCommand
            
            $createDbCommand = "psql -h localhost -U postgres -d postgres -c \"CREATE DATABASE $TargetDatabase;\""
            docker-compose exec -T postgres bash -c $createDbCommand
            
            # Restaurar dados
            $restoreCommand = "pg_restore -h localhost -U postgres -d $TargetDatabase -v $containerDumpPath"
            docker-compose exec -T postgres bash -c $restoreCommand
            
            Write-ColorOutput "Banco de dados restaurado com sucesso" "Success"
            
        } elseif ($sqlFiles.Count -gt 0) {
            # Restore via psql
            $sqlFile = $sqlFiles[0]
            Write-ColorOutput "Restaurando banco via psql: $($sqlFile.Name)" "Info"
            
            if ($DryRun) {
                Write-ColorOutput "Restauraria banco de dados de: $($sqlFile.FullName)" "DryRun"
                return
            }
            
            # Garantir que o PostgreSQL está rodando
            docker-compose up -d postgres
            Start-Sleep -Seconds 10
            
            # Copiar arquivo para o container
            $containerSqlPath = "/tmp/restore.sql"
            docker cp $sqlFile.FullName "$(docker-compose ps -q postgres):$containerSqlPath"
            
            # Dropar banco existente (se existir) e recriar
            Write-ColorOutput "Recriando banco de dados: $TargetDatabase" "Warning"
            
            $dropDbCommand = "psql -h localhost -U postgres -d postgres -c \"DROP DATABASE IF EXISTS $TargetDatabase;\""
            docker-compose exec -T postgres bash -c $dropDbCommand
            
            $createDbCommand = "psql -h localhost -U postgres -d postgres -c \"CREATE DATABASE $TargetDatabase;\""
            docker-compose exec -T postgres bash -c $createDbCommand
            
            # Restaurar dados
            $restoreCommand = "psql -h localhost -U postgres -d $TargetDatabase -f $containerSqlPath"
            docker-compose exec -T postgres bash -c $restoreCommand
            
            Write-ColorOutput "Banco de dados restaurado com sucesso" "Success"
            
        } elseif ($volumeFiles.Count -gt 0) {
            # Restore via volume
            $volumeFile = $volumeFiles[0]
            Write-ColorOutput "Restaurando volume PostgreSQL: $($volumeFile.Name)" "Info"
            
            if ($DryRun) {
                Write-ColorOutput "Restauraria volume PostgreSQL de: $($volumeFile.FullName)" "DryRun"
                return
            }
            
            # Parar PostgreSQL
            docker-compose stop postgres
            
            # Remover volume existente
            docker volume rm pgben_postgres_data -f 2>$null
            
            # Criar novo volume e restaurar dados
            docker volume create pgben_postgres_data
            docker run --rm -v pgben_postgres_data:/data -v "$($volumeFile.Directory.FullName):/backup" alpine tar xzf "/backup/$($volumeFile.Name)" -C /data
            
            Write-ColorOutput "Volume PostgreSQL restaurado com sucesso" "Success"
            
        } else {
            Write-ColorOutput "Nenhum arquivo de backup do banco encontrado" "Warning"
        }
    }
    catch {
        Write-ColorOutput "Erro no restore do banco de dados: $($_.Exception.Message)" "Error"
        throw
    }
}

# Função para restore dos volumes Docker
function Restore-DockerVolumes {
    param([string]$BackupDir)
    
    if ($RestoreType -in @("database-only", "files-only")) {
        Write-ColorOutput "Pulando restore dos volumes ($RestoreType)" "Info"
        return
    }
    
    Write-ColorOutput "Iniciando restore dos volumes Docker..." "Info"
    
    $volumesBackupDir = Join-Path $BackupDir "volumes"
    
    if (-not (Test-Path $volumesBackupDir)) {
        Write-ColorOutput "Diretório de backup dos volumes não encontrado: $volumesBackupDir" "Warning"
        return
    }
    
    foreach ($volume in $RestoreConfig.Volumes) {
        try {
            # Procurar arquivo de backup do volume
            $volumeFiles = Get-ChildItem $volumesBackupDir -Filter "$($volume.Name)_*.tar" | Sort-Object LastWriteTime -Descending
            
            if ($volumeFiles.Count -eq 0) {
                Write-ColorOutput "Backup do volume não encontrado: $($volume.Name)" "Warning"
                continue
            }
            
            $volumeFile = $volumeFiles[0]
            Write-ColorOutput "Restaurando volume: $($volume.DockerVolume)" "Info"
            
            if ($DryRun) {
                Write-ColorOutput "Restauraria volume $($volume.DockerVolume) de: $($volumeFile.FullName)" "DryRun"
                continue
            }
            
            # Parar serviços que usam o volume
            $servicesToStop = @()
            switch ($volume.Name) {
                "postgres_data" { $servicesToStop = @("postgres") }
                "minio_data" { $servicesToStop = @("minio", "createbuckets-prod") }
                "grafana_data" { $servicesToStop = @("grafana") }
                "prometheus_data" { $servicesToStop = @("prometheus") }
                "redis_data" { $servicesToStop = @("redis") }
            }
            
            foreach ($service in $servicesToStop) {
                docker-compose stop $service 2>$null
            }
            
            # Remover volume existente
            docker volume rm $volume.DockerVolume -f 2>$null
            
            # Criar novo volume e restaurar dados
            docker volume create $volume.DockerVolume
            docker run --rm -v "$($volume.DockerVolume):/data" -v "$($volumeFile.Directory.FullName):/backup" alpine tar xzf "/backup/$($volumeFile.Name)" -C /data
            
            Write-ColorOutput "Volume $($volume.Name) restaurado com sucesso" "Success"
            
        }
        catch {
            Write-ColorOutput "Erro no restore do volume $($volume.Name): $($_.Exception.Message)" "Error"
        }
    }
}

# Função para restore dos arquivos de configuração
function Restore-ConfigFiles {
    param([string]$BackupDir)
    
    if ($RestoreType -in @("database-only", "volumes-only")) {
        Write-ColorOutput "Pulando restore dos arquivos ($RestoreType)" "Info"
        return
    }
    
    Write-ColorOutput "Iniciando restore dos arquivos de configuração..." "Info"
    
    $filesBackupDir = Join-Path $BackupDir "files"
    
    if (-not (Test-Path $filesBackupDir)) {
        Write-ColorOutput "Diretório de backup dos arquivos não encontrado: $filesBackupDir" "Warning"
        return
    }
    
    try {
        Set-Location $ProjectRoot
        
        # Criar backup dos arquivos atuais
        $currentBackupDir = "./backup-current-$RestoreTimestamp"
        
        if (-not $DryRun) {
            New-Item -ItemType Directory -Path $currentBackupDir -Force | Out-Null
        }
        
        # Restaurar arquivos
        $filesToRestore = Get-ChildItem $filesBackupDir
        
        foreach ($item in $filesToRestore) {
            if ($item.Name -eq "backup-metadata.json") {
                continue # Pular metadados
            }
            
            $targetPath = Join-Path $ProjectRoot $item.Name
            
            if ($DryRun) {
                Write-ColorOutput "Restauraria: $($item.Name) para $targetPath" "DryRun"
                continue
            }
            
            # Fazer backup do arquivo/diretório atual
            if (Test-Path $targetPath) {
                $backupPath = Join-Path $currentBackupDir $item.Name
                
                if (Test-Path $targetPath -PathType Container) {
                    Copy-Item $targetPath $backupPath -Recurse -Force
                } else {
                    Copy-Item $targetPath $backupPath -Force
                }
                
                Write-ColorOutput "Backup atual salvo: $backupPath" "Debug"
            }
            
            # Restaurar arquivo/diretório
            if (Test-Path $item.FullName -PathType Container) {
                if (Test-Path $targetPath) {
                    Remove-Item $targetPath -Recurse -Force
                }
                Copy-Item $item.FullName $targetPath -Recurse -Force
            } else {
                Copy-Item $item.FullName $targetPath -Force
            }
            
            Write-ColorOutput "Arquivo restaurado: $($item.Name)" "Success"
        }
        
        if (-not $DryRun) {
            Write-ColorOutput "Backup dos arquivos atuais salvo em: $currentBackupDir" "Info"
        }
    }
    catch {
        Write-ColorOutput "Erro no restore dos arquivos: $($_.Exception.Message)" "Error"
        throw
    }
}

# Função para verificar restore
function Test-RestoreIntegrity {
    if (-not $Verify) {
        return $true
    }
    
    Write-ColorOutput "Verificando integridade do restore..." "Info"
    
    try {
        $issues = @()
        
        if ($DryRun) {
            Write-ColorOutput "Verificaria integridade do restore" "DryRun"
            return $true
        }
        
        # Verificar banco de dados
        if ($RestoreType -in @("full", "database-only")) {
            try {
                Set-Location $ProjectRoot
                docker-compose up -d postgres
                Start-Sleep -Seconds 10
                
                $dbTestCommand = "psql -h localhost -U postgres -d $TargetDatabase -c 'SELECT COUNT(*) FROM information_schema.tables;'"
                $result = docker-compose exec -T postgres bash -c $dbTestCommand 2>$null
                
                if ($result) {
                    Write-ColorOutput "Banco de dados acessível" "Success"
                } else {
                    $issues += "Banco de dados não acessível"
                }
            }
            catch {
                $issues += "Erro ao verificar banco de dados: $($_.Exception.Message)"
            }
        }
        
        # Verificar volumes
        if ($RestoreType -in @("full", "volumes-only")) {
            foreach ($volume in $RestoreConfig.Volumes) {
                try {
                    $volumeExists = docker volume ls --format "{{.Name}}" | Where-Object { $_ -eq $volume.DockerVolume }
                    
                    if ($volumeExists) {
                        Write-ColorOutput "Volume $($volume.DockerVolume) existe" "Success"
                    } else {
                        $issues += "Volume $($volume.DockerVolume) não encontrado"
                    }
                }
                catch {
                    $issues += "Erro ao verificar volume $($volume.DockerVolume): $($_.Exception.Message)"
                }
            }
        }
        
        # Verificar arquivos
        if ($RestoreType -in @("full", "files-only")) {
            $criticalFiles = @(
                "docker-compose.prod.yml",
                "config/nginx/nginx.prod.conf"
            )
            
            foreach ($file in $criticalFiles) {
                $filePath = Join-Path $ProjectRoot $file
                
                if (Test-Path $filePath) {
                    Write-ColorOutput "Arquivo crítico existe: $file" "Success"
                } else {
                    $issues += "Arquivo crítico não encontrado: $file"
                }
            }
        }
        
        # Relatório de verificação
        if ($issues.Count -eq 0) {
            Write-ColorOutput "Verificação de integridade passou" "Success"
            return $true
        } else {
            Write-ColorOutput "Problemas encontrados na verificação:" "Error"
            foreach ($issue in $issues) {
                Write-ColorOutput "  • $issue" "Error"
            }
            return $false
        }
    }
    catch {
        Write-ColorOutput "Erro na verificação de integridade: $($_.Exception.Message)" "Error"
        return $false
    }
}

# Função para limpeza
function Clear-TempFiles {
    if (Test-Path $TempDir) {
        try {
            Remove-Item $TempDir -Recurse -Force
            Write-ColorOutput "Arquivos temporários removidos" "Debug"
        }
        catch {
            Write-ColorOutput "Erro ao remover arquivos temporários: $($_.Exception.Message)" "Warning"
        }
    }
}

# Função para gerar relatório de restore
function New-RestoreReport {
    param(
        [datetime]$StartTime,
        [datetime]$EndTime,
        [bool]$Success,
        [string]$BackupSource
    )
    
    $duration = $EndTime - $StartTime
    $reportFile = Join-Path $ProjectRoot "logs/restore-report-$RestoreTimestamp.json"
    
    $report = @{
        RestoreInfo = @{
            Type = $RestoreType
            Timestamp = $RestoreTimestamp
            StartTime = $StartTime.ToString("yyyy-MM-dd HH:mm:ss")
            EndTime = $EndTime.ToString("yyyy-MM-dd HH:mm:ss")
            Duration = $duration.ToString("hh\:mm\:ss")
            Success = $Success
            DryRun = $DryRun
        }
        BackupSource = $BackupSource
        TargetDatabase = $TargetDatabase
        Options = @{
            Force = $Force
            Verify = $Verify
            StopServices = $StopServices
            StartServices = $StartServices
        }
        System = @{
            OS = $env:OS
            ComputerName = $env:COMPUTERNAME
            PowerShellVersion = $PSVersionTable.PSVersion.ToString()
        }
        LogFile = $LogFile
    }
    
    if (-not $DryRun) {
        $report | ConvertTo-Json -Depth 10 | Out-File -FilePath $reportFile -Encoding UTF8
        Write-ColorOutput "Relatório de restore salvo: $reportFile" "Success"
    }
    
    return $report
}

# Função principal
function Main {
    $startTime = Get-Date
    $success = $false
    $preparedBackupPath = ""
    
    try {
        Write-Host "======================================" -ForegroundColor Cyan
        Write-Host "  Restore de Backup - PGBEN" -ForegroundColor Cyan
        Write-Host "  Sistema SEMTAS" -ForegroundColor Cyan
        Write-Host "======================================" -ForegroundColor Cyan
        Write-Host ""
        
        if ($DryRun) {
            Write-ColorOutput "MODO DRY-RUN ATIVADO - Nenhuma alteração será feita" "Warning"
            Write-Host ""
        }
        
        Write-ColorOutput "Iniciando restore $RestoreType em $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" "Info"
        Write-ColorOutput "Origem: $BackupPath" "Info"
        
        # Verificar pré-requisitos
        if (-not (Test-Prerequisites)) {
            throw "Pré-requisitos não atendidos"
        }
        
        # Confirmar operação
        if (-not (Confirm-RestoreOperation)) {
            throw "Operação cancelada"
        }
        
        # Preparar backup
        $preparedBackupPath = Expand-BackupFile
        
        # Parar serviços se necessário
        Stop-DockerServices
        
        # Executar restore baseado no tipo
        switch ($RestoreType) {
            "full" {
                Restore-Database -BackupDir $preparedBackupPath
                Restore-DockerVolumes -BackupDir $preparedBackupPath
                Restore-ConfigFiles -BackupDir $preparedBackupPath
            }
            "database-only" {
                Restore-Database -BackupDir $preparedBackupPath
            }
            "files-only" {
                Restore-ConfigFiles -BackupDir $preparedBackupPath
            }
            "volumes-only" {
                Restore-DockerVolumes -BackupDir $preparedBackupPath
            }
            default {
                throw "Tipo de restore não suportado: $RestoreType"
            }
        }
        
        # Iniciar serviços se solicitado
        Start-DockerServices
        
        # Verificar integridade
        if (-not (Test-RestoreIntegrity)) {
            Write-ColorOutput "Falha na verificação de integridade" "Warning"
        }
        
        $success = $true
        
        if ($DryRun) {
            Write-ColorOutput "Dry-run concluído com sucesso!" "Success"
        } else {
            Write-ColorOutput "Restore concluído com sucesso!" "Success"
        }
        
    }
    catch {
        Write-ColorOutput "Erro durante o restore: $($_.Exception.Message)" "Error"
        $success = $false
    }
    finally {
        # Limpeza
        Clear-TempFiles
        
        $endTime = Get-Date
        
        # Gerar relatório
        $report = New-RestoreReport -StartTime $startTime -EndTime $endTime -Success $success -BackupSource $BackupPath
        
        # Exibir resumo
        Write-Host ""
        Write-Host "======================================" -ForegroundColor Cyan
        Write-Host "  Resumo do Restore" -ForegroundColor Cyan
        Write-Host "======================================" -ForegroundColor Cyan
        Write-Host "Status: $(if ($success) { 'SUCESSO' } else { 'FALHA' })" -ForegroundColor $(if ($success) { 'Green' } else { 'Red' })
        Write-Host "Tipo: $RestoreType"
        Write-Host "Duração: $($report.RestoreInfo.Duration)"
        Write-Host "Origem: $BackupPath"
        if (-not $DryRun) {
            Write-Host "Log: $LogFile"
        }
        Write-Host ""
        
        if ($DryRun) {
            Write-ColorOutput "✅ Dry-run concluído" "Success"
        } elseif ($success) {
            Write-ColorOutput "✅ Restore realizado com sucesso" "Success"
            
            if ($StartServices) {
                Write-Host ""
                Write-ColorOutput "🚀 Serviços iniciados. Aguarde alguns minutos para estabilização." "Info"
                Write-ColorOutput "📊 Acesse http://localhost:3000 para verificar a aplicação" "Info"
                Write-ColorOutput "📈 Acesse http://localhost:3001 para verificar o Grafana" "Info"
            } else {
                Write-Host ""
                Write-ColorOutput "⚠️  Lembre-se de iniciar os serviços: docker-compose up -d" "Warning"
            }
            
            exit 0
        } else {
            Write-ColorOutput "❌ Restore falhou" "Error"
            exit 1
        }
    }
}

# Executar função principal
Main