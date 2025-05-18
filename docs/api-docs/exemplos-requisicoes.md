# Exemplos de Requisições e Respostas da API

Este documento fornece exemplos práticos de como consumir a API PGBen, cobrindo os principais endpoints e cenários de uso.

## Índice

1. [Autenticação](#autenticação)
2. [Cidadão](#cidadão)
3. [Benefício](#benefício)
4. [Documento](#documento)
5. [Consulta](#consulta)
6. [Administrativo](#administrativo)

## Autenticação

### 1. Visão Geral

A autenticação na API PGBen utiliza JWT (JSON Web Tokens) com dois tipos de tokens:
- **Access Token**: Usado para autenticar requisições (validade curta)
- **Refresh Token**: Usado para obter um novo access token (validade longa)

### 2. Login

#### Requisição:
```http
POST /v1/auth/login
Content-Type: application/json

{
  "email": "usuario@exemplo.com",
  "senha": "s3nh4S3gur@"
}
```

#### Resposta de Sucesso (200 OK):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMCIsIm5hbWUiOiJKb8OjbyBkYSBTaWx2YSIsImVtYWlsIjoidXN1YXJpb0BleGVtcGxvLmNvbSIsInBlcmZpc0lEcyI6WyI2NjBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDExMSJdLCJwZXJmaXMiOlsiQ0lEQURBRSJdLCJpYXQiOjE2MjEzMjQwMDAsImV4cCI6MTYyMTMyNzYwMCwiaXNzIjoiUEdCZW4gQVBJIn0",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMCIsImlhdCI6MTYyMTMyNDAwMCwibmJmIjoxNjIxMzI0MDAwLCJleHAiOjE2MjM5MTYwMDAsImlzcyI6IlBHQmVuIEFQSSJ9",
  "expiresIn": 3600,
  "tipoToken": "Bearer",
  "usuario": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nome": "João da Silva",
    "email": "usuario@exemplo.com",
    "perfis": ["CIDADAO"]
  }
}
```

#### Cenários de Erro:

**Credenciais Inválidas (400 Bad Request)**
```json
{
  "statusCode": 400,
  "timestamp": "2025-05-17T21:50:07.000Z",
  "path": "/v1/auth/login",
  "message": "Credenciais inválidas",
  "errorCode": "AUTH_001"
}
```

**Conta Bloqueada (403 Forbidden)**
```json
{
  "statusCode": 403,
  "timestamp": "2025-05-17T21:50:07.000Z",
  "path": "/v1/auth/login",
  "message": "Conta bloqueada por excesso de tentativas",
  "errorCode": "AUTH_003",
  "tentativasRestantes": 2,
  "desbloqueioEm": "2025-05-17T22:20:07.000Z"
}
```

### 3. Uso do Token em Requisições

Após obter o token, inclua-o no cabeçalho `Authorization` de todas as requisições autenticadas:

```http
GET /v1/meus-dados
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Renovação de Token

#### Requisição:
```http
POST /v1/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Resposta de Sucesso (200 OK):
```json
{
  "accessToken": "novo.access.token.gerado",
  "refreshToken": "novo.refresh.token.gerado",
  "expiresIn": 3600,
  "tipoToken": "Bearer"
}
```

#### Cenários de Erro:

**Refresh Token Inválido (401 Unauthorized)**
```json
{
  "statusCode": 401,
  "timestamp": "2025-05-17T21:50:07.000Z",
  "path": "/v1/auth/refresh-token",
  "message": "Refresh token inválido ou expirado",
  "errorCode": "AUTH_007"
}
```

### 5. Tratamento de Erros de Autenticação

#### Token Expirado (401 Unauthorized)
```json
{
  "statusCode": 401,
  "timestamp": "2025-05-17T21:50:07.000Z",
  "path": "/v1/algum-recurso",
  "message": "Token expirado",
  "errorCode": "AUTH_006"
}
```

#### Token Inválido (401 Unauthorized)
```json
{
  "statusCode": 401,
  "timestamp": "2025-05-17T21:50:07.000Z",
  "path": "/v1/algum-recurso",
  "message": "Token inválido",
  "errorCode": "AUTH_005"
}
```

#### Acesso Negado (403 Forbidden)
```json
{
  "statusCode": 403,
  "timestamp": "2025-05-17T21:50:07.000Z",
  "path": "/v1/recurso-restrito",
  "message": "Acesso negado. Permissão insuficiente.",
  "errorCode": "AUTH_009",
  "permissaoNecessaria": "BENEFICIO_APROVAR"
}
```

### 6. Boas Práticas

1. **Armazenamento Seguro**:
   - Armazene o refresh token em HTTP-Only cookies
   - Armazene o access token em memória (não em localStorage/sessionStorage)

2. **Rotação de Tokens**:
   - Implemente renovação automática do access token antes da expiração
   - Utilize o refresh token uma única vez (single-use)

3. **Tratamento de Erros**:
   - Implemente lógica para redirecionar para login quando:
     - Receber 401 (não autenticado)
     - Receber 403 (não autorizado)
     - O refresh token expirar

4. **Segurança**:
   - Nunca exponha tokens em logs
   - Utilize HTTPS em todas as requisições
   - Implemente revogação de tokens em caso de suspeita de comprometimento

### 7. Exemplo de Implementação Cliente

```javascript
class AuthService {
  constructor() {
    this.accessToken = null;
    this.refreshToken = localStorage.getItem('refreshToken');
    this.tokenExpiration = null;
    this.refreshTimeout = null;
  }


  async login(email, senha) {
    try {
      const response = await fetch('/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha no login');
      }

      const data = await response.json();
      this.setSession(data);
      return data;
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  }

  setSession(authResult) {
    this.accessToken = authResult.accessToken;
    this.refreshToken = authResult.refreshToken;
    this.tokenExpiration = Date.now() + (authResult.expiresIn * 1000);
    
    // Armazena o refresh token em um cookie HTTP-Only (deve ser feito pelo servidor)
    document.cookie = `refreshToken=${authResult.refreshToken}; HttpOnly; Secure; SameSite=Strict; path=/`;
    
    // Agenda renovação do token
    this.scheduleTokenRefresh();
  }

  async refreshAccessToken() {
    try {
      const response = await fetch('/v1/auth/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken })
      });

      if (!response.ok) {
        // Se o refresh falhar, desloga o usuário
        this.logout();
        window.location.href = '/login';
        return null;
      }

      const data = await response.json();
      this.setSession(data);
      return data.accessToken;
    } catch (error) {
      console.error('Erro ao renovar token:', error);
      this.logout();
      window.location.href = '/login';
      return null;
    }
  }

  scheduleTokenRefresh() {
    // Agenda a renovação 1 minuto antes da expiração
    const timeUntilRefresh = (this.tokenExpiration - Date.now() - 60000);
    
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
    
    this.refreshTimeout = setTimeout(() => {
      this.refreshAccessToken();
    }, timeUntilRefresh);
  }

  getAccessToken() {
    return this.accessToken;
  }

  isAuthenticated() {
    return !!this.accessToken && Date.now() < this.tokenExpiration;
  }

  logout() {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiration = null;
    
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
    
    // Remove o cookie do refresh token
    document.cookie = 'refreshToken=; Max-Age=0; path=/;';
  }
}

// Interceptor para adicionar token às requisições
const apiClient = {
  async request(url, options = {}) {
    const authService = new AuthService();
    let token = authService.getAccessToken();
    
    // Se o token está prestes a expirar, renova
    if (authService.tokenExpiration && (authService.tokenExpiration - Date.now() < 120000)) {
      token = await authService.refreshAccessToken();
    }
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });
      
      // Se token expirou, tenta renovar e repete a requisição
      if (response.status === 401) {
        const error = await response.json();
        if (error.errorCode === 'AUTH_006') { // Token expirado
          const newToken = await authService.refreshAccessToken();
          if (newToken) {
            headers['Authorization'] = `Bearer ${newToken}`;
            return fetch(url, {
              ...options,
              headers,
            });
          }
        }
        // Se chegou aqui, redireciona para login
        authService.logout();
        window.location.href = '/login';
        return Promise.reject(new Error('Sessão expirada'));
      }
      
      return response;
    } catch (error) {
      console.error('Erro na requisição:', error);
      throw error;
    }
  }
};
```

**Requisição:**
```http
POST /v1/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Resposta de Sucesso (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "tipoToken": "Bearer"
}
```

## Cidadão

### 1. Cadastro de Novo Cidadão

**Requisição:**
```http
POST /v1/cidadao
Content-Type: application/json

