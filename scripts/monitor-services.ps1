# Script PowerShell para monitoramento de serviços em produção
# Sistema PGBEN - SEMTAS

param(
    [switch]$Continuous,
    [int]$Interval = 30,
    [switch]$Detailed,
    [switch]$AlertsOnly,
    [string]$OutputFormat = "console", # console, json, csv
    [string]$LogFile = "./logs/monitoring.log"
)

# Configurações
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Variáveis globais
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$MonitoringData = @()

# Configuração de serviços esperados
$ExpectedServices = @(
    @{
        Name = "pgben-server"
        Port = 3000
        HealthEndpoint = "/health"
        Critical = $true
    },
    @{
        Name = "postgres"
        Port = 5432
        HealthEndpoint = $null
        Critical = $true
    },
    @{
        Name = "redis"
        Port = 6379
        HealthEndpoint = $null
        Critical = $true
    },
    @{
        Name = "minio"
        Port = 9000
        HealthEndpoint = "/minio/health/live"
        Critical = $false
    },
    @{
        Name = "grafana"
        Port = 3001
        HealthEndpoint = "/api/health"
        Critical = $false
    },
    @{
        Name = "prometheus"
        Port = 9090
        HealthEndpoint = "/-/healthy"
        Critical = $false
    }
)

# Função para logging colorido
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Type = "Info",
        [switch]$NoLog
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Type] $Message"
    
    if (-not $AlertsOnly -or $Type -in @("Error", "Warning")) {
        switch ($Type) {
            "Info" { Write-Host "[INFO] $Message" -ForegroundColor Blue }
            "Success" { Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
            "Warning" { Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
            "Error" { Write-Host "[ERROR] $Message" -ForegroundColor Red }
            "Critical" { Write-Host "[CRITICAL] $Message" -ForegroundColor Magenta }
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

# Função para verificar se um serviço Docker está rodando
function Test-DockerService {
    param(
        [string]$ServiceName
    )
    
    try {
        Set-Location $ProjectRoot
        $result = docker-compose ps --format json | ConvertFrom-Json | Where-Object { $_.Service -eq $ServiceName }
        
        if ($result) {
            return @{
                Running = ($result.State -eq "running")
                State = $result.State
                Status = $result.Status
                Ports = $result.Ports
            }
        } else {
            return @{
                Running = $false
                State = "not found"
                Status = "Service not found"
                Ports = ""
            }
        }
    }
    catch {
        return @{
            Running = $false
            State = "error"
            Status = "Error checking service: $($_.Exception.Message)"
            Ports = ""
        }
    }
}

# Função para verificar conectividade de porta
function Test-PortConnectivity {
    param(
        [string]$Host = "localhost",
        [int]$Port,
        [int]$TimeoutMs = 5000
    )
    
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $asyncResult = $tcpClient.BeginConnect($Host, $Port, $null, $null)
        $wait = $asyncResult.AsyncWaitHandle.WaitOne($TimeoutMs, $false)
        
        if ($wait) {
            $tcpClient.EndConnect($asyncResult)
            $tcpClient.Close()
            return $true
        } else {
            $tcpClient.Close()
            return $false
        }
    }
    catch {
        return $false
    }
}

# Função para verificar endpoint de saúde HTTP
function Test-HealthEndpoint {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 10
    )
    
    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec $TimeoutSeconds -UseBasicParsing -ErrorAction Stop
        return @{
            Success = ($response.StatusCode -eq 200)
            StatusCode = $response.StatusCode
            ResponseTime = $null # PowerShell não fornece tempo de resposta facilmente
            Content = $response.Content.Substring(0, [Math]::Min(100, $response.Content.Length))
        }
    }
    catch {
        return @{
            Success = $false
            StatusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode } else { "N/A" }
            ResponseTime = $null
            Content = $_.Exception.Message
        }
    }
}

