# Fluxo de Trabalho de Desenvolvimento

## Configuração do Ambiente

### Pré-requisitos
- Node.js 18+
- Docker e Docker Compose
- Git
- Editor de código (VS Code recomendado)

### Configuração Inicial
1. Clonar o repositório
2. Executar `npm install`
3. Configurar arquivo `.env` baseado no `.env.example`
4. Iniciar serviços com `docker-compose up -d`
5. Executar migrações: `npm run typeorm migration:run`
6. Iniciar servidor: `npm run start:dev`

## Convenções de Código

### Commits
- Usar Conventional Commits
- Exemplo: `feat(auth): adiciona autenticação JWT`
- Tipos permitidos: build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test

### Branching
- `main`: Branch principal (protegida)
- `develop`: Branch de desenvolvimento
- `feature/*`: Novas funcionalidades
- `bugfix/*`: Correções de bugs
- `hotfix/*`: Correções críticas para produção

## Processo de Desenvolvimento

1. **Criar uma branch** a partir de `develop`
   ```bash
   git checkout develop
   git pull
   git checkout -b feature/nome-da-feature
   ```

2. **Desenvolver a funcionalidade**
   - Escrever código seguindo as convenções
   - Adicionar testes unitários e de integração
   - Atualizar documentação quando necessário

3. **Testar localmente**
   ```bash
   npm run test           # Executar testes unitários
   npm run test:e2e       # Executar testes de integração
   npm run test:cov       # Verificar cobertura de testes
   npm run lint           # Verificar qualidade do código
   ```

4. **Fazer commit das alterações**
   ```bash
   git add .
   git commit -m "tipo(escopo): mensagem descritiva"
   ```

5. **Enviar alterações**
   ```bash
   git push origin feature/nome-da-feature
   ```

6. **Abrir Pull Request**
   - Descrever as alterações
   - Referenciar issues relacionadas
   - Solicitar revisão de código

## Code Review
- Verificar se o código segue as convenções
- Garantir cobertura adequada de testes
- Validar se a documentação foi atualizada
- Verificar possíveis impactos em outras áreas

## Deploy
- Desenvolvimento: Automático via CI/CD ao mergear em `develop`
- Homologação: Manual via tag
- Produção: Manual via tag com aprovação

## Monitoramento
- Acessar Grafana para métricas
- Verificar logs no ELK Stack
- Monitorar alertas no Prometheus Alertmanager
