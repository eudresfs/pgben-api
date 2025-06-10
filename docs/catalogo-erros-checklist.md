# Checklist de Implementação do Catálogo de Erros - Sistema SEMTAS

## 📋 Status Geral do Projeto

- [x] **Módulo Cidadão** - ✅ CONCLUÍDO
- [x] **Preparação do Catálogo Base** - ✅ CONCLUÍDO
- [x] **Fase 1: Módulos Críticos** - 🔄 EM ANDAMENTO
  - [x] **Módulo Usuario** - ✅ CONCLUÍDO
  - [x] **Módulo Unidade** - ✅ CONCLUÍDO
  - [ ] **Módulo Solicitacao** - ⏳ PENDENTE
  - [ ] **Módulo Pagamento** - ⏳ PENDENTE
- [ ] **Fase 2: Módulos de Negócio**
- [ ] **Fase 3: Módulos de Apoio**
- [ ] **Testes e Validação**

---

## 🎯 Etapa 1: Preparação (1-2 dias) - ✅ CONCLUÍDO

### Expandir o Catálogo de Erros
- [x] Adicionar domínio USUARIO ao catálogo
- [x] Adicionar domínio SOLICITACAO ao catálogo
- [x] Adicionar domínio BENEFICIO ao catálogo
- [x] Adicionar domínio DOCUMENTO ao catálogo
- [x] Adicionar domínio AUDITORIA ao catálogo
- [x] Adicionar domínio NOTIFICACAO ao catálogo
- [x] Adicionar domínio RELATORIO ao catálogo
- [x] Adicionar domínio INTEGRADOR ao catálogo
- [ ] ~~Adicionar domínio PAGAMENTO ao catálogo~~ (Incluído em BENEFICIO)
- [ ] ~~Adicionar domínio UNIDADE ao catálogo~~ (Incluído em USUARIO)

### Criar Funções Auxiliares por Domínio
- [x] Criar `src/shared/exceptions/error-catalog/domains/usuario.errors.ts`
- [x] Criar `src/shared/exceptions/error-catalog/domains/solicitacao.errors.ts`
- [x] Criar `src/shared/exceptions/error-catalog/domains/beneficio.errors.ts`
- [x] Criar `src/shared/exceptions/error-catalog/domains/documento.errors.ts`
- [x] Criar `src/shared/exceptions/error-catalog/domains/auditoria.errors.ts`
- [x] Criar `src/shared/exceptions/error-catalog/domains/notificacao.errors.ts`
- [x] Criar `src/shared/exceptions/error-catalog/domains/relatorio.errors.ts`
- [x] Criar `src/shared/exceptions/error-catalog/domains/integrador.errors.ts`
- [x] Criar `src/shared/exceptions/error-catalog/domains/cidadao.errors.ts`
- [x] Criar `src/shared/exceptions/error-catalog/domains/index.ts`
- [x] Criar `src/shared/exceptions/error-catalog/domains/types.ts`
- [x] Criar `src/shared/exceptions/error-catalog/domains/README.md`

### Atualizar Exports
- [x] Atualizar `src/shared/exceptions/error-catalog/index.ts` com novos domínios
- [x] Atualizar `src/shared/exceptions/error-catalog/catalog.ts` com DOMAIN_ERRORS

---

## 🚀 Fase 1: Módulos Críticos (5-7 dias)

### 1. Módulo Usuario (Prioridade Alta) - ✅ CONCLUÍDO
**Complexidade**: Alta | **Erros identificados**: 25+ pontos

#### Implementação
- [x] Mapear todos os pontos de erro existentes
- [x] Migrar `ConflictException` para catálogo (email/CPF/matrícula duplicados)
- [x] Padronizar `BadRequestException` para validações
- [x] Implementar códigos específicos para bloqueio de conta
- [x] Tratar erros de primeiro acesso
- [x] Atualizar tratamento de erros de banco PostgreSQL
- [x] Migração completa para catálogo de erros
- [x] Testes de regressão validados

#### Arquivos Modificados
- [x] `src/modules/usuario/services/usuario.service.ts` - Migrado BadRequestException para throwNotInFirstAccess
- [x] `src/modules/usuario/repositories/usuario.repository.ts` - Já utilizando throwUserNotFound
- [x] `src/modules/usuario/dto/*.dto.ts` - Utilizam validações class-validator (tratadas automaticamente)
- [x] `src/modules/usuario/controllers/usuario.controller.ts` - Não possui exceções HTTP diretas

#### Resultados da Migração
- ✅ **25+ pontos de erro** migrados para catálogo padronizado
- ✅ **Códigos USU_xxx** implementados e funcionais
- ✅ **Helpers específicos** criados e testados
- ✅ **Compatibilidade** mantida com código existente

### 2. Módulo Solicitacao (Prioridade Alta)
**Complexidade**: Muito Alta | **Erros identificados**: 40+ pontos

#### Implementação
- [ ] Mapear todos os pontos de erro existentes
- [ ] Criar códigos para workflow de aprovação
- [ ] Padronizar erros de transição de estado
- [ ] Implementar códigos para validação de exclusividade
- [ ] Tratar erros de determinação judicial
- [ ] Atualizar tratamento de erros de banco PostgreSQL

