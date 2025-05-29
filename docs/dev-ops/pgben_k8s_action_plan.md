# Plano de Ação - Simplificação K8s PGBen

## 🎯 Objetivo
Transformar a configuração atual (overengineered) em uma stack **simples, funcional e escalável** para o PGBen.

## 📋 Fase 1: Limpeza e Remoção (1 dia)

### ❌ Arquivos para DELETAR (Overengineering)
- [ ] `logstash-config.yaml` - **Redundante**, usar Filebeat direto
- [ ] `kibana-config.yaml` - **Redundante**, usar Grafana para visualização
- [ ] `elk-dashboards.json` - **Desnecessário**, Grafana é suficiente
- [ ] `filebeat-config.yaml` - **Complexo demais**, substituir por versão simples
- [ ] `grafana-datasource.yaml` - **Configuração desnecessária**, usar configuração inline
- [ ] `minio-audit-config.yaml` - **Overkill**, usar logs básicos por enquanto
- [ ] `verify-backups-cronjob.yaml` - **Prematuro**, implementar depois se necessário
- [ ] `rotate-secrets.sh` - **Complexo demais**, usar rotação manual por enquanto
- [ ] `configurar-seguranca-minio.sh` - **Script desnecessário**, usar configuração direta

### 📁 Dashboards para SIMPLIFICAR
- [ ] Manter apenas `grafana-dashboard-api.json` (renomear para `dashboard-main.json`)
- [ ] Deletar `grafana-dashboard-documents.json`
- [ ] Deletar `grafana-dashboard-security.json`
- [ ] Deletar `grafana-dashboard-system.json`
- [ ] Deletar `grafana-dashboard-database.json`

## 📋 Fase 2: Correção de Configurações Essenciais (2 dias)

### 🔧 Arquivos para CORRIGIR

#### 1. `secrets-config.yaml` - CRÍTICO
**Problemas:**
- Secrets hardcoded em base64
- Valores de exemplo expostos
- Estrutura inadequada

**Ações:**
- [ ] Remover todos os valores hardcoded
- [ ] Criar template com placeholders
- [ ] Separar secrets por tipo (DB, JWT, MinIO)
- [ ] Adicionar comentários explicativos

#### 2. `grafana-config.yaml` - ALTA
**Problemas:**
- Password em variável sem referência a Secret
- Configuração SMTP exposta

**Ações:**
- [ ] Referenciar passwords via Secrets
- [ ] Simplificar configuração
- [ ] Remover configurações desnecessárias

#### 3. `prometheus-config.yaml` - ALTA
**Problemas:**
- Muitos jobs desnecessários
- Targets que não existem
- Configuração complexa demais

**Ações:**
- [ ] Manter apenas jobs essenciais (pgben-api, postgres, node-exporter)
- [ ] Remover jobs de security/documents/system específicos
- [ ] Simplificar configuração de scraping

#### 4. `prometheus-rules.yaml` - MÉDIA
**Problemas:**
- Alertas para métricas que não existem
- Complexidade excessiva

**Ações:**
- [ ] Manter apenas alertas críticos (API down, DB down, High error rate)
- [ ] Remover alertas de LGPD/security específicos
- [ ] Simplificar expressions

#### 5. `alertmanager-config.yaml` - MÉDIA
**Problemas:**
- Configuração SMTP sem referência a Secret
- Templates complexos

**Ações:**
- [ ] Simplificar para email básico
- [ ] Referenciar SMTP credentials via Secret
- [ ] Remover Slack integration por enquanto

## 📋 Fase 3: Criação de Manifestos Essenciais (3 dias)

### 🆕 Arquivos para CRIAR (Críticos - Não existem!)

#### 1. Core Application (URGENTE)
- [ ] `pgben-api-deployment.yaml`
- [ ] `pgben-api-service.yaml`
- [ ] `pgben-api-ingress.yaml`
- [ ] `pgben-api-configmap.yaml`

#### 2. Database (URGENTE)
- [ ] `postgres-deployment.yaml`
- [ ] `postgres-service.yaml`
- [ ] `postgres-pvc.yaml`
- [ ] `postgres-configmap.yaml`

#### 3. Storage (URGENTE)
- [ ] `minio-deployment.yaml`
- [ ] `minio-service.yaml`
- [ ] `minio-pvc.yaml`
- [ ] `minio-configmap.yaml`

#### 4. Observabilidade Básica (IMPORTANTE)
- [ ] `prometheus-deployment.yaml`
- [ ] `prometheus-service.yaml`
- [ ] `prometheus-pvc.yaml`
- [ ] `grafana-deployment.yaml`
- [ ] `grafana-service.yaml`
- [ ] `grafana-pvc.yaml`

#### 5. Security & RBAC (IMPORTANTE)
- [ ] `pgben-serviceaccount.yaml`
- [ ] `pgben-rbac.yaml`
- [ ] `network-policies.yaml`

#### 6. Storage Classes (BÁSICO)
- [ ] `storage-classes.yaml`

## 📋 Fase 4: Simplificação de Configurações (1 dia)

### 📝 Arquivos para SIMPLIFICAR

