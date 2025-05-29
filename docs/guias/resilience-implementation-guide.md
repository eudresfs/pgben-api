# Guia de Implementação - Estratégias de Resiliência SEMTAS

## Visão Geral

Este guia fornece instruções detalhadas para implementar as estratégias de resiliência no Sistema SEMTAS, incluindo cache híbrido, auditoria resiliente e monitoramento avançado.

## 📋 Pré-requisitos

### Dependências do Sistema
- Node.js 20 LTS ou superior
- PostgreSQL 14+
- Redis 7.0+ (opcional, com fallback)
- Docker e Docker Compose (para monitoramento)
- PowerShell 5.1+ (Windows)

### Dependências NPM
```bash
npm install --save ioredis bull @nestjs/bull @nestjs/schedule @nestjs/cache-manager cache-manager
npm install --save-dev @types/ioredis
```

## 🚀 Implementação Passo a Passo

### Etapa 1: Configuração do Ambiente

1. **Copie o arquivo de exemplo de variáveis de ambiente:**
   ```bash
   cp .env.resilience.example .env.resilience
   ```

2. **Configure as variáveis de ambiente:**
   ```bash
   # Edite o arquivo .env.resilience com suas configurações
   notepad .env.resilience
   ```

3. **Execute o script de configuração automatizada:**
   ```powershell
   .\scripts\setup-resilience.ps1
   ```

### Etapa 2: Integração dos Módulos

1. **Importe o ResilienceModule no AppModule:**
   ```typescript
   // src/app.module.ts
   import { ResilienceModule } from './shared/modules/resilience.module';
   
   @Module({
     imports: [
       // ... outros módulos
       ResilienceModule,
     ],
     // ...
   })
   export class AppModule {}
   ```

2. **Configure o módulo de cache no AppModule:**
   ```typescript
   // src/app.module.ts
   import { CacheModule } from '@nestjs/cache-manager';
   import { cacheConfig } from './config/cache.config';
   
   @Module({
     imports: [
       CacheModule.registerAsync(cacheConfig),
       // ... outros módulos
     ],
     // ...
   })
   export class AppModule {}
   ```

### Etapa 3: Configuração do Redis (Opcional)

1. **Instalação local do Redis:**
   ```bash
   # Windows (usando Chocolatey)
   choco install redis-64
   
   # Ou usando Docker
   docker run -d --name redis -p 6379:6379 redis:7-alpine
   ```

2. **Configuração de produção:**
   ```bash
   # Azure Redis Cache ou AWS ElastiCache
   # Configure a string de conexão nas variáveis de ambiente
   ```

### Etapa 4: Configuração do Banco de Dados

1. **Execute as migrações do Prisma:**
   ```bash
   npx prisma migrate dev --name add-auditoria-resilience
   ```

2. **Gere o cliente Prisma:**
   ```bash
   npx prisma generate
   ```

### Etapa 5: Configuração do Monitoramento

1. **Inicie os serviços de monitoramento:**
   ```bash
   docker-compose -f docker-compose.monitoring.yml up -d
   ```

2. **Acesse os dashboards:**
   - Grafana: http://localhost:3001 (admin/admin)
   - Prometheus: http://localhost:9090
   - Alertmanager: http://localhost:9093

3. **Importe o dashboard do Grafana:**
   - Acesse Grafana → Dashboards → Import
   - Carregue o arquivo `monitoring/grafana/dashboards/resilience-dashboard.json`

## 🔧 Configuração Detalhada

### Cache Híbrido

```typescript
// Exemplo de uso do HybridCacheService
import { HybridCacheService } from './shared/services/hybrid-cache.service';

@Injectable()
export class ExampleService {
  constructor(private cacheService: HybridCacheService) {}

  async getData(key: string) {
    return this.cacheService.getOrSet(
      key,
      async () => {
        // Factory function - busca dados do banco
        return await this.repository.findData();
      },
      300, // TTL em segundos
      1    // Prioridade (0-2)
    );
  }
}
```

### Auditoria Resiliente

```typescript
// Exemplo de uso do ResilientAuditoriaService
import { ResilientAuditoriaService } from './shared/services/resilient-auditoria.service';

@Injectable()
export class ExampleService {
  constructor(private auditoriaService: ResilientAuditoriaService) {}

  async processarSolicitacao(dados: any) {
    // Processa a solicitação
    const resultado = await this.processar(dados);

    // Registra auditoria de forma resiliente
    await this.auditoriaService.registrarLog({
      acao: 'PROCESSAR_SOLICITACAO',
      recurso: 'solicitacao',
      usuarioId: dados.usuarioId,
      detalhes: { id: resultado.id },
      dadosSensiveis: { cpf: dados.cpf }
    });

    return resultado;
  }
}
```

### Monitoramento de Resiliência

```typescript
// Endpoints de monitoramento disponíveis
GET /api/resilience/status          // Status geral do sistema
GET /api/resilience/metrics/cache   // Métricas do cache
GET /api/resilience/metrics/auditoria // Métricas da auditoria
POST /api/resilience/cache/warm     // Forçar cache warming
POST /api/resilience/auditoria/recover // Processar logs de backup
DELETE /api/resilience/cache/clear  // Limpar cache
```

## 🧪 Testes de Resiliência

### Testes Unitários

```bash
# Executar todos os testes de resiliência
npm test -- --testPathPattern=resilience

# Testes específicos
npm test hybrid-cache.service.spec.ts
npm test resilient-auditoria.service.spec.ts
npm test resilience-monitoring.controller.spec.ts
```

### Teste de Carga

