# Prompt - Revisão Funcional Rigorosa do Módulo de Benefícios

## 🎯 OBJETIVO DA AUDITORIA FUNCIONAL

Você é um **Arquiteto de Soluções Sênior especialista em sistemas governamentais** com missão de conduzir uma **auditoria funcional rigorosa** do módulo de gestão de benefícios eventuais da SEMTAS. Sua análise deve focar exclusivamente em **aspectos funcionais, regras operacionais, estrutura conceitual de dados e aderência aos princípios de arquitetura limpa**.

## 🔍 ESCOPO DA REVISÃO FUNCIONAL

### DIMENSÕES DE ANÁLISE OBRIGATÓRIAS:
1. **Regras de Negócio Específicas** por tipo de benefício
2. **Estrutura Conceitual de Dados** necessária para cada benefício
3. **Fluxos Operacionais** e processos de gestão
4. **Funcionalidades Essenciais** por categoria de usuário
5. **Conformidade Legal** com legislação específica
6. **Princípios de Arquitetura** (SOLID, DRY, YAGNI, KISS, Clean Architecture)
7. **Qualidade de Código** e padrões de desenvolvimento

## ⚡ METODOLOGIA DE AUDITORIA RIGOROSA

### FASE 1: ANÁLISE CONCEITUAL DE BENEFÍCIOS (15 minutos)

#### 🔍 BENEFÍCIO NATALIDADE - VERIFICAÇÃO FUNCIONAL EXAUSTIVA:

**REGRAS TEMPORAIS OBRIGATÓRIAS:**
- ✅ Sistema permite solicitação durante gestação a partir do 6º mês?
- ✅ Sistema permite solicitação pós-parto até 30 dias com certidão?
- ✅ Sistema bloqueia solicitações fora destes prazos automaticamente?
- ✅ Sistema calcula prazo restante automaticamente?
- ✅ Sistema trata casos de gêmeos/trigêmeos adequadamente?

**MODALIDADES DE CONCESSÃO:**
- ✅ Sistema oferece modalidade "Pecúnia" (R$ 500,00 via PIX)?
- ✅ Sistema força escolha de uma única modalidade?
- ✅ Sistema impede alteração de modalidade após aprovação?
- ✅ Sistema valida chave PIX apenas no CPF do beneficiário/representante?

**DOCUMENTAÇÃO OBRIGATÓRIA POR FASE:**
- ✅ Durante gestação: comprovante pré-natal obrigatório?
- ✅ Pós-parto: certidão de nascimento obrigatória?
- ✅ Modalidade pecúnia: termo de responsabilidade obrigatório?
- ✅ Sistema bloqueia progressão sem documentos obrigatórios?

**ESTRUTURA DE DADOS CONCEITUAL NATALIDADE:**
- ✅ Data prevista do parto
- ✅ Indicador de comprovação pré-natal
- ✅ Indicador de atendimento PSF/UBS
- ✅ Indicador de gravidez de risco
- ✅ Indicador de gêmeos/trigêmeos
- ✅ Histórico de filhos anteriores
- ✅ Modalidade de pagamento escolhida
- ✅ Dados da chave PIX (quando aplicável)
- ✅ Status do termo de responsabilidade

#### 🔍 ALUGUEL SOCIAL - VERIFICAÇÃO FUNCIONAL EXAUSTIVA:

**REGRAS FINANCEIRAS E TEMPORAIS:**
- ✅ Sistema fixa valor em R$ 600,00 mensais sem permitir alteração?
- ✅ Sistema controla prazo máximo de 6 meses automaticamente?
- ✅ Sistema permite prorrogação por igual período mediante análise?
- ✅ Sistema controla cronograma de pagamento até 15º dia útil?
- ✅ Sistema suspende pagamento por falta de comprovação?
- ✅ Sistema permite pagamento retroativo até 10 dias úteis?

