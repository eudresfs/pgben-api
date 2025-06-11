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

Os Secrets armazenam dados sensíveis como senhas, chaves de API e certificados TLS. Crie-os no namespace `pgben`.

**Como criar um Secret no Portainer:**
1.  No menu lateral, vá para **Kubernetes**.
2.  Selecione o cluster e depois o namespace `pgben` (se já criado, caso contrário, crie-o primeiro conforme seção 4.1).
3.  Clique em **Secrets** no menu do namespace.
4.  Clique em **+ Add with form**.
5.  Preencha os campos:
    *   **Name**: O nome do Secret (ex: `pgben-database-secrets`).
    *   **Type**: `Opaque` para a maioria dos casos, ou `kubernetes.io/tls` para `minio-tls`.
    *   **Data**: Adicione cada par chave-valor. Os valores devem ser strings simples, o Portainer/Kubernetes fará o encode para base64 automaticamente.
        *   Para `pgben-database-secrets` (Tipo: `Opaque`):
            *   `host`: `postgres` (ou o nome do serviço do seu PostgreSQL)
            *   `port`: `5432`
            *   `username`: `seu_usuario_postgres`
            *   `password`: `sua_senha_postgres`
            *   `database`: `nome_do_banco_pgben`
        *   Para `pgben-minio-secrets` (Tipo: `Opaque`):
            *   `access-key`: `seu_minio_access_key` (mínimo 3 caracteres)
            *   `secret-key`: `seu_minio_secret_key` (mínimo 8 caracteres)
        *   Para `pgben-api-secrets` (Tipo: `Opaque`):
            *   `jwt_secret`: `sua_chave_secreta_jwt_bem_longa_e_segura`
            *   `encryption_key`: `sua_outra_chave_secreta_para_criptografia_igualmente_longa`
        *   Para `minio-tls` (Tipo: `kubernetes.io/tls`):
            *   No campo **Certificate**, cole o conteúdo do seu arquivo `tls.crt`.
            *   No campo **Key**, cole o conteúdo do seu arquivo `tls.key`.
6.  Clique em **Create secret**.

**Tabela Resumo dos Secrets:**

| Nome                       | Chaves Obrigatórias (Exemplos de Valores)                     | Tipo                | Observações                                      |
| -------------------------- | --------------------------------------------------------------- | ------------------- | ------------------------------------------------ |
| `pgben-database-secrets`   | `host`, `port`, `username`, `password`, `database`              | Opaque              | Credenciais do PostgreSQL                         |
| `pgben-minio-secrets`      | `access-key` (ex: `minio`), `secret-key` (ex: `minio123`)       | Opaque              | Credenciais do MinIO (mínimo 16 caracteres)       |
| `pgben-api-secrets`        | `jwt_secret`, `encryption_key`                                  | Opaque              | Chaves para JWT e criptografia (32/64 caracteres) |
| `minio-tls`                | `tls.crt` (conteúdo do cert), `tls.key` (conteúdo da chave)     | kubernetes.io/tls   | Certificado TLS para MinIO (wildcard ou específico) |

### 4.3. ConfigMaps

ConfigMaps armazenam configurações não sensíveis, como URLs, scripts ou arquivos de configuração.

**Como criar um ConfigMap no Portainer:**
1.  No menu lateral, vá para **Kubernetes**.
2.  Selecione o cluster e depois o namespace `pgben`.
3.  Clique em **ConfigMaps** no menu do namespace.
4.  Você tem duas opções principais: **+ Add with form** ou **+ Create from YAML**.

**Opção A: Add with form (para pares chave-valor simples)**
   Útil para ConfigMaps como `email-config`.
1.  Clique em **+ Add with form**.
2.  **Name**: Digite o nome do ConfigMap (ex: `email-config`).
3.  **Data entries**: Clique em **+ Add data entry** para cada par chave-valor.
    *   Para `email-config` (exemplo):
        *   Chave: `EMAIL_ENABLED`, Valor: `true`
        *   Chave: `EMAIL_PROVIDER`, Valor: `ses` (ou `smtp`)
        *   Chave: `EMAIL_FROM`, Valor: `nao-responda@pgben.gov.br`
        *   (Adicione outras chaves conforme necessário: `SES_REGION`, `SMTP_HOST`, etc. Lembre-se que credenciais como `AWS_ACCESS_KEY_ID_SES` devem ir em Secrets).
4.  Clique em **Create ConfigMap**.

