# Endpoint de Busca Unificada de Cidadãos

## Visão Geral

O endpoint `/v1/cidadao/busca` foi criado para unificar todas as buscas de cidadãos em uma única rota, permitindo busca por ID, CPF, NIS, telefone ou nome de forma eficiente e segura.

## Endpoint

```
GET /v1/cidadao/busca
```

## Parâmetros de Query

| Parâmetro | Tipo | Obrigatório | Descrição | Exemplo |
|-----------|------|-------------|-----------|----------|
| `id` | string | Não | ID do cidadão (UUID) | `550e8400-e29b-41d4-a716-446655440000` |
| `cpf` | string | Não | CPF do cidadão (com ou sem formatação) | `12345678901` ou `123.456.789-01` |
| `nis` | string | Não | NIS do cidadão | `12345678901` |
| `telefone` | string | Não | Telefone do cidadão (com ou sem formatação) | `11987654321` ou `(11) 98765-4321` |
| `nome` | string | Não | Nome do cidadão (busca parcial) | `João Silva` |
| `includeRelations` | boolean | Não | Incluir relacionamentos (composição familiar, etc.) | `true` ou `false` |

## Regras de Validação

### 1. Parâmetro Único
- **Apenas um parâmetro de busca** deve ser fornecido por vez
- Se nenhum parâmetro for fornecido: `400 Bad Request`
- Se mais de um parâmetro for fornecido: `400 Bad Request`

### 2. Validações Específicas

#### CPF
- Deve ser um CPF válido (11 dígitos)
- Aceita formatação (pontos e hífen) que será removida automaticamente
- Validação usando algoritmo oficial do CPF

#### NIS
- Deve ser um NIS válido (11 dígitos)
- Validação usando algoritmo oficial do NIS

#### Telefone
- Deve ter 10 ou 11 dígitos (após remoção da formatação)
- 10 dígitos: telefone fixo
- 11 dígitos: telefone celular
- Aceita formatação que será removida automaticamente

#### Nome
- Deve ter pelo menos 2 caracteres
- Busca parcial (ILIKE) com suporte a busca textual avançada

#### ID
- Deve ser um UUID válido (versão 4)

## Tipos de Resposta

### Busca por Campos Únicos (ID, CPF, NIS, Telefone)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "nome": "João Silva",
  "cpf": "12345678901",
  "nis": "12345678901",
  "telefone": "11987654321",
  "email": "joao@email.com",
  "endereco": {
    "logradouro": "Rua das Flores, 123",
    "bairro": "Centro",
    "cidade": "São Paulo",
    "uf": "SP",
    "cep": "01234567"
  },
  "ativo": true,
  "createdAt": "2024-01-01T10:00:00.000Z",
  "updatedAt": "2024-01-01T10:00:00.000Z"
}
```

### Busca por Nome (Lista)
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nome": "João Silva",
    "cpf": "12345678901",
    "telefone": "11987654321",
    "ativo": true
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "nome": "João Santos",
    "cpf": "98765432100",
    "telefone": "11876543210",
    "ativo": true
  }
]
```

## Exemplos de Uso

### Buscar por CPF
```bash
GET /v1/cidadao/busca?cpf=12345678901
GET /v1/cidadao/busca?cpf=123.456.789-01
```

### Buscar por Telefone
```bash
GET /v1/cidadao/busca?telefone=11987654321
GET /v1/cidadao/busca?telefone=(11)98765-4321
```

### Buscar por Nome
```bash
GET /v1/cidadao/busca?nome=João
GET /v1/cidadao/busca?nome=Silva
```

### Buscar com Relacionamentos
```bash
GET /v1/cidadao/busca?cpf=12345678901&includeRelations=true
```

## Códigos de Status HTTP