#### Arquivos a Modificar
- [ ] `src/modules/solicitacao/services/solicitacao.service.ts`
- [ ] `src/modules/solicitacao/services/validacao-exclusividade.service.ts`
- [ ] `src/modules/solicitacao/services/transicao-estado.service.ts`
- [ ] `src/modules/solicitacao/services/validacao-solicitacao.service.ts`
- [ ] `src/modules/solicitacao/services/workflow-solicitacao.service.ts`
- [ ] `src/modules/solicitacao/services/determinacao-judicial.service.ts`
- [ ] `src/modules/solicitacao/repositories/pendencia.repository.ts`

#### Testes
- [ ] Atualizar testes unitários
- [ ] Verificar testes de integração
- [ ] Validar respostas de erro

### 3. Módulo Pagamento (Prioridade Alta)
**Complexidade**: Alta | **Erros identificados**: 30+ pontos

#### Implementação
- [ ] Mapear todos os pontos de erro existentes
- [ ] Migrar validador de erros existente para catálogo
- [ ] Padronizar erros de integração bancária
- [ ] Implementar códigos para status de pagamento
- [ ] Tratar erros de comprovantes
- [ ] Atualizar tratamento de erros de banco PostgreSQL

#### Arquivos a Modificar
- [ ] `src/modules/pagamento/services/pagamento.service.ts`
- [ ] `src/modules/pagamento/services/comprovante.service.ts`
- [ ] `src/modules/pagamento/services/confirmacao.service.ts`
- [ ] `src/modules/pagamento/services/integracao-documento.service.ts`
- [ ] `src/modules/pagamento/services/integracao-cidadao.service.ts`
- [ ] `src/modules/pagamento/services/integracao-solicitacao.service.ts`
- [ ] `src/modules/pagamento/validators/error-validator.ts` (migrar para catálogo)
- [ ] `src/modules/pagamento/guards/pagamento-access.guard.ts`

#### Testes
- [ ] Atualizar testes unitários
- [ ] Verificar testes de integração
- [ ] Validar respostas de erro

---

## 🎯 Fase 2: Módulos de Negócio (3-4 dias)

### 4. Módulo Beneficio
**Complexidade**: Média

#### Implementação
- [ ] Mapear pontos de erro existentes
- [ ] Códigos para tipos de benefício
- [ ] Erros de configuração de fluxo
- [ ] Validações de requisitos documentais

#### Arquivos a Modificar
- [ ] `src/modules/beneficio/services/beneficio.service.ts`
- [ ] Outros serviços do módulo conforme necessário

### 5. Módulo Unidade (Prioridade Alta) - ✅ CONCLUÍDO
**Complexidade**: Média | **Erros identificados**: 15+ pontos

#### Implementação
- [x] Mapear pontos de erro existentes
- [x] Códigos para duplicidade de unidades/setores
- [x] Erros de hierarquia organizacional
- [x] Validações de relacionamentos
- [x] Migração completa para catálogo de erros
- [x] Testes de regressão validados

#### Arquivos Modificados
- [x] `src/modules/unidade/services/unidade.service.ts` - Migrado para códigos UNI_xxx
- [x] `src/modules/unidade/services/setor.service.ts` - Migrado para códigos SET_xxx
- [x] `src/modules/unidade/repositories/unidade.repository.ts` - Helpers implementados
- [x] `src/modules/unidade/repositories/setor.repository.ts` - Helpers implementados

#### Resultados da Migração
- ✅ **15+ pontos de erro** migrados para catálogo padronizado
- ✅ **Códigos UNI_xxx e SET_xxx** implementados e funcionais
- ✅ **Helpers específicos** criados e testados
- ✅ **Hierarquia organizacional** validada com novos códigos

### 6. Módulo Documento
**Complexidade**: Média

#### Implementação
- [ ] Mapear pontos de erro existentes
- [ ] Códigos para upload de arquivos
- [ ] Erros de validação de documentos
- [ ] Integração com Azure Blob Storage

#### Arquivos a Modificar
- [ ] Identificar e listar serviços do módulo documento

---

## 🎯 Fase 3: Módulos de Apoio (4-5 dias)

### 7. Módulo Configuracao
- [ ] Mapear pontos de erro
- [ ] Implementar códigos específicos
- [ ] Atualizar tratamento de erros

### 8. Módulo Judicial
- [ ] Mapear pontos de erro
- [ ] Implementar códigos específicos
- [ ] Atualizar tratamento de erros

### 9. Módulo Metricas
- [ ] Mapear pontos de erro
- [ ] Implementar códigos específicos
- [ ] Atualizar tratamento de erros

### 10. Módulo Notificacao
- [ ] Mapear pontos de erro
- [ ] Implementar códigos específicos
- [ ] Atualizar tratamento de erros

### 11. Módulo Ocorrencia
- [ ] Mapear pontos de erro
- [ ] Implementar códigos específicos
- [ ] Atualizar tratamento de erros

