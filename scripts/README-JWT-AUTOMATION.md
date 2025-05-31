# Automação Completa de Configuração JWT

Este documento descreve o sistema de automação completa para configuração de chaves JWT no Sistema SEMTAS PGBEN, eliminando a necessidade de configuração manual em qualquer ambiente.

## 📋 Visão Geral

O sistema de automação JWT foi projetado para:
- **Detectar automaticamente** o ambiente de execução (desenvolvimento, Docker, Kubernetes)
- **Gerar chaves RSA** de forma segura e automática
- **Configurar variáveis de ambiente** adequadas para cada contexto
- **Criar secrets do Kubernetes** automaticamente
- **Eliminar completamente** a configuração manual

## 🛠️ Scripts Disponíveis

### 1. Script Principal - Automação Completa
```powershell
.\scripts\auto-setup-jwt.ps1
```

**Funcionalidades:**
- Detecção automática do ambiente
- Configuração completa para qualquer contexto
- Verificação de dependências
- Configuração de segurança adequada

**Parâmetros:**
- `-Environment`: Força um ambiente específico (auto, dev, docker, k8s)
- `-KeySize`: Tamanho da chave RSA (2048, 3072, 4096)
- `-Force`: Força regeneração de chaves existentes
- `-Namespace`: Namespace do Kubernetes (padrão: default)
- `-SecretName`: Nome do secret K8s (padrão: pgben-jwt-secrets)

### 2. Script para Kubernetes
```powershell
.\scripts\setup-jwt-k8s.ps1
```

**Funcionalidades:**
- Geração de chaves em formato Base64
- Criação automática de Kubernetes Secrets
- Validação de configuração
- Instruções de deployment

### 3. Script para Docker
```powershell
.\scripts\setup-jwt-docker.ps1
```

**Funcionalidades:**
- Configuração de variáveis de ambiente
- Criação de docker-compose.override.yml
- Atualização automática do .env
- Backup de configurações existentes

### 4. Script Base de Geração
```javascript
node scripts/gerar-chaves-jwt.js
```

**Funcionalidades:**
- Geração de chaves RSA
- Múltiplos formatos de saída
- Validação de chaves
- Configuração de permissões

## 🚀 Uso Rápido

### Configuração Automática (Recomendado)
```powershell
# Detecta automaticamente o ambiente e configura
.\scripts\auto-setup-jwt.ps1
```

### Configuração Específica por Ambiente

#### Desenvolvimento Local
```powershell
.\scripts\auto-setup-jwt.ps1 -Environment dev
```

#### Docker/Docker Compose
```powershell
.\scripts\auto-setup-jwt.ps1 -Environment docker
```

#### Kubernetes
```powershell
.\scripts\auto-setup-jwt.ps1 -Environment k8s -Namespace production
```

## 📁 Estrutura de Arquivos Gerados

### Desenvolvimento Local
```
keys/
├── private.key      # Chave privada RSA
├── public.key       # Chave pública RSA
├── private.pem      # Chave privada formato PEM
└── public.pem       # Chave pública formato PEM

.env                 # Variáveis de ambiente atualizadas
```

### Docker
```
.env                           # Variáveis de ambiente
docker-compose.override.yml    # Configurações específicas
keys/                          # Chaves para desenvolvimento
```

### Kubernetes
```
Secret: pgben-jwt-secrets      # Secret criado automaticamente
├── jwt-private-key           # Chave privada (Base64)
└── jwt-public-key            # Chave pública (Base64)
```

## 🔧 Configurações Automáticas

### Variáveis de Ambiente Configuradas

| Variável | Descrição | Valor Padrão |
|----------|-----------|-------------|
| `JWT_ALGORITHM` | Algoritmo de assinatura | RS256 |
| `JWT_PRIVATE_KEY_PATH` | Caminho da chave privada | keys/private.key |
| `JWT_PUBLIC_KEY_PATH` | Caminho da chave pública | keys/public.key |
| `JWT_PRIVATE_KEY` | Chave privada (K8s/Docker) | Gerada automaticamente |
| `JWT_PUBLIC_KEY` | Chave pública (K8s/Docker) | Gerada automaticamente |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | Expiração do token de acesso | 1h |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | Expiração do refresh token | 7d |

### Configurações de Segurança