| Código | Descrição | Exemplo |
|--------|-----------|----------|
| `200` | Sucesso | Cidadão(s) encontrado(s) |
| `400` | Parâmetros inválidos | Mais de um parâmetro fornecido |
| `404` | Não encontrado | Cidadão não existe |
| `401` | Não autorizado | Token JWT inválido |
| `403` | Sem permissão | Usuário sem permissão de visualizar cidadãos |
| `500` | Erro interno | Erro no servidor |

## Segurança e Permissões

### Autenticação
- Requer token JWT válido
- Header: `Authorization: Bearer <token>`

### Autorização
- Permissão necessária: `cidadao.visualizar`
- Escopo: `UNIT` (limitado à unidade do usuário)
- Validação: `cidadao.unidadeId`

### Rate Limiting
- Implementar rate limiting para evitar brute-force
- Sugestão: 100 requests por minuto por usuário

### Logs de Auditoria
- Todas as buscas são logadas para auditoria
- Dados sensíveis (CPF, NIS) são mascarados nos logs

## Performance e Cache

### Cache
- Cache Redis implementado para todas as buscas
- TTL padrão: 5 minutos
- TTL para busca por nome: 2.5 minutos (mais dinâmica)
- Chaves de cache específicas por tipo de busca

### Índices de Banco de Dados

#### Índices Existentes
- `PRIMARY KEY` no ID
- `UNIQUE INDEX` no CPF
- `UNIQUE INDEX` no NIS
- `INDEX` composto para paginação
- `GIN INDEX` para busca textual no nome

#### Novos Índices (Migração 1732826000000)
- `UNIQUE INDEX` no telefone
- `GIN INDEX` com pg_trgm para busca avançada no nome
- `INDEX` composto nome + ativo
- `INDEX` case-insensitive no nome

### Otimizações
- Remoção de `eager loading` desnecessário
- Uso de `createQueryBuilder` para queries otimizadas
- Validação prévia para evitar queries desnecessárias

## Monitoramento

### Métricas Importantes
- Tempo de resposta por tipo de busca
- Taxa de cache hit/miss
- Número de buscas por tipo
- Erros 404 (podem indicar dados inconsistentes)

### Alertas
- Tempo de resposta > 500ms
- Taxa de erro > 5%
- Cache hit rate < 70%

## Migração dos Endpoints Antigos

### Endpoints Deprecados
- `GET /v1/cidadao/cpf/:cpf` → `GET /v1/cidadao/busca?cpf=:cpf`
- `GET /v1/cidadao/nis/:nis` → `GET /v1/cidadao/busca?nis=:nis`

### Plano de Migração
1. **Fase 1**: Manter endpoints antigos funcionando
2. **Fase 2**: Adicionar headers de deprecação
3. **Fase 3**: Documentar migração para clientes
4. **Fase 4**: Remover endpoints antigos (após 6 meses)

## Testes

### Casos de Teste Essenciais

#### Validação de Parâmetros
- ✅ Nenhum parâmetro fornecido
- ✅ Múltiplos parâmetros fornecidos
- ✅ Parâmetros vazios ou inválidos

#### Busca por Cada Tipo
- ✅ Busca por ID válido/inválido
- ✅ Busca por CPF válido/inválido/formatado
- ✅ Busca por NIS válido/inválido
- ✅ Busca por telefone válido/inválido/formatado
- ✅ Busca por nome (parcial, case-insensitive)

#### Cenários de Erro
- ✅ Cidadão não encontrado
- ✅ Usuário sem permissão
- ✅ Token inválido

#### Performance
- ✅ Tempo de resposta < 200ms para buscas com cache
- ✅ Tempo de resposta < 500ms para buscas sem cache
- ✅ Funcionalidade com 1000+ cidadãos

## Próximos Passos

1. **Implementar rate limiting** específico para este endpoint
2. **Adicionar métricas** de uso por tipo de busca
3. **Implementar busca fuzzy** mais avançada para nomes
4. **Adicionar suporte a múltiplos resultados** para telefone (se necessário)
5. **Criar dashboard** de monitoramento específico
6. **Documentar APIs** para clientes externos
7. **Implementar cache distribuído** para ambientes multi-instância