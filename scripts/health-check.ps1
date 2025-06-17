# Script PowerShell para verificação de saúde do sistema
# Sistema PGBEN - SEMTAS

param(
    [string]$Mode = "basic", # basic, detailed, critical-only
    [string]$Format = "console", # console, json, prometheus
    [string]$OutputFile = "",
    [int]$Timeout = 30,
    [switch]$Quiet,
    [switch]$ExitOnFailure,
    [string]$AlertWebhook = "",
    [string]$LogLevel = "Info" # Debug, Info, Warning, Error
)

# Configurações
$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"

# Variáveis globais
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$CheckResults = @()
$OverallStatus = "HEALTHY"

# Configurações de health check
$HealthConfig = @{
    Services = @(
        @{
            Name = "pgben-server"
            Type = "http"
            Endpoint = "http://localhost:3000/v1/health"
            ExpectedStatus = 200
            Timeout = 10
            Critical = $true
        },
        @{
            Name = "postgres"
            Type = "tcp"
            Host = "localhost"
            Port = 5432
            Timeout = 5
            Critical = $true
        },
        @{
            Name = "redis"
            Type = "tcp"
            Host = "localhost"
            Port = 6379
            Timeout = 5
            Critical = $true
        },
        @{
            Name = "minio"
            Type = "http"
            Endpoint = "http://localhost:9000/minio/health/live"
            ExpectedStatus = 200
            Timeout = 10
            Critical = $false
        },
        @{
            Name = "grafana"
            Type = "http"
            Endpoint = "http://localhost:3001/api/health"
            ExpectedStatus = 200
            Timeout = 10
            Critical = $false
        },
        @{
            Name = "prometheus"
            Type = "http"
            Endpoint = "http://localhost:9090/-/healthy"
            ExpectedStatus = 200
            Timeout = 10
            Critical = $false
        }
    )
    
    SystemChecks = @(
        @{
            Name = "disk_space"
            Type = "system"
            Threshold = 10 # GB
            Critical = $true
        },
        @{
            Name = "memory_usage"
            Type = "system"
            Threshold = 90 # Percentage
            Critical = $false
        },
        @{
            Name = "cpu_usage"
            Type = "system"
            Threshold = 95 # Percentage
            Critical = $false
        }
    )
    
    DockerChecks = @(
        @{
            Name = "docker_daemon"
            Type = "docker"
            Critical = $true
        },
        @{
            Name = "docker_containers"
            Type = "docker"
            Critical = $true
        },
        @{
            Name = "docker_volumes"
            Type = "docker"
            Critical = $false
        },
        @{
            Name = "docker_networks"
            Type = "docker"
            Critical = $false
        }
    )
}

# Função para logging
function Write-HealthLog {
    param(
        [string]$Message,
        [string]$Type = "Info"
    )
    
    if ($Quiet -and $Type -ne "Error") {
        return
    }
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    switch ($Type) {
        "Info" { if (-not $Quiet) { Write-Host "[INFO] $Message" -ForegroundColor Blue } }
        "Success" { if (-not $Quiet) { Write-Host "[OK] $Message" -ForegroundColor Green } }
        "Warning" { Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
        "Error" { Write-Host "[ERROR] $Message" -ForegroundColor Red }
        "Debug" { if ($LogLevel -eq "Debug" -and -not $Quiet) { Write-Host "[DEBUG] $Message" -ForegroundColor Gray } }
    }
}

# Função para adicionar resultado de check
function Add-CheckResult {
    param(
        [string]$Name,
        [string]$Type,
        [string]$Status, # HEALTHY, WARNING, CRITICAL, UNKNOWN
        [string]$Message,
        [hashtable]$Details = @{},
        [bool]$Critical = $false,
        [double]$ResponseTime = 0
    )
    
    $result = @{
        Name = $Name
        Type = $Type
        Status = $Status
        Message = $Message
        Details = $Details
        Critical = $Critical
        ResponseTime = $ResponseTime
        Timestamp = $Timestamp
    }
    
    $script:CheckResults += $result
    
    # Atualizar status geral
    if ($Critical -and $Status -in @("CRITICAL", "UNKNOWN")) {
        $script:OverallStatus = "CRITICAL"
    } elseif ($script:OverallStatus -ne "CRITICAL" -and $Status -eq "WARNING") {
        $script:OverallStatus = "WARNING"
    }
    
    # Log do resultado
    $statusColor = switch ($Status) {
        "HEALTHY" { "Success" }
        "WARNING" { "Warning" }
        "CRITICAL" { "Error" }
        "UNKNOWN" { "Error" }
    }
    
    $criticalText = if ($Critical) { " [CRITICAL]" } else { "" }
    $responseText = if ($ResponseTime -gt 0) { " (${ResponseTime}ms)" } else { "" }
    
    Write-HealthLog "$Name: $Message$criticalText$responseText" $statusColor
}

# Função para testar conectividade HTTP
function Test-HttpEndpoint {
    param(
        [string]$Url,
        [int]$ExpectedStatus = 200,
        [int]$TimeoutSeconds = 10
    )
    
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec $TimeoutSeconds -UseBasicParsing -ErrorAction Stop
        
        $stopwatch.Stop()
        $responseTime = $stopwatch.ElapsedMilliseconds
        
        if ($response.StatusCode -eq $ExpectedStatus) {
            return @{
                Success = $true
                StatusCode = $response.StatusCode
                ResponseTime = $responseTime
                Message = "HTTP $($response.StatusCode)"
            }
        } else {
            return @{
                Success = $false
                StatusCode = $response.StatusCode
                ResponseTime = $responseTime
                Message = "HTTP $($response.StatusCode) (esperado $ExpectedStatus)"
            }
        }
    }
    catch {
        return @{
            Success = $false
            StatusCode = 0
            ResponseTime = 0
            Message = "Erro: $($_.Exception.Message)"
        }
    }
}

