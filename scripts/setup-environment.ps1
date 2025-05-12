# Script de inicialização do ambiente de desenvolvimento SEMTAS

# Configurar codificação para UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

# Verificar se o Docker está em execução
$dockerRunning = $false
try {
    $dockerStatus = docker ps 2>&1
    if ($LASTEXITCODE -eq 0) {
        $dockerRunning = $true
        Write-Host "Docker está em execução" -ForegroundColor Green
    }
} catch {
    $dockerRunning = $false
}

if (-not $dockerRunning) {
    Write-Host "Docker não está em execução. Por favor, inicie o Docker Desktop antes de continuar." -ForegroundColor Red
    Write-Host "Após iniciar o Docker Desktop, execute este script novamente." -ForegroundColor Yellow
    exit 1
}

# Iniciar os containers Docker
Write-Host "Iniciando containers Docker..." -ForegroundColor Cyan
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "Falha ao iniciar os containers Docker. Verifique o erro acima." -ForegroundColor Red
    exit 1
}

Write-Host "Containers Docker iniciados com sucesso" -ForegroundColor Green

# Verificar se os containers estão em execução
Write-Host "Verificando status dos containers..." -ForegroundColor Cyan
docker ps

# Criar diretórios para os módulos
Write-Host "Criando estrutura de diretórios para os módulos..." -ForegroundColor Cyan

$modulesPath = "src\modules"
if (-not (Test-Path $modulesPath)) {
    New-Item -ItemType Directory -Path $modulesPath -Force | Out-Null
}

$modules = @(
    "unidade",
    "cidadao",
    "beneficio",
    "solicitacao",
    "documentos",
    "relatorios",
    "notificacao"
)

$subDirs = @(
    "dto",
    "entities",
    "controllers",
    "services",
    "repositories"
)

foreach ($module in $modules) {
    $modulePath = "$modulesPath\$module"
    if (-not (Test-Path $modulePath)) {
        New-Item -ItemType Directory -Path $modulePath -Force | Out-Null
        Write-Host "Criado diretório: $modulePath" -ForegroundColor Gray
        
        foreach ($subDir in $subDirs) {
            $subDirPath = "$modulePath\$subDir"
            New-Item -ItemType Directory -Path $subDirPath -Force | Out-Null
            Write-Host "Criado subdiretório: $subDirPath" -ForegroundColor Gray
        }
    }
}

Write-Host "Estrutura de diretórios criada com sucesso" -ForegroundColor Green

# Verificar acesso ao PostgreSQL
Write-Host "Verificando acesso ao PostgreSQL..." -ForegroundColor Cyan
Write-Host "Para verificar manualmente, execute:" -ForegroundColor Gray
Write-Host "psql -h localhost -U postgres -d semtas_beneficios" -ForegroundColor Gray
Write-Host "Senha: postgres" -ForegroundColor Gray

# Verificar acesso ao MinIO
Write-Host "Verificando acesso ao MinIO..." -ForegroundColor Cyan
Write-Host "Acesse a interface web do MinIO: http://localhost:9001" -ForegroundColor Gray
Write-Host "Usuário: minioadmin" -ForegroundColor Gray
Write-Host "Senha: minioadmin" -ForegroundColor Gray

# Verificar acesso ao MailHog
Write-Host "Verificando acesso ao MailHog..." -ForegroundColor Cyan
Write-Host "Acesse a interface web do MailHog: http://localhost:8025" -ForegroundColor Gray

# Próximos passos
Write-Host "Próximos passos:" -ForegroundColor Magenta
Write-Host "1. Copie os arquivos necessários do starter kit para o projeto principal" -ForegroundColor White
Write-Host "2. Adapte o modelo de usuário para incluir os campos específicos da SEMTAS" -ForegroundColor White
Write-Host "3. Crie as entidades TypeORM conforme a estrutura definida" -ForegroundColor White
Write-Host "4. Crie e execute as migrations iniciais" -ForegroundColor White
Write-Host "5. Implemente as configurações de segurança" -ForegroundColor White
Write-Host "6. Inicie o desenvolvimento dos módulos prioritários" -ForegroundColor White

Write-Host "Consulte a documentação em docs/proximos-passos.md para mais detalhes" -ForegroundColor Yellow