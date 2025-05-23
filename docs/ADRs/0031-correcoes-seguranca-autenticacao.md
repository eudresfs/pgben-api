# ADR-0031: Correções de Segurança do Módulo de Autenticação

## Status
**ACEITO** - Em Implementação

## Contexto

Durante a análise de segurança do módulo de autenticação do Sistema SEMTAS, foram identificadas vulnerabilidades críticas que comprometem a segurança da aplicação e podem violar requisitos da LGPD. As principais vulnerabilidades encontradas incluem:

1. **Exposição de chave privada RSA** no arquivo `.env.example`
2. **Ausência de rate limiting** permitindo ataques de força bruta
3. **Falta de sistema de recuperação de senha** impactando usabilidade
4. **Configurações inseguras de cookies** vulneráveis a XSS
5. **Ausência de blacklist de tokens** permitindo uso de tokens comprometidos
6. **Logging inadequado** dificultando investigação de incidentes

Essas vulnerabilidades representam riscos significativos para:
- Conformidade com LGPD
- Segurança dos dados de beneficiários
- Disponibilidade do sistema
- Reputação da SEMTAS

## Decisão

Decidimos implementar um conjunto abrangente de correções de segurança organizadas em três fases:

### Fase 1: Correções Críticas (Semana 1)
1. **Segurança de Chaves JWT**
2. **Implementação de Rate Limiting**
3. **Configuração de Cookies Seguros**

### Fase 2: Melhorias de Segurança (Semanas 2-3)
1. **Sistema de Recuperação de Senha**
2. **Sistema de Blacklist de Tokens**
3. **Auditoria e Logging Estruturado**

### Fase 3: Otimizações (Semana 4)
1. **Cache Distribuído**
2. **Monitoramento Básico**

## Alternativas Consideradas

### 1. Correção Gradual vs. Correção Completa

**Opção A: Correção Gradual**
- Prós: Menor risco de quebra, deploy incremental
- Contras: Vulnerabilidades permanecem expostas por mais tempo

**Opção B: Correção Completa (ESCOLHIDA)**
- Prós: Elimina todas as vulnerabilidades rapidamente
- Contras: Maior complexidade de implementação

**Justificativa**: Dado o nível crítico das vulnerabilidades, especialmente a exposição da chave privada, optamos pela correção completa para minimizar o tempo de exposição.

### 2. Armazenamento de Chaves

**Opção A: Azure Key Vault**
- Prós: Gerenciamento automático, rotação, auditoria
- Contras: Custo, dependência de serviço externo

**Opção B: Arquivos Locais Seguros (ESCOLHIDA)**
- Prós: Sem custo, controle total, sem dependências externas
- Contras: Gerenciamento manual, responsabilidade de backup

**Justificativa**: Conforme requisito do cliente de não usar serviços cloud pagos, optamos por arquivos locais com permissões restritas e rotação manual.

### 3. Rate Limiting

**Opção A: Middleware Customizado**
- Prós: Controle total, customização específica
- Contras: Maior tempo de desenvolvimento, possíveis bugs

**Opção B: @nestjs/throttler (ESCOLHIDA)**
- Prós: Solução testada, integração nativa, configuração simples
- Contras: Menos flexibilidade para casos específicos

**Justificativa**: Para acelerar o desenvolvimento e garantir estabilidade, optamos pela solução oficial do NestJS.

### 4. Armazenamento de Sessões/Cache

**Opção A: Memória Local**
- Prós: Simplicidade, sem dependências
- Contras: Não escalável, perda de dados em restart

**Opção B: Redis (ESCOLHIDA)**
- Prós: Escalável, persistente, performance
- Contras: Dependência adicional

**Justificativa**: Redis é open source, oferece melhor performance e escalabilidade necessária para o sistema.

### 5. Serviço de Email

**Opção A: SendGrid/Mailgun**
- Prós: Confiabilidade, deliverability, analytics
- Contras: Custo, dependência externa

**Opção B: SMTP Próprio (ESCOLHIDA)**
- Prós: Sem custo, controle total
- Contras: Configuração mais complexa, possíveis problemas de deliverability

**Justificativa**: Conforme requisito de usar apenas recursos gratuitos/open source.

## Consequências

### Positivas

1. **Segurança Aprimorada**
   - Eliminação de vulnerabilidades críticas
   - Proteção contra ataques comuns (brute force, XSS, CSRF)
   - Conformidade com melhores práticas OWASP

2. **Conformidade LGPD**
   - Logs de auditoria adequados
   - Proteção de dados pessoais
   - Controle de acesso robusto

3. **Operabilidade Melhorada**
   - Sistema de recuperação de senha
   - Logs estruturados para troubleshooting
   - Health checks para monitoramento

4. **Escalabilidade**
   - Cache distribuído com Redis
   - Rate limiting configurável
   - Arquitetura preparada para crescimento

### Negativas

1. **Complexidade Adicional**
   - Mais componentes para gerenciar (Redis)
   - Configuração mais complexa
   - Maior superfície de ataque potencial

2. **Dependências Externas**
   - Redis como dependência crítica
   - Nodemailer para envio de emails
   - Bibliotecas adicionais de segurança

3. **Overhead de Performance**
   - Verificações adicionais de segurança
   - Consultas ao Redis para rate limiting
   - Logs estruturados mais verbosos

4. **Manutenção Adicional**
   - Rotação manual de chaves JWT
   - Monitoramento de Redis
   - Limpeza periódica de tokens revogados

## Detalhes de Implementação

### Tecnologias Escolhidas