# Função para obter métricas do sistema
function Get-SystemMetrics {
    try {
        # CPU
        $cpu = Get-WmiObject -Class Win32_Processor | Measure-Object -Property LoadPercentage -Average
        $cpuUsage = $cpu.Average
        
        # Memória
        $memory = Get-WmiObject -Class Win32_OperatingSystem
        $totalMemory = [math]::Round($memory.TotalVisibleMemorySize / 1MB, 2)
        $freeMemory = [math]::Round($memory.FreePhysicalMemory / 1MB, 2)
        $usedMemory = $totalMemory - $freeMemory
        $memoryUsage = [math]::Round(($usedMemory / $totalMemory) * 100, 2)
        
        # Disco
        $disk = Get-WmiObject -Class Win32_LogicalDisk -Filter "DriveType=3" | Where-Object { $_.DeviceID -eq "C:" }
        $totalDisk = [math]::Round($disk.Size / 1GB, 2)
        $freeDisk = [math]::Round($disk.FreeSpace / 1GB, 2)
        $usedDisk = $totalDisk - $freeDisk
        $diskUsage = [math]::Round(($usedDisk / $totalDisk) * 100, 2)
        
        return @{
            CPU = @{
                Usage = $cpuUsage
                Status = if ($cpuUsage -gt 80) { "Critical" } elseif ($cpuUsage -gt 60) { "Warning" } else { "OK" }
            }
            Memory = @{
                Total = $totalMemory
                Used = $usedMemory
                Free = $freeMemory
                Usage = $memoryUsage
                Status = if ($memoryUsage -gt 90) { "Critical" } elseif ($memoryUsage -gt 75) { "Warning" } else { "OK" }
            }
            Disk = @{
                Total = $totalDisk
                Used = $usedDisk
                Free = $freeDisk
                Usage = $diskUsage
                Status = if ($diskUsage -gt 90) { "Critical" } elseif ($diskUsage -gt 80) { "Warning" } else { "OK" }
            }
        }
    }
    catch {
        Write-ColorOutput "Erro ao obter métricas do sistema: $($_.Exception.Message)" "Error"
        return $null
    }
}

# Função para verificar logs de erro recentes
function Get-RecentErrors {
    try {
        Set-Location $ProjectRoot
        $errors = @()
        
        # Verificar logs do Docker Compose
        $logs = docker-compose logs --since="5m" 2>$null
        if ($logs) {
            $errorLines = $logs | Where-Object { $_ -match "(ERROR|FATAL|CRITICAL|Exception|Error)" }
            foreach ($line in $errorLines) {
                $errors += $line
            }
        }
        
        return $errors
    }
    catch {
        Write-ColorOutput "Erro ao verificar logs: $($_.Exception.Message)" "Error"
        return @()
    }
}

# Função para verificar Docker Secrets
function Test-DockerSecrets {
    try {
        $secrets = docker secret ls --format "{{.Name}}" 2>$null
        $expectedSecrets = @(
            "db_user", "db_password", "redis_password", "jwt_secret",
            "encryption_key", "minio_access_key", "minio_secret_key",
            "session_secret", "cookie_secret", "csrf_secret",
            "smtp_password", "grafana_admin_password"
        )
        
        $missingSecrets = @()
        foreach ($expected in $expectedSecrets) {
            if ($secrets -notcontains $expected) {
                $missingSecrets += $expected
            }
        }
        
        return @{
            Total = $expectedSecrets.Count
            Found = $secrets.Count
            Missing = $missingSecrets
            Status = if ($missingSecrets.Count -eq 0) { "OK" } else { "Error" }
        }
    }
    catch {
        return @{
            Total = 0
            Found = 0
            Missing = @()
            Status = "Error"
        }
    }
}

