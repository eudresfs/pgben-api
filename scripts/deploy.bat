@echo off
REM Script para deploy do PGBen com monitoramento
REM Autor: Equipe PGBen
REM Data: 14/05/2025

setlocal enabledelayedexpansion

REM Cores para output (Windows não suporta ANSI nativo, mas usamos para compatibilidade com terminais modernos)
set GREEN=[32m
set YELLOW=[33m
set RED=[31m
set NC=[0m

REM Função para exibir mensagens
:log
echo %GREEN%[INFO]%NC% %~1
goto :eof

:warn
echo %YELLOW%[AVISO]%NC% %~1
goto :eof

:error
echo %RED%[ERRO]%NC% %~1
goto :eof

REM Verificar se o Docker está instalado
docker --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    call :error "Docker não encontrado. Por favor, instale o Docker antes de continuar."
    exit /b 1
)

REM Verificar se o Docker Compose está instalado
docker-compose --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    call :error "Docker Compose não encontrado. Por favor, instale o Docker Compose antes de continuar."
    exit /b 1
)

REM Verificar se o arquivo .env existe
if not exist .env (
    call :warn "Arquivo .env não encontrado. Criando arquivo .env padrão..."
    (
        echo # Configurações do banco de dados
        echo DB_USER=postgres
        echo DB_PASS=postgres
        echo DB_NAME=pgben_db
        echo DB_HOST=postgres
        echo DB_PORT=5432
        echo.
        echo # Configurações do Redis
        echo REDIS_HOST=redis
        echo REDIS_PORT=6379
        echo.
        echo # Configurações do MinIO
        echo MINIO_ACCESS_KEY=minioadmin
        echo MINIO_SECRET_KEY=minioadmin
        echo.
        echo # Configurações de segurança
        echo JWT_SECRET=default_jwt_secret_for_dev_only
        echo ENCRYPTION_KEY=default_key_32chars_for_dev_only_
        echo.
        echo # Configurações do Grafana
        echo GRAFANA_ADMIN_USER=admin
        echo GRAFANA_ADMIN_PASSWORD=admin
    ) > .env
    call :log "Arquivo .env criado com valores padrão."
)

REM Função para iniciar a aplicação
:start_app
call :log "Iniciando a aplicação PGBen..."
docker-compose up -d
if %ERRORLEVEL% equ 0 (
    call :log "Aplicação PGBen iniciada com sucesso!"
) else (
    call :error "Falha ao iniciar a aplicação PGBen."
    exit /b 1
)
goto :eof

REM Função para iniciar o monitoramento
:start_monitoring
call :log "Iniciando o sistema de monitoramento..."
docker-compose -f docs/monitoramento/docker-compose.monitoring.yml up -d
if %ERRORLEVEL% equ 0 (
    call :log "Sistema de monitoramento iniciado com sucesso!"
) else (
    call :error "Falha ao iniciar o sistema de monitoramento."
    exit /b 1
)
goto :eof

REM Função para parar todos os serviços
:stop_all
call :log "Parando todos os serviços..."
docker-compose -f docs/monitoramento/docker-compose.monitoring.yml down
docker-compose down
if %ERRORLEVEL% equ 0 (
    call :log "Todos os serviços foram parados com sucesso!"
) else (
    call :error "Falha ao parar alguns serviços."
    exit /b 1
)
goto :eof

REM Função para mostrar o status dos serviços
:show_status
call :log "Status dos serviços PGBen:"
docker-compose ps
call :log "Status dos serviços de monitoramento:"
docker-compose -f docs/monitoramento/docker-compose.monitoring.yml ps
goto :eof

REM Função para mostrar os logs
:show_logs
if "%~1"=="" (
    call :error "Especifique o serviço para visualizar os logs. Use: deploy.bat logs <nome-do-serviço>"
    exit /b 1
)
REM Verificar se o serviço está no docker-compose principal
docker-compose ps | findstr "%~1" >nul
if %ERRORLEVEL% equ 0 (
    call :log "Exibindo logs do serviço %~1..."
    docker-compose logs -f "%~1"
    goto :eof
)
REM Verificar se o serviço está no docker-compose de monitoramento
docker-compose -f docs/monitoramento/docker-compose.monitoring.yml ps | findstr "%~1" >nul
if %ERRORLEVEL% equ 0 (
    call :log "Exibindo logs do serviço de monitoramento %~1..."
    docker-compose -f docs/monitoramento/docker-compose.monitoring.yml logs -f "%~1"
    goto :eof
)
call :error "Serviço %~1 não encontrado."
exit /b 1

REM Função para exibir informações de acesso
:show_access_info
call :log "Informações de acesso ao PGBen:"
echo API PGBen: %GREEN%http://localhost:3000%NC%
echo Interface MinIO: %GREEN%http://localhost:9001%NC%
echo Interface MailHog: %GREEN%http://localhost:8025%NC%
echo.
call :log "Informações de acesso ao monitoramento:"
echo Prometheus: %GREEN%http://localhost:9090%NC%
echo Grafana: %GREEN%http://localhost:3001%NC% (usuário: %YELLOW%admin%NC%, senha: %YELLOW%admin%NC%)
echo Alertmanager: %GREEN%http://localhost:9093%NC%
goto :eof

REM Função para mostrar ajuda
:show_help
echo Uso: deploy.bat [comando]
echo.
echo Comandos disponíveis:
echo   start       - Inicia a aplicação PGBen
echo   monitoring  - Inicia o sistema de monitoramento
echo   all         - Inicia a aplicação e o monitoramento
echo   stop        - Para todos os serviços
echo   status      - Mostra o status dos serviços
echo   logs [svc]  - Mostra os logs de um serviço específico
echo   info        - Mostra informações de acesso
echo   help        - Mostra esta ajuda
goto :eof

REM Processar comandos
if "%1"=="start" (
    call :start_app
    call :show_access_info
) else if "%1"=="monitoring" (
    call :start_monitoring
    call :show_access_info
) else if "%1"=="all" (
    call :start_app
    call :start_monitoring
    call :show_access_info
) else if "%1"=="stop" (
    call :stop_all
) else if "%1"=="status" (
    call :show_status
) else if "%1"=="logs" (
    call :show_logs "%2"
) else if "%1"=="info" (
    call :show_access_info
) else (
    call :show_help
)

exit /b 0
