# Checklist de Execução - Correções de Segurança

## Status Geral
- **Início**: [DATA_INICIO]
- **Previsão de Conclusão**: [DATA_FIM]
- **Responsável**: Tech Lead/Arquiteto
- **Status**: 🔄 Em Andamento

## Legenda de Status
- ✅ Concluído
- 🔄 Em Andamento
- ⏳ Aguardando
- ❌ Bloqueado
- 📋 Não Iniciado

---

## FASE 1: CORREÇÕES CRÍTICAS (Semana 1)

### 1.1 Segurança de Chaves JWT
**Prioridade**: 🔴 CRÍTICA
**Status**: 📋 Não Iniciado
**Estimativa**: 8h

#### Tarefas:
- [ ] 📋 Gerar novo par de chaves RSA 2048 bits
  - **Comando**: `openssl genrsa -out private.pem 2048 && openssl rsa -in private.pem -pubout -out public.pem`
  - **Responsável**: DevOps
  - **Tempo**: 1h

- [ ] 📋 Remover chaves do .env.example
  - **Arquivo**: `.env.example`
  - **Ação**: Substituir chaves por placeholders
  - **Responsável**: Dev Senior
  - **Tempo**: 0.5h

- [ ] 📋 Implementar carregamento seguro de chaves
  - **Arquivos**: `src/auth/auth.module.ts`, `src/config/jwt.config.ts`
  - **Ação**: Criar configuração para carregar chaves de arquivos
  - **Responsável**: Dev Senior
  - **Tempo**: 3h

- [ ] 📋 Configurar rotação manual de chaves (30 dias)
  - **Arquivo**: `scripts/rotate-keys.sh`
  - **Ação**: Script para rotação de chaves
  - **Responsável**: DevOps
  - **Tempo**: 2h

- [ ] 📋 Testar carregamento em desenvolvimento
  - **Ação**: Testes unitários e de integração
  - **Responsável**: Dev Pleno
  - **Tempo**: 1.5h

**Critério de Aceitação**: ✅ Chaves não expostas em código, carregamento seguro funcionando

---

### 1.2 Rate Limiting
**Prioridade**: 🔴 CRÍTICA
**Status**: 📋 Não Iniciado
**Estimativa**: 6h

#### Dependências:
```bash
npm install @nestjs/throttler ioredis
npm install -D @types/ioredis
```

#### Tarefas:
- [ ] 📋 Instalar dependências de throttling
  - **Comando**: Ver dependências acima
  - **Responsável**: Dev Senior
  - **Tempo**: 0.5h

- [ ] 📋 Configurar Redis para rate limiting
  - **Arquivo**: `docker-compose.yml`
  - **Ação**: Adicionar serviço Redis
  - **Responsável**: DevOps
  - **Tempo**: 1h

- [ ] 📋 Implementar ThrottlerModule
  - **Arquivo**: `src/app.module.ts`
  - **Ação**: Configurar módulo global
  - **Responsável**: Dev Senior
  - **Tempo**: 2h

- [ ] 📋 Configurar rate limiting por endpoint
  - **Arquivos**: `src/auth/auth.controller.ts`
  - **Limites**: Login (5/min), Register (3/hora), Global (100/min)
  - **Responsável**: Dev Senior
  - **Tempo**: 2h

- [ ] 📋 Implementar blacklist temporário
  - **Arquivo**: `src/common/guards/ip-blacklist.guard.ts`
  - **Ação**: Guard para IPs suspeitos
  - **Responsável**: Dev Pleno
  - **Tempo**: 0.5h

**Critério de Aceitação**: ✅ Rate limiting funcionando, Redis configurado, blacklist operacional

---

### 1.3 Cookies Seguros
**Prioridade**: 🟡 ALTA
**Status**: 📋 Não Iniciado
**Estimativa**: 8h

#### Dependências:
```bash
npm install cookie-parser helmet csurf
npm install -D @types/cookie-parser @types/csurf
```

#### Tarefas:
- [ ] 📋 Instalar dependências de segurança
  - **Comando**: Ver dependências acima
  - **Responsável**: Dev Senior
  - **Tempo**: 0.5h

- [ ] 📋 Configurar middleware de cookies
  - **Arquivo**: `src/main.ts`
  - **Ação**: Configurar cookie-parser e helmet
  - **Responsável**: Dev Senior
  - **Tempo**: 1h

- [ ] 📋 Implementar CSRF protection
  - **Arquivo**: `src/common/guards/csrf.guard.ts`
  - **Ação**: Guard para proteção CSRF
  - **Responsável**: Dev Senior
  - **Tempo**: 2h

- [ ] 📋 Atualizar AuthController para cookies
  - **Arquivo**: `src/auth/auth.controller.ts`
  - **Ação**: Migrar de Bearer para cookies HttpOnly
  - **Responsável**: Dev Senior
  - **Tempo**: 3h

