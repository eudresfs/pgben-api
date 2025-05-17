# Prompt para Resolução de Problemas com Dependências Desatualizadas e Eliminação do --legacy-peer-deps

## Objetivo
Diagnosticar, resolver e prevenir problemas relacionados a dependências desatualizadas em projetos Node.js/NPM, eliminando a necessidade do uso da flag `--legacy-peer-deps` e estabelecendo uma estratégia sustentável para gerenciamento de dependências.

## Contexto do Problema
O uso frequente da flag `--legacy-peer-deps` indica problemas fundamentais na estrutura de dependências do projeto. Esta flag ignora verificações de compatibilidade de peer dependencies, o que pode levar a:
- Incompatibilidades silenciosas entre bibliotecas
- Comportamentos inesperados em runtime
- Dificuldades em atualizações futuras
- Vulnerabilidades de segurança não resolvidas
- Problemas de manutenção a longo prazo

## Diagnóstico Inicial

### 1. Análise do Estado Atual de Dependências

```bash
# Execute e cole a saída destes comandos:

# Listar dependências desatualizadas
npm outdated

# Verificar conflitos de peer dependencies
npm ls --depth=1 | grep -i "peer"

# Verificar vulnerabilidades
npm audit
```

### 2. Identificação de Padrões Problemáticos

- Quais pacotes aparecem frequentemente como "MISSING" ou "INVALID"?
- Existem versões específicas de frameworks principais (React, Angular, NestJS) causando os problemas?
- Há diferença significativa entre versões de dependências atuais vs desejadas?
- Existe algum padrão nos erros que surgem ao instalar sem `--legacy-peer-deps`?

### 3. Mapeamento de Dependências Críticas

Liste as 5-10 dependências mais importantes do projeto:
1. 
2. 
3. 
4. 
5. 

## Estratégia de Resolução

### Abordagem 1: Resolução Gradual e Controlada

Esta abordagem mantém a estabilidade enquanto remove progressivamente a necessidade de `--legacy-peer-deps`:

#### 1. Criar lockfile limpo (opcional, use com cautela)
```bash
# Backup do package-lock.json atual
cp package-lock.json package-lock.json.bak

# Remover node_modules e lockfile
rm -rf node_modules package-lock.json

# Reinstalar com --legacy-peer-deps uma última vez
npm install --legacy-peer-deps
```

#### 2. Atualizar dependências em grupos isolados
```bash
# Exemplo para grupo de dependências relacionadas a UI
npm update --no-legacy-peer-deps react react-dom @types/react

# Exemplo para grupo de dependências relacionadas a backend
npm update --no-legacy-peer-deps nestjs/* @nestjs/*
```

#### 3. Resolver conflitos específicos de peer dependencies
Para cada conflito identificado, uma destas estratégias:
- Atualizar o pacote pai para uma versão compatível com suas peer dependencies
- Definir uma versão específica da peer dependency compatível com todos os pacotes
- Em último caso, substituir pacotes problemáticos por alternativas

### Abordagem 2: Reconstrução Baseada em Compatibilidade

Esta abordagem é mais invasiva mas pode resolver problemas profundos:

#### 1. Criar projeto de salvaguarda
```bash
# Criar package.json limpo com dependências principais em versões compatíveis
npm init
npm install --save-exact react@^18.2.0 react-dom@^18.2.0 # exemplo

# Adicionar dependências incrementalmente, verificando compatibilidade
npm install --save-exact [próxima-dependência-crítica]
```

#### 2. Migrar código gradualmente
- Mover código para o novo projeto base
- Adaptar para compatibilidade com novas versões de dependências
- Testar minuciosamente em cada etapa

### Abordagem 3: Utilização de Ferramentas de Resolução

#### 1. Usar npm-check ou npm-check-updates
```bash
# Instalar globalmente
npm install -g npm-check-updates

# Verificar atualizações disponíveis
ncu

# Atualizar seletivamente
ncu -u --target minor # atualiza apenas versões minor
```

#### 2. Experimentar Yarn ou PNPM
```bash
# Instalar yarn globalmente
npm install -g yarn

# Converter projeto para yarn (geralmente melhor resolução de dependências)
yarn

# Alternativa: usar PNPM
npm install -g pnpm
pnpm import # importa do package-lock.json
pnpm install
```

## Plano de Ação Detalhado

### Fase 1: Análise e Preparação (Tempo estimado: 2-4 horas)

1. **Criar branch específica para refatoração de dependências**
   ```bash
   git checkout -b fix/dependency-resolution
   ```

2. **Documentar o estado atual**
   - Listar todas as dependências com problemas
   - Identificar grupos de dependências relacionadas
   - Fazer screenshot ou salvar logs de erro atuais

