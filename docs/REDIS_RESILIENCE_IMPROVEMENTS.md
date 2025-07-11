# Melhorias de Resiliência do Redis

## Problema Identificado

O servidor estava encerrando quando não conseguia conectar ao Redis, causando indisponibilidade total da aplicação. Isso acontecia porque:

1. O `BullModule` não tinha tratamento adequado de falhas de conexão
2. A estratégia de retry retornava `null` após falhas, causando crash
3. Exceções não tratadas do Redis eram capturadas pelos handlers globais de erro
4. Não havia fallback automático quando Redis não estava disponível

## Soluções Implementadas

### 1. Detecção Automática de Disponibilidade do Redis

**Arquivo:** `src/config/bull.config.ts`

- Implementada função `checkRedisAvailability()` que verifica se Redis está disponível
- Se Redis não estiver disponível, automaticamente desabilita as filas
- Configuração `DISABLE_REDIS_AUTO_DETECT` permite desabilitar esta verificação

### 2. Estratégia de Retry Melhorada

**Mudanças na configuração do Redis:**

- Reduzido `connectTimeout` de 10s para 5s (falha mais rápida)
- Reduzido tentativas de retry de 5 para 3
- **CRÍTICO:** Substituído `return null` por `return 300000` (5 minutos)
  - Evita crash da aplicação
  - Efetivamente desabilita tentativas por 5 minutos

### 3. Tratamento de Erros Críticos

**Novos tratamentos em `reconnectOnError`:**

```typescript
const criticalErrors = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'];
const isCritical = criticalErrors.some(error => err.message.includes(error));
if (isCritical) {
  logger.warn('Erro crítico do Redis detectado. Não tentando reconectar.');
  return false;
}
```

### 4. Tratamento de Erro na Inicialização do BullModule

**Arquivo:** `src/app.module.ts`

- Envolvido `getBullConfig()` em try/catch
- Em caso de erro, retorna configuração desabilitada
- Logs informativos sobre o status da inicialização

### 5. Handlers de Erro Globais Melhorados

**Arquivo:** `src/main.ts`

- Modificados handlers de `uncaughtException` e `unhandledRejection`
- Detecta erros relacionados ao Redis e não faz shutdown
- Lista de erros Redis monitorados:
  - `ECONNREFUSED`
  - `ENOTFOUND`
  - `ETIMEDOUT`
  - `Redis connection`
  - `Bull queue`
  - `ioredis`

## Configurações Disponíveis

### Variáveis de Ambiente

```bash
# Desabilitar Redis completamente
DISABLE_REDIS=true

# Desabilitar detecção automática de Redis (padrão: habilitado)
DISABLE_REDIS_AUTO_DETECT=false

# Configurações padrão do Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### Comportamentos por Configuração

| Cenário | DISABLE_REDIS | Auto Detect | Comportamento |
|---------|---------------|-------------|---------------|
| Redis disponível | false | true | Funciona normalmente |
| Redis indisponível | false | true | **Desabilita automaticamente** |
| Desenvolvimento | true | - | Desabilitado por configuração |
| Produção sem Redis | false | false | Tenta conectar (pode falhar) |

## Logs de Monitoramento

### Logs Informativos
```
[BullConfig] Redis não disponível. Desabilitando filas automaticamente.
[BullModule] Configuração do Bull inicializada com sucesso
[BullConfig] Tentativa 1 de conexão ao Redis falhou. Nova tentativa em 1000ms.
```

### Logs de Erro (Não Críticos)
```
[BullConfig] Falha ao conectar ao Redis após 3 tentativas. Continuando sem filas.
[Main] Erro do Redis detectado, mas aplicação continuará funcionando sem filas.
[Main] Promise rejeitada relacionada ao Redis, mas aplicação continuará funcionando.
```

## Impacto nas Funcionalidades

### Com Redis Disponível
- ✅ Todas as funcionalidades funcionam normalmente
- ✅ Filas de processamento ativas
- ✅ Cache Redis ativo
- ✅ SSE com Redis ativo

### Sem Redis (Fallback)
- ✅ Aplicação continua funcionando
- ✅ Cache em memória ativo (fallback)
- ⚠️ Filas desabilitadas (processamento síncrono)
- ⚠️ SSE limitado (sem persistência)
- ⚠️ Sem compartilhamento de cache entre instâncias

## Testes Recomendados

### 1. Teste com Redis Indisponível
```bash
# Parar Redis
sudo systemctl stop redis

# Iniciar aplicação
npm run start:dev

# Verificar logs - deve continuar funcionando
```

### 2. Teste de Reconexão
```bash
# Com aplicação rodando, parar Redis
sudo systemctl stop redis

# Aguardar logs de erro (não deve crashar)

# Reiniciar Redis
sudo systemctl start redis

# Verificar reconexão automática
```

### 3. Teste de Configuração
```bash
# Testar desabilitação manual
DISABLE_REDIS=true npm run start:dev

# Testar sem auto-detecção
DISABLE_REDIS_AUTO_DETECT=false npm run start:dev
```

## Monitoramento em Produção

### Métricas Importantes
- Status de conexão Redis
- Número de tentativas de reconexão
- Filas ativas/inativas
- Performance do cache (hit/miss ratio)

### Alertas Recomendados
- Redis indisponível por > 5 minutos
- Filas desabilitadas em produção
- Alto número de cache misses
- Erros de reconexão frequentes

## Próximos Passos

1. **Implementar Health Check Específico**
   - Endpoint dedicado para status Redis
   - Métricas de performance do cache

2. **Circuit Breaker Avançado**
   - Implementar circuit breaker com métricas
   - Reconexão automática inteligente

3. **Observabilidade**
   - Métricas Prometheus para Redis
   - Dashboard Grafana para monitoramento

4. **Testes Automatizados**
   - Testes de integração com Redis indisponível
   - Testes de reconexão automática

## Conclusão

Com essas melhorias, a aplicação agora é resiliente a falhas do Redis e continua funcionando mesmo quando o Redis não está disponível. O sistema automaticamente detecta a disponibilidade do Redis e se adapta adequadamente, garantindo alta disponibilidade da aplicação.