# Gestão de Secrets com Kubernetes - PGBen

## Introdução

Este documento descreve a implementação da gestão de secrets (segredos) no sistema PGBen utilizando Kubernetes Secrets e ConfigMaps, garantindo o armazenamento seguro de credenciais e configurações sensíveis em conformidade com as boas práticas de segurança e os requisitos da LGPD.

## Visão Geral

A gestão de secrets é um componente crítico para a segurança de qualquer aplicação, especialmente aquelas que lidam com dados pessoais e sensíveis como o PGBen. Esta implementação utiliza os recursos nativos do Kubernetes para gerenciar informações sensíveis de forma segura, com rotação automática de credenciais e controle de acesso granular.

## Componentes Implementados

### 1. Kubernetes Secrets

Os Kubernetes Secrets foram configurados para armazenar informações sensíveis como:

- **Credenciais de Banco de Dados**: Usuário, senha e nome do banco de dados PostgreSQL.
- **Segredos JWT**: Chave secreta utilizada para assinar e verificar tokens JWT.
- **Credenciais do MinIO**: Chaves de acesso para o serviço de armazenamento de documentos.
- **Chaves de Criptografia**: Chaves mestras utilizadas pelo serviço de criptografia para proteger documentos sensíveis.

### 2. ConfigMaps

Os ConfigMaps foram configurados para armazenar configurações não sensíveis:

- **Configurações de Banco de Dados**: Host, porta, schema e outras configurações.
- **Configurações da Aplicação**: Ambiente, porta, prefixos de API, configurações de CORS e rate limiting.
- **Configurações do MinIO**: Endpoint, porta, nome do bucket e região.
- **Configurações de Logging**: Nível de log, formato, destinos e políticas de retenção.

### 3. Rotação Automática de Credenciais

Foi implementado um sistema de rotação automática de credenciais que:

- **Atualiza Periodicamente**: Gera novas credenciais em intervalos regulares (90 dias).
- **Mantém Consistência**: Atualiza as credenciais em todos os sistemas afetados (banco de dados, MinIO, etc.).
- **Garante Transição Suave**: Reinicia os pods afetados para aplicar as novas credenciais sem interrupção do serviço.
- **Registra Atividades**: Mantém logs detalhados de todas as operações de rotação para auditoria.

## Arquivos de Configuração

### 1. `secrets-config.yaml`

Este arquivo YAML define todos os Secrets e ConfigMaps necessários para a aplicação:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: pgben-database-credentials
  namespace: pgben
type: Opaque
data:
  # Valores codificados em base64
  DB_USER: [valor-codificado]
  DB_PASS: [valor-codificado]
  DB_NAME: [valor-codificado]
# ... outros Secrets e ConfigMaps
```

### 2. `rotate-secrets.sh`

Script Bash para rotação automática de credenciais:

```bash
#!/bin/bash
# Script para rotação automática de credenciais no Kubernetes

# ... código do script

# Rotaciona cada secret
for secret_name in "${SECRETS_TO_ROTATE[@]}"; do
  # ... lógica de rotação específica para cada tipo de secret
done
```

## Implementação Técnica

### 1. Armazenamento Seguro

- **Criptografia em Repouso**: Os Secrets são armazenados criptografados no etcd do Kubernetes.
- **Acesso Controlado**: Apenas pods autorizados podem acessar os Secrets através de volumes montados ou variáveis de ambiente.
- **Isolamento por Namespace**: Os Secrets são isolados no namespace `pgben` para limitar o escopo de acesso.

### 2. Injeção de Secrets na Aplicação

Os Secrets são injetados na aplicação de duas formas:

- **Variáveis de Ambiente**: Para configurações simples e de acesso frequente.
- **Volumes Montados**: Para chaves de criptografia e configurações mais complexas.

Exemplo de configuração no Deployment:

```yaml
env:
  - name: DB_USER
    valueFrom:
      secretKeyRef:
        name: pgben-database-credentials
        key: DB_USER
```

### 3. Monitoramento de Acesso

Foi implementado um sistema de monitoramento que:

- **Registra Acessos**: Todos os acessos aos Secrets são registrados para auditoria.
- **Detecta Anomalias**: Padrões anômalos de acesso são identificados e alertados.
- **Gera Relatórios**: Relatórios periódicos de acesso são gerados para análise de segurança.

## Benefícios para o PGBen

### 1. Segurança Aprimorada

- **Eliminação de Hardcoding**: Nenhuma credencial ou configuração sensível é hardcoded no código-fonte.
- **Rotação Regular**: Credenciais são atualizadas regularmente, reduzindo o risco de comprometimento.
- **Acesso Controlado**: Apenas serviços autorizados podem acessar informações sensíveis.

### 2. Compliance com LGPD

- **Proteção de Dados Sensíveis**: Credenciais que dão acesso a dados pessoais são protegidas adequadamente.
- **Auditoria de Acesso**: Todos os acessos a informações sensíveis são registrados para compliance.
- **Princípio do Menor Privilégio**: Cada serviço tem acesso apenas às informações necessárias para sua função.

### 3. Operações Simplificadas

- **Gestão Centralizada**: Todas as configurações são gerenciadas de forma centralizada no Kubernetes.
- **Implantação Consistente**: Mesmas configurações em todos os ambientes (desenvolvimento, homologação, produção).
- **Automação**: Rotação de credenciais automatizada, reduzindo risco de erro humano.

## Próximos Passos

1. **Integração com Vault**: Implementar integração com HashiCorp Vault para gestão avançada de secrets.
2. **Criptografia Envelope**: Implementar criptografia envelope para proteção adicional de chaves de criptografia.
3. **Monitoramento Avançado**: Expandir o sistema de monitoramento para detecção mais sofisticada de anomalias.
4. **Gestão de Certificados**: Implementar gestão automatizada de certificados TLS com cert-manager.

## Conclusão

A implementação da gestão de secrets com Kubernetes no PGBen representa um avanço significativo na segurança da aplicação. Esta prática, combinada com outras medidas como o middleware de auditoria, a criptografia de documentos e as análises de segurança, forma uma estratégia abrangente que protege os dados dos cidadãos e garante a conformidade com a LGPD.

A automação da rotação de credenciais e o controle de acesso granular reduzem significativamente o risco de comprometimento de informações sensíveis, enquanto a centralização da gestão de configurações simplifica as operações e garante consistência entre ambientes.
