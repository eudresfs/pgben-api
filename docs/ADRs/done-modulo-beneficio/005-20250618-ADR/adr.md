ADR: Separação entre Solicitações e Concessões de Benefícios

Status
Aceito

Contexto

O sistema atual do SEMTAS gerencia todo o ciclo de vida dos benefícios eventuais através da entidade "Solicitação", desde o pedido inicial até os pagamentos finais. Esta abordagem apresenta limitações conceituais e operacionais:

Mistura de responsabilidades: Uma única entidade gerencia tanto o processo de aprovação quanto a gestão dos benefícios concedidos
Complexidade de estados: Estados como "liberada" e "concluída" são ambíguos e não refletem adequadamente se o benefício foi pago ou está em andamento
Dificuldade para renovações: O processo de renovação não está claramente separado da solicitação original
Gestão de pagamentos inadequada: Pagamentos vinculados diretamente à solicitação dificultam o controle de parcelas múltiplas
Falta de rastreabilidade: Histórico de suspensões, bloqueios e renovações fica fragmentado

Decisão

Implementaremos uma arquitetura que separa claramente Solicitações (processo de aprovação) de Concessões (gestão do benefício concedido), relacionando também a entidade Pagamentos para controle financeiro detalhado.

Estrutura Proposta

1. Solicitação (Processo de Aprovação)
Responsabilidade: Gerenciar o processo desde o pedido até a decisão final
Ciclo de vida: Inicia com o pedido e encerra com aprovação, indeferimento ou cancelamento
Estados finais: Aprovada, Indeferida, Cancelada

2. Concessão (Benefício Concedido)
Responsabilidade: Gerenciar o benefício após aprovação
Origem: Criada automaticamente quando uma solicitação é aprovada
Ciclo de vida: Pendente → Concedida → Encerrada (com possibilidade de suspensão/bloqueio)

3. Pagamento (Controle Financeiro)
Responsabilidade: Controlar cada parcela/pagamento individual
Origem: Gerados automaticamente conforme periodicidade da concessão
Estados: Pendente → Agendado → Em Processamento → Liberado

Regras de Negócio

1. Regras para Abertura de Solicitações

1.1 Restrições de Duplicidade
Uma solicitação NÃO PODE ser aberta quando:

a) Existe concessão ativa do mesmo benefício
Concessão com status: pendente, concedida, suspensa ou bloqueada
Para o mesmo beneficiário e mesmo tipo de benefício
Exceção: Determinação judicial

b) Existe solicitação em andamento
Solicitação com status: rascunho, aberta, pendente ou em análise
Para o mesmo beneficiário e mesmo tipo de benefício
Exceção: Determinação judicial

c) Período de carência não cumprido
Para benefícios com periodicidade diferente de "única"
Concessão anterior encerrada há menos de 1 ano
Exceção: Determinação judicial

1.2 Determinação Judicial
Quando determinacao_judicial_flag = true, todas as regras de duplicidade e carência são ignoradas
Deve ser anexado documento judicial obrigatório
Histórico deve registrar "Solicitação criada por determinação judicial"

2. Regras para Quantidade de Parcelas

2.1 Validação de Limites
Quantidade de parcelas não pode ultrapassar o limite máximo do tipo de benefício
Campo obrigatório na solicitação

2.2 Validação por Periodicidade
Benefícios únicos: Sempre 1 parcela
Benefícios mensais: Entre 1 e o limite máximo configurado no tipo de benefício

3. Regras para Renovação de Concessões

3.1 Renovação Automática
Benefícios mensais renovam automaticamente até atingir o limite de parcelas
Novos pagamentos criados mensalmente enquanto houver parcelas disponíveis
Concessão deve estar com status "concedida"

3.2 Renovação por Determinação Judicial
Quando determinacao_judicial = true, ignora:
Limite de parcelas
Período de carência
Quantidade máxima de prorrogações
Permite renovação indefinida
Histórico deve registrar "Renovação por determinação judicial"

Fluxo Detalhado

Fase 1: Solicitação (Processo de Aprovação)

Estados e Subestados da Solicitação:

Rascunho
Solicitação criada apenas com beneficiario_id e beneficio_id
Validações de duplicidade aplicadas na criação
Aberta
aguardando_dados: Dados específicos do benefício não preenchidos
aguardando_documentos: Documentos obrigatórios não enviados
aguardando_parecer_tecnico: Parecer técnico não anexado
Pendente
aguardando_solucao: Existem pendências atribuídas
pendencias_resolvidas: Pendências resolvidas, aguardando reanálise
Em Análise
Aguardando análise da gestão SEMTAS
Estados Finais:
Aprovada: Gera concessão automaticamente
Indeferida: Beneficiário inelegível (decisão da gestão)
Cancelada: Cancelada antes da concessão

Fase 2: Concessão (Gestão do Benefício)

