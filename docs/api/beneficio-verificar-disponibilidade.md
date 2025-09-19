# API - Verificação de Disponibilidade de Benefícios

## Visão Geral

Este endpoint permite verificar quais benefícios estão disponíveis para solicitação por um cidadão específico, baseado nas regras de negócio de solicitações e concessões em andamento.

## Endpoint

```
POST /beneficio/verificar-disponibilidade
```

## Autenticação

- **Requerida**: Sim (JWT Bearer Token)
- **Permissão**: `beneficio.verificar_disponibilidade`
- **Escopo**: Global

## Request

### Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Body
```json
{
  "cidadaoId": "123e4567-e89b-12d3-a456-426614174000"
}
```

#### Parâmetros do Body

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `cidadaoId` | string (UUID) | Sim | ID único do cidadão para verificação |

## Response

### Sucesso (200)

```json
{
  "cidadaoId": "123e4567-e89b-12d3-a456-426614174000",
  "beneficios": [
    {
      "id": "456e7890-e89b-12d3-a456-426614174001",
      "codigo": "AUX001",
      "nome": "Auxílio Emergencial",
      "descricao": "Benefício para situações de emergência",
      "categoria": "EMERGENCIAL",
      "periodicidade": "UNICO",
      "valor": 500.00,
      "status": "ATIVO",
      "disponivel": true,
      "dataUltimaSolicitacao": null,
      "requisitos": [
        {
          "id": "req-001",
          "tipoDocumento": "COMPROVANTE_RESIDENCIA",
          "obrigatorio": true,
          "descricao": "Comprovante de residência atualizado"
        }
      ]
    },
    {
      "id": "789e0123-e89b-12d3-a456-426614174002",
      "codigo": "NAT001", 
      "nome": "Benefício Natalidade",
      "descricao": "Auxílio para nascimento de filhos",
      "categoria": "NATALIDADE",
      "periodicidade": "UNICO",
      "valor": 300.00,
      "status": "ATIVO",
      "disponivel": false,
      "dataUltimaSolicitacao": "2024-01-15T10:30:00.000Z",
      "requisitos": [
        {
          "id": "req-002",
          "tipoDocumento": "CERTIDAO_NASCIMENTO",
          "obrigatorio": true,
          "descricao": "Certidão de nascimento da criança"
        }
      ]
    }
  ],
  "totalBeneficios": 2,
  "beneficiosDisponiveis": 1,
  "beneficiosIndisponiveis": 1
}
```

#### Campos da Response

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `cidadaoId` | string | ID do cidadão consultado |
| `beneficios` | array | Lista de benefícios com informações de disponibilidade |
| `beneficios[].id` | string | ID único do benefício |
| `beneficios[].codigo` | string | Código identificador do benefício |
| `beneficios[].nome` | string | Nome do benefício |
| `beneficios[].descricao` | string | Descrição detalhada do benefício |
| `beneficios[].categoria` | enum | Categoria do benefício (NATALIDADE, EMERGENCIAL, etc.) |
| `beneficios[].periodicidade` | enum | Periodicidade do benefício (UNICO, MENSAL, etc.) |
| `beneficios[].valor` | number | Valor do benefício |
| `beneficios[].status` | enum | Status do benefício (ATIVO, INATIVO) |
| `beneficios[].disponivel` | boolean | Se o benefício está disponível para solicitação |
| `beneficios[].dataUltimaSolicitacao` | string/null | Data da última solicitação do cidadão para este benefício |
| `beneficios[].requisitos` | array | Lista de requisitos documentais |
| `totalBeneficios` | number | Total de benefícios ativos no sistema |
| `beneficiosDisponiveis` | number | Quantidade de benefícios disponíveis para o cidadão |
| `beneficiosIndisponiveis` | number | Quantidade de benefícios indisponíveis para o cidadão |

### Erros

#### 400 - Bad Request
```json
{
  "statusCode": 400,
  "message": [
    "cidadaoId must be a UUID"
  ],
  "error": "Bad Request"
}
```

#### 401 - Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

#### 403 - Forbidden
```json
{
  "statusCode": 403,
  "message": "Acesso negado. Permissão 'beneficio.verificar_disponibilidade' requerida.",
  "error": "Forbidden"
}
```

#### 404 - Not Found
```json
{
  "statusCode": 404,
  "message": "Cidadão não encontrado",
  "error": "Not Found"
}
```

## Regras de Negócio

### Disponibilidade de Benefícios

Um benefício é considerado **indisponível** para um cidadão quando:

1. **Solicitação em Andamento**: Existe uma solicitação ativa com status:
   - `RASCUNHO`
   - `ABERTA`
   - `EM_ANALISE`
   - `PENDENTE`

2. **Concessão em Andamento**: Existe uma concessão ativa com status:
   - `APTO`
   - `ATIVO`
   - `SUSPENSO`
   - `BLOQUEADO`

### Categorias de Benefício

| Categoria | Descrição | Exemplos |
|-----------|-----------|----------|
| `NATALIDADE` | Benefícios relacionados ao nascimento | Auxílio Natalidade, Kit Bebê |
| `EMERGENCIAL` | Benefícios para situações de emergência | Auxílio Emergencial, Calamidade |
| `ASSISTENCIAL` | Benefícios de assistência social | Cesta Básica, Auxílio Social |
| `HABITACIONAL` | Benefícios relacionados à moradia | Aluguel Social, Auxílio Habitacional |
| `FUNERAL` | Benefícios para despesas funerárias | Auxílio Funeral, Ataúde |
| `OUTROS` | Demais benefícios não categorizados | Benefícios diversos |

## Cache

- **Habilitado**: Sim
- **TTL**: 300 segundos (5 minutos)
- **Chave**: Baseada no `cidadaoId`

## Auditoria

Todas as consultas são registradas no sistema de auditoria com:
- **Tipo de Evento**: `CONSULTA_DADOS`
- **Entidade**: `TipoBeneficio`
- **Ação**: `verificar_disponibilidade_beneficios`
- **Nível de Risco**: `LOW`

## Exemplos de Uso

### cURL

```bash
curl -X POST \
  'https://api.pgben.gov.br/v1/beneficio/verificar-disponibilidade' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json' \
  -d '{
    "cidadaoId": "123e4567-e89b-12d3-a456-426614174000"
  }'
```

### JavaScript (Fetch)

```javascript
const response = await fetch('/beneficio/verificar-disponibilidade', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    cidadaoId: '123e4567-e89b-12d3-a456-426614174000'
  })
});

const data = await response.json();
console.log('Benefícios disponíveis:', data.beneficiosDisponiveis);
```

## Performance

- **Otimização de Query**: Habilitada
- **Índices Utilizados**: 
  - `IDX_tipo_beneficio_status`
  - `IDX_tipo_beneficio_categoria`
  - `IDX_solicitacao_cidadao_status`
  - `IDX_concessao_cidadao_status`

## Versionamento

- **Versão Atual**: 1.0
- **Introduzida em**: v2.1.0
- **Última Atualização**: Janeiro 2025

## Notas Técnicas

1. A consulta utiliza `LEFT JOIN` para otimizar performance
2. Resultados são ordenados por categoria e nome do benefício
3. Cache é invalidado automaticamente quando há mudanças nos benefícios
4. Suporte a paginação pode ser adicionado em versões futuras se necessário