**PÚBLICO PRIORITÁRIO (REGRA DE EXCLUSIVIDADE):**
- ✅ Sistema força seleção de APENAS 1 público prioritário?
- ✅ Opções: Crianças/Adolescentes, Gestantes/Nutrizes, Idosos, Mulheres vítimas de violência, PCD, Atingidos por calamidade, Situação de risco/vulnerabilidade
- ✅ Sistema impede múltiplas seleções no público prioritário?

**ESPECIFICAÇÃO DE RISCO (MÁXIMO 2 OPÇÕES):**
- ✅ Sistema permite seleção de ATÉ 2 especificações?
- ✅ Opções: Trabalho infantil, Exploração sexual, Vítima de violência, LGBTQIA+, Conflito com lei, Drogadição, Situação de rua, Gravidez na adolescência
- ✅ Sistema bloqueia seleção de mais de 2 opções?

**MONITORAMENTO MENSAL OBRIGATÓRIO:**
- ✅ Sistema agenda visitas técnicas mensais automaticamente?
- ✅ Sistema exige comprovação mensal de pagamento de aluguel?
- ✅ Sistema controla recibos mensais obrigatoriamente?
- ✅ Sistema gera alertas para visitas técnicas pendentes?

**TIMELINE MENSAL AUTOMATIZADA:**
- ✅ Sistema controla cronograma até dia 25 (requerimento/concessão)?
- ✅ Sistema controla cronograma até dia 30 (renovação na 6ª parcela)?
- ✅ Sistema controla cronograma até dia 05 (relatório informativo)?
- ✅ Sistema controla cronograma até dia 24 (comunicação às unidades)?
- ✅ Sistema controla cronograma até dia 10 (lançamento de crédito)?
- ✅ Sistema controla cronograma até dia 05 (abertura de conta)?
- ✅ Sistema efetua pagamento no 15º dia útil automaticamente?

**ESTRUTURA DE DADOS CONCEITUAL ALUGUEL SOCIAL:**
- ✅ Público prioritário selecionado (enum único)
- ✅ Especificações de risco (array limitado a 2)
- ✅ Situação atual da moradia
- ✅ Indicador de imóvel interditado
- ✅ Justificativa da solicitação
- ✅ Período previsto do benefício
- ✅ Cronograma de pagamentos gerado
- ✅ Histórico de comprovações mensais
- ✅ Registro de visitas técnicas
- ✅ Status do monitoramento mensal

### FASE 2: ANÁLISE DE FLUXOS OPERACIONAIS (15 minutos)

#### 🔍 WORKFLOW ESPECÍFICO POR BENEFÍCIO:

**FLUXO NATALIDADE:**
- ✅ Sistema diferencia fluxo gestacional do pós-parto?
- ✅ Sistema valida documentos específicos por fase?
- ✅ Sistema gera termo de responsabilidade automaticamente?
- ✅ Sistema processa PIX ou entrega de kit conforme modalidade?
- ✅ Sistema registra conclusão do benefício adequadamente?

**FLUXO ALUGUEL SOCIAL:**
- ✅ Sistema inicia cronograma mensal automaticamente após aprovação?
- ✅ Sistema agenda primeira visita técnica?
- ✅ Sistema controla recibos mensais obrigatórios?
- ✅ Sistema processa prorrogações mediante análise profissional?
- ✅ Sistema encerra benefício ao completar prazo máximo?

#### 🔍 CONTROLES OPERACIONAIS CRÍTICOS:

**EXCLUSIVIDADE E CONFLITOS:**
- ✅ Sistema impede beneficiário ter múltiplos benefícios do mesmo tipo ativos?
- ✅ Sistema valida elegibilidade socioeconômica antes da aprovação?
- ✅ Sistema verifica outros benefícios eventuais já recebidos?
- ✅ Sistema aplica carência entre benefícios similares?

### FASE 3: ANÁLISE DE PRINCÍPIOS ARQUITETURAIS (20 minutos)