# Função para testar conectividade TCP
function Test-TcpConnection {
    param(
        [string]$Host,
        [int]$Port,
        [int]$TimeoutSeconds = 5
    )
    
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $asyncResult = $tcpClient.BeginConnect($Host, $Port, $null, $null)
        $waitHandle = $asyncResult.AsyncWaitHandle
        
        if ($waitHandle.WaitOne($TimeoutSeconds * 1000)) {
            $tcpClient.EndConnect($asyncResult)
            $stopwatch.Stop()
            $responseTime = $stopwatch.ElapsedMilliseconds
            
            $tcpClient.Close()
            
            return @{
                Success = $true
                ResponseTime = $responseTime
                Message = "Conectado em ${Host}:${Port}"
            }
        } else {
            $tcpClient.Close()
            
            return @{
                Success = $false
                ResponseTime = 0
                Message = "Timeout conectando em ${Host}:${Port}"
            }
        }
    }
    catch {
        return @{
            Success = $false
            ResponseTime = 0
            Message = "Erro conectando em ${Host}:${Port}: $($_.Exception.Message)"
        }
    }
}

# Função para verificar serviços
function Test-Services {
    Write-HealthLog "Verificando serviços..." "Info"
    
    foreach ($service in $HealthConfig.Services) {
        if ($Mode -eq "critical-only" -and -not $service.Critical) {
            continue
        }
        
        try {
            switch ($service.Type) {
                "http" {
                    $result = Test-HttpEndpoint -Url $service.Endpoint -ExpectedStatus $service.ExpectedStatus -TimeoutSeconds $service.Timeout
                    
                    if ($result.Success) {
                        Add-CheckResult -Name $service.Name -Type "service" -Status "HEALTHY" -Message $result.Message -Critical $service.Critical -ResponseTime $result.ResponseTime -Details @{ StatusCode = $result.StatusCode }
                    } else {
                        $status = if ($service.Critical) { "CRITICAL" } else { "WARNING" }
                        Add-CheckResult -Name $service.Name -Type "service" -Status $status -Message $result.Message -Critical $service.Critical -Details @{ StatusCode = $result.StatusCode }
                    }
                }
                
                "tcp" {
                    $result = Test-TcpConnection -Host $service.Host -Port $service.Port -TimeoutSeconds $service.Timeout
                    
                    if ($result.Success) {
                        Add-CheckResult -Name $service.Name -Type "service" -Status "HEALTHY" -Message $result.Message -Critical $service.Critical -ResponseTime $result.ResponseTime
                    } else {
                        $status = if ($service.Critical) { "CRITICAL" } else { "WARNING" }
                        Add-CheckResult -Name $service.Name -Type "service" -Status $status -Message $result.Message -Critical $service.Critical
                    }
                }
            }
        }
        catch {
            $status = if ($service.Critical) { "CRITICAL" } else { "WARNING" }
            Add-CheckResult -Name $service.Name -Type "service" -Status $status -Message "Erro inesperado: $($_.Exception.Message)" -Critical $service.Critical
        }
    }
}

