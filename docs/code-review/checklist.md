# Checklist Completo - Revisão API SEMTAS

## 🚨 ITENS CRÍTICOS - NÃO NEGOCIÁVEIS

### ⚠️ C1. Controle de Exclusividade de Papéis
- [ ] **C1.1** - Constraint no BD impedindo CPF duplicado entre beneficiário e composição familiar
- [ ] **C1.2** - Endpoint de verificação de conflitos de papéis: `GET /api/cidadao/{cpf}/conflitos`
- [ ] **C1.3** - Endpoint de conversão de papéis: `POST /api/cidadao/converter-papel`
- [ ] **C1.4** - Validação automática antes de cadastrar beneficiário
- [ ] **C1.5** - Validação automática antes de adicionar à composição familiar
- [ ] **C1.6** - Histórico de conversões de papéis com log completo
- [ ] **C1.7** - Notificação automática para técnicos em conversões

### ⚠️ C2. Determinações Judiciais
- [ ] **C2.1** - Campo `determinacao_judicial` (boolean) em Solicitacao
- [ ] **C2.2** - Campo `numero_processo` (string) obrigatório quando judicial
- [ ] **C2.3** - Campo `vara_origem` (string) obrigatório quando judicial
- [ ] **C2.4** - Campo `data_determinacao` (date) obrigatório quando judicial
- [ ] **C2.5** - Campo `arquivo_determinacao` (file até 5MB) para upload
- [ ] **C2.6** - Tramitação prioritária absoluta para casos judiciais

### ⚠️ C3. Workflow de Estados
- [ ] **C3.1** - Estado RASCUNHO para solicitações incompletas
- [ ] **C3.2** - Estado ABERTA para solicitações completas não analisadas
- [ ] **C3.3** - Estado EM_ANALISE para solicitações em avaliação técnica
- [ ] **C3.4** - Estado APROVADA para solicitações com parecer favorável
- [ ] **C3.5** - Estado INDEFERIDA para solicitações com parecer desfavorável
- [ ] **C3.6** - Estado CANCELADA para solicitações interrompidas
- [ ] **C3.7** - Estado CONCLUIDA para benefícios finalizados
- [ ] **C3.8** - Validação de transições de estado permitidas
- [ ] **C3.9** - Log de mudanças de estado com data, usuário e justificativa

### ⚠️ C4. Benefício Natalidade
- [ ] **C4.1** - Validação de prazo (durante gestação a partir do 6º mês ou até 30 dias após parto)
- [ ] **C4.2** - Valor fixo configurável (R$ 500,00 conforme projeto de lei)
- [ ] **C4.3** - Modalidade PIX com validação da chave
- [ ] **C4.4** - Modalidade bens de consumo (kit enxoval)
- [ ] **C4.5** - Termo de responsabilidade para modalidade pecúnia
- [ ] **C4.6** - Validação de dados específicos (pré-natal, UBS, gravidez de risco)

### ⚠️ C5. Aluguel Social
- [ ] **C5.1** - Valor fixo configurável (R$ 600,00)
- [ ] **C5.2** - Prazo de até 6 meses
- [ ] **C5.3** - Prorrogação por igual período mediante análise
- [ ] **C5.4** - Timeline de pagamento (até 15º dia útil)
- [ ] **C5.5** - Comprovação mensal obrigatória (recibo)
- [ ] **C5.6** - Monitoramento mensal com visitas técnicas
- [ ] **C5.7** - Pagamento retroativo para suspensão por não entrega de recibo
- [ ] **C5.8** - Prioridades para casos específicos
- [ ] **C5.9** - Renovação automática mensal

### ⚠️ C6. Renovação Automática Mensal
- [ ] **C6.1** - Fluxo de renovação automática para Aluguel Social
- [ ] **C6.2** - Sistema de notificações para renovação
- [ ] **C6.3** - Validação de comprovantes mensais
- [ ] **C6.4** - Registro de visitas técnicas obrigatórias
- [ ] **C6.5** - Timeline específica para renovação

## 📊 DADOS OBRIGATÓRIOS

