# Script PowerShell para auxiliar na consolidação de migrations
# Este script automatiza o processo de preparação e implementação da consolidação de migrations

# Configurações
$projectRoot = "$PSScriptRoot\.."
$migrationsDir = "$projectRoot\src\database\migrations"
$consolidatedDir = "$projectRoot\src\database\migrations-consolidadas"
$backupDir = "$projectRoot\src\database\migrations-backup"
$examplesDir = "$projectRoot\docs\Exemplos"

# Função para exibir mensagens coloridas
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    else {
        $input | Write-Output
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

# Função para criar diretórios se não existirem
function Ensure-Directory($path) {
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Path $path | Out-Null
        Write-ColorOutput Green "Diretório criado: $path"
    }
}

# Função para fazer backup das migrations existentes
function Backup-Migrations() {
    Write-ColorOutput Cyan "\n=== Realizando backup das migrations existentes ==="
    Ensure-Directory $backupDir
    
    Get-ChildItem -Path $migrationsDir -Filter "*.ts" | ForEach-Object {
        Copy-Item $_.FullName -Destination $backupDir
        Write-ColorOutput Green "Backup realizado: $($_.Name)"
    }
    
    Write-ColorOutput Cyan "Backup concluído. Arquivos salvos em: $backupDir"
}

# Função para preparar o ambiente de consolidação
function Prepare-Environment() {
    Write-ColorOutput Cyan "\n=== Preparando ambiente para consolidação ==="
    
    # Criar diretórios necessários
    Ensure-Directory $consolidatedDir
    
    # Verificar exemplos de migrations consolidadas
    if (Test-Path $examplesDir) {
        Write-ColorOutput Green "Exemplos de migrations consolidadas encontrados em: $examplesDir"
    } else {
        Write-ColorOutput Yellow "Aviso: Diretório de exemplos não encontrado. Verifique a documentação."
    }
    
    Write-ColorOutput Cyan "Ambiente preparado com sucesso."
}

# Função para copiar exemplos de migrations consolidadas
function Copy-ConsolidatedExamples() {
    Write-ColorOutput Cyan "\n=== Copiando exemplos de migrations consolidadas ==="
    
    if (Test-Path $examplesDir) {
        Get-ChildItem -Path $examplesDir -Filter "*-Consolidado.ts" | ForEach-Object {
            $newFileName = $_.Name -replace "-Consolidado", ""
            Copy-Item $_.FullName -Destination "$consolidatedDir\$newFileName"
            Write-ColorOutput Green "Copiado: $($_.Name) -> $newFileName"
        }
        Write-ColorOutput Cyan "Exemplos copiados com sucesso."
    } else {
        Write-ColorOutput Red "Erro: Diretório de exemplos não encontrado."
    }
}

# Função para executar o script de consolidação de migrations
function Run-ConsolidationScript() {
    Write-ColorOutput Cyan "\n=== Executando script de consolidação de migrations ==="
    
    $scriptPath = "$projectRoot\scripts\consolidate-migrations.js"
    
    if (Test-Path $scriptPath) {
        Write-ColorOutput Yellow "Executando: node $scriptPath $migrationsDir $consolidatedDir\ConsolidatedMigration.ts"
        node $scriptPath $migrationsDir "$consolidatedDir\ConsolidatedMigration.ts"
        Write-ColorOutput Green "Script de consolidação executado com sucesso."
    } else {
        Write-ColorOutput Red "Erro: Script de consolidação não encontrado em: $scriptPath"
    }
}

# Função para validar as migrations consolidadas
function Validate-ConsolidatedMigrations() {
    Write-ColorOutput Cyan "\n=== Validando migrations consolidadas ==="
    
    # Verificar se as migrations consolidadas existem
    $migrationCount = (Get-ChildItem -Path $consolidatedDir -Filter "*.ts" | Measure-Object).Count
    
    if ($migrationCount -gt 0) {
        Write-ColorOutput Green "$migrationCount migrations consolidadas encontradas."
        
        # Listar as migrations consolidadas
        Get-ChildItem -Path $consolidatedDir -Filter "*.ts" | ForEach-Object {
            Write-ColorOutput Green "  - $($_.Name)"
        }
        
        Write-ColorOutput Yellow "\nPróximos passos:"
        Write-ColorOutput Yellow "1. Revise as migrations consolidadas"
        Write-ColorOutput Yellow "2. Execute os testes em ambiente de desenvolvimento"
        Write-ColorOutput Yellow "3. Siga o guia de implementação para aplicar as migrations"
    } else {
        Write-ColorOutput Red "Erro: Nenhuma migration consolidada encontrada em: $consolidatedDir"
    }
}

# Menu principal
function Show-Menu() {
    Write-ColorOutput Cyan "\n=== Consolidação de Migrations - Sistema SEMTAS ==="
    Write-ColorOutput Cyan "Selecione uma opção:"
    Write-ColorOutput Cyan "1. Realizar backup das migrations existentes"
    Write-ColorOutput Cyan "2. Preparar ambiente para consolidação"
    Write-ColorOutput Cyan "3. Copiar exemplos de migrations consolidadas"
    Write-ColorOutput Cyan "4. Executar script de consolidação"
    Write-ColorOutput Cyan "5. Validar migrations consolidadas"
    Write-ColorOutput Cyan "6. Executar todo o processo"
    Write-ColorOutput Cyan "0. Sair"
    
    $option = Read-Host "Opção"
    
    switch ($option) {
        "1" { Backup-Migrations; Show-Menu }
        "2" { Prepare-Environment; Show-Menu }
        "3" { Copy-ConsolidatedExamples; Show-Menu }
        "4" { Run-ConsolidationScript; Show-Menu }
        "5" { Validate-ConsolidatedMigrations; Show-Menu }
        "6" { 
            Backup-Migrations
            Prepare-Environment
            Copy-ConsolidatedExamples
            Run-ConsolidationScript
            Validate-ConsolidatedMigrations
            Show-Menu 
        }
        "0" { return }
        default { Write-ColorOutput Red "Opção inválida"; Show-Menu }
    }
}

# Iniciar o script
Show-Menu