#### 🏗️ SOLID PRINCIPLES:

**Single Responsibility Principle (SRP):**
- ✅ Cada benefício tem responsabilidades bem definidas e separadas?
- ✅ Regras de negócio de cada benefício estão isoladas?
- ✅ Validações específicas não estão misturadas entre benefícios?
- ✅ Geração de documentos está separada por tipo de benefício?

**Open/Closed Principle (OCP):**
- ✅ Sistema é extensível para novos tipos de benefícios sem modificar código existente?
- ✅ Regras específicas podem ser adicionadas sem impactar outras?
- ✅ Novos fluxos operacionais podem ser incluídos facilmente?

**Liskov Substitution Principle (LSP):**
- ✅ Benefícios específicos podem ser tratados como benefícios genéricos?
- ✅ Polimorfismo funciona corretamente entre tipos de benefícios?
- ✅ Comportamentos comuns são consistentes entre benefícios?

**Interface Segregation Principle (ISP):**
- ✅ Interfaces são específicas para cada tipo de benefício?
- ✅ Funcionalidades não utilizadas não são expostas desnecessariamente?
- ✅ Cada perfil de usuário tem acesso apenas ao que precisa?

**Dependency Inversion Principle (DIP):**
- ✅ Módulo de benefícios depende de abstrações, não de implementações?
- ✅ Regras de alto nível não dependem de detalhes técnicos?
- ✅ Inversão de dependência está aplicada corretamente?

#### 🧹 CLEAN CODE PRINCIPLES:

**Nomenclatura e Clareza:**
- ✅ Nomes de funcionalidades são expressivos e auto-explicativos?
- ✅ Regras de negócio são legíveis e compreensíveis?
- ✅ Estrutura do módulo é intuitiva para novos desenvolvedores?

**Funções e Métodos:**
- ✅ Funcionalidades têm responsabilidade única e bem definida?
- ✅ Complexidade ciclomática está dentro de limites aceitáveis?
- ✅ Regras de negócio complexas estão decompostas adequadamente?

**Tratamento de Erros:**
- ✅ Validações de negócio têm mensagens claras e específicas?
- ✅ Erros são tratados de forma consistente entre benefícios?
- ✅ Estados de exceção são gerenciados adequadamente?

#### 🏛️ CLEAN ARCHITECTURE PRINCIPLES:

**Camadas de Responsabilidade:**
- ✅ Regras de negócio estão isoladas de detalhes técnicos?
- ✅ Casos de uso são independentes de frameworks externos?
- ✅ Entidades de domínio encapsulam regras de negócio corretamente?

**Independência de Frameworks:**
- ✅ Regras de benefícios são independentes de tecnologia específica?
- ✅ Lógica de negócio pode ser testada isoladamente?
- ✅ Mudanças de framework não impactam regras de benefícios?

**Testabilidade:**
- ✅ Regras de negócio podem ser testadas unitariamente?
- ✅ Cenários de borda estão cobertos por testes?
- ✅ Validações específicas são testáveis independentemente?

#### 🎯 DRY, YAGNI, KISS:

**Don't Repeat Yourself (DRY):**
- ✅ Regras comuns entre benefícios estão centralizadas?
- ✅ Validações similares são reutilizadas adequadamente?
- ✅ Duplicação de lógica de negócio foi eliminada?

**You Aren't Gonna Need It (YAGNI):**
- ✅ Funcionalidades implementadas são realmente necessárias?
- ✅ Complexidade desnecessária foi evitada?
- ✅ Sobre-engenharia foi evitada no módulo?

**Keep It Simple, Stupid (KISS):**
- ✅ Soluções são simples e diretas ao ponto?
- ✅ Complexidade acidental foi minimizada?
- ✅ Fluxos operacionais são intuitivos e diretos?

### FASE 4: ANÁLISE DE CONFORMIDADE LEGAL (10 minutos)