### D1. Cidadão/Beneficiário
- [x] **D1.1** - Campo `nome` (obrigatório, validação de tamanho)
- [x] **D1.2** - Campo `nome_social` (opcional)
- [x] **D1.3** - Campo `cpf` (obrigatório, validação)
- [x] **D1.4** - Campo `rg` (obrigatório)
- [x] **D1.5** - Campo `nis` (obrigatório, validação)
- [x] **D1.6** - Campo `nome_mae` (obrigatório)
- [x] **D1.7** - Campo `naturalidade` (obrigatório)
- [x] **D1.8** - Campo `data_nascimento` (obrigatório)
- [x] **D1.9** - Campo `sexo` (enum: masculino/feminino/outro)
- [x] **D1.10** - Campo `email` (opcional, validação)
- [x] **D1.11** - Campo `telefone` (obrigatório, validação)
- [ ] **D1.12** - Campos de telefone (array de contatos)
- [ ] **D1.13** - Campo `cor_raca` (obrigatório)
- [ ] **D1.14** - Campo `estado_civil` (enum: solteiro/casado/união estável/divorciado/separado/viúvo)
- [ ] **D1.15** - Campo `prontuario_suas` (obrigatório)

### D2. Dados de Endereço
- [x] **D2.1** - Campo `endereco.logradouro` (obrigatório)
- [x] **D2.2** - Campo `endereco.numero` (obrigatório)
- [x] **D2.3** - Campo `endereco.complemento` (opcional)
- [x] **D2.4** - Campo `endereco.bairro` (obrigatório)
- [x] **D2.5** - Campo `endereco.cep` (obrigatório)
- [ ] **D2.6** - Campo `ponto_referencia` (opcional)
- [ ] **D2.7** - Campo `tempo_residencia_natal` (validação mínimo 2 anos)
- [ ] **D2.8** - Campo `endereco.cidade` (obrigatório)
- [ ] **D2.9** - Campo `endereco.estado` (obrigatório)

### D3. Dados Socioeconômicos
- [x] **D3.1** - Campo `renda` (decimal)
- [ ] **D3.2** - Campo `renda_per_capita` (calculado)
- [ ] **D3.3** - Campo `tipo_moradia` (enum: Própria/Cedida/Alugada/Posse/Invasão)
- [ ] **D3.4** - Campo `valor_aluguel` (quando aplicável)
- [ ] **D3.5** - Campo `minha_casa_minha_vida` (boolean)
- [ ] **D3.6** - Campo `programa_habitacional` (boolean)
- [ ] **D3.7** - Objeto `despesas_fixas` (água, energia, gás, alimentação, medicamentos, telefone, outras)

### D4. Benefícios e Programas Sociais
- [x] **D4.1** - Campo `recebe_pbf` (boolean + valor_pbf)
- [x] **D4.2** - Campo `recebe_bpc` (boolean + tipo_bpc + valor_bpc)
- [ ] **D4.3** - Campo `tributo_crianca` (boolean + valor)
- [ ] **D4.4** - Campo `pensao_morte` (boolean)
- [ ] **D4.5** - Campo `aposentadoria` (boolean)
- [ ] **D4.6** - Campo `outros_beneficios` (array)
- [ ] **D4.7** - Campo `acompanhamento_cras_creas` (boolean)

### D5. Composição Familiar
- [x] **D5.1** - Relacionamento N:M com Cidadao
- [x] **D5.2** - Campo `parentesco` (obrigatório)
- [x] **D5.3** - Campo `idade` (obrigatório)
- [x] **D5.4** - Campo `ocupacao` (obrigatório)
- [x] **D5.5** - Campo `escolaridade` (enum)
- [x] **D5.6** - Campo `renda` (decimal)
- [ ] **D5.7** - Array `fatores_risco_social` (alcoolismo, deficiências, etc.)
- [ ] **D5.8** - Campo `cpf` (obrigatório)
- [ ] **D5.9** - Campo `curso_profissionalizante` (texto opcional)
- [ ] **D5.10** - Campo `interesse_curso_profissionalizante` (boolean)
- [ ] **D5.11** - Campo `trabalha` (boolean)
- [ ] **D5.12** - Campo `tipo_mercado` (enum: formal/informal)

### D6. Dados Bancários PIX
- [ ] **D6.1** - Campo `tipo_chave_pix` (enum: CPF/email/telefone/aleatória)
- [ ] **D6.2** - Campo `valor_chave_pix` (obrigatório)
- [ ] **D6.3** - Campo `nome_titular_pix` (obrigatório)