{
  "nomeCompleto": "Maria Oliveira",
  "cpf": "123.456.789-09",
  "dataNascimento": "1985-05-15",
  "email": "maria.oliveira@exemplo.com",
  "senha": "S3nh4F0rt3!",
  "telefone": "(11) 98765-4321",
  "endereco": {
    "cep": "01310-100",
    "logradouro": "Avenida Paulista",
    "numero": "1000",
    "complemento": "Apto 101",
    "bairro": "Bela Vista",
    "cidade": "São Paulo",
    "uf": "SP"
  }
}
```

**Resposta de Sucesso (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "nomeCompleto": "Maria Oliveira",
  "cpf": "123.456.789-09",
  "dataNascimento": "1985-05-15",
  "email": "maria.oliveira@exemplo.com",
  "telefone": "(11) 98765-4321",
  "endereco": {
    "id": "660e8400-e29b-41d4-a716-446655441111",
    "cep": "01310-100",
    "logradouro": "Avenida Paulista",
    "numero": "1000",
    "complemento": "Apto 101",
    "bairro": "Bela Vista",
    "cidade": "São Paulo",
    "uf": "SP"
  },
  "dataCriacao": "2025-05-17T14:30:00Z",
  "status": "ATIVO"
}
```

### 2. Consulta de Dados do Cidadão