| Componente | Tecnologia | Justificativa |
|------------|------------|---------------|
| Rate Limiting | @nestjs/throttler + Redis | Integração nativa, performance |
| Cache | Redis | Open source, escalável |
| Email | Nodemailer + SMTP | Flexível, sem custo |
| Logging | Winston | Padrão da indústria, configurável |
| Cookies | cookie-parser + helmet | Segurança padrão |
| CSRF | csurf | Proteção estabelecida |

### Configurações de Segurança

```typescript
// Rate Limiting
const throttlerConfig = {
  ttl: 60, // 1 minuto
  limit: 100, // 100 requests por minuto (global)
  storage: new ThrottlerStorageRedisService(redis)
};

// Cookies Seguros
const cookieConfig = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000 // 15 minutos
};

// Headers de Segurança
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true
  }
};
```

### Estrutura de Arquivos

```
src/
├── auth/
│   ├── entities/
│   │   ├── password-reset-token.entity.ts
│   │   └── revoked-token.entity.ts
│   ├── services/
│   │   ├── password-reset.service.ts
│   │   └── token-blacklist.service.ts
│   └── guards/
│       └── csrf.guard.ts
├── common/
│   ├── guards/
│   │   └── ip-blacklist.guard.ts
│   ├── middleware/
│   │   └── token-blacklist.middleware.ts
│   ├── services/
│   │   ├── email.service.ts
│   │   └── audit.service.ts
│   ├── interceptors/
│   │   └── audit.interceptor.ts
│   └── logger/
│       └── winston.config.ts
├── config/
│   ├── jwt.config.ts
│   └── cache.config.ts
├── templates/
│   └── email/
│       └── forgot-password.hbs
└── tasks/
    └── cleanup-tokens.task.ts
```

### Migrações de Banco

```sql
-- Tabela para tokens de reset de senha
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela para tokens revogados
CREATE TABLE revoked_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jti VARCHAR(255) NOT NULL UNIQUE,
  revoked_at TIMESTAMP DEFAULT NOW(),
  reason VARCHAR(255)
);

-- Índices para performance
CREATE INDEX idx_password_reset_tokens_usuario_id ON password_reset_tokens(usuario_id);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
CREATE INDEX idx_revoked_tokens_jti ON revoked_tokens(jti);
```

## Métricas de Sucesso

### Segurança
- [ ] Zero vulnerabilidades críticas em scan OWASP ZAP
- [ ] 100% dos endpoints protegidos por rate limiting
- [ ] Tempo de detecção de incidentes < 5 minutos
- [ ] Conformidade com OWASP Top 10

### Performance
- [ ] Latência de autenticação < 200ms (p95)
- [ ] Cache hit ratio > 95% para permissões
- [ ] Disponibilidade > 99.9%
- [ ] Throughput > 1000 requests/segundo

### Funcionalidade
- [ ] Sistema de recuperação de senha operacional
- [ ] Logs de auditoria completos
- [ ] Rate limiting não impacta usuários legítimos
- [ ] Blacklist de tokens funcionando

## Riscos e Mitigações

### Riscos Técnicos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|----------|
| Incompatibilidade com frontend | Média | Alto | Testes extensivos, implementação gradual |
| Performance degradada | Baixa | Médio | Monitoramento, ajuste de configurações |
| Falha do Redis | Baixa | Alto | Fallback para memória, cluster Redis |
| Problemas de deliverability | Média | Médio | Configuração adequada de SMTP, SPF/DKIM |

### Riscos de Cronograma

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|----------|
| Complexidade subestimada | Média | Alto | Buffer de tempo, priorização |
| Dependências externas | Baixa | Médio | Alternativas preparadas |
| Testes de integração | Alta | Médio | Automação, ambiente dedicado |

## Plano de Rollback

Em caso de problemas críticos durante a implementação:

1. **Rollback Imediato**
   - Reverter para versão anterior via Git
   - Restaurar configurações de banco
   - Comunicar stakeholders

2. **Rollback Parcial**
   - Desabilitar funcionalidades problemáticas
   - Manter correções críticas funcionando
   - Investigar e corrigir problemas

3. **Contingências**
   - Manter Bearer tokens como fallback
   - Configurar rate limiting permissivo
   - Logs simplificados se necessário

## Cronograma de Implementação

### Semana 1: Correções Críticas
- **Dias 1-2**: Segurança de chaves JWT
- **Dias 3-4**: Rate limiting
- **Dias 5-7**: Cookies seguros e testes

### Semana 2: Recuperação de Senha
- **Dias 1-3**: Backend de recuperação
- **Dias 4-5**: Serviço de email
- **Dias 6-7**: Testes e ajustes

### Semana 3: Blacklist e Auditoria
- **Dias 1-3**: Sistema de blacklist
- **Dias 4-5**: Auditoria e logging
- **Dias 6-7**: Integração e testes

### Semana 4: Otimizações
- **Dias 1-2**: Cache distribuído
- **Dias 3-4**: Monitoramento
- **Dias 5-7**: Testes finais e deploy

## Aprovação

- **Autor**: Tech Lead/Arquiteto de Software
- **Revisores**: Equipe de Desenvolvimento, DevOps
- **Aprovado por**: Product Owner, SEMTAS
- **Data de Aprovação**: [DATA_APROVACAO]
- **Data de Implementação**: [DATA_INICIO]

## Referências

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [NestJS Security Best Practices](https://docs.nestjs.com/security/authentication)
- [JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
- [Redis Security Guidelines](https://redis.io/topics/security)
- [LGPD - Lei Geral de Proteção de Dados](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)

---

**Histórico de Revisões**:
- v1.0 - [DATA] - Versão inicial
- v1.1 - [DATA] - Ajustes baseados em feedback
- v1.2 - [DATA] - Inclusão de métricas de sucesso