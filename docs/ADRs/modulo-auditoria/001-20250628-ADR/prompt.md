## Situação Específica
✅ Eventos síncronos funcionam  
✅ Jobs são adicionados à fila corretamente  
✅ AuditProcessor existe e inicializa  
❌ Worker NÃO consome/processa jobs da fila  

## Investigação - Por Que Worker Não Consome Jobs

### FASE 1: Verificar Listener de Eventos da Fila

#### 1A. Adicionar Logs nos Event Listeners
```typescript
// No audit.processor.ts, adicionar logs em TODOS os listeners:

@OnQueueActive()
onActive(job: Job) {
  console.log('🚨 EVENTO QUEUE ACTIVE - JOB INICIOU:', job.id);
}

@OnQueueWaiting()
onWaiting(jobId: string) {
  console.log('🚨 EVENTO QUEUE WAITING - JOB ESPERANDO:', jobId);
}

@OnQueueProgress()
onProgress(job: Job, progress: number) {
  console.log('🚨 EVENTO QUEUE PROGRESS:', job.id, progress);
}

@OnQueueCompleted()
onCompleted(job: Job, result: any) {
  console.log('🚨 EVENTO QUEUE COMPLETED:', job.id, result);
}

@OnQueueFailed()
onFailed(job: Job, error: Error) {
  console.log('🚨 EVENTO QUEUE FAILED:', job.id, error.message);
}

@OnQueueStalled()
onStalled(job: Job) {
  console.log('🚨 EVENTO QUEUE STALLED - JOB TRAVADO:', job.id);
}
```

#### 1B. Adicionar Log de Tentativa de Processamento
```typescript
@Process('process-audit-event')
async processAuditEvent(job: Job<AuditJobData>): Promise<AuditProcessingResult> {
  console.log('🚨🚨🚨 WORKER TENTANDO PROCESSAR JOB:', {
    jobId: job.id,
    jobName: job.name,
    timestamp: new Date().toISOString(),
    data: job.data
  });
  
  // resto do código...
}
```

### FASE 2: Verificar Configuração do Worker vs Fila

#### 2A. Verificar Nome da Fila nos Dois Lados
```powershell
# Buscar TODAS as configurações de fila 'auditoria'
Select-String -Path "src\**\*.ts" -Pattern "auditoria" | Where-Object { $_.Line -match "registerQueue|Processor" }
```

#### 2B. Verificar se Há Conflito de Configuração
```typescript
// Verificar se há múltiplas configurações conflitantes:
// 1. auditoria.module.ts registra fila 'auditoria'
// 2. AuditProcessor tem @Processor('auditoria')
// 3. Nome deve ser EXATAMENTE igual

// Buscar por padrões como:
BullModule.registerQueue({ name: 'auditoria' })    // ← Fila
BullModule.registerQueueAsync({ name: 'auditoria' }) // ← Fila
@Processor('auditoria')                              // ← Worker
```

### FASE 3: Testar Worker Manualmente

#### 3A. Criar Método de Teste Direto
```typescript
// Adicionar no AuditProcessor:
async testDirectProcessing() {
  console.log('🚨 TESTANDO PROCESSAMENTO DIRETO DO WORKER');
  
  const mockJob = {
    id: 'test-direct-' + Date.now(),
    name: 'process-audit-event',
    data: {
      event: {
        eventType: 'TEST_DIRECT',
        entityName: 'Test',
        timestamp: new Date()
      }
    },
    progress: async (p) => console.log(`Progress: ${p}%`)
  } as any;
  
  try {
    const result = await this.processAuditEvent(mockJob);
    console.log('🚨 PROCESSAMENTO DIRETO FUNCIONOU:', result);
    return result;
  } catch (error) {
    console.error('🚨 PROCESSAMENTO DIRETO FALHOU:', error);
    throw error;
  }
}
```

#### 3B. Criar Endpoint para Teste
```typescript
@Get('/test-worker-direct')
async testWorkerDirect() {
  try {
    const result = await this.auditProcessor.testDirectProcessing();
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### FASE 4: Verificar Workers Ativos no Redis

#### 4A. Verificar Workers Conectados
```powershell
docker exec -it pgben-redis redis-cli
AUTH sua_senha

# Ver workers conectados
CLIENT LIST | findstr "bull"

# Ver configuração da fila
HGETALL "bull:auditoria:meta"

# Ver se há workers registrados
KEYS "bull:auditoria:*" | findstr worker
```

#### 4B. Forçar Processamento Manual
```powershell
docker exec -it pgben-redis redis-cli
AUTH sua_senha

# Mover job da wait para active manualmente (teste)
LMOVE "bull:auditoria:wait" "bull:auditoria:active" LEFT RIGHT

# Ver se worker pega o job ativo
LLEN "bull:auditoria:active"
```

### FASE 5: Verificar Configuração Bull no Módulo

#### 5A. Examinar Registro do Processador
```powershell
# Encontrar onde AuditProcessor está registrado
Select-String -Path "src\**\*.ts" -Pattern "AuditProcessor" | Where-Object { $_.Line -match "providers" }
```

#### 5B. Verificar Import/Export Chain
```typescript
// Verificar cadeia completa:
// 1. AuditProcessor em providers do módulo
// 2. Módulo importado no AppModule  
// 3. BullModule.registerQueue no mesmo módulo
// 4. Configuração Redis correta

// Deve ser algo como:
@Module({
  imports: [
    BullModule.registerQueue({ name: 'auditoria' }), // ← Fila
  ],
  providers: [
    AuditProcessor, // ← Worker
  ]
})
```

### FASE 6: Debug de Inicialização

#### 6A. Adicionar Logs de Módulo
```typescript
// No módulo que contém AuditProcessor:
export class AuditoriaModule {
  constructor() {
    console.log('🚨 AUDITORIA MODULE INICIALIZADO');
    console.log('🚨 AuditProcessor deve estar registrado agora');
  }
  
  onModuleInit() {
    console.log('🚨 AUDITORIA MODULE INIT COMPLETO');
  }
}
```

#### 6B. Verificar Ordem de Inicialização
```typescript
// No AuditProcessor, adicionar mais logs:
onModuleInit() {
  console.log('🚨 AUDIT PROCESSOR MODULE INIT');
  console.log('🚨 Pronto para processar jobs da fila auditoria');
}

onApplicationBootstrap() {
  console.log('🚨 AUDIT PROCESSOR APPLICATION BOOTSTRAP');
  console.log('🚨 Sistema totalmente inicializado');
}
```

## Ação Imediata

1. **Execute FASE 1A/1B** - Adicionar logs em todos os event listeners
2. **Execute FASE 3B** - Testar worker direto 
3. **Gerar evento assíncrono** (ex: atualizar pendência)
4. **Verificar logs** - qual evento listener dispara (se algum)?

## Causas Mais Prováveis

1. **Worker não está registrado** no módulo certo
2. **Nome da fila não bate** exatamente
3. **Múltiplas configurações** da mesma fila causando conflito
4. **Ordem de inicialização** - worker inicia antes da fila
5. **Configuração Redis** não permite workers múltiplos

**Se nenhum log de event listener aparecer = worker não está conectado à fila.**
```

**Foco específico:** O worker existe mas não está "escutando" ou consumindo jobs da fila. Os logs de event listeners vão mostrar se o worker está realmente conectado.