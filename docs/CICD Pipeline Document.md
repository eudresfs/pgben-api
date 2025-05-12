# Sistema de Gestão de Benefícios Eventuais - Execução de SonarQube para análise de qualidade

- Quality Gate: falha se métricas não atingidas
- Verificação de vulnerabilidades de segurança
- Verificação de code smells e duplicações

#### 4.2.8 Análise de Segurança

- OWASP Dependency Check para vulnerabilidades
- Verificação de secrets no código
- Falha em vulnerabilidades críticas ou altas

#### 4.2.9 Build de Artefatos

- Criação de imagem Docker para aplicação
- Versionamento de artefatos
- Publicação em GitHub Packages ou Azure Container Registry

### 4.3 Gates de Qualidade

#### 4.3.1 Requisitos Mínimos

- 0 erros de lint
- 100% dos testes passando
- Cobertura de código >= 80%
- 0 vulnerabilidades críticas ou altas
- Quality Gate do SonarQube aprovado

#### 4.3.2 Relatórios e Notificações

- Dashboard de execuções de pipeline
- Notificações em Microsoft Teams/Slack
- E-mail para falhas críticas
- Badges de status em README

## 5. Pipeline de CD (Entrega Contínua)

### 5.1 Estratégia de Implantação

#### 5.1.1 Implantação em Teste/QA

- **Trigger**: Automático após sucesso no pipeline CI em develop
- **Estratégia**: Replace (substituição completa)
- **Frequência**: A cada merge para develop

#### 5.1.2 Implantação em Homologação

- **Trigger**: Manual após aprovação
- **Estratégia**: Blue-Green (minimizar downtime)
- **Frequência**: Sprint releases ou sob demanda

#### 5.1.3 Implantação em Produção

- **Trigger**: Manual após aprovação multi-nível
- **Estratégia**: Blue-Green com rollback automatizado
- **Frequência**: Planejada conforme roadmap

### 5.2 Etapas do Pipeline CD

#### 5.2.1 Preparação para Deploy

- Seleção de artefatos do build bem-sucedido
- Obtenção de configurações específicas do ambiente
- Substituição de variáveis de ambiente
- Verificação de pré-requisitos de infraestrutura

#### 5.2.2 Provisão de Infraestrutura

- Execução de templates ARM para Azure
- Verificação de recursos provisionados
- Configuração de rede e segurança
- Preparação de bancos de dados e armazenamento

#### 5.2.3 Deploy da Aplicação

- Deploy do container em App Service
- Configuração de variáveis de ambiente
- Configuração de endpoints e rotas
- Estratégia Blue-Green para zero downtime

#### 5.2.4 Testes Pós-Deploy

- Smoke tests para verificar disponibilidade
- Testes de integração no ambiente implantado
- Verificação de conexões com serviços externos
- Monitoramento inicial de métricas

#### 5.2.5 Ativação

- Switch de tráfego para nova versão (Blue-Green)
- Verificação final de saúde da aplicação
- Notificação de implantação bem-sucedida
- Inicialização de monitoramento contínuo

### 5.3 Rollback

#### 5.3.1 Triggers de Rollback

- Falha em testes pós-deploy
- Métricas de saúde fora dos limites aceitáveis
- Decisão manual da equipe
- Alertas críticos após deploy

#### 5.3.2 Processo de Rollback

- Reversão automática para versão anterior estável
- Notificação imediata para equipe
- Logs completos da falha
- Retenção do ambiente com problema para análise

### 5.4 Gestão de Configuração

#### 5.4.1 Variáveis de Ambiente

- Gestão centralizada de configurações
- Configurações específicas por ambiente
- Secrets em Azure Key Vault
- Injeção segura de configurações em runtime

#### 5.4.2 Feature Flags

- Implementação de feature flags para funcionalidades
- Ativação gradual de novos recursos
- Possibilidade de desativar recursos problemáticos
- Testes A/B para novas funcionalidades

## 6. Estratégia de Branching

### 6.1 Modelo de Branches

