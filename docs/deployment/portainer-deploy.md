---
title: Deploy PGBen via Portainer
summary: Guia completo para publicar a API PGBen (Kubernetes) usando Portainer GUI/Stacks, incluindo bancos, MinIO, backups, monitoramento e alertas.
---

> Tempo estimado: **30–45 min** (recursos já criados)

## 1. Pré-requisitos

| Item | Versão mínima |
|------|---------------|
| Portainer CE/BE | 2.14 |
| Cluster Kubernetes | v1.24 |
| Namespace `pgben` | ainda não criado |
| Kubectl (opcional) | 1.24 |

* O agente Portainer deve estar autorizado no cluster.
* Git disponível para clonagem do repositório (`https://github.com/kemosoft-team/pgben-server`).
* Certificados TLS (MinIO, Ingress) já emitidos e salvos localmente (`tls.crt`, `tls.key`).

## 2. Estrutura de diretórios

```
pgben-server/
 └─ k8s/
    ├─ core/
    ├─ database/
    ├─ storage/
    ├─ backup/
    ├─ monitoring/
    └─ network-policy.yaml
```

## 3. Fluxo Macro

1. Criar `Namespace pgben`.
2. Definir **Secrets** sensíveis (DB, MinIO, API, TLS).
3. Definir **ConfigMaps** (MinIO config, e-mail, backup scripts, etc.).
4. Criar **PVCs** (MinIO, Postgres, Backups, Grafana).
5. Deploy dos manifests por stack Git ou upload.
6. Validar health endpoints, CronJobs e alertas.

## 4. Passo a Passo no Portainer

### 4.1. Namespace

1. Menu → **Kubernetes** → **Namespaces** → **+ Add Namespace**.
2. Nome: `pgben`. Limites de recursos opcionais.

### 4.2. Secrets

| Nome | Chaves obrigatórias | Observações |
|------|--------------------|-------------|
| **pgben-database-secrets** | `username`, `password`, `database` | Postgres |
| **pgben-minio-secrets** | `access-key`, `secret-key` | 16+ chars |
| **pgben-api-secrets** | `jwt_secret`, `encryption_key` | 32/64 chars |
| **minio-tls** | `tls.crt`, `tls.key` | Cert. wildcard ou específico |

**Portainer:** Menu → **Secrets** → **Add Secret** (selecionar `pgben` Namespace).

### 4.3. ConfigMaps

Crie os seguintes (Menu → **ConfigMaps**):

1. **minio-config** (conteúdo já no repo)
2. **minio-encryption-config** (`encryption.json` do repo)
3. **minio-audit-config** (`audit.yaml`)
4. **email-config** (`EMAIL_ENABLED`, `EMAIL_PROVIDER`, etc.)
5. **backup-scripts-configmap** (scripts `postgres-backup.sh`, `minio-backup.sh`)

> Dica: **Import YAML** para colar diretório completo.

### 4.4. Volumes (PVCs)

Crie StorageClass/persistent volumes se o cluster não provisiona automaticamente.

| PVC | Size | Classe |
|------|------|--------|
| `postgres-pvc` | 10Gi | `standard` |
| `minio-pvc` | 50Gi | `standard` |
| `backup-pvc` | 20Gi | `standard` |
| `grafana-pvc` | 5Gi | `standard` |

Portainer → **Storage** → **Persistent Volume Claims** → **+ Add**.

### 4.5. Deploy via Stack (Git)

1. **App Templates** ou **Stacks** → **Add Stack**.
2. Nome: `pgben-core`.
3. Git Repository: `https://github.com/kemosoft-team/pgben-server`.
4. Repository reference: `main` ou commit.
5. **Manifest path**: `k8s/` (Portainer lê todos os YAMLs recursivamente).
6. Namespace: `pgben`.
7. Deploy.

> Portainer executa `kubectl apply -k`. Se usar helm, adapte.

### 4.6. Verificações pós-deploy

```bash
kubectl -n pgben get pods
kubectl -n pgben get ingress
```

* Aguarde `minio`, `postgres`, `pgben-api`, `grafana`, etc. ficarem em **Running / Ready**.
* Verifique logs:
  ```bash
  kubectl -n pgben logs deploy/pgben-api | jq .
  ```
* Teste endpoints:
  - `https://api.pgben.gov.br/health` → `OK`
  - `https://api.pgben.gov.br/health/ready` → `OK`

### 4.7. CronJobs e Backups

```bash
kubectl -n pgben get cronjobs
```
* `postgres-backup` e `minio-backup` devem estar **scheduled**.

### 4.8. Prometheus Alerts

1. Abra Prometheus GUI → **Alerts**.
2. Confirme que a Rule Group `pgben-health.rules` carregou.
3. Force falha (escale MinIO para 0) e observe alerta `MinIOOffline`.

## 5. Rollback

* Cada stack em Portainer pode ser **rolled back** para o commit anterior.
* Ou execute: `kubectl delete -k k8s/`.

## 6. Dicas de Troubleshooting

| Sintoma | Ação |
|---------|------|
| Pod CrashLoopBackOff | `kubectl describe pod <name>` e verificar env/volumes |
| TLS handshake fail | Confirme secret `minio-tls` mountado; cert válido |
| Backups vazios | Verifique variáveis no CronJob + permissões PVC |

## 7. Próximos Passos

* Configurar Ingress Controller (Nginx/Traefik) se ainda não existir.
* Habilitar Auto-scaling (`HPA`) após carga real.
* Acionar pipeline CI/CD para push automático.