Estados da Concessão:
Pendente: Criada, aguardando primeiro pagamento
Concedida: Pelo menos um pagamento liberado
Suspensa: Temporariamente interrompida
Bloqueada: Bloqueada por irregularidade
Encerrada: Finalizada (natural ou antecipadamente)

Regras de Funcionamento:

Criação de Pagamentos:
Benefício único: 1 pagamento criado
Benefício recorrente: Pagamentos criados mensalmente até atingir limite de parcelas
Renovação Automática:
Benefícios recorrentes renovam automaticamente
Máximo definido pela quantidade de parcelas da solicitação
Prorrogação:
Após limite de parcelas atingido
Nova concessão criada por igual período
Máximo de 1 prorrogação por solicitação (exceto determinação judicial)
Carência:
Após 2ª concessão encerrada: carência de 1 ano
Exceção: determinação judicial
Suspensão/Bloqueio:
Concessões suspensas ou bloqueadas impedem criação de novos pagamentos
Podem ser reativadas conforme decisão da gestão

Fase 3: Pagamentos

Estados do Pagamento:
Pendente: Criado, aguardando processamento
Agendado: Agendado para data específica
Em Processamento: Em processo de transferência
Liberado: Pago ao beneficiário
Cancelado: Cancelado por irregularidade

Regras de Controle:
Pagamentos são criados automaticamente conforme periodicidade
Gestores podem alterar status de pagamentos independentemente
Último pagamento liberado + limite de parcelas atingido = concessão encerrada
Concessões suspensas/bloqueadas não geram novos pagamentos

Campos Adicionais Necessários

Solicitação
quantidade_parcelas: INTEGER, NOT NULL
determinacao_judicial_flag: BOOLEAN, DEFAULT false
documento_judicial_id: UUID (obrigatório se determinacao_judicial_flag = true)
prioridade: INTEGER

Concessão
ordem_prioridade: INTEGER (herdada da solicitação)
determinacao_judicial_flag: BOOLEAN (herdada da solicitação)
data_inicio: DATE
data_encerramento: DATE
motivo_encerramento: TEXT (obrigatório em caso de encerramento antecipado)

Benefícios da Decisão

1. Separação Clara de Responsabilidades
Solicitações: Focam no processo de aprovação
Concessões: Gerenciam benefícios ativos
Pagamentos: Controlam aspecto financeiro

2. Maior Flexibilidade Operacional
Gestores podem alterar status de pagamentos independentemente
Concessões podem ser suspensas sem afetar o histórico da solicitação
Renovações e prorrogações ficam claramente documentadas

3. Controle de Duplicidade Robusto
Validações impedem abertura de solicitações duplicadas
Período de carência respeitado automaticamente
Exceções por determinação judicial bem controladas

4. Melhor Auditoria e Rastreabilidade
Histórico completo de cada fase
Logs independentes para solicitações, concessões e pagamentos
Facilita relatórios financeiros e operacionais

5. Suporte a Cenários Complexos
Múltiplas parcelas com controle individual
Suspensões temporárias
Prorrogações com nova concessão
Carência entre benefícios
Determinações judiciais

6. Estados Mais Precisos
Subestados clarificam momento exato da solicitação
Estados da concessão refletem situação real do benefício
Estados do pagamento permitem controle financeiro detalhado

Consequências

Positivas
Clareza conceitual: Cada entidade tem responsabilidade bem definida
Flexibilidade: Operações independentes em cada fase
Escalabilidade: Suporte a cenários futuros mais complexos
Auditoria: Rastreabilidade completa do processo
Relatórios: Dados mais organizados para análises
Conformidade legal: Respeita períodos de carência e limites legais

Negativas
Desenvolvimento: Mais entidades para implementar
Validações: Sistema de validações mais complexo

Riscos Mitigados
Duplicidade de benefícios: Validações impedem concessões irregulares
Inconsistência de dados: Estados bem definidos reduzem ambiguidade
Perda de histórico: Entidades separadas preservam informações específicas
Dificuldade de manutenção: Responsabilidades claras facilitam evolução
Não conformidade: Regras de carência e limites automatizadas

Implementação

Ordem de Desenvolvimento
Fase 1: Implementar novos estados/subestados nas solicitações
Fase 2: Criar entidades Concessão e Pagamento
Fase 3: Implementar validações de duplicidade e carência
Fase 4: Migrar dados existentes
Fase 5: Atualizar interfaces de usuário
Fase 6: Implementar regras de renovação/prorrogação

Estratégia de Migração
Manter API compatível durante transição
Criar concessões para solicitações aprovadas existentes
Mapear pagamentos existentes para nova estrutura
Aplicar validações gradualmente
Validação extensiva dos dados migrados

Esta decisão arquitetural estabelece uma base sólida para o crescimento futuro do sistema, oferecendo clareza conceitual e operacional necessária para gerenciar adequadamente os benefícios eventuais da SEMTAS, garantindo conformidade com as regras legais e operacionais estabelecidas.