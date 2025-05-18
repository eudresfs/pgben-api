# Autenticação e Tratamento de Erros

## Visão Geral

Este documento descreve o padrão de respostas de erro e os códigos de erro utilizados na API do PGBen. Todos os erros seguem um formato padronizado para facilitar o tratamento pelos clientes.

## Estrutura Padrão de Resposta de Erro

Todas as respostas de erro seguem o seguinte formato:

```typescript
interface ErrorResponse {
  statusCode: number;      // Código de status HTTP
  timestamp: string;      // Data e hora do erro em ISO 8601
  path: string;           // Caminho da requisição que causou o erro
  message: string;        // Mensagem de erro amigável
  errorCode: string;      // Código de erro único para identificação
  error?: string;         // Tipo do erro (opcional, para compatibilidade)
  details?: any;          // Detalhes adicionais sobre o erro
  validationErrors?: Array<{ // Apenas para erros de validação
    field: string;
    message: string;
    code: string;
  }>;
}
```

## Autenticação JWT

### Visão Geral
A API do PGBen utiliza JSON Web Tokens (JWT) para autenticação. Cada requisição deve incluir um token JWT válido no header `Authorization`.

### Fluxo de Autenticação

1. **Obtenção do Token**
   ```http
   POST /v1/auth/login
   Content-Type: application/json
   
   {
     "email": "usuario@exemplo.com",
     "senha": "suaSenha123"
   }
   ```

2. **Resposta de Sucesso**
   ```http
   HTTP/1.1 200 OK
   Content-Type: application/json
   
   {
     "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "expires_in": 3600,
     "token_type": "Bearer",
     "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   }
   ```

3. **Utilização do Token**
   ```http
   GET /v1/recurso
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### Códigos de Erro de Autenticação

| Código HTTP | Código de Erro | Descrição | Solução |
|-------------|----------------|-----------|----------|
| 400 | AUTH_001 | Credenciais inválidas | Verifique o e-mail e senha fornecidos |
| 400 | AUTH_002 | Conta desativada | Entre em contato com o suporte |
| 400 | AUTH_003 | Conta bloqueada | Siga as instruções de desbloqueio ou entre em contato com o suporte |
| 400 | AUTH_004 | MFA necessário | Forneça o código de autenticação de dois fatores |
| 401 | AUTH_005 | Token inválido | Obtenha um novo token de autenticação |
| 401 | AUTH_006 | Token expirado | Renove o token usando o refresh token |
| 401 | AUTH_007 | Refresh token inválido | Faça login novamente |
| 401 | AUTH_008 | Sessão expirada | Faça login novamente |
| 403 | AUTH_009 | Acesso negado | Verifique suas permissões |
| 403 | AUTH_010 | IP não autorizado | Utilize uma rede autorizada |
| 403 | AUTH_011 | Dispositivo não autorizado | Registre este dispositivo |
| 429 | AUTH_012 | Muitas tentativas | Tente novamente após 15 minutos |

### Exemplos de Respostas de Erro

#### 1. Credenciais Inválidas (AUTH_001)
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "statusCode": 400,
  "timestamp": "2025-05-17T21:45:23.000Z",
  "path": "/v1/auth/login",
  "message": "Credenciais inválidas",
  "errorCode": "AUTH_001",
  "error": "Bad Request"
}
```

#### 2. Token Expirado (AUTH_006)
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "statusCode": 401,
  "timestamp": "2025-05-17T21:45:23.000Z",
  "path": "/v1/recurso",
  "message": "Token expirado",
  "errorCode": "AUTH_006",
  "error": "TokenExpiredError",
  "expiredAt": "2025-05-17T10:00:00.000Z"
}
```

#### 3. Acesso Negado (AUTH_009)
```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "statusCode": 403,
  "timestamp": "2025-05-17T21:45:23.000Z",
  "path": "/v1/recurso-restringido",
  "message": "Acesso negado: permissão insuficiente",
  "errorCode": "AUTH_009",
  "error": "Forbidden",
  "requiredRole": "ADMIN",
  "userRole": "USER"
}
```

#### 4. Muitas Tentativas (AUTH_012)
```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 900

