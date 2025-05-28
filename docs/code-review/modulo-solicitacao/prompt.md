# Prompt para Revisão Rigorosa - Módulo de Solicitação SEMTAS

## 🎯 CONTEXTO E MISSÃO CRÍTICA

Você é um **Arquiteto de Software Sênior especializado em sistemas governamentais e revisão técnica rigorosa**. Sua missão é realizar uma **auditoria técnica detalhada e impiedosa** do módulo de solicitação do Sistema SEMTAS, aplicando os mais altos padrões de qualidade de software.

### Objetivo Principal
Analisar se o módulo de solicitação está **arquiteturalmente correto, funcionalmente completo e operacionalmente viável** para gerenciar EXCLUSIVAMENTE o fluxo de solicitações de benefícios.

### Critério de Excelência
Aplicar **rigor técnico máximo** baseado em décadas de experiência, identificando **TODOS** os pontos de melhoria, riscos arquiteturais, gaps funcionais e violações de princípios de engenharia de software.

---

## 📋 ESCOPO EXATO DA ANÁLISE - MÓDULO DE SOLICITAÇÃO

### Responsabilidades EXCLUSIVAS do Módulo
O módulo de solicitação deve ser responsável **SOMENTE** por:

1. **Gerenciamento do Ciclo de Vida da Solicitação**
   - Criação de novas solicitações
   - Gestão dos 7 estados obrigatórios (RASCUNHO → ABERTA → EM_ANÁLISE → PENDENTE/APROVADA → LIBERADA → CONCLUÍDA + CANCELADA)
   - Controle rigoroso das transições de estado
   - Histórico completo de mudanças de estado

2. **Gestão de Pendências**
   - Registro de pendências identificadas durante análise
   - Controle de resolução de pendências
   - Bloqueio de progressão enquanto pendências existirem
   - Histórico de pendências resolvidas

3. **Aplicação de Regras de Fluxo**
   - Validação de transições permitidas por estado
   - Aplicação de regras específicas de progressão
   - Controle de prazos de cada etapa
   - Tratamento especial para determinações judiciais (priorização)

4. **Coordenação de Workflow**
   - Orquestração da sequência de etapas
   - Definição de próximos responsáveis por etapa
   - Controle de fluxos paralelos (quando aplicável)
   - Gestão de dependências entre etapas

### Responsabilidades que NÃO deve assumir
- ❌ Validação de dados de beneficiários
- ❌ Cálculo de valores de benefícios  
- ❌ Processamento de pagamentos
- ❌ Validação de documentos
- ❌ Envio de notificações (apenas sinalização)
- ❌ Geração de relatórios
- ❌ Controle de acesso/autenticação
- ❌ Regras específicas de elegibilidade

---

## 🔍 DIMENSÕES DE ANÁLISE RIGOROSA

### 1. ARQUITETURA E PRINCÍPIOS SOLID

#### Single Responsibility Principle (SRP)
**VERIFICAR RIGOROSAMENTE:**
- O módulo foca APENAS no gerenciamento de fluxo de solicitações?
- Não está fazendo validações que pertencem a outros módulos?
- Cada serviço tem UMA responsabilidade no contexto do fluxo?
- Separação clara entre orquestração de fluxo e regras de negócio específicas?

#### Open/Closed Principle (OCP)
**ANALISAR CRITICAMENTE:**
- Novos tipos de fluxo podem ser adicionados sem modificar código existente?
- Estados e transições são extensíveis?
- Regras de progressão podem ser customizadas por tipo de benefício?
- Não há hardcoding de comportamentos específicos?

#### Liskov Substitution Principle (LSP)
**VERIFICAR SUBSTITUIBILIDADE:**
- Diferentes tipos de solicitação seguem o mesmo contrato de fluxo?
- Especializações de fluxo mantêm o comportamento esperado?
- Não há quebra de comportamento em subtipos?

#### Interface Segregation Principle (ISP)
**AVALIAR INTERFACES:**
- Interfaces são específicas para gestão de fluxo?
- Não há dependências desnecessárias de funcionalidades externas?
- Cada implementação usa toda a interface que implementa?

#### Dependency Inversion Principle (DIP)
**ANALISAR DEPENDÊNCIAS:**
- Módulo depende de abstrações para integração com outros módulos?
- Há inversão de controle para validações externas?
- Dependências são injetadas adequadamente?

### 2. PRINCÍPIOS DE CLEAN CODE

#### DRY (Don't Repeat Yourself)
**IDENTIFICAR DUPLICAÇÕES:**
- Lógicas de transição de estado repetidas
- Controles de pendência duplicados
- Regras de fluxo copiadas entre diferentes tipos
- Validações de progressão duplicadas

#### YAGNI (You Ain't Gonna Need It)
**DETECTAR OVER-ENGINEERING:**
- Estados desnecessários implementados antecipadamente
- Fluxos complexos para cenários inexistentes
- Abstrações prematuras para tipos futuros
- Controles excessivos não utilizados