### D7. Dados Socioprofissionais
- [x] **D7.1** - Campo `ocupacao` (obrigatório)
- [x] **D7.2** - Campo `situacao_trabalho` (enum: desempregado/empregado_formal/empregado_informal/autonomo/aposentado/pensionista/beneficiario_bpc/outro)
- [x] **D7.3** - Campo `escolaridade` (enum: analfabeto/fundamental_incompleto/fundamental_completo/medio_incompleto/medio_completo/superior_incompleto/superior_completo/pos_graduacao)
- [x] **D7.4** - Campo `curso_profissionalizante` (texto opcional)
- [x] **D7.5** - Campo `interesse_curso_profissionalizante` (boolean)
- [ ] **D7.6** - Campo `area_trabalho` (área de atuação profissional)
- [ ] **D7.7** - Campo `familiar_apto_trabalho` (boolean)
- [ ] **D7.8** - Campo `area_interesse_familiar` (área de interesse para qualificação)

### D8. Dados Específicos por Benefício
- [ ] **D8.1** - Aluguel Social: público prioritário, especificação, situação moradia
- [ ] **D8.2** - Natalidade: pré-natal, UBS, gravidez de risco, data provável parto, gêmeos
- [ ] **D8.3** - Mortalidade: dados do falecido, data óbito, local óbito, tipo urna
- [ ] **D8.4** - Cesta Básica: quantidade, período concessão, origem atendimento
- [ ] **D8.5** - Passagens: destino, quantidade, data embarque, técnico responsável

### D9. Identificação do Requerente
- [ ] **D9.1** - Campo `nome` (quando diferente do beneficiário)
- [ ] **D9.2** - Campo `cpf` (obrigatório)
- [ ] **D9.3** - Campo `rg` (obrigatório)
- [ ] **D9.4** - Campo `nis` (obrigatório)
- [ ] **D9.5** - Campo `contato` (obrigatório)
- [ ] **D9.6** - Campo `parentesco` (obrigatório)

## 🛡️ SEGURANÇA E MONITORAMENTO

### S1. Criptografia e Armazenamento
- [x] **S1.1** - Serviço de criptografia implementado
- [x] **S1.2** - Criptografia de dados sensíveis
- [x] **S1.3** - Integração com MinIO para armazenamento seguro
- [x] **S1.4** - Gerenciamento de chaves de criptografia
- [x] **S1.5** - Backup e recuperação de dados

### S2. Monitoramento e Métricas
- [x] **S2.1** - Coleta de métricas HTTP
- [x] **S2.2** - Métricas de negócio
- [x] **S2.3** - Métricas de sistema
- [x] **S2.4** - Endpoints de health check
- [x] **S2.5** - Integração com Prometheus

### S3. Auditoria e Logs
- [x] **S3.1** - Middleware de auditoria
- [x] **S3.2** - Registro de todas as operações
- [x] **S3.3** - Trilha de auditoria completa
- [x] **S3.4** - Consulta de logs por filtros
- [x] **S3.5** - Exportação de logs

### S4. Permissões e Acesso
- [x] **S4.1** - Sistema de permissões granulares
- [x] **S4.2** - Controle de acesso baseado em políticas (PBAC)
- [x] **S4.3** - Escopo de permissões por unidade
- [x] **S4.4** - Permissões temporárias
- [x] **S4.5** - Auditoria de acessos

## 📱 INTERFACE E USABILIDADE

### I1. Documentação da API
- [x] **I1.1** - Swagger/OpenAPI completo
- [x] **I1.2** - Exemplos de requisição/resposta
- [x] **I1.3** - Descrição detalhada de endpoints
- [x] **I1.4** - Documentação de modelos de dados
- [x] **I1.5** - Documentação de erros

### I2. Padronização de Respostas
- [x] **I2.1** - Formato consistente de resposta
- [x] **I2.2** - Códigos HTTP apropriados
- [x] **I2.3** - Mensagens de erro claras
- [x] **I2.4** - Paginação padronizada
- [x] **I2.5** - Filtros consistentes

### I3. Validação e Tratamento de Erros
- [x] **I3.1** - Validação de entrada
- [x] **I3.2** - Tratamento global de exceções
- [x] **I3.3** - Logs de erros detalhados
- [x] **I3.4** - Mensagens amigáveis ao usuário
- [x] **I3.5** - Validações específicas por domínio

