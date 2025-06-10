# Deploy em Produção - Sistema PGBEN

Este documento fornece instruções detalhadas para o deploy do Sistema de Gestão de Benefícios Eventuais (PGBEN) em ambiente de produção usando Docker Compose com Docker Secrets.

## 📋 Pré-requisitos

- Docker Engine 20.10+ com suporte a Docker Swarm
- Docker Compose v2.0+
- Acesso de administrador no servidor
- Certificados SSL/TLS (se aplicável)

## 🔐 Configuração de Segurança com Docker Secrets

### 1. Inicializar Docker Swarm

```bash
# Inicializar o Docker Swarm (necessário para usar Docker Secrets)
docker swarm init
```

### 2. Configurar Docker Secrets

#### Opção A: Usando o Script Automatizado (Linux/macOS)

```bash
# Dar permissão de execução
chmod +x scripts/setup-docker-secrets.sh

# Executar o script
./scripts/setup-docker-secrets.sh
```

#### Opção B: Usando o Script PowerShell (Windows)

```powershell
# Executar o script PowerShell
.\scripts\setup-docker-secrets.ps1
```

#### Opção C: Configuração Manual

```bash
# Criar diretório para secrets
mkdir -p secrets

# Gerar e criar secrets individuais
echo "pgben_user" | docker secret create db_user -
echo "$(openssl rand -base64 32)" | docker secret create db_password -
echo "$(openssl rand -base64 32)" | docker secret create redis_password -
echo "$(openssl rand -base64 64)" | docker secret create jwt_secret -
echo "$(openssl rand -base64 32)" | docker secret create encryption_key -
echo "$(openssl rand -base64 32)" | docker secret create audit_signing_key -
echo "$(openssl rand -base64 32)" | docker secret create cookie_secret -
echo "$(openssl rand -base64 32)" | docker secret create session_secret -
echo "$(openssl rand -base64 32)" | docker secret create csrf_secret -
echo "minio_admin" | docker secret create minio_access_key -
echo "$(openssl rand -base64 32)" | docker secret create minio_secret_key -
echo "your_smtp_password" | docker secret create smtp_password -
echo "$(openssl rand -base64 32)" | docker secret create grafana_admin_password -
```

### 3. Verificar Secrets Criados

```bash
# Listar todos os secrets
docker secret ls

# Verificar se todos os secrets necessários foram criados
docker secret ls --format "table {{.Name}}\t{{.CreatedAt}}" | grep -E "(db_|redis_|jwt_|minio_|encryption_|audit_|cookie_|session_|csrf_|smtp_|grafana_)"
```

## 🚀 Deploy da Aplicação

### 1. Configurar Variáveis de Ambiente

```bash
# Copiar o arquivo de exemplo
cp .env.prod.example .env.prod

# Editar as variáveis não sensíveis
nano .env.prod
```

**Importante**: As variáveis sensíveis (senhas, chaves) são gerenciadas via Docker Secrets e não devem estar no arquivo `.env.prod`.

### 2. Executar o Deploy

```bash
# Deploy usando Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# Verificar status dos serviços
docker-compose -f docker-compose.prod.yml ps

# Verificar logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 3. Verificar Health Checks

```bash
# Verificar saúde de todos os serviços
docker-compose -f docker-compose.prod.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

# Verificar logs específicos de um serviço
docker-compose -f docker-compose.prod.yml logs pgben-server
```

## 🔍 Monitoramento

### Acessar Dashboards

- **Aplicação**: http://localhost:3000
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001
  - Usuário: admin
  - Senha: Definida no secret `grafana_admin_password`
- **MinIO Console**: http://localhost:9001

### Verificar Métricas

```bash
# Verificar métricas da aplicação
curl http://localhost:3000/metrics

# Verificar targets no Prometheus
curl http://localhost:9090/api/v1/targets
```

## 🛠️ Manutenção

### Backup dos Dados

```bash
# Backup do banco de dados
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U $(docker secret inspect db_user --format='{{.Spec.Data}}' | base64 -d) pgben_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup dos volumes
docker run --rm -v pgben_postgres_data_prod:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup_$(date +%Y%m%d_%H%M%S).tar.gz /data
docker run --rm -v pgben_minio_data_prod:/data -v $(pwd):/backup alpine tar czf /backup/minio_backup_$(date +%Y%m%d_%H%M%S).tar.gz /data
```

### Rotação de Secrets

```bash
# Exemplo: Rotacionar senha do banco
echo "$(openssl rand -base64 32)" | docker secret create db_password_new -

# Atualizar o compose para usar o novo secret
# Remover o secret antigo após confirmação
docker secret rm db_password
docker secret create db_password - < new_password.txt
```

### Atualização da Aplicação

```bash
# Rebuild e redeploy
docker-compose -f docker-compose.prod.yml build pgben-server
docker-compose -f docker-compose.prod.yml up -d pgben-server

# Verificar se a atualização foi bem-sucedida
docker-compose -f docker-compose.prod.yml logs pgben-server
```

## 🔒 Segurança

### Configurações de Segurança Implementadas

1. **Docker Secrets**: Todas as credenciais sensíveis são gerenciadas via Docker Secrets
2. **Rede Isolada**: Todos os serviços executam em uma rede Docker dedicada
3. **Health Checks**: Monitoramento contínuo da saúde dos serviços
4. **Logs Estruturados**: Logs centralizados com rotação automática
5. **Princípio do Menor Privilégio**: Containers executam com usuários não-root quando possível

### Recomendações Adicionais

1. **Firewall**: Configure firewall para expor apenas as portas necessárias
2. **SSL/TLS**: Implemente certificados SSL para comunicação externa
3. **Backup Regular**: Configure backups automáticos dos dados
4. **Monitoramento**: Configure alertas para métricas críticas
5. **Atualizações**: Mantenha as imagens Docker atualizadas

## 🚨 Troubleshooting

### Problemas Comuns

#### Serviço não inicia
```bash
# Verificar logs detalhados
docker-compose -f docker-compose.prod.yml logs [service_name]

# Verificar se os secrets existem
docker secret ls

# Verificar conectividade de rede
docker network inspect pgben-network-prod
```

#### Problemas de conectividade com banco
```bash
# Testar conexão com o banco
docker-compose -f docker-compose.prod.yml exec postgres psql -U $(docker secret inspect db_user --format='{{.Spec.Data}}' | base64 -d) -d pgben_prod -c "SELECT 1;"
```

#### Problemas com MinIO
```bash
# Verificar buckets criados
docker-compose -f docker-compose.prod.yml exec minio mc ls myminio/

# Recriar buckets se necessário
docker-compose -f docker-compose.prod.yml restart createbuckets-prod
```

## 📞 Suporte

Para suporte técnico ou dúvidas sobre o deploy:

1. Verifique os logs dos serviços
2. Consulte a documentação técnica em `docs/`
3. Verifique os health checks dos serviços
4. Entre em contato com a equipe de DevOps

---

**Nota**: Este documento deve ser mantido atualizado conforme mudanças na infraestrutura e configurações de produção.