{
  "statusCode": 429,
  "timestamp": "2025-05-17T21:45:23.000Z",
  "path": "/v1/auth/login",
  "message": "Muitas tentativas de login. Tente novamente em 15 minutos.",
  "errorCode": "AUTH_012",
  "error": "Too Many Requests",
  "retryAfter": 900
}
```

## Validação de Dados

### Códigos de Erro de Validação

A API retorna códigos de erro específicos para problemas de validação. Cada erro de validação inclui:

- `field`: Nome do campo com problema
- `message`: Mensagem descritiva do erro
- `code`: Código de erro específico

#### Códigos Comuns de Validação

| Código | Descrição | Exemplo |
|--------|-----------|----------|
| VAL_001 | Campo obrigatório | "O campo 'email' é obrigatório" |
| VAL_002 | Formato inválido | "Formato de e-mail inválido" |
| VAL_003 | Tamanho mínimo | "O campo 'senha' deve ter no mínimo 8 caracteres" |
| VAL_004 | Tamanho máximo | "O campo 'nome' deve ter no máximo 100 caracteres" |
| VAL_005 | Valor fora do intervalo | "O valor deve estar entre 1 e 100" |
| VAL_006 | Data inválida | "Data de nascimento inválida" |
| VAL_007 | CPF inválido | "CPF inválido" |
| VAL_008 | CNPJ inválido | "CNPJ inválido" |
| VAL_009 | E-mail inválido | "Formato de e-mail inválido" |
| VAL_010 | URL inválida | "URL inválida" |
| VAL_011 | Valor único violado | "Este e-mail já está em uso" |
| VAL_012 | Valor não permitido | "Estado não suportado" |
| VAL_013 | Expressão regular inválida | "Formato de telefone inválido" |
| VAL_014 | Documento inválido | "Número de documento inválido" |
| VAL_015 | CEP inválido | "CEP inválido" |

### Exemplo de Resposta de Validação

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "statusCode": 400,
  "timestamp": "2025-05-17T21:45:23.000Z",
  "path": "/v1/cidadao",
  "message": "Erro de validação nos dados fornecidos",
  "errorCode": "VALIDATION_ERROR",
  "validationErrors": [
    {
      "field": "email",
      "message": "Formato de e-mail inválido",
      "code": "VAL_009"
    },
    {
      "field": "senha",
      "message": "A senha deve ter no mínimo 8 caracteres",
      "code": "VAL_003",
      "minLength": 8
    },
    {
      "field": "dataNascimento",
      "message": "Data de nascimento inválida",
      "code": "VAL_006",
      "format": "YYYY-MM-DD"
    },
    {
      "field": "cpf",
      "message": "CPF inválido",
      "code": "VAL_007"
    },
    {
      "field": "telefone",
      "message": "Formato de telefone inválido. Use (XX) XXXX-XXXX",
      "code": "VAL_013",
      "pattern": "^\\(\\d{2}\\) \\d{4,5}-\\d{4}$"
    }
  ]
}
```

## Erros Comuns da API

### 1. Erros de Autenticação e Autorização

| Código HTTP | Código de Erro | Descrição | Solução |
|-------------|----------------|-----------|----------|
| 400 | AUTH_* | Ver seção de autenticação | - |
| 401 | UNAUTHORIZED | Credenciais ausentes ou inválidas | Forneça um token de autenticação válido |
| 403 | FORBIDDEN | Permissão insuficiente | Verifique suas permissões de acesso |
| 403 | IP_BLOCKED | IP bloqueado | Entre em contato com o suporte |
| 403 | DEVICE_NOT_VERIFIED | Dispositivo não verificado | Complete a verificação do dispositivo |
| 403 | ACCOUNT_SUSPENDED | Conta suspensa | Entre em contato com o suporte |
| 419 | SESSION_EXPIRED | Sessão expirada | Faça login novamente |

### 2. Erros de Validação

| Código HTTP | Código de Erro | Descrição | Solução |
|-------------|----------------|-----------|----------|
| 400 | VALIDATION_ERROR | Erro de validação | Verifique os detalhes do erro |
| 400 | INVALID_INPUT | Entrada inválida | Verifique os dados fornecidos |
| 400 | MISSING_FIELDS | Campos obrigatórios ausentes | Preencha todos os campos obrigatórios |
| 400 | INVALID_FORMAT | Formato inválido | Verifique o formato dos dados |
| 400 | INVALID_DATE | Data inválida | Use o formato YYYY-MM-DD |
| 400 | INVALID_DOCUMENT | Documento inválido | Verifique o número do documento |
| 400 | INVALID_EMAIL | E-mail inválido | Forneça um e-mail válido |
| 400 | WEAK_PASSWORD | Senha fraca | Use uma senha mais forte |

### 3. Erros de Negócio