## 🔄 INTEGRAÇÃO E INTEROPERABILIDADE

### T1. Integração com Sistemas Externos
- [ ] **T1.1** - Integração com Receita Federal (validação CPF)
- [ ] **T1.2** - Integração com CadÚnico
- [ ] **T1.3** - Integração com sistema bancário (PIX)
- [ ] **T1.4** - Integração com Correios (CEP)
- [ ] **T1.5** - Integração com Meu SUS Digital

### T2. Comunicação Assíncrona
- [x] **T2.1** - Filas para processamento assíncrono
- [x] **T2.2** - Notificações em tempo real
- [x] **T2.3** - Processamento em background
- [x] **T2.4** - Retry automático
- [x] **T2.5** - Dead letter queue

## 📋 FUNCIONALIDADES ESSENCIAIS

### F1. Gestão de Beneficiários
- [ ] **F1.1** - `POST /api/cidadao` - Criar beneficiário
- [ ] **F1.2** - `GET /api/cidadao/{id}` - Buscar beneficiário
- [ ] **F1.3** - `PUT /api/cidadao/{id}` - Atualizar beneficiário
- [ ] **F1.4** - `DELETE /api/cidadao/{id}` - Excluir beneficiário
- [ ] **F1.5** - `GET /api/cidadao/buscar?cpf={cpf}` - Buscar por CPF
- [ ] **F1.6** - `GET /api/cidadao/buscar?nis={nis}` - Buscar por NIS
- [ ] **F1.7** - `GET /api/cidadao/buscar?nome={nome}` - Buscar por nome

### F2. Gestão de Solicitações
- [ ] **F2.1** - `POST /api/solicitacao` - Criar solicitação
- [ ] **F2.2** - `GET /api/solicitacao/{id}` - Buscar solicitação
- [ ] **F2.3** - `PUT /api/solicitacao/{id}` - Atualizar solicitação
- [ ] **F2.4** - `GET /api/solicitacao` - Listar com filtros
- [ ] **F2.5** - `PUT /api/solicitacao/{id}/status` - Alterar status
- [ ] **F2.6** - `POST /api/solicitacao/{id}/documento` - Upload documento
- [ ] **F2.7** - `GET /api/solicitacao/{id}/historico` - Histórico completo

### F3. Workflow e Estados
- [ ] **F3.1** - `PUT /api/solicitacao/{id}/abrir` - RASCUNHO → ABERTA
- [ ] **F3.2** - `PUT /api/solicitacao/{id}/analisar` - ABERTA → EM_ANÁLISE
- [ ] **F3.3** - `PUT /api/solicitacao/{id}/pender` - EM_ANÁLISE → PENDENTE
- [ ] **F3.4** - `PUT /api/solicitacao/{id}/aprovar` - EM_ANÁLISE → APROVADA
- [ ] **F3.5** - `PUT /api/solicitacao/{id}/liberar` - APROVADA → LIBERADA
- [ ] **F3.6** - `PUT /api/solicitacao/{id}/concluir` - LIBERADA → CONCLUÍDA
- [ ] **F3.7** - `PUT /api/solicitacao/{id}/cancelar` - Qualquer → CANCELADA

### F4. Gestão de Documentos
- [ ] **F4.1** - Upload de arquivos até 5MB
- [ ] **F4.2** - Tipos permitidos: PDF, JPG, PNG, DOC, DOCX
- [ ] **F4.3** - Armazenamento seguro com controle de acesso
- [ ] **F4.4** - `GET /api/documento/{id}` - Download documento
- [ ] **F4.5** - `DELETE /api/documento/{id}` - Excluir documento
- [ ] **F4.6** - Versionamento de documentos
- [ ] **F4.7** - Log de acesso aos documentos

## CONTROLE DE ACESSO PBAC

### A1. Perfis de Usuário
- [x] **A1.1** - Perfil Administrador implementado
- [x] **A1.2** - Perfil Gestor SEMTAS implementado
- [x] **A1.3** - Perfil Técnico SEMTAS implementado
- [x] **A1.4** - Perfil Assistente Social implementado
- [x] **A1.5** - Perfil Auditor implementado

