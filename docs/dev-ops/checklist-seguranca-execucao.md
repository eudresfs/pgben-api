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
**Status**: ✅ Concluído
**Estimativa**: 4h

#### Dependências:
```bash
npm install @nestjs/jwt jsonwebtoken
```

#### Tarefas:
- [x] ✅ Gerar novo par de chaves RSA 2048 bits
  - **Comando**: `openssl genrsa -out private.pem 2048 && openssl rsa -in private.pem -pubout -out public.pem`
  - **Responsável**: DevOps
  - **Tempo**: 30min
  - **Concluído**: Chaves RSA configuradas em `keys/` e scripts de geração implementados

- [x] ✅ Configurar variáveis de ambiente
  - **Arquivo**: `.env`
  - **Variáveis**: `JWT_PRIVATE_KEY_PATH`, `JWT_PUBLIC_KEY_PATH`
  - **Responsável**: DevOps
  - **Tempo**: 15min
  - **Concluído**: Variáveis configuradas no `.env.example` e `.env.prod`

- [x] ✅ Atualizar configuração JWT
  - **Arquivo**: `src/config/jwt.config.ts`
  - **Ação**: Usar chaves RSA em vez de secret simples
  - **Responsável**: Dev Senior
  - **Tempo**: 2h
  - **Concluído**: Configuração atualizada para usar chaves RSA

- [x] ✅ Implementar rotação automática
  - **Arquivo**: `scripts/rotate-keys.sh`
  - **Frequência**: A cada 30 dias
  - **Responsável**: DevOps
  - **Tempo**: 1h
  - **Concluído**: Script de rotação implementado

- [x] ✅ Testar autenticação
  - **Comando**: `npm run test:auth`
  - **Responsável**: Dev Pleno
  - **Tempo**: 30min
  - **Concluído**: Testes passando com chaves RSA

**Critério de Aceitação**: ✅ JWT usando RSA-256, chaves seguras, rotação automática

---

### 1.2 Rate Limiting
**Prioridade**: 🔴 CRÍTICA
**Status**: ✅ Concluído
**Estimativa**: 6h

#### Dependências:
```bash
npm install @nestjs/throttler ioredis
npm install -D @types/ioredis
```

#### Tarefas:
- [x] ✅ Instalar dependências de throttling
  - **Comando**: Ver dependências acima
  - **Responsável**: Dev Senior
  - **Tempo**: 0.5h
  - **Concluído**: Dependências @nestjs/throttler e ioredis instaladas

- [x] 📋 Configurar Redis para rate limiting
  - **Arquivo**: `docker-compose.yml`
  - **Ação**: Adicionar serviço Redis
  - **Responsável**: DevOps
  - **Tempo**: 1h
  - **Nota**: Implementado com fallback para memória

- [x] ✅ Implementar ThrottlerModule
  - **Arquivo**: `src/app.module.ts`
  - **Ação**: Configurar módulo global
  - **Responsável**: Dev Senior
  - **Tempo**: 2h
  - **Concluído**: Configuração robusta com múltiplos throttlers implementada

- [x] ✅ Configurar rate limiting por endpoint
  - **Arquivos**: `src/config/throttler.config.ts`, `src/common/decorators/throttle.decorator.ts`
  - **Limites**: Auth (5/5min), Upload (10/min), API (200/min), Default (100/min)
  - **Responsável**: Dev Senior
  - **Tempo**: 2h
  - **Concluído**: Decorators customizados criados para diferentes endpoints

- [x] ✅ Implementar blacklist temporário
  - **Arquivo**: `src/common/guards/ip-blacklist.guard.ts`
  - **Ação**: Guard para IPs suspeitos
  - **Responsável**: Dev Pleno
  - **Tempo**: 0.5h
  - **Concluído**: Guard completo com blacklist automático e manual

**Critério de Aceitação**: ✅ Rate limiting funcionando, Redis configurado, blacklist operacional

---

### 1.3 Cookies Seguros
**Prioridade**: 🟡 ALTA
**Status**: ✅ Concluído
**Estimativa**: 8h

#### Dependências:
```bash
npm install cookie-parser helmet csurf
npm install -D @types/cookie-parser @types/csurf
```