Adotaremos o modelo GitFlow adaptado:

- **main**: Código em produção, sempre estável
- **develop**: Linha principal de desenvolvimento, integração contínua
- **feature/***: Branches para novas funcionalidades
- **hotfix/***: Correções urgentes para produção
- **release/***: Preparação para release (versioning, docs)

### 6.2 Fluxo de Trabalho

```
                 hotfix/*
                   /   \
                  /     \
main ────────────●───────●────────────●─────
                 |               /         /
                 |              /         /
develop ─────────●─────────────●─────────●
                / \          /
               /   \        /
feature/* ────     ────────
```

### 6.3 Políticas de Pull Request

#### 6.3.1 Requisitos para Merge

- Pipeline CI completo e bem-sucedido
- Revisão de código por pelo menos 1 desenvolvedor
- Resolução de todos os comentários
- Sem conflitos de merge

#### 6.3.2 Convenções de Commit

- Commits semânticos: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, etc.
- Mensagens descritivas em inglês
- Referência a issues/tarefas quando aplicável
- Squash merge para histórico limpo

## 7. Versionamento

### 7.1 Estratégia de Versionamento

Utilizaremos Semantic Versioning (SemVer) como no starter kit:

- **MAJOR**: Mudanças incompatíveis com versões anteriores
- **MINOR**: Funcionalidades novas compatíveis
- **PATCH**: Correções de bugs compatíveis
- Exemplo: 1.2.3

### 7.2 Processo de Release

#### 7.2.1 Preparação de Release

- Criação de branch `release/vX.Y.Z` a partir de `develop`
- Atualização de versão em package.json
- Atualização de changelog
- Build final e testes

#### 7.2.2 Finalização de Release

- Merge em `main` com tag de versão
- Merge em `develop` para continuar desenvolvimento
- Publicação de release notes
- Deploy em produção

## 8. Adaptações do Starter Kit

### 8.1 CI/CD Existente

O starter kit monstar-lab já possui configuração inicial para:

- Linting com ESLint
- Testes unitários com Jest
- Verificação de formatação com Prettier
- Análise de qualidade com SonarCloud
- Commit lint com Husky hooks

### 8.2 Extensões Necessárias

- Adicionar etapas para TypeORM migrations
- Configurar deploy para Azure
- Integrar com Azure Blob Storage
- Adicionar testes específicos para módulos SEMTAS
- Configurar ambientes específicos do projeto

### 8.3 Exemplo de Workflow GitHub Actions (Adaptado)

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop, feature/*, release/*, hotfix/* ]
  pull_request:
    branches: [ main, develop ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install Dependencies
      run: npm ci
    
    - name: Lint
      run: npm run lint
    
    - name: Type Check
      run: npm run typecheck
    
    - name: Test
      run: npm test
      env:
        DATABASE_URL: postgres://postgres:postgres@localhost:5432/test_db
    
    - name: Build
      run: npm run build
    
    - name: SonarCloud Scan
      uses: SonarSource/sonarcloud-github-action@master
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
    
    - name: Build and Push Docker Image
      if: github.ref == 'refs/heads/develop' || github.ref == 'refs/heads/main'
      uses: docker/build-push-action@v2
      with:
        context: .
        push: true
        tags: ghcr.io/${{ github.repository }}:${{ github.sha }}
        
  deploy-qa:
    if: github.ref == 'refs/heads/develop'
    needs: build-and-test
    runs-on: ubuntu-latest
    environment: qa
    
    steps:
    - name: Azure Login
      uses: azure/login@v1
      with:
        creds: ${{ secrets.AZURE_CREDENTIALS }}
    
    - name: Deploy to QA
      uses: azure/webapps-deploy@v2
      with:
        app-name: 'qa-beneficio-semtas'
        slot-name: 'production'
        images: 'ghcr.io/${{ github.repository }}:${{ github.sha }}'
    
    - name: Run Migrations
      run: |
        npm run typeorm:migration:run
      env:
        DATABASE_URL: ${{ secrets.QA_DATABASE_URL }}
        
  deploy-prod:
    if: github.ref == 'refs/heads/main'
    needs: build-and-test
    runs-on: ubuntu-latest
    environment: production
    
    steps:
    - name: Azure Login
      uses: azure/login@v1
      with:
        creds: ${{ secrets.AZURE_CREDENTIALS }}
    
    - name: Deploy to Production
      uses: azure/webapps-deploy@v2
      with:
        app-name: 'prod-beneficio-semtas'
        slot-name: 'staging'
        images: 'ghcr.io/${{ github.repository }}:${{ github.sha }}'
    
    - name: Run Migrations
      run: |
        npm run typeorm:migration:run
      env:
        DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
        
    - name: Swap Slots
      uses: azure/CLI@v1
      with:
        inlineScript: |
          az webapp deployment slot swap -g rg-beneficio-semtas -n prod-beneficio-semtas --slot staging --target-slot production
```

## 9. Monitoramento e Observabilidade

### 9.1 Telemetria de Aplicação

- Integração com Application Insights
- Logs estruturados via Winston (já implementado no starter)
- Métricas de performance
- Rastreamento de exceções

### 9.2 Alertas e Notificações

- Alertas para erros críticos
- Notificações para deploys
- Alertas para vulnerabilidades de segurança
- Alertas para métricas de performance

### 9.3 Dashboards Operacionais

- Dashboard de CI/CD
- Dashboard de saúde da aplicação
- Dashboard de segurança
- Dashboard de performance

## 10. Próximos Passos

### 10.1 Implementação Inicial

1. Configurar ambientes no GitHub
2. Estender workflows existentes para módulos SEMTAS
3. Configurar secrets e variáveis de ambiente
4. Configurar serviços em Azure
5. Implementar integração com Azure Blob Storage

### 10.2 Melhorias Futuras

1. Implementar testes E2E com Cypress
2. Ampliar métricas de observabilidade
3. Implementar análise de vulnerabilidades avançada
4. Automatizar testes de carga
5. Implementar canary releases

## 11. Aprovações

|Nome|Cargo|Data|Assinatura|
|---|---|---|---|
|[Nome]|DevOps Engineer|[Data]|[Assinatura]|
|[Nome]|Arquiteto|[Data]|[Assinatura]|
|[Nome]|Gerente de Projeto|[Data]|[Assinatura]|

## 1. Visão Geral do CI/CD

### 1.1 Objetivos

Este documento descreve a implementação do pipeline de Integração Contínua (CI) e Entrega Contínua (CD) para o Sistema de Gestão de Benefícios Eventuais da SEMTAS, baseado no starter kit monstar-lab-oss/nestjs-starter-rest-api, visando:

- Automatizar testes, builds e deploys
- Garantir qualidade consistente do código
- Reduzir tempo entre desenvolvimento e entrega
- Detectar problemas precocemente
- Facilitar implantações com zero downtime
- Implementar princípios DevSecOps

### 1.2 Princípios Fundamentais

- **Automação**: Minimizar intervenção manual em todo o processo
- **Consistência**: Ambientes replicáveis e processos repetíveis
- **Feedback rápido**: Falhas detectadas o mais cedo possível
- **Segurança integrada**: Análise de segurança em todas as etapas
- **Auditabilidade**: Rastreamento completo de alterações
- **Confiabilidade**: Builds estáveis e processos de rollback

### 1.3 Fluxo Geral do Pipeline

```
Código → Lint → Build → Testes → Análise Estática → Build Artefatos → Deploy → Testes Pós-Deploy → Monitoramento
```

## 2. Ferramentas e Tecnologias

### 2.1 Plataforma CI/CD

Para este projeto, utilizaremos **GitHub Actions** como plataforma principal para CI/CD, aproveitando a configuração inicial do starter kit monstar-lab:

- Integração nativa com GitHub
- Definição de workflows como código (YAML)
- Extensão da configuração existente no starter
- Histórico de execuções e diagnósticos

### 2.2 Ferramentas Complementares

|Categoria|Ferramenta|Propósito|
|---|---|---|
|Controle de Versão|Git|Versionamento de código|
|Gestão de Dependências|npm|Gerenciamento de pacotes JavaScript|
|Análise Estática|ESLint, SonarQube|Qualidade de código e segurança|
|Testes|Jest|Automação de testes (já configurado no starter)|
|Containers|Docker|Empacotamento da aplicação|
|Orquestração|Kubernetes/AKS|Orquestração de containers|
|Segurança|OWASP Dependency Check|Análise de vulnerabilidades|
|IaC|Azure Resource Manager (ARM)|Infraestrutura como código|
|Artefatos|GitHub Packages|Armazenamento de builds|
|Monitoramento|Application Insights|Telemetria e logs|

## 3. Ambientes

### 3.1 Definição de Ambientes

#### 3.1.1 Ambiente de Desenvolvimento

- **Propósito**: Desenvolvimento e testes locais
- **Aprovação**: Não requerida para deploy
- **Dados**: Dataset sintético mínimo
- **URL**: dev.beneficio.semtas.local ou dev-beneficio.azurewebsites.net
- **Infraestrutura**: Recursos compartilhados, escala reduzida

#### 3.1.2 Ambiente de Teste/QA

- **Propósito**: Testes de integração e sistema
- **Aprovação**: Automática após testes de CI
- **Dados**: Dataset representativo anonimizado
- **URL**: qa.beneficio.semtas.local ou qa-beneficio.azurewebsites.net
- **Infraestrutura**: Similar à produção, escala reduzida

#### 3.1.3 Ambiente de Homologação (Staging)

- **Propósito**: Validação final antes de produção
- **Aprovação**: Manual por Gestor SEMTAS
- **Dados**: Dataset completo anonimizado
- **URL**: homolog.beneficio.semtas.natal.gov.br
- **Infraestrutura**: Espelho de produção

#### 3.1.4 Ambiente de Produção

- **Propósito**: Sistema em uso real
- **Aprovação**: Manual por Gerente de Projeto e SEMTAS
- **Dados**: Dados reais
- **URL**: beneficio.semtas.natal.gov.br
- **Infraestrutura**: Completa, alta disponibilidade

### 3.2 Estratégia de Promoção

```
Desenvolvimento → Teste/QA → Homologação → Produção
```

- Promoção automática para Teste/QA após sucesso em CI
- Promoção manual para Homologação após validações
- Promoção manual para Produção após aprovação formal

## 4. Pipeline de CI (Integração Contínua)

### 4.1 Triggers

#### 4.1.1 Automáticos

- **Push para feature branches**: Executa lint, build e testes unitários
- **Pull Request para develop**: Executa pipeline completo de CI
- **Merge para develop**: Executa pipeline CI e deploy para ambiente de Teste/QA

#### 4.1.2 Manuais

- Deploy para Homologação e Produção sempre manual

### 4.2 Etapas do Pipeline CI (Baseado no Starter Kit)

#### 4.2.1 Checkout

- Clone do repositório
- Checkout da branch específica
- Verificação de submodules (se aplicável)

#### 4.2.2 Instalação de Dependências

- Instalação de pacotes npm
- Caching de node_modules para builds futuros
- Verificação de integridade das dependências

#### 4.2.3 Lint e Formatação

- Execução de ESLint para verificação de padrões de código (já configurado no starter)
- Validação de formatação com Prettier (já configurado no starter)
- Falha em caso de erros (warning não bloqueia)

#### 4.2.4 Testes Unitários

- Execução de testes unitários com Jest (já configurado no starter)
- Geração de relatório de cobertura
- Falha se cobertura abaixo de 80%
- Falha se testes falharem

#### 4.2.5 Build

- Compilação do código TypeScript
- Verificação de erros de build

#### 4.2.6 Testes de Integração

- Execução de testes de integração
- Verificação de comunicação entre componentes
- Uso de banco de dados efêmero para testes

#### 4.2.7 Análise de Código Estática