**Requisição:**
```http
GET /v1/cidadao/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Resposta de Sucesso (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "nomeCompleto": "Maria Oliveira",
  "cpf": "123.456.789-09",
  "dataNascimento": "1985-05-15",
  "email": "maria.oliveira@exemplo.com",
  "telefone": "(11) 98765-4321",
  "endereco": {
    "id": "660e8400-e29b-41d4-a716-446655441111",
    "cep": "01310-100",
    "logradouro": "Avenida Paulista",
    "numero": "1000",
    "complemento": "Apto 101",
    "bairro": "Bela Vista",
    "cidade": "São Paulo",
    "uf": "SP"
  },
  "dataCriacao": "2025-05-17T14:30:00Z",
  "status": "ATIVO"
}
```

## Benefício

### 1. Solicitação de Benefício

**Requisição:**
```http
POST /v1/beneficio/solicitar
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "tipoBeneficio": "AUXILIO_EMERGENCIAL",
  "documentos": [
    {
      "tipoDocumento": "COMPROVANTE_RENDA",
      "documentoId": "770e8400-e29b-41d4-a716-446655442222"
    },
    {
      "tipoDocumento": "COMPROVANTE_RESIDENCIA",
      "documentoId": "880e8400-e29b-41d4-a716-446655443333"
    }
  ]
}
```

**Resposta de Sucesso (202 Accepted):**
```json
{
  "id": "990e8400-e29b-41d4-a716-446655444444",
  "protocolo": "PGB202505170001",
  "tipoBeneficio": "AUXILIO_EMERGENCIAL",
  "status": "EM_ANALISE",
  "dataSolicitacao": "2025-05-17T15:30:00Z",
  "mensagem": "Sua solicitação foi recebida e está em análise"
}
```

### 2. Consulta de Benefícios do Cidadão

**Requisição:**
```http
GET /v1/beneficio/meus-beneficios
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Resposta de Sucesso (200 OK):**
```json
{
  "itens": [
    {
      "id": "990e8400-e29b-41d4-a716-446655444444",
      "protocolo": "PGB202505170001",
      "tipoBeneficio": "AUXILIO_EMERGENCIAL",
      "status": "CONCEDIDO",
      "valor": 600.00,
      "dataSolicitacao": "2025-05-10T10:15:00Z",
      "dataConcessao": "2025-05-12T14:30:00Z",
      "dataInicio": "2025-06-01T00:00:00Z",
      "dataFim": "2025-08-31T23:59:59Z"
    },
    {
      "id": "aa0e8400-e29b-41d4-a716-446655445555",
      "protocolo": "PGB202503150042",
      "tipoBeneficio": "BOLSA_FAMILIA",
      "status": "CANCELADO",
      "valor": 350.00,
      "dataSolicitacao": "2025-03-15T09:30:00Z",
      "dataConcessao": "2025-03-20T11:45:00Z",
      "dataInicio": "2025-04-01T00:00:00Z",
      "dataFim": "2024-05-15T23:59:59Z",
      "motivoCancelamento": "Inatividade superior a 6 meses"
    }
  ],
  "totalItens": 2,
  "pagina": 1,
  "itensPorPagina": 10
}
```

## Documento

### 1. Upload de Documento

**Requisição (multipart/form-data):**
```http
POST /v1/documento/upload
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="arquivo"; filename="comprovante_renda.pdf"
Content-Type: application/pdf

