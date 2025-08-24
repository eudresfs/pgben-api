# Correção de Erro de Validação - Criação de Cidadão

## Problema Identificado

O erro `"property cidadao_id should not exist"` ocorre quando o cliente envia campos `cidadao_id` nos objetos de `contatos` e `enderecos` durante a criação de um cidadão.

### Erro Original
```json
{
  "statusCode": 400,
  "message": "Dados de entrada inválidos",
  "code": "BadRequestException",
  "details": {
    "errors": [
      {
        "field": "contatos.0.cidadao_id",
        "value": "consequat",
        "constraints": {
          "whitelistValidation": "property cidadao_id should not exist"
        }
      },
      {
        "field": "enderecos.0.cidadao_id",
        "value": "ad proident ut Excepteur",
        "constraints": {
          "whitelistValidation": "property cidadao_id should not exist"
        }
      }
    ]
  }
}
```

## Causa do Problema

O sistema utiliza dois tipos de DTOs:

1. **DTOs Body** - Usados na criação de cidadão (sem `cidadao_id`)
   - `ContatoBodyDto`
   - `EnderecoBodyDto`
   - `CreateComposicaoFamiliarBodyDto`
   - `CreateInfoBancariaBodyDto`

2. **DTOs Originais** - Usados em operações diretas (com `cidadao_id`)
   - `CreateContatoDto`
   - `CreateEnderecoDto`
   - `CreateComposicaoFamiliarDto`
   - `CreateInfoBancariaDto`

### Por que essa separação?

Durante a **criação de um cidadão**, o `cidadao_id` ainda não existe, pois o cidadão está sendo criado. Portanto, os DTOs Body não incluem esse campo.

O `cidadao_id` é adicionado automaticamente pelo `CidadaoService` antes de chamar os serviços específicos de cada entidade.

## Solução

### ❌ Requisição Incorreta
```json
{
  "contatos": [
    {
      "cidadao_id": "consequat",  // ❌ NÃO DEVE EXISTIR
      "telefone": "11999998888",
      "is_whatsapp": false
    }
  ],
  "enderecos": [
    {
      "cidadao_id": "ad proident ut Excepteur",  // ❌ NÃO DEVE EXISTIR
      "logradouro": "Rua das Flores",
      "numero": "123"
    }
  ]
}
```

### ✅ Requisição Correta
```json
{
  "contatos": [
    {
      "telefone": "11999998888",
      "is_whatsapp": false,
      "possui_smartphone": true,
      "email": "email@exemplo.com",
      "proprietario": true
    }
  ],
  "enderecos": [
    {
      "logradouro": "Rua das Flores",
      "numero": "123",
      "complemento": "Apto 101",
      "bairro": "Centro",
      "cidade": "São Paulo",
      "estado": "SP",
      "cep": "01234567",
      "data_inicio_vigencia": "2025-01-01"
    }
  ]
}
```

## Campos Obrigatórios por DTO

### ContatoBodyDto
- Nenhum campo é obrigatório
- `proprietario` padrão: `true`
- `is_whatsapp` padrão: `false`

### EnderecoBodyDto
- `logradouro` (obrigatório)
- `numero` (obrigatório)
- `bairro` (obrigatório)
- `cidade` (obrigatório)
- `estado` (obrigatório, 2 caracteres)
- `cep` (obrigatório, 8 dígitos)
- `data_inicio_vigencia` (obrigatório)

### CreateComposicaoFamiliarBodyDto
- `nome` (obrigatório)
- `cpf` (obrigatório)
- `parentesco` (obrigatório)
- `data_nascimento` (obrigatório)

### CreateInfoBancariaBodyDto
- `banco` (obrigatório)
- `nome_banco` (obrigatório)
- `agencia` (obrigatório)
- `conta` (obrigatório)
- `tipo_conta` (obrigatório)
- `chave_pix` (opcional)
- `tipo_chave_pix` (opcional)

## Configuração do ValidationPipe

O sistema está configurado com:
```typescript
new ValidationPipe({
  whitelist: true,           // Remove propriedades não definidas no DTO
  forbidNonWhitelisted: true, // Rejeita propriedades extras
  transform: true             // Transforma tipos automaticamente
})
```

Isso significa que **qualquer propriedade não definida no DTO será rejeitada**.

## Exemplo Completo

Veja o arquivo `requisicao-cidadao-correta.json` para um exemplo completo de requisição válida.

## Resumo

1. **Remova** os campos `cidadao_id` de todos os objetos em `contatos`, `enderecos`, `composicao_familiar` e `info_bancaria`
2. **Mantenha** apenas os campos definidos nos DTOs Body
3. **Certifique-se** de que todos os campos obrigatórios estão presentes
4. **Use** os tipos de enum corretos para campos como `sexo`, `estado_civil`, `tipo_conta`, etc.

O `cidadao_id` será automaticamente adicionado pelo sistema após a criação do cidadão.