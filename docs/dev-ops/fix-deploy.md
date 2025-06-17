# 🛠️ **GUIA COMPLETO PARA RESOLVER O PROBLEMA DE HEALTH CHECK**

## 📊 **Resumo do Problema**
- **Aplicação**: NestJS rodando na porta 3000
- **Endpoint disponível**: `/api/health/ready`
- **Kubernetes configurado para**: `/health` e `/health/ready`
- **Resultado**: Health checks falham com 404

---

## 🎯 **SOLUÇÕES DISPONÍVEIS**

### **OPÇÃO 1: Corrigir Health Checks no Kubernetes (RECOMENDADA)**

#### **Vantagens:**
- ✅ Solução imediata (2-3 minutos)
- ✅ Não requer mudança no código
- ✅ Não requer novo build/deploy
- ✅ Mantém histórico de deployment

#### **Desvantagens:**
- ⚠️ Mudança manual (não está no código)

#### **Passo-a-passo:**

**1. Aplicar o patch no deployment:**
```bash
kubectl patch deployment pgben-server -n consigmais --type='merge' -p='
{
  "spec": {
    "template": {
      "spec": {
        "containers": [
          {
            "name": "pgben-server",
            "livenessProbe": {
              "httpGet": {
                "path": "/api/health/ready",
                "port": 3000
              },
              "initialDelaySeconds": 120,
              "timeoutSeconds": 10,
              "periodSeconds": 30,
              "failureThreshold": 3
            },
            "readinessProbe": {
              "httpGet": {
                "path": "/api/health/ready", 
                "port": 3000
              },
              "initialDelaySeconds": 60,
              "timeoutSeconds": 5,
              "periodSeconds": 10,
              "failureThreshold": 3
            },
            "startupProbe": {
              "httpGet": {
                "path": "/api/health/ready",
                "port": 3000
              },
              "initialDelaySeconds": 30,
              "timeoutSeconds": 5,
              "periodSeconds": 10,
              "failureThreshold": 60
            }
          }
        ]
      }
    }
  }
}'
```

**2. Verificar se o patch foi aplicado:**
```bash
kubectl describe deployment pgben-server -n consigmais | grep -A 10 "Liveness\|Readiness\|Startup"
```

**3. Acompanhar o rollout:**
```bash
kubectl rollout status deployment/pgben-server -n consigmais --timeout=600s
```

**4. Verificar se pods ficaram saudáveis:**
```bash
kubectl get pods -n consigmais -l app=pgben-server
```

---

### **OPÇÃO 2: Adicionar Endpoints no Código da Aplicação**

#### **Vantagens:**
- ✅ Solução definitiva no código
- ✅ Segue padrões do Kubernetes
- ✅ Fica versionado no Git

#### **Desvantagens:**
- ⚠️ Requer mudança no código
- ⚠️ Requer novo build e deploy
- ⚠️ Mais tempo para implementar

#### **Passo-a-passo:**

**1. Criar controller de health básico:**
```typescript
// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  
  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('health/ready')
  ready() {
    return { status: 'ready', timestamp: new Date().toISOString() };
  }
}
```

**2. Registrar no módulo principal:**
```typescript
// src/app.module.ts
import { HealthController } from './health/health.controller';

@Module({
  // ... outros imports
  controllers: [
    // ... outros controllers
    HealthController,
  ],
  // ... resto da configuração
})
export class AppModule {}
```

**3. Fazer commit, build e deploy:**
```bash
git add .
git commit -m "feat: adicionar endpoints de health check básicos"
git push origin main
```

---

### **OPÇÃO 3: Usar NestJS TerminusModule (MAIS ROBUSTA)**

#### **Vantagens:**
- ✅ Health checks profissionais
- ✅ Verifica database, redis, etc.
- ✅ Padrão da indústria
- ✅ Mais informativo

#### **Desvantagens:**
- ⚠️ Implementação mais complexa
- ⚠️ Requer mais tempo

#### **Passo-a-passo:**

**1. Instalar dependências:**
```bash
npm install @nestjs/terminus
```

**2. Criar módulo de health:**
```typescript
// src/health/health.module.ts
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule, HttpModule],
  controllers: [HealthController],
})
export class HealthModule {}
```

**3. Criar controller com verificações:**
```typescript
// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck, TypeOrmHealthIndicator } from '@nestjs/terminus';

@Controller()
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
  ) {}

  @Get('health')
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
    ]);
  }

  @Get('health/ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.db.pingCheck('database'),
    ]);
  }
}
```

---

## 🚀 **RESOLUÇÃO IMEDIATA (RECOMENDAÇÃO)**

**Para resolver AGORA o problema no seu deploy:**

```bash
# 1. Execute este comando (vai funcionar em 2-3 minutos):
kubectl patch deployment pgben-server -n consigmais --type='merge' -p='
{
  "spec": {
    "template": {
      "spec": {
        "containers": [
          {
            "name": "pgben-server",
            "livenessProbe": {
              "httpGet": {
                "path": "/api/health/ready",
                "port": 3000
              }
            },
            "readinessProbe": {
              "httpGet": {
                "path": "/api/health/ready", 
                "port": 3000
              }
            },
            "startupProbe": {
              "httpGet": {
                "path": "/api/health/ready",
                "port": 3000
              }
            }
          }
        ]
      }
    }
  }
}'

# 2. Acompanhe o progresso:
kubectl rollout status deployment/pgben-server -n consigmais

# 3. Verifique se resolveu:
kubectl get pods -n consigmais -l app=pgben-server
```

## 📋 **RESOLUÇÃO DEFINITIVA (PARA O FUTURO)**

**Após resolver o problema imediato, implemente a Opção 2 ou 3** para ter os endpoints corretos no código e evitar esse problema em futuros deploys.

## ⏱️ **Timeline de Resolução**

- **Imediata (2-3 min)**: Opção 1 - Patch do Kubernetes
- **Curto prazo (30 min)**: Opção 2 - Endpoints básicos  
- **Médio prazo (2h)**: Opção 3 - TerminusModule completo

**🎯 Execute a Opção 1 agora para destravar o deploy, depois implemente a Opção 2 ou 3 para resolver definitivamente!**