# Solução para Problema de CORS em Produção

## Problema Identificado

O sistema estava apresentando erros de CORS em produção, especificamente:

```
Access to XMLHttpRequest at 'https://api-semtas-natal.pgben.com.br/api/v1/documento/download-lote/...' 
from origin 'https://semtas-natal.pgben.com.br' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

Adicionalmente, estava ocorrendo erro `502 Bad Gateway`, indicando que o nginx não conseguia se comunicar com o backend NestJS.

## Análise da Causa Raiz

### 1. Problema de CORS no Nginx
- A configuração do nginx em produção não possuía headers CORS
- Quando ocorria erro 502 (backend indisponível), o nginx retornava resposta sem headers CORS
- O NestJS não conseguia processar as requisições para adicionar os headers CORS configurados

### 2. Erro 502 Bad Gateway
- Indica que o nginx não consegue se comunicar com o backend
- Pode ser causado por:
  - Serviço NestJS não rodando
  - Configuração incorreta de upstream
  - Problemas de rede/firewall
  - Restart necessário após alterações

## Soluções Implementadas

### 1. Configuração CORS no Backend (NestJS)

**Arquivo:** `src/config/security.config.ts`

```typescript
exposedHeaders: [
  'X-RateLimit-Limit',
  'X-RateLimit-Remaining', 
  'X-RateLimit-Reset',
  'X-Request-ID',
  'X-Response-Time',
  // Headers adicionados para downloads
  'Content-Disposition',
  'Content-Length',
  'Content-Type',
  'Transfer-Encoding',
  'Cache-Control',
  'Pragma',
  'Expires'
]
```

### 2. Correção do Middleware de Rate Limiting

**Arquivo:** `src/modules/documento/middleware/documento-rate-limit.middleware.ts`

```typescript
use(req: Request, res: Response, next: NextFunction): void {
  // Permitir requisições OPTIONS (preflight) sem rate limiting
  if (req.method === 'OPTIONS') {
    return next();
  }
  
  // ... resto da lógica de rate limiting
}
```

### 3. Configuração CORS no Nginx (Produção)

**Arquivo:** `config/nginx/nginx.prod.conf`

#### Headers CORS Globais
```nginx
# Headers CORS - aplicados sempre, mesmo em caso de erro
add_header 'Access-Control-Allow-Origin' 'https://semtas-natal.pgben.com.br' always;
add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,X-Request-ID' always;
add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range,Content-Disposition,Content-Type,Transfer-Encoding,Cache-Control,Pragma,Expires,X-RateLimit-Limit,X-RateLimit-Remaining,X-RateLimit-Reset,X-Request-ID,X-Response-Time' always;
add_header 'Access-Control-Allow-Credentials' 'true' always;
```

#### Tratamento de Requisições OPTIONS
```nginx
location / {
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' 'https://semtas-natal.pgben.com.br' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,X-Request-ID' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range,Content-Disposition,Content-Type,Transfer-Encoding,Cache-Control,Pragma,Expires,X-RateLimit-Limit,X-RateLimit-Remaining,X-RateLimit-Reset,X-Request-ID,X-Response-Time' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        add_header 'Access-Control-Max-Age' 1728000;
        add_header 'Content-Type' 'text/plain; charset=utf-8';
        add_header 'Content-Length' 0;
        return 204;
    }
    
    proxy_pass http://pgben_backend;
}
```

## Próximos Passos para Deploy

### 1. Deploy via Portainer

#### Opção A: Atualização via Portainer Web UI

1. **Acessar Portainer**
   - Acesse o Portainer em: `https://portainer.seu-dominio.com`
   - Faça login com suas credenciais

2. **Atualizar Stack/Container**
   - Navegue para `Stacks` ou `Containers`
   - Localize a stack/container `pgben-server`
   - Clique em `Editor` ou `Duplicate/Edit`

3. **Aplicar Nova Configuração**
   - Atualize o `docker-compose.yml` se necessário
   - Certifique-se que o volume do nginx está mapeado corretamente:
   ```yaml
   nginx:
     volumes:
       - ./config/nginx/nginx.prod.conf:/etc/nginx/conf.d/default.conf:ro
   ```

4. **Redeploy da Stack**
   - Clique em `Update the stack`
   - Marque `Re-pull image and redeploy`
   - Clique em `Update`

#### Opção B: Deploy via Docker Compose (Linha de Comando)

```bash
# 1. Conectar ao servidor via SSH
ssh usuario@servidor-producao

# 2. Navegar para o diretório do projeto
cd /caminho/para/pgben-server

# 3. Parar os containers
docker-compose down

# 4. Atualizar configuração do nginx (se necessário)
# O arquivo config/nginx/nginx.prod.conf já foi atualizado

# 5. Rebuild e restart dos containers
docker-compose up -d --build

# 6. Verificar status dos containers
docker-compose ps

# 7. Verificar logs
docker-compose logs nginx
docker-compose logs pgben-server
```

#### Opção C: Atualização Individual de Containers

```bash
# 1. Atualizar apenas o container do nginx
docker-compose up -d --no-deps nginx

# 2. Restart do backend se necessário
docker-compose restart pgben-server

# 3. Verificar saúde dos containers
docker-compose exec nginx nginx -t
docker-compose exec pgben-server curl http://localhost:3000/health
```

### 2. Verificação de Funcionamento