<conteúdo binário do arquivo>
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="tipoDocumento"

COMPROVANTE_RENDA
------WebKitFormBoundary7MA4YWxkTrZu0gW--
```

**Resposta de Sucesso (201 Created):**
```json
{
  "id": "bb0e8400-e29b-41d4-a716-446655446666",
  "nomeArquivo": "comprovante_renda.pdf",
  "tipoDocumento": "COMPROVANTE_RENDA",
  "tamanhoBytes": 102400,
  "contentType": "application/pdf",
  "urlDownload": "https://storage.pgben.gov.br/documentos/bb0e8400-e29b-41d4-a716-446655446666.pdf",
  "dataUpload": "2025-05-17T16:45:00Z",
  "status": "VALIDO"
}
```

## Consulta

### 1. Consulta de Situação Cadastral

**Requisição:**
```http
GET /v1/consulta/situacao-cadastral?cpf=12345678909
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Resposta de Sucesso (200 OK):**
```json
{
  "cpf": "123.456.789-09",
  "nome": "MARIA OLIVEIRA",
  "situacaoCadastral": "REGULAR",
  "mensagem": "Cidadão apto a receber benefícios",
  "beneficiosAtivos": [
    {
      "tipoBeneficio": "AUXILIO_EMERGENCIAL",
      "dataInicio": "2025-06-01",
      "dataFim": "2025-08-31",
      "valor": 600.00,
      "status": "CONCEDIDO"
    }
  ]
}
```

## Administrativo

### 1. Listagem de Usuários (Admin)

**Requisição:**
```http
GET /v1/admin/usuarios?pagina=1&itensPorPagina=10
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Resposta de Sucesso (200 OK):**
```json
{
  "itens": [
    {
      "id": "110e8400-e29b-41d4-a716-446655447777",
      "nome": "Administrador do Sistema",
      "email": "admin@pgben.gov.br",
      "perfis": ["ADMIN"],
      "dataCriacao": "2024-01-01T00:00:00Z",
      "ultimoAcesso": "2025-05-17T14:30:00Z",
      "status": "ATIVO"
    },
    {
      "id": "220e8400-e29b-41d4-a716-446655448888",
      "nome": "Analista de Benefícios",
      "email": "analista@pgben.gov.br",
      "perfis": ["ANALISTA"],
      "dataCriacao": "2024-01-15T00:00:00Z",
      "ultimoAcesso": "2025-05-17T13:45:00Z",
      "status": "ATIVO"
    }
  ],
  "totalItens": 2,
  "pagina": 1,
  "itensPorPagina": 10
}
```

### 2. Atualização de Status de Benefício (Admin)

**Requisição:**
```http
PATCH /v1/admin/beneficio/990e8400-e29b-41d4-a716-446655444444/status
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "novoStatus": "CANCELADO",
  "motivo": "Documentação inconsistente",
  "notificarCidadao": true
}
```

**Resposta de Sucesso (200 OK):**
```json
{
  "id": "990e8400-e29b-41d4-a716-446655444444",
  "protocolo": "PGB202505170001",
  "statusAnterior": "EM_ANALISE",
  "novoStatus": "CANCELADO",
  "dataAtualizacao": "2025-05-17T17:30:00Z",
  "mensagem": "Status do benefício atualizado com sucesso"
}
```

## Considerações Finais

1. **Autenticação**: Todos os endpoints (exceto login) requerem o token JWT no header `Authorization`.
2. **Paginação**: As listagens suportam paginação com os parâmetros `pagina` e `itensPorPagina`.
3. **Formato de Datas**: Utilize o formato ISO 8601 (YYYY-MM-DDThh:mm:ssZ) para datas.
4. **Validações**: Consulte a documentação de erros para códigos de erro específicos.
5. **Versão da API**: Todos os endpoints estão prefixados com `/v1/` para controle de versão.
