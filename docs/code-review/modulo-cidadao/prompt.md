## 🎯 OBJETIVO

Revisar rigorosamente o módulo de cidadão para garantir conformidade com as regras de negócio críticas, completude funcional e integridade dos CRUDs. Foco em **exclusividade de papéis** e **consistência de dados**.

---

## 🔍 VERIFICAÇÕES OBRIGATÓRIAS

### 1. ENDPOINTS DE CRIAÇÃO E EDIÇÃO PRINCIPAL

#### Endpoint: POST /cidadao (Criar Cidadão)
- [ ] **Inclui composição familiar completa?**
- [ ] **Inclui atribuição de papel (beneficiário/membro)?**
- [ ] **Inclui dados sociais completos?**
- [ ] **Inclui informações bancárias (PIX)?**
- [ ] **Inclui vinculação com unidade solicitante?**
- [ ] **Valida exclusividade de papéis na criação?**

#### Endpoint: PUT /cidadao/{id} (Editar Cidadão)
- [ ] **Permite edição de composição familiar?**
- [ ] **Permite alteração de papel?**
- [ ] **Permite edição de dados sociais?**
- [ ] **Permite edição de info bancária?**
- [ ] **Permite alteração de unidade?**
- [ ] **Revalida exclusividade de papéis na edição?**

### 2. ENDPOINTS ESPECÍFICOS PARA COMPOSIÇÃO FAMILIAR

#### Endpoint: POST /cidadao/{id}/composicao-familiar
- [ ] **Existe endpoint independente para adicionar membro?**
- [ ] **Valida se CPF do novo membro já é beneficiário ativo?**
- [ ] **Valida se NIS do novo membro já é beneficiário ativo?**
- [ ] **Bloqueia inclusão se membro tem papel de beneficiário?**
- [ ] **Retorna erro claro em caso de conflito?**

#### Endpoint: PUT /cidadao/{id}/composicao-familiar/{membro_id}
- [ ] **Permite edição de membros da composição?**
- [ ] **Revalida conflitos ao editar CPF/NIS?**

#### Endpoint: DELETE /cidadao/{id}/composicao-familiar/{membro_id}
- [ ] **Permite remoção de membros?**
- [ ] **Remove referências adequadamente?**

### 3. ENDPOINTS PARA DADOS SOCIAIS

#### Endpoint: POST/PUT /cidadao/{id}/dados-sociais
- [ ] **Existe endpoint independente para dados sociais?**
- [ ] **Permite criação isolada de dados sociais?**
- [ ] **Permite edição isolada de dados sociais?**
- [ ] **Valida integridade dos dados sociais?**
- [ ] **Mantém histórico de alterações?**

### 4. ENDPOINTS PARA GESTÃO DE PAPÉIS

#### Endpoint: POST /cidadao/{id}/papel
- [ ] **Existe endpoint independente para adicionar papel?**
- [ ] **Valida se papel já está atribuído?**
- [ ] **Retorna papel existente se já atribuído?**
- [ ] **CRÍTICO: Valida se cidadão está em composição familiar antes de atribuir papel beneficiário?**
- [ ] **Bloqueia atribuição de beneficiário se for membro de composição?**
- [ ] **Remove da composição familiar ao atribuir papel beneficiário?**

#### Endpoint: PUT /cidadao/{id}/papel/{papel_id}
- [ ] **Permite alteração de papéis?**
- [ ] **Revalida exclusividade na alteração?**

#### Endpoint: DELETE /cidadao/{id}/papel/{papel_id}
- [ ] **Permite remoção de papéis?**
- [ ] **Valida dependências antes de remover?**

### 5. VALIDAÇÕES CRÍTICAS DE EXCLUSIVIDADE

#### Controle de Conflitos
- [ ] **Sistema verifica conflito CPF beneficiário vs composição familiar?**
- [ ] **Sistema verifica conflito NIS beneficiário vs composição familiar?**
- [ ] **Validação é executada em TODOS os pontos de entrada?**
- [ ] **Erro é claro e específico sobre o conflito?**
- [ ] **Existe endpoint para consultar conflitos: GET /cidadao/conflitos/{cpf}?**

#### Conversão de Papéis
- [ ] **Existe funcionalidade para converter membro em beneficiário?**
- [ ] **Conversão remove da composição familiar automaticamente?**
- [ ] **Conversão mantém histórico da mudança?**
- [ ] **Notifica outros módulos sobre a conversão?**

---

## 📋 REVISÃO COMPLETA DOS CRUDs

### CRUD CIDADÃO PRINCIPAL

#### CREATE (POST /cidadao)
- [ ] **Validações de entrada completas?**
- [ ] **Campos obrigatórios validados?**
- [ ] **CPF único garantido?**
- [ ] **Transação atômica para dados relacionados?**
- [ ] **Retorna ID do cidadão criado?**
- [ ] **Status code correto (201)?**