# Função para executar verificação completa
function Invoke-HealthCheck {
    $timestamp = Get-Date
    $healthData = @{
        Timestamp = $timestamp
        Services = @{}
        System = Get-SystemMetrics
        Secrets = Test-DockerSecrets
        RecentErrors = Get-RecentErrors
        OverallStatus = "OK"
    }
    
    Write-ColorOutput "Executando verificação de saúde..." "Info"
    
    # Verificar cada serviço
    foreach ($service in $ExpectedServices) {
        $serviceName = $service.Name
        $serviceData = @{
            Name = $serviceName
            Critical = $service.Critical
            Docker = Test-DockerService -ServiceName $serviceName
            Port = $null
            Health = $null
            Status = "Unknown"
        }
        
        # Verificar conectividade de porta
        if ($service.Port) {
            $serviceData.Port = @{
                Number = $service.Port
                Accessible = Test-PortConnectivity -Port $service.Port
            }
        }
        
        # Verificar endpoint de saúde
        if ($service.HealthEndpoint -and $serviceData.Port.Accessible) {
            $healthUrl = "http://localhost:$($service.Port)$($service.HealthEndpoint)"
            $serviceData.Health = Test-HealthEndpoint -Url $healthUrl
        }
        
        # Determinar status geral do serviço
        if ($serviceData.Docker.Running) {
            if ($serviceData.Port -and -not $serviceData.Port.Accessible) {
                $serviceData.Status = "Port Unreachable"
            } elseif ($serviceData.Health -and -not $serviceData.Health.Success) {
                $serviceData.Status = "Health Check Failed"
            } else {
                $serviceData.Status = "OK"
            }
        } else {
            $serviceData.Status = "Not Running"
        }
        
        # Atualizar status geral se serviço crítico estiver com problema
        if ($service.Critical -and $serviceData.Status -ne "OK") {
            $healthData.OverallStatus = "Critical"
        } elseif ($serviceData.Status -ne "OK" -and $healthData.OverallStatus -eq "OK") {
            $healthData.OverallStatus = "Warning"
        }
        
        $healthData.Services[$serviceName] = $serviceData
        
        # Log do status do serviço
        $logType = switch ($serviceData.Status) {
            "OK" { "Success" }
            "Not Running" { if ($service.Critical) { "Critical" } else { "Error" } }
            default { "Warning" }
        }
        
        Write-ColorOutput "$serviceName : $($serviceData.Status)" $logType
    }
    
    # Verificar erros recentes
    if ($healthData.RecentErrors.Count -gt 0) {
        Write-ColorOutput "$($healthData.RecentErrors.Count) erros encontrados nos logs recentes" "Warning"
        if ($healthData.OverallStatus -eq "OK") {
            $healthData.OverallStatus = "Warning"
        }
    }
    
    # Verificar secrets
    if ($healthData.Secrets.Status -ne "OK") {
        Write-ColorOutput "Problemas com Docker Secrets detectados" "Error"
        $healthData.OverallStatus = "Critical"
    }
    
    return $healthData
}

# Função para exibir relatório detalhado
function Show-DetailedReport {
    param([hashtable]$HealthData)
    
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host "  Relatório de Monitoramento" -ForegroundColor Cyan
    Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
    Write-Host "======================================" -ForegroundColor Cyan
    
    # Status geral
    $statusColor = switch ($HealthData.OverallStatus) {
        "OK" { "Green" }
        "Warning" { "Yellow" }
        "Critical" { "Red" }
        default { "White" }
    }
    Write-Host "Status Geral: $($HealthData.OverallStatus)" -ForegroundColor $statusColor
    Write-Host ""
    
    # Serviços
    Write-Host "📋 SERVIÇOS:" -ForegroundColor Yellow
    foreach ($serviceName in $HealthData.Services.Keys) {
        $service = $HealthData.Services[$serviceName]
        $icon = if ($service.Status -eq "OK") { "✅" } else { "❌" }
        $critical = if ($service.Critical) { " [CRÍTICO]" } else { "" }
        
        Write-Host "  $icon $serviceName : $($service.Status)$critical"
        
        if ($Detailed) {
            Write-Host "     Docker: $($service.Docker.State) - $($service.Docker.Status)"
            if ($service.Port) {
                $portStatus = if ($service.Port.Accessible) { "✅" } else { "❌" }
                Write-Host "     Porta $($service.Port.Number): $portStatus"
            }
            if ($service.Health) {
                $healthStatus = if ($service.Health.Success) { "✅" } else { "❌" }
                Write-Host "     Health Check: $healthStatus (Status: $($service.Health.StatusCode))"
            }
        }
    }
    
    # Métricas do sistema
    if ($HealthData.System) {
        Write-Host ""
        Write-Host "💻 SISTEMA:" -ForegroundColor Yellow
        $sys = $HealthData.System
        Write-Host "  CPU: $($sys.CPU.Usage)% ($($sys.CPU.Status))"
        Write-Host "  Memória: $($sys.Memory.Usage)% - $($sys.Memory.Used)GB/$($sys.Memory.Total)GB ($($sys.Memory.Status))"
        Write-Host "  Disco: $($sys.Disk.Usage)% - $($sys.Disk.Used)GB/$($sys.Disk.Total)GB ($($sys.Disk.Status))"
    }
    
    # Docker Secrets
    Write-Host ""
    Write-Host "🔐 DOCKER SECRETS:" -ForegroundColor Yellow
    $secrets = $HealthData.Secrets
    Write-Host "  Status: $($secrets.Status)"
    Write-Host "  Encontrados: $($secrets.Found)/$($secrets.Total)"
    if ($secrets.Missing.Count -gt 0) {
        Write-Host "  Faltando: $($secrets.Missing -join ', ')" -ForegroundColor Red
    }
    
    # Erros recentes
    if ($HealthData.RecentErrors.Count -gt 0) {
        Write-Host ""
        Write-Host "⚠️  ERROS RECENTES ($($HealthData.RecentErrors.Count)):" -ForegroundColor Red
        $HealthData.RecentErrors | Select-Object -First 5 | ForEach-Object {
            Write-Host "  $_" -ForegroundColor Red
        }
        if ($HealthData.RecentErrors.Count -gt 5) {
            Write-Host "  ... e mais $($HealthData.RecentErrors.Count - 5) erros"
        }
    }
}

