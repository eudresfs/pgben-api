# 🚀 Deploy PGBEN Server via Portainer

Este guia fornece instruções completas para fazer o deploy do PGBEN Server usando Portainer, incluindo configuração, teste local e deploy em produção.

## 📋 Pré-requisitos

### Software Necessário
- **Docker Desktop** (Windows/Mac) ou **Docker Engine** (Linux)
- **Docker Compose** (incluído no Docker Desktop)
- **Portainer** instalado e configurado
- **PowerShell** (Windows) ou **Bash** (Linux/Mac)
- **Git** para clonar o repositório

### Recursos Mínimos Recomendados
- **CPU**: 2 cores
- **RAM**: 4GB
- **Disco**: 20GB livres
- **Rede**: Portas 80, 443, 3000, 5432, 6379, 9000, 9001, 8025 disponíveis

## 🛠️ Configuração Inicial

### 1. Preparar o Ambiente

```powershell
# Clone o repositório (se ainda não fez)
git clone <repository-url>
cd pgben-server

# Execute o script de configuração
.\scripts\setup-portainer.ps1
```

### 2. Configurar Variáveis de Ambiente

```powershell
# Copie o arquivo de exemplo
copy .env.portainer .env.local

# Edite o arquivo com suas configurações
notepad .env.local
```

**⚠️ IMPORTANTE**: Altere TODAS as senhas e chaves secretas antes de usar em produção!

### 3. Gerar Chaves JWT (se necessário)

```powershell
# Usando OpenSSL (recomendado)
openssl genrsa -out keys/private.key 2048
openssl rsa -in keys/private.key -pubout -out keys/public.key

# OU usando Node.js
node scripts/gerar-chaves-jwt.js
```

## 🧪 Teste Local

Antes de fazer o deploy no Portainer, teste localmente:

### 1. Build e Start dos Serviços

```powershell
# Build da imagem
docker-compose -f docker-compose.portainer.yml build

# Iniciar todos os serviços
docker-compose -f docker-compose.portainer.yml --env-file .env.portainer up -d

# Verificar status dos containers
docker-compose -f docker-compose.portainer.yml ps
```

### 2. Verificar Health Checks

```powershell
# Verificar logs da aplicação
docker-compose -f docker-compose.portainer.yml logs -f pgben-server

# Verificar health checks
docker-compose -f docker-compose.portainer.yml ps

# Testar endpoints
curl http://localhost:3000/api/v1/health
curl http://localhost:3000/api/docs
```

### 3. Testar Funcionalidades

- **API**: http://localhost:3000
- **Swagger**: http://localhost:3000/api/docs
- **MinIO Console**: http://localhost:9001
- **MailHog**: http://localhost:8025
- **Health Check**: http://localhost:3000/api/v1/health

### 4. Parar Serviços Locais

```powershell
# Parar e remover containers
docker-compose -f docker-compose.portainer.yml down

# Remover volumes (CUIDADO: apaga dados!)
docker-compose -f docker-compose.portainer.yml down -v
```

## 🐳 Deploy via Portainer

### 1. Preparar Arquivos para Portainer

1. **Copie os arquivos necessários** para o servidor onde o Portainer está rodando:
   - `docker-compose.portainer.yml`
   - `.env.portainer` (renomeie para `.env`)
   - Pasta `keys/` com as chaves JWT
   - Pasta `config/` com configurações

### 2. Criar Stack no Portainer

1. **Acesse o Portainer** via navegador
2. **Navegue para Stacks** → **Add Stack**
3. **Configure o Stack**:
   - **Name**: `pgben-server`
   - **Build method**: `Upload`
   - **Upload**: `docker-compose.portainer.yml`

### 3. Configurar Variáveis de Ambiente

Na seção **Environment variables**, adicione:

```env
# Configurações básicas
COMPOSE_PROJECT_NAME=pgben-portainer
NODE_ENV=production
TZ=America/Sao_Paulo

# Database
DB_HOST=postgres
DB_PORT=5432
DB_USER=pgben_user
DB_PASS=SUA_SENHA_SEGURA_AQUI
DB_NAME=pgben_prod

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=SUA_SENHA_REDIS_AQUI

# MinIO
MINIO_ACCESS_KEY=SUA_CHAVE_MINIO_AQUI
MINIO_SECRET_KEY=SUA_SENHA_MINIO_AQUI

# Security (ALTERE ESTAS CHAVES!)
ENCRYPTION_KEY=sua_chave_256_bits_em_hex_aqui
AUDIT_SIGNING_KEY=sua_chave_auditoria_aqui
COOKIE_SECRET=seu_cookie_secret_aqui
SESSION_SECRET=seu_session_secret_aqui
CSRF_SECRET=seu_csrf_secret_aqui
```

### 4. Deploy do Stack

