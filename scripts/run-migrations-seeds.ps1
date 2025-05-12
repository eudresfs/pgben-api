# Script para execução de migrations e seeds no projeto PGBEN
# Autor: Equipe de Desenvolvimento PGBEN
# Data: Criado em $(Get-Date -Format "dd/MM/yyyy")

# Definição de cores para melhor visualização
$colorInfo = "Cyan"
$colorSuccess = "Green"
$colorWarning = "Yellow"
$colorError = "Red"

# Função para exibir mensagens formatadas
function Write-FormattedMessage {
    param (
        [string]$Message,
        [string]$Color,
        [switch]$NoNewLine
    )
    
    if ($NoNewLine) {
        Write-Host $Message -ForegroundColor $Color -NoNewline
    } else {
        Write-Host $Message -ForegroundColor $Color
    }
}

# Função para verificar se o PostgreSQL está em execução
function Test-PostgresConnection {
    param (
        [string]$Host = "localhost",
        [int]$Port = 5432,
        [string]$Username = "postgres",
        [string]$Password = "postgres",
        [string]$Database = "pgben"
    )

    try {
        # Tenta conectar ao PostgreSQL usando psql
        $env:PGPASSWORD = $Password
        $result = & psql -h $Host -p $Port -U $Username -d $Database -c "SELECT 1;" 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            return $true
        } else {
            return $false
        }
    } catch {
        return $false
    } finally {
        # Limpa a variável de ambiente
        $env:PGPASSWORD = ""
    }
}

# Função para realizar backup do banco de dados
function Backup-Database {
    param (
        [string]$Host = "localhost",
        [int]$Port = 5432,
        [string]$Username = "postgres",
        [string]$Password = "postgres",
        [string]$Database = "pgben",
        [string]$Suffix = "pre_migration"
    )

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupFile = "backup_${Suffix}_${timestamp}.sql"
    
    Write-FormattedMessage "Realizando backup do banco de dados para $backupFile..." $colorInfo
    
    try {
        $env:PGPASSWORD = $Password
        & pg_dump -h $Host -p $Port -U $Username -d $Database -f $backupFile
        
        if ($LASTEXITCODE -eq 0) {
            Write-FormattedMessage "Backup realizado com sucesso!" $colorSuccess
            return $true
        } else {
            Write-FormattedMessage "Falha ao realizar backup!" $colorError
            return $false
        }
    } catch {
        Write-FormattedMessage "Erro ao executar backup: $_" $colorError
        return $false
    } finally {
        # Limpa a variável de ambiente
        $env:PGPASSWORD = ""
    }
}

# Função principal
function Main {
    Clear-Host
    Write-FormattedMessage "===== PGBEN - Execução de Migrations e Seeds =====" $colorInfo
    Write-FormattedMessage "" $colorInfo

    # Verifica se está no diretório correto (raiz do projeto)
    if (-not (Test-Path "package.json")) {
        Write-FormattedMessage "Erro: Este script deve ser executado na raiz do projeto!" $colorError
        Write-FormattedMessage "Por favor, navegue até o diretório raiz do projeto e tente novamente." $colorError
        return
    }

    # Verifica se o arquivo .env existe
    if (-not (Test-Path ".env")) {
        Write-FormattedMessage "Aviso: Arquivo .env não encontrado. Será utilizada a configuração padrão." $colorWarning
    } else {
        Write-FormattedMessage "Arquivo .env encontrado." $colorSuccess
    }

    # Verifica conexão com o PostgreSQL
    Write-FormattedMessage "Verificando conexão com o PostgreSQL..." $colorInfo -NoNewLine
    if (Test-PostgresConnection) {
        Write-FormattedMessage " OK!" $colorSuccess
    } else {
        Write-FormattedMessage " FALHA!" $colorError
        Write-FormattedMessage "Não foi possível conectar ao PostgreSQL. Verifique se o serviço está em execução e se as credenciais estão corretas." $colorError
        return
    }

    # Menu de opções
    do {
        Write-FormattedMessage "\nEscolha uma opção:" $colorInfo
        Write-FormattedMessage "1. Verificar status das migrations" $colorInfo
        Write-FormattedMessage "2. Executar migrations pendentes" $colorInfo
        Write-FormattedMessage "3. Reverter última migration" $colorInfo
        Write-FormattedMessage "4. Executar seeds iniciais" $colorInfo
        Write-FormattedMessage "5. Executar todos os seeds" $colorInfo
        Write-FormattedMessage "6. Configuração completa (migrations + seeds iniciais)" $colorInfo
        Write-FormattedMessage "7. Reset completo do banco de dados" $colorInfo
        Write-FormattedMessage "8. Realizar backup do banco de dados" $colorInfo
        Write-FormattedMessage "0. Sair" $colorInfo
        Write-FormattedMessage "\nOpção: " $colorInfo -NoNewLine
        
        $option = Read-Host
        
        switch ($option) {
            "1" {
                Write-FormattedMessage "\nVerificando status das migrations..." $colorInfo
                npm run migration:show
            }
            "2" {
                Write-FormattedMessage "\nExecutando migrations pendentes..." $colorInfo
                $confirmBackup = Read-Host "Deseja realizar backup antes de executar as migrations? (S/N)"
                if ($confirmBackup -eq "S" -or $confirmBackup -eq "s") {
                    Backup-Database -Suffix "pre_migration"
                }
                npm run migration:run
            }
            "3" {
                Write-FormattedMessage "\nRevertendo última migration..." $colorInfo
                $confirmBackup = Read-Host "Deseja realizar backup antes de reverter a migration? (S/N)"
                if ($confirmBackup -eq "S" -or $confirmBackup -eq "s") {
                    Backup-Database -Suffix "pre_revert"
                }
                npm run migration:revert
            }
            "4" {
                Write-FormattedMessage "\nExecutando seeds iniciais..." $colorInfo
                npm run seed:run:initial
            }
            "5" {
                Write-FormattedMessage "\nExecutando todos os seeds..." $colorInfo
                npm run seed:run
            }
            "6" {
                Write-FormattedMessage "\nRealizando configuração completa (migrations + seeds iniciais)..." $colorInfo
                $confirmBackup = Read-Host "Deseja realizar backup antes de executar a configuração? (S/N)"
                if ($confirmBackup -eq "S" -or $confirmBackup -eq "s") {
                    Backup-Database -Suffix "pre_setup"
                }
                npm run db:setup
            }
            "7" {
                Write-FormattedMessage "\nATENÇÃO: Esta operação irá apagar todos os dados do banco!" $colorWarning
                $confirm = Read-Host "Tem certeza que deseja continuar? (S/N)"
                
                if ($confirm -eq "S" -or $confirm -eq "s") {
                    $confirmBackup = Read-Host "Deseja realizar backup antes do reset? (S/N)"
                    if ($confirmBackup -eq "S" -or $confirmBackup -eq "s") {
                        Backup-Database -Suffix "pre_reset"
                    }
                    
                    Write-FormattedMessage "Realizando reset completo do banco de dados..." $colorInfo
                    npm run db:reset
                } else {
                    Write-FormattedMessage "Operação cancelada pelo usuário." $colorInfo
                }
            }
            "8" {
                Write-FormattedMessage "\nRealizando backup do banco de dados..." $colorInfo
                Backup-Database -Suffix "manual"
            }
            "0" {
                Write-FormattedMessage "\nSaindo..." $colorInfo
            }
            default {
                Write-FormattedMessage "\nOpção inválida!" $colorError
            }
        }
    } while ($option -ne "0")
}

# Executa a função principal
Main