# Função para exportar dados
function Export-MonitoringData {
    param(
        [hashtable]$HealthData,
        [string]$Format
    )
    
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    
    switch ($Format.ToLower()) {
        "json" {
            $fileName = "monitoring-$timestamp.json"
            $HealthData | ConvertTo-Json -Depth 10 | Out-File -FilePath $fileName -Encoding UTF8
            Write-ColorOutput "Dados exportados para: $fileName" "Info"
        }
        "csv" {
            $fileName = "monitoring-$timestamp.csv"
            $csvData = @()
            foreach ($serviceName in $HealthData.Services.Keys) {
                $service = $HealthData.Services[$serviceName]
                $csvData += [PSCustomObject]@{
                    Timestamp = $HealthData.Timestamp
                    Service = $serviceName
                    Status = $service.Status
                    Critical = $service.Critical
                    DockerState = $service.Docker.State
                    PortAccessible = if ($service.Port) { $service.Port.Accessible } else { "N/A" }
                    HealthCheck = if ($service.Health) { $service.Health.Success } else { "N/A" }
                }
            }
            $csvData | Export-Csv -Path $fileName -NoTypeInformation -Encoding UTF8
            Write-ColorOutput "Dados exportados para: $fileName" "Info"
        }
    }
}

# Função principal
function Main {
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host "  Monitor de Serviços - PGBEN" -ForegroundColor Cyan
    Write-Host "  Sistema SEMTAS" -ForegroundColor Cyan
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host ""
    
    if ($Continuous) {
        Write-ColorOutput "Iniciando monitoramento contínuo (intervalo: ${Interval}s)..." "Info"
        Write-ColorOutput "Pressione Ctrl+C para parar" "Info"
        Write-Host ""
        
        try {
            while ($true) {
                $healthData = Invoke-HealthCheck
                
                if ($Detailed -and -not $AlertsOnly) {
                    Show-DetailedReport -HealthData $healthData
                } elseif (-not $AlertsOnly) {
                    Write-ColorOutput "Status Geral: $($healthData.OverallStatus)" "Info"
                }
                
                if ($OutputFormat -ne "console") {
                    Export-MonitoringData -HealthData $healthData -Format $OutputFormat
                }
                
                Start-Sleep -Seconds $Interval
                
                if (-not $AlertsOnly) {
                    Write-Host "`n" + ("-" * 50) + "`n"
                }
            }
        }
        catch [System.Management.Automation.PipelineStoppedException] {
            Write-ColorOutput "Monitoramento interrompido pelo usuário." "Info"
        }
    } else {
        # Execução única
        $healthData = Invoke-HealthCheck
        
        if ($Detailed) {
            Show-DetailedReport -HealthData $healthData
        }
        
        if ($OutputFormat -ne "console") {
            Export-MonitoringData -HealthData $healthData -Format $OutputFormat
        }
        
        # Código de saída baseado no status
        switch ($healthData.OverallStatus) {
            "OK" { exit 0 }
            "Warning" { exit 1 }
            "Critical" { exit 2 }
            default { exit 3 }
        }
    }
}

# Executar função principal
Main