| Código HTTP | Código de Erro | Descrição | Solução |
|-------------|----------------|-----------|----------|
| 404 | NOT_FOUND | Recurso não encontrado | Verifique o ID do recurso |
| 404 | USER_NOT_FOUND | Usuário não encontrado | Verifique o ID do usuário |
| 404 | RESOURCE_NOT_FOUND | Recurso não encontrado | Verifique os parâmetros da requisição |
| 409 | CONFLICT | Conflito de dados | Verifique os dados fornecidos |
| 409 | DUPLICATE_ENTRY | Registro duplicado | O recurso já existe |
| 409 | RESOURCE_IN_USE | Recurso em uso | O recurso está sendo usado por outro processo |
| 410 | GONE | Recurso não está mais disponível | O recurso foi removido |
| 422 | UNPROCESSABLE_ENTITY | Entidade não processável | Verifique os dados fornecidos |
| 423 | LOCKED | Recurso bloqueado | Tente novamente mais tarde |
| 424 | FAILED_DEPENDENCY | Falha de dependência | Um serviço necessário não está disponível |

### 4. Erros de Limitação de Taxa

| Código HTTP | Código de Erro | Descrição | Solução |
|-------------|----------------|-----------|----------|
| 429 | RATE_LIMIT_EXCEEDED | Limite de requisições excedido | Tente novamente mais tarde |
| 429 | TOO_MANY_REQUESTS | Muitas requisições | Reduza a frequência das requisições |
| 429 | CONCURRENT_REQUEST_LIMIT | Limite de requisições simultâneas excedido | Aguarde as requisições anteriores terminarem |

### 5. Erros do Servidor

| Código HTTP | Código de Erro | Descrição | Solução |
|-------------|----------------|-----------|----------|
| 500 | INTERNAL_ERROR | Erro interno do servidor | Tente novamente mais tarde |
| 501 | NOT_IMPLEMENTED | Funcionalidade não implementada | - |
| 502 | BAD_GATEWAY | Erro de gateway | Tente novamente mais tarde |
| 503 | SERVICE_UNAVAILABLE | Serviço indisponível | Tente novamente mais tarde |
| 504 | GATEWAY_TIMEOUT | Tempo limite do gateway | Tente novamente mais tarde |
| 507 | INSUFFICIENT_STORAGE | Armazenamento insuficiente | Entre em contato com o suporte |

## Exemplos de Respostas de Erro

### 1. Recurso Não Encontrado (404)

```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "statusCode": 404,
  "timestamp": "2025-05-17T21:45:23.000Z",
  "path": "/v1/cidadao/999",
  "message": "Cidadão não encontrado",
  "errorCode": "NOT_FOUND",
  "details": {
    "resource": "Cidadao",
    "id": "999"
  }
}
```

### 2. Conflito - Recurso Já Existe (409)

```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{
  "statusCode": 409,
  "timestamp": "2025-05-17T21:45:23.000Z",
  "path": "/v1/usuarios",
  "message": "Já existe um usuário com este e-mail",
  "errorCode": "DUPLICATE_ENTRY",
  "details": {
    "field": "email",
    "value": "usuario@exemplo.com",
    "resource": "Usuario",
    "constraint": "UQ_usuarios_email"
  }
}
```

### 3. Erro de Validação (400)

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "statusCode": 400,
  "timestamp": "2025-05-17T21:45:23.000Z",
  "path": "/v1/cidadao",
  "message": "Erro de validação nos dados fornecidos",
  "errorCode": "VALIDATION_ERROR",
  "validationErrors": [
    {
      "field": "email",
      "message": "Formato de e-mail inválido",
      "code": "VAL_009"
    },
    {
      "field": "dataNascimento",
      "message": "Data de nascimento inválida",
      "code": "VAL_006"
    }
  ]
}
```

### 4. Limite de Taxa Excedido (429)

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 60
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1621290000

{
  "statusCode": 429,
  "timestamp": "2025-05-17T21:45:23.000Z",
  "path": "/v1/cidadao",
  "message": "Limite de requisições excedido. Tente novamente em 1 minuto.",
  "errorCode": "RATE_LIMIT_EXCEEDED",
  "details": {
    "limit": 100,
    "remaining": 0,
    "reset": 1621290000,
    "retryAfter": 60
  }
}
```

### 5. Erro Interno do Servidor (500)

