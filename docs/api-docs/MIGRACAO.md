# Guia de Migração da API PGBen

Este documento fornece orientações para migrar entre versões da API PGBen quando houver mudanças que quebrem a compatibilidade.

## Índice

- [Migrando para v1.0.0](#migrando-para-v100)
  - [Mudanças que quebram compatibilidade](#mudanças-que-quebram-compatibilidade)
  - [Novos recursos](#novos-recursos)
  - [Exemplos de migração](#exemplos-de-migração)
- [Boas práticas de migração](#boas-práticas-de-migração)
- [Suporte e ajuda](#suporte-e-ajuda)

## Migrando para v1.0.0

### Mudanças que quebram compatibilidade

#### 1. Autenticação

**Antes**:
```http
POST /auth/login
Content-Type: application/x-www-form-urlencoded

username=usuario&password=senha
```

**Depois**:
```http
POST /v1/auth/login
Content-Type: application/json

{
  "email": "usuario@exemplo.com",
  "senha": "suaSenha123"
}
```

#### 2. Estrutura de Respostas de Erro

**Antes**:
```json
{
  "error": "Mensagem de erro",
  "code": 400
}
```

**Depois**:
```json
{
  "statusCode": 400,
  "timestamp": "2025-05-17T21:45:23.000Z",
  "path": "/v1/recurso",
  "message": "Mensagem de erro descritiva",
  "errorCode": "CODIGO_ERRO"
}
```

### Novos recursos

#### 1. Paginação em Listagens

Todas as listagens agora suportam paginação:

```http
GET /v1/cidadao?page=1&limit=10
```

Resposta:
```json
{
  "data": [
    // itens da página atual
  ],
  "meta": {
    "totalItems": 100,
    "itemCount": 10,
    "itemsPerPage": 10,
    "totalPages": 10,
    "currentPage": 1
  }
}
```

#### 2. Filtros Avançados

Novos parâmetros de consulta para filtragem:

```http
GET /v1/solicitacao?status=APROVADA&dataInicio=2025-01-01&dataFim=2025-05-17
```

### Exemplos de Migração

#### Exemplo 1: Autenticação

**Código Antigo**:
```javascript
// Autenticação antiga
const response = await fetch('https://api.pgben.local/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: 'username=admin&password=senha123'
});
```

**Código Novo**:
```javascript
// Nova autenticação
const response = await fetch('https://api.pgben.local/v1/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'admin@pgben.local',
    senha: 'senha123'
  })
});

const { access_token } = await response.json();

// Usar o token nas requisições seguintes
const headers = {
  'Authorization': `Bearer ${access_token}`,
  'Content-Type': 'application/json'
};
```

#### Exemplo 2: Tratamento de Erros

**Código Antigo**:
```javascript
try {
  const response = await fetch('https://api.pgben.local/recurso');
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Erro na requisição');
  }
  return data;
} catch (error) {
  console.error('Erro:', error.message);
}
```

**Código Novo**:
```javascript
async function fazerRequisicao(url, options = {}) {
  try {
    const response = await fetch(`https://api.pgben.local/v1${url}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const data = await response.json();

    if (!response.ok) {
      // Tratamento estruturado de erros
      const error = new Error(data.message || 'Erro na requisição');
      error.code = data.errorCode;
      error.status = response.status;
      error.timestamp = data.timestamp;
      throw error;
    }

    return data;
  } catch (error) {
    console.error(`Erro ${error.code || ''}:`, error.message);
    if (error.timestamp) {
      console.error('Ocorreu em:', error.timestamp);
    }
    throw error;
  }
}

// Uso
try {
  const cidadaos = await fazerRequisicao('/cidadao');
  console.log(cidadaos);
} catch (error) {
  // Tratamento específico por tipo de erro
  if (error.status === 401) {
    // Redirecionar para login
  } else if (error.code === 'CIDADAO_NAO_ENCONTRADO') {
    // Tratar cidadão não encontrado
  }
}
```

## Boas Práticas de Migração

1. **Teste em Ambiente de Homologação**
   - Utilize o ambiente de homologação para testar as mudanças
   - Verifique todos os fluxos críticos do seu aplicativo

2. **Atualização Gradual**
   - Planeje a migração em fases
   - Considere implementar suporte às duas versões durante a transição

3. **Monitoramento**
   - Monitore os erros após a migração
   - Esteja preparado para rollback se necessário

4. **Atualize sua Documentação**
   - Revise e atualize a documentação do seu sistema
   - Documente as mudanças para sua equipe

## Suporte e Ajuda

Em caso de dúvidas ou problemas durante a migração:

1. Consulte a [documentação completa da API](./README.md)
2. Verifique as [perguntas frequentes](#) (em breve)
3. Entre em contato com nosso suporte:
   - E-mail: suporte@pgben.com.br
   - Telefone: (11) 1234-5678

---

**Última atualização**: 17/05/2025  
**Versão deste documento**: 1.0.0