# Função para verificar sistema
function Test-SystemHealth {
    if ($Mode -eq "basic") {
        return
    }
    
    Write-HealthLog "Verificando saúde do sistema..." "Info"
    
    foreach ($check in $HealthConfig.SystemChecks) {
        if ($Mode -eq "critical-only" -and -not $check.Critical) {
            continue
        }
        
        try {
            switch ($check.Name) {
                "disk_space" {
                    $drive = Get-WmiObject -Class Win32_LogicalDisk -Filter "DriveType=3" | Where-Object { $_.DeviceID -eq "C:" }
                    $freeSpaceGB = [math]::Round($drive.FreeSpace / 1GB, 2)
                    $totalSpaceGB = [math]::Round($drive.Size / 1GB, 2)
                    $usedPercentage = [math]::Round((($totalSpaceGB - $freeSpaceGB) / $totalSpaceGB) * 100, 1)
                    
                    if ($freeSpaceGB -lt $check.Threshold) {
                        $status = if ($check.Critical) { "CRITICAL" } else { "WARNING" }
                        Add-CheckResult -Name $check.Name -Type "system" -Status $status -Message "Pouco espaço em disco: ${freeSpaceGB}GB livres" -Critical $check.Critical -Details @{ FreeSpaceGB = $freeSpaceGB; TotalSpaceGB = $totalSpaceGB; UsedPercentage = $usedPercentage }
                    } else {
                        Add-CheckResult -Name $check.Name -Type "system" -Status "HEALTHY" -Message "Espaço em disco OK: ${freeSpaceGB}GB livres (${usedPercentage}% usado)" -Critical $check.Critical -Details @{ FreeSpaceGB = $freeSpaceGB; TotalSpaceGB = $totalSpaceGB; UsedPercentage = $usedPercentage }
                    }
                }
                
                "memory_usage" {
                    $memory = Get-WmiObject -Class Win32_OperatingSystem
                    $totalMemoryGB = [math]::Round($memory.TotalVisibleMemorySize / 1MB, 2)
                    $freeMemoryGB = [math]::Round($memory.FreePhysicalMemory / 1MB, 2)
                    $usedPercentage = [math]::Round((($totalMemoryGB - $freeMemoryGB) / $totalMemoryGB) * 100, 1)
                    
                    if ($usedPercentage -gt $check.Threshold) {
                        $status = if ($check.Critical) { "CRITICAL" } else { "WARNING" }
                        Add-CheckResult -Name $check.Name -Type "system" -Status $status -Message "Alto uso de memória: ${usedPercentage}%" -Critical $check.Critical -Details @{ UsedPercentage = $usedPercentage; TotalMemoryGB = $totalMemoryGB; FreeMemoryGB = $freeMemoryGB }
                    } else {
                        Add-CheckResult -Name $check.Name -Type "system" -Status "HEALTHY" -Message "Uso de memória OK: ${usedPercentage}%" -Critical $check.Critical -Details @{ UsedPercentage = $usedPercentage; TotalMemoryGB = $totalMemoryGB; FreeMemoryGB = $freeMemoryGB }
                    }
                }
                
                "cpu_usage" {
                    # Obter uso de CPU (média dos últimos 5 segundos)
                    $cpuSamples = @()
                    for ($i = 0; $i -lt 3; $i++) {
                        $cpu = Get-WmiObject -Class Win32_Processor | Measure-Object -Property LoadPercentage -Average
                        $cpuSamples += $cpu.Average
                        if ($i -lt 2) { Start-Sleep -Seconds 2 }
                    }
                    
                    $avgCpuUsage = [math]::Round(($cpuSamples | Measure-Object -Average).Average, 1)
                    
                    if ($avgCpuUsage -gt $check.Threshold) {
                        $status = if ($check.Critical) { "CRITICAL" } else { "WARNING" }
                        Add-CheckResult -Name $check.Name -Type "system" -Status $status -Message "Alto uso de CPU: ${avgCpuUsage}%" -Critical $check.Critical -Details @{ UsagePercentage = $avgCpuUsage }
                    } else {
                        Add-CheckResult -Name $check.Name -Type "system" -Status "HEALTHY" -Message "Uso de CPU OK: ${avgCpuUsage}%" -Critical $check.Critical -Details @{ UsagePercentage = $avgCpuUsage }
                    }
                }
            }
        }
        catch {
            $status = if ($check.Critical) { "CRITICAL" } else { "WARNING" }
            Add-CheckResult -Name $check.Name -Type "system" -Status $status -Message "Erro ao verificar: $($_.Exception.Message)" -Critical $check.Critical
        }
    }
}

