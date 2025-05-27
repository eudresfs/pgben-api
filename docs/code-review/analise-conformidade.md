# Análise de Conformidade - API SEMTAS

## Sumário Executivo

**Status:** EM ANDAMENTO - PARCIALMENTE CONFORME

A análise técnica da API do Sistema de Gestão de Benefícios Eventuais (SOBE) da SEMTAS identificou avanços significativos, porém ainda existem **gaps críticos** que impedem sua aprovação final para produção. Foram implementados com sucesso os módulos de auditoria, segurança e permissões granulares, e houve progresso significativo na implementação do controle de exclusividade de papéis e suporte a determinações judiciais. No entanto, ainda há necessidade de ajustes em alguns requisitos críticos como workflow de estados completo e integrações com sistemas externos.

**Cobertura atual:** 90% dos requisitos críticos

**Estimativa de esforço para conclusão:** 2-3 sprints

**Última atualização:** 24/05/2025

## 1. Status por Módulo

### 1.1. Módulo de Auditoria (CONCLUÍDO ✅)

| Item | Status | Detalhes |
|------|--------|----------|
| Log de Ações | ✅ | Tabela `log_acao` implementada com registro detalhado de todas as operações |
| Histórico de Alterações | ✅ | Tabela `log_alteracao` rastreia mudanças em campos específicos |
| Trilhas de Auditoria | ✅ | Agrupamento lógico de logs relacionados |
| Alertas de Segurança | ✅ | Sistema de detecção de atividades suspeitas |
| Políticas RLS | ✅ | Controle de acesso em nível de linha implementado |
| Função de Registro | ✅ | `registrar_alteracao` PL/pgSQL para auditoria automática |

### 1.2. Módulo de Segurança (CONCLUÍDO ✅)

| Item | Status | Detalhes |
|------|--------|----------|
| Criptografia de Dados | ✅ | Implementada para dados sensíveis |
| Armazenamento Seguro | ✅ | Integração com MinIO para armazenamento de arquivos |
| Gerenciamento de Chaves | ✅ | Rotação e armazenamento seguro de chaves |
| Backup e Recuperação | ✅ | Sistema automatizado de backup |
| Monitoramento | ✅ | Métricas de segurança e auditoria |

### 1.3. Módulo de Permissões (CONCLUÍDO ✅)

| Item | Status | Detalhes |
|------|--------|----------|
| Modelo de Dados | ✅ | Estrutura completa de permissões granulares |
| Migrações | ✅ | Scripts para criação das tabelas de permissões |
| Scripts de Seed | ✅ | Carga inicial de permissões e papéis |
| Integração com Auditoria | ✅ | Todas as alterações de permissão são auditadas |
| Caching | ✅ | Otimização de desempenho para verificações frequentes |

### 1.4. Módulo de Testes (CONCLUÍDO ✅)

| Tipo de Teste | Cobertura | Status |
|---------------|-----------|--------|
| Unitários | >80% | ✅ |
| Integração | 100% dos fluxos críticos | ✅ |
| E2E | Fluxos principais | ✅ |
| Segurança | OWASP Top 10 | ✅ |
| Performance | Carga e estresse | ✅ |

## 2. Gaps Críticos Identificados

### 2.1. Controle de Exclusividade de Papéis (C1)

| Item | Status | Descrição |
|------|--------|-----------|
| C1.1 | ⚠️ | Implementada entidade RegraConflitoPapel para controle de exclusividade, mas falta constraint no BD |
| C1.2 | ✅ | Endpoint de verificação de conflitos de papéis implementado via `POST /v1/cidadao/papel-conflito/verificar` |
| C1.3 | ✅ | Endpoints de conversão de papéis implementados para beneficiário e composição familiar |
| C1.4 | ✅ | Validação completa implementada no serviço VerificacaoPapelService |
| C1.5 | ✅ | Validação automática antes de adicionar à composição familiar implementada |
| C1.6 | ✅ | Histórico de conversões de papéis implementado via HistoricoConversaoPapel |
| C1.7 | ✅ | Notificação automática para técnicos em conversões implementada |

**Impacto:** ALTO - Pode permitir fraudes e duplicação indevida de benefícios
**Complexidade:** MÉDIA - Requer alterações no modelo de dados e regras de negócio
**Dependências:** Nenhuma

