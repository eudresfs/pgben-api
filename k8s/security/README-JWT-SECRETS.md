# Configuração de Secrets JWT para Kubernetes

Este diretório contém a configuração dos secrets JWT para o sistema PGBEN no Kubernetes.

## Arquivos Configurados

### 1. `jwt-secrets.yaml`
Contém as chaves JWT RSA geradas automaticamente:
- `jwt-private-key`: Chave privada RSA em Base64
- `jwt-public-key`: Chave pública RSA em Base64

### 2. `secrets.yaml` (atualizado)
Arquivo principal de secrets que agora inclui as chaves JWT corretas no secret `pgben-jwt-secrets`.

### 3. `apply-jwt-secrets.ps1`
Script PowerShell para aplicar os secrets no cluster Kubernetes.

## Como Usar

### Pré-requisitos
- `kubectl` instalado e configurado
- Acesso ao cluster Kubernetes
- Namespace `consigmais` (será criado automaticamente se não existir)

### Aplicar os Secrets

#### Opção 1: Usar o script PowerShell (Recomendado)
```powershell
# Aplicar em modo dry-run para validar
.\apply-jwt-secrets.ps1 -DryRun

# Aplicar os secrets
.\apply-jwt-secrets.ps1

# Aplicar em namespace específico
.\apply-jwt-secrets.ps1 -Namespace "production"
```

#### Opção 2: Aplicar manualmente
```bash
# Aplicar o secret JWT específico
kubectl apply -f jwt-secrets.yaml

# Aplicar todos os secrets
kubectl apply -f secrets.yaml
```

### Verificar os Secrets
```bash
# Listar todos os secrets
kubectl get secrets -n consigmais

# Verificar o secret JWT específico
kubectl describe secret pgben-jwt-secrets -n consigmais

# Ver as chaves (decodificadas)
kubectl get secret pgben-jwt-secrets -n consigmais -o jsonpath='{.data.jwt-private-key}' | base64 -d
kubectl get secret pgben-jwt-secrets -n consigmais -o jsonpath='{.data.jwt-public-key}' | base64 -d
```

## Configuração da Aplicação

A aplicação está configurada para usar as chaves JWT de duas formas:

### 1. Via Caminhos de Arquivo (Desenvolvimento)
```env
JWT_PRIVATE_KEY_PATH=./keys/private.key
JWT_PUBLIC_KEY_PATH=./keys/public.key
```

### 2. Via Base64 (Produção/Kubernetes)
```env
JWT_PRIVATE_KEY_BASE64=<valor_do_secret>
JWT_PUBLIC_KEY_BASE64=<valor_do_secret>
```

### Montagem no Pod
No deployment do Kubernetes, os secrets devem ser montados como variáveis de ambiente:

```yaml
env:
- name: JWT_PRIVATE_KEY_BASE64
  valueFrom:
    secretKeyRef:
      name: pgben-jwt-secrets
      key: jwt-private-key
- name: JWT_PUBLIC_KEY_BASE64
  valueFrom:
    secretKeyRef:
      name: pgben-jwt-secrets
      key: jwt-public-key
```

## Segurança

### ✅ Boas Práticas Implementadas
- Chaves RSA de 2048 bits
- Secrets armazenados em Base64
- Separação entre desenvolvimento e produção
- Scripts automatizados para deploy
- Documentação completa

### ⚠️ Considerações de Segurança
- **NUNCA** commite chaves reais no repositório
- Use RBAC para controlar acesso aos secrets
- Considere rotação periódica das chaves
- Monitore o acesso aos secrets
- Use namespaces isolados por ambiente

### 🔄 Rotação de Chaves
Para rotar as chaves JWT:

1. Gere novas chaves:
```bash
node scripts/gerar-chaves-jwt.js k8s --force
```

2. Atualize os arquivos de secrets
3. Aplique os novos secrets:
```powershell
.\apply-jwt-secrets.ps1
```

4. Reinicie os pods da aplicação

## Troubleshooting

### Problema: Secret não encontrado
```bash
# Verificar se o namespace existe
kubectl get namespaces

# Verificar se o secret foi criado
kubectl get secrets -n consigmais
```

### Problema: Chaves inválidas
```bash
# Verificar o formato das chaves
kubectl get secret pgben-jwt-secrets -n consigmais -o yaml

# Decodificar e verificar o conteúdo
kubectl get secret pgben-jwt-secrets -n consigmais -o jsonpath='{.data.jwt-private-key}' | base64 -d | head -1
```

### Problema: Aplicação não consegue ler as chaves
1. Verificar se as variáveis de ambiente estão configuradas
2. Verificar se o secret está montado corretamente
3. Verificar logs da aplicação para erros de JWT

## Logs e Monitoramento

Para monitorar o uso das chaves JWT:

```bash
# Logs da aplicação
kubectl logs -f deployment/pgben-server -n consigmais

# Eventos do namespace
kubectl get events -n consigmais --sort-by='.lastTimestamp'
```

## Próximos Passos

1. ✅ Chaves JWT configuradas
2. ⏳ Aplicar secrets no cluster
3. ⏳ Atualizar deployment para usar os secrets
4. ⏳ Testar autenticação JWT
5. ⏳ Configurar monitoramento
6. ⏳ Implementar rotação automática (opcional)

---

**Nota**: Este documento foi gerado automaticamente durante a configuração dos secrets JWT. Mantenha-o atualizado conforme as mudanças na configuração.