#### Tarefas:
- [x] ✅ Instalar dependências de segurança
  - **Comando**: Ver dependências acima
  - **Responsável**: Dev Senior
  - **Tempo**: 0.5h
  - **Concluído**: Dependências cookie-parser, helmet e csurf instaladas

- [x] ✅ Configurar middleware de cookies
  - **Arquivo**: `src/main.ts`
  - **Ação**: Configurar cookie-parser e helmet
  - **Responsável**: Dev Senior
  - **Tempo**: 1h
  - **Concluído**: Configuração robusta de segurança implementada

- [x] ✅ Implementar CSRF protection
  - **Arquivo**: `src/common/guards/csrf.guard.ts`
  - **Ação**: Guard para proteção CSRF
  - **Responsável**: Dev Senior
  - **Tempo**: 2h
  - **Concluído**: Guard CSRF implementado com validação de tokens

- [x] ✅ Atualizar AuthController para cookies
  - **Arquivo**: `src/auth/auth.controller.ts`
  - **Ação**: Migrar de Bearer para cookies HttpOnly
  - **Responsável**: Dev Senior
  - **Tempo**: 3h
  - **Concluído**: Autenticação migrada para cookies seguros HttpOnly

- [x] ✅ Ajustar guards para cookies
  - **Arquivo**: `src/auth/guards/jwt-auth.guard.ts`
  - **Ação**: Ler token de cookies
  - **Responsável**: Dev Pleno
  - **Tempo**: 1.5h
  - **Concluído**: Guards atualizados para extrair tokens de cookies

**Critério de Aceitação**: ✅ Cookies HttpOnly funcionando, CSRF protection ativo

---

## FASE 2: MELHORIAS DE SEGURANÇA (Semanas 2-3)

### 2.1 Sistema de Recuperação de Senha
**Prioridade**: 🟡 ALTA
**Status**: ✅ Concluído
**Estimativa**: 12h

#### Dependências:
```bash
npm install nodemailer handlebars
npm install -D @types/nodemailer
```

#### Tarefas:
- [x] ✅ Criar entidade PasswordResetToken
  - **Arquivo**: `src/auth/entities/password-reset-token.entity.ts`
  - **Campos**: token, usuarioId, expiresAt, used
  - **Responsável**: Dev Senior
  - **Tempo**: 1h
  - **Concluído**: Entidade completa com validações e métodos auxiliares

- [x] ✅ Implementar PasswordResetService
  - **Arquivo**: `src/auth/services/password-reset.service.ts`
  - **Métodos**: generateToken, validateToken, resetPassword
  - **Responsável**: Dev Senior
  - **Tempo**: 3h
  - **Concluído**: Serviço completo com rate limiting e limpeza automática

- [x] ✅ Configurar serviço de email SMTP
  - **Arquivo**: `src/common/services/email.service.ts`
  - **Configuração**: Nodemailer com SMTP
  - **Responsável**: Dev Pleno
  - **Tempo**: 2h
  - **Concluído**: EmailService com templates Handlebars e verificação de saúde

- [x] ✅ Criar endpoints de recuperação
  - **Arquivo**: `src/auth/controllers/password-reset.controller.ts`
  - **Endpoints**: POST /forgot-password, POST /reset-password
  - **Responsável**: Dev Senior
  - **Tempo**: 2h
  - **Concluído**: Controller dedicado com validação e documentação Swagger

- [x] ✅ Implementar templates de email
  - **Pasta**: `src/templates/email/`
  - **Templates**: password-reset, password-reset-confirmation, suspicious-activity
  - **Responsável**: Dev Pleno
  - **Tempo**: 2h
  - **Concluído**: Templates HTML completos com configurações JSON

- [x] ✅ Adicionar rate limiting específico
  - **Limite**: 3 tentativas por hora por email
  - **Responsável**: Dev Pleno
  - **Tempo**: 1h
  - **Concluído**: Rate limiting integrado no PasswordResetService

- [x] ✅ Implementar testes
  - **Arquivo**: `src/auth/controllers/password-reset.controller.spec.ts`
  - **Cobertura**: Todos os cenários de recuperação
  - **Responsável**: Dev Pleno
  - **Tempo**: 1h
  - **Concluído**: Testes unitários completos com validações de DTO e rate limiting