**Opção B: Create from YAML (para conteúdo de arquivos ou estruturas complexas)**
   Esta é a maneira mais fácil de criar ConfigMaps a partir dos arquivos YAML do seu repositório (`k8s/`).
1.  Clique em **+ Create from YAML**.
2.  No editor, cole o conteúdo YAML completo do arquivo do repositório. 
    Por exemplo, para criar o `minio-encryption-config`:
    *   Abra o arquivo `k8s/storage/minio-encryption-config.yaml` no seu editor de código.
    *   Copie todo o seu conteúdo.
    *   Cole no editor YAML do Portainer.
    *   **Importante**: Certifique-se que `metadata.namespace` no YAML está definido como `pgben` ou remova a linha `namespace` para que o Portainer use o namespace selecionado.
    ```yaml
    # Exemplo de conteúdo para k8s/storage/minio-encryption-config.yaml
    apiVersion: v1
    kind: ConfigMap
    metadata:
      name: minio-encryption-config
      namespace: pgben # Verifique ou remova esta linha
    data:
      encryption.json: |-
        {
          "kms": {
            "mykms": {
              "vault": {
                "address": "http://vault.default.svc.cluster.local:8200",
                "auth": {
                  "type": "kubernetes",
                  "kubernetes": {
                    "role": "minio-role",
                    "mount_path": "kubernetes"
                  }
                },
                "key_id": "minio-key",
                "path_prefix": "minio/"
              }
            }
          },
          "auto_encryption": "on",
          "default_key_id": "mykms/minio-key"
        }
    ```
3.  Clique em **Deploy the ConfigMap**.

**ConfigMaps a serem criados (use a Opção B - Create from YAML para a maioria):**

1.  **`minio-config`**: Use o conteúdo de `k8s/storage/minio-configmap.yaml`.
2.  **`minio-encryption-config`**: Use o conteúdo de `k8s/storage/minio-encryption-config.yaml`.
3.  **`minio-audit-config`**: Use o conteúdo de `k8s/storage/minio-audit-config.yaml`.
4.  **`email-config`**: Pode ser criado com "Add with form" (veja Opção A) ou com um YAML simples se preferir:
    ```yaml
    apiVersion: v1
    kind: ConfigMap
    metadata:
      name: email-config
      namespace: pgben
    data:
      EMAIL_ENABLED: "true"
      EMAIL_PROVIDER: "ses"
      EMAIL_FROM: "nao-responda@pgben.gov.br"
      # Adicione outras variáveis de e-mail aqui (não sensíveis)
    ```
5.  **`backup-scripts-configmap`**: Use o conteúdo de `k8s/backup/backup-scripts-configmap.yaml`.

> **Dica Fundamental**: Ao usar "Create from YAML", sempre verifique se o campo `metadata.namespace` no seu YAML corresponde ao namespace `pgben` onde você está criando o ConfigMap. Se o campo `namespace` estiver ausente no YAML, o Portainer o criará no namespace atualmente selecionado na interface.

### 4.4. Volumes (PVCs)

Os Persistent Volume Claims (PVCs) são necessários para armazenar dados persistentes como bancos de dados, arquivos do MinIO e backups.

**Pré-requisitos:**
- Verifique se há uma StorageClass configurada no seu cluster. A maioria dos clusters Kubernetes já possui uma chamada `standard`.
- Decida o tamanho necessário para cada volume (sugestões na tabela abaixo).

**Como criar um PVC no Portainer:**
1. No menu lateral, vá para **Kubernetes**.
2. Selecione o cluster e o namespace `pgben`.
3. No menu do namespace, clique em **Storage**.
4. Clique em **Persistent Volume Claims**.
5. Clique em **+ Add with form**.
6. Preencha os campos:
   - **Namespace**: `pgben` (deve estar pré-selecionado)
   - **Name**: Nome do PVC (ex: `postgres-pvc`)
   - **StorageClass**: Selecione a StorageClass disponível (geralmente `standard`)
   - **Access Mode**: `ReadWriteOnce` para bancos de dados, `ReadWriteMany` para compartilhamento de arquivos
   - **Size**: Tamanho em GiB (ex: `10Gi`)
7. Clique em **Create**.

**PVCs Recomendados:**

| Nome | Tamanho | StorageClass | Access Mode | Uso |
|------|---------|--------------|-------------|-----|
| `postgres-pvc` | 10Gi | `standard` | ReadWriteOnce | Armazenamento do PostgreSQL |
| `minio-pvc` | 50Gi | `standard` | ReadWriteOnce | Armazenamento de documentos do MinIO |
| `backup-pvc` | 20Gi | `standard` | ReadWriteOnce | Armazenamento para backups |
| `grafana-pvc` | 5Gi | `standard` | ReadWriteOnce | Dados do Grafana |

