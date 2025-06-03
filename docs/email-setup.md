# Configuração do Serviço de Email - SEMTAS

Este documento descreve como configurar o serviço de email do sistema SEMTAS, incluindo configuração para desenvolvimento com MailHog e produção com provedores SMTP.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Configuração para Desenvolvimento (MailHog)](#configuração-para-desenvolvimento-mailhog)
- [Configuração para Produção](#configuração-para-produção)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Testes](#testes)
- [Troubleshooting](#troubleshooting)

## 🔍 Visão Geral

O serviço de email do SEMTAS suporta:

- ✅ **MailHog** - Servidor SMTP de teste para desenvolvimento
- ✅ **Mailtrap** - Serviço de teste de email
- ✅ **Gmail** - Para produção com autenticação OAuth2 ou App Password
- ✅ **Provedores SMTP genéricos** - Qualquer servidor SMTP padrão
- ✅ **Templates Handlebars** - Sistema de templates para emails
- ✅ **Anexos** - Suporte a arquivos anexos
- ✅ **Retry automático** - Reconexão automática em caso de falha

## 🛠️ Configuração para Desenvolvimento (MailHog)

### 1. Instalação do MailHog

#### Via Docker (Recomendado)
```bash
# Iniciar MailHog
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog

# Verificar se está rodando
docker ps | grep mailhog
```

#### Via Binário
```bash
# Download e instalação
go install github.com/mailhog/MailHog@latest

# Executar
MailHog
```

### 2. Configuração do .env

Copie o arquivo de exemplo:
```bash
cp .env.mailhog.example .env
```

Ou configure manualmente:
```env
# Configurações básicas
EMAIL_ENABLED=true
NODE_ENV=development

# MailHog SMTP
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=

# Remetente
SMTP_FROM=noreply@localhost.test
SMTP_FROM_NAME=SEMTAS - Desenvolvimento

# URLs
FRONTEND_URL=http://localhost:3000
SUPPORT_EMAIL=suporte@semtas.gov.br
```

### 3. Verificação

```bash
# Testar configuração
node scripts/test-mailhog.js

# Acessar interface web
# http://localhost:8025
```

## 🚀 Configuração para Produção

### Gmail com App Password

```env
EMAIL_ENABLED=true
NODE_ENV=production

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-app-password

SMTP_FROM=noreply@seudominio.com
SMTP_FROM_NAME=SEMTAS - Sistema

FRONTEND_URL=https://semtas.seudominio.com
SUPPORT_EMAIL=suporte@semtas.gov.br
```

### Mailtrap Live

```env
EMAIL_ENABLED=true
NODE_ENV=production

SMTP_HOST=live.smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=api
SMTP_PASS=sua-api-key

# IMPORTANTE: Use domínio verificado no Mailtrap
SMTP_FROM=noreply@seudominio-verificado.com
SMTP_FROM_NAME=SEMTAS - Sistema
```

### Servidor SMTP Genérico

```env
EMAIL_ENABLED=true
NODE_ENV=production

SMTP_HOST=smtp.seuservidor.com
SMTP_PORT=587  # ou 465 para SSL
SMTP_USER=usuario@seuservidor.com
SMTP_PASS=sua-senha

SMTP_FROM=noreply@seuservidor.com
SMTP_FROM_NAME=SEMTAS - Sistema

# Configurações de segurança
SMTP_REJECT_UNAUTHORIZED=true
```

## 📝 Variáveis de Ambiente

| Variável | Obrigatória | Padrão | Descrição |
|----------|-------------|--------|-----------|
| `EMAIL_ENABLED` | ✅ | `false` | Habilita/desabilita o serviço |
| `SMTP_HOST` | ✅ | - | Servidor SMTP |
| `SMTP_PORT` | ❌ | `587` | Porta SMTP |
| `SMTP_USER` | ⚠️ | - | Usuário SMTP (não obrigatório para MailHog) |
| `SMTP_PASS` | ⚠️ | - | Senha SMTP (não obrigatório para MailHog) |
| `SMTP_FROM` | ❌ | Auto | Email remetente |
| `SMTP_FROM_NAME` | ❌ | `SEMTAS - Sistema` | Nome do remetente |
| `SMTP_REJECT_UNAUTHORIZED` | ❌ | `false` | Rejeitar certificados inválidos |
| `FRONTEND_URL` | ✅ | - | URL do frontend para links |
| `SUPPORT_EMAIL` | ❌ | `suporte@semtas.gov.br` | Email de suporte |

## 🧪 Testes

### Teste Automático

```bash
# Testar configuração MailHog
node scripts/test-mailhog.js

# Testar via API (se servidor estiver rodando)
curl -X POST http://localhost:3000/api/v1/email/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer seu-token" \
  -d '{"recipient": "teste@exemplo.com"}'
```

### Teste Manual via Código

```typescript
import { EmailService } from './src/common/services/email.service';

// Injetar o serviço e testar
const emailService = app.get(EmailService);

// Teste simples
const result = await emailService.testEmail('teste@exemplo.com');
console.log('Resultado:', result);

// Teste com template
const templateResult = await emailService.sendEmail({
  to: 'teste@exemplo.com',
  template: 'password-reset',
  context: {
    name: 'João Silva',
    resetUrl: 'http://localhost:3000/reset?token=123',
    expiresAt: new Date().toLocaleString('pt-BR')
  }
});
```

## 🔧 Troubleshooting

### ❌ MailHog não conecta

**Problema:** `ECONNREFUSED` ou `ESOCKET`

**Soluções:**
1. Verificar se MailHog está rodando:
   ```bash
   docker ps | grep mailhog
   # ou
   curl http://localhost:8025
   ```

2. Reiniciar MailHog:
   ```bash
   docker stop $(docker ps -q --filter ancestor=mailhog/mailhog)
   docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog
   ```

3. Verificar portas:
   ```bash
   netstat -an | grep 1025
   netstat -an | grep 8025
   ```

### ❌ Erro de autenticação

**Problema:** `EAUTH` com MailHog

**Solução:** MailHog não requer autenticação. Remova ou deixe vazio:
```env
SMTP_USER=
SMTP_PASS=
```

### ❌ Domínio não permitido

**Problema:** `EENVELOPE` - domain not allowed

**Soluções:**
1. Para MailHog: Verificar se está realmente detectando MailHog
2. Para produção: Configurar `SMTP_FROM` com domínio verificado
3. Para Mailtrap Live: Usar domínio verificado na conta

### ❌ Timeout de conexão

**Problema:** `ETIMEDOUT`

**Soluções:**
1. Verificar firewall
2. Testar conectividade:
   ```bash
   telnet smtp.servidor.com 587
   ```
3. Verificar configurações de proxy

### ❌ Problemas de TLS/SSL

**Problema:** Erros relacionados a `STARTTLS` ou certificados

**Soluções:**
1. Para desenvolvimento:
   ```env
   SMTP_REJECT_UNAUTHORIZED=false
   ```

2. Testar diferentes portas:
   - `587` - STARTTLS
   - `465` - SSL
   - `25` - Sem criptografia (não recomendado)

### 🔍 Debug Avançado

Habilitar logs detalhados:

```env
NODE_ENV=development
```

Ou via código:
```typescript
// Verificar status do serviço
const stats = emailService.getStats();
console.log('Stats:', stats);

// Health check
const isHealthy = await emailService.healthCheck();
console.log('Healthy:', isHealthy);

// Forçar reconexão
const reconnected = await emailService.reconnect();
console.log('Reconnected:', reconnected);
```

## 📚 Templates de Email

Os templates ficam em `src/templates/email/`:

```
src/templates/email/
├── password-reset/
│   ├── template.hbs     # Template HTML
│   ├── template.txt     # Template texto (opcional)
│   └── config.json      # Configurações (assunto, etc.)
├── password-reset-confirmation/
└── suspicious-activity/
```

### Exemplo de Template

**template.hbs:**
```handlebars
<h2>Olá, {{name}}!</h2>
<p>Você solicitou a redefinição de sua senha.</p>
<a href="{{resetUrl}}">Redefinir Senha</a>
<p>Este link expira em {{expiresInMinutes}} minutos.</p>
```

**config.json:**
```json
{
  "subject": "Redefinição de Senha - SEMTAS"
}
```

## 🔒 Segurança

### Boas Práticas

1. **Nunca commitar credenciais** no código
2. **Usar variáveis de ambiente** para configurações sensíveis
3. **Validar emails** antes do envio
4. **Rate limiting** para prevenir spam
5. **Logs sem dados sensíveis** (emails mascarados)

### Configurações de Produção

```env
# Segurança rigorosa
SMTP_REJECT_UNAUTHORIZED=true
NODE_ENV=production

# Rate limiting (implementar no controller)
EMAIL_RATE_LIMIT=10  # emails por minuto

# Monitoramento
EMAIL_ALERT_FAILURES=true
```

## 📞 Suporte

Para problemas ou dúvidas:

1. **Verificar logs** da aplicação
2. **Executar script de teste** `node scripts/test-mailhog.js`
3. **Consultar documentação** do provedor SMTP
4. **Contatar equipe** de desenvolvimento

---

**Última atualização:** $(date)
**Versão:** 1.0.0