- [ ] 📋 Ajustar guards para cookies
  - **Arquivo**: `src/auth/guards/jwt-auth.guard.ts`
  - **Ação**: Ler token de cookies
  - **Responsável**: Dev Pleno
  - **Tempo**: 1.5h

**Critério de Aceitação**: ✅ Cookies HttpOnly funcionando, CSRF protection ativo

---

## FASE 2: MELHORIAS DE SEGURANÇA (Semanas 2-3)

### 2.1 Sistema de Recuperação de Senha
**Prioridade**: 🟡 ALTA
**Status**: 📋 Não Iniciado
**Estimativa**: 12h

#### Dependências:
```bash
npm install nodemailer handlebars
npm install -D @types/nodemailer
```

#### Tarefas:
- [ ] 📋 Criar entidade PasswordResetToken
  - **Arquivo**: `src/auth/entities/password-reset-token.entity.ts`
  - **Campos**: token, usuarioId, expiresAt, used
  - **Responsável**: Dev Senior
  - **Tempo**: 1h

- [ ] 📋 Implementar PasswordResetService
  - **Arquivo**: `src/auth/services/password-reset.service.ts`
  - **Métodos**: generateToken, validateToken, resetPassword
  - **Responsável**: Dev Senior
  - **Tempo**: 3h

- [ ] 📋 Configurar serviço de email SMTP
  - **Arquivo**: `src/common/services/email.service.ts`
  - **Configuração**: Nodemailer com SMTP
  - **Responsável**: Dev Pleno
  - **Tempo**: 2h

- [ ] 📋 Criar endpoints de recuperação
  - **Arquivo**: `src/auth/auth.controller.ts`
  - **Endpoints**: POST /forgot-password, POST /reset-password
  - **Responsável**: Dev Senior
  - **Tempo**: 2h

- [ ] 📋 Implementar templates de email
  - **Pasta**: `src/templates/email/`
  - **Templates**: forgot-password.hbs
  - **Responsável**: Dev Pleno
  - **Tempo**: 2h

- [ ] 📋 Adicionar rate limiting específico
  - **Limite**: 3 tentativas por hora por email
  - **Responsável**: Dev Pleno
  - **Tempo**: 1h

- [ ] 📋 Implementar testes
  - **Arquivo**: `src/auth/auth.controller.spec.ts`
  - **Cobertura**: Todos os cenários de recuperação
  - **Responsável**: Dev Pleno
  - **Tempo**: 1h

**Critério de Aceitação**: ✅ Recuperação de senha funcionando, emails sendo enviados, rate limiting ativo

---

### 2.2 Sistema de Blacklist de Tokens
**Prioridade**: 🟡 ALTA
**Status**: 📋 Não Iniciado
**Estimativa**: 8h

#### Tarefas:
- [ ] 📋 Criar entidade RevokedToken
  - **Arquivo**: `src/auth/entities/revoked-token.entity.ts`
  - **Campos**: jti, revokedAt, reason
  - **Responsável**: Dev Senior
  - **Tempo**: 1h

- [ ] 📋 Implementar TokenBlacklistService
  - **Arquivo**: `src/auth/services/token-blacklist.service.ts`
  - **Métodos**: revokeToken, isRevoked, cleanup
  - **Responsável**: Dev Senior
  - **Tempo**: 2h

- [ ] 📋 Criar middleware de verificação
  - **Arquivo**: `src/common/middleware/token-blacklist.middleware.ts`
  - **Ação**: Verificar tokens revogados
  - **Responsável**: Dev Senior
  - **Tempo**: 2h

- [ ] 📋 Implementar logout global
  - **Endpoint**: POST /auth/logout-all
  - **Ação**: Revogar todos os tokens do usuário
  - **Responsável**: Dev Pleno
  - **Tempo**: 1h

- [ ] 📋 Configurar limpeza automática
  - **Arquivo**: `src/tasks/cleanup-tokens.task.ts`
  - **Frequência**: Diária
  - **Responsável**: DevOps
  - **Tempo**: 1h

- [ ] 📋 Integrar com JwtAuthGuard
  - **Arquivo**: `src/auth/guards/jwt-auth.guard.ts`
  - **Ação**: Verificar blacklist
  - **Responsável**: Dev Pleno
  - **Tempo**: 1h

**Critério de Aceitação**: ✅ Tokens podem ser revogados, verificação automática funcionando

---

### 2.3 Auditoria e Logging
**Prioridade**: 🟢 MÉDIA
**Status**: 📋 Não Iniciado
**Estimativa**: 10h

#### Dependências:
```bash
npm install winston winston-daily-rotate-file
```