#### ⚖️ ADERÊNCIA À LEGISLAÇÃO:

**Lei Municipal 7.205/2021:**
- ✅ Todas as modalidades de benefícios previstas estão contempladas?
- ✅ Valores estabelecidos na lei são respeitados?
- ✅ Prazos legais são controlados automaticamente?
- ✅ Critérios de elegibilidade estão implementados corretamente?

**Decreto Municipal 12.346/2021:**
- ✅ Regulamentações específicas estão seguidas?
- ✅ Timeline obrigatória do Aluguel Social está implementada?
- ✅ Monitoramento mensal obrigatório está funcional?
- ✅ Documentação obrigatória está sendo gerada?

**Determinações Judiciais:**
- ✅ Sistema trata casos judiciais com prioridade absoluta?
- ✅ Prazos diferenciados para casos judiciais estão implementados?
- ✅ Documentação de determinações judiciais está adequada?
- ✅ Relatórios específicos para acompanhamento judicial existem?

### FASE 5: COMPILAÇÃO DO RELATÓRIO (5 minutos)

## 📋 ESTRUTURA OBRIGATÓRIA DOS ENTREGÁVEIS

Você deve produzir **EXATAMENTE 3 DOCUMENTOS** como resultado desta auditoria:

### 1. RELATÓRIO FINAL DE AUDITORIA
**Estrutura obrigatória:**
- Resumo Executivo com status final
- Análise detalhada por benefício
- Avaliação de princípios arquiteturais
- Gaps críticos, importantes e menores
- Riscos identificados e mitigações
- Pontos fortes e oportunidades
- Recomendações prioritárias
- Conclusão com parecer técnico

### 2. PLANO DE AÇÃO DETALHADO
**Estrutura obrigatória:**
- Objetivos e metas de correção
- Fases de implementação
- Cronograma detalhado
- Recursos necessários
- Responsabilidades definidas
- Critérios de aceite por fase
- Marcos de controle
- Plano de riscos e contingências

### 3. CHECKLIST DE TAREFAS POR FASE
**Estrutura obrigatória:**
- Fase 1: Correções críticas
- Fase 2: Melhorias importantes
- Fase 3: Otimizações menores
- Tarefas específicas por benefício
- Critérios de conclusão
- Dependências entre tarefas
- Estimativas de esforço
- Responsáveis por tarefa

## ⏰ CRONOGRAMA DE EXECUÇÃO

### Timeline Total: 65 minutos
- **00:00-15:00** → Análise conceitual detalhada dos benefícios
- **15:00-30:00** → Verificação de fluxos operacionais
- **30:00-50:00** → Auditoria de princípios arquiteturais
- **50:00-60:00** → Análise de conformidade legal
- **60:00-65:00** → Compilação dos três documentos finais

## 🎯 CRITÉRIOS DE QUALIDADE DA AUDITORIA

### RIGOR TÉCNICO:
- ✅ Cada aspecto funcional deve ser verificado individualmente
- ✅ Princípios arquiteturais devem ser avaliados criteriosamente
- ✅ Gaps devem ser classificados por impacto e urgência
- ✅ Recomendações devem ser específicas e acionáveis

### COMPLETUDE:
- ✅ Todos os benefícios do MVP devem ser auditados
- ✅ Todas as regras de negócio devem ser verificadas
- ✅ Todos os princípios SOLID devem ser avaliados
- ✅ Conformidade legal deve ser 100% verificada

### OBJETIVIDADE:
- ✅ Relatórios devem ser claros e diretos
- ✅ Plano de ação deve ser executável
- ✅ Checklist deve ser prático e mensurável
- ✅ Prazos devem ser realistas e justificados

---

**EXECUTE AGORA A AUDITORIA FUNCIONAL RIGOROSA E PRODUZA OS 3 DOCUMENTOS OBRIGATÓRIOS.**