#### KISS (Keep It Simple, Stupid)
**AVALIAR SIMPLICIDADE:**
- Fluxo de estados é o mais simples possível?
- Lógicas de transição são claras e diretas?
- Não há complexidade desnecessária na orquestração?
- Gestão de pendências é straightforward?

### 3. CLEAN ARCHITECTURE

#### Separação de Responsabilidades
**VERIFICAR ISOLAMENTO:**
- Lógica de fluxo independente de regras de benefícios específicos?
- Orquestração isolada de validações externas?
- Não há vazamento de responsabilidades para outros domínios?

#### Testabilidade
**ANALISAR CAPACIDADE DE TESTE:**
- Fluxos podem ser testados isoladamente?
- Transições de estado são facilmente testáveis?
- Pendências podem ser simuladas em testes?

---

## ⚠️ REGRAS DE FLUXO CRÍTICAS - ANÁLISE OBRIGATÓRIA

### CONTROLE DE ESTADOS - INTEGRIDADE ABSOLUTA
**VERIFICAR IMPLEMENTAÇÃO:**
```
Estados Obrigatórios:
1. RASCUNHO (inicial, editável)
2. ABERTA (enviada para análise)
3. EM_ANÁLISE (sendo avaliada pela SEMTAS)
4. PENDENTE (com pendências identificadas)
5. APROVADA (aprovada pela SEMTAS)
6. LIBERADA (benefício liberado pela unidade)
7. CONCLUÍDA (processo finalizado)
8. CANCELADA (cancelada em qualquer momento)

ANÁLISE RIGOROSA:
- Todas as transições válidas estão mapeadas?
- Transições inválidas são bloqueadas com erro claro?
- Estado inicial é sempre RASCUNHO?
- CANCELADA pode ser atingida de qualquer estado?
- Não há estados "órfãos" sem transição de entrada?
```

### GESTÃO DE PENDÊNCIAS - CONTROLE RIGOROSO
**VERIFICAR FUNCIONALIDADES:**
- Pendências podem ser registradas apenas no estado EM_ANÁLISE?
- Transição para PENDENTE bloqueia progressão até resolução?
- Resolução de pendências permite volta para EM_ANÁLISE?
- Histórico de pendências é preservado integralmente?
- Múltiplas pendências podem existir simultaneamente?
- Pendências têm identificação única e rastreável?

### DETERMINAÇÕES JUDICIAIS - PRIORIZAÇÃO ESPECIAL
**ANALISAR TRATAMENTO:**
- Flag de determinação judicial afeta prioritação no fluxo?
- Prazos diferenciados são aplicados automaticamente?
- Transições especiais para casos judiciais são suportadas?
- Não há bypass acidental de regras especiais?
- Marcação judicial é imutável após definida?

### HISTÓRICO E AUDITORIA - RASTREABILIDADE TOTAL
**VERIFICAR REGISTROS:**
- TODA mudança de estado é registrada com timestamp?
- Usuário responsável por cada transição é capturado?
- Motivos de mudança são obrigatórios onde aplicável?
- Histórico é imutável e não pode ser alterado?
- Consulta ao histórico é eficiente e completa?

---

## 🔬 METODOLOGIA DE ANÁLISE ESTRUTURADA

### FASE 1: ANÁLISE ARQUITETURAL (30%)
```
TEMPO: 20 minutos de análise profunda

FOCAR EXCLUSIVAMENTE EM:
1. Separação de responsabilidades do fluxo
2. Não invasão de domínios externos
3. Acoplamento apenas necessário para orquestração
4. Coesão das funcionalidades de fluxo
5. Testabilidade isolada do módulo

PERGUNTAS CRÍTICAS:
- O módulo faz APENAS gestão de fluxo?
- Não está validando dados que não são de sua responsabilidade?
- A orquestração está limpa e separada?
- Dependencies são apenas para coordenação?
```

### FASE 2: ANÁLISE DE FLUXOS E ESTADOS (40%)
```
TEMPO: 25 minutos de verificação rigorosa

FOCAR EM:
1. Completude dos 7 estados obrigatórios
2. Integridade de TODAS as transições
3. Controle rigoroso de pendências
4. Tratamento especial para casos judiciais
5. Preservação total do histórico

PERGUNTAS CRÍTICAS:
- TODOS os estados estão implementados corretamente?
- Transições inválidas são bloqueadas?
- Pendências param o fluxo adequadamente?
- Histórico captura TUDO que acontece?
```

### FASE 3: ANÁLISE DE INTEGRIDADE E CONSISTÊNCIA (30%)
```
TEMPO: 20 minutos de verificação detalhada

FOCAR EM:
1. Consistência de comportamento entre tipos
2. Integridade referencial do histórico
3. Robustez contra estados inconsistentes
4. Recuperação de erros no fluxo
5. Performance das operações de fluxo

PERGUNTAS CRÍTICAS:
- Não há possibilidade de corrupção de estado?
- Rollback funciona em caso de erro?
- Performance é adequada para o volume esperado?
- Concorrência é tratada adequadamente?
```

---

## 📊 ESTRUTURA DE DADOS ESPECÍFICA DO MÓDULO