#### Tarefas:
- [ ] 📋 Configurar Winston logger
  - **Arquivo**: `src/common/logger/winston.config.ts`
  - **Configuração**: Logs estruturados, rotação diária
  - **Responsável**: Dev Pleno
  - **Tempo**: 2h

- [ ] 📋 Implementar AuditService
  - **Arquivo**: `src/common/services/audit.service.ts`
  - **Eventos**: Login, logout, mudanças de permissão
  - **Responsável**: Dev Senior
  - **Tempo**: 3h

- [ ] 📋 Criar interceptor de auditoria
  - **Arquivo**: `src/common/interceptors/audit.interceptor.ts`
  - **Ação**: Log automático de operações sensíveis
  - **Responsável**: Dev Senior
  - **Tempo**: 2h

- [ ] 📋 Implementar logs de segurança
  - **Eventos**: Tentativas de login, falhas de autenticação
  - **Formato**: JSON estruturado
  - **Responsável**: Dev Pleno
  - **Tempo**: 2h

- [ ] 📋 Configurar retenção de logs
  - **Período**: 90 dias
  - **Arquivo**: `winston.config.ts`
  - **Responsável**: DevOps
  - **Tempo**: 1h

**Critério de Aceitação**: ✅ Logs estruturados funcionando, auditoria de eventos críticos

---

## FASE 3: OTIMIZAÇÕES (Semana 4)

### 3.1 Cache Distribuído
**Prioridade**: 🟢 BAIXA
**Status**: 📋 Não Iniciado
**Estimativa**: 6h

#### Dependências:
```bash
npm install @nestjs/cache-manager cache-manager-redis-store
```

#### Tarefas:
- [ ] 📋 Configurar Redis para cache
  - **Arquivo**: `src/config/cache.config.ts`
  - **Responsável**: DevOps
  - **Tempo**: 1h

- [ ] 📋 Migrar cache de permissões
  - **Arquivo**: `src/auth/services/permission.service.ts`
  - **Ação**: Usar Redis em vez de memória
  - **Responsável**: Dev Senior
  - **Tempo**: 3h

- [ ] 📋 Implementar invalidação inteligente
  - **Estratégia**: TTL + invalidação por eventos
  - **Responsável**: Dev Senior
  - **Tempo**: 2h

**Critério de Aceitação**: ✅ Cache Redis funcionando, performance melhorada

---

### 3.2 Monitoramento Básico
**Prioridade**: 🟢 BAIXA
**Status**: 📋 Não Iniciado
**Estimativa**: 4h

#### Dependências:
```bash
npm install @nestjs/terminus
```

#### Tarefas:
- [ ] 📋 Implementar health checks
  - **Endpoint**: GET /health
  - **Verificações**: DB, Redis, Email
  - **Responsável**: Dev Pleno
  - **Tempo**: 2h

- [ ] 📋 Configurar métricas básicas
  - **Métricas**: Requests/sec, response time, errors
  - **Responsável**: DevOps
  - **Tempo**: 2h

**Critério de Aceitação**: ✅ Health checks funcionando, métricas básicas coletadas

---

## RESUMO DE PROGRESSO

### Por Fase:
- **Fase 1 (Crítica)**: 0/3 ⏳
- **Fase 2 (Melhorias)**: 0/3 ⏳
- **Fase 3 (Otimizações)**: 0/2 ⏳

### Por Prioridade:
- **🔴 Crítica**: 0/2 ⏳
- **🟡 Alta**: 0/3 ⏳
- **🟢 Média/Baixa**: 0/3 ⏳

### Tempo Total Estimado:
- **Desenvolvimento**: 62h
- **Testes**: 8h
- **DevOps**: 10h
- **Total**: 80h

---

## PRÓXIMOS PASSOS

1. **Imediato**: Iniciar Fase 1.1 (Segurança de Chaves)
2. **Esta Semana**: Completar todas as correções críticas
3. **Próxima Semana**: Iniciar melhorias de segurança
4. **Semana 3**: Finalizar auditoria e logging
5. **Semana 4**: Otimizações e preparação para produção

---

## NOTAS DE IMPLEMENTAÇÃO

### Configurações de Ambiente:
```env
# Chaves JWT (arquivos separados)
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Email SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@semtas.gov.br

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

### Comandos Úteis:
```bash
# Gerar chaves RSA
openssl genrsa -out keys/private.pem 2048
openssl rsa -in keys/private.pem -pubout -out keys/public.pem

# Iniciar Redis
docker run -d -p 6379:6379 redis:alpine

# Executar testes
npm run test:e2e

# Build para produção
npm run build
```

---

**Última Atualização**: [DATA_ATUALIZACAO]
**Próxima Revisão**: [DATA_PROXIMA_REVISAO]