# Kubernetes Deployment - PGBEN Server

Este diretório contém todos os manifests e scripts necessários para fazer o deploy da aplicação PGBEN Server em um cluster Kubernetes.

## 📋 Pré-requisitos

- Cluster Kubernetes (versão 1.20+)
- kubectl configurado e conectado ao cluster
- NGINX Ingress Controller (opcional, para exposição externa)
- Prometheus Operator (opcional, para métricas)
- cert-manager (opcional, para certificados SSL)

## 🗂️ Estrutura dos Arquivos

```
k8s/
├── configmap.yaml           # Configurações não sensíveis
├── deployment.yaml           # Deployment, Service e Secrets
├── hpa.yaml                 # Horizontal Pod Autoscaler
├── ingress.yaml             # Ingress para exposição externa
├── network-policy.yaml      # Políticas de rede
├── pod-disruption-budget.yaml # PDB, ServiceAccount e RBAC
├── service-monitor.yaml     # ServiceMonitor para Prometheus
├── deploy.sh               # Script automatizado de deploy
└── README.md               # Este arquivo
```

## 🚀 Deploy Rápido

### Opção 1: Script Automatizado (Recomendado)

```bash
# Tornar o script executável
chmod +x deploy.sh

# Deploy no namespace default
./deploy.sh

# Deploy em namespace específico
NAMESPACE=pgben ./deploy.sh

# Deploy com imagem customizada
IMAGE_TAG=v1.0.0 REGISTRY=myregistry.com ./deploy.sh
```

### Opção 2: Deploy Manual

```bash
# 1. Criar namespace (opcional)
kubectl create namespace pgben

# 2. Aplicar ConfigMap
kubectl apply -f configmap.yaml -n pgben

# 3. Atualizar secrets no deployment.yaml antes de aplicar
# IMPORTANTE: Substitua os valores base64 pelos valores reais!
kubectl apply -f deployment.yaml -n pgben

# 4. Aplicar ServiceAccount e RBAC
kubectl apply -f pod-disruption-budget.yaml -n pgben

# 5. Aplicar HPA
kubectl apply -f hpa.yaml -n pgben

# 6. Aplicar NetworkPolicy
kubectl apply -f network-policy.yaml -n pgben

# 7. Aplicar ServiceMonitor (se Prometheus estiver instalado)
kubectl apply -f service-monitor.yaml -n pgben

# 8. Aplicar Ingress (opcional)
kubectl apply -f ingress.yaml -n pgben
```

## 🔐 Configuração de Secrets

**IMPORTANTE**: Antes do deploy em produção, você DEVE atualizar os secrets no arquivo `deployment.yaml`.

Os seguintes valores precisam ser configurados (em base64):

```bash
# Exemplo de como gerar valores base64
echo -n "sua_senha_do_banco" | base64
echo -n "seu_jwt_secret" | base64
echo -n "sua_chave_de_criptografia" | base64
```

Secrets que precisam ser configurados:
- `DATABASE_PASSWORD`
- `JWT_SECRET`
- `ENCRYPTION_KEY`
- `REDIS_PASSWORD` (se usando Redis com senha)

## 🌐 Configuração de Rede

### Ingress

O arquivo `ingress.yaml` está configurado para:
- Host: `api.pgben.semtas.gov.br`
- SSL/TLS automático via cert-manager
- Rate limiting: 100 req/min
- CORS habilitado

Para usar um domínio diferente, edite o arquivo `ingress.yaml`:

```yaml
spec:
  rules:
  - host: seu-dominio.com  # Altere aqui
```

### NetworkPolicy

A política de rede permite:
- Tráfego de entrada: HTTP (3000), Health checks, Ingress
- Tráfego de saída: PostgreSQL (5432), Redis (6379), DNS, HTTPS

## 📊 Monitoramento

### Métricas

A aplicação expõe métricas no endpoint `/api/v1/metrics` que são coletadas pelo Prometheus via ServiceMonitor.

### Health Checks

- **Liveness**: `/v1/health`
- **Readiness**: `/v1/health/ready`
- **Startup**: `/v1/health` (com delay inicial)

### Logs

```bash
# Ver logs em tempo real
kubectl logs -f deployment/pgben-server -n pgben

# Ver logs de um pod específico
kubectl logs -f pod/pgben-server-xxx -n pgben
```

## 🔧 Configurações Avançadas

### Horizontal Pod Autoscaler (HPA)

- **Min replicas**: 2
- **Max replicas**: 10
- **CPU target**: 70%
- **Memory target**: 80%

### Pod Disruption Budget (PDB)

- **Min available**: 2 pods
- Garante alta disponibilidade durante atualizações

### Resource Limits

```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

## 🛠️ Comandos Úteis

```bash
# Verificar status do deployment
kubectl get all -l app=pgben-server -n pgben

# Verificar pods
kubectl get pods -l app=pgben-server -n pgben

# Verificar logs
kubectl logs -f deployment/pgben-server -n pgben

# Verificar eventos
kubectl get events -n pgben --sort-by='.lastTimestamp'

# Fazer port-forward para teste local
kubectl port-forward service/pgben-server-service 3000:80 -n pgben

# Verificar métricas do HPA
kubectl get hpa -n pgben

# Verificar certificados SSL (se usando cert-manager)
kubectl get certificates -n pgben

# Fazer rollback do deployment
kubectl rollout undo deployment/pgben-server -n pgben

# Escalar manualmente
kubectl scale deployment pgben-server --replicas=5 -n pgben
```

## 🔍 Troubleshooting

### Pod não inicia

```bash
# Verificar eventos do pod
kubectl describe pod pgben-server-xxx -n pgben

# Verificar logs de inicialização
kubectl logs pgben-server-xxx -n pgben --previous
```

### Problemas de conectividade

```bash
# Testar conectividade interna
kubectl run test-pod --image=curlimages/curl --rm -i --restart=Never -- curl -f http://pgben-server-service.pgben.svc.cluster.local/v1/health

# Verificar DNS
kubectl run test-pod --image=busybox --rm -i --restart=Never -- nslookup pgben-server-service.pgben.svc.cluster.local
```

### Problemas de certificado SSL

```bash
# Verificar status do certificado
kubectl describe certificate pgben-server-tls -n pgben

# Verificar logs do cert-manager
kubectl logs -n cert-manager deployment/cert-manager
```

## 📝 Notas Importantes

1. **Secrets**: Sempre configure os secrets antes do deploy em produção
2. **Backup**: Configure backup regular do banco de dados
3. **Monitoramento**: Configure alertas para métricas críticas
4. **Segurança**: Revise as NetworkPolicies conforme sua infraestrutura
5. **SSL**: Configure cert-manager para certificados automáticos
6. **Logs**: Configure agregação de logs (ELK, Fluentd, etc.)

## 🆘 Suporte

Para problemas específicos do deploy:
1. Verifique os logs da aplicação
2. Verifique eventos do Kubernetes
3. Valide a conectividade de rede
4. Confirme se todos os secrets estão configurados

---

**Desenvolvido pela equipe DevOps/Qualidade - SEMTAS** 🚀