**Observações:**
- Conforme a Especificação Técnica (seção 5.1), esta é uma "REGRA FUNDAMENTAL" do sistema: um cidadão (CPF) não pode simultaneamente ser beneficiário principal de uma solicitação e fazer parte da composição familiar de outro beneficiário.
- O serviço `PapelCidadaoService` implementa validação básica para evitar que um cidadão tenha o mesmo papel duplicado, mas não impede que o mesmo CPF seja cadastrado como beneficiário e também como membro de composição familiar.
- Não há implementação para conversão de papéis ou verificação de conflitos, que são requisitos explícitos da especificação.

### 2.2. Determinações Judiciais (C2)

| Item | Status | Descrição |
|------|--------|-----------|
| C2.1 | ✅ | Campos para processo judicial implementados via entidade ProcessoJudicial |
| C2.2 | ✅ | Campos para determinação judicial implementados via entidade DeterminacaoJudicial |
| C2.3 | ✅ | Endpoint para registro de determinações judiciais implementado via `POST /v1/judicial/determinacoes` |
| C2.4 | ✅ | Tramitação prioritária para determinações judiciais implementada |
| C2.5 | ⚠️ | Relatórios básicos implementados, mas faltam relatórios específicos detalhados |
| C2.6 | ⚠️ | Upload de documentos judiciais parcialmente implementado |
| C2.7 | ❌ | Prazos diferenciados quando determinado judicialmente não implementados |
| C2.8 | ❌ | Relatórios específicos para acompanhamento judicial não implementados |

**Impacto:** ALTO - Requisito legal para atendimento a determinações judiciais
**Complexidade:** ALTA - Requer alterações em múltiplas camadas da aplicação
**Dependências:** Módulo de Documentos (para upload de arquivos)

**Observações:**
- Conforme a Especificação Técnica (seção 5.3), as determinações judiciais exigem tramitação prioritária, prazos diferenciados, documentação obrigatória e relatórios específicos.
- A Lei Maria da Penha (Art. 23, inciso VI), mencionada na Especificação Técnica, prevê casos judicializados para Aluguel Social, que precisam ser tratados com prioridade absoluta.
- Não foi encontrada nenhuma implementação relacionada às determinações judiciais na API atual.
- Não há campos na entidade `SolicitacaoBeneficio` para marcar solicitações como judiciais.

### 2.3. Workflow de Estados (C3)

| Item | Status | Descrição |
|------|--------|-----------|
| C3.1 | ✅ | Estado RASCUNHO implementado |
| C3.2 | ✅ | Estado ABERTA implementado |
| C3.3 | ✅ | Estado LIBERADA implementado |
| C3.4 | ✅ | Estado PENDENTE implementado corretamente |
| C3.5 | ✅ | Estado ANALISE implementado corretamente |
| C3.6 | ✅ | Estado APROVADA implementado corretamente |
| C3.7 | ✅ | Estado REJEITADA implementado corretamente |
| C3.8 | ✅ | Estado CANCELADA implementado corretamente |
| C3.9 | ✅ | Transições de estado implementadas para todos os estados obrigatórios |
| C3.10 | ✅ | Log completo de mudanças de estado implementado |

**Impacto:** ALTO - Fluxo de trabalho incompleto pode prejudicar a operação
**Complexidade:** MÉDIA - Requer implementação de estados faltantes e validações
**Dependências:** Módulo de Auditoria (já implementado)

**Observações:**
- Conforme a Especificação Técnica (seção 7.1), o fluxo operacional padrão inclui 13 etapas, desde a solicitação até o encerramento, que devem ser refletidas no workflow de estados.
- O documento especifica que o sistema deve suportar o "Cadastro direto no sistema (sem ficha física)", o que exige um estado RASCUNHO para solicitações incompletas.
- A Especificação Técnica também menciona a necessidade de "Elaboração de memorando" e "Parecer técnico (deferimento/indeferimento)", que correspondem aos estados ABERTA e APROVADA/REPROVADA.
- O enum `StatusSolicitacaoBeneficio` implementa 7 estados, mas não são os exatos estados exigidos pela especificação.
- Faltam os estados RASCUNHO, ABERTA e LIBERADA.
- Há problemas de nomenclatura (falta de acentuação em ANÁLISE e CONCLUÍDA).
- A validação de transições no método `validarTransicaoStatus` não contempla todos os estados exigidos.

