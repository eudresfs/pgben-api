# Guia de Integração - API do PGBen

## Introdução

Este guia apresenta as diretrizes e instruções para integração de sistemas externos com a API do PGBen. O processo utiliza tokens de acesso de longa duração e um sistema de permissões granular para garantir segurança e controle.

## Visão Geral da Integração

A integração com a API do PGBen ocorre via requisições HTTP utilizando formato JSON e autenticação JWT. O processo envolve:

1. Obtenção de um token de acesso
2. Autenticação das requisições usando o token
3. Acesso a endpoints específicos conforme as permissões concedidas

## Obtendo um Token de Acesso

Para iniciar a integração, é necessário solicitar um token de acesso à equipe administradora do PGBen. O processo é realizado administrativamente e envolve:

1. Cadastro do sistema integrador com informações de contato e propósito
2. Definição dos escopos de permissão necessários
3. Geração do token de acesso

**Importante**: O token gerado será exibido apenas uma vez no momento da criação. Armazene-o com segurança, pois não será possível recuperá-lo posteriormente.

## Autenticação

Todas as requisições à API do PGBen devem incluir o token de acesso no cabeçalho HTTP:

```
Authorization: Bearer {seu-token-jwt}
```

Exemplo em cURL:

```bash
curl -X GET https://api.pgben.natal.rn.gov.br/api/v1/dados-basicos \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
```

Exemplo em JavaScript:

```javascript
const response = await fetch('https://api.pgben.natal.rn.gov.br/api/v1/dados-basicos', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${seuToken}`,
    'Content-Type': 'application/json'
  }
});
```

Exemplo em Python:

```python
import requests

headers = {
    'Authorization': f'Bearer {seu_token}',
    'Content-Type': 'application/json'
}

response = requests.get('https://api.pgben.natal.rn.gov.br/api/v1/dados-basicos', headers=headers)
```

Exemplo em C#:

```csharp
using System.Net.Http;
using System.Net.Http.Headers;

var client = new HttpClient();
client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", seuToken);
var response = await client.GetAsync("https://api.pgben.natal.rn.gov.br/api/v1/dados-basicos");
```

## Sistema de Permissões

O acesso aos recursos da API é controlado através de escopos no formato `acao:recurso`. Cada token possui um conjunto específico de escopos que determina quais endpoints podem ser acessados.

### Escopos Comuns

| Escopo                  | Descrição                                             |
|-------------------------|---------------------------------------------------------|
| `read:cidadaos`        | Permite consultar dados básicos de cidadãos            |
| `read:beneficios`      | Permite consultar benefícios disponíveis               |
| `read:solicitacoes`    | Permite consultar solicitações                         |
| `write:solicitacoes`   | Permite criar novas solicitações                       |
| `read:documentos`      | Permite consultar documentos                           |
| `write:documentos`     | Permite enviar documentos                              |

A tentativa de acessar um recurso sem o escopo necessário resultará em erro 403 (Forbidden).

## Endpoints Disponíveis

A API do PGBen possui os seguintes endpoints principais para integradores:

### Dados Básicos

**GET** `/api/v1/dados-basicos`

Escopo: `read:dados_basicos`

Retorna informações básicas disponíveis para o integrador.

**Resposta**:
```json
{
  "message": "Dados básicos disponíveis",
  "timestamp": "2025-05-18T15:30:00.000Z",
  "dados": {
    "versao": "1.0.0",
    "ambiente": "producao",
    "status": "online"
  }
}
```

### Cidadãos

**GET** `/api/v1/cidadaos/{cpf}`

Escopo: `read:cidadaos`

Consulta os dados de um cidadão pelo CPF.

**Parâmetros**:
- `cpf`: CPF do cidadão (apenas números)

**Resposta**:
```json
{
  "id": "5f8d3b4e3b4f3b2d3c2e1d2f",
  "nome": "Nome do Cidadão",
  "cpf": "12345678900",
  "dataNascimento": "1980-01-01",
  "endereco": {
    "logradouro": "Rua Exemplo",
    "numero": "123",
    "bairro": "Centro",
    "cidade": "Natal",
    "uf": "RN",
    "cep": "59000000"
  },
  "contato": {
    "email": "email@exemplo.com",
    "telefone": "84999999999"
  }
}
```

### Benefícios

**GET** `/api/v1/beneficios`

Escopo: `read:beneficios`

Lista os benefícios disponíveis.

**Parâmetros de consulta**:
- `ativo` (opcional): Filtrar por status ativo (true/false)
- `categoria` (opcional): Filtrar por categoria

**Resposta**:
```json
{
  "total": 2,
  "items": [
    {
      "id": "5f8d3b4e3b4f3b2d3c2e1d2f",
      "nome": "Auxílio Moradia",
      "descricao": "Benefício para auxílio com despesas de moradia",
      "categoria": "Habitação",
      "valorMinimo": 300.00,
      "valorMaximo": 600.00,
      "periodicidade": "MENSAL",
      "requisitos": [
        "Renda familiar abaixo de 2 salários mínimos",
        "Não possuir imóvel próprio"
      ]
    },
    {
      "id": "5f8d3b4e3b4f3b2d3c2e1d30",
      "nome": "Cesta Básica",
      "descricao": "Fornecimento de itens alimentícios básicos",
      "categoria": "Alimentação",
      "periodicidade": "MENSAL",
      "requisitos": [
        "Renda familiar abaixo de 1 salário mínimo"
      ]
    }
  ]
}
```

### Solicitações

**POST** `/api/v1/solicitacoes`

Escopo: `write:solicitacoes`

Cria uma nova solicitação de benefício.

**Corpo da Requisição**:
```json
{
  "cidadaoId": "5f8d3b4e3b4f3b2d3c2e1d2f",
  "beneficioId": "5f8d3b4e3b4f3b2d3c2e1d2f",
  "observacao": "Solicitação criada via integração",
  "dadosDinamicos": {
    "rendaFamiliar": 1200.00,
    "quantidadeDependentes": 2,
    "possuiImovelProprio": false
  }
}
```

**Resposta**:
```json
{
  "id": "5f8d3b4e3b4f3b2d3c2e1d31",
  "protocolo": "SOL2025050001",
  "status": "PENDENTE",
  "dataCriacao": "2025-05-18T15:30:00.000Z",
  "cidadaoId": "5f8d3b4e3b4f3b2d3c2e1d2f",
  "beneficioId": "5f8d3b4e3b4f3b2d3c2e1d2f",
  "mensagem": "Solicitação criada com sucesso"
}
```

**GET** `/api/v1/solicitacoes/{id}`

Escopo: `read:solicitacoes`

Consulta uma solicitação pelo ID.

**Parâmetros**:
- `id`: ID da solicitação

**Resposta**:
```json
{
  "id": "5f8d3b4e3b4f3b2d3c2e1d31",
  "protocolo": "SOL2025050001",
  "status": "PENDENTE",
  "dataCriacao": "2025-05-18T15:30:00.000Z",
  "dataAtualizacao": "2025-05-18T15:30:00.000Z",
  "cidadao": {
    "id": "5f8d3b4e3b4f3b2d3c2e1d2f",
    "nome": "Nome do Cidadão",
    "cpf": "12345678900"
  },
  "beneficio": {
    "id": "5f8d3b4e3b4f3b2d3c2e1d2f",
    "nome": "Auxílio Moradia"
  },
  "dadosDinamicos": {
    "rendaFamiliar": 1200.00,
    "quantidadeDependentes": 2,
    "possuiImovelProprio": false
  },
  "historico": [
    {
      "data": "2025-05-18T15:30:00.000Z",
      "status": "PENDENTE",
      "observacao": "Solicitação criada"
    }
  ]
}
```

## Códigos de Status HTTP

A API utiliza os seguintes códigos de status HTTP:

| Código | Descrição                      | Possível Causa                        |
|--------|--------------------------------|--------------------------------------|
| 200    | OK                             | Requisição bem-sucedida               |
| 201    | Created                        | Recurso criado com sucesso            |
| 400    | Bad Request                    | Dados inválidos na requisição         |
| 401    | Unauthorized                   | Token ausente ou inválido             |
| 403    | Forbidden                      | Permissão insuficiente                |
| 404    | Not Found                      | Recurso não encontrado                |
| 409    | Conflict                       | Conflito com recursos existentes      |
| 422    | Unprocessable Entity           | Requisição válida mas não processável |
| 429    | Too Many Requests              | Limite de requisições excedido        |
| 500    | Internal Server Error          | Erro interno no servidor              |

## Respostas de Erro

As respostas de erro seguem o formato padrão:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "O campo 'cpf' é obrigatório",
  "timestamp": "2025-05-18T15:30:00.000Z",
  "path": "/api/v1/cidadaos"
}
```