### A0. Sistema de Permissões Granulares (NOVO)
- [x] **A0.1** - Modelo de dados de permissões implementado
- [x] **A0.2** - Migrações para permissões granulares criadas
- [x] **A0.3** - Scripts de seed para permissões iniciais
- [x] **A0.4** - Integração com middleware de auditoria
- [x] **A0.5** - Caching de permissões para desempenho

### A2. Matriz de Permissões
- [ ] **A2.1** - Administrador: CRUD total em todas as entidades
- [ ] **A2.2** - Gestor: Aprovação de solicitações + relatórios completos
- [ ] **A2.3** - Técnico: Análise de solicitações + pareceres técnicos
- [ ] **A2.4** - Assistente Social: Cadastro + liberação de benefícios
- [ ] **A2.5** - Auditor: Consulta completa + relatórios de auditoria

### A3. Controles Granulares
- [x] **A3.1** - Controle por unidade solicitante
- [x] **A3.2** - Controle por tipo de benefício
- [x] **A3.3** - Controle por status da solicitação
- [x] **A3.4** - Log de todas as ações por usuário
- [x] **A3.5** - Middleware de autenticação JWT
- [x] **A3.6** - Middleware de autorização baseado em políticas

## SISTEMA DE NOTIFICAÇÕES

### N1. Notificações Automáticas
- [ ] **N1.1** - E-mail automático na mudança de status
- [ ] **N1.2** - Notificação para técnico quando solicitação pendente
- [ ] **N1.3** - Alerta para gestor quando solicitação em análise
- [ ] **N1.4** - Notificação de prazo vencido
- [ ] **N1.5** - Alerta de documentos obrigatórios faltando
- [ ] **N1.6** - Notificação de benefícios suspensos/cessados
- [ ] **N1.7** - Lembretes de monitoramento mensal (Aluguel Social)

### N2. Templates de E-mail
- [ ] **N2.1** - Template para beneficiário: solicitação recebida
- [ ] **N2.2** - Template para beneficiário: solicitação aprovada
- [ ] **N2.3** - Template para beneficiário: solicitação pendente
- [ ] **N2.4** - Template para técnico: nova solicitação
- [ ] **N2.5** - Template para gestor: aprovação necessária
- [ ] **N2.6** - Template para auditoria: relatório mensal

## 📊 RELATÓRIOS E DASHBOARDS

### R1. Relatórios Básicos
- [ ] **R1.1** - Relatório de solicitações por período
- [ ] **R1.2** - Relatório de benefícios concedidos por tipo
- [ ] **R1.3** - Relatório financeiro (valores pagos)
- [ ] **R1.4** - Relatório de tempo médio de análise (TMA)
- [ ] **R1.5** - Relatório de beneficiários por unidade
- [ ] **R1.6** - Relatório de documentos pendentes

### R2. Dashboards por Perfil
- [ ] **R2.1** - Dashboard Administrador: visão geral do sistema
- [ ] **R2.2** - Dashboard Gestor: KPIs de aprovação e financeiro
- [ ] **R2.3** - Dashboard Técnico: solicitações em análise
- [ ] **R2.4** - Dashboard Assistente Social: solicitações da unidade
- [ ] **R2.5** - Dashboard Auditor: indicadores de conformidade

### R3. Exportação e Filtros
- [ ] **R3.1** - Exportação para PDF
- [ ] **R3.2** - Exportação para CSV/Excel
- [ ] **R3.3** - Filtros por data, tipo, status, unidade
- [ ] **R3.4** - Ordenação personalizável
- [ ] **R3.5** - Busca textual nos relatórios

## 🔍 AUDITORIA E LOGS

### L1. Logs de Sistema
- [ ] **L1.1** - Log de todas as operações CRUD
- [ ] **L1.2** - Log de mudanças de estado com timestamps
- [ ] **L1.3** - Log de acessos com IP, data, hora, usuário
- [ ] **L1.4** - Log de uploads/downloads de documentos
- [ ] **L1.5** - Log de tentativas de acesso negado
- [ ] **L1.6** - Log de conversões de papéis
- [ ] **L1.7** - Log de determinações judiciais