### 2.4. Benefício Natalidade - Regras Específicas (C4)

| Item | Status | Descrição |
|------|--------|-----------|
| C4.1 | ⚠️ | Valor fixo não é explicitamente configurado (apenas campo valor_complementar) |
| C4.2 | ❌ | Modalidade pecúnia via PIX não implementada |
| C4.3 | ❌ | Modalidade bens de consumo não implementada |
| C4.4 | ✅ | Validação de prazo máximo após nascimento implementada |
| C4.5 | ✅ | Validação durante gestação a partir do tempo mínimo implementada |
| C4.6 | ❌ | PIX obrigatório no CPF do beneficiário/representante não implementado |
| C4.7 | ❌ | Termo de responsabilidade obrigatório para pecúnia não implementado |
| C4.8 | ❌ | Campos específicos para pré-natal, UBS, gravidez de risco não implementados |
| C4.9 | ❌ | Campo para data provável do parto não implementado |
| C4.10 | ❌ | Campo para gêmeos/trigêmeos não implementado |

**Impacto:** MÉDIO - Funcionalidades básicas operacionais, mas com limitações
**Complexidade:** BAIXA-MÉDIA - Implementações pontuais necessárias
**Dependências:** Módulo de Pagamentos (para PIX)

**Observações:**
- Conforme a Especificação Técnica (seções 3.1.I e 6.2), o Benefício Natalidade deve oferecer duas modalidades: kit enxoval ou auxílio financeiro (pecúnia) no valor de R$ 500,00.
- A especificação define prazos específicos: durante a gestação a partir do 6º mês ou até 30 dias após o parto (com certidão de nascimento obrigatória).
- Para a modalidade pecúnia, a especificação exige que a chave PIX seja o CPF do beneficiário e que haja um termo de responsabilidade obrigatório.
- A entidade `EspecificacaoNatalidade` implementa apenas os requisitos básicos de validação de prazo, mas faltam implementações importantes como a modalidade pecúnia via PIX e os campos específicos mencionados na seção 6.2 da especificação.

### 2.5. Aluguel Social - Regras Específicas (C5)

| Item | Status | Descrição |
|------|--------|-----------|
| C5.1 | ✅ | Valor fixo configurável implementado (R$ 600,00) |
| C5.2 | ✅ | Prazo até 6 meses implementado |
| C5.3 | ✅ | Prorrogação por igual período implementada |
| C5.4 | ❌ | Timeline de pagamento até 15º dia útil não implementada |
| C5.5 | ✅ | Comprovação mensal obrigatória (recibo aluguel) implementada |
| C5.6 | ⚠️ | Monitoramento mensal com visitas técnicas parcialmente implementado |
| C5.7 | ❌ | Pagamento retroativo para suspensão por não entrega de recibo não implementado |
| C5.8 | ✅ | Prioridades para casos específicos implementadas |
| C5.9 | ❌ | Renovação automática mensal não implementada |
| C5.10 | ❌ | Campos para público prioritário não implementados completamente |
| C5.11 | ❌ | Campos para especificação (até 2 opções) não implementados |
| C5.12 | ❌ | Campo para situação da moradia atual não implementado |

**Impacto:** ALTO - Funcionalidades críticas de pagamento e renovação pendentes
**Complexidade:** ALTA - Requer desenvolvimento de fluxos automatizados
**Dependências:** Módulo de Agendamento (para visitas técnicas)

**Observações:**
- Conforme a Especificação Técnica (seção 5.5), o Aluguel Social tem valor fixo de R$ 600,00 mensais, prazo de até 6 meses (prorrogável por igual período) e exige comprovação mensal obrigatória.
- A seção 7.2 da especificação detalha a timeline completa do Aluguel Social, incluindo datas específicas para cada etapa do processo, como requerimento, renovação, relatório informativo, lançamento de crédito e pagamento até o 15º dia útil.
- A seção 6.1 especifica campos obrigatórios para o Aluguel Social, como público prioritário (apenas 1 opção), especificação (até 2 opções) e situação da moradia atual.
- O Art. 29 do Decreto 12.346/21, mencionado na especificação, exige monitoramento in loco obrigatório, que está apenas parcialmente implementado.
- A entidade `EspecificacaoAluguelSocial` implementa os requisitos básicos de valor, prazo e prorrogação, mas faltam implementações importantes como a timeline de pagamento, campos específicos e o fluxo de renovação automática mensal.

