# Catálogo de Códigos de Erro - Sistema SEMTAS

## Visão Geral

Este documento descreve todos os códigos de erro padronizados utilizados no Sistema de Gestão de Benefícios Eventuais da SEMTAS. O sistema utiliza um catálogo estruturado de erros para garantir consistência, rastreabilidade e melhor experiência do usuário.

## Estrutura dos Códigos

Os códigos de erro seguem o padrão: `CATEGORIA_SUBCATEGORIA_NUMERO`

### Categorias Principais

- **VAL**: Validações
- **BEN**: Benefícios
- **INT**: Integrações
- **FLO**: Fluxo Operacional
- **SYS**: Sistema

## Códigos de Erro por Categoria

### 1. Validações (VAL)

#### VAL_CPF_001 - CPF Inválido
- **Status HTTP**: 400 (Bad Request)
- **Severidade**: MEDIUM
- **Mensagem**: "CPF informado é inválido"
- **Contexto**: Validação de formato e dígitos verificadores do CPF

#### VAL_CPF_002 - CPF Duplicado
- **Status HTTP**: 409 (Conflict)
- **Severidade**: MEDIUM
- **Mensagem**: "Já existe um cidadão cadastrado com o CPF {cpf}"
- **Contexto**: Tentativa de cadastro com CPF já existente

#### VAL_NIS_001 - NIS Inválido
- **Status HTTP**: 400 (Bad Request)
- **Severidade**: MEDIUM
- **Mensagem**: "NIS informado é inválido"
- **Contexto**: Validação de formato do NIS

#### VAL_NIS_002 - NIS Duplicado
- **Status HTTP**: 409 (Conflict)
- **Severidade**: MEDIUM
- **Mensagem**: "Já existe um cidadão cadastrado com o NIS {nis}"
- **Contexto**: Tentativa de cadastro com NIS já existente

#### VAL_AGE_001 - Idade Inválida
- **Status HTTP**: 400 (Bad Request)
- **Severidade**: MEDIUM
- **Mensagem**: "Idade deve estar entre {minAge} e {maxAge} anos"
- **Contexto**: Validação de faixa etária para benefícios

#### VAL_INCOME_001 - Renda Inválida
- **Status HTTP**: 400 (Bad Request)
- **Severidade**: MEDIUM
- **Mensagem**: "Valor da renda deve ser maior que zero"
- **Contexto**: Validação de valores de renda

#### VAL_INCOME_002 - Renda Excede Limite
- **Status HTTP**: 400 (Bad Request)
- **Severidade**: MEDIUM
- **Mensagem**: "Renda familiar per capita de R$ {income} excede o limite de R$ {limit} para este benefício"
- **Contexto**: Validação de critérios de elegibilidade por renda

### 2. Benefícios (BEN)

#### BEN_NAT_001 - Auxílio Natalidade Já Recebido
- **Status HTTP**: 409 (Conflict)
- **Severidade**: HIGH
- **Mensagem**: "Cidadão já recebeu auxílio natalidade nos últimos {months} meses"
- **Contexto**: Regra de não duplicação do benefício
- **Referência Legal**: Lei Municipal nº XXX/XXXX

#### BEN_NAT_002 - Data de Nascimento Inválida para Natalidade
- **Status HTTP**: 400 (Bad Request)
- **Severidade**: HIGH
- **Mensagem**: "Data de nascimento deve ser posterior a {minDate} para solicitar auxílio natalidade"
- **Contexto**: Validação de prazo para solicitação
- **Referência Legal**: Decreto Municipal nº XXX/XXXX

#### BEN_ALU_001 - Aluguel Social Já Ativo
- **Status HTTP**: 409 (Conflict)
- **Severidade**: HIGH
- **Mensagem**: "Cidadão já possui benefício de aluguel social ativo"
- **Contexto**: Regra de um benefício por família
- **Referência Legal**: Lei Municipal nº XXX/XXXX

#### BEN_ALU_002 - Propriedade Inválida para Aluguel
- **Status HTTP**: 400 (Bad Request)
- **Severidade**: HIGH
- **Mensagem**: "Cidadão possui imóvel próprio e não pode receber aluguel social"
- **Contexto**: Critério de elegibilidade
- **Referência Legal**: Decreto Municipal nº XXX/XXXX

#### BEN_GEN_001 - Benefício Não Encontrado
- **Status HTTP**: 404 (Not Found)
- **Severidade**: MEDIUM
- **Mensagem**: "Benefício com ID {benefitId} não encontrado"
- **Contexto**: Busca por benefício inexistente

#### BEN_WF_001 - Transição de Workflow Inválida
- **Status HTTP**: 400 (Bad Request)
- **Severidade**: HIGH
- **Mensagem**: "Não é possível alterar status de {currentStatus} para {targetStatus}"
- **Contexto**: Validação de fluxo de aprovação

### 3. Integrações (INT)

#### INT_AZURE_001 - Falha no Upload para Azure Blob
- **Status HTTP**: 502 (Bad Gateway)
- **Severidade**: HIGH
- **Mensagem**: "Falha ao fazer upload do arquivo {filename} para o Azure Blob Storage"
- **Contexto**: Erro na integração com Azure