# Função para verificar Docker
function Test-DockerHealth {
    if ($Mode -eq "basic") {
        return
    }
    
    Write-HealthLog "Verificando Docker..." "Info"
    
    foreach ($check in $HealthConfig.DockerChecks) {
        if ($Mode -eq "critical-only" -and -not $check.Critical) {
            continue
        }
        
        try {
            switch ($check.Name) {
                "docker_daemon" {
                    try {
                        $dockerVersion = docker version --format "{{.Server.Version}}" 2>$null
                        if ($dockerVersion) {
                            Add-CheckResult -Name $check.Name -Type "docker" -Status "HEALTHY" -Message "Docker daemon rodando (v$dockerVersion)" -Critical $check.Critical -Details @{ Version = $dockerVersion }
                        } else {
                            Add-CheckResult -Name $check.Name -Type "docker" -Status "CRITICAL" -Message "Docker daemon não está rodando" -Critical $check.Critical
                        }
                    }
                    catch {
                        Add-CheckResult -Name $check.Name -Type "docker" -Status "CRITICAL" -Message "Docker daemon inacessível" -Critical $check.Critical
                    }
                }
                
                "docker_containers" {
                    try {
                        Set-Location $ProjectRoot
                        $containers = docker-compose ps --format "table {{.Name}}\t{{.State}}" 2>$null | Select-Object -Skip 1
                        
                        if ($containers) {
                            $runningCount = 0
                            $totalCount = 0
                            $containerDetails = @()
                            
                            foreach ($container in $containers) {
                                if ($container.Trim()) {
                                    $parts = $container -split "\s+"
                                    $name = $parts[0]
                                    $state = $parts[1]
                                    
                                    $containerDetails += @{ Name = $name; State = $state }
                                    $totalCount++
                                    
                                    if ($state -eq "running") {
                                        $runningCount++
                                    }
                                }
                            }
                            
                            if ($runningCount -eq $totalCount) {
                                Add-CheckResult -Name $check.Name -Type "docker" -Status "HEALTHY" -Message "Todos os containers estão rodando ($runningCount/$totalCount)" -Critical $check.Critical -Details @{ Containers = $containerDetails; Running = $runningCount; Total = $totalCount }
                            } elseif ($runningCount -gt 0) {
                                $status = if ($check.Critical) { "WARNING" } else { "WARNING" }
                                Add-CheckResult -Name $check.Name -Type "docker" -Status $status -Message "Alguns containers não estão rodando ($runningCount/$totalCount)" -Critical $check.Critical -Details @{ Containers = $containerDetails; Running = $runningCount; Total = $totalCount }
                            } else {
                                $status = if ($check.Critical) { "CRITICAL" } else { "WARNING" }
                                Add-CheckResult -Name $check.Name -Type "docker" -Status $status -Message "Nenhum container está rodando" -Critical $check.Critical -Details @{ Containers = $containerDetails; Running = $runningCount; Total = $totalCount }
                            }
                        } else {
                            Add-CheckResult -Name $check.Name -Type "docker" -Status "WARNING" -Message "Nenhum container encontrado" -Critical $check.Critical
                        }
                    }
                    catch {
                        $status = if ($check.Critical) { "CRITICAL" } else { "WARNING" }
                        Add-CheckResult -Name $check.Name -Type "docker" -Status $status -Message "Erro ao verificar containers: $($_.Exception.Message)" -Critical $check.Critical
                    }
                }
                
                "docker_volumes" {
                    try {
                        $volumes = docker volume ls --format "{{.Name}}" 2>$null | Where-Object { $_ -like "pgben_*" }
                        
                        if ($volumes) {
                            $volumeCount = ($volumes | Measure-Object).Count
                            Add-CheckResult -Name $check.Name -Type "docker" -Status "HEALTHY" -Message "Volumes Docker OK ($volumeCount volumes)" -Critical $check.Critical -Details @{ Volumes = $volumes; Count = $volumeCount }
                        } else {
                            $status = if ($check.Critical) { "CRITICAL" } else { "WARNING" }
                            Add-CheckResult -Name $check.Name -Type "docker" -Status $status -Message "Nenhum volume Docker encontrado" -Critical $check.Critical
                        }
                    }
                    catch {
                        $status = if ($check.Critical) { "CRITICAL" } else { "WARNING" }
                        Add-CheckResult -Name $check.Name -Type "docker" -Status $status -Message "Erro ao verificar volumes: $($_.Exception.Message)" -Critical $check.Critical
                    }
                }
                
                "docker_networks" {
                    try {
                        $networks = docker network ls --format "{{.Name}}" 2>$null | Where-Object { $_ -like "*pgben*" }
                        
                        if ($networks) {
                            $networkCount = ($networks | Measure-Object).Count
                            Add-CheckResult -Name $check.Name -Type "docker" -Status "HEALTHY" -Message "Redes Docker OK ($networkCount redes)" -Critical $check.Critical -Details @{ Networks = $networks; Count = $networkCount }
                        } else {
                            $status = if ($check.Critical) { "WARNING" } else { "WARNING" }
                            Add-CheckResult -Name $check.Name -Type "docker" -Status $status -Message "Nenhuma rede Docker específica encontrada" -Critical $check.Critical
                        }
                    }
                    catch {
                        $status = if ($check.Critical) { "CRITICAL" } else { "WARNING" }
                        Add-CheckResult -Name $check.Name -Type "docker" -Status $status -Message "Erro ao verificar redes: $($_.Exception.Message)" -Critical $check.Critical
                    }
                }
            }
        }
        catch {
            $status = if ($check.Critical) { "CRITICAL" } else { "WARNING" }
            Add-CheckResult -Name $check.Name -Type "docker" -Status $status -Message "Erro inesperado: $($_.Exception.Message)" -Critical $check.Critical
        }
    }
}