1. **Clique em "Deploy the stack"**
2. **Aguarde o deploy** (pode levar alguns minutos)
3. **Verifique os logs** de cada serviço
4. **Teste os endpoints** da aplicação

### 5. Verificar Deploy

```bash
# Via Portainer UI
# Vá para Containers e verifique o status de cada serviço

# Via linha de comando (se tiver acesso SSH)
docker ps
docker logs pgben-server
curl http://localhost:3000/api/v1/health
```

## 📊 Monitoramento

### Health Checks Configurados

- **pgben-server**: `GET /api/v1/health`
- **postgres**: `pg_isready`
- **redis**: `redis-cli ping`
- **minio**: `GET /minio/health/live`
- **mailhog**: `GET /` (web interface)

### Logs

```bash
# Ver logs em tempo real
docker logs -f pgben-server
docker logs -f pgben-postgres
docker logs -f pgben-redis
docker logs -f pgben-minio
```

### Métricas

Os logs são configurados com rotação automática:
- **Tamanho máximo**: 10MB por arquivo
- **Arquivos mantidos**: 5
- **Compressão**: Habilitada

## 🔧 Troubleshooting

### Problemas Comuns

#### 1. Container não inicia
```bash
# Verificar logs
docker logs pgben-server

# Verificar configurações
docker inspect pgben-server
```

#### 2. Erro de conexão com banco
```bash
# Verificar se PostgreSQL está rodando
docker logs pgben-postgres

# Testar conexão
docker exec -it pgben-postgres psql -U pgben_user -d pgben_prod -c "SELECT 1;"
```

#### 3. Erro de permissões
```bash
# Verificar volumes
docker volume ls
docker volume inspect pgben-portainer_postgres_data

# Verificar permissões dos diretórios
ls -la data/
```

#### 4. Porta já em uso
```bash
# Verificar portas em uso
netstat -tulpn | grep :3000

# Alterar porta no docker-compose.portainer.yml
# ports:
#   - "3001:3000"  # Usar porta 3001 em vez de 3000
```

### Comandos Úteis

```bash
# Reiniciar apenas um serviço
docker restart pgben-server

# Executar comando dentro do container
docker exec -it pgben-server npm run migration:run

# Backup do banco
docker exec pgben-postgres pg_dump -U pgben_user pgben_prod > backup.sql

# Restaurar backup
docker exec -i pgben-postgres psql -U pgben_user pgben_prod < backup.sql

# Verificar uso de recursos
docker stats
```

## 🔒 Segurança

### Checklist de Segurança

- [ ] **Senhas alteradas**: Todas as senhas padrão foram alteradas
- [ ] **Chaves JWT**: Chaves RSA próprias geradas
- [ ] **Secrets**: Chaves de criptografia únicas
- [ ] **Firewall**: Apenas portas necessárias expostas
- [ ] **SSL/TLS**: Configurado para conexões externas
- [ ] **Backup**: Estratégia de backup implementada
- [ ] **Monitoramento**: Logs e alertas configurados
- [ ] **Updates**: Processo de atualização definido

### Configurações de Produção

```yaml
# Exemplo de configuração adicional para produção
environment:
  - NODE_ENV=production
  - LOG_LEVEL=warn
  - ENABLE_SWAGGER=false  # Desabilitar em produção
  - RATE_LIMIT_LIMIT=50   # Limite mais restritivo
```

## 📚 Recursos Adicionais

### Documentação
- [Documentação da API](./docs/api-docs/README.md)
- [Guia de Desenvolvimento](./README.md)
- [Configuração de Ambiente](./docs/CONFIGURACAO_AMBIENTE_DOTENV.md)
- [Estratégia de Testes](./docs/Testing%20Strategy%20Document.md)

### Scripts Úteis
- `scripts/setup-portainer.ps1` - Configuração inicial
- `scripts/gerar-chaves-jwt.js` - Geração de chaves JWT
- `scripts/database/create-backup.ts` - Backup do banco
- `scripts/database/restore-backup.ts` - Restauração do banco

### Suporte
- **Issues**: Reporte problemas no repositório
- **Documentação**: Consulte a pasta `docs/`
- **Logs**: Sempre inclua logs ao reportar problemas

---

## 📝 Notas Importantes

1. **Ambiente de Desenvolvimento**: Use `docker-compose.yml` para desenvolvimento local
2. **Ambiente de Produção**: Use `docker-compose.portainer.yml` para Portainer
3. **Backup Regular**: Configure backup automático dos volumes
4. **Monitoramento**: Implemente alertas para falhas de serviço
5. **Atualizações**: Teste sempre em ambiente de staging antes de produção

**⚠️ AVISO**: Este setup inclui MailHog para testes de email. Em produção, configure um servidor SMTP real.

**🔐 SEGURANÇA**: Nunca use as senhas padrão em produção. Sempre gere chaves e senhas únicas e seguras.