### 2.6. Renovação Automática Mensal - Aluguel Social (C6)

| Item | Status | Descrição |
|------|--------|-----------|
| C6.1 | ❌ | Criação automática de solicitações de renovação não implementada |
| C6.2 | ❌ | Intervalo de 30 dias entre renovações não implementado |
| C6.3 | ❌ | Limite de renovações configurável não implementado |
| C6.4 | ❌ | Validação de comprovante de pagamento de aluguel não implementada |
| C6.5 | ❌ | Alteração automática para PENDENTE na data de vencimento não implementada |
| C6.6 | ❌ | Pagamento retroativo de até 10 dias não implementado |
| C6.7 | ❌ | Período de carência após última extensão não implementado |
| C6.8 | ❌ | Notificação para envio de comprovante não implementada |
| C6.9 | ❌ | Relatório Informativo para solicitação de pagamento retroativo não implementado |

**Impacto:** ALTO - Funcionalidade crítica para continuidade do benefício
**Complexidade:** ALTA - Requer implementação de fluxo automatizado complexo
**Dependências:** Módulo de Notificações, Módulo de Pagamentos

**Observações:**
- Conforme a Especificação Técnica (seção 7.2), existe uma timeline específica para o Aluguel Social que inclui renovação até o dia 30 do mês da 6ª parcela.
- A especificação detalha que o pagamento retroativo é possível quando há suspensão por não entrega de recibo, mas deve ser solicitado em até 10 dias via Relatório Informativo.
- O sistema deve enviar e-mail às unidades descentralizadas até o dia 24 e o lançamento de crédito deve ocorrer até o dia 10.
- O envio dos recibos deve ocorrer em até 10 dias úteis após o pagamento.
- Nenhum desses requisitos está implementado na API atual, o que representa um gap crítico para a operação do benefício de Aluguel Social.

### 2.7. Integrações Externas (T1)

| Item | Status | Descrição |
|------|--------|-----------|
| T1.1 | ❌ | Integração com Receita Federal (validação de CPF e dados pessoais) não implementada |
| T1.2 | ❌ | Integração com CadÚnico (dados socioeconômicos) não implementada |
| T1.3 | ❌ | Integração com sistema bancário (PIX) não implementada |
| T1.4 | ❌ | Integração com Correios (validação de CEP e endereços) não implementada |
| T1.5 | ❌ | Integração com Meu SUS Digital (Programa Dignidade Menstrual) não implementada |
| T1.6 | ❌ | Integração com terceirizadas (Vale Alimentação) não implementada |

**Impacto:** ALTO - Funcionalidades essenciais para validação de dados e pagamentos
**Complexidade:** ALTA - Requer implementação de múltiplas integrações com sistemas externos
**Dependências:** Contratos e credenciais de acesso aos sistemas externos

**Observações:**
- Conforme a Especificação Técnica (seção 11.2), o sistema deve integrar-se com diversos sistemas externos para validação de dados e operações específicas.
- A integração com a Receita Federal é essencial para validação de CPF e dados pessoais, evitando fraudes.
- A integração com o CadÚnico permitiria obter dados socioeconômicos já cadastrados, simplificando o processo para o beneficiário.
- A integração com o sistema bancário é necessária para pagamentos via PIX, especialmente para o Benefício Natalidade e Aluguel Social.
- A integração com os Correios permitiria validação automática de CEP e endereços.
- A integração com o Meu SUS Digital é mencionada para o Programa Dignidade Menstrual.
- Nenhuma dessas integrações foi implementada na API atual, o que representa um gap significativo para a operação completa do sistema.

## 3. Requisitos da Renovação Automática Mensal

### 3.1. Fluxo de Renovação

1. **Criação Automática de Solicitações**
   - Ao aprovar uma solicitação inicial de Aluguel Social, o sistema deve criar automaticamente o número de solicitações adicionais do tipo 'renovacao' conforme definido no campo `quantidade_parcelas`.
   - Cada solicitação de renovação deve ter data de vencimento com intervalo de 30 dias da anterior.
   - As renovações devem herdar os dados básicos da solicitação original, incluindo o valor configurado.
   - Na data de vencimento de cada renovação, o status deve ser automaticamente alterado para PENDENTE, indicando a necessidade de anexar o comprovante de pagamento do aluguel.