### L2. Trilha de Auditoria
- [ ] **L2.1** - Histórico completo de cada solicitação
- [ ] **L2.2** - Versionamento de dados com autor e timestamp
- [ ] **L2.3** - Rastreabilidade de alterações em beneficiários
- [ ] **L2.4** - Registro de justificativas para mudanças
- [ ] **L2.5** - Backup automático de logs
- [ ] **L2.6** - Retenção de logs por 5 anos (conforme LGPD)

## 🔒 SEGURANÇA E LGPD

### S1. Segurança da Aplicação
- [ ] **S1.1** - HTTPS obrigatório em produção
- [ ] **S1.2** - Validação de entrada (sanitização)
- [ ] **S1.3** - Proteção contra SQL Injection
- [ ] **S1.4** - Proteção contra XSS
- [ ] **S1.5** - Rate limiting nas APIs
- [ ] **S1.6** - Timeout de sessão configurável
- [ ] **S1.7** - Criptografia de dados sensíveis

### S2. Conformidade LGPD
- [ ] **S2.1** - Consentimento explícito para tratamento de dados
- [ ] **S2.2** - Minimização de dados coletados
- [ ] **S2.3** - Finalidade específica para cada dado
- [ ] **S2.4** - Direito de acesso aos dados pessoais
- [ ] **S2.5** - Direito de correção de dados
- [ ] **S2.6** - Direito de exclusão (quando aplicável)
- [ ] **S2.7** - Registro de atividades de tratamento

## 🔧 INTEGRAÇÕES E APIs EXTERNAS

### I1. Integrações Previstas
- [ ] **I1.1** - API Receita Federal (validação CPF)
- [ ] **I1.2** - API Correios (validação CEP)
- [ ] **I1.3** - Sistema bancário (pagamentos PIX)
- [ ] **I1.4** - SMTP (envio de e-mails)
- [ ] **I1.5** - CadÚnico (dados socioeconômicos - futuro)
- [ ] **I1.6** - SUAS (prontuário - futuro)

### I2. Estrutura para Integrações
- [ ] **I2.1** - Configuração de endpoints externos
- [ ] **I2.2** - Tratamento de timeout e retry
- [ ] **I2.3** - Log de chamadas para APIs externas
- [ ] **I2.4** - Fallback para indisponibilidade
- [ ] **I2.5** - Cache de respostas quando aplicável

## 📱 ENDPOINTS ESPECÍFICOS POR BENEFÍCIO

### B1. Benefício Natalidade
- [ ] **B1.1** - `POST /api/beneficio/natalidade` - Criar solicitação
- [ ] **B1.2** - Validação: gestação a partir do 6º mês
- [ ] **B1.3** - Validação: até 30 dias após parto
- [ ] **B1.4** - Campo: data prevista do parto
- [ ] **B1.5** - Campo: comprovação pré-natal
- [ ] **B1.6** - Campo: gravidez de risco (boolean)
- [ ] **B1.7** - Campo: gêmeos/trigêmeos (boolean)
- [ ] **B1.8** - Campo: modalidade (bens/pecúnia)
- [ ] **B1.9** - Geração automática do termo de responsabilidade

### B2. Aluguel Social
- [ ] **B2.1** - `POST /api/beneficio/aluguel-social` - Criar solicitação
- [ ] **B2.2** - Campo: público prioritário (enum com 1 opção)
- [ ] **B2.3** - Campo: especificação (array até 2 opções)
- [ ] **B2.4** - Campo: situação moradia atual
- [ ] **B2.5** - Campo: imovel interditado (boolean)
- [ ] **B2.6** - Campo: motivo da solicitação
- [ ] **B2.7** - Campo: período previsto
- [ ] **B2.8** - `PUT /api/beneficio/aluguel-social/{id}/prorrogar` - Prorrogação
- [ ] **B2.9** - Controle automático do prazo de 6 meses

## 🏗️ ESTRUTURA FUTURA (PREPARAÇÃO)

### F1. Outros Benefícios (Estrutura)
- [ ] **F1.1** - Entidade base TipoBeneficio com herança/polimorfismo
- [ ] **F1.2** - Estrutura para Benefício Mortalidade
- [ ] **F1.3** - Estrutura para Cesta Básica
- [ ] **F1.4** - Estrutura para Passagens (terrestre/aérea)
- [ ] **F1.5** - Estrutura para Documentação Pessoal
- [ ] **F1.6** - Estrutura para Calamidade/Desastres