3. **Criar ambiente de teste isolado**
   - Configurar pipeline de CI/CD para testar mudanças
   - Preparar suite de testes para verificar funcionalidade após atualizações

### Fase 2: Resolução Iterativa (Tempo estimado: 4-16 horas, dependendo da complexidade)

1. **Começar pelas dependências de baixo risco**
   - Atualizar pacotes de desenvolvimento (eslint, prettier, etc.)
   - Verificar se funciona sem `--legacy-peer-deps`

2. **Resolver conflitos de frameworks centrais**
   - Alinhar versões de React/Angular/Vue/NestJS
   - Garantir que bibliotecas associadas sejam compatíveis

3. **Atualizar bibliotecas de UI e componentes**
   - Resolver camada por camada (UI → lógica → dados)
   - Testar visual e funcional após cada grupo

4. **Resolver dependências transversais**
   - Bibliotecas de utilidades
   - Processadores/transpiladores (babel, webpack, etc)

5. **Validar em cada etapa**
   - Executar testes automatizados
   - Verificar build e funcionamento
   - Confirmar que não é necessário `--legacy-peer-deps`

### Fase 3: Prevenção e Manutenção (Tempo estimado: 2-4 horas)

1. **Implementar controles de versão mais rígidos**
   ```json
   // Em package.json, usar versões exatas para dependências críticas
   "dependencies": {
     "react": "18.2.0",
     "react-dom": "18.2.0"
   }
   ```

2. **Configurar ferramentas de monitoramento**
   - Configurar Dependabot ou Renovate
   - Implementar verificações de CI para compatibilidade de dependências

3. **Documentar decisões e estratégia futura**
   - Criar guia de atualização de dependências
   - Documentar versões conhecidas compatíveis
   - Estabelecer processo para atualizações futuras

## Soluções para Problemas Comuns

### 1. Conflitos em Bibliotecas React
```
"react-dom@18.2.0" has incorrect peer dependency "react@18.2.0".
```
**Solução:**
- Garantir que todas as bibliotecas React usem a mesma versão principal
- Considerar o uso de aliasing para forçar uma única versão
- Em webpack:
```javascript
resolve: {
  alias: {
    'react': path.resolve('./node_modules/react'),
    'react-dom': path.resolve('./node_modules/react-dom')
  }
}
```

### 2. Conflitos TypeScript/Tipos
```
"@types/react@18.0.0" has incorrect peer dependency "react@^18.0.0".
```
**Solução:**
- Alinhar versões dos pacotes @types com as bibliotecas correspondentes
- Verificar se não há múltiplas versões de TypeScript no projeto
- Utilizar versões compatíveis do TypeScript e @types

### 3. Bibliotecas Abandonadas/Desatualizadas
```
"outdated-library@1.0.0" has incorrect peer dependency "react@^16.0.0".
```
**Solução:**
- Buscar alternativas mantidas ativamente
- Considerar fork da biblioteca ou implementação própria
- Em último caso, manter versões antigas de peer dependencies específicas

### 4. Conflitos em Cascata
Quando resolver um conflito cria outros:
**Solução:**
- Mapear a árvore de dependências completa
- Resolver da base para o topo
- Considerar abordagem "big bang" para frameworks centrais

## Checklist Final

Utilize este checklist para verificar o progresso:

- [ ] Todas as dependências diretas estão atualizadas
- [ ] Não há warnings de peer dependencies não atendidas
- [ ] Instalação e build funcionam sem `--legacy-peer-deps`
- [ ] Testes automatizados passam
- [ ] Aplicação funciona corretamente em ambiente de desenvolvimento
- [ ] Aplicação passa no build de produção
- [ ] Processo de CI/CD completado com sucesso
- [ ] Estratégia de gerenciamento futuro de dependências documentada

## Perguntas para Reflexão

1. Quais são os componentes/bibliotecas críticos que não podem ser facilmente substituídos?
2. Qual é a tolerância da equipe para possíveis breaking changes?
3. Qual é o cronograma ideal para estas atualizações (big bang vs. gradual)?
4. Quais recursos (tempo, pessoal) estão disponíveis para este esforço?
5. Qual é o plano para manter dependências atualizadas após esta resolução?

## Conclusão

A resolução de problemas de dependências é um investimento na sustentabilidade do projeto. Embora possa ser trabalhosa inicialmente, eliminar a necessidade de flags como `--legacy-peer-deps` reduz significativamente o débito técnico e riscos futuros, melhorando a manutenibilidade e segurança do código.

---

Por favor, preencha as informações solicitadas e siga o plano de ação para resolver os problemas de dependências de forma sistemática e sustentável.