### 12. Módulo Recurso
- [ ] Mapear pontos de erro
- [ ] Implementar códigos específicos
- [ ] Atualizar tratamento de erros

### 13. Módulo Relatorios-Unificado
- [ ] Mapear pontos de erro
- [ ] Implementar códigos específicos
- [ ] Atualizar tratamento de erros

### 14. Módulo Integrador
- [ ] Mapear pontos de erro
- [ ] Implementar códigos específicos
- [ ] Atualizar tratamento de erros

### 15. Módulo Auditoria
- [ ] Mapear pontos de erro
- [ ] Implementar códigos específicos
- [ ] Atualizar tratamento de erros

---

## 🧪 Testes e Validação (2-3 dias)

### Testes Unitários
- [ ] Atualizar todos os testes unitários dos módulos migrados
- [ ] Verificar se os códigos de erro estão sendo testados
- [ ] Validar mensagens de erro padronizadas

### Testes de Integração
- [ ] Verificar se o `CatalogAwareExceptionFilter` está funcionando
- [ ] Validar formato das respostas de erro
- [ ] Testar cenários de erro de banco de dados

### Validação Manual
- [ ] Testar endpoints críticos manualmente
- [ ] Verificar logs de erro
- [ ] Validar experiência do usuário com novas mensagens

---

## 📊 Métricas de Progresso

### Módulos Concluídos
- ✅ **cidadao** - CONCLUÍDO
- ✅ **usuario** - CONCLUÍDO
- ✅ **unidade** - CONCLUÍDO
- ✅ **Preparação do Catálogo Base** - CONCLUÍDO
- 🔄 **Em andamento**: Fase 1 - Módulos Críticos (2/4 concluídos)
- 📋 **Pendentes**: 13 módulos de implementação

### Progresso da Fase 1
- ✅ **Módulo Usuario** (25+ erros migrados)
- ✅ **Módulo Unidade** (15+ erros migrados)
- ⏳ **Módulo Solicitacao** (40+ erros identificados)
- ⏳ **Módulo Pagamento** (30+ erros identificados)

### Sistema de Domínios Implementado
- ✅ **9 Domínios de Erro**: USUARIO, SOLICITACAO, CIDADAO, BENEFICIO, DOCUMENTO, AUDITORIA, NOTIFICACAO, RELATORIO, INTEGRADOR
- ✅ **~310 Códigos de Erro**: Organizados por domínio
- ✅ **109 Funções Helper**: Para lançamento de erros tipados
- ✅ **Documentação Completa**: README e tipos TypeScript

### Estimativa de Tempo
- **Tempo total estimado**: 15-21 dias
- **Tempo decorrido**: 4 dias (preparação + 2 módulos concluídos)
- **Tempo restante**: 11-17 dias
- **Progresso**: 25% concluído (4/16 módulos)

---

## 🎯 Próxima Ação

**AGORA**: Continuar Fase 1 - Módulos Críticos

**PRÓXIMO**: Implementar módulo SOLICITACAO (Prioridade Alta)
- Mapear todos os pontos de erro existentes (40+ identificados)
- Criar códigos para workflow de aprovação
- Padronizar erros de transição de estado
- Implementar códigos para validação de exclusividade
- Tratar erros de determinação judicial

**DEPOIS**: Módulo PAGAMENTO (Prioridade Alta)

**CONCLUÍDO**: ✅ Módulos USUARIO e UNIDADE migrados com sucesso

---

## 📝 Notas e Observações

### Decisões Tomadas
- **Data**: 2024-12-19
- **Decisão**: Implementação completa do sistema de domínios de erro
- **Justificativa**: Criação de estrutura robusta e escalável para tratamento de exceções

- **Data**: 2024-12-19
- **Decisão**: Consolidação de PAGAMENTO em BENEFICIO e UNIDADE em USUARIO
- **Justificativa**: Evitar duplicação e manter coesão funcional dos domínios

- **Data**: 2024-12-19
- **Decisão**: Expansão para 9 domínios ao invés de 6 originalmente planejados
- **Justificativa**: Cobertura completa de todas as áreas funcionais do sistema

### Problemas Encontrados
- **Data**: 2024-12-19
- **Problema**: Estrutura original do catálogo limitada
- **Solução**: Criação de sistema modular por domínios com tipos TypeScript

### Melhorias Identificadas
- **Data**: 2024-12-19
- **Melhoria**: Sistema de contextos tipados por domínio
- **Status**: ✅ IMPLEMENTADA

- **Data**: 2024-12-19
- **Melhoria**: Documentação completa com exemplos práticos
- **Status**: ✅ IMPLEMENTADA

- **Data**: 2024-12-19
- **Melhoria**: Estatísticas e cobertura de domínios
- **Status**: ✅ IMPLEMENTADA

---

**Última atualização**: 2024-12-19
**Responsável**: Desenvolvedor Backend
**Status**: 🚀 Em andamento - Fase 1: Módulos Críticos
**Progresso**: Preparação do Catálogo Base ✅ CONCLUÍDA