# Função para enviar alerta
function Send-Alert {
    param([hashtable]$Report)
    
    if (-not $AlertWebhook -or $OverallStatus -eq "HEALTHY") {
        return
    }
    
    try {
        $alertData = @{
            timestamp = $Timestamp
            status = $OverallStatus
            system = "PGBEN-SEMTAS"
            environment = "production"
            summary = "Sistema $OverallStatus - $($CheckResults.Count) verificações realizadas"
            details = $Report
        }
        
        $json = $alertData | ConvertTo-Json -Depth 10
        
        Invoke-RestMethod -Uri $AlertWebhook -Method Post -Body $json -ContentType "application/json" -TimeoutSec 10
        
        Write-HealthLog "Alerta enviado para webhook" "Info"
    }
    catch {
        Write-HealthLog "Erro ao enviar alerta: $($_.Exception.Message)" "Warning"
    }
}

# Função para formatar saída
function Format-Output {
    param([hashtable]$Report)
    
    switch ($Format) {
        "json" {
            $output = $Report | ConvertTo-Json -Depth 10
            
            if ($OutputFile) {
                $output | Out-File -FilePath $OutputFile -Encoding UTF8
                Write-HealthLog "Relatório JSON salvo: $OutputFile" "Info"
            } else {
                Write-Output $output
            }
        }
        
        "prometheus" {
            $output = @()
            
            # Métrica geral
            $healthValue = switch ($OverallStatus) {
                "HEALTHY" { 1 }
                "WARNING" { 0.5 }
                "CRITICAL" { 0 }
                default { 0 }
            }
            
            $output += "# HELP pgben_system_health Overall system health status"
            $output += "# TYPE pgben_system_health gauge"
            $output += "pgben_system_health{status=\"$OverallStatus\"} $healthValue"
            $output += ""
            
            # Métricas por serviço
            $output += "# HELP pgben_service_health Individual service health status"
            $output += "# TYPE pgben_service_health gauge"
            
            foreach ($result in $CheckResults) {
                $value = switch ($result.Status) {
                    "HEALTHY" { 1 }
                    "WARNING" { 0.5 }
                    "CRITICAL" { 0 }
                    default { 0 }
                }
                
                $labels = "name=\"$($result.Name)\",type=\"$($result.Type)\",status=\"$($result.Status)\""
                $output += "pgben_service_health{$labels} $value"
                
                if ($result.ResponseTime -gt 0) {
                    $output += "pgben_service_response_time_ms{name=\"$($result.Name)\"} $($result.ResponseTime)"
                }
            }
            
            $outputText = $output -join "`n"
            
            if ($OutputFile) {
                $outputText | Out-File -FilePath $OutputFile -Encoding UTF8
                Write-HealthLog "Métricas Prometheus salvas: $OutputFile" "Info"
            } else {
                Write-Output $outputText
            }
        }
        
        "console" {
            if (-not $Quiet) {
                Write-Host ""
                Write-Host "======================================" -ForegroundColor Cyan
                Write-Host "  Relatório de Saúde - PGBEN" -ForegroundColor Cyan
                Write-Host "======================================" -ForegroundColor Cyan
                Write-Host "Status Geral: $OverallStatus" -ForegroundColor $(switch ($OverallStatus) { "HEALTHY" { "Green" }; "WARNING" { "Yellow" }; "CRITICAL" { "Red" }; default { "Gray" } })
                Write-Host "Timestamp: $Timestamp"
                Write-Host "Verificações: $($CheckResults.Count)"
                Write-Host ""
                
                # Agrupar por tipo
                $groupedResults = $CheckResults | Group-Object Type
                
                foreach ($group in $groupedResults) {
                    Write-Host "$($group.Name.ToUpper()):" -ForegroundColor White
                    
                    foreach ($result in $group.Group) {
                        $statusIcon = switch ($result.Status) {
                            "HEALTHY" { "✅" }
                            "WARNING" { "⚠️" }
                            "CRITICAL" { "❌" }
                            default { "❓" }
                        }
                        
                        $criticalText = if ($result.Critical) { " [CRITICAL]" } else { "" }
                        $responseText = if ($result.ResponseTime -gt 0) { " (${result.ResponseTime}ms)" } else { "" }
                        
                        Write-Host "  $statusIcon $($result.Name): $($result.Message)$criticalText$responseText"
                    }
                    
                    Write-Host ""
                }
            }
            
            if ($OutputFile) {
                $Report | ConvertTo-Json -Depth 10 | Out-File -FilePath $OutputFile -Encoding UTF8
                Write-HealthLog "Relatório detalhado salvo: $OutputFile" "Info"
            }
        }
    }
}