#### READ (GET /cidadao)
- [ ] **Listagem com paginação?**
- [ ] **Filtros por CPF, NIS, nome funcionais?**
- [ ] **Busca textual implementada?**
- [ ] **Ordenação configurável?**
- [ ] **Performance adequada?**

#### READ (GET /cidadao/{id})
- [ ] **Retorna dados completos do cidadão?**
- [ ] **Inclui composição familiar?**
- [ ] **Inclui dados sociais?**
- [ ] **Inclui info bancária?**
- [ ] **Inclui papéis atribuídos?**
- [ ] **Tratamento de ID inexistente (404)?**

#### UPDATE (PUT /cidadao/{id})
- [ ] **Permite atualização de todos os campos editáveis?**
- [ ] **Revalida constraints críticas?**
- [ ] **Mantém histórico de alterações?**
- [ ] **Transação atômica?**
- [ ] **Retorna dados atualizados?**

#### DELETE (DELETE /cidadao/{id})
- [ ] **Verifica dependências antes de excluir?**
- [ ] **Soft delete ou hard delete consistente?**
- [ ] **Remove relacionamentos adequadamente?**
- [ ] **Retorna status correto (204/409)?**

### CRUD COMPOSIÇÃO FAMILIAR

#### CREATE/UPDATE/DELETE
- [ ] **Operações atômicas?**
- [ ] **Validações de parentesco?**
- [ ] **Controle de duplicidade?**
- [ ] **Manutenção de integridade referencial?**

### CRUD DADOS SOCIAIS

#### CREATE/UPDATE/DELETE
- [ ] **Estrutura normalizada?**
- [ ] **Validações de formato?**
- [ ] **Cálculos automáticos (renda per capita)?**
- [ ] **Preservação de histórico?**

### CRUD PAPÉIS

#### CREATE/UPDATE/DELETE
- [ ] **Controle rigoroso de exclusividade?**
- [ ] **Validações antes de cada operação?**
- [ ] **Log de mudanças de papel?**
- [ ] **Integridade com outros módulos?**

---

## ⚠️ PONTOS CRÍTICOS DE VERIFICAÇÃO

### 1. EXCLUSIVIDADE DE PAPÉIS (NÃO NEGOCIÁVEL)
```
REGRA CRÍTICA:
Um CPF NÃO pode simultaneamente:
- Ser beneficiário principal E
- Estar na composição familiar de outro cidadão

VERIFICAR:
✓ Validação em TODOS os endpoints de criação/edição
✓ Consulta prévia antes de qualquer atribuição
✓ Erro específico e claro em caso de conflito
✓ Endpoint para verificação de conflitos
✓ Conversão automática quando necessário
```

### 2. INTEGRIDADE REFERENCIAL
- [ ] **Foreign keys consistentes?**
- [ ] **Cascata de operações correta?**
- [ ] **Orfandade de registros prevenida?**
- [ ] **Performance das consultas relacionais?**

### 3. TRANSAÇÕES E ATOMICIDADE
- [ ] **Operações críticas são atômicas?**
- [ ] **Rollback em caso de erro?**
- [ ] **Locks adequados para concorrência?**
- [ ] **Deadlock prevention implementado?**

### 4. VALIDAÇÕES E SANITIZAÇÃO
- [ ] **Todos os inputs são validados?**
- [ ] **Sanitização contra injection?**
- [ ] **Validações de formato (CPF, NIS, PIX)?**
- [ ] **Mensagens de erro padronizadas?**

---

## 📊 ESTRUTURA DO RELATÓRIO ESPERADO

Gere um relatório objetivo com:

### ✅ CONFORMIDADES IDENTIFICADAS
- Lista de funcionalidades implementadas corretamente
- Endpoints que atendem aos requisitos
- Validações funcionando adequadamente

### ❌ NÃO CONFORMIDADES CRÍTICAS
- Endpoints ausentes ou incompletos
- Validações de exclusividade faltando
- CRUDs com problemas de integridade

### ⚠️ MELHORIAS NECESSÁRIAS
- Otimizações de performance
- Padronização de retornos
- Melhoria de validações

### 🎯 AÇÕES PRIORITÁRIAS
- Lista priorizada de correções obrigatórias
- Estimativa de esforço para cada correção
- Impacto de cada problema identificado

---

**INSTRUÇÕES FINAIS:**
- Seja objetivo e direto nas verificações
- Foque nos pontos críticos de exclusividade
- Teste mentalmente cada cenário de conflito
- Identifique gaps que possam causar inconsistência
- Priorize problemas que quebram regras de negócio

**Agora revise o módulo de cidadão fornecido usando esta estrutura rigorosa.**