@echo off
REM Script para testar o deploy do PGBen com monitoramento
REM Autor: Equipe PGBen
REM Data: 14/05/2025

echo ======================================================
echo  TESTE DE DEPLOY DO PGBEN COM MONITORAMENTO
echo ======================================================
echo.

echo [PASSO 1] Iniciando a aplicação e o sistema de monitoramento...
call deploy.bat all
if %ERRORLEVEL% neq 0 (
    echo [ERRO] Falha ao iniciar os serviços.
    exit /b 1
)

echo.
echo [PASSO 2] Aguardando 30 segundos para que todos os serviços estejam prontos...
timeout /t 30 /nobreak > nul

echo.
echo [PASSO 3] Verificando se os serviços estão em execução...
call deploy.bat status
if %ERRORLEVEL% neq 0 (
    echo [ERRO] Falha ao verificar o status dos serviços.
    exit /b 1
)

echo.
echo [PASSO 4] Testando o endpoint de saúde da API...
curl -s http://localhost:3000/api/v1/metricas/health
if %ERRORLEVEL% neq 0 (
    echo [ERRO] Falha ao acessar o endpoint de saúde da API.
    exit /b 1
)

echo.
echo [PASSO 5] Testando o endpoint de métricas da API...
curl -s http://localhost:3000/api/v1/metricas
if %ERRORLEVEL% neq 0 (
    echo [ERRO] Falha ao acessar o endpoint de métricas da API.
    exit /b 1
)

echo.
echo [PASSO 6] Verificando se o Prometheus está acessível...
curl -s http://localhost:9090/-/healthy
if %ERRORLEVEL% neq 0 (
    echo [ERRO] Falha ao acessar o Prometheus.
    exit /b 1
)

echo.
echo [PASSO 7] Verificando se o Grafana está acessível...
curl -s http://localhost:3001/api/health
if %ERRORLEVEL% neq 0 (
    echo [ERRO] Falha ao acessar o Grafana.
    exit /b 1
)

echo.
echo [PASSO 8] Mostrando informações de acesso...
call deploy.bat info

echo.
echo ======================================================
echo  TESTE DE DEPLOY CONCLUÍDO COM SUCESSO!
echo ======================================================
echo.
echo Você pode acessar os seguintes serviços:
echo.
echo API PGBen: http://localhost:3000
echo Documentação da API: http://localhost:3000/api-docs
echo Interface MinIO: http://localhost:9001
echo Interface MailHog: http://localhost:8025
echo.
echo Monitoramento:
echo Prometheus: http://localhost:9090
echo Grafana: http://localhost:3001 (usuário: admin, senha: admin)
echo Alertmanager: http://localhost:9093
echo.
echo Para parar todos os serviços, execute: deploy.bat stop
echo.

exit /b 0