#### 1. `backup-scripts-configmap.yaml` - Manter mas simplificar
**Ações:**
- [ ] Manter apenas `postgres-backup.sh`
- [ ] Remover `minio-backup.sh` (implementar depois)
- [ ] Remover `verify-backups.sh` (implementar depois)
- [ ] Simplificar script de PostgreSQL

#### 2. `postgres-backup-cronjob.yaml` - Simplificar
**Ações:**
- [ ] Remover verificações complexas
- [ ] Focar apenas em backup básico
- [ ] Simplificar variáveis de ambiente

#### 3. Dashboard principal - Simplificar
**Ações:**
- [ ] Manter apenas métricas essenciais no dashboard
- [ ] Remover panels complexos
- [ ] Focar em: Requests/min, Error rate, Response time, Health status

## 📋 Fase 5: Validação e Testes (1 dia)

### ✅ Checklist de Validação

#### Funcionalidade Básica
- [ ] API PGBen deploy e responde
- [ ] PostgreSQL conecta e persiste dados
- [ ] MinIO aceita upload/download de arquivos
- [ ] Prometheus coleta métricas básicas
- [ ] Grafana exibe dashboard principal
- [ ] Backup do PostgreSQL funciona

#### Segurança Básica
- [ ] Secrets não estão expostos
- [ ] ServiceAccount configurado
- [ ] RBAC básico funcionando
- [ ] Network policies básicas (opcional para MVP)

#### Operação Básica
- [ ] Logs visíveis via `kubectl logs`
- [ ] Health checks funcionando
- [ ] Resource limits configurados
- [ ] Backup automatizado funcionando

## 🗂️ Estrutura Final Simplificada

```
k8s/
├── core/
│   ├── pgben-api-deployment.yaml
│   ├── pgben-api-service.yaml
│   ├── pgben-api-ingress.yaml
│   └── pgben-api-configmap.yaml
├── database/
│   ├── postgres-deployment.yaml
│   ├── postgres-service.yaml
│   ├── postgres-pvc.yaml
│   └── postgres-configmap.yaml
├── storage/
│   ├── minio-deployment.yaml
│   ├── minio-service.yaml
│   ├── minio-pvc.yaml
│   └── minio-configmap.yaml
├── monitoring/
│   ├── prometheus-deployment.yaml
│   ├── prometheus-service.yaml
│   ├── prometheus-config.yaml
│   ├── grafana-deployment.yaml
│   ├── grafana-service.yaml
│   └── dashboard-main.json
├── security/
│   ├── secrets.yaml
│   ├── serviceaccount.yaml
│   └── rbac.yaml
├── backup/
│   ├── backup-pvc.yaml
│   ├── backup-scripts-configmap.yaml
│   └── postgres-backup-cronjob.yaml
└── infrastructure/
    └── storage-classes.yaml
```

## ⏱️ Timeline Resumido

| Fase | Duração | Prioridade | Descrição |
|------|---------|------------|-----------|
| **1** | 1 dia | 🔴 CRÍTICA | Deletar overengineering |
| **2** | 2 dias | 🔴 CRÍTICA | Corrigir configurações existentes |
| **3** | 3 dias | 🔴 CRÍTICA | Criar manifestos essenciais |
| **4** | 1 dia | 🟡 MÉDIA | Simplificar configurações |
| **5** | 1 dia | 🟡 MÉDIA | Validar e testar |

**Total: 8 dias úteis**

## 🎯 Métricas de Sucesso

### Antes (Atual)
- **Arquivos:** ~30 arquivos complexos
- **Serviços:** ~8 serviços diferentes
- **Linhas de config:** ~3000+ linhas
- **Complexidade:** ALTA
- **Status:** Não funciona

### Depois (Meta)
- **Arquivos:** ~15 arquivos simples
- **Serviços:** ~4 serviços essenciais
- **Linhas de config:** ~800 linhas
- **Complexidade:** BAIXA
- **Status:** Funcionando em produção

## 🚀 Próximos Passos

1. **Aprovação do plano** - Validar abordagem com stakeholders
2. **Backup das configurações atuais** - Criar branch para preservar trabalho
3. **Executar Fase 1** - Começar limpeza imediatamente
4. **Criar MVP** - Focar em fazer a aplicação funcionar primeiro
5. **Iterar** - Adicionar complexidade conforme necessidade real

## ⚠️ Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Perder funcionalidades importantes | BAIXA | MÉDIO | Revisar cada deletion com cuidado |
| Quebrar configurações existentes | BAIXA | BAIXO | Nada está funcionando atualmente |
| Resistance à simplificação | MÉDIA | BAIXO | Demonstrar valor com MVP funcionando |
| Necessidade futura de features removidas | ALTA | BAIXO | Manter backups e implementar sob demanda |

## 💡 Princípios Norteadores

1. **MVP First**: Fazer funcionar antes de otimizar
2. **YAGNI**: You Aren't Gonna Need It (pelo menos não agora)
3. **Simplicidade**: Preferir solução simples à complexa
4. **Incrementalidade**: Adicionar complexidade conforme necessidade comprovada
5. **Pragmatismo**: Resolver problemas reais, não hipotéticos