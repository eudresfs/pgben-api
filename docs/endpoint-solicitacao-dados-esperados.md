# Endpoint POST /api/v1/solicitacao - Dados Esperados

## Visão Geral

Este documento detalha os dados esperados pelo endpoint `POST /api/v1/solicitacao` para criação de novas solicitações de benefícios.

## Estrutura dos Dados

### Campos Obrigatórios

```typescript
{
  "beneficiario_id": "uuid",        // ID do cidadão beneficiário
  "tipo_beneficio_id": "uuid",     // ID do tipo de benefício
  "observacoes": "string",          // Observações sobre a solicitação (opcional)
  "dados_complementares": {},       // Dados específicos do benefício (opcional)
  "documentos": []                  // Array de documentos (opcional)
}
```

### Dados Complementares por Tipo de Benefício

#### Auxílio Natalidade

```json
{
  "beneficiario_id": "123e4567-e89b-12d3-a456-426614174000",
  "tipo_beneficio_id": "456e7890-e89b-12d3-a456-426614174001",
  "observacoes": "Primeira gestação da beneficiária",
  "dados_complementares": {
    "data_nascimento_bebe": "2024-01-15",
    "nome_bebe": "João Silva Santos",
    "peso_nascimento": 3.2,
    "hospital_nascimento": "Hospital Municipal",
    "composicao_familiar": [
      {
        "cidadao_id": "789e0123-e89b-12d3-a456-426614174002",
        "parentesco": "CONJUGE",
        "renda_mensal": 1200.00
      }
    ],
    "renda_familiar_total": 2400.00,
    "situacao_trabalho": "EMPREGADO",
    "escolaridade": "ENSINO_MEDIO_COMPLETO"
  },
  "documentos": [
    {
      "tipo_documento_id": "abc12345-e89b-12d3-a456-426614174003",
      "nome_arquivo": "certidao_nascimento.pdf",
      "obrigatorio": true
    }
  ]
}
```

#### Aluguel Social

```json
{
  "beneficiario_id": "123e4567-e89b-12d3-a456-426614174000",
  "tipo_beneficio_id": "456e7890-e89b-12d3-a456-426614174004",
  "observacoes": "Família em situação de vulnerabilidade habitacional",
  "dados_complementares": {
    "motivo_aluguel_social": "DESPEJO",
    "valor_aluguel_atual": 800.00,
    "endereco_atual": {
      "logradouro": "Rua das Flores, 123",
      "bairro": "Centro",
      "cidade": "São Paulo",
      "cep": "01234-567"
    },
    "tipo_moradia": "CASA",
    "composicao_familiar": [
      {
        "cidadao_id": "789e0123-e89b-12d3-a456-426614174002",
        "parentesco": "FILHO",
        "idade": 8
      },
      {
        "cidadao_id": "789e0123-e89b-12d3-a456-426614174005",
        "parentesco": "CONJUGE",
        "renda_mensal": 0.00,
        "situacao_trabalho": "DESEMPREGADO"
      }
    ],
    "renda_familiar_total": 1200.00,
    "situacao_trabalho": "EMPREGADO",
    "escolaridade": "ENSINO_FUNDAMENTAL_INCOMPLETO"
  },
  "documentos": [
    {
      "tipo_documento_id": "def67890-e89b-12d3-a456-426614174006",
      "nome_arquivo": "comprovante_renda.pdf",
      "obrigatorio": true
    },
    {
      "tipo_documento_id": "ghi01234-e89b-12d3-a456-426614174007",
      "nome_arquivo": "comprovante_residencia.pdf",
      "obrigatorio": true
    }
  ]
}
```

## Valores de Enums (SEMPRE EM UPPERCASE)

### Parentesco
- `PAI`
- `MAE`
- `FILHO`
- `FILHA`
- `CONJUGE`
- `COMPANHEIRO`
- `IRMAO`
- `IRMA`
- `AVO`
- `AVOH`
- `NETO`
- `NETA`
- `TIO`
- `TIA`
- `PRIMO`
- `PRIMA`
- `SOGRO`
- `SOGRA`
- `GENRO`
- `NORA`
- `CUNHADO`
- `CUNHADA`
- `OUTRO`