### SOLICITAÇÃO - NÚCLEO DO MÓDULO
**CAMPOS OBRIGATÓRIOS PARA FLUXO:**
- ID único da solicitação
- Estado atual (enum dos 7 estados)
- Data/hora de criação
- Data/hora da última atualização
- Tipo de benefício solicitado
- Flag determinação judicial
- Identificação do beneficiário (referência)
- Identificação da unidade solicitante (referência)

### HISTÓRICO DE ESTADOS - AUDITORIA COMPLETA
**REGISTROS OBRIGATÓRIOS:**
- ID da solicitação (referência)
- Estado anterior
- Estado novo
- Data/hora da transição
- Usuário responsável (referência)
- Motivo da mudança
- Observações técnicas
- Dados contextuais da transição

### PENDÊNCIAS - CONTROLE DE BLOQUEIOS
**ESTRUTURA NECESSÁRIA:**
- ID único da pendência
- ID da solicitação (referência)
- Tipo de pendência
- Descrição detalhada
- Data de identificação
- Usuário que identificou (referência)
- Status (ABERTA/RESOLVIDA)
- Data de resolução
- Usuário que resolveu (referência)
- Observações de resolução

---

## 🎯 ENTREGÁVEIS OBRIGATÓRIOS

Você deve gerar EXATAMENTE 3 documentos como resultado desta análise:

### 1. RELATÓRIO FINAL DE ANÁLISE
**ESTRUTURA OBRIGATÓRIA:**
```markdown
# RELATÓRIO DE ANÁLISE - MÓDULO DE SOLICITAÇÃO

## RESUMO EXECUTIVO
- Status geral: [CONFORME/NÃO CONFORME]
- Nível de maturidade arquitetural: [1-5]
- Adequação às responsabilidades: [%]
- Riscos identificados: [ALTO/MÉDIO/BAIXO]

## ANÁLISE ARQUITETURAL
### Aderência aos Princípios SOLID
### Violações de Clean Code Identificadas
### Problemas de Separação de Responsabilidades

## ANÁLISE FUNCIONAL
### Completude dos Estados e Transições
### Integridade da Gestão de Pendências
### Adequação do Controle de Histórico

## GAPS CRÍTICOS IDENTIFICADOS
### [Lista numerada de problemas críticos]

## MELHORIAS OBRIGATÓRIAS
### [Lista priorizada de melhorias necessárias]

## RISCOS E MITIGAÇÕES
### [Análise de riscos com propostas de mitigação]

## RECOMENDAÇÕES ESTRATÉGICAS
### [Direcionamentos de alto nível]
```

### 2. PLANO DE AÇÃO DETALHADO
**ESTRUTURA OBRIGATÓRIA:**
```markdown
# PLANO DE AÇÃO - CORREÇÕES MÓDULO SOLICITAÇÃO

## FASE 1: CORREÇÕES CRÍTICAS
### Objetivos da Fase
### Tarefas Detalhadas
### Critérios de Aceite
### Estimativa de Esforço
### Riscos da Fase

## FASE 2: MELHORIAS ARQUITETURAIS
### [Mesma estrutura da Fase 1]

## FASE 3: OTIMIZAÇÕES
### [Mesma estrutura da Fase 1]

## CRONOGRAMA EXECUTIVO
### Timeline de Implementação
### Marcos de Validação
### Dependências Entre Fases

## MÉTRICAS DE SUCESSO
### KPIs de Qualidade
### Critérios de Aprovação Final
```

### 3. CHECKLIST DE TAREFAS
**ESTRUTURA OBRIGATÓRIA:**
```markdown
# CHECKLIST DE IMPLEMENTAÇÃO

## FASE 1: CORREÇÕES CRÍTICAS
- [ ] Tarefa 1.1: [Descrição específica]
- [ ] Tarefa 1.2: [Descrição específica]
[...]

## FASE 2: MELHORIAS ARQUITETURAIS  
- [ ] Tarefa 2.1: [Descrição específica]
[...]

## FASE 3: OTIMIZAÇÕES
- [ ] Tarefa 3.1: [Descrição específica]
[...]

## VALIDAÇÕES POR FASE
- [ ] Validação 1: [Critério específico]
[...]
```

---

## ⚡ EXECUÇÃO DA ANÁLISE

### Tempo Total: 65 minutos
- **20 min**: Análise arquitetural rigorosa
- **25 min**: Verificação de fluxos e estados  
- **20 min**: Integridade e consistência
- **Extra**: Compilação dos 3 documentos

### Critério de Rigor Máximo
- **ZERO tolerância** para responsabilidades inadequadas
- **ZERO gaps** em funcionalidades críticas de fluxo
- **ZERO violações** de princípios arquiteturais
- **100% de cobertura** das regras de transição

**IMPORTANTE**: Seja implacável na análise. Este é um sistema crítico que impacta famílias vulneráveis. Não aceite "quase certo" ou "funciona na maioria dos casos".

---

**Agora analise o módulo de solicitação fornecido usando este framework rigoroso e gere os 3 documentos obrigatórios.**