```bash
# Teste de carga básico (1 minuto, 10 workers)
node scripts/load-test-resilience.js

# Teste de carga personalizado
TEST_DURATION=300000 TEST_CONCURRENCY=20 node scripts/load-test-resilience.js
```

### Testes de Falha

1. **Teste de falha do Redis:**
   ```bash
   # Pare o Redis e observe o fallback
   docker stop redis
   
   # Verifique os logs da aplicação
   tail -f logs/app.log
   ```

2. **Teste de falha do PostgreSQL:**
   ```bash
   # Simule alta latência no banco
   # Observe o comportamento da auditoria
   ```

3. **Teste de alta carga de memória:**
   ```bash
   # Execute múltiplos testes de carga simultaneamente
   # Observe o comportamento do cache L1
   ```

## 📊 Monitoramento e Alertas

### Métricas Principais

1. **Cache:**
   - Hit rate L1 e L2
   - Latência de operações
   - Uso de memória
   - Status do circuit breaker

2. **Auditoria:**
   - Itens pendentes na fila
   - Taxa de fallback síncrono
   - Logs salvos em arquivo
   - Latência de processamento

3. **Sistema:**
   - Disponibilidade dos serviços
   - Uso de recursos
   - Taxa de erros

### Configuração de Alertas

1. **Edite o arquivo de configuração:**
   ```yaml
   # monitoring/alertmanager.yml
   # Configure destinatários de e-mail e Slack
   ```

2. **Teste os alertas:**
   ```bash
   # Simule condições de alerta
   curl -X POST http://localhost:9093/api/v1/alerts
   ```

## 🔒 Segurança e LGPD

### Proteção de Dados Sensíveis

1. **Configuração de sanitização:**
   ```bash
   # .env.resilience
   RESILIENCE_SECURITY_SANITIZE_LOGS=true
   RESILIENCE_SECURITY_ENCRYPT_SENSITIVE_DATA=true
   ```

2. **Rotação de logs:**
   ```bash
   # Configure rotação automática
   RESILIENCE_LOGGING_MAX_FILES=30
   RESILIENCE_LOGGING_MAX_SIZE=100MB
   ```

### Auditoria de Acesso

```typescript
// Todos os acessos a dados sensíveis são automaticamente auditados
const usuario = await this.usuarioService.findByCpf(cpf);
// ↑ Gera log de auditoria automaticamente
```

## 🚨 Troubleshooting

### Problemas Comuns

1. **Redis não conecta:**
   ```bash
   # Verifique se o Redis está rodando
   redis-cli ping
   
   # Verifique as configurações
   echo $REDIS_URL
   ```

2. **Cache L1 com alta utilização de memória:**
   ```bash
   # Reduza o tamanho máximo do cache
   RESILIENCE_CACHE_L1_MAX_SIZE=50MB
   ```

3. **Fila de auditoria com muitos itens pendentes:**
   ```bash
   # Aumente o número de workers
   RESILIENCE_AUDITORIA_QUEUE_CONCURRENCY=5
   
   # Ou processe manualmente
   curl -X POST http://localhost:3000/api/resilience/auditoria/recover
   ```

4. **Alertas não funcionam:**
   ```bash
   # Verifique a configuração do Alertmanager
   docker logs alertmanager
   
   # Teste a conectividade SMTP
   telnet smtp.gmail.com 587
   ```

### Logs de Debug

```bash
# Ative logs detalhados
RESILIENCE_LOGGING_LEVEL=debug

# Monitore logs em tempo real
tail -f logs/resilience.log
```

## 📈 Otimização de Performance

### Cache

1. **Ajuste o tamanho do cache L1:**
   ```bash
   # Para aplicações com muita memória disponível
   RESILIENCE_CACHE_L1_MAX_SIZE=200MB
   ```

2. **Configure cache warming:**
   ```typescript
   // Registre dados críticos para warming
   await this.cacheService.registerWarmupData('usuarios-ativos', async () => {
     return await this.usuarioService.findAtivos();
   });
   ```

### Auditoria

1. **Ajuste o batch size:**
   ```bash
   RESILIENCE_AUDITORIA_QUEUE_BATCH_SIZE=50
   ```

2. **Configure retenção de logs:**
   ```bash
   RESILIENCE_AUDITORIA_FILE_RETENTION_DAYS=90
   ```

## 🔄 Manutenção

### Rotinas Diárias

1. **Verificar métricas no Grafana**
2. **Revisar alertas no Alertmanager**
3. **Monitorar logs de erro**
4. **Verificar uso de recursos**

### Rotinas Semanais

1. **Executar teste de carga**
2. **Revisar configurações de cache**
3. **Limpar logs antigos**
4. **Atualizar dashboards**

### Rotinas Mensais

1. **Revisar estratégia de resiliência**
2. **Atualizar documentação**
3. **Treinar equipe em novos procedimentos**
4. **Avaliar necessidade de ajustes**

## 📚 Referências

- [Documentação do Redis](https://redis.io/documentation)
- [Guia do Bull Queue](https://github.com/OptimalBits/bull)
- [Prometheus Monitoring](https://prometheus.io/docs/)
- [Grafana Dashboards](https://grafana.com/docs/)
- [NestJS Caching](https://docs.nestjs.com/techniques/caching)

## 🆘 Suporte

Para dúvidas ou problemas:

1. **Consulte os logs:** `logs/resilience.log`
2. **Verifique métricas:** Grafana Dashboard
3. **Execute diagnósticos:** `npm run resilience:health-check`
4. **Contate a equipe:** Slack #semtas-tech

---

**Última atualização:** $(date)
**Versão:** 1.0.0
**Autor:** Arquiteto de Software SEMTAS