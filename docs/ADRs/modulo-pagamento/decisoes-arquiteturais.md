# Architecture Decision Record (ADR): Módulo de Pagamento/Liberação

## 1. Título
Arquitetura e Design do Módulo de Pagamento/Liberação para o PGBen

## 2. Status
Proposto

## 3. Data
18/05/2025

## 4. Contexto
O Módulo de Pagamento/Liberação é responsável por gerenciar a etapa final do fluxo de concessão de benefícios no sistema PGBen, controlando a liberação efetiva dos recursos para os beneficiários. Este módulo precisa lidar com dados financeiros sensíveis, manter trilhas de auditoria completas, garantir integração com outros módulos do sistema e fornecer segurança robusta para todas as operações.

É necessário definir a arquitetura deste módulo considerando:
- Segurança de dados financeiros e bancários
- Rastreabilidade completa de operações
- Fluxo de confirmação de pagamentos
- Gestão de documentos comprovativos
- Validações rigorosas de dados sensíveis
- Integração com outros módulos do sistema

## 5. Decisões

### 5.1. Arquitetura em Camadas
**Decisão**: Adotar uma arquitetura em camadas clara e bem definida, seguindo os princípios do Domain-Driven Design.

**Estrutura**:
- **Controllers**: Camada de API RESTful responsável apenas pela interação HTTP
- **Services**: Camada de lógica de negócio que implementa as regras e fluxos do domínio
- **Repositories**: Camada de acesso a dados com operações CRUD e queries específicas
- **Entities**: Camada de definição do modelo de dados e relacionamentos
- **DTOs**: Objetos de transferência de dados para request/response
- **Validators**: Validadores específicos para dados financeiros e sensíveis

**Justificativa**:
- Esta estrutura promove separação clara de responsabilidades
- Facilita a manutenção e testabilidade dos componentes
- Permite melhor isolamento da lógica de negócio da infraestrutura
- Alinha-se com os padrões arquiteturais já utilizados no restante do sistema

### 5.2. Modelo de Dados e Relacionamentos
**Decisão**: Implementar um modelo de dados que garanta rastreabilidade e segurança para informações financeiras.

**Estrutura**:
- Entidade `Pagamento` como entidade principal, com relacionamentos para:
  - `Solicitacao` (existente): Relacionamento muitos-para-um
  - `InfoBancaria` (existente): Relacionamento muitos-para-um
  - `Usuario` (existente): Relacionamento com usuário que liberou o pagamento
- Entidade `ComprovantePagamento` como child entity de Pagamento
- Entidade `ConfirmacaoRecebimento` como child entity de Pagamento

**Justificativa**:
- Reforça a consistência referencial no banco de dados
- Evita duplicação de dados bancários (já existentes na entidade InfoBancaria)
- Permite implementação de soft delete para manter histórico completo
- Facilita aplicação de políticas RLS (Row-Level Security) por entidade

### 5.3. Gestão de Estados e Transições
**Decisão**: Implementar um sistema de máquina de estados para controlar as transições de status dos pagamentos.

**Fluxo de Status**:
1. `agendado` → `liberado` → `confirmado` (fluxo principal)
2. `agendado` → `cancelado` (caminho alternativo)
3. `liberado` → `cancelado` (caminho alternativo, com restrições)

**Implementação**:
- Utilizar enum TypeScript para definir os status permitidos
- Implementar validador específico para transições de status
- Registrar histórico completo de mudanças de status com timestamp e usuário
- Utilizar decorators para validação em nível de DTO

**Justificativa**:
- Garante consistência no fluxo de pagamentos
- Previne transições inválidas de status
- Mantém rastreabilidade completa de mudanças de status
- Facilita implementação de regras de negócio específicas por status

### 5.4. Validação de Dados Sensíveis
**Decisão**: Implementar validadores específicos e robustos para dados financeiros e bancários.

**Abordagem**:
- Criar validadores customizados para PIX e dados bancários
- Utilizar bibliotecas especializadas para validação de CPF, email, telefone, etc.
- Implementar validadores que verificam a consistência entre método de pagamento e dados fornecidos
- Validar limites de valores por tipo de benefício

**Justificativa**:
- Aumenta a segurança das operações financeiras
- Previne erros de digitação ou dados malformatados
- Reduz o risco de fraudes ou pagamentos incorretos
- Facilita manutenção centralizada das regras de validação

### 5.5. Segurança e Auditoria
**Decisão**: Implementar múltiplas camadas de segurança e rastreabilidade.

**Estratégia**:
- Utilizar o módulo de Auditoria existente para registrar todas as operações sensíveis
- Implementar mascaramento de dados bancários e PIX em logs e respostas
- Aplicar políticas RLS (Row-Level Security) em nível de banco de dados
- Implementar controle de acesso granular baseado em perfis e unidades
- Armazenar IPs e fingerprints para operações críticas

**Justificativa**:
- Atende requisitos de compliance e LGPD
- Permite rastreabilidade completa para fins de auditoria
- Protege dados sensíveis mesmo em caso de logs expostos
- Limita acesso aos dados apenas a usuários autorizados

### 5.6. Upload e Gestão de Comprovantes
**Decisão**: Utilizar o módulo de Documento existente com validações adicionais para comprovantes de pagamento.

**Implementação**:
- Integrar com DocumentoModule para armazenamento físico dos arquivos
- Adicionar validações específicas para comprovantes:
  - Verificação de MIME type real (não apenas extensão)
  - Validação de tamanho máximo (5MB)
  - Sanitização de nomes de arquivo
- Armazenar metadados de comprovantes na entidade ComprovantePagamento
- Implementar controle de acesso específico para visualização de comprovantes