#### Via Portainer (Logs e Terminal)

1. **Verificar Logs no Portainer**
   - Acesse `Containers` → `pgben-server` → `Logs`
   - Acesse `Containers` → `nginx` → `Logs`
   - Procure por erros relacionados a CORS ou 502

2. **Terminal do Container (se necessário)**
   - Clique em `Console` no container nginx
   - Execute: `nginx -t` para testar configuração
   - Execute: `nginx -s reload` para recarregar

#### Via Linha de Comando

```bash
# Testar requisição OPTIONS
curl -X OPTIONS \
  -H "Origin: https://semtas-natal.pgben.com.br" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization" \
  -v https://api-semtas-natal.pgben.com.br/api/v1/documento/download-lote/test

# Verificar headers CORS na resposta
curl -H "Origin: https://semtas-natal.pgben.com.br" \
  -v https://api-semtas-natal.pgben.com.br/api/v1/health

# Verificar status dos containers
docker-compose ps

# Verificar logs em tempo real
docker-compose logs -f nginx
docker-compose logs -f pgben-server
```

### 3. Monitoramento

#### Via Portainer Dashboard

1. **Monitoramento de Containers**
   - Acesse `Dashboard` para visão geral
   - Monitore CPU, Memória e Network dos containers
   - Verifique `Container Status` (Running/Stopped)

2. **Logs Centralizados**
   - Use `Containers` → `Logs` para cada serviço
   - Configure `Auto-refresh` para monitoramento em tempo real
   - Filtre logs por nível (ERROR, WARN, INFO)

#### Via Linha de Comando

```bash
# Verificar logs do nginx container
docker-compose logs nginx | grep -i cors
docker-compose logs nginx | grep -i 502

# Verificar logs da aplicação
docker-compose logs pgben-server | grep -i error

# Monitorar métricas dos containers
docker stats

# Verificar saúde dos serviços
docker-compose exec pgben-server curl http://localhost:3000/health
```

#### Alertas e Notificações

- Configure alertas no Portainer para containers que param
- Monitore uso de recursos (CPU > 80%, Memory > 90%)
- Configure webhook notifications para falhas críticas
- Teste downloads de arquivos em lote regularmente

## Benefícios da Solução

1. **Redundância**: CORS configurado tanto no nginx quanto no NestJS
2. **Resiliência**: Headers CORS enviados mesmo em caso de erro 502
3. **Performance**: Requisições OPTIONS tratadas diretamente pelo nginx
4. **Segurança**: Configuração específica para o domínio de produção
5. **Compatibilidade**: Suporte completo a downloads de arquivos

## Configurações de Segurança

- Origin específico configurado (`https://semtas-natal.pgben.com.br`)
- Headers permitidos limitados aos necessários
- Credentials habilitados apenas quando necessário
- Cache de preflight configurado (20 dias)

## Troubleshooting

### Se ainda houver problemas de CORS:

#### Via Portainer:
1. **Verificar Container Nginx**
   - Acesse `Containers` → `nginx` → `Inspect`
   - Verifique se o volume da configuração está montado corretamente
   - Execute `nginx -t` no terminal do container

2. **Restart do Nginx**
   - Use `Restart` no container nginx via Portainer
   - Ou execute: `docker-compose restart nginx`

3. **Verificar Logs**
   - Acesse logs do nginx no Portainer
   - Procure por erros de configuração ou CORS

#### Via Linha de Comando:
```bash
# Verificar configuração do nginx
docker-compose exec nginx nginx -t

# Recarregar nginx
docker-compose exec nginx nginx -s reload

# Verificar se backend está respondendo
docker-compose exec pgben-server curl http://localhost:3000/health

# Testar CORS isoladamente
curl -H "Origin: https://semtas-natal.pgben.com.br" -v https://api-semtas-natal.pgben.com.br/api/v1/health
```

### Se houver erro 502:

#### Via Portainer:
1. **Verificar Status dos Containers**
   - Acesse `Dashboard` ou `Containers`
   - Verifique se `pgben-server` está `Running`
   - Verifique se não há restart loops

2. **Verificar Conectividade**
   - Use terminal do container nginx
   - Execute: `curl http://pgben-server:3000/health`
   - Verifique se a rede Docker está funcionando

3. **Restart Completo**
   - Use `Restart` na stack completa
   - Ou execute: `docker-compose down && docker-compose up -d`

#### Via Linha de Comando:
```bash
# Verificar status dos containers
docker-compose ps

# Verificar logs do backend
docker-compose logs pgben-server | tail -50

# Testar conectividade interna
docker-compose exec nginx curl http://pgben-server:3000/health

# Verificar rede Docker
docker network ls
docker network inspect pgben-server_default

# Restart completo se necessário
docker-compose down
docker-compose up -d
```

### Comandos Úteis para Debug:

```bash
# Verificar configuração atual do nginx
docker-compose exec nginx cat /etc/nginx/conf.d/default.conf

# Verificar variáveis de ambiente
docker-compose exec pgben-server env | grep -E '(NODE_ENV|PORT|DATABASE)'

# Verificar conectividade de rede
docker-compose exec nginx nslookup pgben-server

# Verificar portas abertas
docker-compose exec pgben-server netstat -tlnp

# Backup da configuração atual
docker-compose exec nginx cp /etc/nginx/conf.d/default.conf /tmp/nginx-backup.conf
```