### Escolaridade
- `ANALFABETO`
- `ENSINO_FUNDAMENTAL_INCOMPLETO`
- `ENSINO_FUNDAMENTAL_COMPLETO`
- `ENSINO_MEDIO_INCOMPLETO`
- `ENSINO_MEDIO_COMPLETO`
- `ENSINO_SUPERIOR_INCOMPLETO`
- `ENSINO_SUPERIOR_COMPLETO`
- `POS_GRADUACAO`
- `MESTRADO`
- `DOUTORADO`

### Situação de Trabalho
- `EMPREGADO`
- `DESEMPREGADO`
- `AUTONOMO`
- `APOSENTADO`
- `PENSIONISTA`
- `ESTUDANTE`
- `DO_LAR`
- `AFASTADO`
- `LICENCA_MATERNIDADE`
- `BENEFICIARIO_INSS`

### Tipo de Moradia
- `CASA`
- `APARTAMENTO`
- `KITNET`
- `QUARTO`
- `BARRACO`
- `OUTRO`

### Motivo Aluguel Social
- `DESPEJO`
- `INCENDIO`
- `DESABAMENTO`
- `ENCHENTE`
- `VIOLENCIA_DOMESTICA`
- `AMEACA`
- `INSALUBRIDADE`
- `OUTRO`

### Status da Solicitação
- `RASCUNHO`
- `PENDENTE`
- `EM_ANALISE`
- `AGUARDANDO_DOCUMENTOS`
- `APROVADA`
- `REPROVADA`
- `LIBERADA`
- `CANCELADA`
- `EM_PROCESSAMENTO`
- `CONCLUIDA`
- `ARQUIVADA`

## Validações Aplicadas

### Validações de Exclusividade
1. **Beneficiário Principal**: Um cidadão não pode ser beneficiário principal se já faz parte da composição familiar de outra solicitação ativa
2. **Múltiplas Solicitações**: Um cidadão não pode ter múltiplas solicitações ativas simultaneamente
3. **Composição Familiar**: Membros da composição familiar não podem estar em outras solicitações ativas

### Status Considerados Ativos
- `PENDENTE`
- `EM_ANALISE`
- `AGUARDANDO_DOCUMENTOS`
- `APROVADA`
- `LIBERADA`
- `EM_PROCESSAMENTO`

### Status Considerados Inativos
- `CANCELADA`
- `REPROVADA`
- `ARQUIVADA`
- `CONCLUIDA`

## Normalização Automática de Enums

Todos os valores de enum são automaticamente convertidos para UPPERCASE antes de serem salvos no banco de dados. Isso significa que você pode enviar:

```json
{
  "escolaridade": "ensino_medio_completo"
}
```

E será automaticamente convertido para:

```json
{
  "escolaridade": "ENSINO_MEDIO_COMPLETO"
}
```

## Exemplo de Resposta de Sucesso

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "RASCUNHO",
  "protocolo": "SOL-2024-000001",
  "data_abertura": "2024-01-15T10:30:00.000Z",
  "created_at": "2024-01-15T10:30:00.000Z",
  "updated_at": "2024-01-15T10:30:00.000Z",
  "beneficiario": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "nome": "Maria Silva Santos",
    "cpf": "123.456.789-00"
  },
  "tipo_beneficio": {
    "id": "456e7890-e89b-12d3-a456-426614174001",
    "nome": "Auxílio Natalidade",
    "valor": 500.00
  },
  "unidade": {
    "id": "789e0123-e89b-12d3-a456-426614174002",
    "nome": "CRAS Centro"
  },
  "tecnico": {
    "id": "abc12345-e89b-12d3-a456-426614174003",
    "nome": "João Técnico"
  }
}
```

## Exemplo de Resposta de Erro

```json
{
  "statusCode": 400,
  "message": "Cidadão não pode ser beneficiário principal pois já faz parte da composição familiar de outra solicitação ativa",
  "error": "Bad Request"
}
```

## Notas Importantes

1. **Case Sensitivity**: Todos os enums devem ser enviados em UPPERCASE ou serão automaticamente convertidos
2. **UUIDs**: Todos os IDs devem ser UUIDs válidos
3. **Datas**: Devem estar no formato ISO 8601 (YYYY-MM-DD)
4. **Valores Monetários**: Devem ser números decimais (ex: 1200.50)
5. **Arrays**: Composição familiar e documentos são arrays opcionais
6. **Validação de Negócio**: O sistema aplica validações de exclusividade automaticamente