**Justificativa**:
- Reusa infraestrutura existente para armazenamento de documentos
- Adiciona camadas extras de segurança para uploads
- Mantém metadados específicos no contexto do pagamento
- Previne uploads maliciosos ou arquivos corrompidos

### 5.7. Integração com Outros Módulos
**Decisão**: Utilizar padrão de serviços injetáveis para integração com outros módulos.

**Módulos Integrados**:
- SolicitacaoModule: Para acesso e atualização de solicitações
- UsuarioModule: Para validação de permissões e identificação
- CidadaoModule: Para acesso a informações do beneficiário
- DocumentoModule: Para armazenamento de comprovantes
- AuditoriaModule: Para registro de eventos sensíveis

**Implementação**:
- Injetar serviços necessários via Dependency Injection
- Utilizar interfaces para definir contratos claros entre módulos
- Implementar transações distribuídas para operações que afetam múltiplos módulos

**Justificativa**:
- Reduz acoplamento entre módulos
- Facilita testes com mocks
- Mantém coesão dentro de cada módulo
- Previne duplicação de código
- Permite substituição de implementações no futuro

### 5.8. Estratégia de Testes
**Decisão**: Implementar múltiplos níveis de testes para garantir qualidade e segurança.

**Abordagem**:
- Testes unitários para validadores e lógica de negócio isolada
- Testes de integração para fluxos completos dentro do módulo
- Testes end-to-end para fluxos críticos envolvendo múltiplos módulos
- Testes de segurança específicos para proteção de dados sensíveis

**Ferramentas**:
- Jest para testes unitários e integração
- Supertest para testes de API
- Test containers para testes com banco de dados real

**Justificativa**:
- Garante robustez do código para operações financeiras críticas
- Detecta problemas de integração precocemente
- Previne regressões em funcionalidades sensíveis
- Valida segurança e comportamento correto do sistema

## 6. Alternativas Consideradas

### 6.1. Modelo de Dados Desnormalizado
**Alternativa**: Armazenar cópias dos dados bancários no momento do pagamento para snapshot histórico.

**Vantagens**:
- Preserva informação histórica mesmo se dados originais mudarem
- Pode simplificar consultas históricas

**Desvantagens**:
- Duplicação de dados sensíveis
- Aumento da superfície de ataque para dados financeiros
- Maior complexidade para manter consistência

**Decisão**: Rejeitada em favor de referências à entidade InfoBancaria existente, com auditoria completa de mudanças.

### 6.2. Arquitetura Baseada em Eventos
**Alternativa**: Implementar um sistema baseado em eventos para gerenciar mudanças de status e pagamentos.

**Vantagens**:
- Melhor desacoplamento entre componentes
- Escalabilidade horizontal facilitada
- Processamento assíncrono natural

**Desvantagens**:
- Maior complexidade na implementação inicial
- Curva de aprendizado para a equipe
- Sobrecarga para operações simples

**Decisão**: Parcialmente adotada. Para notificações de mudança de status, mas mantendo o core do módulo com chamadas síncronas para melhor garantia de consistência imediata em operações financeiras.

### 6.3. Implementação de Microserviço Dedicado
**Alternativa**: Extrair o módulo de pagamentos como um microserviço completamente separado.

**Vantagens**:
- Isolamento completo de responsabilidade
- Possibilidade de escala e deploy independentes
- Melhor encapsulamento de dados sensíveis

**Desvantagens**:
- Sobrecarga de comunicação entre serviços
- Complexidade de transações distribuídas
- Duplicação de código de domínio compartilhado

**Decisão**: Rejeitada no momento, mantendo como módulo dentro do monolito atual para garantir transações ACID e simplificar desenvolvimento inicial. Arquitetura permite extração futura como microserviço se necessário.

## 7. Consequências

### 7.1. Benefícios
- **Segurança Robusta**: Múltiplas camadas de proteção para dados financeiros sensíveis
- **Rastreabilidade Completa**: Trilha de auditoria para todas as operações financeiras
- **Manutenibilidade**: Separação clara de responsabilidades facilita evolução
- **Consistência**: Fluxos de estado bem definidos garantem integridade dos dados
- **Reutilização**: Integração com módulos existentes evita duplicação

### 7.2. Desafios
- **Complexidade de Validações**: Necessidade de validadores robustos para dados financeiros
- **Integração com Múltiplos Módulos**: Dependências que precisam ser gerenciadas cuidadosamente
- **Balanceamento entre Segurança e Usabilidade**: Controles rigorosos vs. experiência do usuário
- **Testes Abrangentes**: Necessidade de testes em múltiplos níveis para garantir funcionamento correto

## 8. Estratégia de Implementação
1. Implementar modelo de dados e migrações
2. Desenvolver validadores especializados para dados sensíveis
3. Implementar serviços core com regras de negócio
4. Implementar controllers e endpoints de API
5. Adicionar integrações com outros módulos
6. Implementar testes unitários e de integração
7. Documentar API e componentes

## 9. Métricas de Sucesso
- Cobertura de testes superior a 80%
- Zero vulnerabilidades de segurança de alto impacto
- Tempo de resposta dos endpoints abaixo de 300ms para operações de leitura
- Transações concluídas com sucesso em pelo menos 99% dos casos
- Auditoria completa para 100% das operações sensíveis

---

## 10. Aprovação

| Nome | Papel | Data | Assinatura |
|------|-------|------|-----------|
| __________ | Arquiteto de Software | __/__/____ | __________ |
| __________ | Tech Lead | __/__/____ | __________ |
| __________ | Especialista em Segurança | __/__/____ | __________ |