- **Tamanho da chave**: 2048 bits (padrão), configurável até 4096 bits
- **Algoritmo**: RS256 (RSA com SHA-256)
- **Formato**: PEM para compatibilidade máxima
- **Permissões**: 600 (somente proprietário) para chaves privadas
- **Gitignore**: Chaves automaticamente excluídas do controle de versão

## 🔍 Detecção Automática de Ambiente

O script principal detecta automaticamente o ambiente baseado em:

1. **Kubernetes**: Presença e configuração do `kubectl`
2. **Docker**: Existência de `docker-compose.yml` ou `Dockerfile`
3. **Desenvolvimento**: Ambiente padrão quando outros não são detectados

## 📝 Logs e Auditoria

Todos os scripts fornecem logs detalhados:
- ✅ Operações bem-sucedidas
- ⚠️ Avisos e confirmações
- ❌ Erros e falhas
- ℹ️ Informações de progresso

## 🔒 Considerações de Segurança

### Chaves Privadas
- Nunca são commitadas no Git
- Permissões restritivas (600)
- Backup automático antes de sobrescrever
- Rotação recomendada periodicamente

### Secrets do Kubernetes
- Criados com encoding Base64
- Isolados por namespace
- Validação de integridade
- Instruções de uso seguro

### Variáveis de Ambiente
- Backup automático de configurações existentes
- Validação de formato
- Escape adequado de caracteres especiais

## 🚨 Troubleshooting

### Problemas Comuns

#### "Node.js não encontrado"
```powershell
# Instalar Node.js
winget install OpenJS.NodeJS
# ou baixar de https://nodejs.org
```

#### "kubectl não encontrado" (para K8s)
```powershell
# Instalar kubectl
winget install Kubernetes.kubectl
# ou seguir: https://kubernetes.io/docs/tasks/tools/install-kubectl-windows/
```

#### "Chaves já existem"
```powershell
# Forçar regeneração
.\scripts\auto-setup-jwt.ps1 -Force
```

#### "Falha na criação do Secret K8s"
```powershell
# Verificar conectividade
kubectl cluster-info

# Verificar permissões
kubectl auth can-i create secrets

# Verificar namespace
kubectl get namespaces
```

### Logs de Debug

Para debug detalhado, verifique:
- Output dos scripts (salvo automaticamente)
- Logs do kubectl (para K8s)
- Arquivos de backup criados

## 🔄 Integração com CI/CD

### GitHub Actions
```yaml
- name: Setup JWT Keys
  run: |
    ./scripts/auto-setup-jwt.ps1 -Environment k8s -Force
  shell: pwsh
```

### Azure DevOps
```yaml
- task: PowerShell@2
  displayName: 'Setup JWT Keys'
  inputs:
    filePath: 'scripts/auto-setup-jwt.ps1'
    arguments: '-Environment k8s -Force'
```

## 📚 Exemplos de Uso

### Desenvolvimento Local Completo
```powershell
# Configuração automática
.\scripts\auto-setup-jwt.ps1

# Iniciar aplicação
npm run dev
```

### Deploy Docker
```powershell
# Configurar JWT para Docker
.\scripts\auto-setup-jwt.ps1 -Environment docker

# Iniciar containers
docker-compose up -d
```

### Deploy Kubernetes
```powershell
# Configurar JWT para K8s
.\scripts\auto-setup-jwt.ps1 -Environment k8s -Namespace production

# Aplicar manifests
kubectl apply -f k8s/
```

### Rotação de Chaves
```powershell
# Gerar novas chaves
.\scripts\auto-setup-jwt.ps1 -Force

# Para K8s, aplicar novamente
kubectl rollout restart deployment/pgben-server
```

## 🎯 Próximos Passos

Após a configuração automática:

1. **Desenvolvimento**: Execute `npm run dev`
2. **Docker**: Execute `docker-compose up -d`
3. **Kubernetes**: Execute `kubectl apply -f k8s/`
4. **Teste**: Verifique endpoints de autenticação
5. **Monitoramento**: Configure logs de auditoria JWT

## 📞 Suporte

Para problemas ou dúvidas:
1. Verifique os logs de execução
2. Consulte a seção de troubleshooting
3. Execute com `-Force` para regenerar
4. Verifique dependências do ambiente

---

**Nota**: Este sistema elimina completamente a necessidade de configuração manual de JWT, garantindo segurança e consistência em todos os ambientes do Sistema SEMTAS PGBEN.