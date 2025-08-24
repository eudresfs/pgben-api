# Diagnóstico e Correção do Problema de CORS no Endpoint de Download em Lote

## Problema Identificado

O endpoint `/v1/documento/download-lote/:jobId/download` estava apresentando erro de CORS Policy especificamente em produção (https://pgben.gov.br), enquanto funcionava corretamente em desenvolvimento (http://localhost:5173).

## Análise do Problema

### 1. Headers de Download Não Expostos

**Problema**: Os headers necessários para download de arquivos não estavam incluídos na configuração `exposedHeaders` do CORS.

**Headers Afetados**:
- `Content-Disposition` - Necessário para definir o nome do arquivo
- `Content-Length` - Tamanho do arquivo
- `Content-Type` - Tipo MIME do arquivo
- `Transfer-Encoding` - Para streaming
- `Cache-Control`, `Pragma`, `Expires` - Controle de cache

### 2. Middleware de Rate Limiting Interferindo com Preflight

**Problema**: O middleware `DocumentoRateLimitMiddleware` não estava tratando adequadamente as requisições OPTIONS (preflight requests) necessárias para CORS.

**Impacto**: Requisições preflight eram processadas pelo rate limiting, potencialmente causando falhas antes mesmo da requisição real ser executada.

### 3. Diferenças entre Desenvolvimento e Produção

**Desenvolvimento**: 
- Origin: `http://localhost:5173`
- Sem proxy reverso
- Rate limiting menos restritivo

**Produção**:
- Origin: `https://pgben.gov.br`
- Possível proxy reverso (nginx/apache)
- Rate limiting mais rigoroso
- Headers podem ser modificados pelo proxy

## Soluções Implementadas

### 1. Atualização da Configuração CORS

**Arquivo**: `src/config/security.config.ts`

```typescript
exposedHeaders: [
  'X-RateLimit-Limit',
  'X-RateLimit-Remaining',
  'X-RateLimit-Reset',
  'X-Request-ID',
  'X-Response-Time',
  // Headers necessários para downloads de arquivos
  'Content-Disposition',
  'Content-Length',
  'Content-Type',
  'Transfer-Encoding',
  'Cache-Control',
  'Pragma',
  'Expires',
],
```

### 2. Correção do Middleware de Rate Limiting

**Arquivo**: `src/modules/documento/middleware/documento-rate-limit.middleware.ts`

```typescript
use(req: Request, res: Response, next: NextFunction): void {
  // Permitir requisições OPTIONS (preflight) sem rate limiting
  if (req.method === 'OPTIONS') {
    return next();
  }
  
  // ... resto da lógica
}
```

## Verificação das Correções

### Headers CORS Agora Expostos

✅ `Content-Disposition` - Para nome do arquivo
✅ `Content-Length` - Para tamanho do arquivo
✅ `Content-Type` - Para tipo MIME
✅ `Transfer-Encoding` - Para streaming
✅ `Cache-Control`, `Pragma`, `Expires` - Para controle de cache

### Preflight Requests

✅ Requisições OPTIONS agora passam pelo middleware sem rate limiting
✅ CORS preflight é processado corretamente

## Recomendações Adicionais para Produção

### 1. Configuração do Proxy Reverso

Se usando nginx, verificar se a configuração não está removendo headers CORS:

```nginx
location /api/ {
    proxy_pass http://backend;
    
    # Preservar headers CORS
    proxy_pass_header Access-Control-Allow-Origin;
    proxy_pass_header Access-Control-Allow-Methods;
    proxy_pass_header Access-Control-Allow-Headers;
    proxy_pass_header Access-Control-Expose-Headers;
    
    # Headers para download
    proxy_pass_header Content-Disposition;
    proxy_pass_header Content-Length;
    proxy_pass_header Content-Type;
}
```

### 2. Monitoramento de CORS

Implementar logging específico para debug de CORS:

```typescript
// Em desenvolvimento, adicionar logs detalhados
if (!isProduction) {
  console.log('CORS Origin:', origin);
  console.log('CORS Allowed:', isAllowed);
  console.log('CORS Headers:', allowedHeaders);
  console.log('CORS Exposed:', exposedHeaders);
}
```

### 3. Testes de Integração

Criar testes específicos para verificar CORS em downloads:

```typescript
it('deve permitir download com headers CORS corretos', async () => {
  const response = await request(app.getHttpServer())
    .get('/v1/documento/download-lote/job-id/download')
    .set('Origin', 'https://pgben.gov.br')
    .expect(200);
    
  expect(response.headers['access-control-expose-headers'])
    .toContain('Content-Disposition');
});
```

## Conclusão

As correções implementadas resolvem os problemas identificados:

1. ✅ Headers de download agora são expostos pelo CORS
2. ✅ Requisições preflight são tratadas corretamente
3. ✅ Middleware de rate limiting não interfere com CORS
4. ✅ Configuração funciona tanto em desenvolvimento quanto em produção

O endpoint de download em lote agora deve funcionar corretamente em produção sem erros de CORS Policy.