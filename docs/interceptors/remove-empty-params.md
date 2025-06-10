# Interceptor de Remoção de Parâmetros Vazios

## Visão Geral

O `RemoveEmptyParamsInterceptor` é um interceptor global que remove automaticamente parâmetros vazios das requisições antes que cheguem aos controladores. Isso garante que apenas dados válidos sejam processados pela aplicação.

## Funcionalidades

### Valores Removidos

O interceptor remove os seguintes tipos de valores:

- **Strings vazias**: `""`
- **Strings com apenas espaços**: `"   "`, `"\t\n  "`
- **Valores null**: `null`
- **Valores undefined**: `undefined`
- **Arrays vazios**: `[]`
- **Objetos vazios**: `{}`

### Valores Preservados

Os seguintes valores **NÃO** são removidos:

- **Zero**: `0`
- **False**: `false`
- **Strings válidas**: `"texto"`
- **Arrays com elementos**: `[1, 2, 3]`
- **Objetos com propriedades**: `{ nome: "João" }`

## Métodos HTTP Afetados

O interceptor processa apenas requisições que enviam dados no body:

- ✅ **POST**
- ✅ **PUT** 
- ✅ **PATCH**
- ❌ **GET** (não processado)
- ❌ **DELETE** (não processado)

## Exemplos de Uso

### Exemplo 1: Remoção de Strings Vazias

**Requisição Original:**
```json
{
  "nome": "",
  "idade": 30,
  "email": "joao@email.com"
}
```

**Após Processamento:**
```json
{
  "idade": 30,
  "email": "joao@email.com"
}
```

### Exemplo 2: Preservação de Valores Falsy Válidos

**Requisição Original:**
```json
{
  "nome": "João",
  "idade": 0,
  "ativo": false,
  "descricao": null,
  "tags": []
}
```

**Após Processamento:**
```json
{
  "nome": "João",
  "idade": 0,
  "ativo": false
}
```

### Exemplo 3: Processamento de Objetos Aninhados

**Requisição Original:**
```json
{
  "usuario": {
    "nome": "João",
    "sobrenome": "",
    "endereco": {
      "rua": "Rua A",
      "numero": null,
      "cidade": {
        "nome": "São Paulo",
        "estado": ""
      }
    }
  },
  "configuracoes": {
    "tema": "",
    "notificacoes": true
  }
}
```

**Após Processamento:**
```json
{
  "usuario": {
    "nome": "João",
    "endereco": {
      "rua": "Rua A",
      "cidade": {
        "nome": "São Paulo"
      }
    }
  },
  "configuracoes": {
    "notificacoes": true
  }
}
```

### Exemplo 4: Processamento de Arrays

**Requisição Original:**
```json
{
  "usuarios": [
    {
      "nome": "João",
      "email": ""
    },
    {
      "nome": "",
      "email": "maria@email.com"
    }
  ],
  "tags": [],
  "categorias": ["categoria1"]
}
```

**Após Processamento:**
```json
{
  "usuarios": [
    {
      "nome": "João"
    },
    {
      "email": "maria@email.com"
    }
  ],
  "categorias": ["categoria1"]
}
```

## Implementação

### Localização

- **Arquivo**: `src/shared/interceptors/remove-empty-params.interceptor.ts`
- **Testes**: `src/shared/interceptors/remove-empty-params.interceptor.spec.ts`

### Registro Global

O interceptor é registrado globalmente no arquivo `main.ts`:

```typescript
// Interceptor para remover parâmetros vazios das requisições
app.useGlobalInterceptors(new RemoveEmptyParamsInterceptor());
```

### Ordem de Execução

O interceptor é executado **antes** do `ResponseInterceptor` para garantir que os dados sejam limpos antes do processamento.

## Benefícios

1. **Limpeza Automática**: Remove automaticamente dados desnecessários
2. **Consistência**: Garante que todos os controladores recebam dados limpos
3. **Performance**: Reduz o processamento de dados vazios
4. **Validação**: Facilita a validação ao remover campos vazios
5. **Manutenibilidade**: Centraliza a lógica de limpeza de dados

## Considerações

### Compatibilidade

- ✅ Compatível com DTOs do class-validator
- ✅ Compatível com TypeORM entities
- ✅ Compatível com Swagger/OpenAPI
- ✅ Não interfere com outros interceptors

### Performance

- Processamento recursivo otimizado
- Impacto mínimo na performance
- Execução apenas em métodos relevantes (POST, PUT, PATCH)

### Segurança

- Não remove dados sensíveis válidos
- Preserva estrutura de dados necessária
- Não interfere com validações de segurança

## Testes

Para executar os testes do interceptor:

```bash
npm test -- remove-empty-params.interceptor.spec.ts
```

Os testes cobrem:

- ✅ Remoção de strings vazias
- ✅ Remoção de valores null/undefined
- ✅ Preservação de valores falsy válidos
- ✅ Processamento de objetos aninhados
- ✅ Processamento de arrays
- ✅ Diferentes métodos HTTP
- ✅ Casos extremos (body null/undefined)

## Troubleshooting

### Problema: Dados válidos sendo removidos

**Solução**: Verificar se o valor não está sendo considerado "vazio" pelo interceptor. Valores como `0` e `false` são preservados.

### Problema: Interceptor não está funcionando

**Solução**: Verificar se o interceptor está registrado globalmente no `main.ts` e se o método HTTP é suportado (POST, PUT, PATCH).

### Problema: Conflito com outros interceptors

**Solução**: Verificar a ordem de registro dos interceptors. O `RemoveEmptyParamsInterceptor` deve ser registrado antes de interceptors que dependem dos dados limpos.