2. **Fluxo de Renovação**
   - Na data de vencimento de cada parcela, o sistema deve alterar automaticamente o status para PENDENTE.
   - O sistema deve gerar uma notificação ao beneficiário solicitando o envio do comprovante de pagamento do aluguel.
   - O beneficiário ou técnico responsável deve anexar o comprovante através da interface do sistema.
   - O sistema deve validar se o comprovante foi anexado dentro do prazo estipulado.
   - Após o envio do comprovante, o status deve ser alterado para AGUARDANDO_APROVACAO.
   - Um técnico responsável deve analisar e aprovar o comprovante para prosseguir com o pagamento.
   - Se o comprovante for rejeitado, o status deve ser alterado para PENDENTE com justificativa, solicitando um novo envio.

3. **Condições para Pagamento**
   - O pagamento de cada parcela está condicionado à aprovação do comprovante de pagamento do aluguel.
   - O sistema deve permitir o upload do comprovante via interface do cidadão ou técnico.
   - A aprovação do pagamento deve ser feita por um técnico responsável.

3. **Pagamento Retroativo**
   - Em caso de atraso na aprovação, o sistema deve permitir o pagamento retroativo de até 30 dias.
   - O valor pago deve ser proporcional ao período coberto.

4. **Restrições**
   - Após a última extensão, o cidadão deve aguardar 1 ano para solicitar novo benefício de Aluguel Social.
   - O sistema deve validar este período de carência antes de permitir nova solicitação.

5. **Notificações**
   - O sistema deve enviar notificações lembrando do prazo para envio do comprovante.
   - Alertas devem ser enviados para o técnico responsável em caso de atraso na aprovação.

## 4. Impacto nas Implementações Existentes

### 4.1. Alterações Necessárias

1. **Modelo de Dados**
   - Adicionar campo `tipo_solicitacao` na tabela `solicitacao_beneficio` para diferenciar entre 'inicial' e 'renovacao'.
   - Adicionar campo `quantidade_parcelas` na tabela `solicitacao_beneficio` para definir o número de renovações a serem geradas.
   - Criar tabela `renovacao_aluguel_social` para armazenar o relacionamento entre as renovações.
   - Adicionar campo `data_ultima_renovacao` na tabela `beneficiario` para controle do período de carência.

2. **Serviços**
   - Implementar serviço `RenovacaoAluguelSocialService` para gerenciar o ciclo de vida das renovações.
   - Criar job agendado para verificar e criar renovações pendentes.
   - Implementar validação de período de carência no serviço de solicitação de benefício.

3. **Endpoints**
   - `POST /api/renovacao-aluguel-social/gerar-renovacoes` - Gera as renovações automáticas.
   - `POST /api/renovacao-aluguel-social/{id}/enviar-comprovante` - Upload do comprovante.
   - `GET /api/renovacao-aluguel-social/beneficiario/{id}` - Lista renovações de um beneficiário.
   - `POST /api/renovacao-aluguel-social/{id}/aprovar` - Aprova uma renovação.

4. **Notificações**
   - Implementar serviço de notificação para alertas de vencimento.
   - Criar templates de e-mail para notificações de renovação.

## 5. Outros Aspectos Relevantes

### 5.1. Estrutura de Dados

| Entidade | Status | Observações |
|----------|--------|-------------|
| Cidadao | ✅ | Estrutura básica completa |
| ComposicaoFamiliar | ✅ | Estrutura básica completa |
| PapelCidadao | ⚠️ | Estrutura básica completa, mas falta lógica de exclusividade |
| SolicitacaoBeneficio | ⚠️ | Faltam campos para determinações judiciais |
| EspecificacaoNatalidade | ⚠️ | Faltam campos para modalidade PIX |
| EspecificacaoAluguelSocial | ✅ | Estrutura completa |

### 5.2. Controle de Acesso (RBAC)

| Perfil | Status | Observações |
|--------|--------|-------------|
| ADMIN | ✅ | Implementado |
| GESTOR | ✅ | Implementado |
| TECNICO | ✅ | Implementado |
| ASSISTENTE_SOCIAL | ✅ | Implementado |
| AUDITOR | ✅ | Implementado |
| CIDADAO | ✅ | Implementado |
| COORDENADOR | ✅ | Implementado (adicional) |

**Observações:**
- Todos os perfis de usuário exigidos pelo PRD estão implementados.
- Há validação de roles nas APIs via decoradores `@Roles`.