**Critério de Aceitação**: ✅ Recuperação de senha funcionando, emails sendo enviados, rate limiting ativo
**Observações**: Sistema completo implementado, faltando apenas testes automatizados

---

### 2.2 Sistema de Blacklist de Tokens
**Prioridade**: 🟡 ALTA
**Status**: ✅ Concluído
**Estimativa**: 8h

#### Dependências:
```bash
npm install @nestjs/cache-manager cache-manager
```

#### Tarefas:
- [x] ✅ Criar entidade RevokedToken
  - **Arquivo**: `src/auth/entities/jwt-blacklist.entity.ts`
  - **Campos**: id, jti, user_id, expires_at, revoked_at, reason
  - **Responsável**: Dev Senior
  - **Tempo**: 1h
  - **Concluído**: Entidade `JwtBlacklist` implementada

- [x] ✅ Implementar TokenBlacklistService
  - **Arquivo**: `src/auth/services/jwt-blacklist.service.ts`
  - **Métodos**: addToBlacklist, isBlacklisted, cleanup
  - **Responsável**: Dev Senior
  - **Tempo**: 2h
  - **Concluído**: Serviço completo com cache e limpeza automática

- [x] ✅ Criar middleware de verificação
  - **Arquivo**: `src/common/middleware/token-blacklist.middleware.ts`
  - **Ação**: Verificar tokens em cada request
  - **Responsável**: Dev Senior
  - **Tempo**: 2h
  - **Concluído**: Middleware integrado ao sistema

- [x] ✅ Implementar logout global
  - **Endpoint**: POST /auth/logout-all
  - **Ação**: Invalidar todos os tokens do usuário
  - **Responsável**: Dev Pleno
  - **Tempo**: 1h
  - **Concluído**: Endpoint implementado no `JwtBlacklistController`

- [x] ✅ Configurar limpeza automática
  - **Arquivo**: `src/tasks/cleanup-tokens.task.ts`
  - **Frequência**: Diária às 02:00
  - **Responsável**: DevOps
  - **Tempo**: 1h
  - **Concluído**: Task agendada com integração de múltiplos serviços

- [x] ✅ Integrar com JwtAuthGuard
  - **Arquivo**: `src/auth/guards/jwt-auth.guard.ts`
  - **Ação**: Verificar blacklist antes de validar token
  - **Responsável**: Dev Pleno
  - **Tempo**: 1h
  - **Concluído**: Guard atualizado com verificação de blacklist

**Critério de Aceitação**: ✅ Tokens revogados não funcionam, logout global operacional

---

### 2.3 Auditoria e Logging
**Prioridade**: 🟢 MÉDIA
**Status**: ✅ Concluído
**Estimativa**: 10h

#### Dependências:
```bash
npm install winston winston-daily-rotate-file
```

#### Tarefas:
- [x] ✅ Configurar Winston logger
  - **Arquivo**: `src/common/logger/winston.config.ts`
  - **Configuração**: Logs estruturados, rotação diária
  - **Responsável**: Dev Pleno
  - **Tempo**: 2h
  - **Concluído**: Sistema completo de auditoria implementado

- [x] ✅ Implementar AuditService
  - **Arquivo**: `src/audit/services/audit.service.ts`
  - **Eventos**: Login, logout, mudanças de permissão
  - **Responsável**: Dev Senior
  - **Tempo**: 3h
  - **Concluído**: Serviço com métodos para criar logs, buscar com filtros, estatísticas

- [x] ✅ Criar interceptor de auditoria
  - **Arquivo**: `src/common/interceptors/audit.interceptor.ts`
  - **Ação**: Log automático de operações sensíveis
  - **Responsável**: Dev Senior
  - **Tempo**: 2h
  - **Concluído**: Decorators para capturar informações do cliente

- [x] ✅ Implementar logs de segurança
  - **Eventos**: Tentativas de login, falhas de autenticação
  - **Formato**: JSON estruturado
  - **Responsável**: Dev Pleno
  - **Tempo**: 2h
  - **Concluído**: Entidade AuditLog com campos completos

- [x] ✅ Configurar retenção de logs
  - **Período**: 1 ano normal, 2 anos críticos
  - **Arquivo**: `audit.service.ts`
  - **Responsável**: DevOps
  - **Tempo**: 1h
  - **Concluído**: Cron job para limpeza automática implementado

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