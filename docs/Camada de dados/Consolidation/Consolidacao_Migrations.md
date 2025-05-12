# Análise e Plano de Consolidação das Migrations - Sistema SEMTAS

## 1. Diagnóstico Inicial

### 1.1 Estado Atual das Migrations

Após análise das migrations existentes, identificamos o seguinte cenário:

- **Estrutura Base (1710282000000)**: Criação das tabelas fundamentais do sistema (usuário, unidade, setor)
- **Estrutura de Cidadão (1710282000001)**: Criação das tabelas relacionadas aos cidadãos e seus dados
- **Estrutura de Benefício (1710282000002)**: Criação das tabelas de tipos de benefícios e requisitos
- **Estrutura de Solicitação (1710282000003)**: Criação das tabelas de solicitações e processos
- **Índices (1710282000004)**: Adição de índices para otimização de consultas
- **Particionamento (1710282000005)**: Implementação de particionamento de tabelas
- **Views e Triggers (1710282000006)**: Criação de views e triggers para funcionalidades específicas
- **Otimizações PostgreSQL (1710282000007)**: Implementação de otimizações específicas do PostgreSQL
- **Atualizações Pontuais (1710282000008 a 1710282000013)**: Diversas alterações menores em tabelas existentes

### 1.2 Problemas Identificados

1. **Migrations Reativas**: Várias migrations (1710282000010 a 1710282000013) foram criadas para adaptar o banco às seeds, invertendo o fluxo correto de desenvolvimento

2. **Inconsistências Estruturais**:
   - Migration 1710282000011 (AddSiglaToSetor) atualiza dados sem criar a coluna
   - Migration 1710282000013 (AddTipoToUnidade) cria duas colunas redundantes (tipo e tipo_unidade)

3. **Falta de Padronização**:
   - Algumas migrations focam em estrutura, outras em dados
   - Nomenclatura inconsistente entre migrations e entidades

4. **Otimizações Prematuras**:
   - Particionamento e otimizações avançadas implementadas antes da estabilização do modelo

## 2. Análise de Gaps

### 2.1 Discrepâncias entre Planejado e Implementado

| Aspecto | Planejado | Implementado | Gap |
|---------|-----------|--------------|-----|
| Estrutura de Unidade | Incluir tipo e sigla desde o início | Adicionados posteriormente | Migrations adicionais necessárias |
| Estrutura de Setor | Incluir status e sigla desde o início | Adicionados posteriormente | Migrations adicionais necessárias |
| Enums | Definição completa inicial | Atualizações posteriores (tipo_moradia) | Migrations de atualização |
| Particionamento | Após estabilização do modelo | Implementado prematuramente | Possível retrabalho |

### 2.2 Impacto no Desenvolvimento

- **Complexidade Aumentada**: Múltiplas migrations pequenas dificultam o entendimento do modelo
- **Manutenção Difícil**: Alterações futuras precisam considerar várias migrations dispersas
- **Risco de Inconsistência**: Migrations reativas podem introduzir inconsistências no modelo

## 3. Plano de Consolidação

### 3.1 Abordagem Proposta

Propomos uma consolidação em duas etapas:

1. **Fase 1: Consolidação Lógica** - Agrupar migrations por contexto sem alterar a estrutura física
2. **Fase 2: Refatoração Física** - Criar novas migrations consolidadas e substituir as existentes

### 3.2 Estrutura Consolidada Proposta

```
1000000-CreateBaseStructure.ts         // Estrutura base (usuários, unidades, setores) completa
1000001-CreateCidadaoStructure.ts      // Estrutura de cidadãos completa
1000002-CreateBeneficioStructure.ts    // Estrutura de benefícios completa
1000003-CreateSolicitacaoStructure.ts  // Estrutura de solicitações completa
1000004-CreateDemandaMotivos.ts        // Estrutura de motivos de demanda
1000005-CreateIndicesEConstraints.ts   // Todos os índices e constraints
1000006-CreateViewsAndTriggers.ts      // Views e triggers
1000007-AddPostgresOptimizations.ts    // Otimizações específicas do PostgreSQL
```

### 3.3 Mapeamento de Consolidação

| Migration Original | Nova Migration | Observações |
|--------------------|---------------|-------------|
| 1710282000000 | 1000000 | Incluir colunas de status e sigla em setor |
| 1710282000010, 1710282000011 | 1000000 | Consolidar em CreateBaseStructure |
| 1710282000012, 1710282000013 | 1000000 | Consolidar em CreateBaseStructure |
| 1710282000001 | 1000001 | Manter como está |
| 1710282000002 | 1000002 | Manter como está |
| 1710282000003 | 1000003 | Manter como está |
| 1710282000009 | 1000004 | Manter como está |
| 1710282000004 | 1000005 | Consolidar todos os índices |
| 1710282000006 | 1000006 | Manter como está |
| 1710282000005, 1710282000007 | 1000007 | Consolidar otimizações |
| 1710282000008 | 1000001 | Incorporar na estrutura de cidadão |

## 4. Plano de Implementação

### 4.1 Fase 1: Preparação (1 dia)

- Criar backup completo do banco de dados
- Documentar estado atual detalhado (script SQL completo)
- Preparar ambiente de teste isolado

### 4.2 Fase 2: Implementação da Consolidação Lógica (2 dias)

1. **Dia 1**: Consolidar estruturas base
   - Criar nova migration consolidada para estrutura base
   - Incluir todas as colunas adicionadas posteriormente
   - Testar criação e rollback

2. **Dia 2**: Consolidar estruturas de negócio
   - Consolidar estruturas de cidadão, benefício e solicitação
   - Incorporar atualizações de enums
   - Testar criação e rollback

### 4.3 Fase 3: Implementação da Consolidação Física (2 dias)

1. **Dia 1**: Implementar novas migrations
   - Criar script para gerar novas migrations
   - Implementar migrations consolidadas
   - Validar estrutura resultante

2. **Dia 2**: Substituir migrations existentes
   - Atualizar referências no código
   - Implementar em ambiente de teste
   - Validar funcionamento completo

### 4.4 Fase 4: Validação e Documentação (1 dia)

- Executar testes completos de sistema
- Documentar nova estrutura de migrations
- Atualizar documentação técnica

## 5. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|------------|
| Perda de dados | Baixa | Alto | Backups completos antes de cada fase |
| Inconsistência no modelo | Média | Alto | Testes extensivos após cada consolidação |
| Impacto em desenvolvimento | Alta | Médio | Comunicação clara e janela de implementação |
| Falha em seeds | Média | Médio | Testar seeds com novo modelo antes da implementação |

## 6. Critérios de Sucesso

- ✅ Todas as migrations consolidadas funcionam corretamente
- ✅ Método down() de cada migration reverte corretamente as alterações
- ✅ Seeds executam sem erros no modelo consolidado
- ✅ Nenhuma perda de funcionalidade ou dados
- ✅ Documentação atualizada e completa

## 7. Próximos Passos

1. Aprovação do plano de consolidação
2. Preparação do ambiente de teste
3. Implementação da Fase 1 (Consolidação Lógica)
4. Validação intermediária
5. Implementação da Fase 2 (Refatoração Física)
6. Validação final e documentação
7. Implementação em produção

---

**Observação**: Este plano foi elaborado com base na análise das migrations existentes e visa criar uma estrutura mais coesa e manutenível, sem perda de funcionalidade ou dados. A abordagem gradual minimiza riscos e permite ajustes durante o processo de consolidação.