```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{
  "statusCode": 500,
  "timestamp": "2025-05-17T21:45:23.000Z",
  "path": "/v1/processamento",
  "message": "Ocorreu um erro inesperado",
  "errorCode": "INTERNAL_ERROR",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}

## Erros por Domínio

### 1. Domínio de Cidadão (CID)

| Código | HTTP Status | Descrição | Solução |
|--------|-------------|-----------|----------|
| CID_001 | 400 | CPF já cadastrado | Utilize outro CPF ou recupere o acesso à conta existente |
| CID_002 | 400 | Data de nascimento inválida | Forneça uma data válida |
| CID_003 | 400 | Cidadão menor de idade | O cidadão deve ser maior de 18 anos |
| CID_004 | 404 | Cidadão não encontrado | Verifique o ID do cidadão |
| CID_005 | 409 | Cidadão já possui benefício ativo | Encerre o benefício atual antes de solicitar outro |
| CID_006 | 400 | Documento do cidadão inválido | Verifique os dados do documento |
| CID_007 | 403 | Acesso negado aos dados do cidadão | Verifique suas permissões |
| CID_008 | 400 | CEP inválido | Verifique o CEP informado |
| CID_009 | 400 | Telefone inválido | Forneça um número de telefone válido |
| CID_010 | 400 | E-mail já em uso | Utilize outro endereço de e-mail |

### 2. Domínio de Benefício (BEN)

| Código | HTTP Status | Descrição | Solução |
|--------|-------------|-----------|----------|
| BEN_001 | 400 | Benefício não disponível | Verifique a disponibilidade do benefício |
| BEN_002 | 400 | Período de carência não atendido | Aguarde o término do período de carência |
| BEN_003 | 400 | Benefício já concedido | Verifique os benefícios ativos do cidadão |
| BEN_004 | 404 | Benefício não encontrado | Verifique o ID do benefício |
| BEN_005 | 400 | Data de início inválida | A data de início deve ser futura |
| BEN_006 | 400 | Documentação incompleta | Envie todos os documentos necessários |
| BEN_007 | 400 | Benefício fora do período de solicitação | Verique as datas de abertura e fechamento |
| BEN_008 | 400 | Limite de benefícios atingido | O cidadão já possui o número máximo de benefícios |
| BEN_009 | 400 | Benefício expirado | O prazo para utilização expirou |
| BEN_010 | 400 | Benefício já utilizado | O benefício já foi utilizado |

### 3. Domínio de Documento (DOC)

| Código | HTTP Status | Descrição | Solução |
|--------|-------------|-----------|----------|
| DOC_001 | 400 | Tipo de documento não suportado | Verifique os formatos aceitos |
| DOC_002 | 413 | Tamanho do arquivo excedido | O arquivo deve ter no máximo 10MB |
| DOC_003 | 400 | Formato de arquivo inválido | Utilize os formatos aceitos (PDF, JPG, PNG) |
| DOC_004 | 404 | Documento não encontrado | Verifique o ID do documento |
| DOC_005 | 400 | Documento expirado | Faça upload de um documento válido |
| DOC_006 | 400 | Documento ilegível | O documento não pôde ser processado |
| DOC_007 | 400 | Dados do documento não conferem | Verifique as informações do documento |
| DOC_008 | 400 | Assinatura digital inválida | O documento não possui uma assinatura válida |
| DOC_009 | 400 | Documento já vinculado | Este documento já está em uso |
| DOC_010 | 400 | Validação de documento falhou | Verifique os dados do documento |

## Boas Práticas para Tratamento de Erros no Cliente

### 1. Tratamento Genérico de Erros

```javascript
async function fazerRequisicao(url, options = {}) {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      
      // Mapeamento de códigos de erro para mensagens amigáveis
      const errorMessages = {
        // Erros de autenticação
        'AUTH_001': 'Credenciais inválidas. Verifique seu e-mail e senha.',
        'AUTH_006': 'Sessão expirada. Por favor, faça login novamente.',
        
        // Erros de validação
        'VAL_001': 'Campo obrigatório não preenchido.',
        'VAL_002': 'Formato de dado inválido.',
        'VAL_003': 'Tamanho mínimo não atendido.',
        
        // Erros de negócio
        'CID_001': 'CPF já cadastrado no sistema.',
        'BEN_003': 'Benefício já concedido para este cidadão.',
        'DOC_002': 'O arquivo enviado é muito grande. Tamanho máximo: 10MB.'
      };
      
      // Mensagem padrão caso o código não esteja mapeado
      const defaultMessage = `Erro na requisição: ${response.status} ${response.statusText}`;
      
      throw new Error({
        ...error,
        userMessage: error.errorCode && errorMessages[error.errorCode] 
          ? errorMessages[error.errorCode] 
          : error.message || defaultMessage,
        status: response.status,
        url: response.url
      });
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erro na requisição:', error);
    throw error;
  }
}
```

### 2. Tratamento Específico por Tipo de Erro

```javascript
// Exemplo de componente React para tratamento de erros
function ErrorHandler({ error, onRetry }) {
  if (!error) return null;

  // Mapeamento de códigos de status para ações
  const getAction = (status) => {
    switch(status) {
      case 401:
        return {
          message: 'Sessão expirada',
          actionText: 'Fazer login',
          onAction: () => window.location.href = '/login'
        };
      case 403:
        return {
          message: 'Acesso negado',
          actionText: 'Voltar',
          onAction: () => window.history.back()
        };
      case 429:
        return {
          message: 'Muitas requisições',
          actionText: 'Tentar novamente',
          onAction: onRetry
        };
      default:
        return {
          message: 'Ocorreu um erro inesperado',
          actionText: 'Tentar novamente',
          onAction: onRetry
        };
    }
  };

  const { message, actionText, onAction } = getAction(error.status);

  return (
    <div className="error-container">
      <div className="error-icon">⚠️</div>
      <h2>{message}</h2>
      <p>{error.userMessage || error.message}</p>
      
      {error.validationErrors && (
        <div className="validation-errors">
          <h4>Corrija os seguintes erros:</h4>
          <ul>
            {error.validationErrors.map((err, index) => (
              <li key={index}>
                <strong>{err.field}:</strong> {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <button onClick={onAction}>
        {actionText}
      </button>
      
      {error.status >= 500 && (
        <div className="support-info">
          <p>Se o problema persistir, entre em contato com o suporte.</p>
          <p>Código do erro: {error.errorCode || 'N/A'}</p>
          <p>ID da requisição: {error.requestId || 'N/A'}</p>
        </div>
      )}
    </div>
  );
}
```

### 3. Monitoramento e Logs

```javascript
// Exemplo de implementação de monitoramento de erros
class ErrorTracker {
  static init() {
    // Captura erros não tratados
    window.addEventListener('error', (event) => {
      this.track({
        type: 'unhandled_error',
        message: event.message,
        file: event.filename,
        line: event.lineno,
        col: event.colno,
        error: event.error
      });
    });

    // Captura rejeições de promessas não tratadas
    window.addEventListener('unhandledrejection', (event) => {
      this.track({
        type: 'unhandled_rejection',
        reason: event.reason
      });
    });
  }

  static track(error) {
    const errorData = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...error
    };

    // Envia para o serviço de monitoramento
    this.sendToAnalytics(errorData);
    
    // Log no console em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro capturado:', errorData);
    }
  }

  static sendToAnalytics(data) {
    // Implemente o envio para seu serviço de monitoramento
    // Exemplo: Sentry, LogRocket, etc.
    fetch('/api/error-tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(console.error);
  }
}

// Inicializa o rastreamento de erros
document.addEventListener('DOMContentLoaded', () => {
  ErrorTracker.init();
});
```

## Considerações de Segurança

1. **Não exponha detalhes sensíveis** em mensagens de erro
2. **Registre erros** em um serviço de monitoramento
3. **Forneça IDs de erro** únicos para rastreamento
4. **Implemente rate limiting** para prevenir ataques de força bruta
5. **Valide entradas** tanto no cliente quanto no servidor
6. **Use HTTPS** para todas as comunicações
7. **Implemente CORS** corretamente
8. **Atualize dependências** regularmente
9. **Monitore tentativas de acesso não autorizado**
10. **Documente** todos os códigos de erro e cenários de falha

## Boas Práticas para Consumidores

1. **Tratamento de Erros**
   - Sempre verifique o status code da resposta
   - Trate erros de autenticação (401, 403) solicitando novo login
   - Implemente retry com backoff exponencial para erros 5xx

2. **Renovação de Token**
   - Monitore o tempo de expiração do token
   - Implemente renovação automática antes da expiração
   - Use refresh tokens quando disponível

3. **Validação de Dados**
   - Valide os dados antes de enviar para a API
   - Exiba mensagens de erro amigáveis para o usuário final
   - Considere implementar validação em tempo real

4. **Tratamento de Offline**
   - Armazene em cache as respostas quando apropriado
   - Implemente fila para requisições offline
   - Sincronize quando a conexão for restabelecida

## Segurança

1. **Armazenamento Seguro**
   - Armazene tokens em `HttpOnly` cookies ou `localStorage` seguro
   - Nunca armazene tokens em código-fonte ou repositórios

2. **Proteção CSRF**
   - Utilize CSRF tokens em formulários web
   - Implemente CORS corretamente

3. **Logs e Monitoramento**
   - Monitore tentativas de autenticação malsucedidas
   - Implemente alertas para atividades suspeitas

---

**Última atualização**: 17/05/2025  
**Versão deste documento**: 1.0.0