#### INT_EMAIL_001 - Falha no Envio de Email
- **Status HTTP**: 502 (Bad Gateway)
- **Severidade**: MEDIUM
- **Mensagem**: "Falha ao enviar email para {email}"
- **Contexto**: Erro no serviço de email

#### INT_DB_001 - Falha na Conexão com Banco
- **Status HTTP**: 503 (Service Unavailable)
- **Severidade**: CRITICAL
- **Mensagem**: "Falha na conexão com o banco de dados"
- **Contexto**: Indisponibilidade do banco

### 4. Fluxo Operacional (FLO)

#### FLO_PERM_001 - Permissão Negada
- **Status HTTP**: 403 (Forbidden)
- **Severidade**: HIGH
- **Mensagem**: "Usuário não possui permissão para realizar esta operação"
- **Contexto**: Controle de acesso baseado em perfis

#### FLO_DOC_001 - Documento Obrigatório
- **Status HTTP**: 400 (Bad Request)
- **Severidade**: HIGH
- **Mensagem**: "Documento {documentType} é obrigatório para esta operação"
- **Contexto**: Validação de documentos necessários

#### FLO_DEADLINE_001 - Prazo de Aprovação Excedido
- **Status HTTP**: 400 (Bad Request)
- **Severidade**: HIGH
- **Mensagem**: "Prazo para aprovação de {days} dias foi excedido"
- **Contexto**: Controle de prazos processuais

### 5. Sistema (SYS)

#### SYS_FK_001 - Violação de Chave Estrangeira
- **Status HTTP**: 400 (Bad Request)
- **Severidade**: MEDIUM
- **Mensagem**: "Operação não pode ser realizada devido a dependências inválidas"
- **Contexto**: Erro de integridade referencial

#### SYS_UNIQUE_001 - Violação de Restrição Única
- **Status HTTP**: 409 (Conflict)
- **Severidade**: MEDIUM
- **Mensagem**: "Já existe um registro com estes dados"
- **Contexto**: Tentativa de duplicação de dados únicos

#### SYS_RATE_001 - Limite de Taxa Excedido
- **Status HTTP**: 429 (Too Many Requests)
- **Severidade**: MEDIUM
- **Mensagem**: "Muitas requisições. Tente novamente em {retryAfter} segundos"
- **Contexto**: Proteção contra abuso da API

#### SYS_MAINT_001 - Modo de Manutenção
- **Status HTTP**: 503 (Service Unavailable)
- **Severidade**: HIGH
- **Mensagem**: "Sistema em manutenção. Previsão de retorno: {estimatedTime}"
- **Contexto**: Manutenção programada do sistema

## Mapeamento de Erros PostgreSQL

O sistema mapeia automaticamente códigos de erro PostgreSQL para códigos do catálogo:

| Código PostgreSQL | Código do Catálogo | Descrição |
|-------------------|--------------------|-----------|
| 23503 | SYS_FK_001 | Violação de chave estrangeira |
| 23505 | SYS_UNIQUE_001 | Violação de restrição única |
| 23514 | VAL_* | Violação de check constraint |
| 23502 | VAL_* | Violação de NOT NULL |

## Uso da API

### Estrutura de Resposta de Erro

```json
{
  "statusCode": 400,
  "message": "CPF informado é inválido",
  "code": "VAL_CPF_001",
  "details": {
    "category": "VALIDATION",
    "severity": "MEDIUM",
    "context": {
      "cpf": "123.456.789-00"
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/v1/cidadaos",
  "requestId": "req_123456789"
}
```

### Headers de Resposta

- `X-Error-Code`: Código do erro do catálogo
- `X-Error-Category`: Categoria do erro
- `X-Error-Severity`: Severidade do erro
- `X-Request-ID`: ID único da requisição

## Logs Estruturados

Todos os erros são registrados com estrutura padronizada:

```json
{
  "level": "error",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "requestId": "req_123456789",
  "errorCode": "VAL_CPF_001",
  "category": "VALIDATION",
  "severity": "MEDIUM",
  "message": "CPF informado é inválido",
  "context": {
    "module": "cidadao",
    "operation": "create",
    "userId": "user_123",
    "cpf": "***.***.***-**"
  },
  "metadata": {
    "userAgent": "Mozilla/5.0...",
    "ip": "192.168.1.100",
    "method": "POST",
    "path": "/api/v1/cidadaos"
  }
}
```

## Observabilidade

### Métricas

- `error_count_total`: Contador total de erros por código
- `error_rate`: Taxa de erros por endpoint
- `error_severity_distribution`: Distribuição por severidade

### Alertas

- **CRITICAL**: Alerta imediato
- **HIGH**: Alerta em 5 minutos
- **MEDIUM**: Alerta em 15 minutos
- **LOW**: Relatório diário

## Versionamento

Este catálogo segue versionamento semântico:
- **MAJOR**: Mudanças incompatíveis
- **MINOR**: Novos códigos de erro
- **PATCH**: Correções de mensagens

**Versão Atual**: 1.0.0

## Contribuição

Para adicionar novos códigos de erro:

1. Seguir a convenção de nomenclatura
2. Definir severidade apropriada
3. Incluir referência legal quando aplicável
4. Atualizar testes
5. Documentar no changelog

---

**Última Atualização**: Janeiro 2024  
**Responsável**: Equipe de Desenvolvimento Backend SEMTAS