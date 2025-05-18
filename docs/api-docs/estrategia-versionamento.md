# Estratégia de Versionamento da API PGBen

## Visão Geral

Este documento descreve a estratégia de versionamento adotada pela API do PGBen, incluindo políticas de suporte, depreciação e boas práticas para consumidores da API.

## Estratégia de Versionamento

### Versionamento por URL

A API utiliza versionamento por URL, seguindo o padrão:

```
/v{major}/recurso
```

Exemplos:
- `GET /v1/cidadao`
- `POST /v1/beneficio`
- `GET /v1/unidade/123`

### Versionamento Semântico

A API segue o versionamento semântico (SemVer) no formato `MAJOR.MINOR.PATCH`:

- **MAJOR**: Mudanças que quebram a compatibilidade com versões anteriores
- **MINOR**: Adição de funcionalidades que mantêm compatibilidade
- **PATCH**: Correções de bugs e melhorias que não afetam a API

## Políticas de Suporte

### Ciclo de Vida das Versões

| Estágio | Descrição | Duração |
|---------|-----------|---------|
| Ativo | Versão atual e totalmente suportada | 12 meses após o lançamento |
| Manutenção | Apenas correções críticas de segurança | 6 meses |
| Descontinuada | Sem suporte | - |

### Política de Depreciação

1. **Aviso de descontinuação** com 6 meses de antecedência
2. Documentação detalhada sobre como migrar para a nova versão
3. Período de sobreposição onde ambas as versões estarão disponíveis
4. Notificações via changelog e e-mail para consumidores registrados

## Boas Práticas para Consumidores

### Headers Recomendados

```http
Accept: application/json
Accept-Version: v1  # Versão específica desejada
```

### Tratamento de Erros

Todas as respostas de erro seguem o formato padrão:

```json
{
  "statusCode": 400,
  "timestamp": "2025-05-17T21:45:23.000Z",
  "path": "/v1/recurso",
  "message": "Mensagem de erro descritiva",
  "errorCode": "CODIGO_ERRO_PADRONIZADO",
  "details": {
    // Detalhes adicionais sobre o erro
  }
}
```

### Códigos de Status HTTP

A API utiliza os seguintes códigos de status HTTP:

- `200 OK`: Requisição bem-sucedida
- `201 Created`: Recurso criado com sucesso
- `204 No Content`: Sucesso sem conteúdo de retorno
- `400 Bad Request`: Requisição inválida
- `401 Unauthorized`: Autenticação necessária
- `403 Forbidden`: Permissão negada
- `404 Not Found`: Recurso não encontrado
- `409 Conflict`: Conflito com o estado atual
- `422 Unprocessable Entity`: Erro de validação
- `429 Too Many Requests`: Limite de requisições excedido
- `500 Internal Server Error`: Erro interno do servidor

## Exemplos de Uso

### Requisição com Versionamento

```http
GET /v1/cidadao/123 HTTP/1.1
Host: api.pgben.local
Accept: application/json
Authorization: Bearer seu-token-aqui
```

### Resposta de Sucesso

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-API-Version: v1

{
  "id": "123",
  "nome": "Fulano de Tal",
  // ... outros campos
}
```

### Resposta de Erro

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json
X-API-Version: v1

{
  "statusCode": 400,
  "timestamp": "2025-05-17T21:45:23.000Z",
  "path": "/v1/cidadao/123",
  "message": "CPF inválido",
  "errorCode": "CPF_INVALIDO",
  "details": {
    "campo": "cpf",
    "valor": "123.456.789-00"
  }
}
```

## Migração entre Versões

### Guia de Migração v1 → v2

1. **Mudanças que quebram compatibilidade**
   - Lista de endpoints alterados/removidos
   - Mudanças nos schemas de requisição/resposta

2. **Novos recursos**
   - Lista de novos endpoints e funcionalidades

3. **Exemplos de migração**
   ```javascript
   // Código antigo
   fetch('/v1/cidadao/123');
   
   // Novo código
   fetch('/v2/pessoas/123');
   ```

## Limitações e Cotas

### Limites de Taxa (Rate Limiting)

- **Plano Básico**: 100 requisições por minuto
- **Plano Pro**: 1.000 requisições por minuto
- **Plano Enterprise**: 10.000 requisições por minuto

### Headers de Controle

- `X-RateLimit-Limit`: Número total de requisições permitidas
- `X-RateLimit-Remaining`: Número de requisições restantes
- `X-RateLimit-Reset`: Timestamp de quando o contador será reiniciado

### Monitoramento

Os consumidores podem monitorar seu uso através do endpoint:

```
GET /v1/usage
```

## Contato e Suporte

- **Documentação**: https://docs.pgben.com/api
- **Suporte**: api-suporte@pgben.com.br
- **Status da API**: https://status.pgben.com

---

**Última atualização**: 17/05/2025  
**Versão deste documento**: 1.0.0