# Função principal
function Main {
    try {
        if (-not $Quiet) {
            Write-Host "🔍 Iniciando verificação de saúde do sistema..." -ForegroundColor Cyan
            Write-Host ""
        }
        
        # Executar verificações
        Test-Services
        Test-SystemHealth
        Test-DockerHealth
        
        # Gerar relatório
        $report = @{
            timestamp = $Timestamp
            overall_status = $OverallStatus
            mode = $Mode
            summary = @{
                total_checks = $CheckResults.Count
                healthy = ($CheckResults | Where-Object { $_.Status -eq "HEALTHY" }).Count
                warning = ($CheckResults | Where-Object { $_.Status -eq "WARNING" }).Count
                critical = ($CheckResults | Where-Object { $_.Status -eq "CRITICAL" }).Count
                unknown = ($CheckResults | Where-Object { $_.Status -eq "UNKNOWN" }).Count
            }
            checks = $CheckResults
            system_info = @{
                hostname = $env:COMPUTERNAME
                os = $env:OS
                powershell_version = $PSVersionTable.PSVersion.ToString()
            }
        }
        
        # Formatar e exibir saída
        Format-Output -Report $report
        
        # Enviar alerta se necessário
        Send-Alert -Report $report
        
        # Determinar código de saída
        if ($ExitOnFailure) {
            switch ($OverallStatus) {
                "HEALTHY" { exit 0 }
                "WARNING" { exit 1 }
                "CRITICAL" { exit 2 }
                default { exit 3 }
            }
        } else {
            exit 0
        }
    }
    catch {
        Write-HealthLog "Erro durante verificação de saúde: $($_.Exception.Message)" "Error"
        
        if ($ExitOnFailure) {
            exit 4
        } else {
            exit 0
        }
    }
}

# Executar função principal
Main