### F2. Configurabilidade
- [ ] **F2.1** - Valores de benefícios configuráveis
- [ ] **F2.2** - Prazos configuráveis por tipo
- [ ] **F2.3** - Documentos obrigatórios configuráveis
- [ ] **F2.4** - Workflow personalizável por benefício
- [ ] **F2.5** - Templates de documentos editáveis

## 📋 VALIDAÇÕES CRÍTICAS DE NEGÓCIO

### V1. Validações Automáticas
- [ ] **V1.1** - CPF válido (algoritmo DV)
- [ ] **V1.2** - Idade para representante legal obrigatório (<18 anos)
- [ ] **V1.3** - Tempo mínimo de residência em Natal (2 anos)
- [ ] **V1.4** - Formato de chave PIX conforme tipo
- [ ] **V1.5** - Documentos obrigatórios por benefício
- [ ] **V1.6** - Valores dentro dos limites estabelecidos
- [ ] **V1.7** - Datas coerentes (não futura, exceto previsões)

### V2. Validações de Negócio
- [ ] **V2.1** - Beneficiário não pode estar em composição familiar ativa
- [ ] **V2.2** - Membro de composição não pode ser beneficiário ativo
- [ ] **V2.3** - Prazo máximo para benefícios recorrentes
- [ ] **V2.4** - Limite de renovações por tipo de benefício
- [ ] **V2.5** - Validação de renda familiar para elegibilidade
- [ ] **V2.6** - Documentos específicos por tipo de benefício

## 🎯 MÉTRICAS DE PERFORMANCE

### P1. Performance da API
- [ ] **P1.1** - Tempo de resposta < 500ms (endpoints básicos)
- [ ] **P1.2** - Tempo de resposta < 2s (relatórios simples)
- [ ] **P1.3** - Suporte a 100 usuários concorrentes
- [ ] **P1.4** - Upload de arquivos até 5MB
- [ ] **P1.5** - Paginação em listagens > 50 itens
- [ ] **P1.6** - Cache implementado para consultas frequentes

### P2. Escalabilidade
- [ ] **P2.1** - Arquitetura preparada para clustering
- [ ] **P2.2** - Banco de dados otimizado (índices)
- [ ] **P2.3** - Conexões de BD com pool
- [ ] **P2.4** - Processamento assíncrono para operações pesadas
- [ ] **P2.5** - Monitoramento de recursos (CPU, memória)

## 📋 DOCUMENTAÇÃO E TESTES

### T1. Documentação da API
- [ ] **T1.1** - Swagger/OpenAPI implementado
- [ ] **T1.2** - Documentação de todos os endpoints
- [ ] **T1.3** - Exemplos de request/response
- [ ] **T1.4** - Códigos de erro documentados
- [ ] **T1.5** - Guia de autenticação/autorização

### T2. Testes Automatizados
- [ ] **T2.1** - Testes unitários > 80% cobertura
- [ ] **T2.2** - Testes de integração para fluxos críticos
- [ ] **T2.3** - Testes de carga básicos
- [ ] **T2.4** - Testes de segurança (OWASP Top 10)
- [ ] **T2.5** - Testes de validação de regras de negócio

---

## 📊 RESUMO DE CRITICIDADE

### 🚨 GAPS CRÍTICOS (REPROVAM O SISTEMA)
- Controle de exclusividade de papéis (C1.*)
- Determinações judiciais (C2.*)
- Workflow de estados (C3.*)
- Regras específicas dos benefícios (C4.*, C5.*)
- Estrutura de dados obrigatória (D1.* a D6.*)

### ⚠️ GAPS IMPORTANTES (IMPACTAM OPERAÇÃO)
- Funcionalidades essenciais (F1.* a F4.*)
- Controle de acesso PBAC (A1.* a A3.*)
- Sistema de notificações (N1.*, N2.*)
- Auditoria e logs (L1.*, L2.*)

### 📋 GAPS MENORES (MELHORIAS FUTURAS)
- Relatórios avançados (R2.*, R3.*)
- Integrações externas (I1.*, I2.*)
- Estrutura futura (F1.*, F2.*)
- Performance otimizada (P1.*, P2.*)

---

**Total de itens:** 200+ pontos de verificação
**Tempo estimado de revisão:** 35 minutos
**Critério de aprovação:** 100% dos itens críticos + 95% dos importantes