> **Importante**: Se estiver em um ambiente de produção, considere usar uma StorageClass com provisionador adequado para seu provedor de nuvem (ex: `pd-ssd` no GKE, `gp2` na AWS, `managed-premium` na Azure).

### 4.5. Deploy via Stack (Git)

Agora que todos os recursos necessários estão configurados, você pode fazer o deploy da aplicação usando uma Stack Git.

**Pré-requisitos:**
- Acesso ao repositório Git do PGBen Server
- Permissões para criar recursos no namespace `pgben`
- Conexão com a internet para clonar o repositório

**Passo a Passo:**

1. No menu lateral do Portainer, vá para **Stacks**.
2. Clique em **+ Add stack**.
3. Preencha os campos:
   - **Name**: `pgben` (ou outro nome descritivo)
   - **Build method**: Selecione **Git Repository**
   - **Repository URL**: `https://github.com/kemosoft-team/pgben-server.git`
   - **Repository reference**: `main` (ou a branch/commit específica que deseja implantar)
   - **Repository authentication**: Marque se o repositório for privado
   - **Compose path**: Deixe em branco (usará o padrão `docker-compose.yml`)
   - **Enable OCB**: Marque esta opção para suporte a Kubernetes
   - **Namespace**: Selecione `pgben`
   - **Additional paths**: Adicione `k8s/` para incluir os manifests do Kubernetes

4. **Configurações Avançadas (opcional):**
   - **Environment variables**: Adicione variáveis de ambiente específicas, se necessário
   - **Webhook**: Configure um webhook para atualizações automáticas

5. Clique em **Deploy the stack**.

O Portainer irá:
1. Clonar o repositório
2. Processar os manifests Kubernetes na pasta `k8s/`
3. Aplicar os recursos no cluster
4. Mostrar o status do deploy em tempo real

> **Dica**: O Portainer usa `kubectl apply -k k8s/` internamente para aplicar os recursos. Você pode monitorar o progresso na aba **Events** do namespace `pgben`.

### 4.6. Verificações Pós-Deploy

Após o deploy, é importante verificar se todos os recursos foram criados corretamente.

**1. Verificar Pods em Execução:**
```bash
kubectl -n pgben get pods
```
Todos os pods devem estar em estado `Running` e prontos (ex: `1/1` ou `2/2` na coluna READY).

**2. Verificar Services e Ingress:**
```bash
kubectl -n pgben get services
kubectl -n pgben get ingress
```
Verifique se os serviços estão com o tipo correto (ClusterIP, NodePort, LoadBalancer) e se o Ingress foi configurado.

**3. Verificar Logs dos Pods:**
```bash
# Logs da API
kubectl -n pgben logs -l app=pgben-api --tail=50

# Logs do MinIO
kubectl -n pgben logs -l app=minio --tail=50

# Logs do PostgreSQL
kubectl -n pgben logs -l app=postgres --tail=50
```

**4. Testar Endpoints de Saúde:**

```bash
# Testar health check da API
curl -k https://api.pgben.gov.br/health

# Testar readiness da API
curl -k https://api.pgben.gov.br/health/ready

# Testar console do MinIO (se exposto)
curl -k https://minio-console.pgben.gov.br/minio/health/live
```

**5. Verificar PVCs e Volumes:**
```bash
kubectl -n pgben get pvc
kubectl -n pgben get pv
```
Verifique se todos os PVCs estão no estado `Bound`.

**6. Verificar ConfigMaps e Secrets:**
```bash
kubectl -n pgben get configmaps
kubectl -n pgben get secrets
```

**7. Verificar CronJobs:**
```bash
kubectl -n pgben get cronjobs
```

**8. Acessar Interfaces Web (se configuradas):**
- **Grafana**: `https://grafana.pgben.gov.br`
- **MinIO Console**: `https://minio-console.pgben.gov.br`
- **Prometheus**: `https://prometheus.pgben.gov.br`

**9. Verificar Balanceamento de Carga (se usando LoadBalancer):**
```bash
kubectl -n pgben get svc -l app=pgben-api
```

**10. Monitorar Métricas (se Prometheus/Grafana estiver configurado):**
- Acesse o Grafana e verifique os dashboards
- Verifique alertas no Prometheus

Se encontrar algum problema, consulte a seção **6. Dicas de Troubleshooting** para resolver problemas comuns.

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
