


          
# Plano de Ação - Correções do Módulo Cidadão

Com base na revisão rigorosa do módulo cidadão, apresento um plano de ação estruturado para implementar as correções necessárias.

## 🎯 VISÃO GERAL DO PLANO

**Objetivo**: Implementar as funcionalidades ausentes e corrigir não conformidades críticas identificadas na revisão do módulo cidadão.

**Duração Estimada**: 32 horas (4 sprints de 1 semana)

**Priorização**: Baseada no impacto nas regras de negócio e na criticidade operacional.

---

## 📋 SPRINT 1 - ENDPOINTS DE DADOS SOCIAIS (Prioridade CRÍTICA)

### 🎯 Objetivo
Implementar CRUD completo e independente para dados sociais dos cidadãos.

### 📝 Tarefas

#### 1.1 Criar Controller de Dados Sociais (3h)
```typescript
// Arquivo: src/modules/cidadao/controllers/dados-sociais.controller.ts
```

**Endpoints a implementar**:
- `POST /v1/cidadao/{id}/dados-sociais` - Criar dados sociais
- `GET /v1/cidadao/{id}/dados-sociais` - Buscar dados sociais
- `PUT /v1/cidadao/{id}/dados-sociais` - Atualizar dados sociais
- `DELETE /v1/cidadao/{id}/dados-sociais` - Remover dados sociais

**Validações necessárias**:
- Verificar se cidadão existe
- Validar unicidade (um cidadão = um registro de dados sociais)
- Validar campos obrigatórios conforme regras de negócio
- Calcular renda per capita automaticamente

#### 1.2 Criar Service de Dados Sociais (3h)
```typescript
// Arquivo: src/modules/cidadao/services/dados-sociais.service.ts
```

**Funcionalidades**:
- CRUD completo com validações
- Cálculos automáticos (renda per capita)
- Integração com auditoria
- Cache para consultas frequentes

#### 1.3 Criar DTOs Específicos (1h)
```typescript
// Arquivos:
// - src/modules/cidadao/dto/create-dados-sociais.dto.ts
// - src/modules/cidadao/dto/update-dados-sociais.dto.ts
// - src/modules/cidadao/dto/dados-sociais-response.dto.ts
```

#### 1.4 Implementar Testes (1h)
- Testes unitários do service
- Testes de integração do controller
- Cenários de validação e erro

**Entregáveis**:
- ✅ Controller funcional com todos os endpoints
- ✅ Service com validações completas
- ✅ DTOs padronizados
- ✅ Testes com cobertura > 80%
- ✅ Documentação Swagger atualizada

---

## 📋 SPRINT 2 - CRUD COMPLETO COMPOSIÇÃO FAMILIAR (Prioridade CRÍTICA)

### 🎯 Objetivo
Completar funcionalidades ausentes para gerenciamento individual de membros da composição familiar.

### 📝 Tarefas

#### 2.1 Implementar Edição de Membros (2h)
```typescript
// Endpoint: PUT /v1/cidadao/{id}/composicao-familiar/{membro_id}
```

**Funcionalidades**:
- Editar dados específicos de um membro
- Revalidar conflitos de CPF/NIS
- Manter histórico de alterações
- Validar integridade referencial

#### 2.2 Implementar Remoção de Membros (2h)
```typescript
// Endpoint: DELETE /v1/cidadao/{id}/composicao-familiar/{membro_id}
```

**Funcionalidades**:
- Soft delete do membro
- Verificar dependências antes da remoção
- Atualizar cálculos de renda familiar
- Registrar auditoria da operação

#### 2.3 Melhorar Validações Existentes (1h)
- Validações de parentesco mais rigorosas
- Controle de duplicidade por CPF/NIS
- Validações de idade vs parentesco

#### 2.4 Implementar Testes (1h)
- Cenários de edição e remoção
- Validações de integridade
- Testes de conflitos

**Entregáveis**:
- ✅ Endpoints de edição e remoção funcionais
- ✅ Validações rigorosas implementadas
- ✅ Testes de cobertura completa
- ✅ Auditoria de todas as operações

---

## 📋 SPRINT 3 - ENDPOINT DE CONSULTA DE CONFLITOS (Prioridade MÉDIA)

### 🎯 Objetivo
Implementar endpoint direto para consulta de conflitos por CPF.

### 📝 Tarefas

#### 3.1 Implementar Endpoint de Conflitos (2h)
```typescript
// Endpoint: GET /v1/cidadao/conflitos/{cpf}
```

**Funcionalidades**:
- Consulta direta por CPF
- Retorno detalhado de conflitos
- Performance otimizada
- Cache de resultados

#### 3.2 Melhorar Service de Verificação (1h)
- Otimizar consultas de conflitos
- Padronizar retornos
- Implementar cache Redis

#### 3.3 Implementar Testes (1h)
- Cenários de conflitos diversos
- Performance tests
- Cache validation