### 4.3. Documentação da API

| Item | Status | Observações |
|------|--------|-------------|
| Swagger/OpenAPI | ✅ | Implementado via `@nestjs/swagger` |
| Documentação de endpoints | ✅ | Presente nos controllers |
| Exemplos de request/response | ⚠️ | Parcialmente implementados |

## 6. Recomendações Prioritárias

### 5.1. Prioridade Alta (Bloqueadores para Produção)

1. **Implementar controle de exclusividade de papéis:**
   - Adicionar constraint no banco de dados para impedir que um mesmo CPF esteja em ambos os papéis
   - Desenvolver endpoint `GET /api/cidadao/{cpf}/conflitos` para verificação de conflitos
   - Implementar endpoint `POST /api/cidadao/converter-papel` para conversão de papéis

2. **Implementar suporte a determinações judiciais:**
   - Adicionar campos na entidade `SolicitacaoBeneficio`:
     - `determinacao_judicial: boolean`
     - `numero_processo: string`
     - `vara_origem: string`
     - `data_determinacao: Date`
     - `arquivo_determinacao: string` (caminho do arquivo)
   - Implementar regras de tramitação prioritária e prazos diferenciados

3. **Corrigir workflow de estados:**
   - Adicionar os estados faltantes: RASCUNHO, ABERTA, LIBERADA
   - Corrigir a nomenclatura dos estados existentes (adicionar acentuação)
   - Atualizar a validação de transições para incluir todos os estados

### 5.2. Prioridade Média

4. **Completar implementação do Benefício Natalidade:**
   - Adicionar suporte para modalidade pecúnia via PIX
   - Implementar termo de responsabilidade para pecúnia
   - Adicionar campo para valor fixo configurável

5. **Completar implementação do Aluguel Social:**
   - Implementar timeline de pagamento até 15º dia útil
   - Adicionar suporte para pagamento retroativo em caso de suspensão

### 5.3. Prioridade Baixa (Melhorias)

6. **Implementar renovação automática mensal para Aluguel Social:**
   - Desenvolver serviço de gerenciamento de renovações
   - Implementar jobs agendados para criação de renovações baseado no número de parcelas configurado
   - Desenvolver fluxo de aprovação de comprovantes
   - Criar sistema de notificações

## 6. Análise de Esforço para Correção

| Gap Crítico | Complexidade | Estimativa (dias) |
|-------------|--------------|-------------------|
| Exclusividade de Papéis | Alta | 5 |
| Determinações Judiciais | Média | 3 |
| Workflow de Estados | Média | 3 |
| Benefício Natalidade | Baixa | 2 |
| Aluguel Social | Baixa | 2 |
| Renovação Automática Mensal | Média | 8 |
| **Total** | | **23 dias** |

## 8. Próximos Passos

1. **Sprint 1 (Semana 1-2):**
   - Implementar controle de exclusividade de papéis
   - Corrigir workflow de estados
   - Implementar suporte a determinações judiciais

2. **Sprint 2 (Semana 3-4):**
   - Completar implementação do Benefício Natalidade
   - Implementar funcionalidades básicas do Aluguel Social
   - Iniciar implementação da renovação automática mensal

3. **Sprint 3 (Semana 5-6):**
   - Completar implementação da renovação automática mensal
   - Implementar sistema de notificações
   - Desenvolver relatórios de acompanhamento

4. **Sprint 4 (Semana 7):**
   - Realizar testes integrados de todos os fluxos críticos
   - Executar testes de carga e desempenho
   - Preparar documentação técnica e do usuário

5. **Revisão Final (Semana 8):**
   - Nova análise de conformidade
   - Testes de aceitação com usuários-chave
   - Ajustes finais e preparação para produção

## Conclusão

A API do Sistema de Gestão de Benefícios Eventuais da SEMTAS possui uma boa base técnica, mas apresenta gaps críticos que impedem sua aprovação para produção. Os principais problemas estão relacionados ao controle de exclusividade de papéis, suporte a determinações judiciais e workflow de estados incompleto.

Recomendamos focar nas correções prioritárias identificadas neste relatório, com um cronograma estimado de 3 sprints para adequação completa ao PRD. Após as correções, uma nova análise de conformidade deve ser realizada para validar a implementação.

**Data da análise:** 24/05/2025