## Práticas Recomendadas

### Segurança

1. **Armazenamento seguro**: Armazene o token em local seguro, como um cofre de segredos.
2. **Não compartilhe tokens**: Cada sistema deve ter seu próprio token.
3. **Revogação em caso de vazamento**: Solicite a revogação imediata em caso de comprometimento.

### Desempenho

1. **Cache de respostas**: Implemente cache do lado do cliente para dados que não mudam frequentemente.
2. **Paginação**: Utilize parâmetros de paginação em listas grandes.
3. **Compressão**: Ative compressão gzip/deflate para requisições e respostas.

### Boas Práticas

1. **Tratamento de erros**: Implemente tratamento adequado para todos os códigos de status.
2. **Retry com backoff exponencial**: Para erros temporários (429, 503).
3. **Monitoramento**: Monitore tempos de resposta e taxas de erro.

## Solução de Problemas

### Erro 401 (Unauthorized)

Possíveis causas:
- Token expirado ou inválido
- Token mal formatado no cabeçalho

Solução:
- Verifique se o token está sendo enviado corretamente
- Solicite um novo token se necessário

### Erro 403 (Forbidden)

Possíveis causas:
- Token válido, mas sem permissão para o recurso
- IP não autorizado (se restrições de IP estiverem ativas)

Solução:
- Verifique se o token possui o escopo necessário
- Solicite ampliação de permissões se necessário

### Erro 429 (Too Many Requests)

Possíveis causas:
- Excesso de requisições em curto período

Solução:
- Implemente rate limiting do lado do cliente
- Adicione backoff exponencial entre tentativas

## Suporte

Para suporte técnico relacionado à integração:

- Email: suporte.integracoes@pgben.natal.rn.gov.br
- Telefone: (84) 3232-XXXX (horário comercial)

Ao reportar problemas, inclua:
- Timestamp da requisição
- ID do integrador
- Endpoint acessado
- Código de erro recebido

## Atualizações e Notificações

Mudanças na API serão comunicadas com antecedência via email cadastrado do integrador. As atualizações seguirão o seguinte processo:

1. Anúncio prévio (mínimo 30 dias para mudanças significativas)
2. Documentação detalhada das mudanças
3. Período de testes no ambiente de homologação
4. Implementação em produção