**Entregáveis**:
- ✅ Endpoint de consulta funcional
- ✅ Performance otimizada
- ✅ Cache implementado
- ✅ Documentação atualizada

---

## 📋 SPRINT 4 - PADRONIZAÇÃO E OTIMIZAÇÕES (Prioridade BAIXA)

### 🎯 Objetivo
Padronizar respostas e implementar otimizações de performance.

### 📝 Tarefas

#### 4.1 Padronizar DTOs de Response (3h)
- Unificar estruturas de resposta
- Padronizar mensagens de erro
- Implementar response interceptors

#### 4.2 Otimizações de Performance (3h)
- Implementar cache Redis
- Otimizar queries com índices
- Implementar lazy loading

#### 4.3 Melhorias de Validação (2h)
- Validações de formato PIX específicas
- Validações de parentesco rigorosas
- Sanitização avançada de inputs

**Entregáveis**:
- ✅ Respostas padronizadas
- ✅ Performance otimizada
- ✅ Validações aprimoradas
- ✅ Cache implementado

---

## 🛠️ DETALHAMENTO TÉCNICO

### Arquivos a Criar/Modificar

#### Novos Arquivos
```
src/modules/cidadao/controllers/dados-sociais.controller.ts
src/modules/cidadao/services/dados-sociais.service.ts
src/modules/cidadao/dto/create-dados-sociais.dto.ts
src/modules/cidadao/dto/update-dados-sociais.dto.ts
src/modules/cidadao/dto/dados-sociais-response.dto.ts
src/modules/cidadao/tests/dados-sociais.controller.spec.ts
src/modules/cidadao/tests/dados-sociais.service.spec.ts
```

#### Arquivos a Modificar
```
src/modules/cidadao/controllers/cidadao.controller.ts
src/modules/cidadao/services/cidadao.service.ts
src/modules/cidadao/controllers/papel-conflito.controller.ts
src/modules/cidadao/cidadao.module.ts
```

### Dependências Necessárias
- Cache Redis (já configurado)
- Class-validator para validações
- TypeORM para queries otimizadas

### Configurações de Banco
- Índices adicionais para performance
- Constraints de integridade
- Triggers para auditoria automática

---

## 📊 CRONOGRAMA DE EXECUÇÃO

| Sprint | Duração | Início | Fim | Entregáveis |
|--------|---------|--------|-----|-------------|
| Sprint 1 | 8h | Semana 1 | Semana 1 | CRUD Dados Sociais |
| Sprint 2 | 6h | Semana 2 | Semana 2 | CRUD Composição Familiar |
| Sprint 3 | 4h | Semana 3 | Semana 3 | Endpoint Conflitos |
| Sprint 4 | 8h | Semana 4 | Semana 4 | Padronização |

---

## ✅ CRITÉRIOS DE ACEITAÇÃO

### Sprint 1 - Dados Sociais
- [ ] Todos os endpoints CRUD funcionais
- [ ] Validações de negócio implementadas
- [ ] Testes com cobertura > 80%
- [ ] Documentação Swagger completa
- [ ] Auditoria de todas as operações

### Sprint 2 - Composição Familiar
- [ ] Edição de membros funcionando
- [ ] Remoção de membros funcionando
- [ ] Validações de conflitos ativas
- [ ] Integridade referencial mantida
- [ ] Histórico de alterações registrado

### Sprint 3 - Consulta Conflitos
- [ ] Endpoint GET /conflitos/{cpf} funcional
- [ ] Performance < 200ms
- [ ] Cache implementado
- [ ] Retornos padronizados

### Sprint 4 - Padronização
- [ ] DTOs unificados
- [ ] Mensagens de erro padronizadas
- [ ] Performance geral otimizada
- [ ] Cache Redis configurado

---

## 🚨 RISCOS E MITIGAÇÕES

### Riscos Identificados
1. **Impacto em funcionalidades existentes**
   - *Mitigação*: Testes de regressão completos

2. **Performance degradada**
   - *Mitigação*: Implementar cache e otimizar queries

3. **Conflitos de merge**
   - *Mitigação*: Branches isoladas por sprint

4. **Quebra de integridade de dados**
   - *Mitigação*: Transações atômicas e rollback

---

## 📈 MÉTRICAS DE SUCESSO

- **Cobertura de Testes**: > 80%
- **Performance**: < 200ms para consultas
- **Disponibilidade**: 99.9%
- **Conformidade**: 100% dos requisitos atendidos
- **Qualidade**: 0 bugs críticos em produção

---

## 🎯 PRÓXIMOS PASSOS

1. **Aprovação do Plano**: Validar cronograma e recursos
2. **Setup do Ambiente**: Configurar branches e ambiente de desenvolvimento
3. **Início Sprint 1**: Implementar CRUD de dados sociais
4. **Reviews Contínuas**: Code review a cada entrega
5. **Deploy Gradual**: Deploy incremental por sprint

---

**Status**: 🟡 Aguardando Aprovação
**Responsável**: Equipe Backend
**Revisão**: Semanal após cada sprint